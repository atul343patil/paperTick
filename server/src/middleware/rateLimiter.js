const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	standardHeaders: true,
	legacyHeaders: false
});

module.exports = rateLimiter;
