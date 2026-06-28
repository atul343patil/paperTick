const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { calculatePrice, getModelStatus } = require("../controllers/calculatorController");

router.use(protect);
router.post("/price",        calculatePrice);
router.get("/model-status",  getModelStatus);

module.exports = router;

