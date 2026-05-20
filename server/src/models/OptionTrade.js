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
  totalContracts: { type: Number, required: true }, // quantity × lotSize
  premium:     { type: Number, required: true },    // per unit
  totalPremium: { type: Number, required: true },   // premium × totalContracts
  charges:     { type: Number, default: 0 },
  netAmount:   { type: Number, required: true },
  status:      { type: String, enum: ["OPEN", "CLOSED", "EXPIRED"], default: "OPEN" },
  closePrice:  { type: Number, default: null },
  realizedPnL: { type: Number, default: null },
}, { timestamps: true });

optionTradeSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("OptionTrade", optionTradeSchema);