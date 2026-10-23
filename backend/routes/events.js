const express = require('express');
const { requireAuth, optionalAuth, requireOrganizer } = require('../middleware/auth');
const c = require('../controllers/eventController');
const router = express.Router();

router.get('/', optionalAuth, c.listEvents);
router.get('/mine', requireAuth, c.myEvents);
router.get('/:id', optionalAuth, c.getEvent);
router.post('/', requireAuth, requireOrganizer, c.createEvent);
router.put('/:id', requireAuth, requireOrganizer, c.updateEvent);
router.delete('/:id', requireAuth, requireOrganizer, c.deleteEvent);
router.post('/:id/register', requireAuth, c.registerForEvent);
router.delete('/:id/register', requireAuth, c.unregisterFromEvent);
router.post('/:id/bookmark', requireAuth, c.toggleBookmark);

module.exports = router;
