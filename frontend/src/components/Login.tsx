import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser } from "../api/auth.ts";
import { Eye, EyeOff, Phone, Lock, Hammer, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Clear stale tokens on landing here
    localStorage.removeItem("kaamsetu_token");
    localStorage.removeItem("kaamsetu_user");

    // Show error if Google auth failed
    const errorType = searchParams.get("error");

if (errorType === "not_registered") {
  setError("This email is not registered. Please sign up first.");
} else if (errorType === "google_failed") {
  setError("Google login failed. Please try again.");
}
  }, []);

  // ✅ Only allow digits in phone field
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, phone: val }));
    setError("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e:any) => {
  e.preventDefault();

  try {
    const res = await loginUser({
      phone: form.phone,
      password: form.password,
    });
    console.log(res);

    // 🔥 MOST IMPORTANT FIX

    localStorage.setItem("kaamsetu_token", res.token);
    

    localStorage.setItem("kaamsetu_user", JSON.stringify(res.user));
    console.log(res.token);
    console.log(res.user);

    navigate("/worker/dashboard");

  } catch (err) {
    console.log(err);
  }
};

  // ✅ Google login — redirects to backend which handles the OAuth flow
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3000/api/auth/google";
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[62%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1208 0%, #2d1f0a 40%, #3d2b10 100%)" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: 'url("https://i.pinimg.com/736x/c7/f9/0c/c7f90c476cbf3465325667dff46ed0e4.jpg")' }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#d4a853" }}>
            <Hammer size={30} color="#1a1208" />
          </div>
          <span className="text-3xl font-bold" style={{ color: "#d4a853" }}>KaamSetu</span>
        </div>
        <div className="relative z-10">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-s font-semibold mb-6 tracking-widest uppercase"
            style={{ background: "rgba(212,168,83,0.15)", color: "#d4a853", border: "1px solid rgba(212,168,83,0.3)" }}
          >
            Empowering India's Workforce
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6" style={{ color: "#f5ead7" }}>
            Welcome<br /><span style={{ color: "#d4a853" }}>Back!</span>
          </h1>
          <p className="text-lg leading-relaxed mb-1" style={{ color: "#a8895c" }}>
            In a country full of talent and मेहनत, finding the right opportunity shouldn't be difficult.<br />
            KaamSetu acts as a reliable bridge between workers and employers, ensuring that every skill finds its place.
          </p>
        </div>
        <div
          className="relative z-10 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,83,0.12)" }}
        >
          <p className="text-m italic mb-3" style={{ color: "#c4a87a" }}>
            "Kaarigar ne mujhe 3 din mein pehla kaam dila diya. Ab main apne parivar ka khayal rakh sakta hoon."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-s font-bold" style={{ background: "#d4a853", color: "#1a1208" }}>R</div>
            <div>
              <div className="text-s font-semibold" style={{ color: "#f5ead7" }}>Ramesh Kumar</div>
              <div className="text-s" style={{ color: "#a8895c" }}>Electrician, Delhi</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div
        className="w-full lg:w-[38%] flex items-center justify-center p-6 lg:p-10 overflow-y-auto"
        style={{ background: "#faf6ef" }}
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#d4a853" }}>
              <Hammer size={18} color="#1a1208" />
            </div>
            <span className="text-xl font-bold" style={{ color: "#2d1f0a" }}>KaamSetu</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="text-sm font-semibold tracking-widest uppercase mb-2" style={{ color: "#d4a853" }}>Welcome Back</p>
            <h2 className="text-3xl font-bold" style={{ color: "#1a1208" }}>Sign in to<br />KaamSetu</h2>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "#fde8e8", color: "#b91c1c", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide uppercase" style={{ color: "#5c4a2a" }}>Phone Number</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5" style={{ color: "#a8895c" }}>
                  <Phone size={16} />
                  <span className="text-xs font-medium border-r pr-2 mr-0.5" style={{ borderColor: "#e8dcc8" }}>+91</span>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter your phone number"
                  className="w-full pl-20 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "#fff", border: "1.5px solid #e8dcc8", color: "#1a1208" }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dcc8")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5c4a2a" }}>Password</label>
                <Link to="/forgot-password" className="text-xs font-medium" style={{ color: "#c4892a" }}>Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#a8895c" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-3.5 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "#fff", border: "1.5px solid #e8dcc8", color: "#1a1208" }}
                  onFocus={(e) => (e.target.style.borderColor = "#d4a853")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8dcc8")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#a8895c" }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: loading ? "#c4a87a" : "#2d1f0a", color: "#f5ead7", marginTop: "8px" }}
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="mt-4 text-sm text-center" style={{ color: "#8c7355" }}>
            New to KaamSetu?{" "}
            <Link to="/signup" className="font-semibold underline" style={{ color: "#c4892a" }}>Create an account</Link>
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "#e8dcc8" }} />
            <span className="text-xs" style={{ color: "#a8895c" }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: "#e8dcc8" }} />
          </div>

          {/* ✅ Google button — now actually works */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-all cursor-pointer"
              style={{ borderColor: "#e8dcc8", color: "#2d1f0a" }}
            >
              <img
                src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                alt="google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium opacity-40 cursor-not-allowed"
              style={{ borderColor: "#e8dcc8", color: "#8c7355" }}
            >
              <span className="text-lg"></span>
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}