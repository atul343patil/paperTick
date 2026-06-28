import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
import { submitOptionTrade, loadPositionsLive, loadOrders } from "../../store/slices/optionsSlice";
import { loadUser } from "../../store/slices/authSlice";
import { formatINR } from "../../utils/formatters";
import toast from "react-hot-toast";

const LOT_SIZES = { NIFTY: 25, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75 };

const OptionTradeModal = ({ option, onClose }) => {
  const dispatch = useDispatch();
  const { tradeSubmitting } = useSelector((s) => s.options);
  const { user } = useSelector((s) => s.auth);

  const [action, setAction]         = useState("BUY");
  const [product, setProduct]       = useState("NRML");
  const [orderType, setOrderType]   = useState("MARKET");
  const [lots, setLots]             = useState(1);
  const [limitPrice, setLimitPrice] = useState("");

  if (!option) return null;

  const { underlying, expiry, strikePrice, optionType } = option;
  const premium    = orderType === "MARKET"
    ? option.premium
    : parseFloat(limitPrice) || option.premium;
  const lotSize    = LOT_SIZES[underlying] || 25;
  const contracts  = lots * lotSize;
  const totalPrem  = parseFloat((premium * contracts).toFixed(2));
  const brokerage  = 20;

  const isPending = orderType === "LIMIT" || orderType === "SL";

  const handleSubmit = async () => {
    if (lots < 1) { toast.error("Please enter at least 1 lot."); return; }
    if (isPending && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast.error(orderType === "LIMIT"
        ? "Please enter a valid limit price."
        : "Please enter a valid trigger price for your stop-loss.");
      return;
    }

    try {
      const payload = {
        underlying, expiry, strikePrice, optionType,
        action, quantity: lots, product, orderType,
        premium: orderType === "MARKET" ? option.premium : parseFloat(limitPrice),
      };
      if (isPending) payload.limitPrice = parseFloat(limitPrice);

      const result = await dispatch(submitOptionTrade(payload)).unwrap();
      toast.success(result.message || `${action} order placed successfully!`);
      dispatch(loadPositionsLive());
      dispatch(loadOrders());
      dispatch(loadUser());
      onClose();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface border-t border-border rounded-t-2xl shadow-2xl w-full animate-slide-up"
        style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-3 border-b border-border">
          <div>
            <p className="font-semibold text-textPrimary text-sm">
              {underlying} {strikePrice} {optionType}
            </p>
            <p className="text-xs text-textMuted mt-0.5">
              Expiry: {expiry}
              <span className="mx-1.5">·</span>
              LTP: ₹{option.premium?.toFixed(2)}
            </p>
          </div>
          <button onClick={onClose}
            className="text-textMuted hover:text-textPrimary p-1 rounded-lg hover:bg-surfaceAlt">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* BUY / SELL Toggle */}
          <div className="flex gap-0 rounded-lg overflow-hidden border border-border">
            <button onClick={() => setAction("BUY")}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                action === "BUY" ? "bg-primary text-white" : "bg-surface text-textSecondary hover:text-textPrimary"
              }`}>BUY</button>
            <button onClick={() => setAction("SELL")}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                action === "SELL" ? "bg-danger text-white" : "bg-surface text-textSecondary hover:text-textPrimary"
              }`}>SELL</button>
          </div>
          {/* Product Type */}
          <div>
            <label className="text-xs text-textMuted block mb-1.5">Product</label>
            <div className="flex gap-2">
              {["NRML", "MIS"].map((p) => (
                <button key={p} onClick={() => setProduct(p)}
                  className={`px-4 py-1.5 rounded text-xs font-medium border transition-colors ${
                    product === p ? "border-primary bg-primary/10 text-primary" : "border-border text-textSecondary"
                  }`}>
                  {p}
                  <span className="text-textMuted ml-1 font-normal">
                    {p === "NRML" ? "(Carry forward)" : "(Intraday)"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* Order Type + Lots */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-textMuted block mb-1.5">Order Type</label>
              <div className="flex gap-1">
                {["MARKET", "LIMIT", "SL"].map((o) => (
                  <button key={o} onClick={() => setOrderType(o)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                      orderType === o ? "border-primary bg-primary/10 text-primary" : "border-border text-textSecondary"
                    }`}>{o === "SL" ? "SL" : o}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-textMuted block mb-1.5">
                Lots <span className="text-textMuted font-normal">({lotSize} units/lot)</span>
              </label>
              <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
                <button onClick={() => setLots((l) => Math.max(1, l - 1))}
                  className="px-2.5 py-1.5 text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt transition-colors border-r border-border">
                  <ChevronDown size={14} />
                </button>
                <input type="number" value={lots} min="1"
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-transparent text-center text-sm text-textPrimary outline-none py-1.5 w-12" />
                <button onClick={() => setLots((l) => l + 1)}
                  className="px-2.5 py-1.5 text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt transition-colors border-l border-border">
                  <ChevronUp size={14} />
                </button>
              </div>
            </div>
          </div>
          {/* Price input for LIMIT / SL */}
          {isPending && (
            <div>
              <label className="text-xs text-textMuted block mb-1.5">
                {orderType === "LIMIT" ? "Limit Price (₹)" : "Trigger Price (₹)"}
              </label>
              <input type="number" value={limitPrice} min="0.05" step="0.05"
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={option.premium?.toFixed(2)}
                className="input-field text-sm" />
            </div>
          )}
          {/* Pending order info banner */}
          {isPending && (
            <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg p-3">
              <AlertCircle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-textSecondary">
                {orderType === "LIMIT"
                  ? `This order will be queued and executed automatically when the market price reaches ₹${limitPrice || "—"}.`
                  : `This stop-loss order will trigger when the market price reaches ₹${limitPrice || "—"} and execute at market price.`}
              </p>
            </div>
          )}
          {/* Order Summary */}
          <div className="bg-surfaceAlt rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-textMuted">Quantity</span>
              <span className="text-textSecondary">{lots} lot{lots > 1 ? "s" : ""} × {lotSize} = {contracts} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Price</span>
              <span className="text-textSecondary">₹{premium.toFixed(2)} × {contracts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Order Value</span>
              <span className="text-textPrimary font-medium">{formatINR(totalPrem)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted">Brokerage</span>
              <span className="text-textSecondary">₹{brokerage} (flat)</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span className="text-textPrimary">{action === "BUY" ? "Total Required" : "You Receive"}</span>
              <span className={action === "BUY" ? "text-danger" : "text-success"}>
                {action === "BUY" ? formatINR(totalPrem + brokerage) : formatINR(totalPrem - brokerage)}
              </span>
            </div>
          </div>
          {/* Balance */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-textMuted">Available F&O Balance</span>
            <span className="text-xs font-semibold text-success">{formatINR(user?.fnoBalance || 0)}</span>
          </div>
          {/* Submit */}
          <button onClick={handleSubmit} disabled={tradeSubmitting}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action === "BUY" ? "bg-primary hover:bg-primaryHover text-white" : "bg-danger hover:bg-red-600 text-white"
            }`}>
            {tradeSubmitting ? "Placing Order..."
              : isPending ? `Place ${orderType} ${action}`
              : `${action} ${underlying} ${strikePrice} ${optionType}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionTradeModal;