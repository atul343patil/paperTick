import { useSelector } from "react-redux";
import { formatINR } from "../../utils/formatters";
import { TrendingUp, TrendingDown, Target, Activity } from "lucide-react";

const MetricCard = ({ icon, label, value, subValue, color, badge }) => (
  <div className="bg-surfaceAlt rounded-xl p-4 flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-textMuted mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-semibold ${color}`}>{value}</p>
        {badge && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-surfaceAlt border border-border text-textMuted">
            {badge}
          </span>
        )}
      </div>
      {subValue && (
        <p className="text-xs text-textMuted mt-0.5">{subValue}</p>
      )}
    </div>
  </div>
);

const MetricsPanel = () => {
  const { result } = useSelector((s) => s.strategy);
  if (!result) return null;

  const { metrics, legs } = result;

  const fmtProfit = (val) => {
    if (val === "Unlimited") return "Unlimited";
    if (typeof val === "number") return formatINR(val);
    return val;
  };

  const fmtLoss = (val) => {
    if (val === "Unlimited") return "Unlimited";
    if (typeof val === "number") return formatINR(Math.abs(val));
    return val;
  };

  const maxProfitColor = metrics.maxProfit === "Unlimited" ? "text-success"
    : metrics.maxProfit > 0 ? "text-success" : "text-textMuted";

  const maxLossColor = metrics.maxLoss === "Unlimited" ? "text-danger"
    : typeof metrics.maxLoss === "number" && metrics.maxLoss < 0 ? "text-danger"
    : "text-textMuted";

  return (
    <div className="space-y-4">

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<TrendingUp size={15} className="text-success" />}
          label="Max Profit"
          value={fmtProfit(metrics.maxProfit)}
          color={maxProfitColor}
          badge={metrics.maxProfit === "Unlimited" ? "No cap" : null}
        />
        <MetricCard
          icon={<TrendingDown size={15} className="text-danger" />}
          label="Max Loss"
          value={fmtLoss(metrics.maxLoss)}
          color={maxLossColor}
          badge={metrics.maxLoss === "Unlimited" ? "Margin req." : null}
          subValue={typeof metrics.maxLoss === "number" && metrics.maxLoss < 0
            ? "Maximum risk on position" : null}
        />
        <MetricCard
          icon={<Target size={15} className="text-warning" />}
          label={`Breakeven${metrics.breakevens.length > 1 ? "s" : ""}`}
          value={
            metrics.breakevens.length > 0
              ? metrics.breakevens.map((b) =>
                  `₹${Math.round(b).toLocaleString("en-IN")}`
                ).join(" & ")
              : "None"
          }
          color="text-warning"
          subValue={metrics.breakevens.length === 2
            ? `Range: ₹${Math.round(
                metrics.breakevens[1] - metrics.breakevens[0]
              ).toLocaleString("en-IN")} wide`
            : null}
        />
        <MetricCard
          icon={<Activity size={15} className="text-primary" />}
          label="Risk / Reward"
          value={
            metrics.riskReward
              ? `1 : ${metrics.riskReward}`
              : metrics.hasUnlimitedProfit
              ? "1 : ∞"
              : metrics.hasUnlimitedLoss
              ? "∞ : 1"
              : "—"
          }
          color="text-primary"
          subValue={metrics.riskReward
            ? `Earn ₹${metrics.riskReward} per ₹1 risked`
            : null}
        />
      </div>

      {/* Net premium card */}
      <div className={`rounded-xl p-4 border ${
        metrics.isDebit
          ? "bg-danger/5 border-danger/20"
          : "bg-success/5 border-success/20"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-textMuted mb-1">
              {metrics.isDebit
                ? "Net Debit — you pay this upfront"
                : "Net Credit — you receive this upfront"}
            </p>
            <p className={`text-xl font-bold ${
              metrics.isDebit ? "text-danger" : "text-success"
            }`}>
              {formatINR(Math.abs(metrics.netPremium))}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
            metrics.isDebit
              ? "bg-danger/10 text-danger"
              : "bg-success/10 text-success"
          }`}>
            {metrics.isDebit ? "DEBIT" : "CREDIT"}
          </div>
        </div>
      </div>

      {/* Legs breakdown table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
            Legs Breakdown
          </p>
          <span className="text-xs text-textMuted">
            {legs.length} leg{legs.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surfaceAlt">
                {["#", "Action", "Type", "Strike", "Premium", "Qty", "Value"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-textMuted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => {
                const contracts = leg.lots * leg.lotSize;
                const legValue  = leg.premium * contracts;
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-surfaceAlt transition-colors">
                    <td className="px-3 py-2.5 text-textMuted">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        leg.action === "BUY"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}>
                        {leg.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${
                        leg.optionType === "CE" ? "text-success" : "text-danger"
                      }`}>
                        {leg.optionType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-textPrimary font-medium">
                      ₹{leg.strike.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2.5 text-textSecondary">₹{leg.premium}</td>
                    <td className="px-3 py-2.5 text-textMuted">
                      {leg.lots}L ({contracts})
                    </td>
                    <td className={`px-3 py-2.5 font-medium ${
                      leg.action === "BUY" ? "text-danger" : "text-success"
                    }`}>
                      {leg.action === "BUY" ? "-" : "+"}{formatINR(legValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;