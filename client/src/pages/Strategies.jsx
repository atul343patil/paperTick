import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/common/Navbar";
import IndicesTicker from "../components/markets/IndicesTicker";
import StrategyCard from "../components/strategies/StrategyCard";
import StrategyParams from "../components/strategies/StrategyParams";
import PayoffChart from "../components/strategies/PayoffChart";
import MetricsPanel from "../components/strategies/MetricsPanel";
import CustomStrategyBuilder from "../components/strategies/CustomStrategyBuilder";
import {
  loadStrategyList, setSelectedStrategy,
  setMode, clearResult,
} from "../store/slices/strategySlice";
import { loadIndices } from "../store/slices/marketSlice";
import Loader from "../components/common/Loader";

const CATEGORY_FILTERS = ["All", "Volatility", "Directional", "Income"];

const Strategies = () => {
  const dispatch = useDispatch();
  const { list, listLoading, selectedId, result, mode } = useSelector((s) => s.strategy);
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    dispatch(loadStrategyList());
    dispatch(loadIndices());
  }, []);

  const filteredList = list.filter((s) =>
    categoryFilter === "All" || s.category === categoryFilter
  );

  const handleSelectStrategy = (id) => {
    dispatch(setSelectedStrategy(id));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <IndicesTicker />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 92px)" }}>

        {/* ── Left panel: strategy list ── */}
        <aside className="w-72 flex-shrink-0 bg-surface border-r border-border flex flex-col overflow-hidden">

          {/* Mode toggle */}
          <div className="p-3 border-b border-border">
            <div className="flex gap-1 bg-surfaceAlt rounded-lg p-1">
              {["predefined", "custom"].map((m) => (
                <button
                  key={m}
                  onClick={() => { dispatch(setMode(m)); dispatch(clearResult()); }}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                    mode === m
                      ? "bg-surface text-textPrimary shadow"
                      : "text-textSecondary hover:text-textPrimary"
                  }`}
                >
                  {m === "predefined" ? "Predefined" : "Custom Builder"}
                </button>
              ))}
            </div>
          </div>

          {mode === "predefined" && (
            <>
              {/* Category filter */}
              <div className="px-3 py-2 border-b border-border flex gap-1 flex-wrap">
                {CATEGORY_FILTERS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      categoryFilter === cat
                        ? "bg-primary/10 text-primary"
                        : "text-textMuted hover:text-textSecondary"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Strategy list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {listLoading ? (
                  <div className="flex justify-center py-8"><Loader /></div>
                ) : (
                  filteredList.map((s) => (
                    <StrategyCard
                      key={s.id}
                      strategy={s}
                      isSelected={selectedId === s.id}
                      onClick={() => handleSelectStrategy(s.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {mode === "custom" && (
            <div className="flex-1 overflow-y-auto p-3">
              <CustomStrategyBuilder />
            </div>
          )}
        </aside>

        {/* ── Right panel: params + chart + metrics ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">

          {/* No strategy selected */}
          {!selectedId && mode === "predefined" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-textPrimary font-semibold mb-2">Select a Strategy</p>
              <p className="text-textMuted text-sm max-w-sm">
                Choose a predefined strategy from the left panel, enter your parameters, and analyze the payoff diagram
              </p>
            </div>
          )}

          {/* Predefined strategy selected */}
          {selectedId && mode === "predefined" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Strategy header */}
              <div>
                <p className="text-lg font-semibold text-textPrimary">
                  {list.find((s) => s.id === selectedId)?.name}
                </p>
                <p className="text-sm text-textMuted mt-1">
                  {list.find((s) => s.id === selectedId)?.description}
                </p>
              </div>

              {/* Parameters input */}
              <StrategyParams strategyId={selectedId} />

              {/* Payoff chart */}
              {result && <PayoffChart />}

              {/* Metrics */}
              {result && <MetricsPanel />}
            </div>
          )}

          {/* Custom mode — show chart/metrics after analysis */}
          {mode === "custom" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <p className="text-textSecondary text-sm font-medium">
                    Build your strategy on the left
                  </p>
                  <p className="text-textMuted text-xs mt-1">
                    Add legs, set strikes and premiums, then click Analyze
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-lg font-semibold text-textPrimary">Custom Strategy Analysis</p>
                  <PayoffChart />
                  <MetricsPanel />
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Strategies;