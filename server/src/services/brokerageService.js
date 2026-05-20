// Zerodha-accurate charge calculation
// All rates as of 2024 — update if SEBI revises

const CHARGES = {
  // STT (Securities Transaction Tax)
  stt: {
    equityDeliveryBuy: 0.001,    // 0.1%
    equityDeliverySell: 0.001,   // 0.1%
    equityIntradaySell: 0.00025, // 0.025%
  },
  // Exchange transaction charges
  exchange: {
    nse: 0.0000297, // 0.00297%
  },
  // GST on (brokerage + exchange charges)
  gst: 0.18,
  // SEBI turnover charge
  sebi: 0.000001, // ₹10 per crore
  // Stamp duty (on buy side only)
  stampDuty: {
    equityDelivery: 0.00015, // 0.015%
    equityIntraday: 0.00003, // 0.003%
  },
};

const MAX_BROKERAGE_PER_ORDER = 20; // ₹20 cap per executed order

/**
 * Calculate all charges for an equity trade
 * @param {number} price        - Execution price per share
 * @param {number} quantity     - Number of shares
 * @param {string} side         - "BUY" | "SELL"
 * @param {string} productType  - "DELIVERY" | "INTRADAY"
 * @returns {object}            - Itemized charges + total
 */
const calculateCharges = (price, quantity, side, productType = "DELIVERY") => {
  const turnover = price * quantity;
  const isDelivery = productType === "DELIVERY";

  // Brokerage
  const brokerageRate = isDelivery ? 0 : 0.0003; // 0% delivery, 0.03% intraday
  let brokerage = Math.min(turnover * brokerageRate, MAX_BROKERAGE_PER_ORDER);
  if (isDelivery) brokerage = 0;

  // STT
  let stt = 0;
  if (isDelivery) {
    stt = turnover * (side === "BUY"
      ? CHARGES.stt.equityDeliveryBuy
      : CHARGES.stt.equityDeliverySell);
  } else {
    stt = side === "SELL" ? turnover * CHARGES.stt.equityIntradaySell : 0;
  }

  // Exchange charges
  const exchangeCharge = turnover * CHARGES.exchange.nse;

  // SEBI charge
  const sebiCharge = turnover * CHARGES.sebi;

  // GST (on brokerage + exchange charges)
  const gst = (brokerage + exchangeCharge) * CHARGES.gst;

  // Stamp duty (only on buy)
  let stampDuty = 0;
  if (side === "BUY") {
    stampDuty = turnover * (isDelivery
      ? CHARGES.stampDuty.equityDelivery
      : CHARGES.stampDuty.equityIntraday);
  }

  const totalCharges = brokerage + stt + exchangeCharge + sebiCharge + gst + stampDuty;

  return {
    turnover: parseFloat(turnover.toFixed(2)),
    brokerage: parseFloat(brokerage.toFixed(2)),
    stt: parseFloat(stt.toFixed(2)),
    exchangeCharge: parseFloat(exchangeCharge.toFixed(4)),
    sebiCharge: parseFloat(sebiCharge.toFixed(4)),
    gst: parseFloat(gst.toFixed(2)),
    stampDuty: parseFloat(stampDuty.toFixed(2)),
    totalCharges: parseFloat(totalCharges.toFixed(2)),
  };
};

/**
 * Net P&L after charges
 */
const calculateNetPnL = (buyPrice, sellPrice, quantity, productType = "DELIVERY") => {
  const grossPnL = (sellPrice - buyPrice) * quantity;
  const buyCharges = calculateCharges(buyPrice, quantity, "BUY", productType);
  const sellCharges = calculateCharges(sellPrice, quantity, "SELL", productType);
  const totalCharges = buyCharges.totalCharges + sellCharges.totalCharges;
  const netPnL = grossPnL - totalCharges;

  return {
    grossPnL: parseFloat(grossPnL.toFixed(2)),
    totalCharges: parseFloat(totalCharges.toFixed(2)),
    netPnL: parseFloat(netPnL.toFixed(2)),
  };
};

module.exports = { calculateCharges, calculateNetPnL };