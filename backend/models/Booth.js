const mongoose = require('mongoose');

const boothSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  boothNumber: { type: String, required: true, trim: true, uppercase: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  size: { type: String, default: '3m x 3m' },
  columns: { type: Number, min: 1, max: 20, default: 6 }, // floor-plan grid width, used for layout and neighbour lookup
  location: { type: String, trim: true, default: '' },
  price: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['available', 'reserved', 'assigned'], default: 'available' },
  exhibitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'ExhibitorApplication', default: null },
  details: { type: String, default: '', maxlength: 1500 },
  products: { type: String, default: '', maxlength: 1500 },
  staff: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

boothSchema.index({ event: 1, boothNumber: 1 }, { unique: true });
boothSchema.index({ application: 1 });

module.exports = mongoose.model('Booth', boothSchema);
