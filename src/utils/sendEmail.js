import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  // 🔥 transporter INSIDE function
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 🔎 Debug (remove later)
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "LOADED" : "MISSING");

  await transporter.sendMail({
    from: `"Ecommerce App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
