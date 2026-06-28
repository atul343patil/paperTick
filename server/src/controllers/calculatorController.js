const asyncHandler = require("../utils/asyncHandler");
const ApiResponse  = require("../utils/ApiResponse");
const ApiError     = require("../utils/ApiError");
const axios        = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// POST /api/calculator/price
const calculatePrice = asyncHandler(async (req, res) => {
  const { S, K, T, r, sigma, option_type } = req.body;

  // Basic validation
  if (!S || !K || !T || r === undefined || r === null || !sigma || !option_type) {
    throw new ApiError(400, "All fields required: S, K, T, r, sigma, option_type");
  }

  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/predict`, {
      S: parseFloat(S),
      K: parseFloat(K),
      T: parseFloat(T),
      r: parseFloat(r),
      sigma: parseFloat(sigma),
      option_type,
    }, { timeout: 30000 });

    res.json(new ApiResponse(200, data, "Pricing complete"));
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      throw new ApiError(503, "ML service unavailable. Start ml-service on port 5001.");
    }
    throw new ApiError(500, err.response?.data?.error || "ML service error");
  }
});

// GET /api/calculator/model-status
const getModelStatus = asyncHandler(async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_SERVICE_URL}/model-status`, { timeout: 5000 });
    res.json(new ApiResponse(200, data, "Model status fetched"));
  } catch {
    res.json(new ApiResponse(200, { is_trained: false, model_type: "Hybrid LSTM-CNN" }, "ML service offline"));
  }
});

module.exports = { calculatePrice, getModelStatus };

