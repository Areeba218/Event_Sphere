const Event = require('../models/Event');
const User = require('../models/User');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const Visit = require('../models/Visit');
const notify = require('../utils/notify');
const realtime = require('../utils/realtime');
const { CATEGORIES } = ExhibitorApplication;
const { escapeRegex, text, safeUrl, toId } = require('../utils/validators');

function cleanFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.slice(0, 5).map((f) => ({ name: text(f?.name, 200), url: safeUrl(f?.url) })).filter((f) => f.url);
}

function applicationFields(b) {
  const out = {};
  const logo = safeUrl(b.logo), website = b.website ? safeUrl(b.website) : '';
  if (logo === null || website === null) return { error: 'Logo and website must be valid links or uploaded files.' };
  if (b.companyName !== undefined) out.companyName = text(b.companyName, 120);
  if (b.productsServices !== undefined) out.productsServices = text(b.productsServices, 1500);
  if (b.description !== undefined) out.description = text(b.description, 2000);
  if (b.contactPhone !== undefined) out.contactPhone = text(b.contactPhone, 40);
  if (b.documents !== undefined) out.documents = text(b.documents, 500);
  if (b.category !== undefined) out.category = CATEGORIES.includes(b.category) ? b.category : 'Other';
  if (b.logo !== undefined) out.logo = logo;
  if (b.website !== undefined) out.website = website;
  if (b.documentFiles !== undefined) out.documentFiles = cleanFiles(b.documentFiles);
  return out;
}

async function applyExhibitor(req, res) {
  const eventId = toId(req.body.eventId);
  const fields = applicationFields(req.body);
  if (fields.error) return res.status(400).json({ message: fields.error });
  if (!eventId || !fields.companyName || !fields.productsServices) return res.status(400).json({ message: 'Event, company name, and products/services are required.' });
  const event = await Event.findOne({ _id: eventId, status: 'published' });
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  try {
    const application = await ExhibitorApplication.create({ ...fields, event: eventId, exhibitor: req.user._id });
    await notify([event.createdBy], { type: 'application', title: 'New exhibitor application', body: `${application.companyName} applied for ${event.title}.`, tab: 'exhibitors', event: event._id });
    realtime.emitToUser(event.createdBy, 'analytics:changed', { eventId: event._id });
    return res.status(201).json({ message: 'Exhibitor application submitted.', application });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'You have already applied for this event.' });
    throw e;
  }
}

async function myApplications(req, res) {
  const applications = await ExhibitorApplication.find({ exhibitor: req.user._id }).populate('event', 'title date location').sort({ createdAt: -1 });
  const booths = await Booth.find({ exhibitor: req.user._id }).populate('event', 'title');
  res.json({ applications, booths });
}

// Exhibitors may update their own submission (description, logo, contacts...) but never its status.
async function updateMyApplication(req, res) {
  const application = await ExhibitorApplication.findOne({ _id: req.params.id, exhibitor: req.user._id });
  if (!application) return res.status(404).json({ message: 'Application not found.' });
  const fields = applicationFields(req.body);
  if (fields.error) return res.status(400).json({ message: fields.error });
  if (fields.companyName === '' || fields.productsServices === '') return res.status(400).json({ message: 'Company name and products/services cannot be empty.' });
  Object.assign(application, fields);
  await application.save();
  res.json({ message: 'Exhibitor profile updated.', application });
}

async function eventApplications(req, res) {
  const event = await Event.findOne({ _id: req.params.eventId, createdBy: req.user._id });
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  const applications = await ExhibitorApplication.find({ event: event._id }).populate('exhibitor', 'name email').sort({ createdAt: -1 });
  res.json({ applications });
}

async function reviewApplication(req, res) {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ message: 'Choose a valid application status.' });
  const application = await ExhibitorApplication.findById(req.params.id).populate('event');
  if (!application || !application.event || String(application.event.createdBy) !== String(req.user._id)) return res.status(404).json({ message: 'Application not found.' });
  application.status = status;
  application.organizerNote = text(req.body.organizerNote, 1000);
  await application.save();
  if (status !== 'approved') {
    // A booth can only be held by an approved exhibitor: free it again.
    const freed = await Booth.updateMany({ application: application._id }, { $set: { status: 'available', exhibitor: null, application: null, details: '', products: '', staff: '' } });
    if (freed.modifiedCount) realtime.emitToEvent(application.event._id, 'booths:changed', {});
  }
  await notify([application.exhibitor], { type: 'application', title: `Application ${status}`, body: `${application.companyName} · ${application.event.title}${application.organizerNote ? ` — ${application.organizerNote}` : ''}`, tab: 'applications', event: application.event._id });
  realtime.emitToUser(req.user._id, 'analytics:changed', { eventId: application.event._id });
  res.json({ message: `Application ${status}.`, application });
}

// Directory search for attendees/exhibitors: keyword, category, event filters.
async function searchExhibitors(req, res) {
  const q = String(req.query.search || '').trim();
  const filter = { status: 'approved' };
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ companyName: rx }, { productsServices: rx }, { description: rx }, { category: rx }]; }
  if (req.query.category && req.query.category !== 'All') filter.category = String(req.query.category);
  if (req.query.eventId) { const id = toId(req.query.eventId); if (!id) return res.json({ exhibitors: [] }); filter.event = id; }
  const apps = await ExhibitorApplication.find(filter).populate('event', 'title location date').populate('exhibitor', 'name email phone shareContact').sort({ companyName: 1 }).limit(200);
  const booths = await Booth.find({ application: { $in: apps.map((a) => a._id) } }).select('application boothNumber event');
  const boothByApp = new Map(booths.map((b) => [String(b.application), b.boothNumber]));
  res.json({
    exhibitors: apps.map((a) => {
      const o = a.toObject();
      const share = a.exhibitor?.shareContact !== false;
      return {
        ...o, boothNumber: boothByApp.get(String(a._id)) || null,
        contactPhone: share ? o.contactPhone : '', documents: undefined, documentFiles: undefined, organizerNote: undefined,
        exhibitor: a.exhibitor ? { _id: a.exhibitor._id, name: a.exhibitor.name, email: share ? a.exhibitor.email : undefined } : null,
      };
    }),
  });
}

// Records a profile/booth view (used for booth-traffic analytics). One view per visitor per 30 minutes.
async function recordVisit(req, res) {
  const application = await ExhibitorApplication.findOne({ _id: req.params.id, status: 'approved' }).populate('event', 'createdBy');
  if (!application) return res.status(404).json({ message: 'Exhibitor not found.' });
  const own = String(application.exhibitor) === String(req.user._id) || String(application.event.createdBy) === String(req.user._id);
  if (own) return res.json({ recorded: false });
  const recent = await Visit.exists({ application: application._id, visitor: req.user._id, createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) } });
  if (recent) return res.json({ recorded: false });
  await Visit.create({ event: application.event._id, application: application._id, visitor: req.user._id });
  realtime.emitToUser(application.event.createdBy, 'analytics:changed', { eventId: application.event._id });
  res.status(201).json({ recorded: true });
}

module.exports = { applyExhibitor, myApplications, updateMyApplication, eventApplications, reviewApplication, searchExhibitors, recordVisit, User };
