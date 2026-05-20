// ── Payoff calculation engine ─────────────────────────────
// All strategies are built from individual option legs.
// Each leg: { optionType, action, strike, premium, lots, lotSize }

const calculateLegPayoff = (leg, spotAtExpiry) => {
  const { optionType, action, strike, premium, lots, lotSize } = leg;
  const contracts = lots * lotSize;
  const multiplier = action === "BUY" ? 1 : -1;

  let intrinsicValue = 0;
  if (optionType === "CE") {
    intrinsicValue = Math.max(0, spotAtExpiry - strike);
  } else {
    intrinsicValue = Math.max(0, strike - spotAtExpiry);
  }

  return multiplier * (intrinsicValue - premium) * contracts;
};

// Generate payoff curve across a range of spot prices
const generatePayoffCurve = (legs, underlyingPrice, steps = 100) => {
  const range   = underlyingPrice * 0.25; // ±25% of spot
  const minSpot = underlyingPrice - range;
  const maxSpot = underlyingPrice + range;
  const step    = (maxSpot - minSpot) / steps;

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const spot   = parseFloat((minSpot + i * step).toFixed(2));
    const payoff = legs.reduce((sum, leg) => sum + calculateLegPayoff(leg, spot), 0);
    points.push({ spot: parseFloat(spot.toFixed(0)), payoff: parseFloat(payoff.toFixed(2)) });
  }
  return points;
};

// Risk/Reward metrics from payoff curve
const calculateMetrics = (payoffCurve, legs) => {
  const payoffs    = payoffCurve.map((p) => p.payoff);
  const maxProfit  = Math.max(...payoffs);
  const maxLoss    = Math.min(...payoffs);
  const breakevens = [];

  // Find breakeven points (sign changes in payoff curve)
  for (let i = 1; i < payoffCurve.length; i++) {
    const prev = payoffCurve[i - 1];
    const curr = payoffCurve[i];
    if ((prev.payoff < 0 && curr.payoff >= 0) || (prev.payoff >= 0 && curr.payoff < 0)) {
      // Linear interpolation for precise breakeven
      const be = prev.spot + (curr.spot - prev.spot) *
        (Math.abs(prev.payoff) / (Math.abs(prev.payoff) + Math.abs(curr.payoff)));
      breakevens.push(parseFloat(be.toFixed(2)));
    }
  }

  // Net premium (positive = credit received, negative = debit paid)
  const netPremium = legs.reduce((sum, leg) => {
    const contracts  = leg.lots * leg.lotSize;
    const multiplier = leg.action === "BUY" ? -1 : 1;
    return sum + multiplier * leg.premium * contracts;
  }, 0);

  const riskReward = maxLoss !== 0
    ? parseFloat(Math.abs(maxProfit / maxLoss).toFixed(2))
    : null;

  return {
    maxProfit:   maxProfit === Infinity  ? "Unlimited" : parseFloat(maxProfit.toFixed(2)),
    maxLoss:     maxLoss   === -Infinity ? "Unlimited" : parseFloat(maxLoss.toFixed(2)),
    breakevens,
    netPremium:  parseFloat(netPremium.toFixed(2)),
    riskReward,
    isDebit:     netPremium < 0,
  };
};

// ── Predefined strategy builders ─────────────────────────
// Each builder receives { atm, step, premium, lotSize, lots }
// and returns an array of legs

const STRATEGIES = {
  longStraddle: ({ atm, ceAtm, peAtm, lotSize, lots }) => ([
    { optionType: "CE", action: "BUY", strike: atm, premium: ceAtm, lots, lotSize },
    { optionType: "PE", action: "BUY", strike: atm, premium: peAtm, lots, lotSize },
  ]),

  shortStraddle: ({ atm, ceAtm, peAtm, lotSize, lots }) => ([
    { optionType: "CE", action: "SELL", strike: atm, premium: ceAtm, lots, lotSize },
    { optionType: "PE", action: "SELL", strike: atm, premium: peAtm, lots, lotSize },
  ]),

  longStrangle: ({ atm, step, ceOtm, peOtm, lotSize, lots }) => ([
    { optionType: "CE", action: "BUY", strike: atm + step, premium: ceOtm, lots, lotSize },
    { optionType: "PE", action: "BUY", strike: atm - step, premium: peOtm, lots, lotSize },
  ]),

  shortStrangle: ({ atm, step, ceOtm, peOtm, lotSize, lots }) => ([
    { optionType: "CE", action: "SELL", strike: atm + step, premium: ceOtm, lots, lotSize },
    { optionType: "PE", action: "SELL", strike: atm - step, premium: peOtm, lots, lotSize },
  ]),

  bullCallSpread: ({ atm, step, ceAtm, ceOtm, lotSize, lots }) => ([
    { optionType: "CE", action: "BUY",  strike: atm,        premium: ceAtm, lots, lotSize },
    { optionType: "CE", action: "SELL", strike: atm + step, premium: ceOtm, lots, lotSize },
  ]),

  bearPutSpread: ({ atm, step, peAtm, peOtm, lotSize, lots }) => ([
    { optionType: "PE", action: "BUY",  strike: atm,        premium: peAtm, lots, lotSize },
    { optionType: "PE", action: "SELL", strike: atm - step, premium: peOtm, lots, lotSize },
  ]),

  ironCondor: ({ atm, step, ceOtm, peOtm, ceWing, peWing, lotSize, lots }) => ([
    { optionType: "CE", action: "SELL", strike: atm + step,     premium: ceOtm,  lots, lotSize },
    { optionType: "CE", action: "BUY",  strike: atm + step * 2, premium: ceWing, lots, lotSize },
    { optionType: "PE", action: "SELL", strike: atm - step,     premium: peOtm,  lots, lotSize },
    { optionType: "PE", action: "BUY",  strike: atm - step * 2, premium: peWing, lots, lotSize },
  ]),

  bullPutSpread: ({ atm, step, peAtm, peOtm, lotSize, lots }) => ([
    { optionType: "PE", action: "SELL", strike: atm,        premium: peAtm, lots, lotSize },
    { optionType: "PE", action: "BUY",  strike: atm - step, premium: peOtm, lots, lotSize },
  ]),

  bearCallSpread: ({ atm, step, ceAtm, ceOtm, lotSize, lots }) => ([
    { optionType: "CE", action: "SELL", strike: atm,        premium: ceAtm, lots, lotSize },
    { optionType: "CE", action: "BUY",  strike: atm + step, premium: ceOtm, lots, lotSize },
  ]),
};

const analyzeStrategy = (strategyName, params, underlyingPrice) => {
  const builder = STRATEGIES[strategyName];
  if (!builder) throw new Error(`Unknown strategy: ${strategyName}`);

  const legs        = builder(params);
  const payoffCurve = generatePayoffCurve(legs, underlyingPrice);
  const metrics     = calculateMetrics(payoffCurve, legs);

  return { legs, payoffCurve, metrics };
};

const analyzeCustomStrategy = (legs, underlyingPrice) => {
  const payoffCurve = generatePayoffCurve(legs, underlyingPrice);
  const metrics     = calculateMetrics(payoffCurve, legs);
  return { legs, payoffCurve, metrics };
};

module.exports = {
  analyzeStrategy,
  analyzeCustomStrategy,
  STRATEGIES: Object.keys(STRATEGIES),
};