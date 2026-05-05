const Job = require("../models/Job");
const User = require("../models/User");
const WorkerProfile = require("../models/Workerprofile");
const EmployerProfile = require("../models/Employerprofile");
const Complaint = require("../models/Complaint");

// ── Helpers ───────────────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simple skill similarity: how many job skills match worker skills (case-insensitive)
function skillSimilarity(jobSkills = [], workerSkills = []) {
  const jobSet = jobSkills.map((s) => s.toLowerCase());
  const workerSet = workerSkills.map((s) => s.toLowerCase());
  return jobSet.filter((s) => workerSet.includes(s)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employer/profile
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    let profile = await EmployerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      profile = await EmployerProfile.create({
        userId: req.user.id,
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
    res.json({ profile });
  } catch (err) {
    console.error("employer getProfile error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/employer/profile
// ─────────────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const {
      name, phone, email, employerType, company, industry,
      designation, gst, website, location, about, logo,
      aadharNumber, aadharVerified,
    } = req.body;

    let profile = await EmployerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      const user = await User.findById(req.user.id);
      profile = new EmployerProfile({ userId: req.user.id, phone: user.phone });
    }

    if (name !== undefined)          profile.name = name;
    if (phone !== undefined)         profile.phone = phone;
    if (email !== undefined)         profile.email = email;
    if (employerType !== undefined)  profile.employerType = employerType;
    if (company !== undefined)       profile.company = company;
    if (industry !== undefined)      profile.industry = industry;
    if (designation !== undefined)   profile.designation = designation;
    if (gst !== undefined)           profile.gst = gst;
    if (website !== undefined)       profile.website = website;
    if (location !== undefined)      profile.location = location;
    if (about !== undefined)         profile.about = about;
    if (logo !== undefined)          profile.logo = logo;
    if (aadharNumber !== undefined)  profile.aadharNumber = aadharNumber;
    if (aadharVerified !== undefined) profile.aadharVerified = aadharVerified;

    await profile.save();
    res.json({ message: "Profile updated", profile });
  } catch (err) {
    console.error("employer updateProfile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employer/jobs
// FIX: Always notify nearby workers (not just when urgent=true),
//      filtered by skill similarity within 10km radius.
// ─────────────────────────────────────────────────────────────────────────────
const postJob = async (req, res) => {
  try {
    const { title, category, location, lat, lng, wage, duration, description, skills, urgent } = req.body;

    if (!title || !category || !location || !wage || !duration) {
      return res.status(400).json({
        message: "Title, category, location, wage and duration are required",
      });
    }

    const profile = await EmployerProfile.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);

    // Normalize skills — accept both array and comma-separated string
    let skillsArray = [];
    if (Array.isArray(skills)) {
      skillsArray = skills.map((s) => s.trim()).filter(Boolean);
    } else if (typeof skills === "string") {
      skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const job = await Job.create({
      employerId: req.user.id,
      employerName: profile?.company || user?.name || "Employer",
      title,
      category,
      location,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      wage: parseInt(wage),
      duration: parseInt(duration),
      description: description || "",
      skillsRequired: skillsArray,
      urgent: !!urgent,
      status: "open",
    });

    // ── Real-time: Notify nearby workers regardless of urgent flag ─────────
    // FIX: The old code only notified when urgent=true. Now we always notify
    // workers within 10km who have at least 1 matching skill.
    if (lat && lng) {
      try {
        const { emitToWorker } = require("../server");

        // Find workers who have lat/lng set
        const workerProfiles = await WorkerProfile.find({
          lat: { $ne: null },
          lng: { $ne: null },
        });

        const RADIUS_KM = 10;

        for (const wp of workerProfiles) {
          const dist = haversineKm(parseFloat(lat), parseFloat(lng), wp.lat, wp.lng);

          if (dist > RADIUS_KM) continue;

          // ✅ FIX: Skill similarity filter — notify workers who have ≥1 matching skill
          // If the job has no skill requirements, notify everyone nearby
          const similarity = skillsArray.length > 0
            ? skillSimilarity(skillsArray, wp.skills || [])
            : 1; // no skill filter — notify all nearby

          if (similarity === 0) continue; // skip workers with no matching skills

          emitToWorker(wp.userId.toString(), "new_job_nearby", {
            jobId: job._id,
            title: job.title,
            location: job.location,
            wage: job.wage,
            distance: Math.round(dist * 10) / 10,
            category: job.category,
            urgent: job.urgent,
            skillMatch: similarity,
          });
        }
      } catch (socketErr) {
        // Non-fatal
        console.warn("Socket notify error:", socketErr.message);
      }
    }

    res.status(201).json({ message: "Job posted successfully", job });
  } catch (err) {
    console.error("postJob error:", err);
    res.status(500).json({ message: "Failed to post job" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employer/jobs
// ─────────────────────────────────────────────────────────────────────────────
const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    console.error("employer getJobs error:", err);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/employer/jobs/:jobId
// ─────────────────────────────────────────────────────────────────────────────
const updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, employerId: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const { title, category, location, lat, lng, wage, duration, description, skills, urgent } = req.body;

    if (title !== undefined)       job.title = title;
    if (category !== undefined)    job.category = category;
    if (location !== undefined)    job.location = location;
    if (lat !== undefined)         job.lat = parseFloat(lat);
    if (lng !== undefined)         job.lng = parseFloat(lng);
    if (wage !== undefined)        job.wage = parseInt(wage);
    if (duration !== undefined)    job.duration = parseInt(duration);
    if (description !== undefined) job.description = description;
    if (skills !== undefined) {
      job.skillsRequired = Array.isArray(skills)
        ? skills.map((s) => s.trim()).filter(Boolean)
        : skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (urgent !== undefined) job.urgent = urgent;

    await job.save();
    res.json({ message: "Job updated", job });
  } catch (err) {
    console.error("updateJob error:", err);
    res.status(500).json({ message: "Failed to update job" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employer/jobs/:jobId/status
// ─────────────────────────────────────────────────────────────────────────────
const updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status } = req.body;
    const VALID = ["open", "assigned", "active", "completed", "cancelled", "closed"];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID.join(", ")}` });
    }
    const job = await Job.findOneAndUpdate(
      { _id: jobId, employerId: req.user.id },
      { status },
      { new: true }
    );
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ message: `Job status updated to ${status}`, job });
  } catch (err) {
    res.status(500).json({ message: "Failed to update job status" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/employer/jobs/:jobId
// ─────────────────────────────────────────────────────────────────────────────
const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    await Job.findOneAndDelete({ _id: jobId, employerId: req.user.id });
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete job" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employer/requests
// ─────────────────────────────────────────────────────────────────────────────
const getRequests = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.user.id });
    const requests = [];

    for (const job of jobs) {
      for (const r of job.requests) {
        const wp = await WorkerProfile.findOne({ userId: r.workerId });
        requests.push({
          // FIX: r._id now exists because we removed `_id: false` from Job model
          id: r._id.toString(),
          workerId: r.workerId,
          workerName: r.workerName,
          skill: wp?.skills?.[0] || "",
          skills: wp?.skills || [],
          experience: wp?.experience || "0",
          rating: wp?.rating || 0,
          completedJobs: wp?.completedJobs || 0,
          location: wp?.location || "",
          phone: wp?.phone || "",
          jobId: job._id,
          jobTitle: job.title,
          appliedDate: r.requestedAt,
          status: r.status,
          profilePhoto: wp?.profilePhoto || null,
        });
      }
    }

    res.json({ requests });
  } catch (err) {
    console.error("getRequests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employer/requests/:jobId/:requestId
// FIX: job.requests.id() now works because _id:false was removed from Job model
// ─────────────────────────────────────────────────────────────────────────────
const handleRequest = async (req, res) => {
  try {
    const { jobId, requestId } = req.params;
    const { action } = req.body;

    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'accepted' or 'rejected'" });
    }

    const job = await Job.findOne({ _id: jobId, employerId: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // FIX: .id() works now that _id:false is removed
    const request = job.requests.id(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = action;

    if (action === "accepted") {
      job.workerId = request.workerId;
      job.workerName = request.workerName;
      job.status = "assigned";
      // Reject all other pending requests
      job.requests.forEach((r) => {
        if (r._id.toString() !== requestId && r.status === "pending") {
          r.status = "rejected";
        }
      });
    }

    await job.save();

    // Real-time: notify the worker
    try {
      const { emitToWorker } = require("../server");
      emitToWorker(request.workerId.toString(), "request_update", {
        jobId: job._id,
        jobTitle: job.title,
        status: action,
      });
    } catch (socketErr) {
      console.warn("Socket emit error:", socketErr.message);
    }

    // Also notify employer their own dashboard needs refresh
    try {
      const { emitToEmployer } = require("../server");
      emitToEmployer(req.user.id.toString(), "requests_updated", { jobId: job._id });
    } catch (_) {}

    res.json({ message: `Request ${action}`, job });
  } catch (err) {
    console.error("handleRequest error:", err);
    res.status(500).json({ message: "Failed to handle request" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employer/hired
// ─────────────────────────────────────────────────────────────────────────────
const getHired = async (req, res) => {
  try {
    const jobs = await Job.find({
      employerId: req.user.id,
      status: { $in: ["assigned", "active", "completed"] },
      workerId: { $ne: null },
    }).sort({ createdAt: -1 });

    const hired = await Promise.all(
      jobs.map(async (job) => {
        const wp = await WorkerProfile.findOne({ userId: job.workerId });
        return {
          id: job._id,
          workerId: job.workerId,
          workerName: job.workerName,
          phone: wp?.phone || "",
          skill: job.category,
          jobTitle: job.title,
          jobId: job._id,
          startDate: job.createdAt?.toISOString().split("T")[0],
          endDate: job.completedAt?.toISOString().split("T")[0] || "",
          wage: job.wage,
          duration: job.duration,
          paymentStatus: job.paymentStatus || "pending",
          amountPaid: job.amountPaid || 0,
          rating: job.rating || null,
          review: job.review || "",
          status: job.status,
        };
      })
    );

    res.json({ hired });
  } catch (err) {
    console.error("getHired error:", err);
    res.status(500).json({ message: "Failed to fetch hired workers" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employer/jobs/:jobId/complete
// ─────────────────────────────────────────────────────────────────────────────
const completeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { rating, review } = req.body;

    const job = await Job.findOne({ _id: jobId, employerId: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (!job.workerId) return res.status(400).json({ message: "No worker assigned to this job" });

    job.status = "completed";
    job.completedAt = new Date();
    job.rating = rating || null;
    job.review = review || "";

    const pts = job.calculatePoints();
    job.pointsAwarded = pts;
    await job.save();

    const wp = await WorkerProfile.findOne({ userId: job.workerId });
    if (wp) {
      wp.rewardPoints = (wp.rewardPoints || 0) + pts;
      wp.completedJobs = (wp.completedJobs || 0) + 1;

      if (rating) {
        const prevTotal = (wp.rating || 0) * (wp.completedJobs - 1);
        wp.rating = parseFloat(((prevTotal + rating) / wp.completedJobs).toFixed(1));
      }

      await wp.save();

      try {
        const { emitToWorker } = require("../server");
        emitToWorker(job.workerId.toString(), "job_completed", {
          jobId: job._id,
          title: job.title,
          pointsAwarded: pts,
          rating,
        });
        emitToWorker(job.workerId.toString(), "points_updated", { points: wp.rewardPoints });

        // Check for voucher unlock
        const VOUCHER_THRESHOLDS = [300, 500, 600, 800, 1200];
        const prevPts = wp.rewardPoints - pts;
        for (const threshold of VOUCHER_THRESHOLDS) {
          if (prevPts < threshold && wp.rewardPoints >= threshold) {
            emitToWorker(job.workerId.toString(), "voucher_unlocked", {
              name: `${threshold} pts voucher now available!`,
            });
          }
        }
      } catch (socketErr) {
        console.warn("Socket emit error:", socketErr.message);
      }
    }

    res.json({ message: "Job completed successfully", pointsAwarded: pts });
  } catch (err) {
    console.error("completeJob error:", err);
    res.status(500).json({ message: "Failed to complete job" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/employer/jobs/:jobId/payment
// ─────────────────────────────────────────────────────────────────────────────
const recordPayment = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { amountPaid } = req.body;
    if (!amountPaid || isNaN(parseInt(amountPaid))) {
      return res.status(400).json({ message: "Valid amountPaid is required" });
    }

    const job = await Job.findOne({ _id: jobId, employerId: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const total = job.wage * job.duration;
    const newPaid = Math.min((job.amountPaid || 0) + parseInt(amountPaid), total);
    job.amountPaid = newPaid;
    job.paymentStatus = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "pending";
    await job.save();

    res.json({ message: "Payment recorded", job });
  } catch (err) {
    res.status(500).json({ message: "Failed to record payment" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employer/complaint
// ─────────────────────────────────────────────────────────────────────────────
const submitComplaint = async (req, res) => {
  try {
    const { type, workerName, description, voiceTranscription } = req.body;
    if (!type || !description) {
      return res.status(400).json({ message: "Complaint type and description are required" });
    }
    const profile = await EmployerProfile.findOne({ userId: req.user.id });
    const complaint = await Complaint.create({
      fromUserId: req.user.id,
      fromRole: "employer",
      fromName: profile?.name || "Employer",
      type,
      employerName: workerName || "",
      description,
      voiceTranscription: !!voiceTranscription,
    });
    res.status(201).json({
      message: "Complaint submitted. Admin will respond within 24 hours.",
      complaint,
    });
  } catch (err) {
    console.error("employer submitComplaint error:", err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employer/nearby-workers
// FIX: Use wp.lat and wp.lng (now proper Number fields in schema)
// ─────────────────────────────────────────────────────────────────────────────
const getNearbyWorkers = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radius);

    // FIX: Query using lat/lng Number fields (not the old GeoJSON object)
    const workers = await WorkerProfile.find({
      lat: { $ne: null },
      lng: { $ne: null },
    });

    const nearby = workers
      .map((w) => ({
        id: w.userId,
        name: w.name,
        skills: w.skills,
        experience: w.experience,
        rating: w.rating,
        location: w.location,
        lat: w.lat,
        lng: w.lng,
        profilePhoto: w.profilePhoto,
        distance: Math.round(haversineKm(parsedLat, parsedLng, w.lat, w.lng) * 10) / 10,
      }))
      .filter((w) => w.distance <= parsedRadius)
      .sort((a, b) => a.distance - b.distance);

    res.json({ workers: nearby });
  } catch (err) {
    console.error("getNearbyWorkers error:", err);
    res.status(500).json({ message: "Failed to fetch nearby workers" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  postJob,
  getJobs,
  updateJob,
  updateJobStatus,
  deleteJob,
  getRequests,
  handleRequest,
  getHired,
  completeJob,
  recordPayment,
  submitComplaint,
  getNearbyWorkers,
};