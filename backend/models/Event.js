const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true },
  theme: { type: String, trim: true, maxlength: 120, default: '' },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  location: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  endDate: { type: Date, default: null },
  image: { type: String, default: '' },
  capacity: { type: Number, min: 1, default: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  registrations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['published', 'draft'], default: 'published' },
}, { timestamps: true });

eventSchema.index({ title: 'text', description: 'text', location: 'text', category: 'text' });
module.exports = mongoose.model('Event', eventSchema);
