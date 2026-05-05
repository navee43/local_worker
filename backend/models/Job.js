const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    // ── Employer Info ─────────────────────────────
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employerName: { type: String, default: "" },

    // ── Job Details ───────────────────────────────
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    lat: { type: Number, default: null, min: -90, max: 90 },
    lng: { type: Number, default: null, min: -180, max: 180 },
    wage: { type: Number, required: true, min: 1 },
    duration: { type: Number, required: true, min: 1 },
    skillsRequired: { type: [String], default: [] },
    urgent: { type: Boolean, default: false },

    // ── Status ────────────────────────────────────
    status: {
      type: String,
      enum: ["open", "assigned", "active", "completed", "cancelled", "closed"],
      default: "open",
    },

    // ── Assigned Worker ───────────────────────────
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    workerName: { type: String, default: "" },

    // ── Requests ──────────────────────────────────
    // FIX: Removed `_id: false` — subdocument _id is required for
    // job.requests.id(requestId) to work in handleRequest controller.
    requests: [
      {
        workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        workerName: { type: String, default: "" },
        requestedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],

    // ── Completion ────────────────────────────────
    completedAt: { type: Date, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: "" },

    // ── Payment ───────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue"],
      default: "pending",
    },
    amountPaid: { type: Number, default: 0, min: 0 },

    // ── Rewards ───────────────────────────────────
    pointsAwarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Points calculation
jobSchema.methods.calculatePoints = function () {
  let pts = (this.duration || 0) * 5;
  if (this.rating === 5) pts += 15;
  else if (this.rating === 4) pts += 8;
  else if (this.rating === 3) pts += 4;
  return pts;
};

module.exports = mongoose.model("Job", jobSchema);