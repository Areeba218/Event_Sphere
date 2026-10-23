const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const metrics = require('./utils/metrics');
const sanitize = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { UPLOAD_DIR } = require('./middleware/upload');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const portalRoutes = require('./routes/portal');
const uploadRoutes = require('./routes/uploads');

function allowedOrigins() {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map((s) => s.trim().replace(/\/+$/, ''));
  return [...new Set([...configured, 'http://localhost:5173'])];
}

function createApp() {
  const app = express();
  const isTest = process.env.NODE_ENV === 'test';
  const limitsOff = isTest || process.env.RATE_LIMIT_DISABLED === 'true';

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // uploads are loaded by the frontend origin
  app.use(cors({ origin: allowedOrigins(), methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(metrics.middleware);
  if (!isTest) {
    fs.mkdirSync(logger.LOG_DIR, { recursive: true });
    app.use(morgan('combined', { stream: fs.createWriteStream(logger.accessLogPath, { flags: 'a' }) }));
    app.use(morgan('dev'));
  }
  app.use(express.json({ limit: '1mb' }));
  app.use(sanitize);

  const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.API_RATE_LIMIT || 600), standardHeaders: 'draft-7', legacyHeaders: false, skip: () => limitsOff, message: { message: 'Too many requests. Please slow down and try again shortly.' } });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT || 60), standardHeaders: 'draft-7', legacyHeaders: false, skip: () => limitsOff, message: { message: 'Too many attempts. Please wait a few minutes and try again.' } });

  app.get('/', (req, res) => res.status(200).json({ message: 'Welcome to the EventSphere Management API.', status: 'Backend is running.' }));
  app.get('/health', (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'connected' : 'disconnected', uptimeSeconds: Math.round(process.uptime()), time: new Date().toISOString() });
  });

  app.use('/uploads', express.static(UPLOAD_DIR, { index: false, dotfiles: 'deny', setHeaders: (res, file) => { res.setHeader('X-Content-Type-Options', 'nosniff'); if (file.endsWith('.pdf')) res.setHeader('Content-Disposition', 'attachment'); } }));
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/portal', portalRoutes);
  app.use('/api/uploads', uploadRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp, allowedOrigins };
