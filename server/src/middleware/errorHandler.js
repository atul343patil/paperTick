const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
	let error = { ...err };
	error.message = err.message;

	// Log in development
	if (process.env.NODE_ENV === "development") {
		console.error("[ERROR]", err);
	}

	// Mongoose duplicate key (e.g., email already exists)
	if (err.code === 11000) {
		const field = Object.keys(err.keyValue)[0];
		error = new ApiError(
			409,
			`An account with this ${field} already exists.`
		);
	}

	// Mongoose validation error
	if (err.name === "ValidationError") {
		const messages = Object.values(err.errors).map((e) => e.message);
		error = new ApiError(400, messages[0]);
	}

	// Mongoose cast error (invalid ObjectId)
	if (err.name === "CastError") {
		error = new ApiError(400, "Invalid ID format.");
	}

	const statusCode = error.statusCode || 500;
	const message = error.message || "Internal Server Error";

	res.status(statusCode).json({
		success: false,
		message,
		errors: error.errors || [],
		...(process.env.NODE_ENV === "development" && { stack: err.stack }),
	});
};

module.exports = errorHandler;
