const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const marketService = require("../services/marketService");
const cacheService = require("../services/cacheService");

// GET /api/market/quote/:symbol
const getQuote = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `quote:${symbol}`;

  let data = cacheService.get(cacheKey);
  if (!data) {
    data = await marketService.getQuote(symbol);
    cacheService.set(cacheKey, data, 60); // 15-second cache
  }

  res.json(new ApiResponse(200, data, "Quote fetched"));
});

// GET /api/market/chart/:symbol?interval=1d&range=3mo
const getChart = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const { interval = "1d", range = "3mo" } = req.query;

  const validIntervals = ["1d", "1wk", "1mo"];
  const validRanges    = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"];

  if (!validIntervals.includes(interval)) {
    throw new ApiError(400, `Invalid interval. Use: ${validIntervals.join(", ")}`);
  }
  if (!validRanges.includes(range)) {
    throw new ApiError(400, `Invalid range. Use: ${validRanges.join(", ")}`);
  }

  const cacheKey = `chart:${symbol}:${interval}:${range}`;
  // Chart data cached longer since historical data doesn't change
  const ttl = interval === "1d" ? 300 : 120;

  let data = cacheService.get(cacheKey);
  if (!data) {
    data = await marketService.getChartData(symbol, interval, range);
    cacheService.set(cacheKey, data, ttl);
  }

  res.json(new ApiResponse(200, data, "Chart data fetched"));
});

// GET /api/market/search?q=reliance
const searchSymbols = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters.");
  }

  const cacheKey = `search:${q.toLowerCase()}`;
  let data = cacheService.get(cacheKey);
  if (!data) {
    data = await marketService.searchSymbols(q.trim());
    cacheService.set(cacheKey, data, 60); // search results cached 1 min
  }

  res.json(new ApiResponse(200, data, "Search results fetched"));
});

// GET /api/market/indices
const getIndices = asyncHandler(async (req, res) => {
  const cacheKey = "indices";
  let data = cacheService.get(cacheKey);
  if (!data) {
    data = await marketService.getIndices();
    cacheService.set(cacheKey, data, 60);
  }

  res.json(new ApiResponse(200, data, "Indices fetched"));
});

// GET /api/market/batch?symbols=TCS.NS,INFY.NS
const getBatchQuotes = asyncHandler(async (req, res) => {
  const { symbols } = req.query;
  if (!symbols) throw new ApiError(400, "symbols query param is required.");

  const symbolList = symbols.split(",").map((s) => s.trim()).slice(0, 20);
  const data = await marketService.getBatchQuotes(symbolList);

  res.json(new ApiResponse(200, data, "Batch quotes fetched"));
});

module.exports = { getQuote, getChart, searchSymbols, getIndices, getBatchQuotes };