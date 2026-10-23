const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const enabled = process.env.NODE_ENV !== 'test';
if (enabled) fs.mkdirSync(LOG_DIR, { recursive: true });

// Rotate by size so log files cannot grow without limit (keeps one previous file).
const MAX_BYTES = 5 * 1024 * 1024;
function rotateIfNeeded(file) {
  try {
    if (fs.statSync(file).size > MAX_BYTES) fs.renameSync(file, `${file}.1`);
  } catch { /* file does not exist yet */ }
}

function write(level, message, meta) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...(meta || {}) });
  if (enabled) {
    const file = path.join(LOG_DIR, 'app.log');
    rotateIfNeeded(file);
    fs.appendFile(file, line + '\n', () => {});
    (level === 'error' ? console.error : console.log)(line);
  }
}

module.exports = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
  LOG_DIR,
  accessLogPath: path.join(LOG_DIR, 'access.log'),
};
