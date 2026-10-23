// Checks your SMTP settings:  npm run test-email -- you@example.com
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

(async () => {
  const to = process.argv[2];
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing in backend/.env: ${missing.join(', ')}`);
  if (!to) throw new Error('Usage: npm run test-email -- you@example.com');

  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465, auth: { user: SMTP_USER.trim(), pass: SMTP_PASS.replace(/\s+/g, '') } });
  await transporter.verify();
  console.log('SMTP login OK. Sending a test email...');
  await transporter.sendMail({ from: process.env.SMTP_FROM || `"EventSphere" <${SMTP_USER}>`, to, subject: 'EventSphere test email', text: 'If you can read this, email sending works.' });
  console.log(`Sent to ${to}. Check the inbox and the spam folder.`);
})().catch((e) => {
  console.error('EMAIL TEST FAILED:', e.message);
  if (/Invalid login|535|Username and Password/i.test(e.message)) console.error('Gmail needs an App Password (Google Account > Security > 2-Step Verification > App passwords), not your normal password.');
  process.exit(1);
});
