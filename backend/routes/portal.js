const express = require('express');
const { requireAuth, requireOrganizer, requireExhibitor } = require('../middleware/auth');
const exhibitor = require('../controllers/exhibitorController');
const booth = require('../controllers/boothController');
const schedule = require('../controllers/scheduleController');
const analytics = require('../controllers/analyticsController');
const comm = require('../controllers/communicationController');
const profile = require('../controllers/profileController');

const r = express.Router();
r.get('/feedback/public', comm.publicFeedback);
r.use(requireAuth);

// profile, password, privacy
r.get('/profile', profile.profile);
r.put('/profile', profile.updateProfile);
r.post('/profile/password', profile.changePassword);
r.get('/privacy/export', profile.exportData);
r.delete('/privacy/account', profile.deleteAccount);

// exhibitor portal
r.post('/exhibitor/apply', requireExhibitor, exhibitor.applyExhibitor);
r.get('/exhibitor/applications', requireExhibitor, exhibitor.myApplications);
r.patch('/exhibitor/applications/:id', requireExhibitor, exhibitor.updateMyApplication);
r.post('/exhibitor/booths/:id/reserve', requireExhibitor, booth.reserveBooth);
r.delete('/exhibitor/booths/:id/reserve', requireExhibitor, booth.cancelReservation);
r.patch('/exhibitor/booths/:id', requireExhibitor, booth.updateMyBooth);
r.get('/exhibitor/booths/:id/neighbors', requireExhibitor, booth.neighbors);

// organizer: applications & booths
r.get('/organizer/events/:eventId/applications', requireOrganizer, exhibitor.eventApplications);
r.patch('/organizer/applications/:id', requireOrganizer, exhibitor.reviewApplication);
r.post('/organizer/events/:eventId/booths', requireOrganizer, booth.createBooths);
r.patch('/organizer/booths/:id/assign', requireOrganizer, booth.assignBooth);
r.patch('/organizer/booths/:id/release', requireOrganizer, booth.releaseBooth);

// floor plan & directory (all signed-in roles)
r.get('/events/:eventId/booths', booth.listBooths);
r.get('/exhibitors', exhibitor.searchExhibitors);
r.get('/exhibitors/search', exhibitor.searchExhibitors);
r.post('/exhibitors/:id/view', exhibitor.recordVisit);

// schedule
r.get('/events/:eventId/schedule', schedule.getSchedule);
r.post('/organizer/events/:eventId/schedule/:id', requireOrganizer, schedule.upsertSchedule);
r.delete('/organizer/schedule/:id', requireOrganizer, schedule.deleteSchedule);
r.get('/schedule/bookmarks', schedule.mySessions);
r.post('/schedule/:id/register', schedule.registerSession);
r.delete('/schedule/:id/register', schedule.unregisterSession);
r.post('/schedule/:id/bookmark', schedule.bookmarkSession);

// analytics & monitoring
r.get('/organizer/events/:eventId/analytics', requireOrganizer, analytics.analytics);
r.get('/organizer/events/:eventId/analytics/export', requireOrganizer, analytics.exportAnalytics);
r.get('/organizer/metrics', requireOrganizer, analytics.systemMetrics);

// feedback & support
r.post('/feedback', comm.feedback);
r.get('/feedback/mine', comm.myFeedback);
r.delete('/feedback/:id', comm.deleteFeedback);
r.get('/organizer/feedback', requireOrganizer, comm.listFeedback);
r.patch('/organizer/feedback/:id', requireOrganizer, comm.updateFeedbackStatus);

// messages & notifications
r.post('/messages', comm.sendMessage);
r.get('/messages', comm.messages);
r.get('/messages/threads', comm.threads);
r.get('/notifications', comm.notifications);
r.patch('/notifications/read-all', comm.markAllRead);
r.patch('/notifications/:id/read', comm.markRead);

module.exports = r;
