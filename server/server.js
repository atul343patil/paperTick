require("dotenv").config();

const validateEnv = require("./src/config/env");
const connectDB   = require("./src/config/db");
const app         = require("./src/app");

validateEnv();
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Server] paperTick API running on port ${PORT} (${process.env.NODE_ENV})`);
});

// Initialize WebSocket service (Upstox bridge + frontend broadcast)
const websocketService = require("./src/services/websocketService");
websocketService.init(server);

// Start pending order scanner (LIMIT/SL auto-execution)
const optionOrderService = require("./src/services/optionOrderService");
optionOrderService.start();