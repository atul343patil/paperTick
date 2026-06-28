import axiosInstance from "./axiosInstance";

export const calculateOptionPrice = (payload) =>
  axiosInstance.post("/calculator/price", payload).then((r) => r.data.data);

export const getModelStatus = () =>
  axiosInstance.get("/calculator/model-status").then((r) => r.data.data);

