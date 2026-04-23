import express from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  userAvatarController,
  removeAvatarController,
  getMyProfile,
  updateUserProfile,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  logoutUser,
  resendOTP,
} from "../controllers/auth.controller.js";
import dotenv from "dotenv";
dotenv.config(); //

import upload from "../middlewares/upload.js";
import protect from "../middlewares/protect.js";

const router = express.Router();

// ================= AUTH =================

// ✅ SIGNUP with avatar upload
router.post(
  "/register",
  
  upload.single("avatar"), // 👈 REQUIRED
  registerUser
);

router.post("/verify-email", verifyEmail);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", protect, logoutUser);

// ================= PASSWORD =================

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.patch("/change-password", protect, changePassword);

// ================= PROFILE =================

router.get("/me", protect, getMyProfile);
router.put("/profile", protect, updateUserProfile);

// ================= EMAIL CHANGE =================

router.patch("/change-email", protect, requestEmailChange);
router.patch("/verify-email-change", protect, verifyEmailChange);

// ================= AVATAR =================

// 🔒 Logged-in users can update avatar later
router.put(
  "/avatar",
  protect,                    // 👈 ADD BACK
  upload.single("avatar"),    // 👈 use single (not array)
  userAvatarController
);
router.post("/resend-otp", resendOTP);
router.delete("/avatar", protect, removeAvatarController);

export default router;
