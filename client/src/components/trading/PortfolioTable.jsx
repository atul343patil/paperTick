import { useSelector } from "react-redux";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatINR, formatPercent, formatChange } from "../../utils/formatters";
import Loader from "../common/Loader";

const PortfolioTable = ({ onSelectStock }) => {
  const { holdings, loading } = useSelector((s) => s.portfolio);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-textSecondary text-sm font-medium">No holdings yet</p>
        <p className="text-textMuted text-xs mt-1">
          Buy stocks from the order form to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {["Stock", "Qty", "Avg Buy", "LTP", "Invested", "Current", "P&L", "Day"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-textMuted font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const isUp = h.unrealizedPnL >= 0;
            const isDayUp = h.dayChange >= 0;

            return (
              <tr
                key={h.symbol}
                onClick={() => onSelectStock?.({ symbol: h.symbol, name: h.name })}
                className="border-b border-border/50 hover:bg-surfaceAlt transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-textPrimary">{h.symbol}</p>
                  <p className="text-textMuted truncate max-w-[120px]">{h.name}</p>
                </td>
                <td className="px-4 py-3 text-textPrimary">{h.quantity}</td>
                <td className="px-4 py-3 text-textSecondary">₹{h.avgBuyPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-textPrimary font-medium">₹{h.currentPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-textSecondary">{formatINR(h.totalInvested)}</td>
                <td className="px-4 py-3 text-textSecondary">{formatINR(h.currentValue)}</td>
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-1 ${isUp ? "text-success" : "text-danger"}`}>
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <div>
                      <p className="font-medium">{formatINR(h.unrealizedPnL)}</p>
                      <p className="text-xs opacity-80">{formatPercent(h.unrealizedPnLPercent)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`${isDayUp ? "text-success" : "text-danger"}`}>
                    {formatChange(h.dayChange)} ({formatPercent(h.dayChangePercent)})
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PortfolioTable;