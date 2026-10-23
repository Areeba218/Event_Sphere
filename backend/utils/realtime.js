// Real-time updates over Socket.IO.
//  - every client joins the "public" room (event list changes)
//  - signed-in clients join "user:<id>" (notifications, messages, personal updates)
//  - clients may join "event:<id>" to hear schedule and booth changes for that event
// Payloads are tiny change signals; clients re-fetch data through the authenticated REST API.
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const { isObjectId } = require('./validators');

let io = null;

function init(httpServer, corsOrigins) {
  io = new Server(httpServer, { cors: { origin: corsOrigins, methods: ['GET', 'POST'] } });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(); // anonymous visitors only receive public signals
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select('role isEmailVerified');
      if (!user || !user.isEmailVerified) return next(new Error('unauthorized'));
      socket.data.user = { id: String(user._id), role: user.role };
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('public');
    if (socket.data.user) socket.join(`user:${socket.data.user.id}`);
    socket.on('event:join', (eventId) => isObjectId(eventId) && socket.join(`event:${eventId}`));
    socket.on('event:leave', (eventId) => isObjectId(eventId) && socket.leave(`event:${eventId}`));
  });
  return io;
}

const emitPublic = (name, payload = {}) => io?.to('public').emit(name, payload);
const emitToEvent = (eventId, name, payload = {}) => io?.to(`event:${eventId}`).emit(name, { eventId: String(eventId), ...payload });
const emitToUser = (userId, name, payload = {}) => io?.to(`user:${userId}`).emit(name, payload);
const connectedClients = () => (io ? io.engine.clientsCount : 0);
const close = () => io?.close();

module.exports = { init, emitPublic, emitToEvent, emitToUser, connectedClients, close };
