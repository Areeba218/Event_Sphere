const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload, verifySignature } = require('../middleware/upload');

const router = express.Router();
router.post('/', requireAuth, upload.single('file'), verifySignature, (req, res) => {
  res.status(201).json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname.slice(0, 200), mimetype: req.file.mimetype, size: req.file.size });
});
module.exports = router;
