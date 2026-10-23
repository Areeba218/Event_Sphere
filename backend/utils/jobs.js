// Background jobs: session reminders and optional automatic database backups.
const ScheduleSession = require('../models/ScheduleSession');
const User = require('../models/User');
const notify = require('./notify');
const sendEmail = require('./sendEmail');
const logger = require('./logger');

const REMINDER_MINUTES = Number(process.env.REMINDER_MINUTES || 30);

// Notify everyone who registered for / bookmarked a session that starts soon (once per session).
async function runReminders(now = new Date()) {
  const horizon = new Date(+now + REMINDER_MINUTES * 60 * 1000);
  const sessions = await ScheduleSession.find({ startTime: { $gt: now, $lte: horizon }, remindedAt: null }).populate('event', 'title');
  let sent = 0;
  for (const s of sessions) {
    const claimed = await ScheduleSession.updateOne({ _id: s._id, remindedAt: null }, { $set: { remindedAt: now } }); // avoids duplicates if two workers run
    if (!claimed.modifiedCount) continue;
    const ids = [...new Set([...s.attendees, ...s.bookmarks].map(String))];
    if (!ids.length) continue;
    const when = s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await notify(ids, { type: 'reminder', title: `Starting soon: ${s.title}`, body: `${when} · ${s.location || 'Main hall'} · ${s.event?.title || ''}`, tab: 'bookmarks', event: s.event?._id });
    sent += ids.length;
    if (sendEmail.emailConfigured()) {
      const users = await User.find({ _id: { $in: ids }, reminderEmails: true }).select('email name');
      await Promise.all(users.map((u) => sendEmail({ to: u.email, subject: `Reminder: ${s.title} starts at ${when}`, text: `Hello ${u.name},\n\n"${s.title}" starts at ${when} (${s.location || 'Main hall'}).\n\n— EventSphere` }).catch((e) => logger.warn('Reminder email failed', { error: e.message }))));
    }
  }
  return { sessions: sessions.length, notified: sent };
}

function startJobs() {
  const timers = [];
  timers.push(setInterval(() => runReminders().catch((e) => logger.error('Reminder job failed', { error: e.message })), 60 * 1000));
  const hours = Number(process.env.BACKUP_EVERY_HOURS || 0);
  if (hours > 0) {
    const { runBackup } = require('../scripts/backup');
    timers.push(setInterval(() => runBackup().then((d) => logger.info('Backup completed', { dir: d })).catch((e) => logger.error('Backup failed', { error: e.message })), hours * 3600 * 1000));
    logger.info(`Automatic backups enabled every ${hours}h`);
  }
  timers.forEach((t) => t.unref());
  return () => timers.forEach(clearInterval);
}

module.exports = { runReminders, startJobs };
