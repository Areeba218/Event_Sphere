const mongoose = require('mongoose');

const CATEGORIES = ['Technology', 'Business', 'Healthcare', 'Education', 'Arts & Culture', 'Manufacturing', 'Food & Beverage', 'Other'];

const exhibitorApplicationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  exhibitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, enum: CATEGORIES, default: 'Other' },
  productsServices: { type: String, required: true, trim: true, maxlength: 1500 },
  documents: { type: String, default: '', maxlength: 500 },
  documentFiles: [{ _id: false, name: { type: String, maxlength: 200 }, url: { type: String, maxlength: 300 } }],
  logo: { type: String, default: '', maxlength: 500 },
  website: { type: String, default: '', maxlength: 300 },
  description: { type: String, default: '', maxlength: 2000 },
  contactPhone: { type: String, default: '', maxlength: 40 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  organizerNote: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

exhibitorApplicationSchema.index({ event: 1, exhibitor: 1 }, { unique: true });
exhibitorApplicationSchema.index({ status: 1, companyName: 1 });

module.exports = mongoose.model('ExhibitorApplication', exhibitorApplicationSchema);
module.exports.CATEGORIES = CATEGORIES;
