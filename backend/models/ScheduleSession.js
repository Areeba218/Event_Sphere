const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  topic: { type: String, default: '', maxlength: 200 },
  speaker: { type: String, default: '', maxlength: 160 },
  location: { type: String, default: '', maxlength: 160 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // registered
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // saved for later
  remindedAt: { type: Date, default: null }
}, { timestamps: true });

scheduleSchema.pre('validate', function () {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'Session end time must be after the start time.');
  }
});
scheduleSchema.index({ event: 1, startTime: 1 });
scheduleSchema.index({ startTime: 1, remindedAt: 1 });

module.exports = mongoose.model('ScheduleSession', scheduleSchema);
