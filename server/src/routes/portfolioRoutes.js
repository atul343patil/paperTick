const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getHoldings, getSummary } = require("../controllers/portfolioController");

const router = express.Router();

router.get("/", authMiddleware, getHoldings);
router.get("/summary", authMiddleware, getSummary);

module.exports = router;
