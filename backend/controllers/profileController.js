const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Event = require('../models/Event');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const ScheduleSession = require('../models/ScheduleSession');
const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Visit = require('../models/Visit');
const { text, safeUrl, passwordProblem } = require('../utils/validators');

const SAFE = '-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires';

async function profile(req, res) {
  res.json({ user: await User.findById(req.user._id).select(SAFE) });
}

async function updateProfile(req, res) {
  const user = await User.findById(req.user._id);
  const b = req.body;
  if (b.name !== undefined) { if (!text(b.name, 80)) return res.status(400).json({ message: 'Name cannot be empty.' }); user.name = text(b.name, 80); }
  for (const f of ['companyName', 'productsServices', 'description', 'phone']) if (b[f] !== undefined) user[f] = text(b[f], f === 'description' || f === 'productsServices' ? 1500 : 120);
  if (b.logo !== undefined) { const logo = safeUrl(b.logo); if (logo === null) return res.status(400).json({ message: 'Logo must be a valid link or an uploaded image.' }); user.logo = logo; }
  if (typeof b.shareContact === 'boolean') user.shareContact = b.shareContact;
  if (typeof b.reminderEmails === 'boolean') user.reminderEmails = b.reminderEmails;
  await user.save();
  res.json({ message: 'Profile updated.', user: await User.findById(user._id).select(SAFE) });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: 'Your current password is incorrect.' });
  const problem = passwordProblem(newPassword);
  if (problem) return res.status(400).json({ message: problem });
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ message: 'Password changed successfully.' });
}

/* ---------- GDPR: data portability & erasure ---------- */
async function exportData(req, res) {
  const id = req.user._id;
  const [user, registeredEvents, bookmarkedEvents, applications, booths, sessions, feedback, messages, notifications, ownEvents] = await Promise.all([
    User.findById(id).select(SAFE),
    Event.find({ registrations: id }).select('title date location'),
    Event.find({ bookmarks: id }).select('title date location'),
    ExhibitorApplication.find({ exhibitor: id }),
    Booth.find({ exhibitor: id }).select('boothNumber status event details products staff'),
    ScheduleSession.find({ $or: [{ attendees: id }, { bookmarks: id }] }).select('title startTime location'),
    Feedback.find({ user: id }),
    Message.find({ $or: [{ from: id }, { to: id }] }).select('from to text createdAt'),
    Notification.find({ user: id }).select('title body createdAt'),
    Event.find({ createdBy: id }).select('title date location status'),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="eventsphere-my-data.json"');
  res.json({ exportedAt: new Date().toISOString(), user, registeredEvents, bookmarkedEvents, sessions, applications, booths, feedback, messages, notifications, eventsOrganized: ownEvents });
}

async function deleteAccount(req, res) {
  const user = await User.findById(req.user._id);
  if (typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ message: 'Enter your current password to confirm account deletion.' });
  if (user.role === 'organizer' && (await Event.exists({ createdBy: user._id }))) return res.status(409).json({ message: 'Delete the events you organize before deleting your account.' });
  const id = user._id;
  await Promise.all([
    Event.updateMany({}, { $pull: { registrations: id, bookmarks: id } }),
    ScheduleSession.updateMany({}, { $pull: { attendees: id, bookmarks: id } }),
    Booth.updateMany({ exhibitor: id }, { $set: { status: 'available', exhibitor: null, application: null, details: '', products: '', staff: '' } }),
    ExhibitorApplication.deleteMany({ exhibitor: id }), Feedback.deleteMany({ user: id }),
    Message.deleteMany({ $or: [{ from: id }, { to: id }] }), Notification.deleteMany({ user: id }), Visit.deleteMany({ visitor: id }),
  ]);
  await user.deleteOne();
  res.json({ message: 'Your account and personal data have been deleted.' });
}

module.exports = { profile, updateProfile, changePassword, exportData, deleteAccount };
