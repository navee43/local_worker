import React, { useState, useRef, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  Home, Briefcase, Users, AlertCircle, LogOut,
  Bell, Settings, ChevronRight, Star, MapPin, IndianRupee,
  CheckCircle, XCircle, Plus, Search,
  ArrowRight, Building2, Send,
  CreditCard,  Edit3, Mic, Loader2,
  UserCheck, Hammer, AlertTriangle,
  X, Wallet, Camera,  Save, Shield,
  ListChecks, RefreshCw, Lock, ScanLine, BadgeCheck, Navigation
} from "lucide-react";
import {
  fetchEmployerProfile, saveEmployerProfile,
  postJob, fetchEmployerJobs, updateJob, updateJobStatus, deleteJob, completeJob, recordPayment,
  fetchRequests, handleRequest as apiHandleRequest,
  fetchHired, submitEmployerComplaint, fetchNearbyWorkers
} from "../api/Employer";

// ── Theme ──────────────────────────────────────────────────────────────────────
const T = {
  bgPage:"#faf6ef", bgCard:"#ffffff",
  bgSide:"#2d1f0a", bgSideDk:"#1a1208",
  gold:"#d4a853", goldDk:"#c4892a",
  brown:"#2d1f0a", brownMd:"#5c4a2a", brownLt:"#a8895c",
  cream:"#f5ead7", border:"#e8dcc8",
  success:"#15803d", successBg:"#dcfce7",
  error:"#b91c1c", errorBg:"#fde8e8",
};

const CATEGORIES = ["Masonry","Electrical","Plumbing","Carpentry","Painting","HVAC","Welding","Security","Driving","Other"];
const INDUSTRIES  = ["Construction & Infrastructure","Real Estate","Manufacturing","Hospitality","Retail","IT / Tech","Healthcare","Other"];
const SKILLS_LIST = ["Electrician","Plumber","Mason","Carpenter","Painter","HVAC","Welder","Driver","Security Guard","Cook","Tailor","Mechanic","Gardener","Pest Control","Tile Work"];

const payStatusCfg: Record<string,{label:string;color:string;bg:string}> = {
  paid:    {label:"Paid",    color:"#15803d",bg:"#dcfce7"},
  pending: {label:"Pending", color:"#1d4ed8",bg:"#dbeafe"},
  partial: {label:"Partial", color:"#c4892a",bg:"#fef3c7"},
  overdue: {label:"Overdue", color:"#b91c1c",bg:"#fde8e8"},
};
const reqStatusCfg: Record<string,{label:string;color:string;bg:string}> = {
  pending:  {label:"Pending",  color:"#1d4ed8",bg:"#dbeafe"},
  accepted: {label:"Accepted", color:"#15803d",bg:"#dcfce7"},
  rejected: {label:"Rejected", color:"#b91c1c",bg:"#fde8e8"},
};
const jobStatusCfg: Record<string,{label:string;color:string;bg:string}> = {
  open:      {label:"Open",     color:"#15803d",bg:"#dcfce7"},
  filled:    {label:"Filled",   color:"#1d4ed8",bg:"#dbeafe"},
  assigned:  {label:"Assigned", color:"#c4892a",bg:"#fef3c7"},
  closed:    {label:"Closed",   color:"#6b7280",bg:"#f3f4f6"},
  completed: {label:"Completed",color:"#15803d",bg:"#dcfce7"},
};

// ── Shared UI ──────────────────────────────────────────────────────────────────
const Inp: React.CSSProperties = {background:"#fff",border:`1.5px solid ${T.border}`,color:T.brown,borderRadius:12,padding:"11px 14px",fontSize:14,outline:"none",width:"100%"};
const FLabel = ({children}:{children:React.ReactNode}) => (
  <label style={{display:"block",fontSize:11,fontWeight:700,color:T.brownMd,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase"}}>{children}</label>
);
const focusG = (e:React.FocusEvent<any>) => e.target.style.borderColor = T.gold;
const blurB  = (e:React.FocusEvent<any>) => e.target.style.borderColor = T.border;

function Toast({msg,type,onClose}:{msg:string;type:"success"|"error"|"info";onClose:()=>void}) {
  useEffect(()=>{ const t=setTimeout(onClose,4000); return()=>clearTimeout(t); },[onClose]);
  const bg = type==="success"?T.brown:type==="error"?"#b91c1c":"#1e40af";
  const col = type==="success"?T.gold:"#fff";
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:bg,color:col,padding:"12px 20px",borderRadius:12,fontSize:14,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",gap:8,maxWidth:360}}>
      {type==="success"?<CheckCircle size={16}/>:type==="error"?<XCircle size={16}/>:<Bell size={16}/>}
      {msg}
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",marginLeft:8}}><X size={14}/></button>
    </div>
  );
}

function StatCard({icon,label,value,sub,iconBg}:{icon:React.ReactNode;label:string;value:string|number;sub?:string;iconBg?:string}) {
  return (
    <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"start",justifyContent:"space-between"}}>
        <div style={{width:44,height:44,borderRadius:14,background:iconBg||"rgba(212,168,83,0.12)",display:"flex",alignItems:"center",justifyContent:"center",color:T.gold}}>{icon}</div>
        {sub&&<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(21,128,61,0.1)",color:"#15803d"}}>{sub}</span>}
      </div>
      <div>
        <div style={{fontSize:26,fontWeight:800,color:T.brown,fontFamily:"Georgia,serif"}}>{value}</div>
        <div style={{fontSize:12,color:T.brownLt,marginTop:2}}>{label}</div>
      </div>
    </div>
  );
}

// ── Map embed component ────────────────────────────────────────────────────────
function MapEmbed({lat,lng,height=220}:{lat:number;lng:number;height?:number}) {
  return (
    <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`,marginTop:10}}>
      <iframe
        title="job-map"
        width="100%"
        height={height}
        style={{border:"none",display:"block"}}
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`}
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
}

// ── NAV ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {key:"overview",  label:"Overview",       icon:<Home size={17}/>},
  {key:"profile",   label:"My Profile",     icon:<Building2 size={17}/>},
  {key:"post-job",  label:"Post a Job",     icon:<Plus size={17}/>},
  {key:"my-jobs",   label:"My Posted Jobs", icon:<ListChecks size={17}/>},
  {key:"requests",  label:"Worker Requests",icon:<Users size={17}/>, badgeKey:"pendingReq"},
  {key:"hired",     label:"Hired Workers",  icon:<UserCheck size={17}/>},
  {key:"complaint", label:"Raise Complaint",icon:<AlertCircle size={17}/>},
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployerDashboard() {
  const [tab, setTab]           = useState("overview");
  const [profile, setProfile]   = useState<any>(null);
  const [jobs, setJobs]         = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [hired, setHired]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<{msg:string;type:"success"|"error"|"info"}|null>(null);
  const [,setShowNotifPanel] = useState(false);
  const socketRef = useRef<Socket|null>(null);

  const showToast = (msg:string, type:"success"|"error"|"info"="success") => setToast({msg,type});

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, jRes, rRes, hRes] = await Promise.all([
        fetchEmployerProfile(),
        fetchEmployerJobs(),
        fetchRequests(),
        fetchHired(),
      ]);
      setProfile(pRes.data.profile);
      setJobs(jRes.data.jobs || []);
      setRequests(rRes.data.requests || []);
      setHired(hRes.data.hired || []);
    } catch(err) {
      console.error("loadAll error:", err);
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const socket = io("http://localhost:3000", {transports:["websocket"]});
    socketRef.current = socket;
    const user = JSON.parse(localStorage.getItem("kaamsetu_user") || "{}");
    if (user?.id) socket.emit("register_employer", user.id);

    // New request from a worker → reload + toast
    socket.on("new_request", (data:any) => {
      loadAll();
      showToast(`New request from ${data.workerName} for "${data.jobTitle}"`, "info");
    });

    // After accept/reject confirmation comes back
    socket.on("requests_updated", () => loadAll());
    socket.on("job_completed", () => loadAll());

    return () => { socket.disconnect(); };
  }, [loadAll]);

  const handleLogout = () => {
    localStorage.removeItem("kaamsetu_token");
    localStorage.removeItem("kaamsetu_user");
    window.location.href = "/login";
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bgPage,flexDirection:"column",gap:16}}>
      <div style={{width:52,height:52,borderRadius:16,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Hammer size={28} color={T.brown}/>
      </div>
      <Loader2 size={28} style={{color:T.gold,animation:"spin 1s linear infinite"}}/>
      <p style={{color:T.brownLt,fontSize:14}}>Loading employer dashboard...</p>
    </div>
  );

  const pendingReq = requests.filter(r=>r.status==="pending").length;

  const topMap: Record<string,{title:string;sub:string}> = {
    overview:  {title:`Namaste, ${profile?.name?.split(" ")[0]||"Employer"}`,sub:"Your employer portal overview"},
    profile:   {title:"My Profile",sub:"Manage your personal and business information"},
    "post-job":{title:"Post a New Job",sub:"Create a listing and hire the right worker"},
    "my-jobs": {title:"My Posted Jobs",sub:"View, edit and manage all job listings"},
    requests:  {title:"Worker Requests",sub:"Review and manage incoming applications"},
    hired:     {title:"Hired Workers & Payments",sub:"Track workers and payment history"},
    complaint: {title:"Raise a Complaint",sub:"Report an issue to KaamSetu admin"},
  };
  const tb = topMap[tab]||topMap.overview;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bgPage,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* ── SIDEBAR ── */}
      <aside style={{width:256,background:`linear-gradient(180deg,${T.bgSideDk} 0%,${T.bgSide} 100%)`,display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,bottom:0,zIndex:50,boxShadow:"4px 0 24px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"18px 20px",borderBottom:"1px solid rgba(212,168,83,0.15)"}}>
          <div style={{width:36,height:36,borderRadius:10,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Hammer size={18} color={T.brown}/>
          </div>
          <span style={{fontSize:20,fontWeight:800,color:T.gold,fontFamily:"Georgia,serif"}}>KaamSetu</span>
        </div>

        {/* Employer pill */}
        <div style={{margin:"12px",padding:"12px",borderRadius:14,background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.15)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {profile?.logo
              ? <img src={profile.logo} style={{width:44,height:44,borderRadius:12,objectFit:"cover"}} alt="logo"/>
              : <div style={{width:44,height:44,borderRadius:12,background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:T.brown}}>{(profile?.company||profile?.name||"E")[0]}</div>
            }
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:T.cream,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile?.company||profile?.name||"Employer"}</div>
              <div style={{fontSize:11,color:T.goldDk,marginTop:2}}>{profile?.name}</div>
              {profile?.verified && (
                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}>
                  <Shield size={10} color="#4ade80"/><span style={{fontSize:10,color:"#4ade80"}}>Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:"4px 10px",overflowY:"auto"}}>
          <p style={{fontSize:10,color:"rgba(168,137,92,0.6)",padding:"10px 10px 4px",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Menu</p>
          {NAV_ITEMS.map(n=>{
            const isActive = tab===n.key;
            const badge = n.key==="requests" ? pendingReq : 0;
            return (
              <button key={n.key} onClick={()=>setTab(n.key)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,fontSize:13,fontWeight:500,textAlign:"left",background:isActive?"rgba(212,168,83,0.15)":"transparent",color:isActive?T.gold:T.brownLt,border:isActive?"1px solid rgba(212,168,83,0.25)":"1px solid transparent",cursor:"pointer",transition:"all .2s",marginBottom:2}}>
                <span style={{color:isActive?T.gold:T.brownLt}}>{n.icon}</span>
                <span style={{flex:1}}>{n.label}</span>
                {badge>0 && <span style={{fontSize:10,padding:"1px 6px",borderRadius:20,background:T.gold,color:T.brown,fontWeight:800}}>{badge}</span>}
                {isActive && <ChevronRight size={13} style={{color:T.gold}}/>}
              </button>
            );
          })}
        </nav>

        <div style={{padding:"10px",borderTop:"1px solid rgba(212,168,83,0.1)"}}>
          <button onClick={handleLogout}
            style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,fontSize:13,color:"#f87171",background:"none",border:"none",cursor:"pointer"}}>
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,marginLeft:256,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        {/* Topbar */}
        <div style={{position:"sticky",top:0,zIndex:30,background:T.bgCard,borderBottom:`1px solid ${T.border}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:T.brown,fontFamily:"Georgia,serif",margin:0}}>{tb.title}</h1>
            <p style={{fontSize:13,color:T.brownLt,margin:0}}>{tb.sub}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Bell navigates to requests tab */}
            <div style={{position:"relative"}}>
              <button
                onClick={()=>{ setTab("requests"); setShowNotifPanel(false); }}
                title={pendingReq>0?`${pendingReq} pending worker request(s)`:"No new requests"}
                style={{width:40,height:40,borderRadius:12,background:T.bgPage,border:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative"}}>
                <Bell size={16} color={pendingReq>0?T.goldDk:T.brownMd}/>
              </button>
              {pendingReq>0 && (
                <span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:T.gold,color:T.brown,fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                  {pendingReq}
                </span>
              )}
            </div>
            <button style={{width:40,height:40,borderRadius:12,background:T.bgPage,border:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <Settings size={16} color={T.brownMd}/>
            </button>
            <button onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,background:"transparent",border:`1.5px solid ${T.border}`,fontSize:12,fontWeight:600,color:T.brownMd,cursor:"pointer"}}>
              <LogOut size={13}/> Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,padding:24,overflowY:"auto"}}>
          {tab==="overview"  && <OverviewSection jobs={jobs} requests={requests} hired={hired} profile={profile} onNav={setTab}/>}
          {tab==="profile"   && <ProfileSection profile={profile} onSave={async(data)=>{await saveEmployerProfile(data);await loadAll();showToast("Profile saved!");}}/>}
          {tab==="post-job"  && <PostJobSection onPost={async(data)=>{await postJob(data);await loadAll();showToast("Job posted! Nearby workers notified.");setTab("my-jobs");}}/>}
          {tab==="my-jobs"   && <MyJobsSection jobs={jobs} requests={requests} onNav={setTab}
            onUpdateStatus={async(id,s)=>{await updateJobStatus(id,s);await loadAll();showToast(`Job ${s}`);}}
            onDelete={async(id)=>{await deleteJob(id);await loadAll();showToast("Job deleted","info");}}
            onUpdate={async(id,d)=>{await updateJob(id,d);await loadAll();showToast("Job updated!");}}
            onComplete={async(id,d)=>{await completeJob(id,d);await loadAll();showToast("Job completed! Worker notified 🎉");}}
          />}
          {tab==="requests"  && <RequestsSection requests={requests}
            onAction={async(jobId,reqId,action)=>{await apiHandleRequest(jobId,reqId,action);await loadAll();showToast(`Worker ${action}!`);}}
          />}
          {tab==="hired"     && <HiredSection hired={hired}
            onPay={async(id,amt)=>{await recordPayment(id,amt);await loadAll();showToast("Payment recorded!");}}
            onComplete={async(id,d)=>{await completeJob(id,d);await loadAll();showToast("Job rated & completed! 🎉");}}
          />}
          {tab==="complaint" && <ComplaintSection onSubmit={async(d)=>{await submitEmployerComplaint(d);showToast("Complaint submitted to admin.");}}/>}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${T.gold};border-radius:99px}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewSection({jobs,requests,hired,profile,onNav}:{jobs:any[];requests:any[];hired:any[];profile:any;onNav:(t:string)=>void}) {
  const openJobs   = jobs.filter(j=>j.status==="open").length;
  const pendingReq = requests.filter(r=>r.status==="pending").length;
  const activeHire = hired.filter(h=>h.status==="active"||h.status==="assigned").length;
  const totalSpent = hired.reduce((s:number,h:any)=>s+h.amountPaid,0);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{background:`linear-gradient(135deg,${T.bgSideDk},${T.bgSide})`,borderRadius:24,padding:"28px",display:"flex",alignItems:"center",gap:20,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 80% 50%,rgba(212,168,83,0.08),transparent 60%)"}}/>
        <div style={{width:64,height:64,borderRadius:18,background:"rgba(212,168,83,0.15)",border:"1px solid rgba(212,168,83,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative"}}>
          {profile?.logo ? <img src={profile.logo} style={{width:64,height:64,borderRadius:18,objectFit:"cover"}} alt="logo"/> : <Building2 size={30} color={T.gold}/>}
        </div>
        <div style={{flex:1,position:"relative"}}>
          <p style={{fontSize:11,fontWeight:700,color:T.goldDk,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Employer Portal</p>
          <h2 style={{fontSize:26,fontWeight:800,color:T.cream,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>Namaste, {profile?.name?.split(" ")[0]||"Employer"}</h2>
          <p style={{fontSize:13,color:T.brownLt,margin:0}}>
            You have <strong style={{color:T.gold}}>{pendingReq} pending request{pendingReq!==1?"s":""}</strong> from workers waiting for review.
          </p>
        </div>
        <button onClick={()=>onNav("post-job")}
          style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",borderRadius:14,background:T.gold,color:T.brown,fontSize:13,fontWeight:700,border:"none",cursor:"pointer",flexShrink:0,position:"relative"}}>
          <Plus size={15}/> Post a Job
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
        <StatCard icon={<Briefcase size={19}/>}  label="Open Jobs"        value={openJobs}   sub={`${jobs.length} total`}/>
        <StatCard icon={<Users size={19}/>}       label="Pending Requests" value={pendingReq} iconBg="rgba(196,137,42,0.12)"/>
        <StatCard icon={<UserCheck size={19}/>}   label="Active Workers"   value={activeHire} iconBg="rgba(21,128,61,0.1)"/>
        <StatCard icon={<IndianRupee size={19}/>} label="Total Spent"      value={`₹${totalSpent.toLocaleString()}`} iconBg="rgba(212,168,83,0.15)"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20}}>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h3 style={{fontWeight:700,color:T.brown,fontFamily:"Georgia,serif",margin:0}}>Recent Worker Requests</h3>
            <button onClick={()=>onNav("requests")} style={{fontSize:12,fontWeight:600,color:T.goldDk,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>See all <ChevronRight size={13}/></button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {requests.slice(0,5).map((r:any)=>{
              const sc=reqStatusCfg[r.status]||reqStatusCfg.pending;
              return (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:12,borderRadius:14,background:T.bgPage}}>
                  {r.profilePhoto
                    ? <img src={r.profilePhoto} style={{width:40,height:40,borderRadius:12,objectFit:"cover"}} alt="w"/>
                    : <div style={{width:40,height:40,borderRadius:12,background:"rgba(212,168,83,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:T.goldDk}}>{(r.workerName||"W")[0]}</div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.brown,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.workerName}</div>
                    <div style={{fontSize:11,color:T.brownLt}}>{r.skill||"Worker"} · ⭐{r.rating||0}</div>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span>
                </div>
              );
            })}
            {requests.length===0 && <p style={{color:T.brownLt,fontSize:13,textAlign:"center",padding:"16px 0"}}>No requests yet. Post a job to get started!</p>}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
            <h3 style={{fontWeight:700,color:T.brown,fontFamily:"Georgia,serif",margin:"0 0 14px"}}>Quick Actions</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[{label:"Post a New Job",icon:<Plus size={14}/>,key:"post-job"},{label:"My Posted Jobs",icon:<ListChecks size={14}/>,key:"my-jobs"},{label:"Review Requests",icon:<Users size={14}/>,key:"requests"},{label:"Manage Payments",icon:<Wallet size={14}/>,key:"hired"},{label:"Raise Complaint",icon:<AlertCircle size={14}/>,key:"complaint"}]
              .map(a=>(
                <button key={a.key} onClick={()=>onNav(a.key)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,fontSize:12,fontWeight:500,background:T.bgPage,border:`1px solid ${T.border}`,color:T.brownMd,cursor:"pointer",textAlign:"left",width:"100%"}}>
                  <span style={{color:T.gold}}>{a.icon}</span>{a.label}<ChevronRight size={12} style={{marginLeft:"auto",color:T.brownLt}}/>
                </button>
              ))}
            </div>
          </div>
          {hired.some((h:any)=>h.paymentStatus==="overdue") && (
            <div style={{background:T.errorBg,border:"1px solid rgba(185,28,28,0.2)",borderRadius:20,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <AlertTriangle size={15} color={T.error}/>
                <span style={{fontSize:13,fontWeight:700,color:T.error}}>Payment Alert</span>
              </div>
              <p style={{fontSize:11,color:"#7f1d1d",margin:"0 0 8px"}}>Worker has an overdue payment. Resolve to avoid restrictions.</p>
              <button onClick={()=>onNav("hired")} style={{fontSize:11,fontWeight:700,color:T.error,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                View now <ArrowRight size={11}/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileSection({profile,onSave}:{profile:any;onSave:(d:any)=>Promise<void>}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<any>({...profile});
  const [saving, setSaving]   = useState(false);
  const [aadharStep, setAadharStep] = useState(profile?.aadharVerified?"verified":"idle");
  const [otp, setOtp]         = useState("");
  const [verifying, setVerifying] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ setForm({...profile}); setAadharStep(profile?.aadharVerified?"verified":"idle"); },[profile]);

  const handleLogoUpload = (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file){
      const reader = new FileReader();
      reader.onload = ev => setForm((f:any)=>({...f,logo:ev.target?.result as string}));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); setEditing(false); } catch{} finally { setSaving(false); }
  };

  const sendOtp = () => { if((form.aadharNumber||"").length===12) setAadharStep("otp"); };
  const verifyOtp = () => {
    if(otp.length!==6) return;
    setVerifying(true);
    setTimeout(async()=>{
      const newForm = {...form, aadharVerified:true};
      setForm(newForm);
      setAadharStep("verified");
      setVerifying(false);
      await onSave(newForm);
    },1500);
  };

  const baseFields = [form?.name,form?.phone,form?.email,form?.employerType,form?.aadharVerified];
  const bizFields  = form?.employerType!=="homemaker" ? [form?.company,form?.industry] : [];
  const pct = Math.round([...baseFields,...bizFields].filter(Boolean).length/([...baseFields,...bizFields].length||1)*100);

  return (
    <div style={{maxWidth:760,display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:24,padding:24}}>
        <div style={{display:"flex",alignItems:"start",gap:20}}>
          <div style={{position:"relative",flexShrink:0}}>
            {form?.logo
              ? <img src={form.logo} style={{width:80,height:80,borderRadius:20,objectFit:"cover"}} alt="logo"/>
              : <div style={{width:80,height:80,borderRadius:20,background:`linear-gradient(135deg,${T.gold},${T.goldDk})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 size={32} color={T.brown}/></div>
            }
            {editing && (
              <button onClick={()=>logoRef.current?.click()}
                style={{position:"absolute",bottom:-8,right:-8,width:28,height:28,borderRadius:10,background:T.brown,border:`2px solid ${T.bgPage}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <Camera size={12} color={T.gold}/>
              </button>
            )}
            <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogoUpload}/>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:16}}>
              <div>
                <h2 style={{fontSize:24,fontWeight:800,color:T.brown,fontFamily:"Georgia,serif",margin:"0 0 4px"}}>{form?.company||form?.name||"Your Profile"}</h2>
                <p style={{fontSize:13,color:T.brownLt,margin:0}}>{form?.name}</p>
                <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                  {form?.verified && <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,background:T.successBg,color:T.success,display:"flex",alignItems:"center",gap:4}}><Shield size={10}/>KaamSetu Verified</span>}
                  {form?.aadharVerified && <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,background:"rgba(21,128,61,0.08)",color:T.success,border:"1px solid rgba(21,128,61,0.2)",display:"flex",alignItems:"center",gap:4}}><BadgeCheck size={10}/>Aadhar Verified</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {editing ? (
                  <>
                    <button onClick={()=>{setForm({...profile});setEditing(false);}} style={{padding:"8px 16px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bgPage,color:T.brownMd,border:`1.5px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><X size={13}/>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{padding:"8px 16px",borderRadius:12,fontSize:13,fontWeight:600,background:T.brown,color:T.cream,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                      {saving?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<Save size={13}/>} Save
                    </button>
                  </>
                ) : (
                  <button onClick={()=>setEditing(true)} style={{padding:"8px 16px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bgPage,color:T.brownMd,border:`1.5px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><Edit3 size={13}/>Edit</button>
                )}
              </div>
            </div>
            <div style={{marginTop:16}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:T.brownLt}}>Profile Completion</span>
                <span style={{fontWeight:700,color:T.goldDk}}>{pct}%</span>
              </div>
              <div style={{height:6,borderRadius:10,background:T.border}}>
                <div style={{height:6,borderRadius:10,background:`linear-gradient(90deg,${T.gold},${T.goldDk})`,width:`${pct}%`,transition:"width .5s"}}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
        <h3 style={{fontWeight:700,color:T.brown,fontFamily:"Georgia,serif",margin:"0 0 16px",display:"flex",alignItems:"center",gap:8}}><UserCheck size={15} color={T.gold}/>Personal Information</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[{label:"Full Name *",field:"name",ph:"Your full name"},{label:"Phone Number",field:"phone",ph:"+91 XXXXX XXXXX"},{label:"Email Address",field:"email",ph:"you@email.com"},{label:"I am a",field:"employerType",ph:"",select:["","business","employee","homemaker"],selectLabels:["Select role","Businessman / Entrepreneur","Company Employee","Homemaker / Individual"]}].map(({label,field,ph,select,selectLabels})=>(
            <div key={field}>
              <FLabel>{label}</FLabel>
              {select ? (
                <select style={Inp} value={form?.[field]||""} disabled={!editing}
                  onChange={e=>setForm((f:any)=>({...f,[field]:e.target.value}))} onFocus={focusG} onBlur={blurB}>
                  {select.map((v,i)=><option key={v} value={v}>{selectLabels![i]}</option>)}
                </select>
              ) : (
                <input style={Inp} value={form?.[field]||""} disabled={!editing}
                  onChange={e=>setForm((f:any)=>({...f,[field]:e.target.value}))}
                  placeholder={ph} onFocus={focusG} onBlur={blurB}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Business info */}
      {(form?.employerType==="business"||form?.employerType==="employee") && (
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
          <h3 style={{fontWeight:700,color:T.brown,fontFamily:"Georgia,serif",margin:"0 0 16px",display:"flex",alignItems:"center",gap:8}}><Building2 size={15} color={T.gold}/>Business Details</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div><FLabel>Company Name *</FLabel>
              <input style={Inp} value={form?.company||""} disabled={!editing} onChange={e=>setForm((f:any)=>({...f,company:e.target.value}))} placeholder="e.g. BuildFast Pvt. Ltd." onFocus={focusG} onBlur={blurB}/>
            </div>
            <div><FLabel>Industry *</FLabel>
              <select style={Inp} value={form?.industry||""} disabled={!editing} onChange={e=>setForm((f:any)=>({...f,industry:e.target.value}))} onFocus={focusG} onBlur={blurB}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            {form?.employerType==="business" && (
              <><div><FLabel>GST Number</FLabel><input style={Inp} value={form?.gst||""} disabled={!editing} onChange={e=>setForm((f:any)=>({...f,gst:e.target.value}))} placeholder="07AABCB1234M1Z5" onFocus={focusG} onBlur={blurB}/></div>
              <div><FLabel>Website</FLabel><input style={Inp} value={form?.website||""} disabled={!editing} onChange={e=>setForm((f:any)=>({...f,website:e.target.value}))} placeholder="www.yourbusiness.in" onFocus={focusG} onBlur={blurB}/></div></>
            )}
            <div style={{gridColumn:"1/-1"}}><FLabel>About Business</FLabel>
              <textarea style={{...Inp,resize:"none"}} rows={3} value={form?.about||""} disabled={!editing} onChange={e=>setForm((f:any)=>({...f,about:e.target.value}))} placeholder="Brief description..." onFocus={focusG} onBlur={blurB}/>
            </div>
          </div>
        </div>
      )}

      {/* Aadhar */}
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:20}}>
        <h3 style={{fontWeight:700,color:T.brown,fontFamily:"Georgia,serif",margin:"0 0 6px",display:"flex",alignItems:"center",gap:8}}><ScanLine size={15} color={T.gold}/>Aadhar Verification</h3>
        <p style={{fontSize:12,color:T.brownLt,margin:"0 0 16px"}}>Required for identity trust on KaamSetu. Data is encrypted and secure.</p>
        {aadharStep==="verified"||form?.aadharVerified ? (
          <div style={{display:"flex",alignItems:"center",gap:12,padding:16,borderRadius:14,background:T.successBg,border:"1px solid rgba(21,128,61,0.25)"}}>
            <BadgeCheck size={28} color={T.success}/>
            <div><p style={{fontWeight:700,fontSize:13,color:T.success,margin:0}}>Aadhar Successfully Verified</p>
            <p style={{fontSize:11,color:"#166534",margin:0}}>Your identity is confirmed. This builds trust with workers.</p></div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,position:"relative"}}>
                <Lock size={13} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.brownLt}}/>
                <input style={{...Inp,paddingLeft:34}} value={form?.aadharNumber||""} maxLength={12}
                  disabled={aadharStep==="otp"}
                  onChange={e=>setForm((f:any)=>({...f,aadharNumber:e.target.value.replace(/\D/g,"")}))}
                  placeholder="12-digit Aadhar number" onFocus={focusG} onBlur={blurB}/>
              </div>
              {aadharStep!=="otp" && (
                <button onClick={sendOtp} disabled={(form?.aadharNumber||"").length!==12}
                  style={{padding:"11px 20px",borderRadius:12,fontSize:13,fontWeight:600,background:(form?.aadharNumber||"").length===12?T.brown:T.border,color:(form?.aadharNumber||"").length===12?T.cream:T.brownLt,border:"none",cursor:"pointer"}}>
                  Send OTP
                </button>
              )}
            </div>
            {aadharStep==="otp" && (
              <div style={{padding:16,borderRadius:14,background:"rgba(212,168,83,0.06)",border:"1px solid rgba(212,168,83,0.2)"}}>
                <p style={{fontSize:13,fontWeight:600,color:T.brownMd,margin:"0 0 12px"}}>OTP sent to Aadhar-linked mobile</p>
                <div style={{display:"flex",gap:10}}>
                  <input style={{...Inp,flex:1}} value={otp} maxLength={6} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} placeholder="6-digit OTP" onFocus={focusG} onBlur={blurB}/>
                  <button onClick={verifyOtp} disabled={otp.length!==6||verifying}
                    style={{padding:"11px 20px",borderRadius:12,fontSize:13,fontWeight:600,background:otp.length===6?T.brown:T.border,color:otp.length===6?T.cream:T.brownLt,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    {verifying?<><Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>Verifying</>:"Verify OTP"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST JOB — with live map preview after location is detected/typed
// ═══════════════════════════════════════════════════════════════════════════════
function PostJobSection({onPost}:{onPost:(d:any)=>Promise<void>}) {
  const [form, setForm] = useState({title:"",category:"",location:"",lat:null as number|null,lng:null as number|null,wage:"",duration:"",description:"",skills:[] as string[],urgent:false});
  const [posting, setPosting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearbyCount, setNearbyCount] = useState<number|null>(null);
  const [newSkill, setNewSkill] = useState("");
  const geocodeTimer = useRef<any>(null);

  // Reverse geocode: detect from device GPS
  const getLocation = () => {
    if(!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async pos=>{
      const {latitude:lat,longitude:lng} = pos.coords;
      setForm(f=>({...f,lat,lng}));
      setLocating(false);
      // Reverse geocode → human-readable city
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const city = data.address?.city||data.address?.town||data.address?.village||"";
        const state = data.address?.state||"";
        if(city||state) setForm(f=>({...f,location:`${city}${city&&state?", ":""}${state}`}));
      } catch{}
      // Count nearby workers
      try {
        const res = await fetchNearbyWorkers(lat,lng,10);
        setNearbyCount(res.data.workers?.length||0);
      } catch{}
    },()=>setLocating(false));
  };

  // Forward geocode: typed location → lat/lng (debounced 800ms)
  const handleLocationChange = (val:string) => {
    setForm(f=>({...f,location:val,lat:null,lng:null}));
    clearTimeout(geocodeTimer.current);
    if(!val.trim()) return;
    geocodeTimer.current = setTimeout(async()=>{
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=1`);
        const data = await res.json();
        if(data[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setForm(f=>({...f,lat,lng}));
          try {
            const nr = await fetchNearbyWorkers(lat,lng,10);
            setNearbyCount(nr.data.workers?.length||0);
          } catch{}
        }
      } catch{}
    },800);
  };

  const handlePost = async() => {
    if(!form.title||!form.category||!form.location||!form.wage||!form.duration) return;
    setPosting(true);
    try { await onPost({...form,skills:form.skills}); }
    finally { setPosting(false); }
  };

  const canPost = !!(form.title&&form.category&&form.location&&form.wage&&form.duration);

  return (
    <div style={{maxWidth:640,display:"flex",flexDirection:"column",gap:20}}>
      {nearbyCount !== null && (
        <div style={{padding:14,borderRadius:14,background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)",fontSize:13,color:T.brownMd,display:"flex",alignItems:"center",gap:8}}>
          <Navigation size={14} color={T.goldDk}/>
          <strong style={{color:T.goldDk}}>{nearbyCount} workers</strong> within 10km will be notified when you post this job.
        </div>
      )}

      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:24,display:"flex",flexDirection:"column",gap:18}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{gridColumn:"1/-1"}}><FLabel>Job Title *</FLabel>
            <input style={Inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Need Electrician for 3 days" onFocus={focusG} onBlur={blurB}/>
          </div>
          <div><FLabel>Category *</FLabel>
            <select style={Inp} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} onFocus={focusG} onBlur={blurB}>
              <option value="">Select category</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <FLabel>Location *</FLabel>
            <div style={{display:"flex",gap:8}}>
              <input style={{...Inp,flex:1}} value={form.location} onChange={e=>handleLocationChange(e.target.value)} placeholder="City, State" onFocus={focusG} onBlur={blurB}/>
              <button type="button" onClick={getLocation} disabled={locating}
                style={{padding:"11px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:T.brown,color:T.cream,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                {locating?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<MapPin size={13}/>}
                {locating?"...":"Detect"}
              </button>
            </div>
            {form.lat && (
              <p style={{fontSize:11,color:T.success,marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                <MapPin size={10}/> Location pinned ({form.lat.toFixed(4)}, {form.lng?.toFixed(4)})
              </p>
            )}
          </div>
          <div><FLabel>Daily Wage (₹) *</FLabel>
            <input style={Inp} type="number" value={form.wage} onChange={e=>setForm(f=>({...f,wage:e.target.value}))} placeholder="e.g. 800" min="1" onFocus={focusG} onBlur={blurB}/>
          </div>
          <div><FLabel>Duration (days) *</FLabel>
            <input style={Inp} type="number" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="e.g. 5" min="1" onFocus={focusG} onBlur={blurB}/>
          </div>
          <div style={{gridColumn:"1/-1"}}><FLabel>Description</FLabel>
            <textarea style={{...Inp,resize:"none"}} rows={4} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the work, requirements, timings, etc." onFocus={focusG} onBlur={blurB}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <FLabel>Skills Required</FLabel>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {form.skills.map(s=>(
                <span key={s} style={{fontSize:12,padding:"4px 10px",borderRadius:99,background:"rgba(212,168,83,0.1)",color:T.goldDk,border:"1px solid rgba(212,168,83,0.25)",display:"flex",alignItems:"center",gap:4}}>
                  {s} <button onClick={()=>setForm(f=>({...f,skills:f.skills.filter(x=>x!==s)}))} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",display:"flex",padding:0}}><X size={10}/></button>
                </span>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <select style={{...Inp,flex:1}} value={newSkill} onChange={e=>setNewSkill(e.target.value)} onFocus={focusG} onBlur={blurB}>
                <option value="">Select skill...</option>
                {SKILLS_LIST.filter(s=>!form.skills.includes(s)).map(s=><option key={s}>{s}</option>)}
              </select>
              <button onClick={()=>{if(newSkill&&!form.skills.includes(newSkill)){setForm(f=>({...f,skills:[...f.skills,newSkill]}));setNewSkill("");}}}
                style={{padding:"0 14px",borderRadius:10,background:T.gold,color:T.brown,border:"none",cursor:"pointer",display:"flex",alignItems:"center"}}><Plus size={16}/></button>
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={form.urgent} onChange={e=>setForm(f=>({...f,urgent:e.target.checked}))} style={{width:16,height:16,accentColor:T.gold}}/>
              <span style={{fontSize:13,fontWeight:600,color:T.brownMd}}>🔥 Mark as Urgent (shown with priority badge)</span>
            </label>
          </div>
        </div>

        {/* ── MAP PREVIEW — shown as soon as lat/lng are available ── */}
        {form.lat && form.lng && (
          <div>
            <FLabel>Job Location Preview</FLabel>
            <MapEmbed lat={form.lat} lng={form.lng} height={220}/>
          </div>
        )}

        {form.wage && form.duration && (
          <div style={{padding:14,borderRadius:12,background:T.bgPage,border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:T.brownMd}}>Estimated Total Cost:</span>
            <span style={{fontSize:20,fontWeight:800,color:T.brown,fontFamily:"Georgia,serif"}}>₹{(parseInt(form.wage)||0)*(parseInt(form.duration)||0)}</span>
          </div>
        )}

        <button onClick={handlePost} disabled={posting||!canPost}
          style={{padding:"14px",borderRadius:14,fontSize:14,fontWeight:700,background:canPost?T.brown:T.border,color:canPost?T.cream:T.brownLt,border:"none",cursor:canPost?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {posting?<><Loader2 size={15} style={{animation:"spin 1s linear infinite"}}/>Posting...</>:<><Send size={15}/>Post Job & Notify Workers</>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY JOBS
// ═══════════════════════════════════════════════════════════════════════════════
function MyJobsSection({jobs,requests,onNav,onUpdateStatus,onDelete,onUpdate,onComplete}:{jobs:any[];requests:any[];onNav:(t:string)=>void;onUpdateStatus:(id:string,s:string)=>Promise<void>;onDelete:(id:string)=>Promise<void>;onUpdate:(id:string,d:any)=>Promise<void>;onComplete:(id:string,d:any)=>Promise<void>}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editJob, setEditJob] = useState<any>(null);
  const [completeJobModal, setCompleteJobModal] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedMap, setExpandedMap] = useState<string|null>(null);

  const jobRequests = (job:any) => requests.filter(r=>String(r.jobId)===String(job._id||job.id));
  const filtered = jobs
    .filter(j=>filter==="all"||j.status===filter)
    .filter(j=>!search||j.title.toLowerCase().includes(search.toLowerCase())||j.location?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Edit modal */}
      {editJob && (
        <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.bgCard,borderRadius:24,padding:28,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{fontWeight:700,fontSize:18,color:T.brown,fontFamily:"Georgia,serif",margin:0}}>Edit Job</h3>
              <button onClick={()=>setEditJob(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={T.brownLt}/></button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[{l:"Job Title",f:"title"},{l:"Location",f:"location"},{l:"Daily Wage (₹)",f:"wage",t:"number"},{l:"Duration (days)",f:"duration",t:"number"}].map(({l,f,t})=>(
                <div key={f}><FLabel>{l}</FLabel>
                  <input style={Inp} type={t||"text"} value={editJob[f]||""} onChange={e=>setEditJob((j:any)=>({...j,[f]:e.target.value}))} onFocus={focusG} onBlur={blurB}/>
                </div>
              ))}
              <div><FLabel>Category</FLabel>
                <select style={Inp} value={editJob.category||""} onChange={e=>setEditJob((j:any)=>({...j,category:e.target.value}))} onFocus={focusG} onBlur={blurB}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><FLabel>Description</FLabel>
                <textarea style={{...Inp,resize:"none"}} rows={3} value={editJob.description||""} onChange={e=>setEditJob((j:any)=>({...j,description:e.target.value}))} onFocus={focusG} onBlur={blurB}/>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                <input type="checkbox" checked={editJob.urgent||false} onChange={e=>setEditJob((j:any)=>({...j,urgent:e.target.checked}))} style={{accentColor:T.gold}}/>
                <span style={{fontSize:13,color:T.brownMd}}>🔥 Mark as Urgent</span>
              </label>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>setEditJob(null)} style={{flex:1,padding:"12px",borderRadius:12,fontSize:13,fontWeight:600,background:T.bgPage,color:T.brownMd,border:`1.5px solid ${T.border}`,cursor:"pointer"}}>Cancel</button>
                <button onClick={async()=>{setSaving(true);await onUpdate(editJob._id||editJob.id,editJob);setSaving(false);setEditJob(null);}}
                  style={{flex:1,padding:"12px",borderRadius:12,fontSize:13,fontWeight:700,background:T.brown,color:T.cream,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {saving?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<Save size={14}/>} Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete modal */}
      {completeJobModal && (
        <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.bgCard,borderRadius:24,padding:28,width:"100%",maxWidth:420}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{fontWeight:700,fontSize:18,color:T.brown,fontFamily:"Georgia,serif",margin:0}}>Complete Job & Rate Worker</h3>
              <button onClick={()=>setCompleteJobModal(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={T.brownLt}/></button>
            </div>
            <p style={{fontSize:13,color:T.brownLt,margin:"0 0 16px"}}>Rate <strong style={{color:T.brown}}>{completeJobModal.workerName}</strong> for <em>{completeJobModal.title}</em></p>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12}}>
              {[1,2,3,4,5].map(s=>(
                <button key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(s)} style={{background:"none",border:"none",cursor:"pointer"}}>
                  <Star size={36} fill={(hover||rating)>=s?T.gold:"none"} color={T.gold}/>
                </button>
              ))}
            </div>
            <p style={{textAlign:"center",fontSize:13,color:T.brownLt,marginBottom:14}}>{rating===0?"Tap to rate":["","Poor","Fair","Good","Very Good","Excellent!"][rating]}</p>
            <textarea rows={3} value={review} onChange={e=>setReview(e.target.value)} placeholder="Write a review (optional)..."
              style={{...Inp,resize:"none",marginBottom:14}} onFocus={focusG} onBlur={blurB}/>
            <button onClick={async()=>{setSaving(true);await onComplete(completeJobModal._id||completeJobModal.id,{rating,review});setSaving(false);setCompleteJobModal(null);setRating(0);setReview("");}}
              disabled={rating===0}
              style={{width:"100%",padding:"13px",borderRadius:12,fontSize:13,fontWeight:700,background:rating>0?T.brown:T.border,color:rating>0?T.cream:T.brownLt,border:"none",cursor:rating>0?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {saving?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<CheckCircle size={14}/>} Mark Complete & Rate
            </button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatCard icon={<Briefcase size={18}/>}  label="Open Jobs"  value={jobs.filter(j=>j.status==="open").length} iconBg="rgba(21,128,61,0.1)"/>
        <StatCard icon={<UserCheck size={18}/>}   label="Assigned"  value={jobs.filter(j=>j.status==="assigned").length} iconBg="rgba(29,78,216,0.1)"/>
        <StatCard icon={<CheckCircle size={18}/>} label="Completed" value={jobs.filter(j=>j.status==="completed").length} iconBg="rgba(212,168,83,0.15)"/>
      </div>

      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1,position:"relative",minWidth:200}}>
          <Search size={14} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.brownLt}}/>
          <input style={{...Inp,paddingLeft:36}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search jobs..." onFocus={focusG} onBlur={blurB}/>
        </div>
        {["all","open","assigned","completed","closed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"10px 18px",borderRadius:12,fontSize:12,fontWeight:600,textTransform:"capitalize",background:filter===f?T.brown:T.bgCard,color:filter===f?T.cream:T.brownMd,border:`1.5px solid ${filter===f?T.brown:T.border}`,cursor:"pointer"}}>
            {f==="all"?"All":f}
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 0",color:T.brownLt}}>
            <Briefcase size={40} style={{opacity:.3,marginBottom:12}}/>
            <p style={{fontWeight:600,margin:0}}>No jobs found</p>
            <button onClick={()=>onNav("post-job")}
              style={{marginTop:16,padding:"10px 24px",borderRadius:12,fontSize:13,fontWeight:700,background:T.brown,color:T.cream,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,margin:"16px auto 0"}}>
              <Plus size={14}/> Post a Job
            </button>
          </div>
        ) : filtered.map((job:any)=>{
          const sc = jobStatusCfg[job.status]||jobStatusCfg.open;
          const reqs = jobRequests(job);
          const jid = job._id||job.id;
          const showMap = expandedMap===jid;
          return (
            <div key={jid} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:20,padding:20}}>
              <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:16}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                    {job.urgent && <span style={{fontSize:11,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"#fef3c7",color:"#92400e"}}>🔥 Urgent</span>}
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 10px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span>
                    <span style={{fontSize:11,padding:"2px 10px",borderRadius:20,background:"rgba(212,168,83,0.1)",color:T.goldDk}}>{job.category}</span>
                  </div>
                  <h3 style={{fontSize:16,fontWeight:700,color:T.brown,margin:"0 0 8px"}}>{job.title}</h3>
                  <div style={{display:"flex",gap:16,fontSize:12,color:T.brownLt,flexWrap:"wrap"}}>
                    <span>📍 {job.location}</span>
                    <span>💰 ₹{job.wage}/day · {job.duration}d</span>
                    <span>👷 {reqs.length} applicant{reqs.length!==1?"s":""}</span>
                  </div>
                  {job.skillsRequired?.length>0 && (
                    <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                      {job.skillsRequired.slice(0,3).map((s:string,i:number)=>(
                        <span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:"rgba(212,168,83,0.08)",color:T.brownMd,border:"1px solid rgba(212,168,83,0.15)"}}>{s}</span>
                      ))}
                    </div>
                  )}
                  {job.workerName && <p style={{fontSize:12,color:T.success,margin:"8px 0 0",display:"flex",alignItems:"center",gap:4}}><CheckCircle size={12}/>Hired: {job.workerName}</p>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:800,color:T.brown,fontFamily:"Georgia,serif"}}>₹{((job.wage||0)*(job.duration||0)).toLocaleString()}</div>
                  <div style={{fontSize:11,color:T.brownLt}}>total cost</div>
                </div>
              </div>

              {/* ── Map toggle ── */}
              {job.lat && job.lng && (
                <>
                  <button onClick={()=>setExpandedMap(showMap?null:jid)}
                    style={{marginTop:12,display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:T.goldDk,background:"none",border:"none",cursor:"pointer",padding:0}}>
                    <MapPin size={12}/> {showMap?"Hide Map":"Show Location Map"}
                  </button>
                  {showMap && <MapEmbed lat={job.lat} lng={job.lng} height={200}/>}
                </>
              )}

              <div style={{display:"flex",gap:8,marginTop:16,paddingTop:16,borderTop:`1px solid ${T.border}`,flexWrap:"wrap"}}>
                {job.status!=="closed"&&job.status!=="completed" && (
                  <button onClick={()=>setEditJob({...job})}
                    style={{padding:"8px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:"rgba(212,168,83,0.1)",color:T.goldDk,border:"1px solid rgba(212,168,83,0.25)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <Edit3 size={12}/> Edit
                  </button>
                )}
                {reqs.length>0 && (
                  <button onClick={()=>onNav("requests")}
                    style={{padding:"8px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:"rgba(29,78,216,0.08)",color:"#1d4ed8",border:"1px solid rgba(29,78,216,0.2)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <Users size={12}/> {reqs.length} Request{reqs.length!==1?"s":""}
                  </button>
                )}
                {(job.status==="assigned"||job.status==="active") && (
                  <button onClick={()=>setCompleteJobModal(job)}
                    style={{padding:"8px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:T.successBg,color:T.success,border:"1px solid rgba(21,128,61,0.25)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <CheckCircle size={12}/> Mark Complete
                  </button>
                )}
                {job.status==="open" && (
                  <button onClick={()=>onUpdateStatus(jid,"closed")}
                    style={{padding:"8px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:T.errorBg,color:T.error,border:"1px solid rgba(185,28,28,0.2)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    <XCircle size={12}/> Close
                  </button>
                )}
                {job.status==="closed" && (
                  <>
                    <button onClick={()=>onUpdateStatus(jid,"open")}
                      style={{padding:"8px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:T.successBg,color:T.success,border:"1px solid rgba(21,128,61,0.25)",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                      <RefreshCw size={12}/> Reopen
                    </button>
                    <button onClick={()=>onDelete(jid)}
                      style={{padding:"8px 14px",borderRadius:12,fontSize:12,fontWeight:600,background:T.errorBg,color:T.error,border:"1px solid rgba(185,28,28,0.2)",cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
                      <X size={12}/> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════
function RequestsSection({requests,onAction}:{requests:any[];onAction:(jobId:string,reqId:string,action:string)=>Promise<void>}) {
  const [filter, setFilter] = useState("all");
  const [acting, setActing] = useState<string|null>(null);
  const filtered = filter==="all"?requests:requests.filter(r=>r.status===filter);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {["all","pending","accepted","rejected"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"9px 18px",borderRadius:12,fontSize:12,fontWeight:600,textTransform:"capitalize",background:filter===f?T.brown:T.bgCard,color:filter===f?T.cream:T.brownMd,border:`1.5px solid ${filter===f?T.brown:T.border}`,cursor:"pointer"}}>
            {f==="all"?"All Requests":f}
            <span style={{marginLeft:6,fontSize:11,padding:"1px 6px",borderRadius:10,background:filter===f?"rgba(255,255,255,0.15)":"rgba(212,168,83,0.1)",color:filter===f?T.cream:T.goldDk}}>
              {f==="all"?requests.length:requests.filter(r=>r.status===f).length}
            </span>
          </button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {filtered.map((req:any)=>{
          const sc = reqStatusCfg[req.status]||reqStatusCfg.pending;
          return (
            <div key={String(req.id)} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:20,padding:20}}>
              <div style={{display:"flex",gap:16,alignItems:"start"}}>
                {req.profilePhoto
                  ? <img src={req.profilePhoto} style={{width:56,height:56,borderRadius:16,objectFit:"cover",flexShrink:0}} alt="w"/>
                  : <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${T.gold},${T.goldDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:T.brown,flexShrink:0}}>{(req.workerName||"W")[0]}</div>
                }
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:12}}>
                    <div>
                      <h3 style={{fontWeight:700,fontSize:15,color:T.brown,margin:0}}>{req.workerName}</h3>
                      <p style={{fontSize:12,color:T.brownLt,margin:"2px 0"}}>{req.skill||"Worker"} · {req.experience||0} yrs exp</p>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,padding:"4px 12px",borderRadius:20,background:sc.bg,color:sc.color,flexShrink:0}}>{sc.label}</span>
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:11,color:T.brownLt,marginTop:8,flexWrap:"wrap"}}>
                    <span>📍 {req.location||"N/A"}</span>
                    <span>📱 {req.phone}</span>
                    <span>✅ {req.completedJobs||0} jobs done</span>
                    {req.rating>0 && <span>⭐ {req.rating}</span>}
                  </div>
                  <div style={{marginTop:8,fontSize:11,padding:"4px 10px",borderRadius:8,background:T.bgPage,color:T.brownMd,border:`1px solid ${T.border}`,display:"inline-block"}}>
                    For: <strong>{req.jobTitle}</strong>
                  </div>
                  {req.status==="pending" && (
                    <div style={{display:"flex",gap:10,marginTop:14}}>
                      <button onClick={async()=>{setActing(String(req.id)+"-accepted");await onAction(String(req.jobId),String(req.id),"accepted");setActing(null);}}
                        disabled={!!acting}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:12,fontSize:12,fontWeight:600,background:T.successBg,color:T.success,border:"1px solid rgba(21,128,61,0.3)",cursor:"pointer"}}>
                        {acting===String(req.id)+"-accepted"?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<CheckCircle size={13}/>} Accept
                      </button>
                      <button onClick={async()=>{setActing(String(req.id)+"-rejected");await onAction(String(req.jobId),String(req.id),"rejected");setActing(null);}}
                        disabled={!!acting}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:12,fontSize:12,fontWeight:600,background:T.errorBg,color:T.error,border:"1px solid rgba(185,28,28,0.3)",cursor:"pointer"}}>
                        {acting===String(req.id)+"-rejected"?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<XCircle size={13}/>} Decline
                      </button>
                    </div>
                  )}
                  {req.status==="accepted" && (
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:10,background:T.successBg,color:T.success}}>
                      <CheckCircle size={12}/> Worker Accepted
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:"60px 0",color:T.brownLt}}>
            <Users size={40} style={{opacity:.3,marginBottom:12}}/>
            <p style={{fontWeight:600,margin:0}}>No {filter} requests</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIRED WORKERS
// ═══════════════════════════════════════════════════════════════════════════════
function HiredSection({hired,onPay,onComplete}:{hired:any[];onPay:(id:string,amt:number)=>Promise<void>;onComplete:(id:string,d:any)=>Promise<void>}) {
  const [filter, setFilter] = useState("all");
  const [payModal, setPayModal] = useState<any>(null);
  const [rateModal, setRateModal] = useState<any>(null);
  const [payAmt, setPayAmt] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [acting, setActing] = useState(false);

  const filtered = filter==="all"?hired:hired.filter((h:any)=>h.paymentStatus===filter);
  const totalOwed = hired.reduce((s:number,h:any)=>s+(h.wage*h.duration-h.amountPaid),0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {payModal && (
        <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.bgCard,borderRadius:24,padding:28,width:"100%",maxWidth:380}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{fontWeight:700,fontSize:18,color:T.brown,fontFamily:"Georgia,serif",margin:0}}>Record Payment</h3>
              <button onClick={()=>setPayModal(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={T.brownLt}/></button>
            </div>
            <div style={{padding:14,borderRadius:14,background:T.bgPage,marginBottom:16}}>
              <p style={{fontSize:13,fontWeight:600,color:T.brown,margin:"0 0 4px"}}>{payModal.workerName}</p>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.brownLt}}>
                <span>Total: <strong style={{color:T.brown}}>₹{payModal.wage*payModal.duration}</strong></span>
                <span>Paid: <strong style={{color:T.success}}>₹{payModal.amountPaid}</strong></span>
                <span>Due: <strong style={{color:T.error}}>₹{payModal.wage*payModal.duration-payModal.amountPaid}</strong></span>
              </div>
            </div>
            <FLabel>Amount to Pay (₹)</FLabel>
            <div style={{position:"relative",marginBottom:12}}>
              <IndianRupee size={13} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.brownLt}}/>
              <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)}
                placeholder={`Max ₹${payModal.wage*payModal.duration-payModal.amountPaid}`}
                style={{...Inp,paddingLeft:34}} onFocus={focusG} onBlur={blurB}/>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {["Full","Half"].map(opt=>(
                <button key={opt} onClick={()=>setPayAmt(opt==="Full"?String(payModal.wage*payModal.duration-payModal.amountPaid):String(Math.floor((payModal.wage*payModal.duration-payModal.amountPaid)/2)))}
                  style={{flex:1,padding:"8px",borderRadius:10,fontSize:12,fontWeight:600,background:"rgba(212,168,83,0.1)",color:T.goldDk,border:"1px solid rgba(212,168,83,0.2)",cursor:"pointer"}}>
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={async()=>{setActing(true);await onPay(payModal.id,parseInt(payAmt));setActing(false);setPayModal(null);setPayAmt("");}}
              disabled={!payAmt||parseInt(payAmt)<=0||acting}
              style={{width:"100%",padding:"13px",borderRadius:12,fontSize:13,fontWeight:700,background:T.brown,color:T.cream,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {acting?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<CreditCard size={14}/>} Confirm Payment
            </button>
          </div>
        </div>
      )}

      {rateModal && (
        <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.bgCard,borderRadius:24,padding:28,width:"100%",maxWidth:420}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{fontWeight:700,fontSize:18,color:T.brown,fontFamily:"Georgia,serif",margin:0}}>Rate {rateModal.workerName}</h3>
              <button onClick={()=>setRateModal(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={20} color={T.brownLt}/></button>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12}}>
              {[1,2,3,4,5].map(s=>(
                <button key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setRating(s)} style={{background:"none",border:"none",cursor:"pointer"}}>
                  <Star size={36} fill={(hover||rating)>=s?T.gold:"none"} color={T.gold}/>
                </button>
              ))}
            </div>
            <p style={{textAlign:"center",fontSize:13,color:T.brownLt,marginBottom:14}}>{rating===0?"Tap to rate":["","Poor","Fair","Good","Very Good","Excellent!"][rating]}</p>
            <textarea rows={3} value={review} onChange={e=>setReview(e.target.value)} placeholder="Write a review..."
              style={{...Inp,resize:"none",marginBottom:14}} onFocus={focusG} onBlur={blurB}/>
            <button onClick={async()=>{setActing(true);await onComplete(rateModal.id,{rating,review});setActing(false);setRateModal(null);setRating(0);setReview("");}}
              disabled={rating===0||acting}
              style={{width:"100%",padding:"13px",borderRadius:12,fontSize:13,fontWeight:700,background:rating>0?T.brown:T.border,color:rating>0?T.cream:T.brownLt,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {acting?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<Star size={14}/>} Submit Rating
            </button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <StatCard icon={<UserCheck size={18}/>}    label="Total Hired" value={hired.length} iconBg="rgba(21,128,61,0.1)"/>
        <StatCard icon={<Wallet size={18}/>}        label="Total Paid"  value={`₹${hired.reduce((s:number,h:any)=>s+h.amountPaid,0).toLocaleString()}`}/>
        <StatCard icon={<AlertTriangle size={18}/>} label="Amount Due"  value={`₹${totalOwed.toLocaleString()}`} iconBg="rgba(185,28,28,0.1)"/>
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {["all","paid","pending","partial","overdue"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:"9px 18px",borderRadius:12,fontSize:12,fontWeight:600,textTransform:"capitalize",background:filter===f?T.brown:T.bgCard,color:filter===f?T.cream:T.brownMd,border:`1.5px solid ${filter===f?T.brown:T.border}`,cursor:"pointer"}}>
            {f==="all"?"All Workers":f}
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {filtered.map((hw:any)=>{
          const ps = payStatusCfg[hw.paymentStatus]||payStatusCfg.pending;
          const total = hw.wage*hw.duration;
          const pct = Math.min(100,Math.round((hw.amountPaid/total)*100));
          return (
            <div key={String(hw.id)} style={{background:T.bgCard,border:`1.5px solid ${hw.paymentStatus==="overdue"?"rgba(185,28,28,0.3)":T.border}`,borderRadius:20,padding:20}}>
              <div style={{display:"flex",gap:16,alignItems:"start"}}>
                <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${T.gold},${T.goldDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:T.brown,flexShrink:0}}>{(hw.workerName||"W")[0]}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:12}}>
                    <div>
                      <h3 style={{fontWeight:700,fontSize:15,color:T.brown,margin:0}}>{hw.workerName}</h3>
                      <p style={{fontSize:12,color:T.brownLt,margin:"2px 0"}}>{hw.skill} · 📱 {hw.phone}</p>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"end",gap:4}}>
                      <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:ps.bg,color:ps.color}}>{ps.label}</span>
                      {(hw.status==="active"||hw.status==="assigned") && <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:10,background:"rgba(21,128,61,0.1)",color:T.success}}>Active</span>}
                    </div>
                  </div>
                  <p style={{fontSize:12,fontWeight:600,color:T.brownMd,margin:"4px 0"}}>{hw.jobTitle}</p>
                  <div style={{display:"flex",gap:14,fontSize:11,color:T.brownLt,marginBottom:12,flexWrap:"wrap"}}>
                    <span>📅 {hw.startDate} → {hw.endDate||"ongoing"}</span>
                    <span>⏱ {hw.duration}d</span>
                    <span>💰 ₹{hw.wage}/day</span>
                  </div>
                  <div style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{color:T.brownLt}}>Paid: <strong style={{color:T.success}}>₹{hw.amountPaid.toLocaleString()}</strong></span>
                      <span style={{color:T.brownLt}}>Total: <strong style={{color:T.brown}}>₹{total.toLocaleString()}</strong></span>
                    </div>
                    <div style={{height:6,borderRadius:10,background:T.border}}>
                      <div style={{height:6,borderRadius:10,background:pct===100?`linear-gradient(90deg,#16a34a,#15803d)`:`linear-gradient(90deg,${T.gold},${T.goldDk})`,width:`${pct}%`,transition:"width .5s"}}/>
                    </div>
                    <p style={{fontSize:11,color:T.brownLt,marginTop:3}}>{pct}% paid</p>
                  </div>
                  {hw.review && (
                    <div style={{fontSize:12,fontStyle:"italic",padding:"8px 12px",borderRadius:10,background:T.bgPage,color:T.brownMd,border:`1px solid ${T.border}`,marginBottom:12}}>
                      "{hw.review}" {hw.rating && <span style={{color:T.goldDk}}>{"★".repeat(hw.rating)}</span>}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {hw.paymentStatus!=="paid" && (
                      <button onClick={()=>setPayModal(hw)}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:12,fontSize:12,fontWeight:600,background:T.brown,color:T.cream,border:"none",cursor:"pointer"}}>
                        <CreditCard size={13}/> {hw.paymentStatus==="partial"?"Pay Remaining":"Pay Now"}
                      </button>
                    )}
                    {!hw.rating && hw.status==="completed" && (
                      <button onClick={()=>setRateModal(hw)}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:12,fontSize:12,fontWeight:600,background:"rgba(212,168,83,0.1)",color:T.goldDk,border:"1px solid rgba(212,168,83,0.25)",cursor:"pointer"}}>
                        <Star size={13}/> Rate Worker
                      </button>
                    )}
                    {hw.paymentStatus==="paid"&&hw.rating && (
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:12,fontSize:12,fontWeight:600,background:T.successBg,color:T.success}}>
                        <CheckCircle size={13}/> Completed & Rated
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:"60px 0",color:T.brownLt}}>
            <UserCheck size={40} style={{opacity:.3,marginBottom:12}}/>
            <p style={{fontWeight:600,margin:0}}>No hired workers {filter!=="all"?`with ${filter} payment`:""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLAINT
// ═══════════════════════════════════════════════════════════════════════════════
function ComplaintSection({onSubmit}:{onSubmit:(d:any)=>Promise<void>}) {
  const [form, setForm] = useState({type:"",workerName:"",description:"",voiceTranscription:false});
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice input not supported in this browser. Please use Chrome."); return; }
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => setRecording(true);
    recognition.onend   = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setForm(f=>({...f,description:f.description?f.description+" "+transcript:transcript,voiceTranscription:true}));
    };
    recognition.start();
  };

  if(done) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 0"}}>
      <CheckCircle size={56} color={T.success} style={{marginBottom:16}}/>
      <h2 style={{fontSize:24,fontWeight:800,color:T.brown,fontFamily:"Georgia,serif",margin:"0 0 8px"}}>Complaint Submitted</h2>
      <p style={{fontSize:13,color:T.brownLt,textAlign:"center",maxWidth:360}}>Sent to KaamSetu admin. We'll review and respond within 24 hours.</p>
      <button onClick={()=>{setForm({type:"",workerName:"",description:"",voiceTranscription:false});setDone(false);}}
        style={{marginTop:24,padding:"11px 28px",borderRadius:14,fontSize:13,fontWeight:700,background:T.brown,color:T.cream,border:"none",cursor:"pointer"}}>
        Submit Another
      </button>
    </div>
  );

  return (
    <div style={{maxWidth:560,display:"flex",flexDirection:"column",gap:20}}>
      <div style={{padding:16,borderRadius:16,background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)"}}>
        <p style={{fontSize:13,color:T.brownMd,margin:0}}>Your complaint goes directly to KaamSetu admins and will be resolved within <strong>24 hours</strong>.</p>
      </div>
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:20,padding:24,display:"flex",flexDirection:"column",gap:18}}>
        <div><FLabel>Complaint Type *</FLabel>
          <select style={Inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} onFocus={focusG} onBlur={blurB}>
            <option value="">Select category</option>
            <option>Worker No-Show</option><option>Poor Quality Work</option><option>Worker Misconduct</option>
            <option>Fake Profile / Fraud</option><option>Payment Dispute</option><option>Platform Issue</option><option>Other</option>
          </select>
        </div>
        <div><FLabel>Worker Name (if applicable)</FLabel>
          <input style={Inp} value={form.workerName} onChange={e=>setForm(f=>({...f,workerName:e.target.value}))} placeholder="Worker's name" onFocus={focusG} onBlur={blurB}/>
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <FLabel>Description *</FLabel>
            <button onClick={handleVoice}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:11,fontWeight:600,background:recording?"#fde8e8":"rgba(212,168,83,0.1)",color:recording?T.error:T.goldDk,border:`1px solid ${recording?"#fca5a5":"rgba(212,168,83,0.25)"}`,cursor:"pointer"}}>
              <Mic size={11}/>
              {recording ? "🔴 Listening... (tap to stop)" : "🎤 Voice Input"}
            </button>
          </div>
          <textarea style={{...Inp,resize:"none"}} rows={5} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Describe the issue in detail..." onFocus={focusG} onBlur={blurB}/>
          {form.voiceTranscription && <p style={{fontSize:11,color:T.success,marginTop:4}}>✓ Voice input added</p>}
        </div>
        <button onClick={async()=>{if(!form.type||!form.description)return;setSending(true);await onSubmit(form);setSending(false);setDone(true);}}
          disabled={sending||!form.type||!form.description}
          style={{padding:"14px",borderRadius:14,fontSize:14,fontWeight:700,background:form.type&&form.description?T.brown:T.border,color:form.type&&form.description?T.cream:T.brownLt,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {sending?<><Loader2 size={15} style={{animation:"spin 1s linear infinite"}}/>Sending...</>:<><Send size={15}/>Send to Admin</>}
        </button>
      </div>
    </div>
  );
}

declare global { interface Window { google:any; SpeechRecognition:any; webkitSpeechRecognition:any; } }