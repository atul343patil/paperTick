const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { listStrategies, analyzeStrategyRoute, analyzeCustom } = require("../controllers/strategyController");

router.use(protect);

router.get("/list",    listStrategies);
router.post("/analyze", analyzeStrategyRoute);
router.post("/custom",  analyzeCustom);

module.exports = router;