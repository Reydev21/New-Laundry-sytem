import api from "./api";

// Header config for a re-auth-protected request. Omit when no token was issued.
export const reauthHeaders = (token) =>
  token ? { headers: { "X-Action-Reauth": token } } : undefined;

export const requestActionOtp = () =>
  api.post("/auth/action-otp/request").then((r) => r.data);

export const verifyActionOtp = (otpCode) =>
  api.post("/auth/action-otp/verify", { otpCode }).then((r) => r.data);
