const mongoose = require('mongoose');
const request = require('supertest');
const sendEmail = require('../utils/sendEmail');
const { createApp } = require('../app');

let memory = null;
async function connect() {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memory = await MongoMemoryServer.create();
    uri = memory.getUri('eventsphere_test');
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
}
async function disconnect() {
  if (mongoose.connection.readyState !== 1) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memory) await memory.stop();
}

const app = createApp();
const api = () => request(app);
let counter = 0;

// Registers + verifies + logs in a user; returns { token, user, auth() }.
async function signup(role = 'attendee', extra = {}) {
  const email = `${role}${++counter}-${Date.now()}@test.dev`;
  const reg = await api().post('/api/auth/register').send({ name: `${role} ${counter}`, email, password: 'Passw0rd!x', role, consent: true, ...extra });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  const mail = sendEmail.outbox.filter((m) => m.to === email).pop();
  const token = mail.text.match(/verify-email\/([a-f0-9]+)/)[1];
  await api().get(`/api/auth/verify-email/${token}`).expect(200);
  const login = await api().post('/api/auth/login').send({ email, password: 'Passw0rd!x' }).expect(200);
  return { email, token: login.body.token, user: login.body.user, auth: (r) => r.set('Authorization', `Bearer ${login.body.token}`) };
}

module.exports = { connect, disconnect, api, signup, sendEmail };
