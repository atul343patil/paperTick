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

  // Fallback: next Thursday
  return getNextThursday();
};

// ── Parse Upstox option chain into our format ─────────────
const parseUpstoxOptionChain = (chainData, symbol, expiry) => {
  // Get underlying value from the first entry
  const underlyingValue = chainData[0]?.underlying_spot_price || 0;

  // Collect unique expiry dates
  const expiryDates = [...new Set(chainData.map((d) => d.expiry))].sort();

  // Group by strike price
  const strikeMap = new Map();

  for (const item of chainData) {
    const strike = item.strike_price;
    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, { strikePrice: strike, expiryDate: item.expiry, CE: null, PE: null });
    }

    const entry = strikeMap.get(strike);
    const marketData = item.market_data || {};
    const optionGreeks = item.option_greeks || {};

    const optionData = {
      lastPrice:            marketData.ltp || 0,
      impliedVolatility:    optionGreeks.vega ? (optionGreeks.iv || 0) : 0,
      openInterest:         marketData.oi || 0,
      changeinOpenInterest: marketData.oi_day_change || 0,
      totalTradedVolume:    marketData.volume || 0,
      change:               marketData.net_change || 0,
      pChange:              marketData.ltp && marketData.prev_close
                              ? parseFloat(((marketData.net_change / marketData.prev_close) * 100).toFixed(2))
                              : 0,
      bidQty:               marketData.bid_qty || 0,
      bidprice:             marketData.bid_price || 0,
      askQty:               marketData.ask_qty || 0,
      askPrice:             marketData.ask_price || 0,
      delta:                optionGreeks.delta || null,
      gamma:                optionGreeks.gamma || null,
      theta:                optionGreeks.theta || null,
      vega:                 optionGreeks.vega || null,
    };

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

  return { symbol, underlyingValue, expiryDates, strikes };
};

// ── Simulated data (fallback when Upstox fails) ───────────
const simulateOptionChain = (symbol) => {
  const basePrice = symbol === "NIFTY" ? 22500 : symbol === "BANKNIFTY" ? 48000 : 5000;
  const step      = symbol === "NIFTY" ? 50    : symbol === "BANKNIFTY" ? 100   : 20;
  const strikesAboveBelow = 10;

  const atm = Math.round(basePrice / step) * step;
  const strikes = [];

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

    strikes.push({
      strikePrice: strike,
      expiryDate: getNextThursday(),
      CE: {
        lastPrice:            +cePremium.toFixed(2),
        impliedVolatility:    +ceIV.toFixed(2),
        openInterest:         Math.floor(Math.random() * 50000 + 10000),
        changeinOpenInterest: Math.floor((Math.random() - 0.5) * 10000),
        totalTradedVolume:    Math.floor(Math.random() * 20000 + 5000),
        change:               +(Math.random() * 20 - 10).toFixed(2),
        pChange:              +(Math.random() * 10 - 5).toFixed(2),
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
        pChange:              +(Math.random() * 10 - 5).toFixed(2),
        bidQty: 75, bidprice: +(pePremium - 0.5).toFixed(2),
        askQty: 75, askPrice: +(pePremium + 0.5).toFixed(2),
        delta: -(+(0.5 - (moneyness / (strike * 0.1))).toFixed(2)),
        gamma: +(0.002 + Math.random() * 0.001).toFixed(4),
        theta: +(-pePremium * 0.02).toFixed(2),
        vega:  +(peIV * 0.1).toFixed(2),
      },
    });
  }

  const expiries = [getNextThursday(), getMonthlyExpiry()];
  return { symbol, underlyingValue: basePrice, expiryDates: expiries, strikes };
};

const getNextThursday = () => {
  const d = new Date();
  const day = d.getDay();
  const daysToThursday = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysToThursday);
  return d.toISOString().split("T")[0];
};

const getMonthlyExpiry = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

module.exports = { getOptionChain };