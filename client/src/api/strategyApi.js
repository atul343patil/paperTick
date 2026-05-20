import axiosInstance from "./axiosInstance";

export const fetchStrategyList = () =>
  axiosInstance.get("/strategies/list").then((r) => r.data.data);

export const analyzeStrategy = (payload) =>
  axiosInstance.post("/strategies/analyze", payload).then((r) => r.data.data);

export const analyzeCustomStrategy = (payload) =>
  axiosInstance.post("/strategies/custom", payload).then((r) => r.data.data);