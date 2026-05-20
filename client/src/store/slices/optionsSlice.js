import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchOptionChain, placeOptionTrade,
  fetchPositions, closeTrade,
} from "../../api/optionsApi";

export const loadOptionChain = createAsyncThunk(
  "options/loadChain",
  async (symbol, { rejectWithValue }) => {
    try { return await fetchOptionChain(symbol); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load option chain"); }
  }
);

export const submitOptionTrade = createAsyncThunk(
  "options/submitTrade",
  async (payload, { rejectWithValue }) => {
    try { return await placeOptionTrade(payload); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Trade failed"); }
  }
);

export const loadPositions = createAsyncThunk(
  "options/loadPositions",
  async (_, { rejectWithValue }) => {
    try { return await fetchPositions(); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load positions"); }
  }
);

export const closePosition = createAsyncThunk(
  "options/close",
  async ({ id, closePrice }, { rejectWithValue }) => {
    try { return await closeTrade(id, closePrice); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to close position"); }
  }
);

const optionsSlice = createSlice({
  name: "options",
  initialState: {
    chain: null,
    selectedSymbol: "NIFTY",
    selectedExpiry: null,
    positions: [],
    chainLoading: false,
    positionsLoading: false,
    tradeSubmitting: false,
    error: null,
  },
  reducers: {
    setSelectedSymbol: (s, a) => { s.selectedSymbol = a.payload; s.chain = null; },
    setSelectedExpiry: (s, a) => { s.selectedExpiry = a.payload; },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(loadOptionChain.pending, (s) => { s.chainLoading = true; s.error = null; })
      .addCase(loadOptionChain.fulfilled, (s, a) => {
        s.chainLoading = false;
        s.chain = a.payload;
        // Auto-select nearest expiry
        if (a.payload.expiryDates?.length && !s.selectedExpiry) {
          s.selectedExpiry = a.payload.expiryDates[0];
        }
      })
      .addCase(loadOptionChain.rejected, (s, a) => { s.chainLoading = false; s.error = a.payload; })

      .addCase(submitOptionTrade.pending, (s) => { s.tradeSubmitting = true; s.error = null; })
      .addCase(submitOptionTrade.fulfilled, (s) => { s.tradeSubmitting = false; })
      .addCase(submitOptionTrade.rejected, (s, a) => { s.tradeSubmitting = false; s.error = a.payload; })

      .addCase(loadPositions.pending, (s) => { s.positionsLoading = true; })
      .addCase(loadPositions.fulfilled, (s, a) => { s.positionsLoading = false; s.positions = a.payload; })
      .addCase(loadPositions.rejected, (s) => { s.positionsLoading = false; })

      .addCase(closePosition.fulfilled, (s, a) => {
        const idx = s.positions.findIndex((p) => p._id === a.payload.data.trade._id);
        if (idx > -1) s.positions[idx] = a.payload.data.trade;
      });
  },
});

export const { setSelectedSymbol, setSelectedExpiry, clearError } = optionsSlice.actions;
export default optionsSlice.reducer;