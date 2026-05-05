import API from "./axios";

// Profile
export const fetchEmployerProfile = () => API.get("/employer/profile");
export const saveEmployerProfile  = (data: Record<string, any>) => API.put("/employer/profile", data);

// Jobs
export const postJob              = (data: Record<string, any>) => API.post("/employer/jobs", data);
export const fetchEmployerJobs    = () => API.get("/employer/jobs");
export const updateJob            = (jobId: string, data: Record<string, any>) => API.put(`/employer/jobs/${jobId}`, data);
export const updateJobStatus      = (jobId: string, status: string) => API.patch(`/employer/jobs/${jobId}/status`, { status });
export const deleteJob            = (jobId: string) => API.delete(`/employer/jobs/${jobId}`);
export const completeJob          = (jobId: string, data: Record<string, any>) => API.post(`/employer/jobs/${jobId}/complete`, data);
export const recordPayment        = (jobId: string, amountPaid: number) => API.patch(`/employer/jobs/${jobId}/payment`, { amountPaid });

// Worker Requests
export const fetchRequests        = () => API.get("/employer/requests");
export const handleRequest        = (jobId: string, requestId: string, action: string) =>
  API.patch(`/employer/requests/${jobId}/${requestId}`, { action });

// Hired
export const fetchHired           = () => API.get("/employer/hired");

// Complaint
export const submitEmployerComplaint = (data: Record<string, any>) => API.post("/employer/complaint", data);

// Geo
export const fetchNearbyWorkers   = (lat: number, lng: number, radius?: number) =>
  API.get(`/employer/nearby-workers?lat=${lat}&lng=${lng}&radius=${radius || 10}`);