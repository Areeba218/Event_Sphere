const mongoose = require('mongoose');

// One document per (visitor, exhibitor profile) view, used for booth-traffic analytics.
const visitSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'ExhibitorApplication', required: true },
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

visitSchema.index({ application: 1, visitor: 1, createdAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);
