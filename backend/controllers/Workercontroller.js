const WorkerProfile = require("../models/Workerprofile");
const Job = require("../models/Job");
const User = require("../models/User");
const Tesseract = require("tesseract.js");
const Complaint = require("../models/Complaint");

// ── Reward tiers & vouchers ────────────────────────────────────────────────
const REWARD_TIERS = [
  { name: "Nayi Shuruaat",    minPoints: 0,    icon: "🌱" },
  { name: "Kaam ka Sipahi",   minPoints: 200,  icon: "⚒️" },
  { name: "Vishwas Kaarigar", minPoints: 500,  icon: "⭐" },
  { name: "Ustad",            minPoints: 1000, icon: "🏆" },
  { name: "Mahakaarigar",     minPoints: 2000, icon: "👑" },
];

const VOUCHERS = [
  { id: "v1", name: "₹100 Mobile Recharge", pointCost: 300,  description: "Free mobile recharge on Paytm",        icon: "📱" },
  { id: "v2", name: "Free Safety Kit",       pointCost: 500,  description: "Helmet, gloves & safety shoes",        icon: "🦺" },
  { id: "v3", name: "Skill Certificate",     pointCost: 800,  description: "Govt. recognized skill certificate",   icon: "📜" },
  { id: "v4", name: "₹500 Amazon Voucher",   pointCost: 1200, description: "Shop on Amazon India",                 icon: "🛒" },
  { id: "v5", name: "Priority Job Listing",  pointCost: 600,  description: "Your profile shown first for 30 days", icon: "🚀" },
];

function getTier(points) {
  return [...REWARD_TIERS].reverse().find((t) => points >= t.minPoints) || REWARD_TIERS[0];
}
function getNextTier(points) {
  return REWARD_TIERS.find((t) => t.minPoints > points) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/worker/profile
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    let profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const user = await User.findById(req.user.id);
      profile = await WorkerProfile.create({
        userId: req.user.id,
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }

    // Get all jobs where this worker is assigned OR has pending requests
    const jobs = await Job.find({ workerId: req.user.id }).sort({ createdAt: -1 });
    const tier = getTier(profile.rewardPoints);
    const nextTier = getNextTier(profile.rewardPoints);
    const availableVouchers = VOUCHERS.filter(
      (v) =>
        profile.rewardPoints >= v.pointCost &&
        !profile.redeemedVouchers.some((rv) => rv.voucherId === v.id)
    );

    res.json({ profile, jobs, tier, nextTier, vouchers: VOUCHERS, availableVouchers });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/worker/profile
// FIX: Properly save lat/lng Number fields (they were set but schema had no field)
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, email, age, gender, location, lat, lng, experience, skills, bio, profilePhoto } = req.body;

    let profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const user = await User.findById(req.user.id);
      profile = new WorkerProfile({ userId: req.user.id, phone: user.phone });
    }

    if (name !== undefined)         profile.name = name;
    if (email !== undefined)        profile.email = email;
    if (age !== undefined)          profile.age = String(age);
    if (gender !== undefined)       profile.gender = gender;
    if (location !== undefined)     profile.location = location; // string, e.g. "Delhi, India"
    if (lat !== undefined && lat !== null)  profile.lat = parseFloat(lat);   // ✅ FIX: save to Number field
    if (lng !== undefined && lng !== null)  profile.lng = parseFloat(lng);   // ✅ FIX: save to Number field
    if (experience !== undefined)   profile.experience = String(experience);
    if (skills !== undefined)       profile.skills = Array.isArray(skills) ? skills : [skills];
    if (bio !== undefined)          profile.bio = bio;
    if (profilePhoto !== undefined) profile.profilePhoto = profilePhoto;

    const wasCompleted = profile.profileCompleted;
    await profile.save(); // pre-save hook syncs geoLocation + profileCompleted

    // Award 25 points for first time completing profile
    if (!wasCompleted && profile.profileCompleted) {
      profile.rewardPoints += 25;
      await profile.save();
    }

    res.json({ message: "Profile updated successfully", profile });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/worker/aadhaar-ocr
// ─────────────────────────────────────────────────────────────────────────────
const aadhaarOcr = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "No image provided" });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const { data: { text } } = await Tesseract.recognize(buffer, "eng+hin", {
      logger: (m) => process.env.NODE_ENV !== "production" && console.log("[OCR]", m.status),
    });

    const textLower = text.toLowerCase();
    const isAadhaar =
      textLower.includes("aadhaar") ||
      textLower.includes("आधार") ||
      textLower.includes("uidai") ||
      textLower.includes("unique identification") ||
      textLower.includes("government of india") ||
      /\d{4}\s\d{4}\s\d{4}/.test(text);

    if (!isAadhaar) {
      return res.status(422).json({
        message: "This does not appear to be an Aadhaar card. Please upload a valid Aadhaar image.",
      });
    }

    const aadhaarMatch = text.match(/\d{4}\s\d{4}\s\d{4}/);
    const aadhaarNumber = aadhaarMatch ? aadhaarMatch[0] : "";

    const dobMatch =
      text.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/) ||
      text.match(/Year of Birth\s*[:\-]?\s*(\d{4})/i) ||
      text.match(/DOB\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
    const dob = dobMatch ? dobMatch[1] : "";

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let extractedName = "";
    for (const line of lines) {
      if (/\d/.test(line) || line.length < 4 || line.length > 50 ||
        /aadhaar|uidai|government|india|dob|year|male|female|address|birth/i.test(line))
        continue;
      if (/^[A-Za-z\s\.]+$/.test(line)) { extractedName = line.trim(); break; }
    }

    const addressKeywords = ["s/o", "d/o", "w/o", "house", "village", "district", "state", "pin"];
    const addressLines = lines.filter(
      (l) => addressKeywords.some((k) => l.toLowerCase().includes(k)) || /\d{6}/.test(l)
    );
    const extractedAddress = addressLines.join(", ");

    let calculatedAge = "";
    if (dob) {
      const parts = dob.includes("/") ? dob.split("/") : dob.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0]);
        if (!isNaN(year)) calculatedAge = String(new Date().getFullYear() - year);
      } else if (dob.length === 4) {
        calculatedAge = String(new Date().getFullYear() - parseInt(dob));
      }
    }

    let profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const user = await User.findById(req.user.id);
      profile = new WorkerProfile({ userId: req.user.id, phone: user?.phone || "" });
    }

    const wasVerified = profile.aadhaarVerified;
    profile.aadhaarNumber = aadhaarNumber;
    profile.aadhaarName = extractedName;
    profile.aadhaarDob = dob;
    profile.aadhaarAddress = extractedAddress;
    profile.aadhaarVerified = true;
    if (extractedName && !profile.name) profile.name = extractedName;
    if (dob) profile.dateOfBirth = dob;
    if (calculatedAge) profile.age = calculatedAge;

    // +20 points for first-time Aadhaar verification
    if (!wasVerified) profile.rewardPoints += 20;

    await profile.save();

    res.json({
      message: "Aadhaar verified successfully",
      extracted: { name: extractedName, aadhaarNumber, dob, age: calculatedAge, address: extractedAddress },
      profile,
    });
  } catch (err) {
    console.error("aadhaarOcr error:", err);
    res.status(500).json({ message: "OCR processing failed. Please try with a clearer image." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/worker/jobs — worker's assigned job history
// ─────────────────────────────────────────────────────────────────────────────
const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ workerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/worker/available-jobs
// ─────────────────────────────────────────────────────────────────────────────
const getAvailableJobs = async (req, res) => {
  try {
    const { skill, location } = req.query;

    const query = {
      status: "open",
      // Exclude jobs where this worker already has any request (pending/accepted/rejected)
      "requests.workerId": { $ne: req.user.id },
    };

    if (skill && skill.trim()) {
      query.skillsRequired = { $in: [new RegExp(skill.trim(), "i")] };
    }

    if (location && location.trim()) {
      query.location = { $regex: location.trim(), $options: "i" };
    }

    let jobs = await Job.find(query).sort({ urgent: -1, createdAt: -1 });

    // Personalized skill-based sorting when no filters applied
    if (!skill && !location) {
      const profile = await WorkerProfile.findOne({ userId: req.user.id });
      if (profile?.skills?.length > 0) {
        const skillMatches = jobs.filter((j) =>
          j.skillsRequired.some((s) =>
            profile.skills.some((ps) => ps.toLowerCase() === s.toLowerCase())
          )
        );
        const others = jobs.filter(
          (j) => !j.skillsRequired.some((s) =>
            profile.skills.some((ps) => ps.toLowerCase() === s.toLowerCase())
          )
        );
        jobs = [...skillMatches, ...others];
      }
    }

    res.json({ jobs });
  } catch (err) {
    console.error("getAvailableJobs error:", err);
    res.status(500).json({ message: "Failed to fetch available jobs" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/worker/apply/:jobId
// ─────────────────────────────────────────────────────────────────────────────
const applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Max 2 pending applications at a time
    const activeRequests = await Job.countDocuments({
      requests: { $elemMatch: { workerId: req.user.id, status: "pending" } },
    });
    if (activeRequests >= 2) {
      return res.status(400).json({
        message: "You can only apply to 2 jobs at a time. Withdraw a request first.",
      });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.status !== "open") return res.status(400).json({ message: "This job is no longer available" });

    const alreadyApplied = job.requests.some((r) => r.workerId.toString() === req.user.id);
    if (alreadyApplied) return res.status(400).json({ message: "You have already applied to this job" });

    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    job.requests.push({
      workerId: req.user.id,
      workerName: profile?.name || "Worker",
      status: "pending",
    });
    await job.save();

    // Real-time: notify employer
    try {
      const { emitToEmployer } = require("../server");
      emitToEmployer(job.employerId.toString(), "new_request", {
        jobId: job._id,
        jobTitle: job.title,
        workerName: profile?.name || "Worker",
      });
    } catch (socketErr) {
      console.warn("Socket emit error:", socketErr.message);
    }

    res.json({ message: "Request sent successfully" });
  } catch (err) {
    console.error("applyToJob error:", err);
    res.status(500).json({ message: "Failed to apply" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/worker/redeem-voucher
// ─────────────────────────────────────────────────────────────────────────────
const redeemVoucher = async (req, res) => {
  try {
    const { voucherId } = req.body;
    const voucher = VOUCHERS.find((v) => v.id === voucherId);
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });

    const profile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    if (profile.rewardPoints < voucher.pointCost) {
      return res.status(400).json({
        message: `Need ${voucher.pointCost} points. You have ${profile.rewardPoints}.`,
      });
    }

    const alreadyRedeemed = profile.redeemedVouchers.some((rv) => rv.voucherId === voucherId);
    if (alreadyRedeemed) return res.status(400).json({ message: "Already redeemed this voucher" });

    profile.rewardPoints -= voucher.pointCost;
    profile.redeemedVouchers.push({ voucherId, name: voucher.name });
    await profile.save();

    res.json({ message: `🎁 ${voucher.name} redeemed!`, remainingPoints: profile.rewardPoints });
  } catch (err) {
    res.status(500).json({ message: "Failed to redeem voucher" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/worker/complaint
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/worker/complaints
// ─────────────────────────────────────────────────────────────────────────────
const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ fromUserId: req.user.id }).sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch complaints" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  aadhaarOcr,
  getJobs,
  getAvailableJobs,
  applyToJob,
  redeemVoucher,
  submitComplaint,
  getComplaints,
};