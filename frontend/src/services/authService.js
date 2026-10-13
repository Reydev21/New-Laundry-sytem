import api, { setCsrfToken } from "./api";

const persistUserProfile = (data) => {
  const { csrfToken, token, ...profile } = data;
  localStorage.setItem("user", JSON.stringify(profile));
  if (csrfToken) setCsrfToken(csrfToken);
};

export const login = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  if (!data.requiresOtp && data._id) {
    persistUserProfile(data);
  }
  return data;
};

export const verifyOtp = async (tempToken, otpCode) => {
  const { data } = await api.post("/auth/verify-otp", { tempToken, otpCode });
  if (data._id) {
    persistUserProfile(data);
  }
  return data;
};

export const resendOtp = async (tempToken) => {
  const { data } = await api.post("/auth/resend-otp", { tempToken });
  return data;
};

export const requestPasswordReset = async (email) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
};

export const verifyPasswordResetOtp = async (email, otpCode) => {
  const { data } = await api.post("/auth/verify-reset-otp", { email, otpCode });
  return data;
};

export const resetPassword = async (resetToken, newPassword) => {
  const { data } = await api.post("/auth/reset-password", { resetToken, newPassword });
  return data;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Clear client state even when the session has already expired.
  } finally {
    localStorage.removeItem("user");
    setCsrfToken(null);
  }
};

export const getCurrentUser = () =>
  JSON.parse(localStorage.getItem("user") || "null");