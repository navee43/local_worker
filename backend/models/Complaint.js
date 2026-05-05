const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromRole: { type: String, enum: ["worker", "employer"], required: true },
    fromName: { type: String, default: "" },
    type: { type: String, required: true },
    employerName: { type: String, default: "" },
    description: { type: String, required: true },
    voiceTranscription: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "under_review", "resolved", "dismissed"],
      default: "pending",
    },
    adminNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);