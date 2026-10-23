const Event = require('../models/Event');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const ScheduleSession = require('../models/ScheduleSession');
const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const Visit = require('../models/Visit');
const { toCsv } = require('../utils/csv');
const metrics = require('../utils/metrics');
const realtime = require('../utils/realtime');

async function compute(event) {
  const [apps, booths, sessions, feedback, messageCount, visits] = await Promise.all([
    ExhibitorApplication.find({ event: event._id }).select('status companyName'),
    Booth.find({ event: event._id }).select('status boothNumber application'),
    ScheduleSession.find({ event: event._id }).select('title attendees bookmarks'),
    Feedback.find({ event: event._id }).select('type rating status'),
    Message.countDocuments({ event: event._id }),
    Visit.find({ event: event._id }).select('application visitor createdAt'),
  ]);
  const count = (list, fn) => list.filter(fn).length;
  const regs = event.registrations.length;
  const rated = feedback.filter((f) => f.rating);

  const popularSessions = sessions
    .map((s) => ({ title: s.title, registrations: s.attendees.length, bookmarks: s.bookmarks.length, attendees: s.attendees.length, total: s.attendees.length + s.bookmarks.length }))
    .sort((a, b) => b.total - a.total).slice(0, 5);

  const boothByApp = new Map(booths.filter((b) => b.application).map((b) => [String(b.application), b.boothNumber]));
  const nameByApp = new Map(apps.map((a) => [String(a._id), a.companyName]));
  const perApp = new Map();
  visits.forEach((v) => perApp.set(String(v.application), (perApp.get(String(v.application)) || 0) + 1));
  const boothTraffic = [...perApp.entries()].map(([id, n]) => ({ company: nameByApp.get(id) || 'Exhibitor', boothNumber: boothByApp.get(id) || '—', visits: n })).sort((a, b) => b.visits - a.visits).slice(0, 10);

  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const visitsByDay = days.map((d) => ({ date: d.toISOString().slice(0, 10), visits: count(visits, (v) => v.createdAt >= d && v.createdAt < new Date(+d + 86400000)) }));

  return {
    attendees: regs, capacity: event.capacity, registrationsPercent: event.capacity ? Math.round((regs / event.capacity) * 100) : 0,
    exhibitorApplications: apps.length, approvedExhibitors: count(apps, (a) => a.status === 'approved'),
    pendingApplications: count(apps, (a) => a.status === 'pending'), rejectedApplications: count(apps, (a) => a.status === 'rejected'),
    totalBooths: booths.length, assignedBooths: count(booths, (b) => b.status === 'assigned'), reservedBooths: count(booths, (b) => b.status === 'reserved'), availableBooths: count(booths, (b) => b.status === 'available'),
    boothOccupancyPercent: booths.length ? Math.round((count(booths, (b) => b.status !== 'available') / booths.length) * 100) : 0,
    sessionCount: sessions.length, popularSessions,
    engagement: {
      eventBookmarks: event.bookmarks.length,
      sessionRegistrations: sessions.reduce((n, s) => n + s.attendees.length, 0), sessionBookmarks: sessions.reduce((n, s) => n + s.bookmarks.length, 0),
      feedbackCount: feedback.length, issuesReported: count(feedback, (f) => f.type === 'issue'),
      averageRating: rated.length ? Math.round((rated.reduce((n, f) => n + f.rating, 0) / rated.length) * 10) / 10 : null,
      messagesExchanged: messageCount,
    },
    traffic: { totalVisits: visits.length, uniqueVisitors: new Set(visits.map((v) => String(v.visitor))).size, boothTraffic, visitsByDay },
    generatedAt: new Date().toISOString(),
  };
}

async function ownedEvent(req, res) {
  const event = await Event.findOne({ _id: req.params.eventId, createdBy: req.user._id });
  if (!event) res.status(404).json({ message: 'Event not found.' });
  return event;
}

async function analytics(req, res) {
  const event = await ownedEvent(req, res); if (!event) return;
  res.json({ analytics: await compute(event) });
}

async function exportAnalytics(req, res) {
  const event = await ownedEvent(req, res); if (!event) return;
  const a = await compute(event);
  const rows = [
    ['EventSphere analytics report'], ['Event', event.title], ['Generated', a.generatedAt], [],
    ['Metric', 'Value'],
    ['Registrations', a.attendees], ['Capacity', a.capacity], ['Capacity used %', a.registrationsPercent],
    ['Exhibitor applications', a.exhibitorApplications], ['Approved', a.approvedExhibitors], ['Pending', a.pendingApplications], ['Rejected', a.rejectedApplications],
    ['Booths total', a.totalBooths], ['Booths assigned', a.assignedBooths], ['Booths reserved', a.reservedBooths], ['Booths available', a.availableBooths],
    ['Sessions', a.sessionCount], ['Event bookmarks', a.engagement.eventBookmarks], ['Session registrations', a.engagement.sessionRegistrations], ['Session bookmarks', a.engagement.sessionBookmarks],
    ['Feedback items', a.engagement.feedbackCount], ['Issues reported', a.engagement.issuesReported], ['Average rating', a.engagement.averageRating ?? 'n/a'],
    ['Booth visits', a.traffic.totalVisits], ['Unique visitors', a.traffic.uniqueVisitors], [],
    ['Session popularity'], ['Session', 'Registrations', 'Bookmarks'], ...a.popularSessions.map((s) => [s.title, s.registrations, s.bookmarks]), [],
    ['Booth traffic'], ['Company', 'Booth', 'Visits'], ...a.traffic.boothTraffic.map((b) => [b.company, b.boothNumber, b.visits]),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="eventsphere-analytics.csv"');
  res.send(toCsv(rows));
}

// System health for the monitoring panel (organizers only).
function systemMetrics(req, res) {
  res.json({ metrics: { ...metrics.snapshot(), connectedClients: realtime.connectedClients() } });
}

module.exports = { analytics, exportAnalytics, systemMetrics, compute };
