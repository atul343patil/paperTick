import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchOptionChain, placeOptionTrade,
  fetchPositions, fetchPositionsLive, fetchOrders,
  closeTrade, cancelOrder as cancelOrderApi,
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
    catch (e) { return rejectWithValue(e.response?.data?.message || "Trade failed. Please try again."); }
  }
);

export const loadPositions = createAsyncThunk(
  "options/loadPositions",
  async (_, { rejectWithValue }) => {
    try { return await fetchPositions(); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load positions"); }
  }
);

export const loadPositionsLive = createAsyncThunk(
  "options/loadPositionsLive",
  async (_, { rejectWithValue }) => {
    try { return await fetchPositionsLive(); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load live positions"); }
  }
);

export const loadOrders = createAsyncThunk(
  "options/loadOrders",
  async (_, { rejectWithValue }) => {
    try { return await fetchOrders(); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load orders"); }
  }
);

export const closePosition = createAsyncThunk(
  "options/close",
  async ({ id, closePrice }, { rejectWithValue }) => {
    try { return await closeTrade(id, closePrice); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to close position. Please try again."); }
  }
);

export const cancelPendingOrder = createAsyncThunk(
  "options/cancel",
  async (id, { rejectWithValue }) => {
    try { return await cancelOrderApi(id); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to cancel order. Please try again."); }
  }
);

const optionsSlice = createSlice({
  name: "options",
  initialState: {
    chain: null,
    selectedSymbol: "NIFTY",
    selectedExpiry: null,
    positions: [],        // basic positions
    livePositions: [],    // positions with LTP + unrealizedPnL
    orders: [],           // all orders (for order history tab)
    chainLoading: false,
    positionsLoading: false,
    liveLoading: false,
    ordersLoading: false,
    tradeSubmitting: false,
    cancellingId: null,
    error: null,
    positionsTab: "open", // "open" | "closed" | "orders"
  },
  reducers: {
    setSelectedSymbol: (s, a) => { s.selectedSymbol = a.payload; s.chain = null; },
    setSelectedExpiry: (s, a) => { s.selectedExpiry = a.payload; },
    setPositionsTab: (s, a) => { s.positionsTab = a.payload; },
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(loadOptionChain.pending, (s) => { s.chainLoading = true; s.error = null; })
      .addCase(loadOptionChain.fulfilled, (s, a) => {
        s.chainLoading = false;
        s.chain = a.payload;
        if (a.payload.expiryDates?.length > 0) {
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

      .addCase(loadPositionsLive.pending, (s) => { s.liveLoading = true; })
      .addCase(loadPositionsLive.fulfilled, (s, a) => { s.liveLoading = false; s.livePositions = a.payload; })
      .addCase(loadPositionsLive.rejected, (s) => { s.liveLoading = false; })

      .addCase(loadOrders.pending, (s) => { s.ordersLoading = true; })
      .addCase(loadOrders.fulfilled, (s, a) => { s.ordersLoading = false; s.orders = a.payload; })
      .addCase(loadOrders.rejected, (s) => { s.ordersLoading = false; })

      .addCase(closePosition.fulfilled, (s, a) => {
        const idx = s.livePositions.findIndex((p) => p._id === a.payload.data.trade._id);
        if (idx > -1) s.livePositions[idx] = { ...s.livePositions[idx], ...a.payload.data.trade };
        // also update basic positions
        const idx2 = s.positions.findIndex((p) => p._id === a.payload.data.trade._id);
        if (idx2 > -1) s.positions[idx2] = a.payload.data.trade;
      })

      .addCase(cancelPendingOrder.pending, (s, a) => { s.cancellingId = a.meta.arg; })
      .addCase(cancelPendingOrder.fulfilled, (s, a) => {
        s.cancellingId = null;
        const order = a.payload.data.order;
        // Update in livePositions
        const idx = s.livePositions.findIndex((p) => p._id === order._id);
        if (idx > -1) s.livePositions[idx] = { ...s.livePositions[idx], ...order };
        // Update in orders
        const idx2 = s.orders.findIndex((p) => p._id === order._id);
        if (idx2 > -1) s.orders[idx2] = order;
      })
      .addCase(cancelPendingOrder.rejected, (s) => { s.cancellingId = null; });
  },
});

export const { setSelectedSymbol, setSelectedExpiry, setPositionsTab, clearError } = optionsSlice.actions;
export default optionsSlice.reducer;