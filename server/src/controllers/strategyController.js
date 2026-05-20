const asyncHandler  = require("../utils/asyncHandler");
const ApiResponse   = require("../utils/ApiResponse");
const ApiError      = require("../utils/ApiError");
const { analyzeStrategy, analyzeCustomStrategy, STRATEGIES } = require("../services/strategyService");

// GET /api/strategies/list
const listStrategies = asyncHandler(async (req, res) => {
  const strategies = [
    {
      id: "longStraddle",
      name: "Long Straddle",
      category: "Volatility",
      direction: "Neutral",
      description: "Buy ATM CE + ATM PE. Profit from large moves in either direction.",
      maxProfit: "Unlimited",
      maxLoss: "Limited (net premium paid)",
      legs: 2,
    },
    {
      id: "shortStraddle",
      name: "Short Straddle",
      category: "Volatility",
      direction: "Neutral",
      description: "Sell ATM CE + ATM PE. Profit if price stays near strike.",
      maxProfit: "Limited (net premium received)",
      maxLoss: "Unlimited",
      legs: 2,
    },
    {
      id: "longStrangle",
      name: "Long Strangle",
      category: "Volatility",
      direction: "Neutral",
      description: "Buy OTM CE + OTM PE. Cheaper than straddle, needs bigger move.",
      maxProfit: "Unlimited",
      maxLoss: "Limited (net premium paid)",
      legs: 2,
    },
    {
      id: "shortStrangle",
      name: "Short Strangle",
      category: "Volatility",
      direction: "Neutral",
      description: "Sell OTM CE + OTM PE. Wider profit zone than short straddle.",
      maxProfit: "Limited (net premium received)",
      maxLoss: "Unlimited",
      legs: 2,
    },
    {
      id: "bullCallSpread",
      name: "Bull Call Spread",
      category: "Directional",
      direction: "Bullish",
      description: "Buy ATM CE + Sell OTM CE. Defined risk bullish play.",
      maxProfit: "Limited",
      maxLoss: "Limited (net debit)",
      legs: 2,
    },
    {
      id: "bearPutSpread",
      name: "Bear Put Spread",
      category: "Directional",
      direction: "Bearish",
      description: "Buy ATM PE + Sell OTM PE. Defined risk bearish play.",
      maxProfit: "Limited",
      maxLoss: "Limited (net debit)",
      legs: 2,
    },
    {
      id: "ironCondor",
      name: "Iron Condor",
      category: "Income",
      direction: "Neutral",
      description: "Sell OTM CE + Buy wing CE + Sell OTM PE + Buy wing PE. Range-bound income strategy.",
      maxProfit: "Limited (net premium received)",
      maxLoss: "Limited",
      legs: 4,
    },
    {
      id: "bullPutSpread",
      name: "Bull Put Spread",
      category: "Income",
      direction: "Bullish",
      description: "Sell ATM PE + Buy OTM PE. Credit strategy with bullish bias.",
      maxProfit: "Limited (net credit)",
      maxLoss: "Limited",
      legs: 2,
    },
    {
      id: "bearCallSpread",
      name: "Bear Call Spread",
      category: "Income",
      direction: "Bearish",
      description: "Sell ATM CE + Buy OTM CE. Credit strategy with bearish bias.",
      maxProfit: "Limited (net credit)",
      maxLoss: "Limited",
      legs: 2,
    },
  ];

  res.json(new ApiResponse(200, strategies, "Strategies fetched"));
});

// POST /api/strategies/analyze
const analyzeStrategyRoute = asyncHandler(async (req, res) => {
  const { strategyId, params, underlyingPrice } = req.body;

  if (!strategyId || !params || !underlyingPrice) {
    throw new ApiError(400, "strategyId, params, and underlyingPrice are required.");
  }
  if (underlyingPrice <= 0) {
    throw new ApiError(400, "underlyingPrice must be positive.");
  }

  const result = analyzeStrategy(strategyId, params, parseFloat(underlyingPrice));
  res.json(new ApiResponse(200, result, "Strategy analyzed"));
});

// POST /api/strategies/custom
const analyzeCustom = asyncHandler(async (req, res) => {
  const { legs, underlyingPrice } = req.body;

  if (!legs || !Array.isArray(legs) || legs.length === 0) {
    throw new ApiError(400, "legs array is required.");
  }
  if (!underlyingPrice || underlyingPrice <= 0) {
    throw new ApiError(400, "underlyingPrice is required.");
  }
  if (legs.length > 8) {
    throw new ApiError(400, "Maximum 8 legs per strategy.");
  }

  // Validate each leg
  legs.forEach((leg, i) => {
    if (!leg.optionType || !["CE", "PE"].includes(leg.optionType)) {
      throw new ApiError(400, `Leg ${i + 1}: optionType must be CE or PE.`);
    }
    if (!leg.action || !["BUY", "SELL"].includes(leg.action)) {
      throw new ApiError(400, `Leg ${i + 1}: action must be BUY or SELL.`);
    }
    if (!leg.strike || leg.strike <= 0) {
      throw new ApiError(400, `Leg ${i + 1}: strike must be positive.`);
    }
    if (!leg.premium || leg.premium < 0) {
      throw new ApiError(400, `Leg ${i + 1}: premium must be non-negative.`);
    }
  });

  const result = analyzeCustomStrategy(legs, parseFloat(underlyingPrice));
  res.json(new ApiResponse(200, result, "Custom strategy analyzed"));
});

module.exports = { listStrategies, analyzeStrategyRoute, analyzeCustom };