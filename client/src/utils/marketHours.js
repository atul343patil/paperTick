/**
 * Market hours utility for the Indian stock market (NSE / BSE).
 * Market hours: Monday – Friday, 9:15 AM – 3:30 PM IST.
 */

const MARKET_OPEN_MINUTES = 9 * 60 + 15;   // 9:15 AM = 555
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;  // 3:30 PM = 930

/**
 * Get the current time in IST as a Date object.
 */
const getISTNow = () => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
};

/**
 * Check if the Indian market is currently open.
 * @returns {boolean}
 */
export const isMarketOpen = () => {
  const ist = getISTNow();
  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = totalMinutes >= MARKET_OPEN_MINUTES && totalMinutes <= MARKET_CLOSE_MINUTES;

  return isWeekday && isWithinHours;
};

/**
 * Get a detailed market status object.
 * @returns {{ isOpen: boolean, currentTimeIST: string, message: string, nextOpen: string }}
 */
export const getMarketStatus = () => {
  const ist = getISTNow();
  const day = ist.getDay();
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

  const isWeekday = day >= 1 && day <= 5;
  const isWithinHours = totalMinutes >= MARKET_OPEN_MINUTES && totalMinutes <= MARKET_CLOSE_MINUTES;
  const isOpen = isWeekday && isWithinHours;

  const currentTimeIST = ist.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  let nextOpen;
  let message;

  if (isOpen) {
    // Calculate minutes remaining
    const minutesLeft = MARKET_CLOSE_MINUTES - totalMinutes;
    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsLeft = minutesLeft % 60;
    const timeLeft = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;

    message = `Market is open — closes in ${timeLeft}`;
    nextOpen = null;
  } else {
    if (!isWeekday) {
      // Weekend
      const dayName = day === 0 ? "Sunday" : "Saturday";
      nextOpen = "Monday, 9:15 AM IST";
      message = `Market is closed (${dayName}). Opens ${nextOpen}.`;
    } else if (totalMinutes < MARKET_OPEN_MINUTES) {
      // Before market open
      const minutesUntil = MARKET_OPEN_MINUTES - totalMinutes;
      const hoursUntil = Math.floor(minutesUntil / 60);
      const minsUntil = minutesUntil % 60;
      const timeUntil = hoursUntil > 0 ? `${hoursUntil}h ${minsUntil}m` : `${minsUntil}m`;

      nextOpen = "today at 9:15 AM IST";
      message = `Market opens in ${timeUntil}`;
    } else {
      // After market close
      nextOpen = day === 5 ? "Monday, 9:15 AM IST" : "tomorrow at 9:15 AM IST";
      message = `Market is closed for the day. Opens ${nextOpen}.`;
    }
  }

  return { isOpen, currentTimeIST, message, nextOpen };
};
