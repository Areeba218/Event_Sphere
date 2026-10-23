const nodemailer = require('nodemailer');

// EMAIL_MODE=console prints emails instead of sending them (development/testing only).
const outbox = [];

async function sendEmail({ to, subject, text, html }) {
  if (process.env.EMAIL_MODE === 'console') {
    outbox.push({ to, subject, text, html });
    if (process.env.NODE_ENV !== 'test') console.log(`[email:console] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email configuration is missing from the environment.');
  }

  const port = Number(SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: SMTP_USER.trim(), pass: SMTP_PASS.replace(/\s+/g, '') }, // Gmail app passwords are shown with spaces; they must be removed
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"EventSphere" <${SMTP_USER}>`,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}

const emailConfigured = () =>
  process.env.EMAIL_MODE === 'console' || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

module.exports = sendEmail;
module.exports.outbox = outbox;
module.exports.emailConfigured = emailConfigured;
