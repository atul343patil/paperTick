import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { submitOrder, loadPortfolio, clearError } from "../../store/slices/portfolioSlice";
import { loadUser } from "../../store/slices/authSlice";
import { previewCharges } from "../../utils/calculations";
import { formatINR } from "../../utils/formatters";
import toast from "react-hot-toast";

const TAB = { BUY: "BUY", SELL: "SELL" };
const PRODUCT = { DELIVERY: "DELIVERY", INTRADAY: "INTRADAY" };

const OrderForm = ({ symbol, name, currentPrice }) => {
  const dispatch = useDispatch();
  const { orderSubmitting, error } = useSelector((s) => s.portfolio);
  const { user } = useSelector((s) => s.auth);

  const [side, setSide] = useState(TAB.BUY);
  const [productType, setProductType] = useState(PRODUCT.DELIVERY);
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");

  const price = orderType === "MARKET" ? currentPrice : parseFloat(limitPrice) || 0;
  const qty = parseInt(quantity) || 0;
  const charges = qty > 0 && price > 0 ? previewCharges(price, qty, side, productType) : null;

  // Clear error on form change
  useEffect(() => { dispatch(clearError()); }, [side, quantity, limitPrice, orderType]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol || !qty || qty < 1) { toast.error("Enter a valid quantity."); return; }
    if (orderType === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast.error("Enter a valid limit price."); return;
    }

    try {
      const result = await dispatch(submitOrder({
        symbol, name, side, productType, orderType, quantity: qty,
        ...(orderType === "LIMIT" && { limitPrice: parseFloat(limitPrice) }),
      })).unwrap();

      toast.success(`${side} order executed at ₹${result.data.order.executedPrice.toFixed(2)}`);
      setQuantity("");
      setLimitPrice("");
      dispatch(loadPortfolio());
      dispatch(loadUser());
    } catch {
      // error shown via useEffect above
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Buy / Sell tabs */}
      <div className="flex">
        {[TAB.BUY, TAB.SELL].map((t) => (
          <button
            key={t}
            onClick={() => setSide(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              side === t
                ? t === TAB.BUY
                  ? "bg-success text-white"
                  : "bg-danger text-white"
                : "bg-surfaceAlt text-textSecondary hover:text-textPrimary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* Symbol display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-textPrimary">{symbol || "—"}</p>
            <p className="text-xs text-textMuted truncate max-w-[160px]">{name || "Select a stock"}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-textPrimary">
              {currentPrice ? `₹${currentPrice.toFixed(2)}` : "—"}
            </p>
            <p className="text-xs text-textMuted">LTP</p>
          </div>
        </div>

        {/* Product type */}
        <div className="flex gap-2">
          {[PRODUCT.DELIVERY, PRODUCT.INTRADAY].map((p) => (
            <button
              key={p}
              onClick={() => setProductType(p)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                productType === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-textSecondary hover:border-textSecondary"
              }`}
            >
              {p === PRODUCT.DELIVERY ? "CNC" : "MIS"}
            </button>
          ))}
        </div>

        {/* Order type */}
        <div className="flex gap-2">
          {["MARKET", "LIMIT"].map((o) => (
            <button
              key={o}
              onClick={() => setOrderType(o)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                orderType === o
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-textSecondary hover:border-textSecondary"
              }`}
            >
              {o}
            </button>
          ))}
        </div>

        {/* Limit price input */}
        {orderType === "LIMIT" && (
          <div>
            <label className="block text-xs text-textSecondary mb-1">Limit Price (₹)</label>
            <input
              type="number"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.00"
              min="0.01" step="0.05"
              className="input-field text-sm"
            />
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-xs text-textSecondary mb-1">Quantity</label>
          <div className="flex gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, (parseInt(q) || 0) - 1).toString())}
              className="w-9 h-9 rounded border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary flex items-center justify-center text-lg transition-colors"
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="1" step="1"
              className="input-field text-sm text-center flex-1"
            />
            <button
              onClick={() => setQuantity((q) => ((parseInt(q) || 0) + 1).toString())}
              className="w-9 h-9 rounded border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary flex items-center justify-center text-lg transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Charges breakdown */}
        {charges && (
          <div className="bg-surfaceAlt rounded-lg p-3 space-y-1.5">
            <ChargeRow label="Turnover" value={formatINR(charges.turnover)} />
            {charges.brokerage > 0 && <ChargeRow label="Brokerage" value={formatINR(charges.brokerage)} />}
            <ChargeRow label="STT" value={formatINR(charges.stt)} />
            <ChargeRow label="Exchange + SEBI" value={formatINR(+(charges.exchangeCharge + charges.sebiCharge).toFixed(4))} />
            <ChargeRow label="GST" value={formatINR(charges.gst)} />
            {charges.stampDuty > 0 && <ChargeRow label="Stamp Duty" value={formatINR(charges.stampDuty)} />}
            <div className="border-t border-border pt-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-textPrimary">
                {side === "BUY" ? "Total Required" : "You Receive"}
              </span>
              <span className="text-sm font-bold text-textPrimary">{formatINR(charges.netAmount)}</span>
            </div>
          </div>
        )}

        {/* Balance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-textMuted">Available Balance</span>
          <span className="text-success font-medium">
            ₹{user?.virtualBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) ?? "—"}
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={orderSubmitting || !symbol || !qty}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            side === TAB.BUY
              ? "bg-success hover:bg-green-600 text-white"
              : "bg-danger hover:bg-red-600 text-white"
          }`}
        >
          {orderSubmitting
            ? "Placing Order..."
            : `${side === TAB.BUY ? "Buy" : "Sell"} ${symbol || "Stock"}`}
        </button>
      </div>
    </div>
  );
};

const ChargeRow = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-textMuted">{label}</span>
    <span className="text-xs text-textSecondary">{value}</span>
  </div>
);

export default OrderForm;