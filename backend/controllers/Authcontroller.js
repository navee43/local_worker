const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { sendWelcomeEmail } = require("../config/mailer");

const JWT_SECRET = process.env.JWT_SECRET || "work_hard_jwt_secret";


function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanPhone(phone) {
  return (phone || "").toString().replace(/\D/g, "").slice(-10);
}

async function sendSMS(phone, otp) {
  const FAST2SMS_KEY = process.env.FAST2SMS_KEY;

  if (!FAST2SMS_KEY || FAST2SMS_KEY === "YOUR_FAST2SMS_API_KEY") {
    return { demo: true, otp };
  }

  try {
    await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      { route: "otp", variables_values: otp, numbers: phone },
      {
        headers: {
          authorization: FAST2SMS_KEY,
          "Content-Type": "application/json",
        },
      },
    );
    return { demo: false };
  } catch (err) {
    console.error("SMS error:", err.message);
    return { demo: true, otp };
  }
}

// ───────── SEND OTP ─────────
const sendOtp = async (req, res) => {
  try {
    const cleaned = cleanPhone(req.body.phone);

    if (cleaned.length !== 10) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const existingUser = await User.findOne({ phone: cleaned });
    console.log("DEBUG USER:", existingUser);

   
    if (existingUser && existingUser.isVerified && existingUser.password) {
      return res.status(409).json({
        message: "Account already exists. Please login.",
      });
    }

    const otp = generateOTP();

    await User.findOneAndUpdate(
      { phone: cleaned },
      {
        $set: {
          "otp.code": otp,
          "otp.expiresAt": new Date(Date.now() + 10 * 60 * 1000),
        },
        $setOnInsert: { phone: cleaned },
      },
      { upsert: true },
    );

    const sms = await sendSMS(cleaned, otp);

    return res.json({
      message: "OTP sent",
      ...(sms.demo && { otp }),
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};


const signup = async (req, res) => {
  try {
    const { name, phone, email, password, role, otp } = req.body;
    const cleaned = cleanPhone(phone);

    let user = await User.findOne({ phone: cleaned });

 
    if (user && user.isVerified && user.password) {
      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        message: "User already exists, logged in",
        token,
        user,
      });
    }

  
    if (!user || !user.otp?.code) {
      return res.status(400).json({ message: "Send OTP first" });
    }

   
    if (user.otp.code !== otp.toString()) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);

    user.name = name;
    user.password = hashedPassword;
    user.role = role;
    user.isVerified = true;
    user.email = email || null;

    user.otp = { code: null, expiresAt: null };

    await user.save();

    if (email) {
      sendWelcomeEmail(email, name);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = await User.findById(user._id).select("-password");

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("🔥 SIGNUP ERROR FULL:", err);
    res.status(500).json({
      message: err.message || "Signup error",
    });
  }
};


const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });

   if (!user) {
  return res.status(401).json({ message: "Invalid credentials" });
}
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = await User.findById(user._id).select("-password");

    res.json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// ───────── GET ME ─────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { sendOtp, signup, login, getMe };
