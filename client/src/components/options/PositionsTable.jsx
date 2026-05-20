import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import { closePosition, loadPositions } from "../../store/slices/optionsSlice";
import { loadUser } from "../../store/slices/authSlice";
import { formatINR } from "../../utils/formatters";
import Loader from "../common/Loader";
import toast from "react-hot-toast";

const PositionsTable = () => {
  const dispatch = useDispatch();
  const { positions, positionsLoading } = useSelector((s) => s.options);
  const [closingId, setClosingId] = useState(null);
  const [closePriceInputs, setClosePriceInputs] = useState({});

  const openPositions   = positions.filter((p) => p.status === "OPEN");
  const closedPositions = positions.filter((p) => p.status === "CLOSED");

  const handleClose = async (id) => {
    const cp = parseFloat(closePriceInputs[id]);
    if (!cp || cp <= 0) { toast.error("Enter a valid close price."); return; }
    setClosingId(id);
    try {
      const result = await dispatch(closePosition({ id, closePrice: cp })).unwrap();
      toast.success(`Position closed. P&L: ${formatINR(result.data.netPnL)}`);
      dispatch(loadPositions());
      dispatch(loadUser());
    } catch (err) {
      toast.error(err);
    } finally {
      setClosingId(null);
    }
  };

  if (positionsLoading) return <div className="flex justify-center py-8"><Loader /></div>;

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-textSecondary text-sm font-medium">No option positions yet</p>
        <p className="text-textMuted text-xs mt-1">Click any LTP in the option chain to trade</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Open Positions */}
      {openPositions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
            Open Positions ({openPositions.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Contract", "Action", "Lots", "Premium", "Total", "Close At", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-textMuted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openPositions.map((pos) => (
                  <tr key={pos._id} className="border-b border-border/50 hover:bg-surfaceAlt">
                    <td className="px-3 py-3">
                      <p className="font-medium text-textPrimary">
                        {pos.underlying} {pos.strikePrice} {pos.optionType}
                      </p>
                      <p className="text-textMuted">Exp: {pos.expiry}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        pos.action === "BUY"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}>
                        {pos.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-textSecondary">
                      {pos.quantity} lot{pos.quantity > 1 ? "s" : ""} ({pos.totalContracts} units)
                    </td>
                    <td className="px-3 py-3 text-textPrimary font-medium">
                      ₹{pos.premium.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-textSecondary">
                      {formatINR(pos.totalPremium)}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        placeholder="Exit price"
                        min="0.05" step="0.05"
                        value={closePriceInputs[pos._id] || ""}
                        onChange={(e) =>
                          setClosePriceInputs((p) => ({ ...p, [pos._id]: e.target.value }))
                        }
                        className="input-field w-28 text-xs py-1.5"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleClose(pos._id)}
                        disabled={closingId === pos._id}
                        className="px-3 py-1.5 rounded-lg bg-surfaceAlt border border-border text-xs text-textSecondary hover:text-textPrimary hover:border-primary transition-colors disabled:opacity-50"
                      >
                        {closingId === pos._id ? "Closing..." : "Close"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Positions */}
      {closedPositions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
            Closed Positions ({closedPositions.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Contract", "Action", "Entry", "Exit", "P&L", "Date"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-textMuted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((pos) => {
                  const isPnLUp = pos.realizedPnL >= 0;
                  return (
                    <tr key={pos._id} className="border-b border-border/50 hover:bg-surfaceAlt">
                      <td className="px-3 py-3">
                        <p className="font-medium text-textPrimary">
                          {pos.underlying} {pos.strikePrice} {pos.optionType}
                        </p>
                        <p className="text-textMuted">Exp: {pos.expiry}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          pos.action === "BUY"
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}>
                          {pos.action}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-textSecondary">₹{pos.premium.toFixed(2)}</td>
                      <td className="px-3 py-3 text-textSecondary">
                        {pos.closePrice ? `₹${pos.closePrice.toFixed(2)}` : "—"}
                      </td>
                      <td className={`px-3 py-3 font-semibold ${isPnLUp ? "text-success" : "text-danger"}`}>
                        {formatINR(pos.realizedPnL)}
                      </td>
                      <td className="px-3 py-3 text-textMuted">
                        {new Date(pos.updatedAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsTable;