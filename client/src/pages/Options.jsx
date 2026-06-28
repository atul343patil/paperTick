import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/common/Navbar";
import IndicesTicker from "../components/markets/IndicesTicker";
import OptionChainTable from "../components/options/OptionChainTable";
import OptionTradeModal from "../components/options/OptionTradeModal";
import PositionsTable from "../components/options/PositionsTable";
import BasketOrderPanel from "../components/options/BasketOrderPanel";
import {
  loadOptionChain, loadPositionsLive,
  setSelectedSymbol, setSelectedExpiry,
} from "../store/slices/optionsSlice";
import { loadIndices } from "../store/slices/marketSlice";
import Loader from "../components/common/Loader";
import toast from "react-hot-toast";

const SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"];
const TABS    = ["Option Chain", "My Positions"];

const Options = () => {
  const dispatch = useDispatch();
  const {
    chain, chainLoading, selectedSymbol,
    selectedExpiry,
  } = useSelector((s) => s.options);

  const [activeTab, setActiveTab] = useState("Option Chain");
  const [selectedOption, setSelectedOption] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [basket, setBasket] = useState([]);

  useEffect(() => {
    dispatch(loadOptionChain(selectedSymbol));
    dispatch(loadPositionsLive());
    dispatch(loadIndices());
  }, [selectedSymbol]);

  // Track last updated time when chain changes
  useEffect(() => {
    if (chain) setLastUpdated(new Date());
  }, [chain]);

  // Auto-refresh polling: 10s during market hours, 60s otherwise
  useEffect(() => {
    const isMarketHours = () => {
      const now = new Date();
      const day = now.getDay(); // 0=Sun, 6=Sat
      if (day === 0 || day === 6) return false;
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const hours = ist.getHours();
      const minutes = ist.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      return totalMinutes >= 555 && totalMinutes <= 930; // 9:15 to 15:30
    };

    const interval = isMarketHours() ? 10000 : 60000;

    const timer = setInterval(() => {
      dispatch(loadOptionChain(selectedSymbol));
    }, interval);

    return () => clearInterval(timer);
  }, [selectedSymbol]);

  const handleSymbolChange = (sym) => {
    dispatch(setSelectedSymbol(sym));
  };

  const handleExpiryChange = (exp) => {
    dispatch(setSelectedExpiry(exp));
  };

  // Basket order functions
  const addToBasket = (option, action) => {
    setBasket((prev) => [...prev, {
      underlying:  option.underlying || selectedSymbol,
      expiry:      option.expiryDate || selectedExpiry,
      strikePrice: option.strikePrice,
      optionType:  option.optionType, // "CE" or "PE"
      action,      // "BUY" or "SELL"
      lots:        1,
      premium:     option.premium,
    }]);
    toast.success(`Added to basket: ${action} ${option.strikePrice} ${option.optionType}`);
  };

  const removeFromBasket = (idx) => setBasket((p) => p.filter((_, i) => i !== idx));
  const clearBasket      = ()    => setBasket([]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <IndicesTicker />

      {/* Trade modal */}
      {selectedOption && (
        <OptionTradeModal
          option={selectedOption}
          onClose={() => setSelectedOption(null)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top controls bar ── */}
        <div className="bg-surface border-b border-border px-6 py-3 flex items-center gap-6 flex-wrap">

          {/* Underlying selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-textMuted">Underlying</span>
            <div className="flex gap-1">
              {SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleSymbolChange(sym)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    selectedSymbol === sym
                      ? "bg-primary text-white"
                      : "bg-surfaceAlt text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry selector — show ALL expiries with W/M badges */}
          {chain?.expiryDates?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-textMuted">Expiry</span>
              <div className="flex gap-1 flex-wrap">
                {chain.expiryDates.map((exp, idx) => {
                  // First expiry = current/nearest weekly
                  // Mark monthly = last Thursday of month (approx: day >= 24)
                  const day = parseInt(exp.split("-")[0]);
                  const isMonthly = day >= 24;
                  const isNearest = idx === 0;
                  return (
                    <button
                      key={exp}
                      onClick={() => handleExpiryChange(exp)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors
                        relative ${selectedExpiry === exp
                          ? "bg-primary/20 text-primary border border-primary/40"
                          : "bg-surfaceAlt text-textSecondary hover:text-textPrimary"
                        }`}
                    >
                      {exp}
                      {isNearest && (
                        <span className="absolute -top-1.5 -right-1 text-xs bg-success
                          text-white px-1 rounded-full" style={{fontSize:"8px"}}>
                          W
                        </span>
                      )}
                      {isMonthly && !isNearest && (
                        <span className="absolute -top-1.5 -right-1 text-xs bg-warning
                          text-white px-1 rounded-full" style={{fontSize:"8px"}}>
                          M
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Underlying price + last updated */}
          <div className="ml-auto flex items-center gap-4">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-textMuted">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Updated {lastUpdated.toLocaleTimeString("en-IN")}
              </div>
            )}
            {chain?.underlyingValue && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted">{selectedSymbol}</span>
                <span className="text-sm font-semibold text-textPrimary">
                  ₹{chain.underlyingValue.toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="bg-surface border-b border-border px-6 py-2 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/40" />
            <span className="text-textMuted">ATM — At the Money</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success/10" />
            <span className="text-textMuted">ITM — In the Money</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-surfaceAlt" />
            <span className="text-textMuted">OTM — Out of the Money</span>
          </div>
          <span className="text-textMuted ml-auto">Click LTP to trade · Hover for B/S basket buttons</span>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-surface border-b border-border px-6 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-textSecondary hover:text-textPrimary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div
          className="flex-1 overflow-auto bg-background"
          style={{ paddingBottom: basket.length > 0 ? "140px" : "0" }}
        >
          {activeTab === "Option Chain" ? (
            chainLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader />
              </div>
            ) : (
              <OptionChainTable
                onSelectOption={setSelectedOption}
                onAddToBasket={addToBasket}
              />
            )
          ) : (
            <PositionsTable />
          )}
        </div>
      </div>

      {/* Basket Order Panel */}
      <BasketOrderPanel
        basket={basket}
        onRemove={removeFromBasket}
        onClear={clearBasket}
      />
    </div>
  );
};

export default Options;