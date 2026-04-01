const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../config/logger");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return transporter;
}

async function sendResetPasswordEmail(email, token) {
  const t = getTransporter();
  const resetUrl = `${env.clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;

  if (!t) {
    logger.info("SMTP not configured; reset link generated only", { email, resetUrl });
    return;
  }

  await t.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: "NAMASTE Password Reset",
    text: `Use this link to reset your password: ${resetUrl}`
  });
}

module.exports = { sendResetPasswordEmail };
