import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendOtp, signupUser } from "../api/auth.ts";
import type { UserRole } from "../types/auth.ts";
import {
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  User,
  Hammer,
  CheckCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";

const ROLES = [
  {
    value: "worker",
    label: "Worker / Kaarigar",
    desc: "Plumber, Electrician, Maid, Mechanic, etc.",
    icon: "🔧",
  },
  {
    value: "employer",
    label: "Employer / Client",
    desc: "Post jobs and hire skilled workers",
    icon: "💼",
  },
];

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" as UserRole | "",
    otp: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ FIX: store interval ref so we can clear it on unmount — prevents
  //         memory leaks and state updates on unmounted components
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear stale session in case user was previously logged in
    localStorage.removeItem("kaamsetu_token");
    localStorage.removeItem("kaamsetu_user");

    // Cleanup interval on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ✅ FIX: only allow digits in phone field — type="tel" does NOT block letters
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, phone: val }));
    setError("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const startTimer = () => {
    // ✅ FIX: clear any existing interval before starting a new one
    if (timerRef.current) clearInterval(timerRef.current);
    setOtpTimer(60);
    timerRef.current = setInterval(() => {
      setOtpTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!form.phone || form.phone.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setOtpLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await sendOtp(form.phone);
      setOtpSent(true);
      startTimer();
      if (res.otp) setSuccess(`OTP sent! (Demo mode — OTP: ${res.otp})`);
      else setSuccess("OTP sent to your phone!");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (err?.request
            ? "Cannot reach server. Is the backend running?"
            : "Failed to send OTP")
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Full name is required";
    if (!form.phone || form.phone.length !== 10)
      return "Enter a valid 10-digit phone number";
    if (!form.role) return "Please select your role";
    if (!form.password || form.password.length < 6)
      return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!otpSent) return "Please send OTP to verify your phone number";
    if (!form.otp || form.otp.length !== 6) return "Enter the 6-digit OTP";
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await signupUser({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        role: form.role as UserRole,
        otp: form.otp,
      });
      localStorage.setItem("kaamsetu_token", res.token);
      localStorage.setItem("kaamsetu_user", JSON.stringify(res.user));
      setSuccess("Account created! Redirecting...");
      setTimeout(() => {
        if (res.user.role === "worker") navigate("/worker/dashboard");
        else if (res.user.role === "employer") navigate("/employer/dashboard");
        else navigate("/admin/dashboard");
      }, 1200);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (err?.request
            ? "Cannot reach server. Is the backend running?"
            : "Signup failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── LEFT PANEL ───────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[62%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1a1208 0%, #2d1f0a 40%, #3d2b10 100%)",
        }}
      >
        {/* Background texture */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage:
              'url("https://i.pinimg.com/736x/c7/f9/0c/c7f90c476cbf3465325667dff46ed0e4.jpg")',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#d4a853" }}
          >
            <Hammer size={30} color="#1a1208" />
          </div>
          <span className="text-3xl font-bold" style={{ color: "#d4a853" }}>
            KaamSetu
          </span>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-s font-semibold mb-6 tracking-widest uppercase"
            style={{
              background: "rgba(212,168,83,0.15)",
              color: "#d4a853",
              border: "1px solid rgba(212,168,83,0.3)",
            }}
          >
            Empowering India's Workforce
          </div>
          <h1
            className="text-5xl font-bold leading-tight mb-6"
            style={{ color: "#f5ead7" }}
          >
            Your Skills
            <br />
            <span style={{ color: "#d4a853" }}>Deserve</span> to Be
            <br />
            Discovered
          </h1>
          <p
            className="text-lg leading-relaxed mb-1"
            style={{ color: "#a8895c" }}
          >
            In a country full of talent and मेहनत, finding the right opportunity
            shouldn't be difficult.
            <br />
            KaamSetu acts as a reliable bridge between workers and employers,
            ensuring that every skill finds its place and every job reaches the
            right hands.
          </p>
        </div>

        {/* Testimonial */}
        <div
          className="relative z-10 rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(212,168,83,0.12)",
          }}
        >
          <p className="text-m italic mb-3" style={{ color: "#c4a87a" }}>
            "Kaarigar ne mujhe 3 din mein pehla kaam dila diya. Ab main apne
            parivar ka khayal rakh sakta hoon."
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-s font-bold"
              style={{ background: "#d4a853", color: "#1a1208" }}
            >
              R
            </div>
            <div>
              <div
                className="text-s font-semibold"
                style={{ color: "#f5ead7" }}
              >
                Ramesh Kumar
              </div>
              <div className="text-s" style={{ color: "#a8895c" }}>
                Electrician, Delhi
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Signup Form ─────────────────────────────────────────── */}
      <div
        className="w-full lg:w-[38%] flex items-center justify-center p-6 lg:p-10 overflow-y-auto"
        style={{ background: "#faf6ef", minHeight: "100vh" }}
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#d4a853" }}
            >
              <Hammer size={18} color="#1a1208" />
            </div>
            <span
              className="text-xl font-bold"
              style={{ color: "#2d1f0a" }}
            >
              KaamSetu
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p
              className="text-sm font-semibold tracking-widest uppercase mb-2"
              style={{ color: "#d4a853" }}
            >
              Begin Your Journey
            </p>
            <h2 className="text-3xl font-bold" style={{ color: "#1a1208" }}>
              Create Your Account
            </h2>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
              style={{
                background: "#fde8e8",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
              }}
            >
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #6ee7b7",
              }}
            >
              <CheckCircle size={16} /> {success}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "#5c4a2a" }}
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8895c" }}
                />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #e8dcc8",
                    color: "#1a1208",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dcc8")}
                />
              </div>
            </div>

            {/* Phone + Send OTP */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "#5c4a2a" }}
              >
                Phone Number
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "#a8895c" }}
                  />
                  {/* ✅ FIX: handlePhoneChange strips non-digits */}
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    placeholder="10-digit number"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: "#fff",
                      border: "1.5px solid #e8dcc8",
                      color: "#1a1208",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                    onBlur={(e) => (e.target.style.borderColor = "#e8dcc8")}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || otpTimer > 0}
                  className="px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-60"
                  style={{
                    background: otpTimer > 0 ? "#e8dcc8" : "#d4a853",
                    color: otpTimer > 0 ? "#8c7355" : "#1a1208",
                    minWidth: "100px",
                  }}
                >
                  {otpLoading ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : otpTimer > 0 ? (
                    `${otpTimer}s`
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </div>
            </div>

            {/* OTP Input — only shown after OTP is sent */}
            {otpSent && (
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                  style={{ color: "#5c4a2a" }}
                >
                  Enter OTP
                </label>
                <input
                  type="text"
                  name="otp"
                  value={form.otp}
                  onChange={handleChange}
                  placeholder="6-digit OTP"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none tracking-widest text-center font-bold transition-all"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #d4a853",
                    color: "#1a1208",
                    letterSpacing: "0.3em",
                  }}
                />
              </div>
            )}

            {/* Email (Optional) */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "#5c4a2a" }}
              >
                Email Address{" "}
                <span
                  className="font-normal normal-case"
                  style={{ color: "#a8895c" }}
                >
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8895c" }}
                />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #e8dcc8",
                    color: "#1a1208",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dcc8")}
                />
              </div>
            </div>

            {/* Role Selector */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "#5c4a2a" }}
              >
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setForm((p) => ({ ...p, role: r.value as UserRole }));
                      setError("");
                    }}
                    className="p-3.5 rounded-xl text-left transition-all"
                    style={{
                      background:
                        form.role === r.value ? "#2d1f0a" : "#fff",
                      border:
                        form.role === r.value
                          ? "2px solid #d4a853"
                          : "1.5px solid #e8dcc8",
                      color:
                        form.role === r.value ? "#f5ead7" : "#5c4a2a",
                    }}
                  >
                    <div className="text-xl mb-1">{r.icon}</div>
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className="text-xs mt-0.5 opacity-70">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "#5c4a2a" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8895c" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: "1.5px solid #e8dcc8",
                    color: "#1a1208",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dcc8")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8895c" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "#5c4a2a" }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8895c" }}
                />
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${
                      form.confirmPassword &&
                      form.password !== form.confirmPassword
                        ? "#f87171"
                        : "#e8dcc8"
                    }`,
                    color: "#1a1208",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                  onBlur={(e) =>
                    (e.target.style.borderColor =
                      form.confirmPassword &&
                      form.password !== form.confirmPassword
                        ? "#f87171"
                        : "#e8dcc8")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8895c" }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirmPassword &&
                form.password !== form.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>
                    Passwords don't match
                  </p>
                )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: loading ? "#c4a87a" : "#2d1f0a",
                color: "#f5ead7",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Creating
                  Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p
            className="mt-4 text-sm text-center"
            style={{ color: "#8c7355" }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold underline"
              style={{ color: "#c4892a" }}
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}