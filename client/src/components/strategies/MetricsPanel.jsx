import { useSelector } from "react-redux";
import { formatINR } from "../../utils/formatters";
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react";

const MetricCard = ({ icon, label, value, color }) => (
  <div className="bg-surfaceAlt rounded-xl p-4 flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs text-textMuted mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  </div>
);

const MetricsPanel = () => {
  const { result } = useSelector((s) => s.strategy);
  if (!result) return null;

  const { metrics, legs } = result;

  const maxProfitVal = typeof metrics.maxProfit === "number"
    ? formatINR(metrics.maxProfit)
    : metrics.maxProfit;

  const maxLossVal = typeof metrics.maxLoss === "number"
    ? formatINR(metrics.maxLoss)
    : metrics.maxLoss;

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<TrendingUp size={15} className="text-success" />}
          label="Max Profit"
          value={maxProfitVal}
          color="text-success"
        />
        <MetricCard
          icon={<TrendingDown size={15} className="text-danger" />}
          label="Max Loss"
          value={maxLossVal}
          color="text-danger"
        />
        <MetricCard
          icon={<Target size={15} className="text-warning" />}
          label="Breakeven(s)"
          value={
            metrics.breakevens.length > 0
              ? metrics.breakevens.map((b) => `₹${b.toFixed(0)}`).join(" / ")
              : "None"
          }
          color="text-warning"
        />
        <MetricCard
          icon={<Activity size={15} className="text-primary" />}
          label="Risk / Reward"
          value={metrics.riskReward ? `1 : ${metrics.riskReward}` : "—"}
          color="text-primary"
        />
      </div>

      {/* Net premium */}
      <div className={`rounded-xl p-4 border ${
        metrics.isDebit
          ? "bg-danger/5 border-danger/20"
          : "bg-success/5 border-success/20"
      }`}>
        <p className="text-xs text-textMuted mb-1">
          {metrics.isDebit ? "Net Debit (you pay)" : "Net Credit (you receive)"}
        </p>
        <p className={`text-lg font-bold ${metrics.isDebit ? "text-danger" : "text-success"}`}>
          {formatINR(Math.abs(metrics.netPremium))}
        </p>
      </div>

      {/* Legs breakdown */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
            Legs Breakdown
          </p>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {["Action", "Type", "Strike", "Premium", "Contracts"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-textMuted font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {legs.map((leg, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-surfaceAlt">
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    leg.action === "BUY"
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}>
                    {leg.action}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={leg.optionType === "CE" ? "text-success" : "text-danger"}>
                    {leg.optionType}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-textPrimary font-medium">
                  ₹{leg.strike.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-textSecondary">₹{leg.premium}</td>
                <td className="px-4 py-2.5 text-textMuted">
                  {leg.lots} lot{leg.lots > 1 ? "s" : ""} ({leg.lots * leg.lotSize})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MetricsPanel;