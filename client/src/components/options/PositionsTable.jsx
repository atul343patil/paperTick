import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import {
  closePosition, loadPositionsLive, loadOrders,
  cancelPendingOrder, setPositionsTab,
} from "../../store/slices/optionsSlice";
import { loadUser } from "../../store/slices/authSlice";
import { formatINR } from "../../utils/formatters";
import { TrendingUp, TrendingDown, Clock, XCircle, CheckCircle, AlertTriangle } from "lucide-react";
import Loader from "../common/Loader";
import toast from "react-hot-toast";

const SUB_TABS = [
  { key: "open",    label: "Open Positions" },
  { key: "closed",  label: "Closed" },
  { key: "orders",  label: "Orders" },
];

const StatusBadge = ({ status }) => {
  const map = {
    OPEN:      { bg: "bg-success/10", text: "text-success", icon: CheckCircle },
    PENDING:   { bg: "bg-warning/10", text: "text-warning", icon: Clock },
    CLOSED:    { bg: "bg-textMuted/10", text: "text-textMuted", icon: CheckCircle },
    CANCELLED: { bg: "bg-danger/10", text: "text-danger", icon: XCircle },
    EXPIRED:   { bg: "bg-danger/10", text: "text-danger", icon: AlertTriangle },
  };
  const s = map[status] || map.OPEN;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text}`}>
      <Icon size={11} /> {status}
    </span>
  );
};

const PositionsTable = () => {
  const dispatch = useDispatch();
  const { livePositions, orders, liveLoading, ordersLoading, positionsTab, cancellingId } = useSelector((s) => s.options);
  const [closingId, setClosingId] = useState(null);
  const [closePriceInputs, setClosePriceInputs] = useState({});
  const [closeDateFilter, setCloseDateFilter] = useState("all");

  // Polling for live positions
  useEffect(() => {
    dispatch(loadPositionsLive());
    dispatch(loadOrders());
    const timer = setInterval(() => {
      dispatch(loadPositionsLive());
    }, 10000);
    return () => clearInterval(timer);
  }, [dispatch]);

  const openPositions   = livePositions.filter((p) => p.status === "OPEN");
  const pendingOrders   = livePositions.filter((p) => p.status === "PENDING");
  const closedPositions = livePositions.filter((p) => p.status === "CLOSED");

  // Filter closed by date
  const filteredClosed = closedPositions.filter((p) => {
    if (closeDateFilter === "all") return true;
    const d = new Date(p.updatedAt);
    const now = new Date();
    if (closeDateFilter === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (closeDateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    }
    return true;
  });

  // P&L summaries
  const totalUnrealizedPnL = openPositions.reduce((sum, p) =>
    sum + (typeof p.unrealizedPnL === "number" ? p.unrealizedPnL : 0), 0);
  const totalInvested = openPositions.reduce((sum, p) => sum + (p.totalPremium || 0), 0);
  const todayRealizedPnL = closedPositions
    .filter((p) => new Date(p.updatedAt).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + (p.realizedPnL || 0), 0);

  const handleClose = async (id) => {
    const cp = parseFloat(closePriceInputs[id]);
    if (!cp || cp < 0) { toast.error("Please enter a valid exit price."); return; }
    setClosingId(id);
    try {
      const result = await dispatch(closePosition({ id, closePrice: cp })).unwrap();
      toast.success(result.message || "Position closed successfully!");
      dispatch(loadPositionsLive());
      dispatch(loadOrders());
      dispatch(loadUser());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to close position. Please try again.");
    } finally { setClosingId(null); }
  };

  const handleCancel = async (id) => {
    try {
      const result = await dispatch(cancelPendingOrder(id)).unwrap();
      toast.success(result.message || "Order cancelled.");
      dispatch(loadPositionsLive());
      dispatch(loadOrders());
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to cancel order.");
    }
  };

  if (liveLoading && livePositions.length === 0) {
    return <div className="flex justify-center py-8"><Loader /></div>;
  }

  const hasAnyData = livePositions.length > 0 || orders.length > 0;
  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
          <TrendingUp size={24} className="text-textMuted" />
        </div>
        <p className="text-textSecondary text-sm font-medium">No option positions yet</p>
        <p className="text-textMuted text-xs mt-1">Click any LTP in the option chain to trade</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">

      {/* ── P&L Summary Bar ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-textMuted mb-1">Unrealized P&L</p>
          <p className={`text-lg font-bold ${totalUnrealizedPnL >= 0 ? "text-success" : "text-danger"}`}>
            {totalUnrealizedPnL >= 0 ? "+" : ""}{formatINR(totalUnrealizedPnL)}
          </p>
          <p className="text-xs text-textMuted mt-0.5">{openPositions.length} open position{openPositions.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-textMuted mb-1">Today's Realized P&L</p>
          <p className={`text-lg font-bold ${todayRealizedPnL >= 0 ? "text-success" : "text-danger"}`}>
            {todayRealizedPnL >= 0 ? "+" : ""}{formatINR(todayRealizedPnL)}
          </p>
          <p className="text-xs text-textMuted mt-0.5">Closed today</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-textMuted mb-1">Total Invested</p>
          <p className="text-lg font-bold text-textPrimary">{formatINR(totalInvested)}</p>
          <p className="text-xs text-textMuted mt-0.5">
            {pendingOrders.length > 0 && `${pendingOrders.length} pending`}
          </p>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex gap-1 bg-surfaceAlt rounded-lg p-1">
        {SUB_TABS.map((tab) => {
          const count = tab.key === "open" ? openPositions.length + pendingOrders.length
            : tab.key === "closed" ? closedPositions.length
            : orders.length;
          return (
            <button
              key={tab.key}
              onClick={() => {
                dispatch(setPositionsTab(tab.key));
                if (tab.key === "orders") dispatch(loadOrders());
              }}
              className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                positionsTab === tab.key
                  ? "bg-surface text-textPrimary shadow"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              {tab.label} {count > 0 && <span className="ml-1 text-textMuted">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* ── Open Positions Tab ── */}
      {positionsTab === "open" && (
        <div className="space-y-3">
          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-warning uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Clock size={12} /> Pending Orders ({pendingOrders.length})
              </p>
              <div className="space-y-2">
                {pendingOrders.map((pos) => (
                  <div key={pos._id} className="bg-surface border border-warning/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          pos.action === "BUY" ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                        }`}>{pos.action}</span>
                        <div>
                          <p className="text-sm font-medium text-textPrimary">
                            {pos.underlying} {pos.strikePrice} {pos.optionType}
                          </p>
                          <p className="text-xs text-textMuted">
                            {pos.orderType} @ ₹{pos.limitPrice?.toFixed(2)} · {pos.quantity} lot{pos.quantity > 1 ? "s" : ""}
                            · Exp: {pos.expiry}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancel(pos._id)}
                        disabled={cancellingId === pos._id}
                        className="px-3 py-1.5 rounded-lg border border-danger/30 text-danger text-xs font-medium
                          hover:bg-danger/10 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === pos._id ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Positions */}
          {openPositions.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-2">
                Open Positions ({openPositions.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Contract", "Action", "Qty", "Avg Price", "LTP", "P&L", "P&L %", "Exit Price", ""].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-textMuted font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((pos) => {
                      const pnl = pos.unrealizedPnL;
                      const pnlPct = pos.unrealizedPnLPercent;
                      const isPnlUp = typeof pnl === "number" && pnl >= 0;
                      return (
                        <tr key={pos._id} className={`border-b border-border/50 transition-colors ${
                          typeof pnl === "number" ? (pnl >= 0 ? "hover:bg-success/5" : "hover:bg-danger/5") : "hover:bg-surfaceAlt"
                        }`}>
                          <td className="px-3 py-3">
                            <p className="font-medium text-textPrimary">{pos.underlying} {pos.strikePrice} {pos.optionType}</p>
                            <p className="text-textMuted">Exp: {pos.expiry}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              pos.action === "BUY" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                            }`}>{pos.action}</span>
                          </td>
                          <td className="px-3 py-3 text-textSecondary">
                            {pos.quantity}L ({pos.totalContracts})
                          </td>
                          <td className="px-3 py-3 text-textPrimary font-medium">₹{pos.premium?.toFixed(2)}</td>
                          <td className="px-3 py-3">
                            {pos.currentLTP != null ? (
                              <span className="text-textPrimary font-semibold">₹{pos.currentLTP.toFixed(2)}</span>
                            ) : (
                              <span className="text-textMuted">—</span>
                            )}
                          </td>
                          <td className={`px-3 py-3 font-bold ${typeof pnl === "number" ? (isPnlUp ? "text-success" : "text-danger") : "text-textMuted"}`}>
                            {typeof pnl === "number" ? `${isPnlUp ? "+" : ""}${formatINR(pnl)}` : "—"}
                          </td>
                          <td className={`px-3 py-3 font-medium ${typeof pnlPct === "number" ? (pnlPct >= 0 ? "text-success" : "text-danger") : "text-textMuted"}`}>
                            {typeof pnlPct === "number" ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number" placeholder="Exit ₹" min="0" step="0.05"
                              value={closePriceInputs[pos._id] || ""}
                              onChange={(e) => setClosePriceInputs((p) => ({ ...p, [pos._id]: e.target.value }))}
                              className="input-field w-24 text-xs py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handleClose(pos._id)}
                              disabled={closingId === pos._id}
                              className="px-3 py-1.5 rounded-lg bg-surfaceAlt border border-border text-xs
                                text-textSecondary hover:text-danger hover:border-danger/50 transition-colors disabled:opacity-50"
                            >
                              {closingId === pos._id ? "Closing..." : "Exit"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-8 text-textMuted text-sm">No open positions</div>
          ) : null}
        </div>
      )}

      {/* ── Closed Positions Tab ── */}
      {positionsTab === "closed" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
              Closed Positions ({filteredClosed.length})
            </p>
            <div className="flex gap-1">
              {[["today", "Today"], ["week", "This Week"], ["all", "All Time"]].map(([k, l]) => (
                <button key={k} onClick={() => setCloseDateFilter(k)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    closeDateFilter === k ? "bg-primary/10 text-primary" : "text-textMuted hover:text-textSecondary"
                  }`}>{l}</button>
              ))}
            </div>
          </div>
          {filteredClosed.length > 0 ? (
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
                  {filteredClosed.map((pos) => (
                    <tr key={pos._id} className="border-b border-border/50 hover:bg-surfaceAlt transition-colors">
                      <td className="px-3 py-3">
                        <p className="font-medium text-textPrimary">{pos.underlying} {pos.strikePrice} {pos.optionType}</p>
                        <p className="text-textMuted">Exp: {pos.expiry} · {pos.quantity}L</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          pos.action === "BUY" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}>{pos.action}</span>
                      </td>
                      <td className="px-3 py-3 text-textSecondary">₹{pos.premium?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-textSecondary">
                        {pos.closePrice != null ? `₹${pos.closePrice.toFixed(2)}` : "—"}
                      </td>
                      <td className={`px-3 py-3 font-bold ${(pos.realizedPnL ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                        {pos.realizedPnL != null ? formatINR(pos.realizedPnL) : "—"}
                      </td>
                      <td className="px-3 py-3 text-textMuted">
                        {new Date(pos.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-textMuted text-sm">No closed positions{closeDateFilter !== "all" ? " for this period" : ""}</div>
          )}
        </div>
      )}

      {/* ── Orders Tab ── */}
      {positionsTab === "orders" && (
        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
            Order History ({orders.length})
          </p>
          {ordersLoading && orders.length === 0 ? (
            <div className="flex justify-center py-8"><Loader /></div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Time", "Contract", "Action", "Type", "Price", "Qty", "Status"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-textMuted font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-border/50 hover:bg-surfaceAlt transition-colors">
                      <td className="px-3 py-3 text-textMuted">
                        <p>{new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                        <p className="text-xs">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-textPrimary">{order.underlying} {order.strikePrice} {order.optionType}</p>
                        <p className="text-textMuted">Exp: {order.expiry}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          order.action === "BUY" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}>{order.action}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-textSecondary font-medium">{order.orderType || "MARKET"}</span>
                        {order.limitPrice && order.orderType !== "MARKET" && (
                          <p className="text-textMuted">@ ₹{order.limitPrice.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-textPrimary font-medium">₹{order.premium?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-textSecondary">{order.quantity}L ({order.totalContracts})</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          {order.status === "PENDING" && (
                            <button
                              onClick={() => handleCancel(order._id)}
                              disabled={cancellingId === order._id}
                              className="text-danger text-xs hover:underline disabled:opacity-50"
                            >
                              {cancellingId === order._id ? "..." : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-textMuted text-sm">No orders placed yet</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PositionsTable;