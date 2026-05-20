import { useSelector } from "react-redux";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPercent } from "../../utils/formatters";

const IndicesTicker = () => {
  const { indices } = useSelector((s) => s.market);

  if (indices.length === 0) return null;

  return (
    <div className="h-9 border-b border-border bg-surface flex items-center overflow-x-auto gap-6 px-6">
      {indices.map((idx) => {
        const isPositive = idx.changePercent >= 0;
        return (
          <div key={idx.symbol} className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-textSecondary">{idx.name}</span>
            <span className="text-xs font-medium text-textPrimary">
              {idx.price?.toFixed(2)}
            </span>
            <span className={`text-xs flex items-center gap-0.5 ${isPositive ? "text-success" : "text-danger"}`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {formatPercent(idx.changePercent)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default IndicesTicker;