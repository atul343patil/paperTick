import { useSelector } from "react-redux";
import { formatINR, formatCompact, formatChange, formatPercent, formatVolume } from "../../utils/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

const StatItem = ({ label, value }) => (
  <div>
    <p className="text-xs text-textMuted mb-0.5">{label}</p>
    <p className="text-xs font-medium text-textPrimary">{value}</p>
  </div>
);

const QuotePanel = () => {
  const { quote, activeSymbolName } = useSelector((s) => s.market);

  if (!quote) return null;

  const isPositive = quote.regularMarketChange >= 0;

  return (
    <div className="px-4 py-3 border-b border-border">
      {/* Price row */}
      <div className="flex items-baseline gap-3 mb-3">
        <div>
          <p className="text-xs text-textSecondary mb-0.5">{activeSymbolName}</p>
          <p className="text-2xl font-semibold text-textPrimary">
            ₹{quote.regularMarketPrice?.toFixed(2)}
          </p>
        </div>
        <div className={`flex items-center gap-1 ${isPositive ? "text-success" : "text-danger"}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="text-sm font-medium">
            {formatChange(quote.regularMarketChange)}
          </span>
          <span className="text-sm">
            ({formatPercent(quote.regularMarketChangePercent)})
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatItem label="Open" value={`₹${quote.regularMarketOpen?.toFixed(2) ?? "—"}`} />
        <StatItem label="Prev Close" value={`₹${quote.regularMarketPreviousClose?.toFixed(2) ?? "—"}`} />
        <StatItem
          label="Day High"
          value={<span className="text-success">₹{quote.regularMarketDayHigh?.toFixed(2) ?? "—"}</span>}
        />
        <StatItem
          label="Day Low"
          value={<span className="text-danger">₹{quote.regularMarketDayLow?.toFixed(2) ?? "—"}</span>}
        />
        <StatItem label="Volume" value={formatVolume(quote.regularMarketVolume)} />
        <StatItem label="52W High" value={`₹${quote.fiftyTwoWeekHigh?.toFixed(2) ?? "—"}`} />
        {quote.marketCap && (
          <StatItem label="Market Cap" value={formatCompact(quote.marketCap)} />
        )}
        <StatItem label="52W Low" value={`₹${quote.fiftyTwoWeekLow?.toFixed(2) ?? "—"}`} />
      </div>
    </div>
  );
};

export default QuotePanel;