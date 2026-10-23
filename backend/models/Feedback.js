const mongoose = require('mongoose');
const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, trim: true, maxlength: 160, default: 'User feedback' },
  type: { type: String, enum: ['feedback', 'issue'], default: 'feedback' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  rating: { type: Number, min: 1, max: 5, default: null },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: ['open', 'reviewed', 'resolved'], default: 'open' }
}, { timestamps: true });
module.exports = mongoose.model('Feedback', feedbackSchema);
