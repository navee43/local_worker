export type UserRole = "worker" | "employer" | "admin";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  profileCompleted?: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface SignupPayload {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  otp: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}