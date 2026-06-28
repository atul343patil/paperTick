import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, ShoppingCart, Play, Clock } from "lucide-react";
import { submitOptionTrade, loadPositionsLive, loadOrders } from "../../store/slices/optionsSlice";
import { loadUser } from "../../store/slices/authSlice";
import { formatINR } from "../../utils/formatters";
import { getMarketStatus } from "../../utils/marketHours";
import toast from "react-hot-toast";

const LOT_SIZES = { NIFTY: 25, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75 };

const BasketOrderPanel = ({ basket, onRemove, onClear }) => {
  const dispatch = useDispatch();
  const { tradeSubmitting } = useSelector((s) => s.options);
  const [executing, setExecuting] = useState(false);

  // Market hours status
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 30000); // Re-check every 30 seconds
    return () => clearInterval(timer);
  }, []);

  if (basket.length === 0) return null;

  const totalDebit = basket.reduce((sum, item) => {
    const lotSize   = LOT_SIZES[item.underlying] || 25;
    const contracts = item.lots * lotSize;
    const value     = item.premium * contracts;
    return item.action === "BUY" ? sum + value : sum - value;
  }, 0);

  const handleExecuteAll = async () => {
    if (!marketStatus.isOpen) {
      toast.error("Trading is only available during market hours (9:15 AM – 3:30 PM IST).");
      return;
    }

    setExecuting(true);
    let successCount = 0;
    let failCount    = 0;

    for (const item of basket) {
      try {
        await dispatch(submitOptionTrade({
          underlying:  item.underlying,
          expiry:      item.expiry,
          strikePrice: item.strikePrice,
          optionType:  item.optionType,
          action:      item.action,
          quantity:    item.lots,
          premium:     item.premium,
        })).unwrap();
        successCount++;
      } catch {
        failCount++;
      }
    }

    setExecuting(false);
    dispatch(loadPositionsLive());
    dispatch(loadOrders());
    dispatch(loadUser());

    if (failCount === 0) {
      toast.success(`All ${successCount} orders executed successfully`);
      onClear();
    } else {
      toast.error(`${successCount} executed, ${failCount} failed. Check balance.`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border shadow-2xl">
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-primary" />
            <span className="text-sm font-semibold text-textPrimary">
              Basket Orders ({basket.length} leg{basket.length !== 1 ? "s" : ""})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="text-textMuted">Net: </span>
              <span className={totalDebit >= 0 ? "text-danger font-semibold" : "text-success font-semibold"}>
                {totalDebit >= 0 ? `Debit ${formatINR(totalDebit)}` : `Credit ${formatINR(Math.abs(totalDebit))}`}
              </span>
            </div>
            <button onClick={onClear} className="text-xs text-textMuted hover:text-danger">Clear All</button>
          </div>
        </div>

        {/* ── Market Closed Warning ── */}
        {!marketStatus.isOpen && (
          <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/25 rounded-lg px-3 py-2 mb-3">
            <Clock size={13} className="text-amber-400 shrink-0 animate-pulse" />
            <p className="text-xs text-amber-400 font-medium">
              Market Closed — {marketStatus.message}
            </p>
          </div>
        )}

        {/* Basket items */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {basket.map((item, idx) => {
            const lotSize   = LOT_SIZES[item.underlying] || 25;
            return (
              <div key={idx}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                  item.action === "BUY"
                    ? "border-primary/40 bg-primary/5"
                    : "border-danger/40 bg-danger/5"
                }`}>
                <span className={`font-bold ${item.action === "BUY" ? "text-primary" : "text-danger"}`}>
                  {item.action}
                </span>
                <span className="text-textPrimary font-medium">
                  {item.underlying} {item.strikePrice} {item.optionType}
                </span>
                <span className="text-textMuted">{item.lots}L × ₹{item.premium}</span>
                <button onClick={() => onRemove(idx)} className="text-textMuted hover:text-danger ml-1">
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        {/* Execute button */}
        <button onClick={handleExecuteAll} disabled={executing || tradeSubmitting || !marketStatus.isOpen}
          className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            !marketStatus.isOpen
              ? "bg-gray-600 text-gray-300 cursor-not-allowed"
              : "bg-primary hover:bg-primaryHover text-white"
          }`}>
          {!marketStatus.isOpen ? (
            <>
              <Clock size={14} />
              Market Closed
            </>
          ) : (
            <>
              <Play size={14} />
              {executing ? "Executing..." : `Execute ${basket.length} Orders`}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BasketOrderPanel;
