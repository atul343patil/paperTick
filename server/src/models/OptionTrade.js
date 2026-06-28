const mongoose = require("mongoose");

const optionTradeSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  underlying:  { type: String, required: true, uppercase: true },
  expiry:      { type: String, required: true },
  strikePrice: { type: Number, required: true },
  optionType:  { type: String, enum: ["CE", "PE"], required: true },
  action:      { type: String, enum: ["BUY", "SELL"], required: true },
  quantity:    { type: Number, required: true },
  lotSize:     { type: Number, required: true },
  totalContracts: { type: Number, required: true },
  premium:     { type: Number, required: true },
  totalPremium: { type: Number, required: true },
  charges:     { type: Number, default: 0 },
  netAmount:   { type: Number, required: true },

  // Order management
  orderType:   { type: String, enum: ["MARKET", "LIMIT", "SL"], default: "MARKET" },
  limitPrice:  { type: Number, default: null },
  product:     { type: String, enum: ["NRML", "MIS"], default: "NRML" },

  // PENDING = limit/SL not yet executed
  status:      { type: String, enum: ["PENDING", "OPEN", "CLOSED", "EXPIRED", "CANCELLED"], default: "OPEN" },

  executedAt:  { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  closePrice:  { type: Number, default: null },
  realizedPnL: { type: Number, default: null },
}, { timestamps: true });

optionTradeSchema.index({ userId: 1, status: 1 });
optionTradeSchema.index({ status: 1 });

module.exports = mongoose.model("OptionTrade", optionTradeSchema);