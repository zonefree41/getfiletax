// mail.js
const nodemailer = require("nodemailer");

function buildTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn("⚠️ SMTP env vars missing. Emails will be skipped.");
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587/25
        auth: { user, pass },
        pool: true,
    });
}

const transporter = buildTransport();

/**
 * Send a simple HTML email
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 */
async function sendMail({ to, subject, html }) {
    if (!transporter) return { skipped: true };
    const from = process.env.FROM_EMAIL || "no-reply@example.com";
    return transporter.sendMail({ from, to, subject, html });
}

function completionEmailHTML({ clientName, appBaseUrl }) {
    const url = `${appBaseUrl || ""}/login`;
    return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;line-height:1.6">
    <h2 style="margin-bottom:8px">Your tax return is completed ✅</h2>
    <p>Hi ${clientName || "there"},</p>
    <p>Your tax return for this season has been marked <b>Completed</b>.</p>
    <p>You can sign in to your dashboard to view the status and any documents:</p>
    <p><a href="${url}" style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:6px;border:1px solid #222">Open Dashboard</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="color:#666;font-size:12px">If you did not expect this email, please ignore it.</p>
  </div>`;
}

module.exports = { sendMail, completionEmailHTML };
