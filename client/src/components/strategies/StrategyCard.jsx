const DIRECTION_COLORS = {
  Bullish: "text-success bg-success/10 border-success/20",
  Bearish: "text-danger bg-danger/10 border-danger/20",
  Neutral: "text-primary bg-primary/10 border-primary/20",
};

const CATEGORY_COLORS = {
  Volatility: "text-purple-400",
  Directional: "text-warning",
  Income: "text-success",
};

const StrategyCard = ({ strategy, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-surface hover:border-primary/40 hover:bg-surfaceAlt"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-textPrimary leading-tight">
          {strategy.name}
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${DIRECTION_COLORS[strategy.direction]}`}>
          {strategy.direction}
        </span>
      </div>

      <p className="text-xs text-textMuted leading-relaxed mb-3">
        {strategy.description}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${CATEGORY_COLORS[strategy.category]}`}>
          {strategy.category}
        </span>
        <span className="text-textMuted">{strategy.legs} legs</span>
      </div>

      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-1 text-xs">
        <div>
          <span className="text-textMuted">Max Profit </span>
          <span className="text-success">{strategy.maxProfit}</span>
        </div>
        <div>
          <span className="text-textMuted">Max Loss </span>
          <span className="text-danger">{strategy.maxLoss}</span>
        </div>
      </div>
    </button>
  );
};

export default StrategyCard;