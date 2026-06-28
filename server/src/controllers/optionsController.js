const asyncHandler  = require("../utils/asyncHandler");
const ApiResponse   = require("../utils/ApiResponse");
const ApiError      = require("../utils/ApiError");
const { getOptionChain, getLTPsForPositions } = require("../services/optionService");
const OptionTrade   = require("../models/OptionTrade");
const User          = require("../models/User");
const cacheService  = require("../services/cacheService");

const LOT_SIZES = { NIFTY: 25, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75, default: 25 };

// ── GET /api/options/chain/:symbol ────────────────────────
const getChain = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `optchain:${symbol}`;
  let data = cacheService.get(cacheKey);
  if (!data) {
    data = await getOptionChain(symbol);
    cacheService.set(cacheKey, data, 10);
  }
  res.json(new ApiResponse(200, data, "Option chain fetched"));
});

// ── POST /api/options/trade ───────────────────────────────
const placeTrade = asyncHandler(async (req, res) => {
  const {
    underlying, expiry, strikePrice, optionType,
    action, quantity, premium,
    orderType = "MARKET", limitPrice, product = "NRML",
  } = req.body;

  if (!underlying || !expiry || !strikePrice || !optionType || !action || !quantity || premium == null) {
    throw new ApiError(400, "Please fill in all trade details before submitting.");
  }
  if (!["CE", "PE"].includes(optionType)) throw new ApiError(400, "Option type must be CE (Call) or PE (Put).");
  if (!["BUY", "SELL"].includes(action)) throw new ApiError(400, "Action must be BUY or SELL.");
  if (!["MARKET", "LIMIT", "SL"].includes(orderType)) throw new ApiError(400, "Order type must be MARKET, LIMIT, or SL.");
  if ((orderType === "LIMIT" || orderType === "SL") && (!limitPrice || parseFloat(limitPrice) <= 0)) {
    throw new ApiError(400, orderType === "LIMIT"
      ? "Please enter a valid limit price for your LIMIT order."
      : "Please enter a valid trigger price for your Stop-Loss order.");
  }

  const lotSize = LOT_SIZES[underlying.toUpperCase()] || LOT_SIZES.default;
  const lots = parseInt(quantity);
  if (lots < 1) throw new ApiError(400, "You must trade at least 1 lot.");
  const totalContracts = lots * lotSize;
  const executionPrice = parseFloat(premium);
  const totalPremium = parseFloat((executionPrice * totalContracts).toFixed(2));
  const brokerage = 20;
  const user = await User.findById(req.user._id);

  // ── PENDING orders (LIMIT / SL) ─────────────────────────
  if (orderType === "LIMIT" || orderType === "SL") {
    const pendingPrice = parseFloat(limitPrice);
    const pendingTotal = parseFloat((pendingPrice * totalContracts).toFixed(2));

    if (action === "BUY" && user.fnoBalance < pendingTotal + brokerage) {
      throw new ApiError(400,
        `Not enough F&O balance. You need ~₹${(pendingTotal + brokerage).toLocaleString("en-IN")} but have ₹${user.fnoBalance.toLocaleString("en-IN")}. Try fewer lots.`);
    }

    const trade = await OptionTrade.create({
      userId: req.user._id, underlying: underlying.toUpperCase(), expiry,
      strikePrice: parseFloat(strikePrice), optionType, action, quantity: lots,
      lotSize, totalContracts, premium: pendingPrice,
      totalPremium: pendingTotal, charges: brokerage,
      netAmount: action === "BUY" ? pendingTotal + brokerage : -(pendingTotal - brokerage),
      orderType, limitPrice: pendingPrice, product, status: "PENDING",
    });

    return res.status(201).json(new ApiResponse(201, { trade, newFnoBalance: user.fnoBalance },
      `${orderType} order placed — will execute when price reaches ₹${pendingPrice.toFixed(2)}.`));
  }

  // ── MARKET orders — execute immediately ─────────────────
  if (action === "BUY") {
    if (user.fnoBalance < totalPremium + brokerage) {
      throw new ApiError(400,
        `Not enough F&O balance to buy. Need ₹${(totalPremium + brokerage).toLocaleString("en-IN")}, have ₹${user.fnoBalance.toLocaleString("en-IN")}. Try fewer lots.`);
    }
    user.fnoBalance = parseFloat((user.fnoBalance - totalPremium - brokerage).toFixed(2));
  } else {
    user.fnoBalance = parseFloat((user.fnoBalance + totalPremium - brokerage).toFixed(2));
  }

  const trade = await OptionTrade.create({
    userId: req.user._id, underlying: underlying.toUpperCase(), expiry,
    strikePrice: parseFloat(strikePrice), optionType, action, quantity: lots,
    lotSize, totalContracts, premium: executionPrice, totalPremium,
    charges: brokerage, netAmount: action === "BUY" ? totalPremium + brokerage : -(totalPremium - brokerage),
    orderType: "MARKET", product, status: "OPEN", executedAt: new Date(),
  });
  await user.save();

  res.status(201).json(new ApiResponse(201, {
    trade, newBalance: user.virtualBalance, newFnoBalance: user.fnoBalance,
  }, `Order executed: ${action} ${lots} lot${lots > 1 ? "s" : ""} of ${underlying} ${strikePrice} ${optionType} at ₹${executionPrice.toFixed(2)}`));
});

// ── GET /api/options/positions ────────────────────────────
const getPositions = asyncHandler(async (req, res) => {
  const positions = await OptionTrade.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, positions, "Positions fetched"));
});

// ── GET /api/options/positions/live ───────────────────────
const getPositionsWithLTP = asyncHandler(async (req, res) => {
  const positions = await OptionTrade.find({ userId: req.user._id }).sort({ createdAt: -1 });
  const openPositions = positions.filter((p) => p.status === "OPEN");
  let ltpMap = {};
  if (openPositions.length > 0) {
    try { ltpMap = await getLTPsForPositions(openPositions); } catch { /* ok */ }
  }

  const enriched = positions.map((pos) => {
    const p = pos.toObject();
    if (p.status === "OPEN") {
      const key = `${p.underlying}_${p.strikePrice}_${p.optionType}`;
      const ltp = ltpMap[key];
      p.currentLTP = ltp ?? null;
      if (ltp != null) {
        p.unrealizedPnL = p.action === "BUY"
          ? parseFloat(((ltp - p.premium) * p.totalContracts).toFixed(2))
          : parseFloat(((p.premium - ltp) * p.totalContracts).toFixed(2));
        p.unrealizedPnLPercent = p.totalPremium !== 0
          ? parseFloat(((p.unrealizedPnL / p.totalPremium) * 100).toFixed(2)) : 0;
      } else { p.unrealizedPnL = null; p.unrealizedPnLPercent = null; }
    }
    return p;
  });
  res.json(new ApiResponse(200, enriched, "Positions with live data"));
});

// ── GET /api/options/orders ──────────────────────────────
const getOrders = asyncHandler(async (req, res) => {
  const orders = await OptionTrade.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, orders, "Orders fetched"));
});

// ── PATCH /api/options/cancel/:id ────────────────────────
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await OptionTrade.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) throw new ApiError(404, "Order not found. It may have already been executed or deleted.");
  if (order.status !== "PENDING") {
    throw new ApiError(400,
      order.status === "OPEN" ? "This order has already been executed. Close the position instead."
      : order.status === "CANCELLED" ? "This order was already cancelled."
      : `Cannot cancel an order with status "${order.status}".`);
  }
  order.status = "CANCELLED";
  order.cancelledAt = new Date();
  await order.save();
  res.json(new ApiResponse(200, { order },
    `${order.orderType} order cancelled: ${order.action} ${order.underlying} ${order.strikePrice} ${order.optionType}`));
});

// ── PATCH /api/options/close/:id ─────────────────────────
const closeTrade = asyncHandler(async (req, res) => {
  const { closePrice } = req.body;
  if (closePrice == null || parseFloat(closePrice) < 0) {
    throw new ApiError(400, "Please enter a valid exit price (must be 0 or greater).");
  }
  const trade = await OptionTrade.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trade) throw new ApiError(404, "Position not found. It may have already been closed.");
  if (trade.status !== "OPEN") {
    throw new ApiError(400,
      trade.status === "CLOSED" ? "This position is already closed."
      : trade.status === "PENDING" ? "This is a pending order — cancel it instead."
      : `Cannot close a position with status "${trade.status}".`);
  }

  const cp = parseFloat(closePrice);
  const contracts = trade.totalContracts;
  const closePremium = parseFloat((cp * contracts).toFixed(2));
  const brokerage = 20;
  const grossPnL = trade.action === "BUY"
    ? parseFloat(((cp - trade.premium) * contracts).toFixed(2))
    : parseFloat(((trade.premium - cp) * contracts).toFixed(2));
  const netPnL = parseFloat((grossPnL - brokerage * 2).toFixed(2));

  const user = await User.findById(req.user._id);
  if (trade.action === "BUY") {
    user.fnoBalance = parseFloat((user.fnoBalance + closePremium - brokerage).toFixed(2));
  } else {
    user.fnoBalance = parseFloat((user.fnoBalance - closePremium - brokerage).toFixed(2));
  }

  trade.status = "CLOSED";
  trade.closePrice = cp;
  trade.realizedPnL = netPnL;
  await trade.save();
  await user.save();

  res.json(new ApiResponse(200, { trade, netPnL, newBalance: user.virtualBalance, newFnoBalance: user.fnoBalance },
    netPnL >= 0 ? `Position closed with profit of ₹${netPnL.toLocaleString("en-IN")}!`
    : `Position closed with loss of ₹${Math.abs(netPnL).toLocaleString("en-IN")}.`));
});

module.exports = { getChain, placeTrade, getPositions, getPositionsWithLTP, getOrders, cancelOrder, closeTrade };