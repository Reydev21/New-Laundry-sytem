const nodemailer = require("nodemailer");

const buildTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const user = smtpUser && smtpUser.includes("@") ? smtpUser : process.env.EMAIL_FROM;
  const pass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!host || !user || !pass || String(pass).includes("PASTE_")) {
    console.warn("[EMAIL] SMTP is not configured with a valid Gmail App Password.");
    return null;
  }
  if (user !== smtpUser) {
    console.warn("[EMAIL] SMTP_USER is not an email address; using EMAIL_FROM for Gmail authentication.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: Number(port) === 465,
    auth: {
      user,
      pass,
    },
  });
};

const sendOtpEmail = async ({ to, name, otp }) => {
  if (!to || !otp) {
    return { sent: false, reason: "Missing recipient or OTP code" };
  }

  const transporter = buildTransporter();
  if (!transporter) {
    console.warn("[EMAIL] SMTP is not configured. OTP will only be logged server-side.");
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject: "Your LaundriTrack OTP Code",
      text: `Hello ${name || "there"},\n\nYour OTP code is ${otp}. It expires in 5 minutes.\n\nDo not share this code with anyone.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h3>Hello ${name || "there"},</h3>
          <p>Your OTP code is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 0.2em; margin: 12px 0;">${otp}</p>
          <p>It expires in 5 minutes.</p>
          <p><strong>Do not share this code with anyone.</strong></p>
        </div>
      `,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL] Failed to send OTP email:", error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = { sendOtpEmail };
