const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TYPES = {
  'image/png': { ext: 'png', magic: (b) => b.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  'image/jpeg': { ext: 'jpg', magic: (b) => b.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  'image/gif': { ext: 'gif', magic: (b) => b.slice(0, 3).toString() === 'GIF' },
  'image/webp': { ext: 'webp', magic: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' },
  'application/pdf': { ext: 'pdf', magic: (b) => b.slice(0, 4).toString() === '%PDF' },
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}.${TYPES[file.mimetype].ext}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TYPES[file.mimetype]) return cb(Object.assign(new Error('Only PNG, JPG, WEBP, GIF images and PDF documents are allowed.'), { statusCode: 400 }));
    return cb(null, true);
  },
});

// Verifies the real file signature so a renamed file cannot be passed off as an image/PDF.
function verifySignature(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Choose a file to upload.' });
  const head = Buffer.alloc(12);
  const fd = fs.openSync(req.file.path, 'r');
  fs.readSync(fd, head, 0, 12, 0);
  fs.closeSync(fd);
  if (!TYPES[req.file.mimetype].magic(head)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'The file content does not match its type.' });
  }
  return next();
}

module.exports = { upload, verifySignature, UPLOAD_DIR };
