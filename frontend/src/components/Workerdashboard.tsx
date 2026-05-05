import React, { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  User, Phone, Mail, MapPin, Briefcase, Star, Award, TrendingUp,
  CheckCircle, Clock, XCircle, ChevronRight, Camera,
  Hammer, Bell, LogOut, Home, FileText, Search,
  Shield, Zap, Gift, AlertCircle, Edit3, Save,
  X, Plus, CreditCard, Calendar, IndianRupee, Mic,
  Medal, ArrowRight, Loader2, RefreshCw, Scan,
} from "lucide-react";
import {
  fetchWorkerProfile, saveWorkerProfile, runAadhaarOcr,
  fetchAvailableJobs, applyToJob, redeemVoucher,
  submitComplaint, fetchComplaints,
} from "../api/Worker";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bgPage: "#faf6ef", bgCard: "#ffffff",
  bgSide: "#2d1f0a", bgSideDk: "#1a1208",
  gold: "#d4a853", goldDk: "#c4892a",
  brown: "#2d1f0a", brownMd: "#5c4a2a", brownLt: "#a8895c",
  cream: "#f5ead7", border: "#e8dcc8",
  success: "#15803d", successBg: "#dcfce7",
  error: "#b91c1c", errorBg: "#fde8e8",
};

const REWARD_TIERS = [
  { name: "Nayi Shuruaat",    minPoints: 0,    icon: "🌱", perks: ["Basic job access", "Profile listing"] },
  { name: "Kaam ka Sipahi",   minPoints: 200,  icon: "⚒️", perks: ["Priority listing", "Profile badge", "Early job alerts"] },
  { name: "Vishwas Kaarigar", minPoints: 500,  icon: "⭐", perks: ["Featured profile", "Higher pay jobs", "Skill certifications"] },
  { name: "Ustad",            minPoints: 1000, icon: "🏆", perks: ["Top of search results", "Premium employer access", "Bonus payments"] },
  { name: "Mahakaarigar",     minPoints: 2000, icon: "👑", perks: ["VIP support", "Guaranteed minimum wage", "Training programs"] },
];

const SKILLS_LIST = ["Electrician","Plumber","Mason","Carpenter","Painter","HVAC","Welder","Driver","Security Guard","Cook","Tailor","Mechanic","Gardener","Pest Control","Tile Work"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  completed: { label: "Completed", color: "#15803d", bg: "#dcfce7",  icon: <CheckCircle size={13}/> },
  active:    { label: "Active",    color: "#c4892a", bg: "#fef3c7",  icon: <Clock size={13}/> },
  pending:   { label: "Pending",   color: "#1d4ed8", bg: "#dbeafe",  icon: <Clock size={13}/> },
  cancelled: { label: "Cancelled", color: "#b91c1c", bg: "#fde8e8",  icon: <XCircle size={13}/> },
  assigned:  { label: "Assigned",  color: "#7c3aed", bg: "#ede9fe",  icon: <CheckCircle size={13}/> },
};

function getTier(pts: number) { return [...REWARD_TIERS].reverse().find(t => pts >= t.minPoints) || REWARD_TIERS[0]; }
function getNextTier(pts: number) { return REWARD_TIERS.find(t => t.minPoints > pts) || null; }

const NAV = [
  { key: "overview",  label: "Overview",        icon: <Home size={17}/> },
  { key: "profile",   label: "My Profile",       icon: <User size={17}/> },
  { key: "jobs",      label: "Available Jobs",   icon: <Search size={17}/> },
  { key: "history",   label: "Job History",      icon: <FileText size={17}/> },
  { key: "rewards",   label: "Rewards & Points", icon: <Award size={17}/> },
  { key: "complaint", label: "Complaint",        icon: <AlertCircle size={17}/> },
];

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success"|"error"|"info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: { bg: T.brown, color: T.gold }, error: { bg: "#b91c1c", color: "#fff" }, info: { bg: "#1e40af", color: "#fff" } };
  const c = colors[type];
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, background:c.bg, color:c.color, padding:"12px 20px", borderRadius:12, fontSize:14, fontWeight:600, boxShadow:"0 8px 32px rgba(0,0,0,0.25)", display:"flex", alignItems:"center", gap:8, maxWidth:360, animation:"slideIn .3s ease" }}>
      {type === "success" ? <CheckCircle size={16}/> : type === "error" ? <XCircle size={16}/> : <Bell size={16}/>}
      {msg}
      <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", marginLeft:8 }}><X size={14}/></button>
    </div>
  );
}

// ── Input styles ──────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { background:"#fff", border:`1.5px solid ${T.border}`, color:T.brown, borderRadius:12, padding:"10px 14px", fontSize:14, outline:"none", width:"100%", fontFamily:"inherit" };
const inpRo: React.CSSProperties = { ...inp, background:T.bgPage, border:`1.5px solid #f0e8d8`, color:T.brownMd };
const lbl: React.CSSProperties = { display:"block", fontSize:11, fontWeight:700, color:T.brownMd, marginBottom:6, letterSpacing:"0.08em", textTransform:"uppercase" as const };
const Label = ({ children }: { children: React.ReactNode }) => <label style={lbl}>{children}</label>;

// ── Notification item ─────────────────────────────────────────────────────────
interface JobNotification { id: string; title: string; location: string; wage: number; distance: number; category?: string; urgent?: boolean; jobId: string; }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function WorkerDashboard() {
  const [tab, setTab] = useState("overview");
  const [profileData, setProfileData] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success"|"error"|"info" } | null>(null);
  const [notifications, setNotifications] = useState<JobNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWorkerProfile();
      setProfileData(res.data.profile);
      setJobs(res.data.jobs || []);
      setVouchers(res.data.vouchers || []);
      setAvailableVouchers(res.data.availableVouchers || []);
    } catch (err: any) {
      console.error("Profile error:", err);
      showToast("Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAvailableJobs = useCallback(async (skill?: string, location?: string) => {
    try {
      const params: any = {};
      if (skill) params.skill = skill;
      if (location) params.location = location;
      const res = await fetchAvailableJobs();
      setAvailableJobs(res.data.jobs || []);
    } catch { /* no jobs yet */ }
  }, []);

  useEffect(() => {
    loadProfile();
    loadAvailableJobs();

    const socket = io("http://localhost:3000", { transports: ["websocket"] });
    socketRef.current = socket;
    const user = JSON.parse(localStorage.getItem("kaamsetu_user") || "{}");
    if (user?.id) socket.emit("register_worker", user.id);

    // ✅ Real-time events
    socket.on("profile_updated",  () => { loadProfile(); showToast("Profile updated!", "info"); });
    socket.on("job_assigned",     (data: any) => { loadProfile(); showToast(`New job assigned: ${data.title}`, "info"); });
    socket.on("job_completed",    () => { loadProfile(); showToast("Job marked complete! Points added 🎉", "success"); });
    socket.on("points_updated",   () => { loadProfile(); });
    socket.on("voucher_unlocked", (data: any) => showToast(`🎁 New voucher unlocked: ${data.name}!`, "success"));

    // ✅ NEW: Show notification banner for nearby jobs
    socket.on("new_job_nearby", (data: JobNotification) => {
      setNotifications(prev => [{ ...data, id: Date.now().toString() }, ...prev.slice(0, 9)]);
      showToast(`📍 New job nearby: ${data.title} (${data.distance}km away)`, "info");
    });

    // ✅ Request accepted/rejected notification
    socket.on("request_update", (data: any) => {
      loadAvailableJobs();
      loadProfile();
      if (data.status === "accepted") {
        showToast(`✅ Your request for "${data.jobTitle}" was accepted!`, "success");
      } else {
        showToast(`Request for "${data.jobTitle}" was not accepted.`, "info");
      }
    });

    return () => { socket.disconnect(); };
  }, [loadProfile, loadAvailableJobs]);

  const handleLogout = () => {
    localStorage.removeItem("kaamsetu_token");
    localStorage.removeItem("kaamsetu_user");
    window.location.href = "/login";
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bgPage, flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:14, background:T.gold, display:"flex", alignItems:"center", justifyContent:"center" }}><Hammer size={26} color={T.brown}/></div>
      <Loader2 size={28} style={{ color:T.gold, animation:"spin 1s linear infinite" }}/>
      <p style={{ color:T.brownLt, fontSize:14 }}>Loading your dashboard...</p>
    </div>
  );

  const pts = profileData?.rewardPoints || 0;
  const tier = getTier(pts);
  const nextTier = getNextTier(pts);
  const unreadNotifs = notifications.length;

  const topbarTitle: Record<string, string> = {
    overview: `Namaste, ${profileData?.name?.split(" ")[0] || "Worker"} 👋`,
    profile: "My Profile", jobs: "Available Jobs",
    history: "Job History", rewards: "Rewards & Points", complaint: "Submit Complaint",
  };
  const topbarSub: Record<string, string> = {
    overview: "Here's what's happening today",
    profile: "Manage your personal and professional information",
    jobs: "Browse and apply for jobs matching your skills",
    history: "All your past and current work assignments",
    rewards: "Track your achievements and unlock benefits",
    complaint: "Report issues directly to KaamSetu admin",
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:T.bgPage, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={{ width:248, background:`linear-gradient(180deg,${T.bgSideDk} 0%,${T.bgSide} 100%)`, display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:50, boxShadow:"4px 0 24px rgba(0,0,0,0.15)" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 20px", borderBottom:"1px solid rgba(212,168,83,0.15)" }}>
          <div style={{ width:34, height:34, borderRadius:10, background:T.gold, display:"flex", alignItems:"center", justifyContent:"center" }}><Hammer size={18} color={T.brown}/></div>
          <span style={{ fontSize:18, fontWeight:800, color:T.gold, fontFamily:"Georgia,serif" }}>KaamSetu</span>
        </div>

        {/* Worker pill */}
        <div style={{ margin:"14px 12px 6px", padding:"12px", borderRadius:14, background:"rgba(212,168,83,0.08)", border:"1px solid rgba(212,168,83,0.15)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ position:"relative", flexShrink:0 }}>
              {profileData?.profilePhoto
                ? <img src={profileData.profilePhoto} style={{ width:42, height:42, borderRadius:12, objectFit:"cover" }} alt="avatar"/>
                : <div style={{ width:42, height:42, borderRadius:12, background:T.gold, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, color:T.brown }}>{(profileData?.name||"W")[0]}</div>
              }
              <div style={{ position:"absolute", bottom:-4, right:-4, width:18, height:18, borderRadius:"50%", background:T.bgSide, border:`2px solid ${T.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>{tier.icon}</div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13, color:T.cream, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profileData?.name || "Your Name"}</div>
              <div style={{ fontSize:11, color:T.goldDk, marginTop:1 }}>{tier.name}</div>
            </div>
          </div>
          {/* Points bar */}
          <div style={{ marginTop:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.brownLt, marginBottom:4 }}>
              <span>{pts} pts</span><span>{nextTier?.minPoints ?? "MAX"} pts</span>
            </div>
            <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.08)" }}>
              <div style={{ height:5, borderRadius:99, background:`linear-gradient(90deg,${T.gold},${T.goldDk})`, width: nextTier ? `${Math.min(100,(pts-tier.minPoints)/(nextTier.minPoints-tier.minPoints)*100)}%` : "100%", transition:"width 0.8s ease" }}/>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"8px 10px", overflowY:"auto" }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setTab(n.key)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, border: tab===n.key ? "1px solid rgba(212,168,83,0.28)" : "1px solid transparent", background: tab===n.key ? "rgba(212,168,83,0.15)" : "transparent", color: tab===n.key ? T.gold : T.brownLt, cursor:"pointer", marginBottom:2, fontSize:13, fontWeight:600, textAlign:"left", transition:"all .18s" }}>
              {n.icon}<span style={{ flex:1 }}>{n.label}</span>
              {tab===n.key && <ChevronRight size={13}/>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding:"10px 10px 20px", borderTop:"1px solid rgba(212,168,83,0.1)" }}>
          <button onClick={handleLogout} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11, border:"none", background:"transparent", color:"#f87171", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            <LogOut size={17}/> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main style={{ marginLeft:248, flex:1, display:"flex", flexDirection:"column" }}>
        {/* Topbar */}
        <header style={{ background:"rgba(255,255,255,0.92)", backdropFilter:"blur(10px)", borderBottom:`1px solid ${T.border}`, padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:40 }}>
          <div>
            <p style={{ fontSize:11, fontWeight:700, color:T.goldDk, letterSpacing:"0.1em", textTransform:"uppercase", margin:0 }}>Worker Dashboard</p>
            <h1 style={{ fontSize:20, fontWeight:800, color:T.brown, margin:0, fontFamily:"Georgia,serif" }}>{topbarTitle[tab]}</h1>
            <p style={{ fontSize:12, color:T.brownLt, margin:0 }}>{topbarSub[tab]}</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Notification bell */}
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowNotifs(v => !v)} style={{ width:38, height:38, borderRadius:10, border:`1.5px solid ${T.border}`, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Bell size={15} style={{ color:T.brownLt }}/>
              </button>
              {unreadNotifs > 0 && <span style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:T.gold, color:T.brown, fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{unreadNotifs}</span>}

              {/* Notification dropdown */}
              {showNotifs && (
                <div style={{ position:"absolute", top:46, right:0, width:320, background:"#fff", borderRadius:16, boxShadow:"0 12px 48px rgba(0,0,0,0.15)", border:`1px solid ${T.border}`, zIndex:100, overflow:"hidden" }}>
                  <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontWeight:700, color:T.brown, fontSize:14 }}>Nearby Job Alerts</span>
                    <button onClick={() => { setNotifications([]); setShowNotifs(false); }} style={{ fontSize:11, color:T.brownLt, background:"none", border:"none", cursor:"pointer" }}>Clear all</button>
                  </div>
                  <div style={{ maxHeight:280, overflowY:"auto" }}>
                    {notifications.length === 0
                      ? <p style={{ padding:"20px", color:T.brownLt, fontSize:13, textAlign:"center" }}>No new notifications</p>
                      : notifications.map(n => (
                        <div key={n.id} style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
                          onClick={() => { setTab("jobs"); setShowNotifs(false); }}>
                          <div style={{ fontWeight:700, fontSize:13, color:T.brown }}>{n.title}{n.urgent && " 🔥"}</div>
                          <div style={{ fontSize:12, color:T.brownLt, marginTop:2 }}>📍 {n.location} · ₹{n.wage}/day · {n.distance}km away</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            <button onClick={loadProfile} style={{ width:38, height:38, borderRadius:10, border:`1.5px solid ${T.border}`, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} title="Refresh">
              <RefreshCw size={15} style={{ color:T.brownLt }}/>
            </button>
            <div style={{ width:38, height:38, borderRadius:10, background: profileData?.profilePhoto ? "transparent" : T.gold, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:T.brown, fontSize:15 }}>
              {profileData?.profilePhoto ? <img src={profileData.profilePhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (profileData?.name?.[0] || "W")}
            </div>
          </div>
        </header>

        <div style={{ flex:1, padding:"24px 28px", overflowY:"auto" }}>
          {tab === "overview"  && <OverviewTab profile={profileData} jobs={jobs} pts={pts} tier={tier} nextTier={nextTier} onNav={setTab}/>}
          {tab === "profile"   && <ProfileTab profile={profileData} onSaved={loadProfile} showToast={showToast}/>}
          {tab === "jobs"      && <JobsTab jobs={availableJobs} showToast={showToast} onApplied={() => { loadProfile(); loadAvailableJobs(); }} onRefresh={loadAvailableJobs}/>}
          {tab === "history"   && <HistoryTab jobs={jobs}/>}
          {tab === "rewards"   && <RewardsTab pts={pts} tier={tier} nextTier={nextTier} vouchers={vouchers} availableVouchers={availableVouchers} jobs={jobs} showToast={showToast} onRedeemed={loadProfile}/>}
          {tab === "complaint" && <ComplaintTab showToast={showToast}/>}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes slideIn { from { opacity:0;transform:translateX(20px) } to { opacity:1;transform:translateX(0) } }
        * { box-sizing:border-box }
        ::-webkit-scrollbar { width:5px }
        ::-webkit-scrollbar-thumb { background:${T.gold}; border-radius:99px }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ profile, jobs, pts, tier, nextTier, onNav }: any) {
  const completed = jobs.filter((j: any) => j.status === "completed");
  const active    = jobs.filter((j: any) => j.status === "active" || j.status === "assigned");
  const earned    = completed.reduce((s: number, j: any) => s + (j.wage * j.duration), 0);
  const avgRating = completed.filter((j: any) => j.rating).length
    ? completed.filter((j: any) => j.rating).reduce((s: number, j: any, _: any, a: any[]) => s + j.rating / a.length, 0) : 0;

  const completionFields = [profile?.name, profile?.phone, profile?.age, profile?.gender, profile?.location, profile?.experience, profile?.skills?.length > 0, profile?.aadhaarVerified, profile?.profilePhoto];
  const pct = Math.round(completionFields.filter(Boolean).length / completionFields.length * 100);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Rank banner */}
      <div style={{ borderRadius:20, padding:"24px 28px", display:"flex", alignItems:"center", gap:20, background:`linear-gradient(135deg,${T.bgSideDk},${T.bgSide})`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 80% 50%,rgba(212,168,83,0.12),transparent 60%)" }}/>
        <div style={{ fontSize:52, position:"relative" }}>{tier.icon}</div>
        <div style={{ flex:1, position:"relative" }}>
          <p style={{ fontSize:11, color:T.goldDk, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 4px" }}>Current Rank</p>
          <h2 style={{ color:T.cream, fontWeight:800, fontSize:22, margin:"0 0 4px", fontFamily:"Georgia,serif" }}>{tier.name}</h2>
          <p style={{ color:T.brownLt, fontSize:13, margin:0 }}>
            {nextTier ? `${nextTier.minPoints - pts} more points → ${nextTier.name} ${nextTier.icon}` : "Highest rank! 👑"}
          </p>
          {nextTier && (
            <div style={{ marginTop:12, height:6, borderRadius:99, background:"rgba(255,255,255,0.1)", maxWidth:280 }}>
              <div style={{ height:6, borderRadius:99, background:`linear-gradient(90deg,${T.gold},${T.goldDk})`, width:`${Math.min(100,(pts-tier.minPoints)/(nextTier.minPoints-tier.minPoints)*100)}%`, transition:"width 1s ease" }}/>
            </div>
          )}
        </div>
        <div style={{ textAlign:"right", position:"relative" }}>
          <div style={{ fontSize:40, fontWeight:800, color:T.gold, fontFamily:"Georgia,serif" }}>{pts}</div>
          <div style={{ fontSize:12, color:T.brownLt }}>Total Points</div>
          <button onClick={() => onNav("rewards")} style={{ marginTop:6, fontSize:12, fontWeight:700, color:T.gold, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
            View Rewards <ArrowRight size={12}/>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          { icon:<CheckCircle size={20}/>, label:"Jobs Completed", val:completed.length, iconBg:"rgba(21,128,61,0.1)" },
          { icon:<Zap size={20}/>, label:"Active Jobs", val:active.length, iconBg:"rgba(196,137,42,0.12)" },
          { icon:<IndianRupee size={20}/>, label:"Total Earned", val:`₹${earned.toLocaleString()}`, iconBg:"rgba(21,128,61,0.08)" },
          { icon:<Star size={20}/>, label:"Avg Rating", val:avgRating ? avgRating.toFixed(1)+" ★" : "—", iconBg:"rgba(212,168,83,0.12)" },
        ].map((s, i) => (
          <div key={i} style={{ background:T.bgCard, borderRadius:18, padding:"18px 20px", border:`1px solid ${T.border}` }}>
            <div style={{ width:42, height:42, borderRadius:12, background:s.iconBg, display:"flex", alignItems:"center", justifyContent:"center", color:T.gold, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:T.brown, fontFamily:"Georgia,serif" }}>{s.val}</div>
            <div style={{ fontSize:11, color:T.brownLt, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Profile completion + recent jobs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16 }}>
        <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
          <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 14px", fontFamily:"Georgia,serif" }}>Profile Strength</h3>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={40} fill="none" stroke={T.border} strokeWidth={10}/>
              <circle cx={50} cy={50} r={40} fill="none" stroke={T.gold} strokeWidth={10}
                strokeDasharray={`${2*Math.PI*40}`} strokeDashoffset={`${2*Math.PI*40*(1-pct/100)}`}
                strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition:"stroke-dashoffset 1s ease" }}/>
              <text x={50} y={55} textAnchor="middle" fill={T.brown} fontSize={20} fontWeight={800}>{pct}%</text>
            </svg>
          </div>
          {pct < 100 && (
            <button onClick={() => onNav("profile")} style={{ width:"100%", padding:"8px", borderRadius:10, background:T.brown, color:T.cream, border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>
              Complete Profile →
            </button>
          )}
        </div>
        <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:0, fontFamily:"Georgia,serif" }}>Recent Activity</h3>
            <button onClick={() => onNav("history")} style={{ fontSize:12, fontWeight:600, color:T.goldDk, background:"none", border:"none", cursor:"pointer" }}>See all →</button>
          </div>
          {jobs.length === 0 ? (
            <div style={{ textAlign:"center", padding:"28px 0", color:T.brownLt }}>
              <Briefcase size={36} style={{ opacity:0.3, marginBottom:8 }}/>
              <p style={{ fontSize:13, margin:0 }}>No jobs yet. Browse available jobs to get started!</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {jobs.slice(0, 4).map((j: any) => {
                const sc = STATUS_CFG[j.status] || STATUS_CFG.pending;
                return (
                  <div key={j._id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:12, background:T.bgPage }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:"rgba(212,168,83,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Briefcase size={16} style={{ color:T.gold }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:T.brown, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.title}</div>
                      <div style={{ fontSize:11, color:T.brownLt }}>{j.employerName} · {j.location}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:99, background:sc.bg, color:sc.color, display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileTab({ profile, onSaved, showToast }: { profile: any; onSaved: () => void; showToast: (m: string, t: "success"|"error"|"info") => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (profile) setForm({ ...profile }); }, [profile]);
  if (!form) return null;

  const upd = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => upd("profilePhoto", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAadhaarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    // ✅ Validate file is an image before sending
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPG, PNG, etc.)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setOcrLoading(true);
      try {
        const res = await runAadhaarOcr(base64);
        const { extracted } = res.data;
        setForm((f: any) => ({
          ...f,
          aadhaarNumber: extracted.aadhaarNumber || f.aadhaarNumber,
          aadhaarVerified: true,
          name: extracted.name || f.name,
          age: extracted.age || f.age,
          dateOfBirth: extracted.dob || f.dateOfBirth,
        }));
        showToast("✅ Aadhaar verified! Details auto-filled.", "success");
      } catch (err: any) {
        showToast(err?.response?.data?.message || "OCR failed. Please try a clearer Aadhaar image.", "error");
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ✅ Get user's location for the profile
  const getLocation = () => {
    if (!navigator.geolocation) { showToast("Geolocation not supported by your browser", "error"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        upd("lat", lat);
        upd("lng", lng);
        // Reverse geocode using free Nominatim API
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const state = data.address?.state || "";
          if (city || state) upd("location", `${city}${city && state ? ", " : ""}${state}`);
        } catch { /* use coords silently */ }
        showToast("Location detected!", "success");
      },
      () => showToast("Could not get location. Please enter manually.", "error")
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveWorkerProfile({
        name: form.name, email: form.email, age: form.age,
        gender: form.gender, location: form.location,
        lat: form.lat, lng: form.lng,
        experience: form.experience, skills: form.skills,
        bio: form.bio, profilePhoto: form.profilePhoto,
      });
      showToast("Profile saved successfully!", "success");
      setEditing(false);
      onSaved();
    } catch {
      showToast("Failed to save profile", "error");
    } finally { setSaving(false); }
  };

  const addSkill = () => {
    if (newSkill && !form.skills?.includes(newSkill)) upd("skills", [...(form.skills || []), newSkill]);
    setNewSkill("");
  };

  const completionFields = [form.name, form.phone, form.age, form.gender, form.location, form.experience, form.skills?.length > 0, form.aadhaarVerified, form.profilePhoto];
  const pct = Math.round(completionFields.filter(Boolean).length / completionFields.length * 100);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Header card */}
      <div style={{ background:T.bgCard, borderRadius:20, border:`1px solid ${T.border}`, overflow:"hidden" }}>
        <div style={{ background:`linear-gradient(135deg,${T.bgSideDk},${T.bgSide})`, padding:"28px 28px 70px", position:"relative" }}>
          {[...Array(5)].map((_,i) => <div key={i} style={{ position:"absolute", width:50+i*20, height:50+i*20, borderRadius:"50%", border:"1px solid rgba(212,168,83,0.07)", top:"50%", left:`${i*18}%`, transform:"translateY(-50%)" }}/>)}
          <div style={{ position:"absolute", top:18, right:18, display:"flex", gap:8 }}>
            {editing
              ? <>
                  <button onClick={() => { setForm({...profile}); setEditing(false); }} style={{ padding:"7px 14px", borderRadius:9, border:"1px solid rgba(212,168,83,0.3)", background:"rgba(255,255,255,0.07)", color:T.cream, fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}><X size={13}/> Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ padding:"7px 14px", borderRadius:9, border:"none", background:T.gold, color:T.brown, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    {saving ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={13}/>} Save
                  </button>
                </>
              : <button onClick={() => setEditing(true)} style={{ padding:"7px 14px", borderRadius:9, border:"1px solid rgba(212,168,83,0.3)", background:"rgba(212,168,83,0.1)", color:T.gold, fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}><Edit3 size={13}/> Edit Profile</button>
            }
          </div>
        </div>

        <div style={{ padding:"0 28px 28px", marginTop:-52 }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:16, marginBottom:16 }}>
            <div style={{ position:"relative" }}>
              <div style={{ width:88, height:88, borderRadius:20, border:`4px solid #fff`, overflow:"hidden", background:form.profilePhoto ? "transparent" : T.gold, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:30, color:T.brown, boxShadow:"0 8px 24px rgba(0,0,0,0.15)" }}>
                {form.profilePhoto ? <img src={form.profilePhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (form.name?.[0]?.toUpperCase() || <User size={36}/>)}
              </div>
              {editing && <button onClick={() => photoRef.current?.click()} style={{ position:"absolute", bottom:-4, right:-4, width:28, height:28, borderRadius:8, background:T.gold, border:`2px solid #fff`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><Camera size={13} color={T.brown}/></button>}
              <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto}/>
            </div>
            <div>
              <h2 style={{ fontWeight:800, fontSize:20, color:T.brown, margin:0, fontFamily:"Georgia,serif" }}>{form.name || "Complete your profile"}</h2>
              <p style={{ color:T.brownLt, fontSize:13, margin:"3px 0 0" }}>{form.skills?.slice(0,3).join(" · ") || "Add your skills"}</p>
              <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                {form.aadhaarVerified && <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:99, background:T.successBg, color:T.success, display:"flex", alignItems:"center", gap:4 }}><Shield size={10}/> Aadhaar Verified</span>}
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:99, background:"rgba(212,168,83,0.1)", color:T.goldDk, display:"flex", alignItems:"center", gap:4 }}><CheckCircle size={10}/> Phone Verified</span>
              </div>
            </div>
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:800, color:T.brown, fontFamily:"Georgia,serif" }}>{pct}%</div>
              <div style={{ fontSize:11, color:T.brownLt }}>Complete</div>
              <div style={{ width:80, height:4, borderRadius:99, background:T.border, marginTop:4 }}>
                <div style={{ height:4, borderRadius:99, background:`linear-gradient(90deg,${T.gold},${T.goldDk})`, width:`${pct}%`, transition:"width 0.8s" }}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column form */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Personal */}
        <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
          <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 16px", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}><User size={15} style={{ color:T.gold }}/> Personal Info</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div><Label>Full Name</Label>
              <input style={editing ? inp : inpRo} value={form.name||""} disabled={!editing} onChange={e => upd("name", e.target.value)} placeholder="Your full name" onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><Label>Age</Label>
                <input style={editing ? inp : inpRo} value={form.age||""} disabled={!editing} type="number" onChange={e => upd("age", e.target.value)} placeholder="Age" onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
              </div>
              <div>
                <Label>Gender</Label>
                {editing
                  ? <select style={inp} value={form.gender||""} onChange={e => upd("gender", e.target.value)} onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}>
                      <option value="">Select</option>{GENDER_OPTIONS.map(g=><option key={g}>{g}</option>)}
                    </select>
                  : <div style={inpRo}>{form.gender || <span style={{ color:T.brownLt }}>Not set</span>}</div>
                }
              </div>
            </div>
            <div><Label>Phone</Label>
              <div style={{ position:"relative" }}>
                <Phone size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.brownLt }}/>
                <input style={{ ...inpRo, paddingLeft:34 }} value={form.phone||""} disabled placeholder="+91 XXXXXXXXXX"/>
                <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99, background:T.successBg, color:T.success }}>Verified</span>
              </div>
            </div>
            <div><Label>Email <span style={{ fontWeight:400, fontSize:10, color:T.brownLt }}>(Optional)</span></Label>
              <div style={{ position:"relative" }}>
                <Mail size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.brownLt }}/>
                <input style={{ ...(editing ? inp : inpRo), paddingLeft:34 }} value={form.email||""} disabled={!editing} onChange={e => upd("email", e.target.value)} placeholder="you@example.com" type="email" onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
              </div>
            </div>
            {/* ✅ Location with auto-detect button */}
            <div><Label>Location</Label>
              <div style={{ position:"relative" }}>
                <MapPin size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.brownLt }}/>
                <input style={{ ...(editing ? inp : inpRo), paddingLeft:34, paddingRight: editing ? 100 : 14 }} value={form.location||""} disabled={!editing} onChange={e => upd("location", e.target.value)} placeholder="City, State" onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
                {editing && (
                  <button onClick={getLocation} type="button" style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", padding:"4px 10px", borderRadius:8, background:T.brown, color:T.cream, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                    <MapPin size={10}/> Detect
                  </button>
                )}
              </div>
            </div>
            <div><Label>About Me</Label>
              <textarea style={{ ...(editing ? inp : inpRo), resize:"none" }} rows={3} value={form.bio||""} disabled={!editing} onChange={e => upd("bio", e.target.value)} placeholder="Write a short bio..." onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
            </div>
          </div>
        </div>

        {/* Professional + Aadhaar */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
            <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 14px", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}><Briefcase size={15} style={{ color:T.gold }}/> Professional Details</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><Label>Years of Experience</Label>
                <input style={editing ? inp : inpRo} value={form.experience||""} disabled={!editing} type="number" onChange={e => upd("experience", e.target.value)} placeholder="e.g. 5" onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
              </div>
              <div>
                <Label>Skills</Label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                  {(form.skills||[]).map((s: string) => (
                    <span key={s} style={{ fontSize:12, fontWeight:700, padding:"5px 10px", borderRadius:99, background:"rgba(212,168,83,0.1)", color:T.goldDk, border:"1px solid rgba(212,168,83,0.25)", display:"flex", alignItems:"center", gap:4 }}>
                      {s} {editing && <button onClick={() => upd("skills", form.skills.filter((x: string) => x !== s))} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit", padding:0, display:"flex" }}><X size={10}/></button>}
                    </span>
                  ))}
                  {(form.skills||[]).length === 0 && <span style={{ fontSize:12, color:T.brownLt }}>No skills added</span>}
                </div>
                {editing && (
                  <div style={{ display:"flex", gap:6 }}>
                    <select style={{ ...inp, flex:1, padding:"8px 12px", fontSize:13 }} value={newSkill} onChange={e => setNewSkill(e.target.value)} onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}>
                      <option value="">Select skill...</option>
                      {SKILLS_LIST.filter(s => !(form.skills||[]).includes(s)).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={addSkill} style={{ padding:"0 14px", borderRadius:10, background:T.gold, color:T.brown, border:"none", cursor:"pointer", display:"flex", alignItems:"center" }}><Plus size={16}/></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aadhaar OCR */}
          <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1.5px solid ${form.aadhaarVerified ? "rgba(21,128,61,0.35)" : T.border}` }}>
            <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 4px", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}>
              <CreditCard size={15} style={{ color:T.gold }}/> Aadhaar Verification
              {form.aadhaarVerified && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:T.successBg, color:T.success, marginLeft:"auto" }}>✓ Verified</span>}
            </h3>
            <p style={{ fontSize:12, color:T.brownLt, margin:"0 0 14px" }}>Upload your Aadhaar card image — name, DOB & number are extracted automatically. Only Aadhaar images accepted.</p>
            {form.aadhaarVerified ? (
              <div style={{ padding:"14px", borderRadius:12, background:T.successBg, border:`1px solid rgba(21,128,61,0.25)` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <CheckCircle size={22} style={{ color:T.success }}/>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:T.success }}>Aadhaar Verified ✓</div>
                    {form.aadhaarNumber && <div style={{ fontSize:12, color:"#166534" }}>Number: {form.aadhaarNumber}</div>}
                    {form.dateOfBirth && <div style={{ fontSize:12, color:"#166534" }}>DOB: {form.dateOfBirth}</div>}
                  </div>
                </div>
              </div>
            ) : editing ? (
              <>
                <input ref={aadhaarRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleAadhaarUpload}/>
                <button onClick={() => aadhaarRef.current?.click()} disabled={ocrLoading}
                  style={{ width:"100%", padding:"18px", borderRadius:12, border:`2px dashed ${T.gold}`, background:"rgba(212,168,83,0.04)", cursor:ocrLoading?"wait":"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  {ocrLoading
                    ? <><Loader2 size={26} style={{ color:T.gold, animation:"spin 1s linear infinite" }}/><span style={{ color:T.goldDk, fontWeight:700, fontSize:13 }}>Scanning Aadhaar with OCR...</span><span style={{ color:T.brownLt, fontSize:12 }}>Extracting name, DOB & Aadhaar number</span></>
                    : <><Scan size={26} style={{ color:T.gold }}/><span style={{ color:T.goldDk, fontWeight:700, fontSize:13 }}>Upload Aadhaar Card Image</span><span style={{ color:T.brownLt, fontSize:12 }}>Only Aadhaar cards accepted · JPG, PNG</span></>
                  }
                </button>
              </>
            ) : (
              <div style={{ ...inpRo, color:T.brownLt, cursor:"default" }}>Not verified — click Edit Profile to upload Aadhaar</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABLE JOBS TAB — with skill/location filters + map pin
// ═══════════════════════════════════════════════════════════════════════════════
function JobsTab({ jobs, showToast, onApplied, onRefresh }: { jobs: any[]; showToast: any; onApplied: () => void; onRefresh: (skill?: string, loc?: string) => void }) {
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [expandedJob, setExpandedJob] = useState<string|null>(null);

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    return (
      (!q || j.title?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q) || j.category?.toLowerCase().includes(q)) &&
      (!skillFilter || (j.skillsRequired||[]).some((s: string) => s.toLowerCase().includes(skillFilter.toLowerCase()))) &&
      (!locationFilter || j.location?.toLowerCase().includes(locationFilter.toLowerCase()))
    );
  });

  const handleApply = async (jobId: string) => {
    if (appliedIds.length >= 2 && !appliedIds.includes(jobId)) { showToast("You can only apply to 2 jobs at a time", "error"); return; }
    setApplying(jobId);
    try {
      await applyToJob(jobId);
      setAppliedIds(ids => [...ids, jobId]);
      showToast("Request sent successfully! 🎉", "success");
      onApplied();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to apply", "error");
    } finally { setApplying(null); }
  };

  const handleFilter = () => { onRefresh(skillFilter, locationFilter); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Limit notice */}
      <div style={{ padding:"12px 14px", borderRadius:14, background:"rgba(212,168,83,0.08)", border:"1px solid rgba(212,168,83,0.2)", fontSize:13, color:T.brownMd }}>
        ⚠️ Maximum <strong>2 active requests</strong> at a time. Current: <strong style={{ color:T.goldDk }}>{appliedIds.length}/2</strong>
      </div>

      {/* Filters */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:10 }}>
        <div style={{ position:"relative" }}>
          <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.brownLt }}/>
          <input style={{ ...inp, paddingLeft:34 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, location..." onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
        </div>
        <div>
          <select style={inp} value={skillFilter} onChange={e => setSkillFilter(e.target.value)} onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}>
            <option value="">All Skills</option>
            {SKILLS_LIST.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ position:"relative" }}>
          <MapPin size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.brownLt }}/>
          <input style={{ ...inp, paddingLeft:34 }} value={locationFilter} onChange={e => setLocationFilter(e.target.value)} placeholder="Filter by location..." onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
        </div>
        <button onClick={handleFilter} style={{ padding:"0 18px", borderRadius:12, background:T.brown, color:T.cream, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
          <Search size={14}/> Filter
        </button>
      </div>

      {/* Job count */}
      <p style={{ fontSize:13, color:T.brownLt, margin:0 }}>Showing <strong style={{ color:T.brown }}>{filtered.length}</strong> available jobs</p>

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:T.brownLt }}>
          <Briefcase size={48} style={{ opacity:0.25, marginBottom:12 }}/>
          <h3 style={{ fontWeight:700, color:T.brown, margin:"0 0 6px" }}>No jobs match your filters</h3>
          <p style={{ fontSize:13, margin:0 }}>Try adjusting your skill or location filters</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {filtered.map((job: any) => {
            const applied = appliedIds.includes(job._id);
            const isExpanded = expandedJob === job._id;
            return (
              <div key={job._id} style={{ background:T.bgCard, borderRadius:18, border:`1.5px solid ${applied ? "rgba(21,128,61,0.4)" : T.border}`, overflow:"hidden", transition:"border-color .2s" }}
                onMouseEnter={e => !applied && ((e.currentTarget as HTMLElement).style.borderColor = T.gold)}
                onMouseLeave={e => !applied && ((e.currentTarget as HTMLElement).style.borderColor = applied ? "rgba(21,128,61,0.4)" : T.border)}>
                <div style={{ padding:"18px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <h3 style={{ fontWeight:700, fontSize:15, color:T.brown, margin:0 }}>{job.title}</h3>
                        {job.urgent && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:"#fde8e8", color:"#b91c1c" }}>🔥 Urgent</span>}
                        <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, background:"rgba(212,168,83,0.1)", color:T.goldDk }}>{job.category}</span>
                      </div>
                      <p style={{ fontSize:12, color:T.brownLt, margin:0 }}>🏢 {job.employerName}</p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontWeight:800, fontSize:16, color:T.brown }}>₹{job.wage}<span style={{ fontSize:11, fontWeight:400, color:T.brownLt }}>/day</span></div>
                      <div style={{ fontSize:11, color:T.brownLt }}>{job.duration} days · Total ₹{job.wage * job.duration}</div>
                    </div>
                  </div>

                  <div style={{ fontSize:12, color:T.brownLt, marginBottom:10, display:"flex", gap:14, flexWrap:"wrap" }}>
                    <span>📍 {job.location}</span>
                    <span>📅 Posted {new Date(job.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>

                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:14 }}>
                    {(job.skillsRequired||[]).map((s: string) => <span key={s} style={{ fontSize:11, padding:"3px 8px", borderRadius:99, background:"rgba(212,168,83,0.1)", color:T.goldDk, border:"1px solid rgba(212,168,83,0.2)" }}>{s}</span>)}
                  </div>

                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <button onClick={() => handleApply(job._id)} disabled={!!applying || (appliedIds.length >= 2 && !applied)}
                      style={{ flex:1, padding:"10px", borderRadius:10, background:applied ? T.successBg : T.brown, color:applied ? T.success : T.cream, border:`1.5px solid ${applied?"rgba(21,128,61,0.4)":T.brown}`, fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                      {applying === job._id ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : applied ? <><CheckCircle size={14}/> Request Sent</> : <><ArrowRight size={14}/> Send Request</>}
                    </button>
                    <button onClick={() => setExpandedJob(isExpanded ? null : job._id)}
                      style={{ padding:"10px 14px", borderRadius:10, background:T.bgPage, border:`1.5px solid ${T.border}`, color:T.brownMd, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                      {isExpanded ? "Less" : "More"}
                    </button>
                  </div>
                </div>

                {/* Expanded details + map */}
                {isExpanded && (
                  <div style={{ borderTop:`1px solid ${T.border}`, padding:"16px 20px", background:T.bgPage }}>
                    {job.description && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.brownMd, marginBottom:4 }}>JOB DESCRIPTION</div>
                        <p style={{ fontSize:13, color:T.brown, margin:0, lineHeight:1.6 }}>{job.description}</p>
                      </div>
                    )}
                    {/* ✅ Google Map embed if lat/lng available */}
                    {job.lat && job.lng && (
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:T.brownMd, marginBottom:6 }}>JOB LOCATION</div>
                        <div style={{ borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}` }}>
                          <iframe
                            title="job-location"
                            width="100%"
                            height="200"
                            style={{ border:"none", display:"block" }}
                            src={`https://maps.google.com/maps?q=${job.lat},${job.lng}&z=14&output=embed`}
                            loading="lazy"
                          />
                        </div>
                        <p style={{ fontSize:11, color:T.brownLt, marginTop:6 }}>📍 {job.location}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function HistoryTab({ jobs }: { jobs: any[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);
  const earned = jobs.filter(j => j.status === "completed").reduce((s, j) => s + j.wage * j.duration, 0);
  const days   = jobs.filter(j => j.status === "completed").reduce((s, j) => s + j.duration, 0);
  const pts    = jobs.reduce((s, j) => s + (j.pointsAwarded || 0), 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {[
          { icon:<IndianRupee size={18}/>, label:"Total Earned", val:`₹${earned.toLocaleString()}`, bg:"rgba(21,128,61,0.08)" },
          { icon:<Calendar size={18}/>, label:"Days Worked", val:`${days} days`, bg:"rgba(212,168,83,0.08)" },
          { icon:<Zap size={18}/>, label:"Points Earned", val:`${pts} pts`, bg:"rgba(212,168,83,0.12)" },
        ].map((s,i) => (
          <div key={i} style={{ background:T.bgCard, borderRadius:16, padding:"16px 18px", border:`1px solid ${T.border}` }}>
            <div style={{ width:38, height:38, borderRadius:10, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", color:T.gold, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:22, fontWeight:800, color:T.brown, fontFamily:"Georgia,serif" }}>{s.val}</div>
            <div style={{ fontSize:11, color:T.brownLt, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {["all","completed","active","assigned","pending","cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:"7px 14px", borderRadius:10, fontSize:12, fontWeight:600, textTransform:"capitalize" as const, border:`1.5px solid ${filter===f?T.brown:T.border}`, background:filter===f?T.brown:T.bgCard, color:filter===f?T.cream:T.brownMd, cursor:"pointer" }}>
            {f === "all" ? "All Jobs" : f}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign:"center", padding:"50px 0", color:T.brownLt }}><Briefcase size={40} style={{ opacity:0.25, marginBottom:10 }}/><p style={{ fontSize:13 }}>No {filter} jobs found</p></div>
        : filtered.map((job: any) => {
          const sc = STATUS_CFG[job.status] || STATUS_CFG.pending;
          return (
            <div key={job._id} style={{ background:T.bgCard, borderRadius:18, padding:"18px 22px", border:`1px solid ${T.border}`, display:"flex", alignItems:"flex-start", gap:14, transition:"border-color .2s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = T.gold)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = T.border)}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(212,168,83,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Briefcase size={19} style={{ color:T.gold }}/></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <h3 style={{ fontWeight:700, color:T.brown, margin:0, fontSize:14 }}>{job.title}</h3>
                  <span style={{ fontSize:11, padding:"2px 7px", borderRadius:99, background:"rgba(212,168,83,0.1)", color:T.goldDk }}>{job.category}</span>
                </div>
                <p style={{ fontSize:12, color:T.brownLt, margin:"3px 0" }}>🏢 {job.employerName}</p>
                <div style={{ display:"flex", gap:12, fontSize:12, color:T.brownLt, flexWrap:"wrap" }}>
                  <span>📍 {job.location}</span>
                  <span>📅 {new Date(job.createdAt).toLocaleDateString("en-IN")}</span>
                  <span>⏱ {job.duration} days</span>
                </div>
                {job.review && <div style={{ marginTop:8, fontSize:12, fontStyle:"italic", padding:"8px 12px", borderRadius:8, background:T.bgPage, color:T.brownMd, border:`1px solid ${T.border}` }}>"{job.review}"</div>}
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:99, background:sc.bg, color:sc.color, display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>{sc.icon} {sc.label}</span>
                <div style={{ fontWeight:800, fontSize:16, color:T.brown }}>₹{(job.wage*job.duration).toLocaleString()}</div>
                {job.rating != null && (
                  <div style={{ display:"flex", gap:2, justifyContent:"flex-end", marginTop:4 }}>
                    {Array.from({length:5}).map((_,i) => <Star key={i} size={12} fill={i<job.rating?T.gold:"none"} style={{ color:i<job.rating?T.gold:T.border }}/>)}
                  </div>
                )}
                {job.pointsAwarded > 0 && <div style={{ fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:99, background:"rgba(212,168,83,0.1)", color:T.goldDk, marginTop:4 }}>+{job.pointsAwarded} pts</div>}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REWARDS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function RewardsTab({ pts, tier, nextTier, vouchers, availableVouchers, jobs, showToast, onRedeemed }: any) {
  const [redeeming, setRedeeming] = useState<string|null>(null);

  const handleRedeem = async (voucherId: string) => {
    setRedeeming(voucherId);
    try {
      const res = await redeemVoucher(voucherId);
      showToast(res.data.message, "success");
      onRedeemed();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to redeem", "error");
    } finally { setRedeeming(null); }
  };

  const totalEarned = jobs.filter((j:any) => j.status === "completed").reduce((s:number, j:any) => s + j.wage * j.duration, 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Hero */}
      <div style={{ borderRadius:20, padding:"24px 28px", background:`linear-gradient(135deg,${T.bgSideDk},${T.bgSide})`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 70%,rgba(212,168,83,0.12),transparent 60%)" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:20, position:"relative" }}>
          <div style={{ fontSize:60 }}>{tier.icon}</div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, color:T.goldDk, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", margin:"0 0 4px" }}>Your Rank</p>
            <h2 style={{ color:T.cream, fontWeight:800, fontSize:24, margin:"0 0 4px", fontFamily:"Georgia,serif" }}>{tier.name}</h2>
            <p style={{ color:T.brownLt, fontSize:13, margin:0 }}>{nextTier ? `${nextTier.minPoints-pts} points to ${nextTier.name} ${nextTier.icon}` : "Highest rank achieved! 👑"}</p>
            {nextTier && <div style={{ marginTop:10, height:8, borderRadius:99, background:"rgba(255,255,255,0.1)", maxWidth:320 }}><div style={{ height:8, borderRadius:99, background:`linear-gradient(90deg,${T.gold},${T.goldDk})`, width:`${Math.min(100,(pts-tier.minPoints)/(nextTier.minPoints-tier.minPoints)*100)}%`, transition:"width 1s" }}/></div>}
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:44, fontWeight:800, color:T.gold, fontFamily:"Georgia,serif" }}>{pts}</div>
            <div style={{ fontSize:11, color:T.brownLt }}>Total Points</div>
            <div style={{ marginTop:6, fontSize:13, fontWeight:700, color:T.goldDk }}>₹{totalEarned.toLocaleString()} Earned</div>
            </div>
        </div>
      </div>

      {availableVouchers.length > 0 && (
        <div style={{ padding:"14px 18px", borderRadius:14, background:"rgba(212,168,83,0.1)", border:"1.5px solid rgba(212,168,83,0.35)", display:"flex", alignItems:"center", gap:10 }}>
          <Gift size={20} style={{ color:T.gold, flexShrink:0 }}/>
          <div>
            <div style={{ fontWeight:700, color:T.brown, fontSize:14 }}>🎁 You have {availableVouchers.length} voucher{availableVouchers.length>1?"s":""} to redeem!</div>
            <div style={{ fontSize:12, color:T.brownMd }}>Scroll down to claim your rewards</div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Tiers */}
        <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
          <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 14px", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}><Medal size={15} style={{ color:T.gold }}/> Reward Tiers</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {REWARD_TIERS.map(t => {
              const isCurrent = tier.name === t.name;
              const unlocked = pts >= t.minPoints;
              return (
                <div key={t.name} style={{ padding:"12px 14px", borderRadius:12, background:isCurrent?"rgba(212,168,83,0.08)":T.bgPage, border:`1.5px solid ${isCurrent?"rgba(212,168,83,0.4)":T.border}`, opacity:unlocked?1:0.5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:22 }}>{t.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:T.brown }}>{t.name}</span>
                        {isCurrent && <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:99, background:T.gold, color:T.brown }}>Current</span>}
                        {unlocked && !isCurrent && <CheckCircle size={12} style={{ color:T.success }}/>}
                      </div>
                      <span style={{ fontSize:11, color:T.brownLt }}>{t.minPoints}+ points</span>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
                    {t.perks.map(p => <span key={p} style={{ fontSize:10, padding:"2px 7px", borderRadius:99, background:"rgba(212,168,83,0.08)", color:T.goldDk }}>{p}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Vouchers */}
          <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
            <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 14px", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}><Gift size={15} style={{ color:T.gold }}/> Vouchers & Rewards</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(vouchers||[]).map((v: any) => {
                const canRedeem = pts >= v.pointCost;
                const isAvail = availableVouchers.some((av: any) => av.id === v.id);
                return (
                  <div key={v.id} style={{ padding:"12px", borderRadius:12, background:isAvail?"rgba(212,168,83,0.06)":T.bgPage, border:`1.5px solid ${isAvail?"rgba(212,168,83,0.3)":T.border}`, opacity:canRedeem?1:0.55 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:24 }}>{v.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:T.brown }}>{v.name}</div>
                        <div style={{ fontSize:11, color:T.brownLt }}>{v.description}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:T.goldDk, marginTop:2 }}>{v.pointCost} points</div>
                      </div>
                      {isAvail && (
                        <button onClick={() => handleRedeem(v.id)} disabled={!!redeeming} style={{ padding:"7px 12px", borderRadius:9, background:T.gold, color:T.brown, border:"none", fontWeight:700, fontSize:12, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", gap:4 }}>
                          {redeeming===v.id ? <Loader2 size={12} style={{ animation:"spin 1s linear infinite" }}/> : <Gift size={12}/>} Redeem
                        </button>
                      )}
                    </div>
                    {!canRedeem && (
                      <div style={{ marginTop:6 }}>
                        <div style={{ height:3, borderRadius:99, background:T.border }}>
                          <div style={{ height:3, borderRadius:99, background:`linear-gradient(90deg,${T.gold},${T.goldDk})`, width:`${Math.min(100,(pts/v.pointCost)*100)}%` }}/>
                        </div>
                        <p style={{ fontSize:10, color:T.brownLt, margin:"3px 0 0" }}>{pts}/{v.pointCost} points</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* How to earn */}
          <div style={{ background:T.bgCard, borderRadius:18, padding:"20px", border:`1px solid ${T.border}` }}>
            <h3 style={{ fontWeight:800, color:T.brown, fontSize:15, margin:"0 0 12px", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:8 }}><Zap size={15} style={{ color:T.gold }}/> Earn More Points</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {[
                ["Complete a job (per day)", "+5 pts"],
                ["Get 5-star rating", "+15 pts"],
                ["Get 4-star rating", "+8 pts"],
                ["Get 3-star rating", "+4 pts"],
                ["Aadhaar verified", "+20 pts"],
                ["Profile 100% complete", "+25 pts"],
              ].map(([label, p]) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                  <span style={{ color:T.brownMd }}>{label}</span>
                  <span style={{ fontWeight:700, color:T.goldDk }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLAINT TAB — with real Web Speech API voice input
// ═══════════════════════════════════════════════════════════════════════════════
function ComplaintTab({ showToast }: { showToast: any }) {
  const [form, setForm] = useState({ type:"", employerName:"", description:"", voiceTranscription:false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ✅ Real Web Speech API voice input
  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice input not supported in this browser. Please use Chrome.", "error");
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN"; // Hindi + English
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setRecording(true);
    recognition.onend   = () => setRecording(false);
    recognition.onerror = () => { setRecording(false); showToast("Voice input failed. Please try again.", "error"); };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setForm(f => ({
        ...f,
        description: f.description ? f.description + " " + transcript : transcript,
        voiceTranscription: true,
      }));
      showToast("Voice input added!", "success");
    };
    recognition.start();
  };

  const handleSubmit = async () => {
    if (!form.type || !form.description) { showToast("Please fill complaint type and description", "error"); return; }
    setSubmitting(true);
    try {
      await submitComplaint(form);
      setSubmitted(true);
      showToast("Complaint submitted! Admin will respond within 24 hours.", "success");
    } catch { showToast("Failed to submit complaint", "error"); }
    finally { setSubmitting(false); }
  };

  if (submitted) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 0" }}>
      <CheckCircle size={56} style={{ color:T.success, marginBottom:16 }}/>
      <h2 style={{ fontWeight:800, color:T.brown, fontSize:22, fontFamily:"Georgia,serif", margin:"0 0 8px" }}>Complaint Submitted</h2>
      <p style={{ color:T.brownLt, fontSize:14, textAlign:"center", maxWidth:380, margin:"0 0 24px" }}>Your complaint has been sent to the admin team. We'll review it within 24 hours.</p>
      <button onClick={() => { setSubmitted(false); setForm({ type:"", employerName:"", description:"", voiceTranscription:false }); }} style={{ padding:"10px 24px", borderRadius:12, background:T.brown, color:T.cream, border:"none", cursor:"pointer", fontWeight:700, fontSize:14 }}>Submit Another</button>
    </div>
  );

  return (
    <div style={{ maxWidth:560 }}>
      <div style={{ padding:"14px 18px", borderRadius:14, background:"rgba(212,168,83,0.08)", border:"1px solid rgba(212,168,83,0.2)", fontSize:13, color:T.brownMd, marginBottom:18 }}>
        Your complaint goes directly to the KaamSetu admin team and is reviewed within <strong>24 hours</strong>. You can use the 🎤 voice input if typing is difficult.
      </div>
      <div style={{ background:T.bgCard, borderRadius:18, padding:"24px", border:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={lbl}>Complaint Type *</label>
            <select style={inp} value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))} onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}>
              <option value="">Select a category</option>
              <option>Payment Not Received</option>
              <option>Employer Misbehaviour</option>
              <option>Job Fraud / Fake Listing</option>
              <option>Unsafe Working Conditions</option>
              <option>Technical Issue</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Employer Name <span style={{ fontWeight:400, fontSize:10, color:T.brownLt }}>(if applicable)</span></label>
            <input style={inp} value={form.employerName} onChange={e => setForm(f => ({...f, employerName:e.target.value}))} placeholder="Employer name or company" onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
          </div>
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <label style={lbl}>Description *</label>
              {/* ✅ Real voice button */}
              <button onClick={handleVoice}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, fontSize:11, fontWeight:600, border:`1px solid ${recording?"#fca5a5":"rgba(212,168,83,0.3)"}`, background:recording?"#fde8e8":"rgba(212,168,83,0.08)", color:recording?"#b91c1c":T.goldDk, cursor:"pointer", transition:"all .2s" }}>
                <Mic size={11} style={{ animation:recording?"pulse 1s infinite":undefined }}/>
                {recording ? "🔴 Listening... (tap to stop)" : "🎤 Voice Input"}
              </button>
            </div>
            <textarea style={{ ...inp, resize:"none" }} rows={6} value={form.description} onChange={e => setForm(f => ({...f, description:e.target.value}))} placeholder="Describe your issue clearly. You can also use the voice button above to speak your complaint..." onFocus={e=>(e.target.style.borderColor=T.gold)} onBlur={e=>(e.target.style.borderColor=T.border)}/>
            {form.voiceTranscription && <p style={{ fontSize:11, color:T.success, marginTop:4 }}>✓ Voice input added to description</p>}
          </div>
          <button onClick={handleSubmit} disabled={submitting} style={{ width:"100%", padding:"12px", borderRadius:12, background:T.brown, color:T.cream, border:"none", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {submitting ? <Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/> : <ArrowRight size={16}/>}
            {submitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Extend window for SpeechRecognition
declare global { interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; } }