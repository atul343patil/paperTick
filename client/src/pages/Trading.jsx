import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/common/Navbar";
import IndicesTicker from "../components/markets/IndicesTicker";
import SearchBar from "../components/common/SearchBar";
import WatchlistPanel from "../components/common/WatchlistPanel";
import CandlestickChart from "../components/charts/CandlestickChart";
import ChartControls from "../components/markets/ChartControls";
import OrderForm from "../components/trading/OrderForm";
import PortfolioTable from "../components/trading/PortfolioTable";
import OrderHistory from "../components/trading/OrderHistory";
import SummaryCards from "../components/trading/SummaryCards";
import { loadPortfolio, loadOrders } from "../store/slices/portfolioSlice";
import { loadIndices, setActiveSymbol, loadChart, loadQuote } from "../store/slices/marketSlice";
import useMarketData from "../hooks/useMarketData";

const TABS = ["Holdings", "Order History"];

const Trading = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("Holdings");
  const { activeSymbol, activeSymbolName, quote } = useSelector((s) => s.market);

  useMarketData();

  useEffect(() => {
    dispatch(loadPortfolio());
    dispatch(loadOrders({ limit: 50 }));
    dispatch(loadIndices());
  }, []);

  const handleSelectStock = ({ symbol, name }) => {
    dispatch(setActiveSymbol({ symbol, name }));
    dispatch(loadChart({ symbol, interval: "1d", range: "3mo" }));
    dispatch(loadQuote(symbol));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <IndicesTicker />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 92px)" }}>

        {/* ── Left Sidebar ── */}
        <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <SearchBar />
          </div>
          <div className="px-4 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
              Watchlist
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <WatchlistPanel />
          </div>
        </aside>

        {/* ── Center: Chart + Portfolio ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Summary cards */}
          <SummaryCards />

          {/* Chart area */}
          <div className="flex-1 flex flex-col overflow-hidden border-b border-border" style={{ maxHeight: "55%" }}>
            <ChartControls />
            <div className="flex-1 bg-surface overflow-hidden">
              <CandlestickChart showMA showVolume />
            </div>
          </div>

          {/* Portfolio tabs */}
          <div className="flex flex-col overflow-hidden" style={{ height: "45%" }}>
            <div className="flex border-b border-border px-4 bg-surface">
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
            <div className="flex-1 overflow-y-auto bg-surface">
              {activeTab === "Holdings" ? (
                <PortfolioTable onSelectStock={handleSelectStock} />
              ) : (
                <OrderHistory />
              )}
            </div>
          </div>
        </main>

        {/* ── Right: Order Form ── */}
        <aside className="w-72 flex-shrink-0 border-l border-border bg-surface overflow-y-auto p-4">
          <OrderForm
            symbol={activeSymbol}
            name={activeSymbolName}
            currentPrice={quote?.regularMarketPrice || null}
          />

          {/* Quick info below order form */}
          {quote && (
            <div className="mt-4 bg-surfaceAlt rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">
                Market Info
              </p>
              {[
                ["Open", `₹${quote.regularMarketOpen?.toFixed(2) ?? "—"}`],
                ["High", `₹${quote.regularMarketDayHigh?.toFixed(2) ?? "—"}`],
                ["Low", `₹${quote.regularMarketDayLow?.toFixed(2) ?? "—"}`],
                ["Prev Close", `₹${quote.regularMarketPreviousClose?.toFixed(2) ?? "—"}`],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-xs text-textMuted">{l}</span>
                  <span className="text-xs text-textSecondary font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Trading;