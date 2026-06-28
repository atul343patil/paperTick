// ── Simple Moving Average ─────────────────────────────────
export const calculateSMA = (data, period) => {
  if (!data || data.length < period) return [];
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg   = slice.reduce((sum, d) => sum + d.close, 0) / period;
    result.push({ time: data[i].time, value: parseFloat(avg.toFixed(2)) });
  }
  return result;
};

// ── Exponential Moving Average ────────────────────────────
export const calculateEMA = (data, period) => {
  if (!data || data.length < period) return [];
  const k   = 2 / (period + 1);
  let ema   = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  const result = [{ time: data[period - 1].time, value: parseFloat(ema.toFixed(2)) }];

  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: parseFloat(ema.toFixed(2)) });
  }
  return result;
};

// ── RSI ───────────────────────────────────────────────────
export const calculateRSI = (data, period = 14) => {
  if (!data || data.length <= period) return [];
  const result  = [];
  const changes = data.map((d, i) => (i === 0 ? 0 : d.close - data[i - 1].close));

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const change = changes[i];
      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    }
    const rs  = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push({ time: data[i].time, value: parseFloat(rsi.toFixed(2)) });
  }
  return result;
};