import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/common/Navbar";
import IndicesTicker from "../components/markets/IndicesTicker";
import OptionChainTable from "../components/options/OptionChainTable";
import OptionTradeModal from "../components/options/OptionTradeModal";
import PositionsTable from "../components/options/PositionsTable";
import {
  loadOptionChain, loadPositions,
  setSelectedSymbol, setSelectedExpiry,
} from "../store/slices/optionsSlice";
import { loadIndices } from "../store/slices/marketSlice";
import Loader from "../components/common/Loader";

const SYMBOLS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"];
const TABS    = ["Option Chain", "My Positions"];

const Options = () => {
  const dispatch = useDispatch();
  const {
    chain, chainLoading, selectedSymbol,
    selectedExpiry, expiryDates,
  } = useSelector((s) => s.options);

  const [activeTab, setActiveTab] = useState("Option Chain");
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    dispatch(loadOptionChain(selectedSymbol));
    dispatch(loadPositions());
    dispatch(loadIndices());
  }, [selectedSymbol]);

  const handleSymbolChange = (sym) => {
    dispatch(setSelectedSymbol(sym));
  };

  const handleExpiryChange = (exp) => {
    dispatch(setSelectedExpiry(exp));
  };

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

          {/* Expiry selector */}
          {chain?.expiryDates?.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-textMuted">Expiry</span>
              <div className="flex gap-1 flex-wrap">
                {chain.expiryDates.slice(0, 5).map((exp) => (
                  <button
                    key={exp}
                    onClick={() => handleExpiryChange(exp)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      selectedExpiry === exp
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "bg-surfaceAlt text-textSecondary hover:text-textPrimary"
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Underlying price */}
          {chain?.underlyingValue && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-textMuted">{selectedSymbol}</span>
              <span className="text-sm font-semibold text-textPrimary">
                ₹{chain.underlyingValue.toLocaleString("en-IN")}
              </span>
            </div>
          )}
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
          <span className="text-textMuted ml-auto">Click LTP to trade</span>
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
        <div className="flex-1 overflow-auto bg-background">
          {activeTab === "Option Chain" ? (
            chainLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader />
              </div>
            ) : (
              <OptionChainTable onSelectOption={setSelectedOption} />
            )
          ) : (
            <PositionsTable />
          )}
        </div>
      </div>
    </div>
  );
};

export default Options;