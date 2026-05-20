const express = require("express");
const router = express.Router();
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const {
  getAuthUrl,
  exchangeCodeForToken,
  isTokenValid,
} = require("../services/upstoxAuthService");
const { onTokenRefreshed } = require("../services/websocketService");

// GET /api/upstox/login → redirect to Upstox OAuth page
router.get(
  "/login",
  asyncHandler(async (req, res) => {
    const url = getAuthUrl();
    res.redirect(url);
  })
);

// GET /api/upstox/callback → exchange code for token
router.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: "Missing auth code." });
    }

    await exchangeCodeForToken(code);

    // Trigger WebSocket reconnection with the fresh token
    onTokenRefreshed();

    // Redirect to frontend with success
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}?upstox_auth=success`);
  })
);

// GET /api/upstox/status → check if token is valid
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const valid = await isTokenValid();
    res.json(
      new ApiResponse(200, { authenticated: valid }, valid ? "Upstox authenticated" : "Upstox not authenticated")
    );
  })
);

module.exports = router;
