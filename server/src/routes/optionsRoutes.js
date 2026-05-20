const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getChain, placeTrade, getPositions, closeTrade } = require("../controllers/optionsController");
const { body } = require("express-validator");
const validate = require("../middleware/validator");

router.use(protect);

router.get("/chain/:symbol", getChain);
router.get("/positions", getPositions);
router.patch("/close/:id", closeTrade);
router.post(
  "/trade",
  [
    body("underlying").trim().notEmpty(),
    body("expiry").trim().notEmpty(),
    body("strikePrice").isFloat({ min: 0 }),
    body("optionType").isIn(["CE", "PE"]),
    body("action").isIn(["BUY", "SELL"]),
    body("quantity").isInt({ min: 1 }),
    body("premium").isFloat({ min: 0 }),
  ],
  validate,
  placeTrade
);

module.exports = router;