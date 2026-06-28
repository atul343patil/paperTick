const ApiError = require("../utils/ApiError");

/**
 * Express middleware that blocks trade-mutating requests outside
 * Indian market hours (NSE/BSE: Mon–Fri, 9:15 AM – 3:30 PM IST).
 *
 * Attach this ONLY to order-placement / position-close routes.
 * Read-only routes (portfolio, order history, option chain) should NOT use this.
 */
const marketHours = (req, res, next) => {
  // Current time in IST
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const ist = new Date(istString);

  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const MARKET_OPEN = 9 * 60 + 15;   // 9:15 AM  = 555 minutes
  const MARKET_CLOSE = 15 * 60 + 30;  // 3:30 PM  = 930 minutes

  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = totalMinutes >= MARKET_OPEN && totalMinutes <= MARKET_CLOSE;
  const isOpen = isWeekday && isWithinHours;

  if (isOpen) {
    return next();
  }

  // Format current IST time for the error message
  const currentTimeIST = ist.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const dayName = ist.toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" });

  // Calculate next open time
  let nextOpen;
  if (!isWeekday) {
    // Weekend — next Monday
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    nextOpen = `Monday at 9:15 AM IST`;
  } else if (totalMinutes < MARKET_OPEN) {
    nextOpen = "today at 9:15 AM IST";
  } else {
    // After market close
    nextOpen = day === 5 ? "Monday at 9:15 AM IST" : "tomorrow at 9:15 AM IST";
  }

  throw new ApiError(
    403,
    `Trading is only available during Indian market hours (Mon–Fri, 9:15 AM – 3:30 PM IST). Current time: ${currentTimeIST} (${dayName}). Markets will reopen ${nextOpen}.`,
    [{
      marketStatus: {
        isOpen: false,
        currentTimeIST,
        dayName,
        nextOpen,
      },
    }]
  );
};

module.exports = marketHours;
