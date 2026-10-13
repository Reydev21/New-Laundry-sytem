import api from "./api";

export const getPayments = (range = "newest") =>
	api.get("/payments", { params: { range } }).then((r) => r.data);

export const confirmPayment = (data) =>
	api.post("/payments", data).then((r) => r.data);