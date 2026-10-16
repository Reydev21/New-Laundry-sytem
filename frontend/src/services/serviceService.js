import api from "./api";
import { reauthHeaders } from "./actionReauth";

export const getServices = () => api.get("/services").then((r) => r.data);
export const createService = (data, reauthToken) =>
  api.post("/services", data, reauthHeaders(reauthToken)).then((r) => r.data);
export const updateService = (id, data, reauthToken) =>
  api.put(`/services/${id}`, data, reauthHeaders(reauthToken)).then((r) => r.data);
export const deleteService = (id, reauthToken) =>
  api.delete(`/services/${id}`, reauthHeaders(reauthToken)).then((r) => r.data);
