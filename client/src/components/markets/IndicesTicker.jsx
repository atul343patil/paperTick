import { useSelector } from "react-redux";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPercent } from "../../utils/formatters";
import { useEffect, useState } from "react";

const IndicesTicker = () => {
  const { indices } = useSelector((s) => s.market);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Track when indices data last changed
  useEffect(() => {
    if (indices.length > 0) {
      setLastUpdated(new Date());
    }
  }, [indices]);

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  if (indices.length === 0) {
    return (
      <div className="h-9 border-b border-border bg-surface flex items-center px-6 gap-6">
        {["Nifty 50", "Bank Nifty"].map((name) => (
          <div key={name} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-textSecondary">{name}</span>
            <span className="text-xs text-textMuted">—</span>
          </div>
        ))}
        <span className="text-xs text-textMuted ml-auto">
          Market data unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="h-9 border-b border-border bg-surface flex items-center overflow-x-auto gap-6 px-6">
      {indices.map((idx) => {
        const isPositive = idx.changePercent >= 0;
        return (
          <div key={idx.symbol} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-textSecondary">{idx.name}</span>
            <span className="text-xs font-semibold text-textPrimary">
              {idx.price ? idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
            </span>
            <span className={`text-xs flex items-center gap-0.5 font-medium ${isPositive ? "text-success" : "text-danger"}`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {formatPercent(idx.changePercent)}
            </span>
          </div>
        );
      })}

      {/* Live indicator */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {timeStr && (
          <span className="text-xs text-textMuted">{timeStr}</span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">LIVE</span>
        </span>
      </div>
    </div>
  );
};

export default IndicesTicker;