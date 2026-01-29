import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { generateOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";

/* ================= CLOUDINARY CONFIG ================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/* ================= REGISTER ================= */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    // 🖼️ Handle avatar (optional)
   let avatar = null;

if (req.file) {
  avatar = {
    url: req.file.path,
    public_id: req.file.filename,
  };
}


    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      ...(avatar && { avatar }),
      emailOTP: otp,
      emailOTPExpiry: Date.now() + 10 * 60 * 1000,
      ver_email: false,
    });

    try {
      await sendEmail({
        to: email,
        subject: "Verify your email",
        html: `
          <h3>Email Verification</h3>
          <p>Your OTP is:</p>
          <h2>${otp}</h2>
          <p>This OTP is valid for 10 minutes.</p>
        `,
      });
    } catch (emailErr) {
      // 🧹 cleanup user if email fails
      await User.findByIdAndDelete(user._id);

      return res.status(500).json({
        message: "Failed to send verification email",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registered successfully. Verify email via OTP.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ================= VERIFY EMAIL ================= */
export const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.emailOTP !== otp || user.emailOTPExpiry < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.isEmailVerified = true;
  user.emailOTP = undefined;
  user.emailOTPExpiry = undefined;
  await user.save();

  res.json({ success: true, message: "Email verified successfully" });
};

/* ================= LOGIN ================= */
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (!user.isEmailVerified)
    return res.status(403).json({ message: "Email not verified" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(400).json({ message: "Invalid credentials" });

  const accessToken = generateAccessToken(user._id);

  user.lastLogin = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    token: accessToken, // 🔥 IMPORTANT
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
    },
  });
};

/* ================= REFRESH TOKEN ================= */
export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    }).json({ success: true });
  } catch {
    res.status(403).json({ message: "Token expired or invalid" });
  }
};

/* ================= LOGOUT ================= */
export const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  res
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json({ success: true, message: "Logged out successfully" });
};

/* ================= FORGOT PASSWORD ================= */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const otp = generateOTP();
  user.forgotPasswordOTP = otp;
  user.forgotPasswordExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendEmail({
    to: email,
    subject: "Reset Password OTP",
    html: `<h3>Your OTP is ${otp}</h3>`,
  });

  res.json({ success: true, message: "OTP sent to email" });
};

/* ================= RESET PASSWORD ================= */
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (
    user.forgotPasswordOTP !== otp ||
    user.forgotPasswordExpiry < Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.forgotPasswordOTP = undefined;
  user.forgotPasswordExpiry = undefined;
  user.refreshToken = null; // 🔐 invalidate sessions
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
};

/* ================= ME ================= */
export const getMyProfile = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password -refreshToken")
    .populate("address_details");

  res.json({ success: true, user });
};

/* ================= UPDATE PROFILE ================= */
export const updateUserProfile = async (req, res) => {
  const { name, mobile } = req.body;

  if (!name && !mobile) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name, mobile } },
    { new: true }
  ).select("-password -refreshToken");

  res.json({ success: true, user });
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: "All fields required" });

  if (newPassword.length < 6)
    return res.status(400).json({ message: "Password too short" });

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch)
    return res.status(400).json({ message: "Old password incorrect" });

  user.password = await bcrypt.hash(newPassword, 10);
  user.refreshToken = null;
  await user.save();

  res.json({ success: true, message: "Password changed successfully" });
};

/* ================= EMAIL CHANGE ================= */
export const requestEmailChange = async (req, res) => {
  const { newEmail } = req.body;

  if (!newEmail)
    return res.status(400).json({ message: "New email required" });

  const exists = await User.findOne({ email: newEmail });
  if (exists)
    return res.status(409).json({ message: "Email already in use" });

  const otp = generateOTP();

  await User.findByIdAndUpdate(req.user._id, {
    tempEmail: newEmail,
    emailOTP: otp,
    emailOTPExpiry: Date.now() + 10 * 60 * 1000,
  });

  await sendEmail({
    to: newEmail,
    subject: "Verify Email Change",
    html: `<h3>Your OTP is ${otp}</h3>`,
  });

  res.json({ success: true, message: "OTP sent to new email" });
};

export const verifyEmailChange = async (req, res) => {
  const { otp } = req.body;

  const user = await User.findById(req.user._id);
  if (user.emailOTP !== otp || user.emailOTPExpiry < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  user.email = user.tempEmail;
  user.tempEmail = undefined;
  user.emailOTP = undefined;
  user.emailOTPExpiry = undefined;
  user.isEmailVerified = true;
  await user.save();

  res.json({ success: true, message: "Email updated successfully" });
};

// ==================== upload avatar ===========================
export const userAvatarController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No avatar uploaded",
      });
    }

    const user = await User.findById(req.user._id);

    // 🔥 remove old avatar
    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    user.avatar = {
      url: req.file.path,        // Cloudinary secure URL
      public_id: req.file.filename,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      user, // 🔥 frontend needs this
    });

  } catch (error) {
    console.error("User Avatar Error:", error);
    return res.status(500).json({
      success: false,
      message: "Avatar upload failed",
    });
  }
};

// ==================== remove avatar ===========================
export const removeAvatarController = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.avatar?.public_id) {
      return res.status(404).json({
        success: false,
        message: "No avatar found",
      });
    }

    await cloudinary.uploader.destroy(user.avatar.public_id);

    user.avatar = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove avatar",
    });
  }
};
