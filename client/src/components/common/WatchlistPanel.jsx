import { useSelector, useDispatch } from "react-redux";
import { Trash2 } from "lucide-react";
import { removeWatchlistItem, setActiveSymbol } from "../../store/slices/marketSlice";
import { formatPercent } from "../../utils/formatters";
import Loader from "./Loader";
import toast from "react-hot-toast";

const WatchlistPanel = () => {
  const dispatch = useDispatch();
  const { watchlist, watchlistLoading, activeSymbol } = useSelector((s) => s.market);

  const handleSelect = (item) => {
    dispatch(setActiveSymbol({ symbol: item.symbol, name: item.name }));
  };

  const handleRemove = async (e, symbol) => {
    e.stopPropagation();
    try {
      await dispatch(removeWatchlistItem(symbol)).unwrap();
      toast.success("Removed from watchlist");
    } catch (err) {
      toast.error(err);
    }
  };

  if (watchlistLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader size="sm" />
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-textMuted">Your watchlist is empty.</p>
        <p className="text-xs text-textMuted mt-1">Search and add stocks above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {watchlist.map((item) => {
        const isPositive = item.changePercent >= 0;
        const isActive   = activeSymbol === item.symbol;

        return (
          // ── Changed outer button → div with onClick ──────
          <div
            key={item.symbol}
            onClick={() => handleSelect(item)}
            className={`flex items-center justify-between px-4 py-3 cursor-pointer
              hover:bg-surfaceAlt transition-colors group border-l-2 ${
              isActive ? "border-primary bg-surfaceAlt" : "border-transparent"
            }`}
          >
            <div className="text-left min-w-0">
              <p className="text-xs font-medium text-textPrimary truncate max-w-[110px]">
                {item.name}
              </p>
              <p className="text-xs text-textMuted">{item.symbol}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-medium text-textPrimary">
                  {item.price ? `₹${item.price.toFixed(2)}` : "—"}
                </p>
                <p className={`text-xs font-medium ${
                  item.changePercent == null
                    ? "text-textMuted"
                    : isPositive ? "text-success" : "text-danger"
                }`}>
                  {item.changePercent != null ? formatPercent(item.changePercent) : "—"}
                </p>
              </div>

              {/* This is now a button inside a div — valid HTML */}
              <button
                onClick={(e) => handleRemove(e, item.symbol)}
                className="opacity-0 group-hover:opacity-100 p-1 text-textMuted
                  hover:text-danger rounded transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WatchlistPanel;