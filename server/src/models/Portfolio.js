const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema({
  symbol:        { type: String, required: true, uppercase: true },
  name:          { type: String, required: true },
  exchange:      { type: String, default: "NSE" },
  quantity:      { type: Number, required: true, min: 0 },
  avgBuyPrice:   { type: Number, required: true },
  totalInvested: { type: Number, required: true },
  realizedPnL:   { type: Number, default: 0 },
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },
  holdings: { type: [holdingSchema], default: [] },

  // Running totals (updated on every trade)
  totalInvested:  { type: Number, default: 0 },
  totalRealizedPnL: { type: Number, default: 0 },
  totalChargesPaid: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Portfolio", portfolioSchema);