const mongoose = require('mongoose');

const isObjectId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const toId = (value) => (isObjectId(String(value || '')) ? String(value) : null);

// Passwords: at least 8 characters, containing a letter and a number.
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number.';
  return null;
}

// Only allow uploaded files from this server or plain http(s) links.
function safeUrl(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (/^\/uploads\/[a-f0-9]{32}\.(png|jpe?g|webp|gif|pdf)$/i.test(v)) return v;
  if (/^https?:\/\/[^\s]+$/i.test(v) && v.length <= 500) return v;
  return null; // invalid
}

const text = (value, max = 500) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const same = (a, b) => String(a) === String(b);

module.exports = { isObjectId, toId, passwordProblem, safeUrl, text, escapeRegex, same, mongoose };
