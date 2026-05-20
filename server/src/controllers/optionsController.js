const asyncHandler  = require("../utils/asyncHandler");
const ApiResponse   = require("../utils/ApiResponse");
const ApiError      = require("../utils/ApiError");
const { getOptionChain } = require("../services/optionService");
const OptionTrade   = require("../models/OptionTrade");
const User          = require("../models/User");
const cacheService  = require("../services/cacheService");

const LOT_SIZES = {
  NIFTY:     50,
  BANKNIFTY: 15,
  FINNIFTY:  40,
  MIDCPNIFTY: 75,
  default:   100,
};

// ── GET /api/options/chain/:symbol ────────────────────────
const getChain = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const cacheKey = `optchain:${symbol}`;

  let data = cacheService.get(cacheKey);
  if (!data) {
    data = await getOptionChain(symbol);
    cacheService.set(cacheKey, data, 60); // 1-min cache
  }

  res.json(new ApiResponse(200, data, "Option chain fetched"));
});

// ── POST /api/options/trade ───────────────────────────────
const placeTrade = asyncHandler(async (req, res) => {
  const {
    underlying, expiry, strikePrice, optionType,
    action, quantity, premium,
  } = req.body;

  if (!underlying || !expiry || !strikePrice || !optionType || !action || !quantity || !premium) {
    throw new ApiError(400, "All fields are required.");
  }
  if (!["CE", "PE"].includes(optionType)) throw new ApiError(400, "optionType must be CE or PE.");
  if (!["BUY", "SELL"].includes(action))  throw new ApiError(400, "action must be BUY or SELL.");

  const lotSize = LOT_SIZES[underlying.toUpperCase()] || LOT_SIZES.default;
  const lots    = parseInt(quantity);
  const totalContracts = lots * lotSize;
  const totalPremium   = parseFloat((premium * totalContracts).toFixed(2));

  // Flat ₹20 per executed order for options
  const charges  = 20;
  const netAmount = action === "BUY"
    ? parseFloat((totalPremium + charges).toFixed(2))
    : parseFloat((totalPremium - charges).toFixed(2));

  const user = await User.findById(req.user._id);

  if (action === "BUY" && user.virtualBalance < netAmount) {
    throw new ApiError(
      400,
      `Insufficient balance. Required ₹${netAmount.toLocaleString("en-IN")}, available ₹${user.virtualBalance.toLocaleString("en-IN")}.`
    );
  }

  const trade = await OptionTrade.create({
    userId: req.user._id,
    underlying: underlying.toUpperCase(),
    expiry,
    strikePrice: parseFloat(strikePrice),
    optionType,
    action,
    quantity: lots,
    lotSize,
    totalContracts,
    premium: parseFloat(premium),
    totalPremium,
    charges,
    netAmount,
    status: "OPEN",
  });

  // Deduct/credit balance
  if (action === "BUY") {
    user.virtualBalance = parseFloat((user.virtualBalance - netAmount).toFixed(2));
  } else {
    user.virtualBalance = parseFloat((user.virtualBalance + netAmount).toFixed(2));
  }
  await user.save();

  res.status(201).json(
    new ApiResponse(201, { trade, newBalance: user.virtualBalance }, "Option trade placed")
  );
});

// ── GET /api/options/positions ────────────────────────────
const getPositions = asyncHandler(async (req, res) => {
  const positions = await OptionTrade.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, positions, "Positions fetched"));
});

// ── PATCH /api/options/close/:id ─────────────────────────
const closeTrade = asyncHandler(async (req, res) => {
  const { closePrice } = req.body;
  if (!closePrice || closePrice <= 0) throw new ApiError(400, "closePrice is required.");

  const trade = await OptionTrade.findOne({ _id: req.params.id, userId: req.user._id });
  if (!trade) throw new ApiError(404, "Position not found.");
  if (trade.status !== "OPEN") throw new ApiError(400, "Position is already closed.");

  const pnlPerUnit = trade.action === "BUY"
    ? closePrice - trade.premium
    : trade.premium - closePrice;

  const grossPnL = parseFloat((pnlPerUnit * trade.totalContracts).toFixed(2));
  const netPnL   = parseFloat((grossPnL - trade.charges * 2).toFixed(2));

  trade.status     = "CLOSED";
  trade.closePrice = parseFloat(closePrice);
  trade.realizedPnL = netPnL;
  await trade.save();

  // Return premium to balance on close
  const user = await User.findById(req.user._id);
  const closeAmount = trade.action === "BUY"
    ? parseFloat((closePrice * trade.totalContracts - trade.charges).toFixed(2))
    : parseFloat((trade.totalPremium - closePrice * trade.totalContracts - trade.charges).toFixed(2));

  user.virtualBalance = parseFloat((user.virtualBalance + closeAmount).toFixed(2));
  await user.save();

  res.json(new ApiResponse(200, { trade, netPnL, newBalance: user.virtualBalance }, "Position closed"));
});

module.exports = { getChain, placeTrade, getPositions, closeTrade };