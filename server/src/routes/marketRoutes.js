const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getQuote,
  getChart,
  searchSymbols,
  getIndices,
  getBatchQuotes,
} = require("../controllers/marketController");
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} = require("../controllers/watchlistController");
const { body } = require("express-validator");
const validate = require("../middleware/validator");

// All market routes require authentication
router.use(protect);

router.get("/indices", getIndices);
router.get("/search", searchSymbols);
router.get("/batch", getBatchQuotes);
router.get("/quote/:symbol", getQuote);
router.get("/chart/:symbol", getChart);

// Watchlist
router.get("/watchlist", getWatchlist);
router.post(
  "/watchlist/add",
  [
    body("symbol").trim().notEmpty().withMessage("Symbol is required"),
    body("name").trim().notEmpty().withMessage("Name is required"),
  ],
  validate,
  addToWatchlist
);
router.delete("/watchlist/:symbol", removeFromWatchlist);

module.exports = router;