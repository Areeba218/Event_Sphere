const http = require('http');
const { io: connectClient } = require('socket.io-client');
const mongoose = require('mongoose');
const { connect, disconnect, api, signup } = require('./helpers');
const { createApp } = require('../app');
const realtime = require('../utils/realtime');

const future = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();
const once = (socket, name) => new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(`timeout waiting for ${name}`)), 5000); socket.once(name, (p) => { clearTimeout(t); resolve(p); }); });

describe('real-time updates (Socket.IO)', () => {
  let server, url;
  before(async () => {
    if (mongoose.connection.readyState !== 1) await connect();
    server = http.createServer(createApp());
    realtime.init(server, ['http://localhost:5173']);
    await new Promise((r) => server.listen(0, r));
    url = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { realtime.close(); await new Promise((r) => server.close(r)); await disconnect(); });

  test('rejects an invalid token, accepts a valid one', async () => {
    const bad = connectClient(url, { auth: { token: 'nope' }, reconnection: false });
    await once(bad, 'connect_error'); bad.close();
    const u = await signup('attendee');
    const good = connectClient(url, { auth: { token: u.token } });
    await once(good, 'connect'); good.close();
  });

  test('schedule edits reach attendees live, with a notification', async () => {
    const org = await signup('organizer'); const att = await signup('attendee');
    const ev = (await org.auth(api().post('/api/events').send({ title: 'Live Expo', category: 'Business', description: 'd', location: 'x', date: future(30) })).expect(201)).body.event;
    const s = (await org.auth(api().post(`/api/portal/organizer/events/${ev._id}/schedule/new`).send({ title: 'Talk', startTime: future(31), endTime: future(32), location: 'A' })).expect(201)).body.session;
    await att.auth(api().post(`/api/portal/schedule/${s._id}/bookmark`)).expect(200);

    const socket = connectClient(url, { auth: { token: att.token } });
    await once(socket, 'connect');
    socket.emit('event:join', ev._id);
    await new Promise((r) => setTimeout(r, 200));
    const changed = once(socket, 'schedule:changed');
    const note = once(socket, 'notification:new');
    await org.auth(api().post(`/api/portal/organizer/events/${ev._id}/schedule/${s._id}`).send({ location: 'Hall Z' })).expect(200);
    expect((await changed).eventId).toBe(ev._id);
    expect((await note).title).toMatch(/Session updated/);
    socket.close();
  });

  test('registrations push an analytics signal to the organizer only', async () => {
    const org = await signup('organizer'); const att = await signup('attendee');
    const ev = (await org.auth(api().post('/api/events').send({ title: 'Signal', category: 'Business', description: 'd', location: 'x', date: future(30) })).expect(201)).body.event;
    const orgSock = connectClient(url, { auth: { token: org.token } }); const attSock = connectClient(url, { auth: { token: att.token } });
    await Promise.all([once(orgSock, 'connect'), once(attSock, 'connect')]);
    let attendeeGotIt = false; attSock.on('analytics:changed', () => { attendeeGotIt = true; });
    const got = once(orgSock, 'analytics:changed');
    await att.auth(api().post(`/api/events/${ev._id}/register`)).expect(201);
    expect((await got).eventId).toBe(ev._id);
    await new Promise((r) => setTimeout(r, 200));
    expect(attendeeGotIt).toBe(false);
    orgSock.close(); attSock.close();
  });
});
