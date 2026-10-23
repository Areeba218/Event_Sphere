const nodemailer = require('nodemailer');

// EMAIL_MODE=console prints emails instead of sending them (development/testing only).
const outbox = [];

async function sendViaBrevo({ to, subject, text, html }) {
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is missing from the environment.');

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY.trim(),
    },
    body: JSON.stringify({
      sender: { name: 'EventSphere', email: senderEmail },
      to: recipients,
      subject,
      textContent: text,
      ...(html ? { htmlContent: html } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo API error ${response.status}: ${detail}`);
  }
}

async function sendViaSmtp({ to, subject, text, html }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
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

async function sendEmail({ to, subject, text, html }) {
  if (process.env.EMAIL_MODE === 'console') {
    outbox.push({ to, subject, text, html });
    if (process.env.NODE_ENV !== 'test') console.log(`[email:console] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo({ to, subject, text, html });
  }

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email configuration is missing from the environment.');
  }
  return sendViaSmtp({ to, subject, text, html });
}

const emailConfigured = () =>
  process.env.EMAIL_MODE === 'console' ||
  Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) ||
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

module.exports = sendEmail;
module.exports.outbox = outbox;
module.exports.emailConfigured = emailConfigured;