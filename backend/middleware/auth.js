const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { error: { status: 401, message: 'Please sign in to continue.' } };
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return { error: { status: 401, message: 'Your session has expired. Please sign in again.' } };
  }
  const user = await User.findById(payload.id).select('-password -resetPasswordToken -emailVerificationToken');
  if (!user) return { error: { status: 401, message: 'Your account could not be found. Please sign in again.' } };
  if (!user.isEmailVerified) return { error: { status: 403, message: 'Please verify your email address first.' } };
  return { user };
}

async function requireAuth(req, res, next) {
  const { user, error } = await loadUser(req);
  if (error) return res.status(error.status).json({ message: error.message });
  req.user = user;
  return next();
}

// Attaches req.user when a valid token is present but never rejects the request.
async function optionalAuth(req, res, next) {
  if (req.headers.authorization) {
    const { user } = await loadUser(req);
    if (user) req.user = user;
  }
  return next();
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    const label = roles.join(' or ');
    return res.status(403).json({ message: `${label.charAt(0).toUpperCase()}${label.slice(1)} access is required for this action.` });
  }
  return next();
};

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  requireOrganizer: requireRole('organizer'),
  requireExhibitor: requireRole('exhibitor'),
};
