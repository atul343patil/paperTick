const mongoose = require("mongoose");

const watchlistItemSchema = new mongoose.Schema({
  symbol:   { type: String, required: true, uppercase: true, trim: true },
  name:     { type: String, required: true },
  exchange: { type: String, default: "NSE" },
});

const watchlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    stocks: {
      type: [watchlistItemSchema],
      default: [
        { symbol: "RELIANCE.NS",  name: "Reliance Industries", exchange: "NSE" },
        { symbol: "TCS.NS",       name: "Tata Consultancy",    exchange: "NSE" },
        { symbol: "INFY.NS",      name: "Infosys",             exchange: "NSE" },
        { symbol: "HDFCBANK.NS",  name: "HDFC Bank",           exchange: "NSE" },
        { symbol: "ICICIBANK.NS", name: "ICICI Bank",          exchange: "NSE" },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Watchlist", watchlistSchema);