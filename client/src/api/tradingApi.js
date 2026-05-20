import axiosInstance from "./axiosInstance";

export const placeOrder = (payload) =>
  axiosInstance.post("/trading/order", payload).then((r) => r.data);

export const fetchOrders = (params = {}) =>
  axiosInstance.get("/trading/orders", { params }).then((r) => r.data.data);

export const fetchPortfolio = () =>
  axiosInstance.get("/trading/portfolio").then((r) => r.data.data);