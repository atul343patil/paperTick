// ── Pending Order Execution Service ───────────────────────
// Scans PENDING orders (LIMIT/SL) every 10s during market hours
// and auto-executes when price conditions are met.

const OptionTrade = require("../models/OptionTrade");
const User = require("../models/User");
const { getLTPForContract } = require("./optionService");

let intervalTimer = null;

const isMarketHours = () => {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();
  return totalMinutes >= 555 && totalMinutes <= 930; // 9:15 to 15:30
};

// LIMIT BUY: execute when LTP <= limitPrice
// LIMIT SELL: execute when LTP >= limitPrice
const shouldFillLimit = (action, limitPrice, ltp) =>
  action === "BUY" ? ltp <= limitPrice : ltp >= limitPrice;

// SL BUY: triggered when LTP >= triggerPrice
// SL SELL: triggered when LTP <= triggerPrice
const shouldTriggerSL = (action, triggerPrice, ltp) =>
  action === "BUY" ? ltp >= triggerPrice : ltp <= triggerPrice;

const executeOrder = async (order, executionPrice) => {
  try {
    const user = await User.findById(order.userId);
    if (!user) return;

    const contracts = order.totalContracts;
    const totalPremium = parseFloat((executionPrice * contracts).toFixed(2));
    const brokerage = 20;

    if (order.action === "BUY") {
      if (user.fnoBalance < totalPremium + brokerage) {
        order.status = "CANCELLED";
        order.cancelledAt = new Date();
        await order.save();
        console.log(`[OrderService] Order ${order._id} cancelled — insufficient balance`);
        return;
      }
      user.fnoBalance = parseFloat((user.fnoBalance - totalPremium - brokerage).toFixed(2));
    } else {
      user.fnoBalance = parseFloat((user.fnoBalance + totalPremium - brokerage).toFixed(2));
    }

    order.status = "OPEN";
    order.premium = executionPrice;
    order.totalPremium = totalPremium;
    order.charges = brokerage;
    order.netAmount = order.action === "BUY" ? totalPremium + brokerage : -(totalPremium - brokerage);
    order.executedAt = new Date();

    await order.save();
    await user.save();
    console.log(`[OrderService] ✓ ${order.orderType} ${order.action} executed: ${order.underlying} ${order.strikePrice} ${order.optionType} @ ₹${executionPrice}`);
  } catch (err) {
    console.error(`[OrderService] Execute error:`, err.message);
  }
};

const scanPendingOrders = async () => {
  try {
    const pendingOrders = await OptionTrade.find({ status: "PENDING" });
    if (pendingOrders.length === 0) return;

    for (const order of pendingOrders) {
      const ltp = await getLTPForContract(order.underlying, order.strikePrice, order.optionType);
      if (ltp === null) continue;

      let shouldExecute = false;
      if (order.orderType === "LIMIT") shouldExecute = shouldFillLimit(order.action, order.limitPrice, ltp);
      else if (order.orderType === "SL") shouldExecute = shouldTriggerSL(order.action, order.limitPrice, ltp);

      if (shouldExecute) {
        const fillPrice = order.orderType === "LIMIT" ? order.limitPrice : ltp;
        await executeOrder(order, fillPrice);
      }
    }
  } catch (err) {
    console.error("[OrderService] Scan error:", err.message);
  }
};

const start = () => {
  if (intervalTimer) return;
  const tick = () => {
    const interval = isMarketHours() ? 10000 : 60000;
    intervalTimer = setTimeout(async () => {
      await scanPendingOrders();
      tick();
    }, interval);
  };
  console.log("[OrderService] Pending order scanner started.");
  tick();
};

const stop = () => {
  if (intervalTimer) { clearTimeout(intervalTimer); intervalTimer = null; }
};

module.exports = { start, stop, scanPendingOrders };
