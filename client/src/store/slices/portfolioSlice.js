import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchPortfolio, fetchOrders, placeOrder } from "../../api/tradingApi";

export const loadPortfolio = createAsyncThunk(
  "portfolio/load",
  async (_, { rejectWithValue }) => {
    try { return await fetchPortfolio(); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load portfolio"); }
  }
);

export const loadOrders = createAsyncThunk(
  "portfolio/loadOrders",
  async (params, { rejectWithValue }) => {
    try { return await fetchOrders(params); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load orders"); }
  }
);

export const submitOrder = createAsyncThunk(
  "portfolio/submitOrder",
  async (payload, { rejectWithValue }) => {
    try { return await placeOrder(payload); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Order failed"); }
  }
);

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState: {
    holdings: [],
    summary: null,
    orders: [],
    orderPagination: null,
    loading: false,
    ordersLoading: false,
    orderSubmitting: false,
    error: null,
  },
  reducers: {
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(loadPortfolio.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(loadPortfolio.fulfilled, (s, a) => {
        s.loading = false;
        s.holdings = a.payload.holdings;
        s.summary  = a.payload.summary;
      })
      .addCase(loadPortfolio.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(loadOrders.pending, (s) => { s.ordersLoading = true; })
      .addCase(loadOrders.fulfilled, (s, a) => {
        s.ordersLoading = false;
        s.orders = a.payload.orders;
        s.orderPagination = a.payload.pagination;
      })
      .addCase(loadOrders.rejected, (s) => { s.ordersLoading = false; })

      .addCase(submitOrder.pending, (s) => { s.orderSubmitting = true; s.error = null; })
      .addCase(submitOrder.fulfilled, (s) => { s.orderSubmitting = false; })
      .addCase(submitOrder.rejected, (s, a) => { s.orderSubmitting = false; s.error = a.payload; });
  },
});

export const { clearError } = portfolioSlice.actions;
export default portfolioSlice.reducer;