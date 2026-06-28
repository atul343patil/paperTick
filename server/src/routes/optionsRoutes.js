const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const marketHours = require("../middleware/marketHours");
const {
  getChain, placeTrade, getPositions, getPositionsWithLTP,
  getOrders, cancelOrder, closeTrade,
} = require("../controllers/optionsController");
const { body } = require("express-validator");
const validate = require("../middleware/validator");

router.use(protect);

router.get("/chain/:symbol", getChain);
router.get("/positions", getPositions);
router.get("/positions/live", getPositionsWithLTP);
router.get("/orders", getOrders);
router.patch("/cancel/:id", cancelOrder);
router.patch("/close/:id", marketHours, closeTrade);
router.post(
  "/trade",
  marketHours,
  [
    body("underlying").trim().notEmpty().withMessage("Please select an underlying."),
    body("expiry").trim().notEmpty().withMessage("Please select an expiry date."),
    body("strikePrice").isFloat({ min: 0 }).withMessage("Strike price must be positive."),
    body("optionType").isIn(["CE", "PE"]).withMessage("Option type must be CE or PE."),
    body("action").isIn(["BUY", "SELL"]).withMessage("Action must be BUY or SELL."),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1 lot."),
    body("premium").isFloat({ min: 0 }).withMessage("Premium must be a valid number."),
  ],
  validate,
  placeTrade
);

module.exports = router;