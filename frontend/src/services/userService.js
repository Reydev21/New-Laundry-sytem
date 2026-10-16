import api from "./api";
import { reauthHeaders } from "./actionReauth";

export const getUsers = () => api.get("/users").then((r) => r.data);
export const getInviteCode = () => api.get("/users/invite-code").then((r) => r.data);
export const createUser = (data, reauthToken) =>
  api.post("/users", data, reauthHeaders(reauthToken)).then((r) => r.data);
export const updateUser = (id, data, reauthToken) =>
  api.put(`/users/${id}`, data, reauthHeaders(reauthToken)).then((r) => r.data);
export const deleteUser = (id, reauthToken) =>
  api.delete(`/users/${id}`, reauthHeaders(reauthToken)).then((r) => r.data);
