import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadChart, loadQuote, loadWatchlist,
  loadIndices, refreshWatchlistPrices,
} from "../store/slices/marketSlice";

const useMarketData = () => {
  const dispatch = useDispatch();
  const { activeSymbol, chartInterval, chartRange, watchlist } = useSelector(
    (s) => s.market
  );
  const pollingRef    = useRef(null);
  const initialLoaded = useRef(false);

  // Load chart + quote when symbol or interval changes
  useEffect(() => {
    dispatch(loadChart({ symbol: activeSymbol, interval: chartInterval, range: chartRange }));
    dispatch(loadQuote(activeSymbol));
  }, [activeSymbol, chartInterval, chartRange]);

  // Load watchlist + indices once on first mount
  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    dispatch(loadWatchlist());
    dispatch(loadIndices());
  }, []);

  // Poll watchlist prices every 20 seconds
  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (watchlist.length === 0) return;

    const symbols = watchlist.map((w) => w.symbol);

    // Immediate first poll
    dispatch(refreshWatchlistPrices(symbols));
    dispatch(loadIndices());

    pollingRef.current = setInterval(() => {
      dispatch(refreshWatchlistPrices(symbols));
      dispatch(loadQuote(activeSymbol));
      dispatch(loadIndices());
    }, 20000);

    return () => clearInterval(pollingRef.current);
  }, [watchlist.length, activeSymbol]);
};

export default useMarketData;