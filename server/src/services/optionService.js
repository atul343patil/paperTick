const axios = require("axios");
const { getAccessToken } = require("./upstoxAuthService");
const cacheService = require("./cacheService");

const UPSTOX_BASE = "https://api.upstox.com/v2";

// ── Upstox API helper ─────────────────────────────────────
const upstoxGet = async (path, params = {}) => {
  const token = getAccessToken();
  const { data } = await axios.get(`${UPSTOX_BASE}${path}`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    timeout: 10000,
  });
  return data;
};

// ── Map underlying symbol to Upstox instrument_key ────────
const UNDERLYING_MAP = {
  NIFTY:      "NSE_INDEX|Nifty 50",
  BANKNIFTY:  "NSE_INDEX|Nifty Bank",
  FINNIFTY:   "NSE_INDEX|Nifty Fin Service",
  MIDCPNIFTY: "NSE_INDEX|NIFTY MID SELECT",
  SENSEX:     "BSE_INDEX|SENSEX",
};

const resolveUnderlying = (symbol) => {
  const upper = symbol.toUpperCase();
  return UNDERLYING_MAP[upper] || `NSE_INDEX|${symbol}`;
};

// ── Format date as DD-MMM-YYYY (e.g. "27-Jun-2024") ──────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const formatDateDDMMMYYYY = (d) => {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTHS[d.getMonth()];
  const yr  = d.getFullYear();
  return `${day}-${mon}-${yr}`;
};

// ── Generate next 4 Thursday expiries ─────────────────────
const generateExpiries = () => {
  const expiries = [];
  const d = new Date();

  for (let week = 0; week < 4; week++) {
    const next = new Date(d);
    const daysToThursday = (4 - d.getDay() + 7) % 7 || 7;
    next.setDate(d.getDate() + daysToThursday + (week * 7));
    expiries.push(formatDateDDMMMYYYY(next));
  }
  return expiries;
};

// ── Tag strikes with ATM / ITM / OTM ─────────────────────
const tagStrikes = (strikes, underlyingValue) => {
  let atmStrike = strikes[0]?.strikePrice;
  let minDiff   = Infinity;
  strikes.forEach((s) => {
    const diff = Math.abs(s.strikePrice - underlyingValue);
    if (diff < minDiff) {
      minDiff   = diff;
      atmStrike = s.strikePrice;
    }
  });

  const taggedStrikes = strikes.map((s) => ({
    ...s,
    isATM: s.strikePrice === atmStrike,
    ceMoneyness: s.strikePrice < underlyingValue ? "ITM"
               : s.strikePrice === atmStrike      ? "ATM"
               : "OTM",
    peMoneyness: s.strikePrice > underlyingValue ? "ITM"
               : s.strikePrice === atmStrike      ? "ATM"
               : "OTM",
  }));

  return { taggedStrikes, atmStrike };
};

// ── Fetch option chain from Upstox ────────────────────────
const getOptionChain = async (symbol = "NIFTY", expiry = null) => {
  const instrumentKey = resolveUnderlying(symbol);

  try {
    // Step 1: If no expiry provided, get available expiries first
    if (!expiry) {
      expiry = await getNextExpiry(instrumentKey);
    }

    // Step 2: Fetch put/call option chain
    const data = await upstoxGet("/option/chain", {
      instrument_key: instrumentKey,
      expiry_date: expiry,
    });

    if (data.status !== "success" || !data.data || !data.data.length) {
      console.warn(`[optionService] No option chain data for ${symbol}. Using simulated.`);
      return simulateOptionChain(symbol);
    }

    return parseUpstoxOptionChain(data.data, symbol, expiry);
  } catch (err) {
    console.warn(`[optionService] Option chain fetch failed: ${err.message}. Using simulated data.`);
    return simulateOptionChain(symbol);
  }
};

// ── Get nearest expiry date ───────────────────────────────
const getNextExpiry = async (instrumentKey) => {
  // Check cache
  const cached = cacheService.get(`expiry:${instrumentKey}`);
  if (cached) return cached;

  try {
    const data = await upstoxGet("/option/contract", {
      instrument_key: instrumentKey,
    });

    if (data.status === "success" && data.data && data.data.length > 0) {
      // Extract unique expiry dates and sort
      const expiries = [...new Set(data.data.map((c) => c.expiry))].sort();
      // Find nearest future expiry
      const today = new Date().toISOString().split("T")[0];
      const nearest = expiries.find((e) => e >= today) || expiries[0];

      cacheService.set(`expiry:${instrumentKey}`, nearest, 3600); // 1 hour cache
      return nearest;
    }
  } catch (err) {
    console.warn("[optionService] Could not fetch expiries:", err.message);
  }

  // Fallback: next Thursday ISO format for API call
  const d = new Date();
  const day = d.getDay();
  const daysToThursday = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysToThursday);
  return d.toISOString().split("T")[0];
};

// ── Parse Upstox option chain into our format ─────────────
const parseUpstoxOptionChain = (chainData, symbol, expiry) => {
  // Get underlying value from the first entry
  const underlyingValue = chainData[0]?.underlying_spot_price || 0;

  // Collect unique expiry dates and format them
  const rawExpiries = [...new Set(chainData.map((d) => d.expiry))].sort();
  const expiryDates = rawExpiries.map((e) => {
    try {
      const d = new Date(e);
      return isNaN(d.getTime()) ? e : formatDateDDMMMYYYY(d);
    } catch { return e; }
  });

  // Group by strike price
  const strikeMap = new Map();

  // Build a lookup from raw expiry → formatted expiry for strike tagging
  const rawToFormatted = {};
  rawExpiries.forEach((raw, i) => { rawToFormatted[raw] = expiryDates[i]; });

  for (const item of chainData) {
    const strike = item.strike_price;
    if (!strikeMap.has(strike)) {
      // Use formatted expiry (DD-MMM-YYYY) so it matches selectedExpiry in the frontend
      const formattedExpiry = rawToFormatted[item.expiry] || item.expiry;
      strikeMap.set(strike, { strikePrice: strike, expiryDate: formattedExpiry, CE: null, PE: null });
    }

    const entry = strikeMap.get(strike);

    if (item.call_options && item.call_options.market_data) {
      const cm = item.call_options.market_data;
      const cg = item.call_options.option_greeks || {};
      entry.CE = {
        lastPrice:            cm.ltp || 0,
        impliedVolatility:    cg.iv || 0,
        openInterest:         cm.oi || 0,
        changeinOpenInterest: cm.oi_day_change || 0,
        totalTradedVolume:    cm.volume || 0,
        change:               cm.net_change || 0,
        pChange:              cm.ltp && cm.prev_close
                                ? parseFloat(((cm.net_change / cm.prev_close) * 100).toFixed(2))
                                : 0,
        bidQty:               cm.bid_qty || 0,
        bidprice:             cm.bid_price || 0,
        askQty:               cm.ask_qty || 0,
        askPrice:             cm.ask_price || 0,
        delta:                cg.delta || null,
        gamma:                cg.gamma || null,
        theta:                cg.theta || null,
        vega:                 cg.vega || null,
      };
    }

    if (item.put_options && item.put_options.market_data) {
      const pm = item.put_options.market_data;
      const pg = item.put_options.option_greeks || {};
      entry.PE = {
        lastPrice:            pm.ltp || 0,
        impliedVolatility:    pg.iv || 0,
        openInterest:         pm.oi || 0,
        changeinOpenInterest: pm.oi_day_change || 0,
        totalTradedVolume:    pm.volume || 0,
        change:               pm.net_change || 0,
        pChange:              pm.ltp && pm.prev_close
                                ? parseFloat(((pm.net_change / pm.prev_close) * 100).toFixed(2))
                                : 0,
        bidQty:               pm.bid_qty || 0,
        bidprice:             pm.bid_price || 0,
        askQty:               pm.ask_qty || 0,
        askPrice:             pm.ask_price || 0,
        delta:                pg.delta || null,
        gamma:                pg.gamma || null,
        theta:                pg.theta || null,
        vega:                 pg.vega || null,
      };
    }
  }

  const strikes = [...strikeMap.values()].sort((a, b) => a.strikePrice - b.strikePrice);

  // Tag with ATM / ITM / OTM
  const { taggedStrikes, atmStrike } = tagStrikes(strikes, underlyingValue);

  return { symbol, underlyingValue, expiryDates, strikes: taggedStrikes, atmStrike };
};

// ── Simulated data (fallback when Upstox fails) ───────────
const simulateOptionChain = (symbol) => {
  const basePrice = symbol === "NIFTY" ? 22500 : symbol === "BANKNIFTY" ? 48000 : 5000;
  const step      = symbol === "NIFTY" ? 50    : symbol === "BANKNIFTY" ? 100   : 20;
  const strikesAboveBelow = 10;

  const atm = Math.round(basePrice / step) * step;
  const strikes = [];

  const expiries = generateExpiries();
  const nearestExpiry = expiries[0];

  for (let i = -strikesAboveBelow; i <= strikesAboveBelow; i++) {
    const strike = atm + i * step;
    const moneyness = basePrice - strike;

    const ceIV = Math.max(8, 20 - Math.abs(moneyness) * 0.01 + Math.random() * 3);
    const peIV = Math.max(8, 20 - Math.abs(moneyness) * 0.01 + Math.random() * 3);

    const cePremium = Math.max(0.05, moneyness > 0
      ? moneyness + ceIV * Math.sqrt(30 / 365) * strike * 0.01
      : ceIV * Math.sqrt(30 / 365) * strike * 0.01
    );
    const pePremium = Math.max(0.05, moneyness < 0
      ? -moneyness + peIV * Math.sqrt(30 / 365) * strike * 0.01
      : peIV * Math.sqrt(30 / 365) * strike * 0.01
    );

    // Realistic pChange: ATM options have smaller % change, OTM can swing more
    const cePChange = parseFloat(((Math.random() * 10 - 5) * (1 + Math.abs(i) * 0.3)).toFixed(2));
    const pePChange = parseFloat(((Math.random() * 10 - 5) * (1 + Math.abs(i) * 0.3)).toFixed(2));

    strikes.push({
      strikePrice: strike,
      expiryDate: nearestExpiry,
      CE: {
        lastPrice:            +cePremium.toFixed(2),
        impliedVolatility:    +ceIV.toFixed(2),
        openInterest:         Math.floor(Math.random() * 50000 + 10000),
        changeinOpenInterest: Math.floor((Math.random() - 0.5) * 10000),
        totalTradedVolume:    Math.floor(Math.random() * 20000 + 5000),
        change:               +(Math.random() * 20 - 10).toFixed(2),
        pChange:              cePChange,
        bidQty: 75, bidprice: +(cePremium - 0.5).toFixed(2),
        askQty: 75, askPrice: +(cePremium + 0.5).toFixed(2),
        delta: +(0.5 + (moneyness / (strike * 0.1))).toFixed(2),
        gamma: +(0.002 + Math.random() * 0.001).toFixed(4),
        theta: +(-cePremium * 0.02).toFixed(2),
        vega:  +(ceIV * 0.1).toFixed(2),
      },
      PE: {
        lastPrice:            +pePremium.toFixed(2),
        impliedVolatility:    +peIV.toFixed(2),
        openInterest:         Math.floor(Math.random() * 50000 + 10000),
        changeinOpenInterest: Math.floor((Math.random() - 0.5) * 10000),
        totalTradedVolume:    Math.floor(Math.random() * 20000 + 5000),
        change:               +(Math.random() * 20 - 10).toFixed(2),
        pChange:              pePChange,
        bidQty: 75, bidprice: +(pePremium - 0.5).toFixed(2),
        askQty: 75, askPrice: +(pePremium + 0.5).toFixed(2),
        delta: -(+(0.5 - (moneyness / (strike * 0.1))).toFixed(2)),
        gamma: +(0.002 + Math.random() * 0.001).toFixed(4),
        theta: +(-pePremium * 0.02).toFixed(2),
        vega:  +(peIV * 0.1).toFixed(2),
      },
    });
  }

  // Tag with ATM / ITM / OTM
  const { taggedStrikes, atmStrike } = tagStrikes(strikes, basePrice);

  return { symbol, underlyingValue: basePrice, expiryDates: expiries, strikes: taggedStrikes, atmStrike };
};

module.exports = { getOptionChain, getLTPForContract, getLTPsForPositions };

// ── Get current LTP for a specific option contract ────────
async function getLTPForContract(underlying, strikePrice, optionType) {
  try {
    const chain = await getOptionChain(underlying);
    if (!chain || !chain.strikes) return null;
    const strike = chain.strikes.find((s) => s.strikePrice === strikePrice);
    if (!strike) return null;
    const side = optionType === "CE" ? strike.CE : strike.PE;
    return side?.lastPrice ?? null;
  } catch { return null; }
}

// ── Batch-fetch LTPs for multiple positions ───────────────
async function getLTPsForPositions(positions) {
  const ltpMap = {};
  const byUnderlying = {};
  for (const pos of positions) {
    if (!byUnderlying[pos.underlying]) byUnderlying[pos.underlying] = [];
    byUnderlying[pos.underlying].push(pos);
  }
  for (const [underlying, posGroup] of Object.entries(byUnderlying)) {
    try {
      const chain = await getOptionChain(underlying);
      if (!chain || !chain.strikes) continue;
      for (const pos of posGroup) {
        const strike = chain.strikes.find((s) => s.strikePrice === pos.strikePrice);
        if (!strike) continue;
        const side = pos.optionType === "CE" ? strike.CE : strike.PE;
        const key = `${pos.underlying}_${pos.strikePrice}_${pos.optionType}`;
        ltpMap[key] = side?.lastPrice ?? null;
      }
    } catch { /* skip */ }
  }
  return ltpMap;
}