import API from "./axios";
import type { SignupPayload, LoginPayload, AuthResponse } from "../types/auth.ts";

export const sendOtp = async (phone: string): Promise<{ message: string; otp?: string }> => {
  const res = await API.post("/auth/send-otp", { phone });
  return res.data;
};

export const signupUser = async (payload: SignupPayload): Promise<AuthResponse> => {
  const res = await API.post("/auth/signup", payload);
  return res.data;
};

export const loginUser = async (payload: LoginPayload): Promise<AuthResponse> => {
  const res = await API.post("/auth/login", payload);
  console.log('res at auth.ts' , res);
  return res.data;
};