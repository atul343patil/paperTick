/**
 * Local stock/index database for PaperTick.
 *
 * Provides instant, offline-capable search for Nifty 50 constituents,
 * major indices, and popular Indian stocks. Used as the primary search
 * source — Upstox API is used as an enrichment layer on top.
 */

const STOCKS = [
  // ── Nifty 50 Constituents ─────────────────────────────────
  { symbol: "RELIANCE.NS",   name: "Reliance Industries",        trading: "RELIANCE",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE002A01018" },
  { symbol: "TCS.NS",        name: "Tata Consultancy Services",   trading: "TCS",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE467B01029" },
  { symbol: "INFY.NS",       name: "Infosys",                     trading: "INFY",       exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE009A01021" },
  { symbol: "HDFCBANK.NS",   name: "HDFC Bank",                   trading: "HDFCBANK",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE040A01034" },
  { symbol: "ICICIBANK.NS",  name: "ICICI Bank",                  trading: "ICICIBANK",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE090A01021" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever",          trading: "HINDUNILVR", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE030A01027" },
  { symbol: "ITC.NS",        name: "ITC Limited",                 trading: "ITC",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE154A01025" },
  { symbol: "SBIN.NS",       name: "State Bank of India",         trading: "SBIN",       exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE062A01020" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel",               trading: "BHARTIARTL", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE397D01024" },
  { symbol: "KOTAKBANK.NS",  name: "Kotak Mahindra Bank",         trading: "KOTAKBANK",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE237A01028" },
  { symbol: "LT.NS",         name: "Larsen & Toubro",             trading: "LT",         exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE018A01030" },
  { symbol: "AXISBANK.NS",   name: "Axis Bank",                   trading: "AXISBANK",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE238A01034" },
  { symbol: "WIPRO.NS",      name: "Wipro",                       trading: "WIPRO",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE075A01022" },
  { symbol: "HCLTECH.NS",    name: "HCL Technologies",            trading: "HCLTECH",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE860A01027" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance",               trading: "BAJFINANCE", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE296A01024" },
  { symbol: "MARUTI.NS",     name: "Maruti Suzuki India",         trading: "MARUTI",     exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE585B01010" },
  { symbol: "SUNPHARMA.NS",  name: "Sun Pharmaceutical",          trading: "SUNPHARMA",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE044A01036" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors",                 trading: "TATAMOTORS", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE155A01022" },
  { symbol: "NTPC.NS",       name: "NTPC Limited",                trading: "NTPC",       exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE733E01010" },
  { symbol: "POWERGRID.NS",  name: "Power Grid Corporation",      trading: "POWERGRID",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE752E01010" },
  { symbol: "TATASTEEL.NS",  name: "Tata Steel",                  trading: "TATASTEEL",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE081A01020" },
  { symbol: "ONGC.NS",       name: "Oil & Natural Gas Corp",      trading: "ONGC",       exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE213A01029" },
  { symbol: "ADANIENT.NS",   name: "Adani Enterprises",           trading: "ADANIENT",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE423A01024" },
  { symbol: "ADANIPORTS.NS", name: "Adani Ports & SEZ",           trading: "ADANIPORTS", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE742F01042" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints",                trading: "ASIANPAINT", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE021A01026" },
  { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv",               trading: "BAJAJFINSV", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE918I01026" },
  { symbol: "COALINDIA.NS",  name: "Coal India",                  trading: "COALINDIA",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE522F01014" },
  { symbol: "DRREDDY.NS",    name: "Dr Reddy's Laboratories",     trading: "DRREDDY",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE089A01023" },
  { symbol: "EICHERMOT.NS",  name: "Eicher Motors",               trading: "EICHERMOT",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE066A01021" },
  { symbol: "GRASIM.NS",     name: "Grasim Industries",           trading: "GRASIM",     exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE047A01021" },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp",               trading: "HEROMOTOCO", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE158A01026" },
  { symbol: "HINDALCO.NS",   name: "Hindalco Industries",         trading: "HINDALCO",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE038A01020" },
  { symbol: "INDUSINDBK.NS", name: "IndusInd Bank",               trading: "INDUSINDBK", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE095A01012" },
  { symbol: "JSWSTEEL.NS",   name: "JSW Steel",                   trading: "JSWSTEEL",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE019A01038" },
  { symbol: "M&M.NS",        name: "Mahindra & Mahindra",         trading: "M&M",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE101A01026" },
  { symbol: "NESTLEIND.NS",  name: "Nestle India",                trading: "NESTLEIND",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE239A01016" },
  { symbol: "TECHM.NS",      name: "Tech Mahindra",               trading: "TECHM",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE669C01036" },
  { symbol: "TITAN.NS",      name: "Titan Company",               trading: "TITAN",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE280A01028" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement",            trading: "ULTRACEMCO", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE481G01011" },
  { symbol: "DIVISLAB.NS",   name: "Divi's Laboratories",         trading: "DIVISLAB",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE361B01024" },
  { symbol: "CIPLA.NS",      name: "Cipla",                       trading: "CIPLA",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE059A01026" },
  { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals",            trading: "APOLLOHOSP", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE437A01024" },
  { symbol: "BRITANNIA.NS",  name: "Britannia Industries",        trading: "BRITANNIA",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE216A01030" },
  { symbol: "HDFCLIFE.NS",   name: "HDFC Life Insurance",         trading: "HDFCLIFE",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE795G01014" },
  { symbol: "SBILIFE.NS",    name: "SBI Life Insurance",          trading: "SBILIFE",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE123W01016" },
  { symbol: "TATACONSUM.NS", name: "Tata Consumer Products",      trading: "TATACONSUM", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE192A01025" },
  { symbol: "UPL.NS",        name: "UPL Limited",                 trading: "UPL",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE628A01036" },
  { symbol: "BPCL.NS",       name: "Bharat Petroleum",            trading: "BPCL",       exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE541A01020" },
  { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto",                  trading: "BAJAJ-AUTO", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE917I01010" },
  { symbol: "SHRIRAMFIN.NS", name: "Shriram Finance",             trading: "SHRIRAMFIN", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE721A01013" },

  // ── Additional Popular Stocks ─────────────────────────────
  { symbol: "ZOMATO.NS",     name: "Zomato",                      trading: "ZOMATO",     exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE758T01015" },
  { symbol: "PAYTM.NS",      name: "One 97 Communications (Paytm)", trading: "PAYTM",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE982J01020" },
  { symbol: "IRCTC.NS",      name: "Indian Railway Catering",     trading: "IRCTC",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE335Y01020" },
  { symbol: "DMART.NS",      name: "Avenue Supermarts (DMart)",    trading: "DMART",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE192R01011" },
  { symbol: "HAL.NS",        name: "Hindustan Aeronautics",       trading: "HAL",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE066F01020" },
  { symbol: "BEL.NS",        name: "Bharat Electronics",          trading: "BEL",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE263A01024" },
  { symbol: "TRENT.NS",      name: "Trent Limited",               trading: "TRENT",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE849A01020" },
  { symbol: "JIOFIN.NS",     name: "Jio Financial Services",      trading: "JIOFIN",     exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE758E01017" },
  { symbol: "VEDL.NS",       name: "Vedanta Limited",             trading: "VEDL",       exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE205A01025" },
  { symbol: "IOC.NS",        name: "Indian Oil Corporation",      trading: "IOC",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE242A01010" },
  { symbol: "PNB.NS",        name: "Punjab National Bank",        trading: "PNB",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE160A01022" },
  { symbol: "BANKBARODA.NS", name: "Bank of Baroda",              trading: "BANKBARODA", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE028A01039" },
  { symbol: "HDFCAMC.NS",    name: "HDFC Asset Management",       trading: "HDFCAMC",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE127D01025" },
  { symbol: "PIDILITIND.NS", name: "Pidilite Industries",         trading: "PIDILITIND", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE318A01026" },
  { symbol: "SIEMENS.NS",    name: "Siemens",                     trading: "SIEMENS",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE003A01024" },
  { symbol: "HAVELLS.NS",    name: "Havells India",               trading: "HAVELLS",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE176B01034" },
  { symbol: "DABUR.NS",      name: "Dabur India",                 trading: "DABUR",      exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE016A01026" },
  { symbol: "GODREJCP.NS",   name: "Godrej Consumer Products",    trading: "GODREJCP",   exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE102D01028" },
  { symbol: "DLF.NS",        name: "DLF Limited",                 trading: "DLF",        exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE271C01023" },
  { symbol: "AMBUJACEM.NS",  name: "Ambuja Cements",              trading: "AMBUJACEM",  exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE079A01024" },
  { symbol: "ICICIPRULI.NS", name: "ICICI Prudential Life",       trading: "ICICIPRULI", exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE726G01019" },
  { symbol: "INDIGO.NS",     name: "InterGlobe Aviation (IndiGo)", trading: "INDIGO",    exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE646L01027" },
  { symbol: "NAUKRI.NS",     name: "Info Edge (Naukri)",           trading: "NAUKRI",     exchange: "NSE", type: "EQ", instrumentKey: "NSE_EQ|INE663F01024" },

  // ── Major Indices ─────────────────────────────────────────
  { symbol: "^NSEI",    name: "Nifty 50",                  trading: "NIFTY 50",   exchange: "INDEX", type: "INDEX", instrumentKey: "NSE_INDEX|Nifty 50" },
  { symbol: "^NSEBANK", name: "Bank Nifty",                trading: "NIFTY BANK", exchange: "INDEX", type: "INDEX", instrumentKey: "NSE_INDEX|Nifty Bank" },
  { symbol: "^BSESN",   name: "BSE Sensex",                trading: "SENSEX",     exchange: "INDEX", type: "INDEX", instrumentKey: "BSE_INDEX|SENSEX" },
  { symbol: "^CNXIT",   name: "Nifty IT",                  trading: "NIFTY IT",   exchange: "INDEX", type: "INDEX", instrumentKey: "NSE_INDEX|Nifty IT" },
  { symbol: "^CNXFIN",  name: "Nifty Financial Services",  trading: "NIFTY FIN",  exchange: "INDEX", type: "INDEX", instrumentKey: "NSE_INDEX|Nifty Financial Services" },
  { symbol: "^NSMIDCP", name: "Nifty Midcap 50",           trading: "NIFTY MID",  exchange: "INDEX", type: "INDEX", instrumentKey: "NSE_INDEX|Nifty Midcap 50" },
];

// Pre-build lowercase search fields for faster matching
const SEARCH_INDEX = STOCKS.map((stock) => ({
  ...stock,
  _nameLower:    stock.name.toLowerCase(),
  _tradingLower: stock.trading.toLowerCase(),
  _symbolLower:  stock.symbol.toLowerCase(),
}));

/**
 * Search the local stock database with relevance-ranked fuzzy matching.
 *
 * @param {string} query — The search query (e.g., "reliance", "TCS", "bank")
 * @param {number} [limit=10] — Maximum results to return
 * @returns {Array} — Matching stocks sorted by relevance
 */
const search = (query, limit = 10) => {
  if (!query || query.trim().length < 1) return [];

  const q = query.trim().toLowerCase();

  // Score each stock based on match quality
  const scored = SEARCH_INDEX
    .map((stock) => {
      let score = 0;

      // Exact trading symbol match (highest priority)
      if (stock._tradingLower === q) {
        score = 100;
      }
      // Exact symbol match
      else if (stock._symbolLower === q || stock._symbolLower === `${q}.ns`) {
        score = 95;
      }
      // Trading symbol starts with query
      else if (stock._tradingLower.startsWith(q)) {
        score = 80;
      }
      // Name starts with query
      else if (stock._nameLower.startsWith(q)) {
        score = 75;
      }
      // Trading symbol contains query
      else if (stock._tradingLower.includes(q)) {
        score = 60;
      }
      // Name contains query (word boundary match)
      else if (stock._nameLower.split(/\s+/).some((word) => word.startsWith(q))) {
        score = 55;
      }
      // Name contains query anywhere
      else if (stock._nameLower.includes(q)) {
        score = 40;
      }
      // No match
      else {
        return null;
      }

      return { ...stock, _score: score };
    })
    .filter(Boolean)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  // Return clean objects (strip internal fields)
  return scored.map(({ symbol, name, exchange, type }) => ({
    symbol,
    name,
    exchange,
    type,
  }));
};

/**
 * Get all stocks in the database (for instrument key registration).
 */
const getAll = () => STOCKS;

module.exports = { search, getAll, STOCKS };
