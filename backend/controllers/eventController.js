const Event = require('../models/Event');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const ScheduleSession = require('../models/ScheduleSession');
const Feedback = require('../models/Feedback');
const Visit = require('../models/Visit');
const realtime = require('../utils/realtime');
const notify = require('../utils/notify');
const { escapeRegex, text } = require('../utils/validators');

const has = (list, id) => !!id && (list || []).some((x) => String(x) === String(id));

// Never expose the list of attendee ids; return counts and the viewer's own flags instead.
function serialize(event, userId) {
  const o = event.toObject ? event.toObject() : event;
  const { registrations = [], bookmarks = [], ...rest } = o;
  return { ...rest, registrationCount: registrations.length, bookmarkCount: bookmarks.length, registered: has(registrations, userId), bookmarked: has(bookmarks, userId) };
}

function parseDates(body, current = {}) {
  const date = body.date !== undefined ? new Date(body.date) : current.date;
  const endDate = body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : current.endDate;
  if (!date || Number.isNaN(+date)) return { error: 'A valid start date is required.' };
  if (endDate && (Number.isNaN(+endDate) || endDate < date)) return { error: 'The end date must be after the start date.' };
  return { date, endDate };
}

async function listEvents(req, res) {
  const { search = '', category = '' } = req.query;
  const filter = { status: 'published' };
  if (category && category !== 'All Events') filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (String(search).trim()) {
    const safe = new RegExp(escapeRegex(String(search).trim()), 'i');
    filter.$or = [{ title: safe }, { description: safe }, { location: safe }, { category: safe }, { theme: safe }];
  }
  const events = await Event.find(filter).populate('createdBy', 'name').sort({ date: 1 }).limit(100);
  res.json({ events: events.map((e) => serialize(e, req.user?._id)) });
}

async function getEvent(req, res) {
  const event = await Event.findById(req.params.id).populate('createdBy', 'name');
  const isOwner = event && req.user && String(event.createdBy._id) === String(req.user._id);
  if (!event || (event.status !== 'published' && !isOwner)) return res.status(404).json({ message: 'This event is not available.' });
  return res.json({ event: serialize(event, req.user?._id) });
}

async function myEvents(req, res) {
  const filter = req.user.role === 'organizer' ? { createdBy: req.user._id } : { registrations: req.user._id };
  const events = await Event.find(filter).populate('createdBy', 'name').sort({ createdAt: -1 });
  res.json({ events: events.map((e) => serialize(e, req.user._id)) });
}

async function createEvent(req, res) {
  const b = req.body;
  const title = text(b.title, 120), category = text(b.category, 60), description = text(b.description, 2000), location = text(b.location, 160);
  if (!title || !category || !description || !location || !b.date) {
    return res.status(400).json({ message: 'Title, category, description, location, and date are required.' });
  }
  const dates = parseDates(b);
  if (dates.error) return res.status(400).json({ message: dates.error });
  const event = await Event.create({
    title, category, description, location, theme: text(b.theme, 120),
    date: dates.date, endDate: dates.endDate, image: text(b.image, 500),
    capacity: Math.max(1, Number(b.capacity) || 100),
    status: b.status === 'draft' ? 'draft' : 'published', createdBy: req.user._id,
  });
  if (event.status === 'published') realtime.emitPublic('event:changed', { eventId: event._id, kind: 'created' });
  res.status(201).json({ message: 'Event created successfully.', event: serialize(event, req.user._id) });
}

async function updateEvent(req, res) {
  const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return res.status(404).json({ message: 'Event not found or you do not have permission to edit it.' });
  const before = { date: +event.date, location: event.location, title: event.title };
  const dates = parseDates(req.body, event);
  if (dates.error) return res.status(400).json({ message: dates.error });
  for (const f of ['title', 'category', 'description', 'location', 'theme', 'image']) if (req.body[f] !== undefined) event[f] = text(req.body[f], f === 'description' ? 2000 : 500);
  if (req.body.capacity !== undefined) {
    const capacity = Math.max(1, Number(req.body.capacity) || 1);
    if (capacity < event.registrations.length) return res.status(400).json({ message: `Capacity cannot be lower than the ${event.registrations.length} existing registrations.` });
    event.capacity = capacity;
  }
  if (['published', 'draft'].includes(req.body.status)) event.status = req.body.status;
  event.date = dates.date; event.endDate = dates.endDate;
  await event.save();

  const changed = before.date !== +event.date || before.location !== event.location || before.title !== event.title;
  if (changed && event.status === 'published') {
    await notify([...event.registrations, ...event.bookmarks], { type: 'event', title: `Event updated: ${event.title}`, body: `${event.location} · ${event.date.toLocaleString()}`, tab: 'events', event: event._id });
  }
  realtime.emitPublic('event:changed', { eventId: event._id, kind: 'updated' });
  res.json({ message: 'Event updated successfully.', event: serialize(event, req.user._id) });
}

async function deleteEvent(req, res) {
  const event = await Event.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!event) return res.status(404).json({ message: 'Event not found or you do not have permission to delete it.' });
  await Promise.all([
    ExhibitorApplication.deleteMany({ event: event._id }), Booth.deleteMany({ event: event._id }),
    ScheduleSession.deleteMany({ event: event._id }), Visit.deleteMany({ event: event._id }),
    Feedback.updateMany({ event: event._id }, { $set: { event: null } }),
  ]);
  await notify(event.registrations, { type: 'event', title: `Event cancelled: ${event.title}`, tab: 'events' });
  realtime.emitPublic('event:changed', { eventId: event._id, kind: 'deleted' });
  res.json({ message: 'Event deleted successfully.' });
}

async function registerForEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event || event.status !== 'published') return res.status(404).json({ message: 'This event is not available.' });
  if (has(event.registrations, req.user._id)) return res.status(409).json({ message: 'You are already registered for this event.' });
  // Atomic: add only while registrations are below capacity (safe under concurrent requests).
  const updated = await Event.findOneAndUpdate(
    { _id: event._id, registrations: { $ne: req.user._id }, $expr: { $lt: [{ $size: '$registrations' }, '$capacity'] } },
    { $addToSet: { registrations: req.user._id } }, { returnDocument: 'after' });
  if (!updated) return res.status(409).json({ message: 'This event has reached its registration capacity.' });
  realtime.emitToUser(event.createdBy, 'analytics:changed', { eventId: event._id });
  realtime.emitPublic('event:changed', { eventId: event._id, kind: 'registrations' });
  res.status(201).json({ message: 'You are registered for this event.', eventId: event._id });
}

async function unregisterFromEvent(req, res) {
  const event = await Event.findOneAndUpdate({ _id: req.params.id, registrations: req.user._id }, { $pull: { registrations: req.user._id } }, { returnDocument: 'after' });
  if (!event) return res.status(404).json({ message: 'You are not registered for this event.' });
  realtime.emitToUser(event.createdBy, 'analytics:changed', { eventId: event._id });
  realtime.emitPublic('event:changed', { eventId: event._id, kind: 'registrations' });
  res.json({ message: 'Your registration was cancelled.' });
}

async function toggleBookmark(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event || event.status !== 'published') return res.status(404).json({ message: 'Event not found.' });
  const on = !has(event.bookmarks, req.user._id);
  await Event.updateOne({ _id: event._id }, on ? { $addToSet: { bookmarks: req.user._id } } : { $pull: { bookmarks: req.user._id } });
  realtime.emitToUser(event.createdBy, 'analytics:changed', { eventId: event._id });
  res.json({ message: on ? 'Event bookmarked successfully.' : 'Event removed from bookmarks.', bookmarked: on });
}

module.exports = { listEvents, getEvent, myEvents, createEvent, updateEvent, deleteEvent, registerForEvent, unregisterFromEvent, toggleBookmark, serialize };
