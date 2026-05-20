import { useState, useRef, useEffect } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { searchSymbols } from "../../api/marketApi";
import { useDispatch } from "react-redux";
import { addWatchlistItem, setActiveSymbol } from "../../store/slices/marketSlice";
import toast from "react-hot-toast";

const SearchBar = () => {
  const dispatch = useDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchSymbols(query.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
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
  };

  const handleAddWatchlist = async (e, item) => {
    e.stopPropagation();
    try {
      await dispatch(addWatchlistItem({
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
      })).unwrap();
      toast.success(`${item.name} added to watchlist`);
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surfaceAlt border border-border rounded-lg px-3 py-2">
        {searching ? (
          <Loader2 size={14} className="text-textMuted animate-spin flex-shrink-0" />
        ) : (
          <Search size={14} className="text-textMuted flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks, indices..."
          className="bg-transparent text-xs text-textPrimary placeholder-textMuted flex-1 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }}>
            <X size={12} className="text-textMuted hover:text-textSecondary" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((item) => (
            <button
              key={item.symbol}
              onClick={() => handleSelectChart(item)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surfaceAlt transition-colors group text-left"
            >
              <div>
                <p className="text-xs font-medium text-textPrimary">{item.name}</p>
                <p className="text-xs text-textMuted">{item.symbol} · {item.exchange}</p>
              </div>
              <button
                onClick={(e) => handleAddWatchlist(e, item)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/20 rounded text-textSecondary hover:text-primary transition-all"
                title="Add to watchlist"
              >
                <Plus size={14} />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;