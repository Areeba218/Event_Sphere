const Event = require('../models/Event');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const Booth = require('../models/Booth');
const notify = require('../utils/notify');
const realtime = require('../utils/realtime');
const { areNeighbors } = require('../utils/booths');
const { text } = require('../utils/validators');

const changed = (eventId) => realtime.emitToEvent(eventId, 'booths:changed', {});

// Floor plan for an event. Staff names / exhibitor emails are only visible to the organizer and the booth owner.
async function listBooths(req, res) {
  const event = await Event.findById(req.params.eventId);
  if (!event || (event.status !== 'published' && String(event.createdBy) !== String(req.user._id))) return res.status(404).json({ message: 'Event not found.' });
  const isOrganizer = String(event.createdBy) === String(req.user._id);
  const booths = await Booth.find({ event: event._id }).populate('exhibitor', 'name email').populate('application', 'companyName logo category').sort({ boothNumber: 1 });
  res.json({
    booths: booths.map((b) => {
      const mine = b.exhibitor && String(b.exhibitor._id) === String(req.user._id);
      return {
        _id: b._id, event: b.event, boothNumber: b.boothNumber, size: b.size, columns: b.columns, price: b.price, status: b.status,
        company: b.application ? { applicationId: b.application._id, name: b.application.companyName, logo: b.application.logo, category: b.application.category } : null,
        exhibitor: b.exhibitor ? { _id: b.exhibitor._id, name: b.exhibitor.name, ...(isOrganizer ? { email: b.exhibitor.email } : {}) } : null,
        details: b.details, products: b.products, staff: isOrganizer || mine ? b.staff : undefined, mine: !!mine,
      };
    }),
  });
}

async function createBooths(req, res) {
  const event = await Event.findOne({ _id: req.params.eventId, createdBy: req.user._id });
  if (!event) return res.status(404).json({ message: 'Event not found.' });
  const count = Math.max(1, Math.min(200, Number(req.body.count) || 20));
  const columns = Math.max(1, Math.min(20, Number(req.body.columns) || 6));
  const prefix = text(req.body.prefix, 4).toUpperCase() || 'B';
  const docs = [];
  for (let i = 1; i <= count; i++) docs.push({ event: event._id, boothNumber: `${prefix}${String(i).padStart(2, '0')}`, size: text(req.body.size, 30) || '3m x 3m', columns, price: Math.max(0, Number(req.body.price) || 0) });
  try { await Booth.insertMany(docs, { ordered: false }); } catch (e) { if (e.code !== 11000 && !e.writeErrors) throw e; } // existing numbers are skipped
  changed(event._id);
  const booths = await Booth.find({ event: event._id }).sort({ boothNumber: 1 });
  res.status(201).json({ message: 'Booth floor plan updated.', booths });
}

// Organizer assigns (or confirms a reservation for) an approved exhibitor.
async function assignBooth(req, res) {
  const booth = await Booth.findById(req.params.id).populate('event');
  if (!booth || String(booth.event.createdBy) !== String(req.user._id)) return res.status(404).json({ message: 'Booth not found.' });
  const application = await ExhibitorApplication.findById(req.body.applicationId);
  if (!application || String(application.event) !== String(booth.event._id) || application.status !== 'approved') return res.status(400).json({ message: 'An approved exhibitor application is required.' });
  if (booth.application && String(booth.application) !== String(application._id)) return res.status(409).json({ message: 'This booth is already held by another exhibitor. Release it first.' });
  const other = await Booth.findOne({ application: application._id, _id: { $ne: booth._id } });
  if (other) return res.status(409).json({ message: `This exhibitor already holds booth ${other.boothNumber}.` });
  booth.exhibitor = application.exhibitor; booth.application = application._id; booth.status = 'assigned';
  if (req.body.details !== undefined) booth.details = text(req.body.details, 1500);
  if (req.body.staff !== undefined) booth.staff = text(req.body.staff, 1000);
  await booth.save();
  await notify([application.exhibitor], { type: 'booth', title: `Booth ${booth.boothNumber} confirmed`, body: `${booth.event.title}`, tab: 'applications', event: booth.event._id });
  changed(booth.event._id);
  realtime.emitToUser(req.user._id, 'analytics:changed', { eventId: booth.event._id });
  res.json({ message: 'Booth assigned successfully.', booth });
}

async function releaseBooth(req, res) {
  const booth = await Booth.findById(req.params.id).populate('event');
  if (!booth || String(booth.event.createdBy) !== String(req.user._id)) return res.status(404).json({ message: 'Booth not found.' });
  const former = booth.exhibitor;
  Object.assign(booth, { status: 'available', exhibitor: null, application: null, details: '', products: '', staff: '' });
  await booth.save();
  if (former) await notify([former], { type: 'booth', title: `Booth ${booth.boothNumber} released`, body: booth.event.title, tab: 'applications', event: booth.event._id });
  changed(booth.event._id);
  res.json({ message: 'Booth released.', booth });
}

// Exhibitor picks an available booth. It becomes "reserved" until the organizer confirms it.
async function reserveBooth(req, res) {
  const application = await ExhibitorApplication.findOne({ _id: req.body.applicationId, exhibitor: req.user._id, status: 'approved' }).populate('event', 'title createdBy');
  if (!application) return res.status(400).json({ message: 'Only an approved application can reserve a booth.' });
  const held = await Booth.findOne({ application: application._id });
  if (held) return res.status(409).json({ message: `You already hold booth ${held.boothNumber}. Release it before choosing another.` });
  const booth = await Booth.findOneAndUpdate(
    { _id: req.params.id, event: application.event._id, status: 'available' },
    { $set: { status: 'reserved', exhibitor: req.user._id, application: application._id } }, { returnDocument: 'after' });
  if (!booth) return res.status(409).json({ message: 'This booth is no longer available.' });
  await notify([application.event.createdBy], { type: 'booth', title: `Booth ${booth.boothNumber} reserved`, body: `${application.companyName} reserved a booth at ${application.event.title}. Confirm it from the floor plan.`, tab: 'floorplan', event: application.event._id });
  changed(application.event._id);
  realtime.emitToUser(application.event.createdBy, 'analytics:changed', { eventId: application.event._id });
  res.json({ message: `Booth ${booth.boothNumber} reserved. The organizer will confirm it.`, booth });
}

async function cancelReservation(req, res) {
  const booth = await Booth.findOneAndUpdate({ _id: req.params.id, exhibitor: req.user._id, status: 'reserved' },
    { $set: { status: 'available', exhibitor: null, application: null, details: '', products: '', staff: '' } }, { returnDocument: 'after' });
  if (!booth) return res.status(404).json({ message: 'No reservation found. Confirmed booths can only be released by the organizer.' });
  changed(booth.event);
  res.json({ message: 'Reservation cancelled.', booth });
}

async function updateMyBooth(req, res) {
  const booth = await Booth.findOne({ _id: req.params.id, exhibitor: req.user._id });
  if (!booth) return res.status(404).json({ message: 'Booth not found.' });
  for (const f of ['details', 'products', 'staff']) if (req.body[f] !== undefined) booth[f] = text(req.body[f], 1500);
  await booth.save();
  changed(booth.event);
  res.json({ message: 'Booth details saved.', booth });
}

// Neighbouring exhibitors (for collaboration). Contact details respect each user's privacy setting.
async function neighbors(req, res) {
  const mine = await Booth.findOne({ _id: req.params.id, exhibitor: req.user._id });
  if (!mine) return res.status(404).json({ message: 'Booth not found.' });
  const all = await Booth.find({ event: mine.event, exhibitor: { $ne: null } }).populate('exhibitor', 'name email phone shareContact').populate('application', 'companyName category');
  res.json({
    neighbors: all.filter((b) => areNeighbors(mine, b)).map((b) => ({
      boothNumber: b.boothNumber, exhibitorId: b.exhibitor._id, name: b.exhibitor.name, company: b.application?.companyName, category: b.application?.category,
      email: b.exhibitor.shareContact ? b.exhibitor.email : undefined, phone: b.exhibitor.shareContact ? b.exhibitor.phone : undefined,
    })),
  });
}

module.exports = { listBooths, createBooths, assignBooth, releaseBooth, reserveBooth, cancelReservation, updateMyBooth, neighbors };
