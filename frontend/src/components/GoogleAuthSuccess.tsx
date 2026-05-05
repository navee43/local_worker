// src/components/GoogleAuthSuccess.tsx
// This page is the redirect target after Google OAuth.
// Google → backend callback → redirects here with ?token=...&role=...
// We store the token and send the user to their dashboard.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Hammer, Loader2 } from "lucide-react";

export default function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const role = searchParams.get("role");

    if (!token || !role) {
      setError("Google login failed. Please try again.");
      setTimeout(() => navigate("/login"), 2500);
      return;
    }

    // Store token the same way phone/password login does
    localStorage.setItem("kaamsetu_token", token);

    // Fetch user profile with the token to store full user object
    fetch("http://localhost:3000/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((user) => {
        localStorage.setItem(
  "kaamsetu_user",
  JSON.stringify({
    ...user,
    id: user._id,   // 🔥 FIX
  })
);
        // Redirect to appropriate dashboard
        if (role === "worker") navigate("/worker/dashboard");
        else if (role === "employer") navigate("/employer/dashboard");
        else navigate("/admin/dashboard");
      })
      .catch(() => {
        // Fallback: just use role from query param
        if (role === "worker") navigate("/worker/dashboard");
        else if (role === "employer") navigate("/employer/dashboard");
        else navigate("/admin/dashboard");
      });
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#faf6ef" }}
    >
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#d4a853" }}
        >
          <Hammer size={32} color="#1a1208" />
        </div>
        {error ? (
          <p style={{ color: "#b91c1c" }}>{error}</p>
        ) : (
          <>
            <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: "#d4a853" }} />
            <p className="font-semibold text-lg" style={{ color: "#1a1208" }}>
              Signing you in with Google...
            </p>
            <p className="text-sm mt-1" style={{ color: "#8c7355" }}>
              Please wait
            </p>
          </>
        )}
      </div>
    </div>
  );
}