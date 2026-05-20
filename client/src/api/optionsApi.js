import axiosInstance from "./axiosInstance";

export const fetchOptionChain = (symbol) =>
  axiosInstance.get(`/options/chain/${symbol}`).then((r) => r.data.data);

export const placeOptionTrade = (payload) =>
  axiosInstance.post("/options/trade", payload).then((r) => r.data);

export const fetchPositions = () =>
  axiosInstance.get("/options/positions").then((r) => r.data.data);

export const closeTrade = (id, closePrice) =>
  axiosInstance.patch(`/options/close/${id}`, { closePrice }).then((r) => r.data);