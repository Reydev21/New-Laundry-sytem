import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
});

let cachedCsrfToken = localStorage.getItem("csrfToken") || null;

try {
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  if (storedUser?.token) {
    delete storedUser.token;
    localStorage.setItem("user", JSON.stringify(storedUser));
  }
} catch {
  localStorage.removeItem("user");
}

export const setCsrfToken = (token) => {
  cachedCsrfToken = token;
  if (token) {
    localStorage.setItem("csrfToken", token);
  } else {
    localStorage.removeItem("csrfToken");
  }
};

export const fetchCsrfToken = async () => {
  try {
    const res = await api.get("/auth/csrf-token");
    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
      return res.data.csrfToken;
    }
  } catch (err) {
    console.error("Failed to fetch CSRF token:", err);
  }
  return null;
};

const isPublicAuthEndpoint = (url = "") => {
  const publicAuthPaths = [
    "/auth/forgot-password",
    "/auth/verify-reset-otp",
    "/auth/reset-password",
  ];
  return publicAuthPaths.some((path) => url.includes(path));
};

api.interceptors.request.use(async (config) => {
  // Attach X-CSRF-Token for state-changing HTTP requests, excluding public reset flow endpoints.
  if (["post", "put", "delete", "patch"].includes(config.method?.toLowerCase()) && !isPublicAuthEndpoint(config.url || "")) {
    if (!cachedCsrfToken) {
      await fetchCsrfToken();
    }
    if (cachedCsrfToken) {
      config.headers["X-CSRF-Token"] = cachedCsrfToken;
    }
  }

  return config;
});

// Automatic session timeout / invalid token handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (isPublicAuthEndpoint(err.config?.url || "")) return Promise.reject(err);
      const user = JSON.parse(localStorage.getItem("user") || "null");
      localStorage.removeItem("user");
      localStorage.removeItem("csrfToken");
      cachedCsrfToken = null;
      const loginPath = user?.role === "customer" ? "/customer/login?expired=true" : "/admin/login?expired=true";
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(err);
  }
);

export default api;