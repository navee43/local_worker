const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // sparse so Google-only users (no phone) don't conflict
      trim: true,
      default: null,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // ✅ CRITICAL: allows multiple null emails
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["worker", "employer", "admin"],
      default: "worker",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // sparse so phone-only users don't conflict
    },
    welcomeEmailSent: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
