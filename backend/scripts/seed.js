// Demo data for recording the walkthrough video:  npm run seed
// Creates verified demo accounts (password: Demo1234), one expo, booths, sessions and a few exhibitors.
// Re-running removes and recreates the demo data only.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const Booth = require('../models/Booth');
const ExhibitorApplication = require('../models/ExhibitorApplication');
const ScheduleSession = require('../models/ScheduleSession');

const PASSWORD = 'Demo1234';
const hours = (h) => new Date(Date.now() + h * 3600 * 1000);

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const demoUsers = await User.find({ email: /@demo\.eventsphere\.test$/ });
  const ids = demoUsers.map((u) => u._id);
  const events = await Event.find({ createdBy: { $in: ids } });
  await Promise.all([
    ExhibitorApplication.deleteMany({ event: { $in: events.map((e) => e._id) } }), Booth.deleteMany({ event: { $in: events.map((e) => e._id) } }),
    ScheduleSession.deleteMany({ event: { $in: events.map((e) => e._id) } }), Event.deleteMany({ _id: { $in: events.map((e) => e._id) } }), User.deleteMany({ _id: { $in: ids } }),
  ]);

  const password = await bcrypt.hash(PASSWORD, 12);
  const mk = (name, role, extra = {}) => User.create({ name, email: `${role}${extra.n || ''}@demo.eventsphere.test`, password, role, isEmailVerified: true, consentAt: new Date(), consentVersion: '2026-10', ...extra });
  const organizer = await mk('Olivia Organizer', 'organizer');
  const attendee = await mk('Adam Attendee', 'attendee');
  const ex1 = await mk('Eva Exhibitor', 'exhibitor', { n: 1, companyName: 'NovaTech' });
  const ex2 = await mk('Ethan Exhibitor', 'exhibitor', { n: 2, companyName: 'GreenLeaf Foods' });
  const ex3 = await mk('Emma Exhibitor', 'exhibitor', { n: 3, companyName: 'MedCore' });

  const event = await Event.create({ title: 'Pakistan Tech Expo 2026', category: 'Technology', theme: 'AI & Digital Innovation', description: 'Three days of exhibitions, talks and workshops on emerging technology.', location: 'Expo Centre, Karachi', date: hours(72), endDate: hours(120), capacity: 500, createdBy: organizer._id, status: 'published' });
  const apps = await ExhibitorApplication.insertMany([
    { event: event._id, exhibitor: ex1._id, companyName: 'NovaTech', category: 'Technology', productsServices: 'AI vision cameras and robotics kits', description: 'Pakistan-based robotics startup.', status: 'approved' },
    { event: event._id, exhibitor: ex2._id, companyName: 'GreenLeaf Foods', category: 'Food & Beverage', productsServices: 'Organic snacks and beverages', status: 'approved' },
    { event: event._id, exhibitor: ex3._id, companyName: 'MedCore', category: 'Healthcare', productsServices: 'Portable diagnostic devices', status: 'pending' },
  ]);
  const booths = await Booth.insertMany(Array.from({ length: 18 }, (_, i) => ({ event: event._id, boothNumber: `B${String(i + 1).padStart(2, '0')}`, columns: 6 })));
  await Booth.updateOne({ _id: booths[0]._id }, { status: 'assigned', exhibitor: ex1._id, application: apps[0]._id, products: 'Vision cameras, robot kits', staff: 'Eva, Sam' });
  await Booth.updateOne({ _id: booths[1]._id }, { status: 'assigned', exhibitor: ex2._id, application: apps[1]._id, products: 'Organic snacks' });
  await ScheduleSession.insertMany([
    { event: event._id, title: 'Opening Keynote: AI in Pakistan', topic: 'AI', speaker: 'Dr. Ayesha Khan', location: 'Main Hall', startTime: hours(73), endTime: hours(74) },
    { event: event._id, title: 'Workshop: Building with Robotics', topic: 'Robotics', speaker: 'Eva Exhibitor', location: 'Room B', startTime: hours(75), endTime: hours(77) },
  ]);
  console.log(`Demo data ready. Password for all demo accounts: ${PASSWORD}`);
  [organizer, attendee, ex1, ex2, ex3].forEach((u) => console.log(`  ${u.role.padEnd(9)} ${u.email}`));
  await mongoose.disconnect();
})().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
