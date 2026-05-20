import axiosInstance from "./axiosInstance";

export const fetchIndices = () =>
  axiosInstance.get("/market/indices").then((r) => r.data.data);

export const fetchQuote = (symbol) =>
  axiosInstance.get(`/market/quote/${encodeURIComponent(symbol)}`).then((r) => r.data.data);

export const fetchChart = (symbol, interval = "1d", range = "3mo") =>
  axiosInstance
    .get(`/market/chart/${encodeURIComponent(symbol)}`, {
      params: { interval, range },
    })
    .then((r) => r.data.data);

export const searchSymbols = (q) =>
  axiosInstance.get("/market/search", { params: { q } }).then((r) => r.data.data);

export const fetchWatchlist = () =>
  axiosInstance.get("/market/watchlist").then((r) => r.data.data);

export const addToWatchlist = (payload) =>
  axiosInstance.post("/market/watchlist/add", payload).then((r) => r.data.data);

export const removeFromWatchlist = (symbol) =>
  axiosInstance.delete(`/market/watchlist/${symbol}`).then((r) => r.data.data);

export const fetchBatchQuotes = (symbols) =>
  axiosInstance
    .get("/market/batch", { params: { symbols: symbols.join(",") } })
    .then((r) => r.data.data);