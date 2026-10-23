const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { connect, disconnect, api, signup, sendEmail } = require('./helpers');
const { runReminders } = require('../utils/jobs');
const ScheduleSession = require('../models/ScheduleSession');

beforeAll(connect);

const future = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

describe('authentication & security', () => {
  test('registration requires consent and a strong password', async () => {
    const base = { name: 'T', email: 'weak@test.dev', role: 'attendee' };
    await api().post('/api/auth/register').send({ ...base, password: 'Passw0rd!x' }).expect(400); // no consent
    await api().post('/api/auth/register').send({ ...base, password: 'password', consent: true }).expect(400);
  });
  test('login is blocked until the email is verified; passwords are hashed', async () => {
    await api().post('/api/auth/register').send({ name: 'U', email: 'u1@test.dev', password: 'Passw0rd!x', consent: true }).expect(201);
    await api().post('/api/auth/login').send({ email: 'u1@test.dev', password: 'Passw0rd!x' }).expect(403);
    const user = await mongoose.connection.db.collection('users').findOne({ email: 'u1@test.dev' });
    expect(user.password).not.toContain('Passw0rd');
    expect(user.consentAt).toBeTruthy();
  });
  test('NoSQL operator injection in login is rejected', async () => {
    await api().post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } }).expect(400);
  });
  test('forgot / reset password works', async () => {
    const u = await signup('attendee');
    await api().post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
    const mail = sendEmail.outbox.filter((m) => m.to === u.email).pop();
    const token = mail.text.match(/reset-password\/([a-f0-9]+)/)[1];
    await api().post(`/api/auth/reset-password/${token}`).send({ password: 'NewPassw0rd', confirmPassword: 'NewPassw0rd' }).expect(200);
    await api().post('/api/auth/login').send({ email: u.email, password: 'NewPassw0rd' }).expect(200);
  });
  test('protected routes need a token and role checks are enforced', async () => {
    await api().get('/api/portal/profile').expect(401);
    const att = await signup('attendee');
    await att.auth(api().post('/api/events').send({ title: 'x' })).expect(403);
    await att.auth(api().post('/api/portal/exhibitor/apply').send({})).expect(403);
    await att.auth(api().get('/api/portal/organizer/metrics')).expect(403);
  });
  test('invalid ids give 400, not 500', async () => {
    const att = await signup('attendee');
    await att.auth(api().get('/api/portal/events/not-an-id/schedule')).expect(400);
  });
  test('health endpoint', async () => { expect((await api().get('/health')).body.database).toBe('connected'); });
});

describe('full expo journey (end-to-end)', () => {
  let org, other, exh, exh2, att, event, application, application2, booths;

  test('organizer creates an event; attendee list hides attendee ids', async () => {
    org = await signup('organizer'); other = await signup('organizer');
    exh = await signup('exhibitor'); exh2 = await signup('exhibitor'); att = await signup('attendee');
    const created = await org.auth(api().post('/api/events').send({ title: 'Tech Expo', category: 'Technology', theme: 'AI', description: 'd', location: 'Karachi', date: future(48), endDate: future(72), capacity: 2 })).expect(201);
    event = created.body.event;
    const list = await att.auth(api().get('/api/events')).expect(200);
    const e = list.body.events.find((x) => x._id === event._id);
    expect(e.registrations).toBeUndefined();
    expect(e.registrationCount).toBe(0);
  });
  test('end date before start is rejected', async () => {
    await org.auth(api().post('/api/events').send({ title: 'Bad', category: 'Business', description: 'd', location: 'x', date: future(10), endDate: future(5) })).expect(400);
  });
  test('only the owner can edit/delete', async () => {
    await other.auth(api().put(`/api/events/${event._id}`).send({ title: 'Hack' })).expect(404);
    await other.auth(api().delete(`/api/events/${event._id}`)).expect(404);
  });
  test('registration is unique and capacity is enforced atomically', async () => {
    await att.auth(api().post(`/api/events/${event._id}/register`)).expect(201);
    await att.auth(api().post(`/api/events/${event._id}/register`)).expect(409);
    const r = await Promise.all([exh, exh2].map((u) => u.auth(api().post(`/api/events/${event._id}/register`))));
    expect(r.map((x) => x.status).sort()).toEqual([201, 409]);
    await att.auth(api().delete(`/api/events/${event._id}/register`)).expect(200);
  });
  test('exhibitors apply; duplicates rejected; organizer is notified', async () => {
    const body = { eventId: event._id, companyName: 'Acme', category: 'Technology', productsServices: 'Robots', contactPhone: '123' };
    application = (await exh.auth(api().post('/api/portal/exhibitor/apply').send(body)).expect(201)).body.application;
    await exh.auth(api().post('/api/portal/exhibitor/apply').send(body)).expect(409);
    application2 = (await exh2.auth(api().post('/api/portal/exhibitor/apply').send({ ...body, companyName: 'Beta', category: 'Business' })).expect(201)).body.application;
    await exh.auth(api().post('/api/portal/exhibitor/apply').send({ ...body, eventId: 'bad' })).expect(400);
    const n = await org.auth(api().get('/api/portal/notifications')).expect(200);
    expect(n.body.unread).toBeGreaterThanOrEqual(2);
  });
  test('organizer approves; exhibitor cannot self-approve or edit status', async () => {
    await exh.auth(api().patch(`/api/portal/organizer/applications/${application._id}`).send({ status: 'approved' })).expect(403);
    await other.auth(api().patch(`/api/portal/organizer/applications/${application._id}`).send({ status: 'approved' })).expect(404);
    await org.auth(api().patch(`/api/portal/organizer/applications/${application._id}`).send({ status: 'approved' })).expect(200);
    await org.auth(api().patch(`/api/portal/organizer/applications/${application2._id}`).send({ status: 'approved' })).expect(200);
    const upd = await exh.auth(api().patch(`/api/portal/exhibitor/applications/${application._id}`).send({ description: 'We build robots', status: 'rejected' })).expect(200);
    expect(upd.body.application.status).toBe('approved');
    await exh.auth(api().patch(`/api/portal/exhibitor/applications/${application._id}`).send({ logo: 'javascript:alert(1)' })).expect(400);
  });
  test('floor plan: generate, exhibitor reserves, organizer confirms, no double booking', async () => {
    booths = (await org.auth(api().post(`/api/portal/organizer/events/${event._id}/booths`).send({ count: 12, columns: 6 })).expect(201)).body.booths;
    const [b1, b2, b3] = booths;
    await exh.auth(api().post(`/api/portal/exhibitor/booths/${b1._id}/reserve`).send({ applicationId: application._id })).expect(200);
    await exh.auth(api().post(`/api/portal/exhibitor/booths/${b2._id}/reserve`).send({ applicationId: application._id })).expect(409); // already holds one
    await exh2.auth(api().post(`/api/portal/exhibitor/booths/${b1._id}/reserve`).send({ applicationId: application2._id })).expect(409); // taken
    await org.auth(api().patch(`/api/portal/organizer/booths/${b1._id}/assign`).send({ applicationId: application._id })).expect(200);
    await org.auth(api().patch(`/api/portal/organizer/booths/${b1._id}/assign`).send({ applicationId: application2._id })).expect(409);
    await org.auth(api().patch(`/api/portal/organizer/booths/${b2._id}/assign`).send({ applicationId: application2._id })).expect(200);
    await exh.auth(api().patch(`/api/portal/exhibitor/booths/${b1._id}`).send({ details: 'Demo area', staff: 'Sam, Lee' })).expect(200);
    await exh.auth(api().patch(`/api/portal/exhibitor/booths/${b2._id}`).send({ details: 'x' })).expect(404); // not their booth
    void b3;
  });
  test('neighbours see each other; attendees never see staff or emails', async () => {
    const mine = booths[0];
    const n = await exh.auth(api().get(`/api/portal/exhibitor/booths/${mine._id}/neighbors`)).expect(200);
    expect(n.body.neighbors).toHaveLength(1);
    expect(n.body.neighbors[0].company).toBe('Beta');
    const plan = await att.auth(api().get(`/api/portal/events/${event._id}/booths`)).expect(200);
    const b = plan.body.booths.find((x) => x._id === mine._id);
    expect(b.company.name).toBe('Acme');
    expect(b.staff).toBeUndefined();
    expect(b.exhibitor.email).toBeUndefined();
    const orgPlan = await org.auth(api().get(`/api/portal/events/${event._id}/booths`)).expect(200);
    expect(orgPlan.body.booths.find((x) => x._id === mine._id).staff).toBe('Sam, Lee');
  });
  test('directory search filters by keyword and category and shows booth location', async () => {
    const all = await att.auth(api().get('/api/portal/exhibitors/search')).expect(200);
    expect(all.body.exhibitors).toHaveLength(2);
    const tech = await att.auth(api().get('/api/portal/exhibitors/search?category=Technology')).expect(200);
    expect(tech.body.exhibitors.map((x) => x.companyName)).toEqual(['Acme']);
    expect(tech.body.exhibitors[0].boothNumber).toBe('B01');
    const kw = await att.auth(api().get('/api/portal/exhibitors/search?search=acme')).expect(200);
    expect(kw.body.exhibitors).toHaveLength(1);
    await att.auth(api().get('/api/portal/exhibitors/search?search=' + encodeURIComponent('.*('))).expect(200); // regex-safe
  });
  test('rejecting an approved exhibitor frees the booth', async () => {
    await org.auth(api().patch(`/api/portal/organizer/applications/${application2._id}`).send({ status: 'rejected' })).expect(200);
    const plan = await org.auth(api().get(`/api/portal/events/${event._id}/booths`)).expect(200);
    expect(plan.body.booths[1].status).toBe('available');
    await org.auth(api().patch(`/api/portal/organizer/applications/${application2._id}`).send({ status: 'approved' })).expect(200);
  });

  let session;
  test('schedule: create, validate, clash detection, edit', async () => {
    const mk = (extra) => org.auth(api().post(`/api/portal/organizer/events/${event._id}/schedule/new`).send({ title: 'Keynote', topic: 'AI', speaker: 'Dr X', location: 'Hall A', startTime: future(49), endTime: future(50), ...extra }));
    session = (await mk({}).expect(201)).body.session;
    await mk({ endTime: future(40) }).expect(400);
    await mk({ title: 'Clash', startTime: future(49.5), endTime: future(51) }).expect(409);
    await mk({ title: 'Other room', location: 'Hall B', startTime: future(49.5), endTime: future(51) }).expect(201);
    const edited = await org.auth(api().post(`/api/portal/organizer/events/${event._id}/schedule/${session._id}`).send({ speaker: 'Dr Y', attendees: ['hack'] })).expect(200);
    expect(edited.body.session.speaker).toBe('Dr Y');
    await att.auth(api().post(`/api/portal/organizer/events/${event._id}/schedule/new`).send({ title: 'x' })).expect(403);
  });
  test('attendee registers/bookmarks sessions and is notified of changes', async () => {
    await att.auth(api().post(`/api/portal/schedule/${session._id}/register`)).expect(200);
    await att.auth(api().post(`/api/portal/schedule/${session._id}/bookmark`)).expect(200);
    const mine = await att.auth(api().get('/api/portal/schedule/bookmarks')).expect(200);
    expect(mine.body.sessions[0]).toMatchObject({ registered: true, bookmarked: true });
    await org.auth(api().post(`/api/portal/organizer/events/${event._id}/schedule/${session._id}`).send({ location: 'Hall C' })).expect(200);
    const n = await att.auth(api().get('/api/portal/notifications')).expect(200);
    expect(n.body.notifications.some((x) => x.title.startsWith('Session updated'))).toBe(true);
    const sched = await att.auth(api().get(`/api/portal/events/${event._id}/schedule`)).expect(200);
    expect(sched.body.sessions[0].attendees).toBeUndefined();
  });
  test('reminders are sent once for sessions starting soon', async () => {
    await ScheduleSession.updateOne({ _id: session._id }, { $set: { startTime: new Date(Date.now() + 10 * 60000), endTime: new Date(Date.now() + 70 * 60000) } });
    const first = await runReminders();
    expect(first.notified).toBeGreaterThanOrEqual(1);
    expect((await runReminders()).notified).toBe(0);
    const n = await att.auth(api().get('/api/portal/notifications')).expect(200);
    expect(n.body.notifications.some((x) => x.type === 'reminder')).toBe(true);
    expect(sendEmail.outbox.some((m) => m.to === att.email && m.subject.startsWith('Reminder'))).toBe(true);
  });

  test('messages: threads, unread counts, read on open', async () => {
    await att.auth(api().post('/api/portal/messages').send({ to: exh.email, text: 'Hi, can we book a demo?' })).expect(201);
    await att.auth(api().post('/api/portal/messages').send({ to: exh.user.id, text: 'Tomorrow?' })).expect(201);
    await att.auth(api().post('/api/portal/messages').send({ to: att.email, text: 'self' })).expect(400);
    const t = await exh.auth(api().get('/api/portal/messages/threads')).expect(200);
    expect(t.body.threads[0]).toMatchObject({ unread: 2, lastMessage: 'Tomorrow?' });
    await exh.auth(api().get(`/api/portal/messages?with=${att.user.id}`)).expect(200);
    expect((await exh.auth(api().get('/api/portal/messages/threads'))).body.threads[0].unread).toBe(0);
  });
  test('booth visits feed analytics; analytics, export and feedback', async () => {
    await att.auth(api().post(`/api/portal/exhibitors/${application._id}/view`)).expect(201);
    expect((await att.auth(api().post(`/api/portal/exhibitors/${application._id}/view`))).body.recorded).toBe(false); // de-duplicated
    await exh.auth(api().post(`/api/portal/exhibitors/${application._id}/view`)).expect(200); // own profile not counted
    await att.auth(api().post('/api/portal/feedback').send({ eventId: event._id, type: 'feedback', rating: 5, message: 'Great expo' })).expect(201);
    const a = (await org.auth(api().get(`/api/portal/organizer/events/${event._id}/analytics`)).expect(200)).body.analytics;
    expect(a).toMatchObject({ attendees: 1, approvedExhibitors: 2, totalBooths: 12, assignedBooths: 1 });
    expect(a.traffic.totalVisits).toBe(1);
    expect(a.traffic.boothTraffic[0]).toMatchObject({ company: 'Acme', boothNumber: 'B01' });
    expect(a.engagement.averageRating).toBe(5);
    expect(a.popularSessions[0].registrations).toBe(1);
    await att.auth(api().get(`/api/portal/organizer/events/${event._id}/analytics`)).expect(403);
    const csv = await org.auth(api().get(`/api/portal/organizer/events/${event._id}/analytics/export`)).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).toContain('Session popularity');
    const m = await org.auth(api().get('/api/portal/organizer/metrics')).expect(200);
    expect(m.body.metrics.requests).toBeGreaterThan(10);
  });

  test('file upload accepts real images, rejects fakes and wrong types', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const ok = await exh.auth(api().post('/api/uploads').attach('file', png, { filename: 'logo.png', contentType: 'image/png' })).expect(201);
    expect(ok.body.url).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);
    const served = await api().get(ok.body.url).expect(200);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
    await exh.auth(api().post('/api/uploads').attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' })).expect(400);
    await exh.auth(api().post('/api/uploads').attach('file', Buffer.from('hi'), { filename: 'x.html', contentType: 'text/html' })).expect(400);
    await api().post('/api/uploads').attach('file', png, { filename: 'logo.png', contentType: 'image/png' }).expect(401);
    fs.rmSync(path.join(__dirname, '..', ok.body.url), { force: true });
  });

  test('privacy: export own data, privacy flags, delete account', async () => {
    await exh2.auth(api().put('/api/portal/profile').send({ shareContact: false, phone: '999' })).expect(200);
    const res = await att.auth(api().get('/api/portal/exhibitors/search?search=Beta')).expect(200);
    expect(res.body.exhibitors[0].exhibitor.email).toBeUndefined();
    const exp = await att.auth(api().get('/api/portal/privacy/export')).expect(200);
    expect(exp.body.user.email).toBe(att.email);
    expect(exp.body.user.password).toBeUndefined();
    expect(exp.body.messages.length).toBeGreaterThan(0);
    await att.auth(api().delete('/api/portal/privacy/account').send({ password: 'wrong' })).expect(400);
    await org.auth(api().delete('/api/portal/privacy/account').send({ password: 'Passw0rd!x' })).expect(409); // owns events
    await att.auth(api().delete('/api/portal/privacy/account').send({ password: 'Passw0rd!x' })).expect(200);
    await att.auth(api().get('/api/portal/profile')).expect(401);
    expect(await mongoose.connection.db.collection('messages').countDocuments({ text: 'Tomorrow?' })).toBe(0);
  });
  test('deleting an event removes its dependent data', async () => {
    await org.auth(api().delete(`/api/events/${event._id}`)).expect(200);
    const db = mongoose.connection.db;
    expect(await db.collection('booths').countDocuments({ event: new mongoose.Types.ObjectId(event._id) })).toBe(0);
    expect(await db.collection('exhibitorapplications').countDocuments({ event: new mongoose.Types.ObjectId(event._id) })).toBe(0);
    expect(await db.collection('schedulesessions').countDocuments({ event: new mongoose.Types.ObjectId(event._id) })).toBe(0);
  });
});
