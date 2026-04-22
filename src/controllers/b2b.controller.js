import { sendEmail } from "../utils/sendEmail.js";

export const handleB2B = async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      estimatedQuantity,
      category,
      message,
    } = req.body;

    // ✅ Validation
    if (
      !companyName ||
      !contactPerson ||
      !email ||
      !phone ||
      !estimatedQuantity ||
      !category ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!process.env.BUSINESS_EMAIL) {
      throw new Error("BUSINESS_EMAIL not configured");
    }

    // ✅ Send email to business
    await sendEmail({
      to: process.env.BUSINESS_EMAIL,
      subject: `🔥 New B2B Enquiry from ${companyName}`,
      html: `
        <h2>🏢 New B2B Enquiry</h2>

        <p><b>Company:</b> ${companyName}</p>
        <p><b>Contact Person:</b> ${contactPerson}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>

        <hr/>

        <p><b>Category:</b> ${category}</p>
        <p><b>Estimated Quantity:</b> ${estimatedQuantity}</p>

        <hr/>

        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    });

    // ⚠️ Optional auto-reply (disable if quota issue)
    /*
    await sendEmail({
      to: email,
      subject: "We received your B2B enquiry",
      html: `
        <h3>Hi ${contactPerson},</h3>
        <p>Thanks for reaching out to us for bulk orders 🙌</p>
        <p>Our team will contact you shortly with pricing and details.</p>
        <br/>
        <p>- Team DesiiGlobal</p>
      `,
    });
    */

    return res.status(200).json({
      success: true,
      message: "B2B enquiry sent successfully",
    });

  } catch (error) {
    console.error("B2B ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send enquiry",
    });
  }
};