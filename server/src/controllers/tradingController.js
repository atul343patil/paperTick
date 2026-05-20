const asyncHandler   = require("../utils/asyncHandler");
const ApiResponse    = require("../utils/ApiResponse");
const ApiError       = require("../utils/ApiError");
const Order          = require("../models/Order");
const Portfolio      = require("../models/Portfolio");
const User           = require("../models/User");
const { calculateCharges, calculateNetPnL } = require("../services/brokerageService");
const marketService  = require("../services/marketService");

// ─────────────────────────────────────────────────────────────
// POST /api/trading/order
// ─────────────────────────────────────────────────────────────
const placeOrder = asyncHandler(async (req, res) => {
  const {
    symbol, name, exchange = "NSE",
    side, productType = "DELIVERY",
    orderType = "MARKET", quantity, limitPrice,
  } = req.body;

  if (!symbol || !name || !side || !quantity) {
    throw new ApiError(400, "symbol, name, side, and quantity are required.");
  }
  if (!["BUY", "SELL"].includes(side)) throw new ApiError(400, "side must be BUY or SELL.");
  if (quantity < 1 || !Number.isInteger(Number(quantity))) {
    throw new ApiError(400, "Quantity must be a positive integer.");
  }
  if (orderType === "LIMIT" && !limitPrice) {
    throw new ApiError(400, "limitPrice is required for LIMIT orders.");
  }

  // ── Get live price ──────────────────────────────────────
  let executedPrice;
  try {
    const quote = await marketService.getQuote(symbol);
    executedPrice = orderType === "LIMIT"
      ? parseFloat(limitPrice)
      : quote.regularMarketPrice;
  } catch {
    throw new ApiError(502, "Could not fetch live price. Try again.");
  }

  if (!executedPrice || executedPrice <= 0) {
    throw new ApiError(400, "Invalid execution price.");
  }

  const qty = parseInt(quantity);
  const totalValue = parseFloat((executedPrice * qty).toFixed(2));
  const charges = calculateCharges(executedPrice, qty, side, productType);

  // Amount leaving/entering balance
  const netAmount = side === "BUY"
    ? parseFloat((totalValue + charges.totalCharges).toFixed(2))
    : parseFloat((totalValue - charges.totalCharges).toFixed(2));

  // ── Fetch user and portfolio ────────────────────────────
  const user = await User.findById(req.user._id);
  let portfolio = await Portfolio.findOne({ userId: req.user._id });
  if (!portfolio) portfolio = await Portfolio.create({ userId: req.user._id });

  // ── BUY validations ─────────────────────────────────────
  if (side === "BUY") {
    if (user.virtualBalance < netAmount) {
      throw new ApiError(400, `Insufficient balance. Required ₹${netAmount.toLocaleString("en-IN")}, available ₹${user.virtualBalance.toLocaleString("en-IN")}.`);
    }
  }

  // ── SELL validations ────────────────────────────────────
  if (side === "SELL") {
    const holding = portfolio.holdings.find(
      (h) => h.symbol === symbol.toUpperCase()
    );
    if (!holding || holding.quantity < qty) {
      throw new ApiError(
        400,
        `Insufficient holdings. You have ${holding?.quantity ?? 0} shares of ${symbol}.`
      );
    }
  }

  // ── Execute order (atomic-like, sequential updates) ─────

  // 1. Create order record
  const order = await Order.create({
    userId: req.user._id,
    symbol: symbol.toUpperCase(),
    name,
    exchange,
    side,
    productType,
    orderType,
    quantity: qty,
    limitPrice: orderType === "LIMIT" ? parseFloat(limitPrice) : null,
    executedPrice,
    totalValue,
    charges,
    netAmount,
    status: "EXECUTED",
  });

  // 2. Update balance
  if (side === "BUY") {
    user.virtualBalance = parseFloat((user.virtualBalance - netAmount).toFixed(2));
  } else {
    user.virtualBalance = parseFloat((user.virtualBalance + netAmount).toFixed(2));
  }
  await user.save();

  // 3. Update portfolio holdings
  if (side === "BUY") {
    const existingIdx = portfolio.holdings.findIndex(
      (h) => h.symbol === symbol.toUpperCase()
    );
    if (existingIdx > -1) {
      // Recalculate average buy price
      const existing = portfolio.holdings[existingIdx];
      const newQty = existing.quantity + qty;
      const newInvested = existing.totalInvested + totalValue;
      portfolio.holdings[existingIdx].quantity = newQty;
      portfolio.holdings[existingIdx].totalInvested = parseFloat(newInvested.toFixed(2));
      portfolio.holdings[existingIdx].avgBuyPrice = parseFloat((newInvested / newQty).toFixed(2));
    } else {
      portfolio.holdings.push({
        symbol: symbol.toUpperCase(),
        name,
        exchange,
        quantity: qty,
        avgBuyPrice: executedPrice,
        totalInvested: totalValue,
        realizedPnL: 0,
      });
    }
    portfolio.totalInvested = parseFloat((portfolio.totalInvested + totalValue).toFixed(2));
  } else {
    // SELL — update holding, record realized P&L
    const holdingIdx = portfolio.holdings.findIndex(
      (h) => h.symbol === symbol.toUpperCase()
    );
    const holding = portfolio.holdings[holdingIdx];
    const { netPnL } = calculateNetPnL(
      holding.avgBuyPrice, executedPrice, qty, productType
    );

    holding.realizedPnL = parseFloat((holding.realizedPnL + netPnL).toFixed(2));
    holding.quantity -= qty;
    holding.totalInvested = parseFloat(
      (holding.avgBuyPrice * holding.quantity).toFixed(2)
    );

    portfolio.totalRealizedPnL = parseFloat(
      (portfolio.totalRealizedPnL + netPnL).toFixed(2)
    );

    // Remove holding if fully sold
    if (holding.quantity === 0) {
      portfolio.holdings.splice(holdingIdx, 1);
    }
  }

  portfolio.totalChargesPaid = parseFloat(
    (portfolio.totalChargesPaid + charges.totalCharges).toFixed(2)
  );
  await portfolio.save();

  res.status(201).json(
    new ApiResponse(201, { order, newBalance: user.virtualBalance }, "Order executed successfully")
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/trading/orders
// ─────────────────────────────────────────────────────────────
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, symbol, side } = req.query;
  const filter = { userId: req.user._id };
  if (symbol) filter.symbol = symbol.toUpperCase();
  if (side)   filter.side = side.toUpperCase();

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, {
    orders,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
  }, "Orders fetched"));
});

// ─────────────────────────────────────────────────────────────
// GET /api/portfolio
// ─────────────────────────────────────────────────────────────
const getPortfolio = asyncHandler(async (req, res) => {
  let portfolio = await Portfolio.findOne({ userId: req.user._id });
  if (!portfolio) {
    portfolio = await Portfolio.create({ userId: req.user._id });
  }

  // Enrich with live prices
  let enrichedHoldings = [];
  if (portfolio.holdings.length > 0) {
    const symbols = portfolio.holdings.map((h) => h.symbol);
    const quotes = await marketService.getBatchQuotes(symbols);

    enrichedHoldings = portfolio.holdings.map((holding) => {
      const quote = quotes.find((q) => q.symbol === holding.symbol);
      const currentPrice = quote?.regularMarketPrice || holding.avgBuyPrice;
      const currentValue = parseFloat((currentPrice * holding.quantity).toFixed(2));
      const unrealizedPnL = parseFloat(
        (currentValue - holding.totalInvested).toFixed(2)
      );
      const unrealizedPnLPercent = parseFloat(
        ((unrealizedPnL / holding.totalInvested) * 100).toFixed(2)
      );

      return {
        symbol: holding.symbol,
        name: holding.name,
        exchange: holding.exchange,
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        totalInvested: holding.totalInvested,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        realizedPnL: holding.realizedPnL,
        dayChange: quote?.regularMarketChange || 0,
        dayChangePercent: quote?.regularMarketChangePercent || 0,
      };
    });
  }

  const user = await User.findById(req.user._id);
  const totalCurrentValue = enrichedHoldings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested     = enrichedHoldings.reduce((s, h) => s + h.totalInvested, 0);
  const totalUnrealizedPnL = parseFloat((totalCurrentValue - totalInvested).toFixed(2));

  res.json(new ApiResponse(200, {
    holdings: enrichedHoldings,
    summary: {
      virtualBalance: user.virtualBalance,
      totalInvested: parseFloat(totalInvested.toFixed(2)),
      totalCurrentValue: parseFloat(totalCurrentValue.toFixed(2)),
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent: totalInvested > 0
        ? parseFloat(((totalUnrealizedPnL / totalInvested) * 100).toFixed(2))
        : 0,
      totalRealizedPnL: portfolio.totalRealizedPnL,
      totalChargesPaid: portfolio.totalChargesPaid,
      portfolioValue: parseFloat((user.virtualBalance + totalCurrentValue).toFixed(2)),
    },
  }, "Portfolio fetched"));
});

module.exports = { placeOrder, getOrders, getPortfolio };