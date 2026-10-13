import api from "./api";

export const getOrders = (params = {}) =>
  api.get("/orders", { params }).then((r) => r.data);

export const createOrder = (data) =>
  api.post("/orders", data).then((r) => r.data);

export const updateOrderStatus = (id, orderStatus) =>
  api.put(`/orders/${id}/status`, { orderStatus }).then((r) => r.data);

export const trackOrder = (orderNumber) =>
  api.get(`/orders/track/${orderNumber}`).then((r) => r.data);