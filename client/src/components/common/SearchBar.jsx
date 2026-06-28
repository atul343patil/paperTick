import { useState, useRef, useEffect } from "react";
import { Search, X, Plus, Loader2, TrendingUp } from "lucide-react";
import { searchSymbols as searchApi } from "../../api/marketApi";
import { useDispatch } from "react-redux";
import { addWatchlistItem, setActiveSymbol, loadWatchlist } from "../../store/slices/marketSlice";
import toast from "react-hot-toast";

const EXCHANGE_COLORS = {
  NSE: "text-primary bg-primary/10",
  BSE: "text-warning bg-warning/10",
  INDEX: "text-purple-400 bg-purple-400/10",
};

const SearchBar = () => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false); // has a search been attempted
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setSearched(false);
      return;
    }

    // Open dropdown immediately to show "Searching..." state
    setOpen(true);
    setSearching(true);
    setSearched(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchApi(query.trim());
        setResults(data || []);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelectChart = (item) => {
    dispatch(setActiveSymbol({ symbol: item.symbol, name: item.name }));
    setQuery("");
    setOpen(false);
    setResults([]);
    setSearched(false);
  };

  const handleAddWatchlist = async (e, item) => {
    e.stopPropagation();
    try {
      await dispatch(addWatchlistItem({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
      })).unwrap();
      dispatch(loadWatchlist());
      toast.success(`${item.name} added to watchlist`);
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Already in watchlist");
    }
  };

  const clearSearch = () => {
    setQuery("");
    setOpen(false);
    setResults([]);
    setSearched(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className={`flex items-center gap-2 bg-surfaceAlt border rounded-lg px-3 py-2 transition-colors ${
        open ? "border-primary" : "border-border"
      }`}>
        {searching
          ? <Loader2 size={14} className="text-textMuted animate-spin flex-shrink-0" />
          : <Search size={14} className="text-textMuted flex-shrink-0" />
        }
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          placeholder="Search stocks, indices..."
          className="bg-transparent text-xs text-textPrimary placeholder-textMuted flex-1 outline-none"
        />
        {query && (
          <button onClick={clearSearch} className="flex-shrink-0">
            <X size={12} className="text-textMuted hover:text-textSecondary" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden">

          {/* Searching state */}
          {searching && (
            <div className="flex items-center gap-2 px-3 py-3">
              <Loader2 size={13} className="text-textMuted animate-spin" />
              <span className="text-xs text-textMuted">
                Searching for &ldquo;{query}&rdquo;...
              </span>
            </div>
          )}

          {/* Results */}
          {!searching && results.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-b border-border">
                <span className="text-xs text-textMuted">
                  {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
                </span>
              </div>
              {results.map((item) => {
                const exchangeColor = EXCHANGE_COLORS[item.exchange] || "text-textMuted bg-surfaceAlt";
                return (
                  <button
                    key={item.symbol}
                    onClick={() => handleSelectChart(item)}
                    className="w-full flex items-center justify-between px-3 py-2.5
                      hover:bg-surfaceAlt transition-colors group text-left
                      border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center
                        justify-center flex-shrink-0">
                        <TrendingUp size={12} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-textPrimary truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-textMuted">{item.symbol}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${exchangeColor}`}>
                        {item.exchange}
                      </span>
                      <button
                        onClick={(e) => handleAddWatchlist(e, item)}
                        className="opacity-0 group-hover:opacity-100 p-1
                          hover:bg-primary/20 rounded text-textSecondary
                          hover:text-primary transition-all"
                        title="Add to watchlist"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Not found state */}
          {!searching && searched && results.length === 0 && (
            <div className="px-4 py-5 text-center">
              <div className="w-8 h-8 rounded-full bg-surfaceAlt flex items-center
                justify-center mx-auto mb-2">
                <Search size={14} className="text-textMuted" />
              </div>
              <p className="text-xs font-medium text-textSecondary mb-0.5">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-textMuted">
                Try searching by company name or NSE symbol
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;