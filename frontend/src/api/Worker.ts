import API from "./axios";

// Profile
export const fetchWorkerProfile = () => API.get("/worker/profile");
export const saveWorkerProfile  = (data: Record<string, any>) => API.put("/worker/profile", data);
export const runAadhaarOcr      = (image: string) => API.post("/worker/aadhaar-ocr", { image });

// Jobs
export const fetchWorkerJobs    = () => API.get("/worker/jobs");
export const fetchAvailableJobs = () => API.get("/worker/available-jobs");
export const applyToJob         = (jobId: string) => API.post(`/worker/apply/${jobId}`);

// Rewards
export const redeemVoucher      = (voucherId: string) => API.post("/worker/redeem-voucher", { voucherId });

// Complaints
export const submitComplaint    = (data: Record<string, any>) => API.post("/worker/complaint", data);
export const fetchComplaints    = () => API.get("/worker/complaints");