const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");

const protect = asyncHandler(async (req, res, next) => {
	let token;

	// Support both Authorization header and httpOnly cookie
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith("Bearer ")
	) {
		token = req.headers.authorization.split(" ")[1];
	} else if (req.cookies?.token) {
		token = req.cookies.token;
	}

	if (!token) {
		throw new ApiError(401, "Not authorized. Please log in.");
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Attach full user to request (excluding password)
		req.user = await User.findById(decoded.id);

		if (!req.user) {
			throw new ApiError(401, "User no longer exists.");
		}

		if (!req.user.isActive) {
			throw new ApiError(401, "Account has been deactivated.");
		}

		next();
	} catch (err) {
		if (err.name === "JsonWebTokenError") {
			throw new ApiError(401, "Invalid token. Please log in again.");
		}
		if (err.name === "TokenExpiredError") {
			throw new ApiError(401, "Token expired. Please log in again.");
		}
		throw err;
	}
});

module.exports = { protect };
