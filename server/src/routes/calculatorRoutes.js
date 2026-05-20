const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { calculatePrice, getModelStatus, triggerTraining } = require("../controllers/calculatorController");

router.use(protect);
router.post("/price",        calculatePrice);
router.get("/model-status",  getModelStatus);
router.post("/train",        triggerTraining);

module.exports = router;
