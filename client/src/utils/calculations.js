// Client-side brokerage preview (mirrors server exactly)
export const previewCharges = (price, quantity, side, productType = "DELIVERY") => {
  if (!price || !quantity || price <= 0 || quantity <= 0) return null;

  const turnover = price * quantity;
  const isDelivery = productType === "DELIVERY";

  const brokerageRate = isDelivery ? 0 : 0.0003;
  const brokerage = isDelivery ? 0 : Math.min(turnover * brokerageRate, 20);

  const stt = isDelivery
    ? turnover * 0.001
    : side === "SELL" ? turnover * 0.00025 : 0;

  const exchangeCharge = turnover * 0.0000297;
  const sebiCharge     = turnover * 0.000001;
  const gst            = (brokerage + exchangeCharge) * 0.18;
  const stampDuty      = side === "BUY"
    ? turnover * (isDelivery ? 0.00015 : 0.00003)
    : 0;

  const totalCharges = brokerage + stt + exchangeCharge + sebiCharge + gst + stampDuty;
  const netAmount    = side === "BUY"
    ? turnover + totalCharges
    : turnover - totalCharges;

  return {
    turnover:       +turnover.toFixed(2),
    brokerage:      +brokerage.toFixed(2),
    stt:            +stt.toFixed(2),
    exchangeCharge: +exchangeCharge.toFixed(4),
    sebiCharge:     +sebiCharge.toFixed(4),
    gst:            +gst.toFixed(2),
    stampDuty:      +stampDuty.toFixed(2),
    totalCharges:   +totalCharges.toFixed(2),
    netAmount:      +netAmount.toFixed(2),
  };
};