const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
	symbol: { type: String, required: true },
	buyPrice: { type: Number, required: true },
	sellPrice: { type: Number, required: true },
	quantity: { type: Number, required: true },
	pnl: { type: Number, default: 0 },
	brokerage: { type: Number, default: 0 },
	netPnL: { type: Number, default: 0 },
	closedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Trade", tradeSchema);
