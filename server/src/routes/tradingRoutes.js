const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const marketHours = require("../middleware/marketHours");
const { placeOrder, getOrders, getPortfolio } = require("../controllers/tradingController");
const { body } = require("express-validator");
const validate = require("../middleware/validator");

router.use(protect);

router.post(
  "/order",
  marketHours,
  [
    body("symbol").trim().notEmpty().withMessage("Symbol is required"),
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("side").isIn(["BUY", "SELL"]).withMessage("side must be BUY or SELL"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be a positive integer"),
    body("productType").optional().isIn(["DELIVERY", "INTRADAY"]),
    body("orderType").optional().isIn(["MARKET", "LIMIT"]),
  ],
  validate,
  placeOrder
);

router.get("/orders", getOrders);
router.get("/portfolio", getPortfolio);

module.exports = router;