import api from "./api";

export const getDashboardStats = () =>
  api.get("/reports/dashboard").then((r) => r.data);

export const getSalesReport = (range = "daily") =>
  api.get(`/reports/sales?range=${range}`).then((r) => r.data);

export const getMostUsedServices = () =>
  api.get("/reports/services").then((r) => r.data);