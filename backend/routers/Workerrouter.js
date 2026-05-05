const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/AuthMiddleware");

const {
  getProfile,
  updateProfile,
  aadhaarOcr,
  getJobs,
  getAvailableJobs,
  applyToJob,
  redeemVoucher,
} = require("../controllers/Workercontroller");

// Profile
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// Aadhaar
router.post("/aadhaar-ocr", authMiddleware, aadhaarOcr);

// Jobs
router.get("/jobs", authMiddleware, getJobs);
router.get("/available-jobs", authMiddleware, getAvailableJobs);
router.post("/apply/:jobId", authMiddleware, applyToJob);

// Rewards
router.post("/redeem-voucher", authMiddleware, redeemVoucher);

module.exports = router;
