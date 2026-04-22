// controllers/contactController.ts

import { sendEmail } from "../utils/sendEmail.js";

export const handleContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
console.log("Contact Request:", { name, email, subject, message });
console.log(process.env.BUSINESS_EMAIL)
    // 1. Send email to YOUR business
    await sendEmail({
      to: process.env.BUSINESS_EMAIL,
      subject: `New Contact: ${subject}`,
      html: `
        <h2>📩 New Contact Form Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    });

    // 2. (Optional but PRO 🔥) Auto-reply to user
    await sendEmail({
      to: email,
      subject: "We received your message",
      html: `
        <h3>Hi ${name},</h3>
        <p>Thanks for contacting us 🙌</p>
        <p>Our team will get back to you within 24 hours.</p>
        <br/>
        <p>- Team DesiiGlobal</p>
      `,
    });

    res.status(200).json({ success: true, message: "Message sent" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};