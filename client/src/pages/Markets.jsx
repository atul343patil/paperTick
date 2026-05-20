import Navbar from "../components/common/Navbar";
import IndicesTicker from "../components/markets/IndicesTicker";
import SearchBar from "../components/common/SearchBar";
import WatchlistPanel from "../components/common/WatchlistPanel";
import CandlestickChart from "../components/charts/CandlestickChart";
import ChartControls from "../components/markets/ChartControls";
import QuotePanel from "../components/markets/QuotePanel";
import useMarketData from "../hooks/useMarketData";

const Markets = () => {
  useMarketData();

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <Navbar />           {/* 56px */}
      <IndicesTicker />    {/* 36px */}

      {/* Everything below navbar + ticker */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left sidebar */}
        <aside
          className="flex-shrink-0 bg-surface border-r border-border flex flex-col overflow-hidden"
          style={{ width: "256px" }}
        >
          <div className="p-3 border-b border-border flex-shrink-0">
            <SearchBar />
          </div>
          <div className="px-4 py-2 border-b border-border flex-shrink-0">
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
              Watchlist
            </p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <WatchlistPanel />
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Quote strip */}
          <div className="bg-surface border-b border-border flex-shrink-0">
            <QuotePanel />
          </div>

          {/* Interval buttons */}
          <div className="flex-shrink-0">
            <ChartControls />
          </div>

          {/* Chart — takes all remaining space */}
          <div className="flex-1 bg-surface overflow-hidden min-h-0">
            <CandlestickChart showMA showVolume />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Markets;