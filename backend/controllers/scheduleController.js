const Event = require('../models/Event');
const ScheduleSession = require('../models/ScheduleSession');
const notify = require('../utils/notify');
const realtime = require('../utils/realtime');
const { text } = require('../utils/validators');

const has = (list, id) => (list || []).some((x) => String(x) === String(id));
const view = (s, userId) => {
  const o = s.toObject ? s.toObject() : s;
  const { attendees = [], bookmarks = [], remindedAt, ...rest } = o;
  return { ...rest, registeredCount: attendees.length, bookmarkCount: bookmarks.length, registered: has(attendees, userId), bookmarked: has(bookmarks, userId) };
};
const changed = (eventId) => realtime.emitToEvent(eventId, 'schedule:changed', {});

async function getSchedule(req, res) {
  const event = await Event.findById(req.params.eventId);
  if (!event || (event.status !== 'published' && String(event.createdBy) !== String(req.user._id))) return res.status(404).json({ message: 'Event not found.' });
  const sessions = await ScheduleSession.find({ event: event._id }).sort({ startTime: 1 });
  res.json({ sessions: sessions.map((s) => view(s, req.user._id)) });
}

async function upsertSchedule(req, res) {
  const event = await Event.findOne({ _id: req.params.eventId, createdBy: req.user._id });
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  const b = req.body;
  const isNew = req.params.id === 'new';
  const session = isNew ? new ScheduleSession({ event: event._id }) : await ScheduleSession.findOne({ _id: req.params.id, event: event._id });
  if (!session) return res.status(404).json({ message: 'Session not found.' });
  const before = { start: +session.startTime, end: +session.endTime, location: session.location, speaker: session.speaker, title: session.title };

  // whitelist: attendees/bookmarks/event can never be set from the request body
  for (const f of ['title', 'topic', 'speaker', 'location']) if (b[f] !== undefined) session[f] = text(b[f], 200);
  if (b.startTime !== undefined) session.startTime = new Date(b.startTime);
  if (b.endTime !== undefined) session.endTime = new Date(b.endTime);
  if (!session.title || Number.isNaN(+session.startTime) || Number.isNaN(+session.endTime)) return res.status(400).json({ message: 'Session title, start time and end time are required.' });
  if (session.endTime <= session.startTime) return res.status(400).json({ message: 'Session end time must be after the start time.' });

  if (session.location) {
    const clash = await ScheduleSession.findOne({ event: event._id, _id: { $ne: session._id }, location: session.location, startTime: { $lt: session.endTime }, endTime: { $gt: session.startTime } });
    if (clash) return res.status(409).json({ message: `"${clash.title}" already uses ${session.location} at that time.` });
  }
  if (!isNew && (before.start !== +session.startTime)) session.remindedAt = null; // re-send reminder for the new time
  await session.save();

  if (!isNew && (before.start !== +session.startTime || before.end !== +session.endTime || before.location !== session.location || before.speaker !== session.speaker || before.title !== session.title)) {
    await notify([...session.attendees, ...session.bookmarks], { type: 'schedule', title: `Session updated: ${session.title}`, body: `${session.startTime.toLocaleString()} · ${session.location || 'Main hall'}`, tab: 'bookmarks', event: event._id });
  }
  changed(event._id);
  res.status(isNew ? 201 : 200).json({ message: isNew ? 'Schedule session created.' : 'Schedule updated.', session: view(session, req.user._id) });
}

async function deleteSchedule(req, res) {
  const session = await ScheduleSession.findById(req.params.id).populate('event');
  if (!session || String(session.event.createdBy) !== String(req.user._id)) return res.status(404).json({ message: 'Session not found.' });
  await notify([...session.attendees, ...session.bookmarks], { type: 'schedule', title: `Session cancelled: ${session.title}`, tab: 'bookmarks', event: session.event._id });
  await session.deleteOne();
  changed(session.event._id);
  res.json({ message: 'Session deleted.' });
}

async function publishedSession(id) {
  const s = await ScheduleSession.findById(id).populate('event', 'status createdBy');
  return s && s.event?.status === 'published' ? s : null;
}

async function registerSession(req, res) {
  const s = await publishedSession(req.params.id);
  if (!s) return res.status(404).json({ message: 'Session not found.' });
  await ScheduleSession.updateOne({ _id: s._id }, { $addToSet: { attendees: req.user._id } });
  realtime.emitToUser(s.event.createdBy, 'analytics:changed', { eventId: s.event._id });
  changed(s.event._id);
  res.json({ message: 'Session registered.' });
}

async function unregisterSession(req, res) {
  const s = await publishedSession(req.params.id);
  if (!s) return res.status(404).json({ message: 'Session not found.' });
  await ScheduleSession.updateOne({ _id: s._id }, { $pull: { attendees: req.user._id } });
  realtime.emitToUser(s.event.createdBy, 'analytics:changed', { eventId: s.event._id });
  changed(s.event._id);
  res.json({ message: 'Session registration cancelled.' });
}

async function bookmarkSession(req, res) {
  const s = await publishedSession(req.params.id);
  if (!s) return res.status(404).json({ message: 'Session not found.' });
  const on = !has(s.bookmarks, req.user._id);
  await ScheduleSession.updateOne({ _id: s._id }, on ? { $addToSet: { bookmarks: req.user._id } } : { $pull: { bookmarks: req.user._id } });
  realtime.emitToUser(s.event.createdBy, 'analytics:changed', { eventId: s.event._id });
  res.json({ message: on ? 'Session bookmarked. You will get a reminder before it starts.' : 'Bookmark removed.', bookmarked: on });
}

async function mySessions(req, res) {
  const sessions = await ScheduleSession.find({ $or: [{ attendees: req.user._id }, { bookmarks: req.user._id }] }).populate('event', 'title').sort({ startTime: 1 });
  res.json({ sessions: sessions.map((s) => ({ ...view(s, req.user._id), event: s.event })) });
}

module.exports = { getSchedule, upsertSchedule, deleteSchedule, registerSession, unregisterSession, bookmarkSession, mySessions };
