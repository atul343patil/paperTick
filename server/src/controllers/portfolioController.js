const Portfolio = require("../models/Portfolio");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getHoldings = asyncHandler(async (req, res) => {
	const holdings = await Portfolio.find({ userId: req.user.id });
	res.json(new ApiResponse(holdings));
});

const getSummary = asyncHandler(async (req, res) => {
	const holdings = await Portfolio.find({ userId: req.user.id });
	const totalInvested = holdings.reduce(
		(sum, h) => sum + (h.totalInvested || 0),
		0
	);
	const currentValue = holdings.reduce(
		(sum, h) => sum + (h.currentValue || 0),
		0
	);
	const unrealizedPnL = currentValue - totalInvested;

	res.json(
		new ApiResponse({
			totalInvested,
			currentValue,
			unrealizedPnL
		})
	);
});

module.exports = { getHoldings, getSummary };
