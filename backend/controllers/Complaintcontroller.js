const Complaint = require("../models/Complaint");
const WorkerProfile = require("../models/Workerprofile");

// POST /api/worker/complaint
const submitComplaint = async (req, res) => {
  try {
    const { type, employerName, description, voiceTranscription } = req.body;

    if (!type || !description) {
      return res.status(400).json({ message: "Complaint type and description are required" });
    }

    const profile = await WorkerProfile.findOne({ userId: req.user.id });

    const complaint = await Complaint.create({
      fromUserId: req.user.id,
      fromRole: "worker",
      fromName: profile?.name || "Worker",
      type,
      employerName: employerName || "",
      description,
      voiceTranscription: !!voiceTranscription,
    });

    res.status(201).json({
      message: "Complaint submitted successfully. Admin will respond within 24 hours.",
      complaint,
    });
  } catch (err) {
    console.error("submitComplaint error:", err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
};

// GET /api/worker/complaints
const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ fromUserId: req.user.id }).sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
};

module.exports = { submitComplaint, getComplaints };