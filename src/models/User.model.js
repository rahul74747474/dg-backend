import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    avatar: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },

    tempEmail: String,

    mobile: String,

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailOTP: String,
    emailOTPExpiry: Date,

    refreshToken: {
      type: String,
      select: false,
    },

    lastLogin: Date,

    address_details: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },

    forgotPasswordOTP: String,
    forgotPasswordExpiry: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
