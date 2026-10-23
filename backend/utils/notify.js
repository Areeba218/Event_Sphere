const Notification = require('../models/Notification');
const realtime = require('./realtime');
const logger = require('./logger');

// Create in-app notifications and push them to connected clients.
async function notify(userIds, { type = 'system', title, body = '', tab = '', event = null }) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  if (!unique.length) return [];
  try {
    const docs = await Notification.insertMany(unique.map((user) => ({ user, type, title, body, tab, event })));
    docs.forEach((doc) => realtime.emitToUser(doc.user, 'notification:new', doc.toObject()));
    return docs;
  } catch (error) {
    logger.error('Could not create notifications', { error: error.message });
    return [];
  }
}

module.exports = notify;
