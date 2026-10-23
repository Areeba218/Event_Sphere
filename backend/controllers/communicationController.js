const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const notify = require('../utils/notify');
const realtime = require('../utils/realtime');
const { text, toId } = require('../utils/validators');

/* ---------- feedback & support ---------- */
async function feedback(req, res) {
  const message = text(req.body.message, 3000);
  if (!message) return res.status(400).json({ message: 'Please write a message.' });
  const rating = Number(req.body.rating) || null;
  if (rating && (rating < 1 || rating > 5)) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  const eventId = toId(req.body.eventId);
  const item = await Feedback.create({ user: req.user._id, event: eventId, subject: text(req.body.subject, 160) || 'User feedback', type: req.body.type === 'issue' ? 'issue' : 'feedback', rating, message });
  const event = eventId ? await Event.findById(eventId).select('createdBy title') : null;
  if (event) { await notify([event.createdBy], { type: 'system', title: item.type === 'issue' ? 'New issue reported' : 'New feedback', body: event.title, tab: 'feedback', event: event._id }); realtime.emitToUser(event.createdBy, 'analytics:changed', { eventId: event._id }); }
  res.status(201).json({ message: 'Thank you. Your feedback has been submitted.', feedback: item });
}

// Public testimonials show the first name only.
async function publicFeedback(req, res) {
  const items = await Feedback.find({ status: { $in: ['reviewed', 'resolved'] }, type: 'feedback' }).populate('user', 'name').populate('event', 'title').sort({ createdAt: -1 }).limit(8);
  res.json({ feedback: items.map((i) => ({ _id: i._id, message: i.message, rating: i.rating, event: i.event, user: { name: (i.user?.name || 'Attendee').split(' ')[0] } })) });
}

async function myFeedback(req, res) {
  res.json({ feedback: await Feedback.find({ user: req.user._id }).populate('event', 'title').sort({ createdAt: -1 }).limit(50) });
}

async function deleteFeedback(req, res) {
  const item = await Feedback.findById(req.params.id).populate('event');
  if (!item) return res.status(404).json({ message: 'Feedback item not found.' });
  const isOwner = String(item.user) === String(req.user._id);
  const isOrganizer = req.user.role === 'organizer' && item.event && String(item.event.createdBy) === String(req.user._id);
  if (!isOwner && !isOrganizer) return res.status(403).json({ message: 'You cannot delete this feedback.' });
  await item.deleteOne();
  res.json({ message: 'Feedback deleted.' });
}

async function listFeedback(req, res) {
  const ids = (await Event.find({ createdBy: req.user._id }).select('_id')).map((x) => x._id);
  const items = await Feedback.find({ $or: [{ event: { $in: ids } }, { event: null }] }).populate('user', 'name email').populate('event', 'title').sort({ createdAt: -1 });
  res.json({ feedback: items });
}

async function updateFeedbackStatus(req, res) {
  const { status } = req.body;
  if (!['open', 'reviewed', 'resolved'].includes(status)) return res.status(400).json({ message: 'Choose a valid feedback status.' });
  const item = await Feedback.findById(req.params.id).populate('event');
  if (!item) return res.status(404).json({ message: 'Feedback item not found.' });
  if (item.event && String(item.event.createdBy) !== String(req.user._id)) return res.status(404).json({ message: 'Feedback item not found.' });
  item.status = status;
  await item.save();
  if (status === 'resolved') await notify([item.user], { type: 'system', title: 'Your feedback was resolved', body: item.message.slice(0, 120), tab: 'feedback' });
  res.json({ message: 'Feedback status updated.', feedback: item });
}

/* ---------- messages ---------- */
async function sendMessage(req, res) {
  const body = text(req.body.text, 2000);
  const to = String(req.body.to || '').trim();
  if (!to || !body) return res.status(400).json({ message: 'Recipient and message are required.' });
  const recipient = toId(to) ? await User.findById(to) : await User.findOne({ email: to.toLowerCase() });
  if (!recipient || !recipient.isEmailVerified) return res.status(404).json({ message: 'No EventSphere user was found for that recipient.' });
  if (String(recipient._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot message your own account.' });
  const item = await Message.create({ from: req.user._id, to: recipient._id, event: toId(req.body.eventId), text: body });
  realtime.emitToUser(recipient._id, 'message:new', { from: req.user._id, fromName: req.user.name });
  await notify([recipient._id], { type: 'message', title: `New message from ${req.user.name}`, body: body.slice(0, 120), tab: 'messages' });
  res.status(201).json({ message: 'Message sent successfully.', item });
}

async function messages(req, res) {
  let other = req.query.with ? String(req.query.with).trim() : null;
  if (other) {
    if (toId(other)) { /* already an id */ } else {
      const u = await User.findOne({ email: other.toLowerCase() }).select('_id');
      if (!u) return res.json({ messages: [] });
      other = String(u._id);
    }
  }
  const me = req.user._id;
  const filter = other ? { $or: [{ from: me, to: other }, { from: other, to: me }] } : { $or: [{ from: me }, { to: me }] };
  const items = await Message.find(filter).populate('from', 'name email role').populate('to', 'name email role').sort({ createdAt: 1 }).limit(200);
  if (other) await Message.updateMany({ from: other, to: me, read: false }, { $set: { read: true } });
  res.json({ messages: items });
}

// One row per conversation partner with the last message and the unread count.
async function threads(req, res) {
  const me = new mongoose.Types.ObjectId(req.user._id);
  const rows = await Message.aggregate([
    { $match: { $or: [{ from: me }, { to: me }] } },
    { $sort: { createdAt: -1 } },
    { $addFields: { partner: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] } } },
    { $group: { _id: '$partner', last: { $first: '$$ROOT' }, unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', me] }, { $eq: ['$read', false] }] }, 1, 0] } } } },
    { $sort: { 'last.createdAt': -1 } }, { $limit: 50 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select('name email role companyName');
  const byId = new Map(users.map((u) => [String(u._id), u]));
  res.json({ threads: rows.filter((r) => byId.has(String(r._id))).map((r) => ({ partner: byId.get(String(r._id)), lastMessage: r.last.text, lastAt: r.last.createdAt, unread: r.unread })) });
}

/* ---------- notifications ---------- */
async function notifications(req, res) {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications: items, unread });
}
async function markAllRead(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ message: 'All notifications marked as read.' });
}
async function markRead(req, res) {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { $set: { read: true } });
  res.json({ message: 'Notification marked as read.' });
}

module.exports = { feedback, publicFeedback, myFeedback, deleteFeedback, listFeedback, updateFeedbackStatus, sendMessage, messages, threads, notifications, markAllRead, markRead };
