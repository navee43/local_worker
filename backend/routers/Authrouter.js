const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const { signup, login, sendOtp, getMe } = require("../controllers/Authcontroller");
const authMiddleware = require("../middleware/AuthMiddleware.js");
const { sendWelcomeEmail } = require("../config/mailer");

const JWT_SECRET = process.env.JWT_SECRET;

// ── Phone/Password Auth ───────────────────────────────────────────────────────
router.post("/send-otp", sendOtp);
router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);

// ── Google OAuth ──────────────────────────────────────────────────────────────

// Step 1: Redirect user to Google's consent screen
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);


console.log("hello testing");
// Step 2: Google redirects back here with a code
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=not_registered` }),
  async (req, res) => {
    try {
      const user = req.user;

      // Send welcome email only on very first Google login (profileCompleted=false)
      if (user.email) {
        sendWelcomeEmail(user.email, user.name);
        // Mark so we don't re-send on every login
        await require("../models/User").findByIdAndUpdate(user._id, {
          profileCompleted: false, // keep false so they complete profile, but email sent
          welcomeEmailSent: true,
        });
      }

      // Sign JWT
      const token = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      console.log("info at authrouter ",token);
      console.log("user role is" , user.role);

      // Redirect to frontend with token in query param
      // Frontend will pick this up, store it, then redirect to dashboard
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendURL}/auth/google/success?token=${token}&role=${user.role}&id=${user._id}`
      );
    } catch (err) {
      console.error("Google callback error:", err);
      res.redirect("/login?error=google_failed");
    }
  }
);

module.exports = router;