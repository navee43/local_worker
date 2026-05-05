const mongoose = require("mongoose");

const workerProfileSchema = new mongoose.Schema(
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
    dateOfBirth: { type: String, default: "" },
    age: { type: String, default: "" },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },

    // ── FIX: Separate human-readable location string AND numeric lat/lng ────
    // The old schema had a duplicate `location` field (String + GeoJSON).
    // We keep a plain string for display and store lat/lng separately.
    location: { type: String, default: "" },   // "City, State" — for display
    lat: { type: Number, default: null },       // ✅ Added — used by proximity queries
    lng: { type: Number, default: null },       // ✅ Added — used by proximity queries

    // GeoJSON point — kept for $near / 2dsphere index queries
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },

    bio: { type: String, default: "" },
    profilePhoto: { type: String, default: null }, // base64 or URL

    // ── Professional ────────────────────────────────────────────────────────
    experience: { type: String, default: "" }, // years
    skills: { type: [String], default: [] },

    // ── Aadhaar ─────────────────────────────────────────────────────────────
    aadhaarNumber: { type: String, default: "" },
    aadhaarName: { type: String, default: "" },
    aadhaarDob: { type: String, default: "" },
    aadhaarAddress: { type: String, default: "" },
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarImageUrl: { type: String, default: null },

    // ── Rewards ─────────────────────────────────────────────────────────────
    rewardPoints: { type: Number, default: 0 },
    redeemedVouchers: [
      {
        voucherId: String,
        name: String,
        redeemedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Stats ────────────────────────────────────────────────────────────────
    completedJobs: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }, // avg rating from employers

    // ── Completion ───────────────────────────────────────────────────────────
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// 2dsphere index on geoLocation for $near queries
workerProfileSchema.index({ geoLocation: "2dsphere" });

// ── Sync geoLocation from lat/lng before save ────────────────────────────────
workerProfileSchema.pre("save", function () {
  if (this.lat != null && this.lng != null) {
    this.geoLocation = {
      type: "Point",
      coordinates: [this.lng, this.lat],
    };
  }

  const required = [
    this.name,
    this.phone,
    this.age,
    this.gender,
    this.location,
    this.experience,
    this.skills.length > 0,
    this.aadhaarVerified,
    this.profilePhoto,
  ];

  this.profileCompleted = required.every(Boolean);
});

module.exports = mongoose.model("WorkerProfile", workerProfileSchema);