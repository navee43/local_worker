const mongoose = require("mongoose");

const employerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ── Personal ────────────────────────────────────────────────────────────
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    employerType: {
      type: String,
      enum: ["business", "employee", "homemaker", ""],
      default: "",
    },

    // ── Business ────────────────────────────────────────────────────────────
    company: { type: String, trim: true, default: "" },
    industry: { type: String, default: "" },
    designation: { type: String, default: "" },
    gst: { type: String, default: "" },
    website: { type: String, default: "" },
    location: { type: String, default: "" },
    about: { type: String, default: "" },
    logo: { type: String, default: null }, // base64 or URL

    // ── Aadhar ──────────────────────────────────────────────────────────────
    aadharNumber: { type: String, default: "" },
    aadharVerified: { type: Boolean, default: false },

    // ── Verification ────────────────────────────────────────────────────────
    verified: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Auto-set profileCompleted
employerProfileSchema.pre("save", function () {
  const base = [this.name, this.phone, this.email, this.employerType];
  const biz =
    this.employerType !== "homemaker" ? [this.company, this.industry] : [];

  this.profileCompleted = [...base, ...biz].every(Boolean);
});

module.exports = mongoose.model("EmployerProfile", employerProfileSchema);
