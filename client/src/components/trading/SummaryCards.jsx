import { useSelector } from "react-redux";
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from "lucide-react";
import { formatINR, formatPercent } from "../../utils/formatters";

const Card = ({ icon, label, value, sub, color = "text-textPrimary" }) => (
  <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-surfaceAlt flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-textMuted mb-0.5">{label}</p>
      <p className={`text-base font-semibold ${color} truncate`}>{value}</p>
      {sub && <p className="text-xs text-textMuted mt-0.5">{sub}</p>}
    </div>
  </div>
);

const SummaryCards = () => {
  const { summary } = useSelector((s) => s.portfolio);
  const { user } = useSelector((s) => s.auth);

  const balance = summary?.virtualBalance ?? user?.virtualBalance ?? 100000;
  const portfolioValue = summary?.portfolioValue ?? balance;
  const unrealizedPnL = summary?.totalUnrealizedPnL ?? 0;
  const realizedPnL = summary?.totalRealizedPnL ?? 0;
  const invested = summary?.totalInvested ?? 0;
  const chargesPaid = summary?.totalChargesPaid ?? 0;

  const isUnrealizedUp = unrealizedPnL >= 0;
  const isRealizedUp = realizedPnL >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border">
      <Card
        icon={<Wallet size={16} className="text-primary" />}
        label="Available Balance"
        value={formatINR(balance)}
        sub={`Portfolio: ${formatINR(portfolioValue)}`}
        color="text-primary"
      />
      <Card
        icon={<BarChart2 size={16} className="text-textSecondary" />}
        label="Total Invested"
        value={formatINR(invested)}
        sub={`Charges paid: ${formatINR(chargesPaid)}`}
      />
      <Card
        icon={
          isUnrealizedUp
            ? <TrendingUp size={16} className="text-success" />
            : <TrendingDown size={16} className="text-danger" />
        }
        label="Unrealized P&L"
        value={formatINR(unrealizedPnL)}
        sub={summary ? formatPercent(summary.totalUnrealizedPnLPercent) : "—"}
        color={isUnrealizedUp ? "text-success" : "text-danger"}
      />
      <Card
        icon={
          isRealizedUp
            ? <TrendingUp size={16} className="text-success" />
            : <TrendingDown size={16} className="text-danger" />
        }
        label="Realized P&L"
        value={formatINR(realizedPnL)}
        sub="Net of all charges"
        color={isRealizedUp ? "text-success" : "text-danger"}
      />
    </div>
  );
};

export default SummaryCards;