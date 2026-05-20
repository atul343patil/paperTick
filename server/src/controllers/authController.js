const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const User = require("../models/User");

// Generate JWT
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});
};

// Send token in response
const sendTokenResponse = (user, statusCode, res) => {
	const token = generateToken(user._id);

	res.status(statusCode).json(
		new ApiResponse(statusCode, { token, user }, "Success")
	);
};

// Validation rules - defined here, used in routes
const registerValidation = [
	body("name")
		.trim()
		.notEmpty().withMessage("Name is required")
		.isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
	body("email")
		.trim()
		.notEmpty().withMessage("Email is required")
		.isEmail().withMessage("Enter a valid email"),
	body("password")
		.notEmpty().withMessage("Password is required")
		.isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
	body("email")
		.trim()
		.notEmpty().withMessage("Email is required")
		.isEmail().withMessage("Enter a valid email"),
	body("password")
		.notEmpty().withMessage("Password is required"),
];

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
	const { name, email, password } = req.body;

	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new ApiError(409, "An account with this email already exists.");
	}

	const user = await User.create({ name, email, password });

	sendTokenResponse(user, 201, res);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	// Explicitly select password (it's excluded by default)
	const user = await User.findOne({ email }).select("+password");

	if (!user || !(await user.comparePassword(password))) {
		throw new ApiError(401, "Invalid email or password.");
	}

	if (!user.isActive) {
		throw new ApiError(401, "Account has been deactivated.");
	}

	sendTokenResponse(user, 200, res);
});

// GET /api/auth/me  (protected)
const getMe = asyncHandler(async (req, res) => {
	// req.user is attached by authMiddleware
	res.status(200).json(
		new ApiResponse(200, { user: req.user }, "User fetched successfully")
	);
});

module.exports = {
	register,
	login,
	getMe,
	registerValidation,
	loginValidation,
};
