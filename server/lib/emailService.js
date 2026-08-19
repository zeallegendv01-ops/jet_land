const nodemailer = require('nodemailer');

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

let transporter = null;

function createTransporter() {
  if (transporter) return transporter;
  if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
    return null;
  }
  transporter = nodemailer.createTransport(emailConfig);
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = createTransporter();
  if (!transport) {
    return Promise.resolve({ success: false, message: 'SMTP configuration is not set in environment.' });
  }

  try {
    await transport.sendMail({ from: process.env.EMAIL_FROM || emailConfig.auth.user, to, subject, text, html });
    return { success: true, message: `Email queued to ${to}` };
  } catch (error) {
    return { success: false, message: error.message || 'Failed to send email.' };
  }
}

module.exports = { sendEmail };
