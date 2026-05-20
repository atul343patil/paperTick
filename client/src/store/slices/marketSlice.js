import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchIndices,
  fetchQuote,
  fetchChart,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  fetchBatchQuotes,
} from "../../api/marketApi";

// ── Thunks ────────────────────────────────────────────────

export const loadIndices = createAsyncThunk("market/loadIndices", async (_, { rejectWithValue }) => {
  try { return await fetchIndices(); }
  catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load indices"); }
});

export const loadQuote = createAsyncThunk("market/loadQuote", async (symbol, { rejectWithValue }) => {
  try { return await fetchQuote(symbol); }
  catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load quote"); }
});

export const loadChart = createAsyncThunk(
  "market/loadChart",
  async ({ symbol, interval, range }, { rejectWithValue }) => {
    try { return await fetchChart(symbol, interval, range); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load chart"); }
  }
);

export const loadWatchlist = createAsyncThunk("market/loadWatchlist", async (_, { rejectWithValue }) => {
  try { return await fetchWatchlist(); }
  catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load watchlist"); }
});

export const addWatchlistItem = createAsyncThunk(
  "market/addWatchlistItem",
  async (payload, { rejectWithValue }) => {
    try { return await addToWatchlist(payload); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to add to watchlist"); }
  }
);

export const removeWatchlistItem = createAsyncThunk(
  "market/removeWatchlistItem",
  async (symbol, { rejectWithValue }) => {
    try {
      await removeFromWatchlist(symbol);
      return symbol;
    }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to remove"); }
  }
);

export const refreshWatchlistPrices = createAsyncThunk(
  "market/refreshWatchlistPrices",
  async (symbols, { rejectWithValue }) => {
    try { return await fetchBatchQuotes(symbols); }
    catch (e) { return rejectWithValue(e.message); }
  }
);

// ── Slice ─────────────────────────────────────────────────

const marketSlice = createSlice({
  name: "market",
  initialState: {
  activeSymbol:     "RELIANCE.NS",   // changed from ^NSEI
  activeSymbolName: "Reliance Industries",  // changed
  chartData:        [],
  chartInterval:    "1d",
  chartRange:       "3mo",
  quote:            null,
  watchlist:        [],
  indices:          [],
  chartLoading:     false,
  watchlistLoading: false,
  indicesLoading:   false,
  wsConnected:      false,
  error:            null,
},
  reducers: {
    setActiveSymbol: (state, action) => {
      state.activeSymbol = action.payload.symbol;
      state.activeSymbolName = action.payload.name;
    },
    setChartInterval: (state, action) => {
      state.chartInterval = action.payload;
    },
    setChartRange: (state, action) => {
      state.chartRange = action.payload;
    },
    clearError: (state) => { state.error = null; },
    setQuote: (state, action) => {
      const { symbol, data } = action.payload;
      // Update active quote if it matches
      if (state.activeSymbol === symbol && state.quote) {
        state.quote.regularMarketPrice = data.ltp;
        state.quote.regularMarketChange = data.change;
        state.quote.regularMarketChangePercent = data.changePercent;
      }
      // Update watchlist item if it matches
      const watchItem = state.watchlist.find((w) => w.symbol === symbol);
      if (watchItem) {
        watchItem.price = data.ltp;
        watchItem.change = data.change;
        watchItem.changePercent = data.changePercent;
      }
    },
    updateIndicesLive: (state, action) => {
      const updates = action.payload;
      if (Array.isArray(updates)) {
        updates.forEach((u) => {
          const idx = state.indices.find((i) => i.symbol === u.symbol);
          if (idx) {
            idx.price = u.price;
            idx.change = u.change;
            idx.changePercent = u.changePercent;
          }
        });
      }
    },
    setWsConnected: (state, action) => {
      state.wsConnected = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Indices
      .addCase(loadIndices.pending, (s) => { s.indicesLoading = true; })
      .addCase(loadIndices.fulfilled, (s, a) => { s.indicesLoading = false; s.indices = a.payload; })
      .addCase(loadIndices.rejected, (s) => { s.indicesLoading = false; })

      // Quote
      .addCase(loadQuote.fulfilled, (s, a) => { s.quote = a.payload; })

      // Chart
      .addCase(loadChart.pending, (s) => { s.chartLoading = true; s.error = null; })
      .addCase(loadChart.fulfilled, (s, a) => { s.chartLoading = false; s.chartData = a.payload; })
      .addCase(loadChart.rejected, (s, a) => { s.chartLoading = false; s.error = a.payload; })

      // Watchlist
      .addCase(loadWatchlist.pending, (s) => { s.watchlistLoading = true; })
      .addCase(loadWatchlist.fulfilled, (s, a) => { s.watchlistLoading = false; s.watchlist = a.payload; })
      .addCase(loadWatchlist.rejected, (s) => { s.watchlistLoading = false; })
      .addCase(addWatchlistItem.fulfilled, (s, a) => {
        // Reload watchlist after add
        s.watchlist = a.payload.map((item) => ({
          ...item,
          price: null, change: null, changePercent: null,
        }));
      })
      .addCase(removeWatchlistItem.fulfilled, (s, a) => {
        s.watchlist = s.watchlist.filter((w) => w.symbol !== a.payload);
      })
      .addCase(refreshWatchlistPrices.fulfilled, (s, a) => {
        a.payload.forEach((quote) => {
          const item = s.watchlist.find((w) => w.symbol === quote.symbol);
          if (item && !quote.error) {
            item.price = quote.regularMarketPrice;
            item.change = quote.regularMarketChange;
            item.changePercent = quote.regularMarketChangePercent;
          }
        });
      });
  },
});

export const { setActiveSymbol, setChartInterval, setChartRange, clearError, setQuote, updateIndicesLive, setWsConnected } = marketSlice.actions;
export default marketSlice.reducer;