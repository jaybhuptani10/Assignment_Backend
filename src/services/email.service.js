import nodemailer from "nodemailer";

// Lazy initialization of transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(
        "⚠️ Email credentials not found in .env. Email would have been sent to:",
        to,
      );
      console.log("   Subject:", subject);
      return null;
    }

    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: `"TaskFlow Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return null;
  }
};
