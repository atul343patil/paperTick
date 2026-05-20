const mongoose = require("mongoose");

const chargesSchema = new mongoose.Schema({
  turnover:       { type: Number, default: 0 },
  brokerage:      { type: Number, default: 0 },
  stt:            { type: Number, default: 0 },
  exchangeCharge: { type: Number, default: 0 },
  sebiCharge:     { type: Number, default: 0 },
  gst:            { type: Number, default: 0 },
  stampDuty:      { type: Number, default: 0 },
  totalCharges:   { type: Number, default: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  symbol:      { type: String, required: true, uppercase: true, trim: true },
  name:        { type: String, required: true },
  exchange:    { type: String, default: "NSE" },
  side:        { type: String, enum: ["BUY", "SELL"], required: true },
  productType: { type: String, enum: ["DELIVERY", "INTRADAY"], default: "DELIVERY" },
  orderType:   { type: String, enum: ["MARKET", "LIMIT"], default: "MARKET" },
  quantity:    { type: Number, required: true, min: 1 },
  limitPrice:  { type: Number, default: null },
  executedPrice: { type: Number, required: true },
  totalValue:  { type: Number, required: true },   // qty × price (before charges)
  charges:     { type: chargesSchema, default: () => ({}) },
  netAmount:   { type: Number, required: true },   // amount debited/credited after charges
  status:      { type: String, enum: ["EXECUTED", "REJECTED"], default: "EXECUTED" },
  rejectionReason: { type: String, default: null },
}, { timestamps: true });

// Index for fast order history queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, symbol: 1 });

module.exports = mongoose.model("Order", orderSchema);