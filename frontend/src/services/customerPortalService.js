import api, { setCsrfToken } from "./api";

const persistUserProfile = (data) => {
  const { csrfToken, token, ...profile } = data;
  localStorage.setItem("user", JSON.stringify(profile));
  if (csrfToken) setCsrfToken(csrfToken);
};

export const registerCustomer = async (data) => {
  const res = await api.post("/customer/register", data);
  return res.data;
};

export const verifyCustomerOtp = async (tempToken, otpCode) => {
  const res = await api.post("/customer/verify-otp", { tempToken, otpCode });
  if (res.data?._id) {
    persistUserProfile(res.data);
  }
  return res.data;
};

export const googleAuthCustomer = async (googleUser) => {
  const res = await api.post("/customer/google-auth", googleUser);
  if (res.data?._id) {
    persistUserProfile(res.data);
  }
  return res.data;
};

export const completeGoogleSignup = async (setupToken, password) => {
  const res = await api.post("/customer/google-complete", { setupToken, password });
  if (res.data?._id) {
    persistUserProfile(res.data);
  }
  return res.data;
};

export const createCustomerOrder = async (orderData) => {
  const res = await api.post("/customer/orders", orderData);
  return res.data;
};

export const getMyCustomerOrders = async () => {
  const res = await api.get("/customer/orders");
  return res.data;
};
