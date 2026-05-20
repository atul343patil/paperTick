const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const Watchlist = require("../models/Watchlist");
const marketService = require("../services/marketService");

// GET /api/watchlist — fetch user's watchlist with live prices
const getWatchlist = asyncHandler(async (req, res) => {
  let watchlist = await Watchlist.findOne({ userId: req.user._id });

  // Create default watchlist if user doesn't have one yet
  if (!watchlist) {
    watchlist = await Watchlist.create({ userId: req.user._id });
  }

  // Enrich with live prices
  const symbols = watchlist.stocks.map((s) => s.symbol);
  const quotes = symbols.length > 0
    ? await marketService.getBatchQuotes(symbols)
    : [];

  const enriched = watchlist.stocks.map((stock) => {
    const quote = quotes.find((q) => q.symbol === stock.symbol);
    return {
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      price: quote?.regularMarketPrice || null,
      change: quote?.regularMarketChange || null,
      changePercent: quote?.regularMarketChangePercent || null,
    };
  });

  res.json(new ApiResponse(200, enriched, "Watchlist fetched"));
});

// POST /api/watchlist/add
const addToWatchlist = asyncHandler(async (req, res) => {
  const { symbol, name, exchange } = req.body;
  if (!symbol || !name) {
    throw new ApiError(400, "Symbol and name are required.");
  }

  let watchlist = await Watchlist.findOne({ userId: req.user._id });
  if (!watchlist) {
    watchlist = await Watchlist.create({ userId: req.user._id, stocks: [] });
  }

  const alreadyExists = watchlist.stocks.some(
    (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (alreadyExists) {
    throw new ApiError(409, `${symbol} is already in your watchlist.`);
  }

  if (watchlist.stocks.length >= 30) {
    throw new ApiError(400, "Watchlist cannot exceed 30 stocks.");
  }

  watchlist.stocks.push({ symbol: symbol.toUpperCase(), name, exchange: exchange || "NSE" });
  await watchlist.save();

  res.json(new ApiResponse(201, watchlist.stocks, "Added to watchlist"));
});

// DELETE /api/watchlist/:symbol
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const { symbol } = req.params;

  const watchlist = await Watchlist.findOne({ userId: req.user._id });
  if (!watchlist) throw new ApiError(404, "Watchlist not found.");

  watchlist.stocks = watchlist.stocks.filter(
    (s) => s.symbol.toUpperCase() !== symbol.toUpperCase()
  );
  await watchlist.save();

  res.json(new ApiResponse(200, watchlist.stocks, "Removed from watchlist"));
});

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };