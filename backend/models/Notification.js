const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['reminder', 'schedule', 'booth', 'application', 'message', 'event', 'system'], default: 'system' },
  title: { type: String, required: true, maxlength: 160 },
  body: { type: String, default: '', maxlength: 500 },
  tab: { type: String, default: '' }, // dashboard tab the notification relates to
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
