const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/AuthMiddleware");
const {
  getProfile, updateProfile,
  postJob, getJobs, updateJob, updateJobStatus, deleteJob,
  getRequests, handleRequest,
  getHired, completeJob, recordPayment,
  submitComplaint, getNearbyWorkers,
} = require("../controllers/Employercontroller");

// Profile
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// Jobs
router.post("/jobs", authMiddleware, postJob);
router.get("/jobs", authMiddleware, getJobs);
router.put("/jobs/:jobId", authMiddleware, updateJob);
router.patch("/jobs/:jobId/status", authMiddleware, updateJobStatus);
router.delete("/jobs/:jobId", authMiddleware, deleteJob);
router.post("/jobs/:jobId/complete", authMiddleware, completeJob);
router.patch("/jobs/:jobId/payment", authMiddleware, recordPayment);

// Worker Requests
router.get("/requests", authMiddleware, getRequests);
router.patch("/requests/:jobId/:requestId", authMiddleware, handleRequest);

// Hired Workers
router.get("/hired", authMiddleware, getHired);

// Complaint
router.post("/complaint", authMiddleware, submitComplaint);

// Geo
router.get("/nearby-workers", authMiddleware, getNearbyWorkers);

module.exports = router;