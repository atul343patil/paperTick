import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X } from "lucide-react";
import { submitOptionTrade, loadPositions } from "../../store/slices/optionsSlice";
import { loadUser } from "../../store/slices/authSlice";
import { formatINR } from "../../utils/formatters";
import toast from "react-hot-toast";

const LOT_SIZES = {
  NIFTY: 50, BANKNIFTY: 15, FINNIFTY: 40, MIDCPNIFTY: 75,
};

const OptionTradeModal = ({ option, onClose }) => {
  const dispatch = useDispatch();
  const { tradeSubmitting } = useSelector((s) => s.options);
  const { user } = useSelector((s) => s.auth);

  const [action, setAction] = useState("BUY");
  const [lots, setLots] = useState(1);

  if (!option) return null;

  const { underlying, expiry, strikePrice, optionType, premium } = option;
  const lotSize = LOT_SIZES[underlying] || 100;
  const totalContracts = lots * lotSize;
  const totalPremium   = parseFloat((premium * totalContracts).toFixed(2));
  const charges = 20;
  const netAmount = action === "BUY"
    ? totalPremium + charges
    : totalPremium - charges;

  const handleSubmit = async () => {
    try {
      await dispatch(submitOptionTrade({
        underlying, expiry, strikePrice, optionType,
        action, quantity: lots, premium,
      })).unwrap();

      toast.success(
        `${action} ${lots} lot${lots > 1 ? "s" : ""} ${underlying} ${strikePrice} ${optionType} @ ₹${premium}`
      );
      dispatch(loadPositions());
      dispatch(loadUser());
      onClose();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <p className="font-semibold text-textPrimary">
              {underlying} {strikePrice} {optionType}
            </p>
            <p className="text-xs text-textMuted">Expiry: {expiry}</p>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary p-1 rounded-lg hover:bg-surfaceAlt">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Buy / Sell */}
          <div className="flex gap-2">
            {["BUY", "SELL"].map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  action === a
                    ? a === "BUY" ? "bg-success text-white" : "bg-danger text-white"
                    : "bg-surfaceAlt text-textSecondary hover:text-textPrimary"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Premium */}
          <div className="bg-surfaceAlt rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-textMuted">LTP (Premium)</span>
            <span className="text-base font-semibold text-textPrimary">₹{premium}</span>
          </div>

          {/* Lots */}
          <div>
            <label className="text-xs text-textSecondary mb-1.5 block">
              Lots <span className="text-textMuted">(1 lot = {lotSize} units)</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLots((l) => Math.max(1, l - 1))}
                className="w-10 h-10 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-primary flex items-center justify-center text-xl transition-colors"
              >
                −
              </button>
              <input
                type="number"
                value={lots}
                min="1"
                onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field text-center flex-1"
              />
              <button
                onClick={() => setLots((l) => l + 1)}
                className="w-10 h-10 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-primary flex items-center justify-center text-xl transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-surfaceAlt rounded-lg p-3 space-y-2 text-xs">
            {[
              ["Lots × Lot Size", `${lots} × ${lotSize} = ${totalContracts} units`],
              ["Premium", `₹${premium} × ${totalContracts}`],
              ["Total Premium", formatINR(totalPremium)],
              ["Brokerage", `₹${charges} (flat)`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-textMuted">{l}</span>
                <span className="text-textSecondary">{v}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span className="text-textPrimary">
                {action === "BUY" ? "Total Required" : "You Receive"}
              </span>
              <span className="text-textPrimary">{formatINR(netAmount)}</span>
            </div>
          </div>

          {/* Balance */}
          <div className="flex justify-between text-xs">
            <span className="text-textMuted">Available Balance</span>
            <span className="text-success font-medium">
              ₹{user?.virtualBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={tradeSubmitting}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
              action === "BUY"
                ? "bg-success hover:bg-green-600 text-white"
                : "bg-danger hover:bg-red-600 text-white"
            }`}
          >
            {tradeSubmitting ? "Placing..." : `${action} ${underlying} ${strikePrice} ${optionType}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionTradeModal;