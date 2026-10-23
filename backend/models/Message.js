const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  read: { type: Boolean, default: false }
}, { timestamps: true });
messageSchema.index({ from: 1, to: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);
