const axios = require("axios");
const cacheService = require("./cacheService");
const { getAccessToken } = require("./upstoxAuthService");

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

// ══════════════════════════════════════════════════════════
//  SYMBOL MAPPING: Yahoo-style ↔ Upstox instrument_key
// ══════════════════════════════════════════════════════════

// Hardcoded mappings for indices and popular stocks
const HARDCODED_KEYS = {
  // Indices
  "^NSEI":    "NSE_INDEX|Nifty 50",
  "^NSEBANK": "NSE_INDEX|Nifty Bank",
  "^BSESN":   "BSE_INDEX|SENSEX",

  // Top NSE stocks (ISIN-based instrument keys)
  "RELIANCE.NS":  "NSE_EQ|INE002A01018",
  "TCS.NS":       "NSE_EQ|INE467B01029",
  "INFY.NS":      "NSE_EQ|INE009A01021",
  "HDFCBANK.NS":  "NSE_EQ|INE040A01034",
  "ICICIBANK.NS": "NSE_EQ|INE090A01021",
  "HINDUNILVR.NS":"NSE_EQ|INE030A01027",
  "ITC.NS":       "NSE_EQ|INE154A01025",
  "SBIN.NS":      "NSE_EQ|INE062A01020",
  "BHARTIARTL.NS":"NSE_EQ|INE397D01024",
  "KOTAKBANK.NS": "NSE_EQ|INE237A01028",
  "LT.NS":        "NSE_EQ|INE018A01030",
  "AXISBANK.NS":  "NSE_EQ|INE238A01034",
  "WIPRO.NS":     "NSE_EQ|INE075A01022",
  "HCLTECH.NS":   "NSE_EQ|INE860A01027",
  "BAJFINANCE.NS":"NSE_EQ|INE296A01024",
  "MARUTI.NS":    "NSE_EQ|INE585B01010",
  "SUNPHARMA.NS": "NSE_EQ|INE044A01036",
  "TATAMOTORS.NS":"NSE_EQ|INE155A01022",
  "NTPC.NS":      "NSE_EQ|INE733E01010",
  "POWERGRID.NS": "NSE_EQ|INE752E01010",
  "TATASTEEL.NS": "NSE_EQ|INE081A01020",
  "ONGC.NS":      "NSE_EQ|INE213A01029",
  "ADANIENT.NS":  "NSE_EQ|INE423A01024",
  "ADANIPORTS.NS":"NSE_EQ|INE742F01042",
  "ASIANPAINT.NS":"NSE_EQ|INE021A01026",
  "BAJAJFINSV.NS":"NSE_EQ|INE918I01026",
  "COALINDIA.NS": "NSE_EQ|INE522F01014",
  "DRREDDY.NS":   "NSE_EQ|INE089A01023",
  "EICHERMOT.NS": "NSE_EQ|INE066A01021",
  "GRASIM.NS":    "NSE_EQ|INE047A01021",
  "HEROMOTOCO.NS":"NSE_EQ|INE158A01026",
  "HINDALCO.NS":  "NSE_EQ|INE038A01020",
  "INDUSINDBK.NS":"NSE_EQ|INE095A01012",
  "JSWSTEEL.NS":  "NSE_EQ|INE019A01038",
  "M&M.NS":       "NSE_EQ|INE101A01026",
  "NESTLEIND.NS": "NSE_EQ|INE239A01016",
  "TECHM.NS":     "NSE_EQ|INE669C01036",
  "TITAN.NS":     "NSE_EQ|INE280A01028",
  "ULTRACEMCO.NS":"NSE_EQ|INE481G01011",
  "WIPRO.NS":     "NSE_EQ|INE075A01022",
  "DIVISLAB.NS":  "NSE_EQ|INE361B01024",
  "CIPLA.NS":     "NSE_EQ|INE059A01026",
  "APOLLOHOSP.NS":"NSE_EQ|INE437A01024",
  "BRITANNIA.NS": "NSE_EQ|INE216A01030",
  "HDFCLIFE.NS":  "NSE_EQ|INE795G01014",
  "SBILIFE.NS":   "NSE_EQ|INE123W01016",
  "TATACONSUM.NS":"NSE_EQ|INE192A01025",
  "UPL.NS":       "NSE_EQ|INE628A01036",
  "BPCL.NS":      "NSE_EQ|INE541A01020",
};

// Reverse map: instrument_key → yahoo symbol
const REVERSE_MAP = {};
for (const [yahoo, upstox] of Object.entries(HARDCODED_KEYS)) {
  REVERSE_MAP[upstox] = yahoo;
}

// ── Resolve a yahoo-style symbol to Upstox instrument_key ─
const resolveInstrumentKey = async (symbol) => {
  // Check hardcoded first
  if (HARDCODED_KEYS[symbol]) return HARDCODED_KEYS[symbol];

  // Check cache
  const cached = cacheService.get(`ikey:${symbol}`);
  if (cached) return cached;

  // Search via Upstox Instrument Search API
  try {
    const tradingSymbol = symbol.replace(".NS", "").replace(".BO", "");
    const data = await upstoxGet("/instrument/search", {
      q: tradingSymbol,
      segment: "NSE_EQ",
    });

    if (data.status === "success" && data.data && data.data.length > 0) {
      // Find the exact match by trading_symbol
      const match = data.data.find(
        (i) => i.trading_symbol?.toUpperCase() === tradingSymbol.toUpperCase()
      ) || data.data[0];

      const instrumentKey = match.instrument_key;
      // Cache for 24 hours
      cacheService.set(`ikey:${symbol}`, instrumentKey, 86400);
      // Also cache reverse mapping
      HARDCODED_KEYS[symbol] = instrumentKey;
      REVERSE_MAP[instrumentKey] = symbol;
      return instrumentKey;
    }
  } catch (err) {
    console.warn(`[marketService] Instrument search failed for ${symbol}:`, err.message);
  }

  // Fallback: construct a guess (may not work)
  return `NSE_EQ|${symbol.replace(".NS", "")}`;
};

// ── Resolve multiple symbols in parallel ──────────────────
const resolveKeys = async (symbols) => {
  return Promise.all(symbols.map((s) => resolveInstrumentKey(s)));
};

// ── Get yahoo symbol from Upstox response key ─────────────
const toYahooSymbol = (upstoxKey, fallbackSymbol) => {
  return REVERSE_MAP[upstoxKey] || fallbackSymbol || upstoxKey;
};

// ══════════════════════════════════════════════════════════
//  MARKET DATA FUNCTIONS
// ══════════════════════════════════════════════════════════

// ── Single quote ──────────────────────────────────────────
const getQuote = async (symbol) => {
  try {
    const instrumentKey = await resolveInstrumentKey(symbol);
    const data = await upstoxGet("/market-quote/quotes", {
      instrument_key: instrumentKey,
    });

    if (data.status !== "success" || !data.data) {
      return { symbol, error: true, regularMarketPrice: null };
    }

    // Response is keyed by "NSE_EQ:SYMBOL" format
    const quoteKey = Object.keys(data.data)[0];
    const q = data.data[quoteKey];
    if (!q) return { symbol, error: true, regularMarketPrice: null };

    return normalizeQuote(q, symbol);
  } catch (err) {
    console.error(`[marketService] getQuote failed for ${symbol}:`, err.message);
    return { symbol, error: true, regularMarketPrice: null };
  }
};

// ── Batch quotes ──────────────────────────────────────────
const getBatchQuotes = async (symbols) => {
  try {
    const keys = await resolveKeys(symbols);
    const instrumentKeyStr = keys.join(",");

    const data = await upstoxGet("/market-quote/quotes", {
      instrument_key: instrumentKeyStr,
    });

    if (data.status !== "success" || !data.data) {
      return symbols.map((sym) => ({ symbol: sym, error: true, regularMarketPrice: null }));
    }

    // Map results back to original symbols
    return symbols.map((sym, i) => {
      const instrumentKey = keys[i];
      // Find matching quote in response
      const quoteKey = Object.keys(data.data).find((k) => {
        // Response keys are like "NSE_EQ:RELIANCE" — match by instrument_token
        const entry = data.data[k];
        return entry && entry.instrument_token === instrumentKey;
      });

      if (quoteKey && data.data[quoteKey]) {
        return normalizeQuote(data.data[quoteKey], sym);
      }

      // Fallback: try first key that seems to match
      for (const [k, v] of Object.entries(data.data)) {
        if (v && v.instrument_token === instrumentKey) {
          return normalizeQuote(v, sym);
        }
      }

      return { symbol: sym, error: true, regularMarketPrice: null };
    });
  } catch (err) {
    console.error(`[marketService] getBatchQuotes failed:`, err.message);
    return symbols.map((sym) => ({ symbol: sym, error: true, regularMarketPrice: null }));
  }
};

// ── Normalize Upstox quote to existing frontend shape ─────
const normalizeQuote = (q, originalSymbol) => {
  const ohlc = q.ohlc || {};
  const prevClose = ohlc.close || 0;
  const ltp = q.last_price || 0;
  const change = q.net_change || (ltp - prevClose);
  const changePercent = prevClose > 0 ? ((change / prevClose) * 100) : 0;

  return {
    symbol:                       originalSymbol,
    shortName:                    q.symbol || originalSymbol,
    regularMarketPrice:           ltp,
    regularMarketChange:          parseFloat(change.toFixed(2)),
    regularMarketChangePercent:   parseFloat(changePercent.toFixed(2)),
    regularMarketOpen:            ohlc.open || 0,
    regularMarketDayHigh:         ohlc.high || 0,
    regularMarketDayLow:          ohlc.low || 0,
    regularMarketVolume:          q.volume || 0,
    regularMarketPreviousClose:   prevClose,
    fiftyTwoWeekHigh:             q.upper_circuit_limit || null,
    fiftyTwoWeekLow:              q.lower_circuit_limit || null,
  };
};

// ── OHLCV chart data ──────────────────────────────────────
const getChartData = async (symbol, interval = "1d", range = "3mo") => {
  try {
    const instrumentKey = await resolveInstrumentKey(symbol);
    const encodedKey = encodeURIComponent(instrumentKey);

    // Map app interval → Upstox interval
    const intervalMap = {
      "1m": "1minute", "5m": "5minute", "15m": "15minute", "30m": "30minute",
      "1h": "60minute", "1d": "day", "1wk": "week", "1mo": "month",
    };
    const upstoxInterval = intervalMap[interval] || "day";

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date();
    const rangeMap = {
      "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
      "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
    };
    fromDate.setDate(fromDate.getDate() - (rangeMap[range] || 90));

    const toStr = toDate.toISOString().split("T")[0];
    const fromStr = fromDate.toISOString().split("T")[0];

    // Determine endpoint: intraday for short intervals requesting today's data,
    // historical-candle for everything else
    const isIntraday = ["1minute", "5minute", "15minute", "30minute", "60minute"].includes(upstoxInterval);
    const isToday = range === "1d";

    let candles = [];

    if (isIntraday && isToday) {
      // Use intraday endpoint
      const data = await upstoxGet(
        `/historical-candle/intraday/${encodedKey}/${upstoxInterval}`
      );
      candles = data?.data?.candles || [];
    } else {
      // Use historical endpoint
      const data = await upstoxGet(
        `/historical-candle/${encodedKey}/${upstoxInterval}/${toStr}/${fromStr}`
      );
      candles = data?.data?.candles || [];
    }

    if (!candles.length) {
      console.warn(`[marketService] No chart data for ${symbol}`);
      return [];
    }

    // Upstox candle format: [timestamp, open, high, low, close, volume, oi]
    // Sort ascending by time (Upstox returns descending)
    const sorted = candles.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    return sorted.map((c) => ({
      time:   Math.floor(new Date(c[0]).getTime() / 1000),
      open:   parseFloat(parseFloat(c[1]).toFixed(2)),
      high:   parseFloat(parseFloat(c[2]).toFixed(2)),
      low:    parseFloat(parseFloat(c[3]).toFixed(2)),
      close:  parseFloat(parseFloat(c[4]).toFixed(2)),
      volume: parseInt(c[5]) || 0,
    }));
  } catch (err) {
    console.error(`[marketService] getChartData failed for ${symbol}:`, err.message);
    return [];
  }
};

// ── Symbol search ─────────────────────────────────────────
const searchSymbols = async (query) => {
  try {
    const data = await upstoxGet("/instrument/search", {
      q: query,
      segment: "NSE_EQ",
    });

    if (data.status !== "success" || !data.data) return [];

    return data.data
      .slice(0, 8)
      .map((s) => {
        const yahooSymbol = `${s.trading_symbol}.NS`;
        // Cache the mapping for later use
        if (s.instrument_key) {
          HARDCODED_KEYS[yahooSymbol] = s.instrument_key;
          REVERSE_MAP[s.instrument_key] = yahooSymbol;
          cacheService.set(`ikey:${yahooSymbol}`, s.instrument_key, 86400);
        }
        return {
          symbol:   yahooSymbol,
          name:     s.name || s.trading_symbol,
          exchange: s.exchange || "NSE",
          type:     s.instrument_type || "EQ",
        };
      });
  } catch (err) {
    console.error(`[marketService] searchSymbols failed:`, err.message);
    return [];
  }
};

// ── Major indices ─────────────────────────────────────────
const getIndices = async () => {
  const indices = [
    { symbol: "^NSEI",    name: "Nifty 50",   key: "NSE_INDEX|Nifty 50" },
    { symbol: "^NSEBANK", name: "Bank Nifty",  key: "NSE_INDEX|Nifty Bank" },
  ];

  try {
    const instrumentKeyStr = indices.map((i) => i.key).join(",");
    const data = await upstoxGet("/market-quote/quotes", {
      instrument_key: instrumentKeyStr,
    });

    if (data.status !== "success" || !data.data) {
      return [];
    }

    return indices
      .map((idx) => {
        // Find matching quote in response
        const quoteEntry = Object.values(data.data).find(
          (q) => q && q.instrument_token === idx.key
        );
        if (!quoteEntry || !quoteEntry.last_price) return null;

        const ohlc = quoteEntry.ohlc || {};
        const prevClose = ohlc.close || 0;
        const ltp = quoteEntry.last_price || 0;
        const change = quoteEntry.net_change || (ltp - prevClose);
        const changePercent = prevClose > 0 ? ((change / prevClose) * 100) : 0;

        return {
          symbol:        idx.symbol,
          name:          idx.name,
          price:         ltp,
          change:        parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.error("[marketService] getIndices failed:", err.message);
    return [];
  }
};

module.exports = { getQuote, getBatchQuotes, getChartData, searchSymbols, getIndices };