const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
  credentials: true
}));

// Rate limiting — relaxed in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 10000 : 100,
  message: { success: false, message: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "paperTick API is running." });
});

app.use("/api/auth",       require("./routes/authRoutes"));
app.use("/api/market",     require("./routes/marketRoutes"));
app.use("/api/trading",    require("./routes/tradingRoutes"));
app.use("/api/options",    require("./routes/optionsRoutes"));
app.use("/api/strategies", require("./routes/strategyRoutes"));
app.use("/api/upstox",     require("./routes/upstoxAuthRoutes"));
app.use("/api/calculator", require("./routes/calculatorRoutes"));

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found." }));
app.use(errorHandler);

module.exports = app;