import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchStrategyList, analyzeStrategy, analyzeCustomStrategy } from "../../api/strategyApi";

export const loadStrategyList = createAsyncThunk(
  "strategy/loadList",
  async (_, { rejectWithValue }) => {
    try { return await fetchStrategyList(); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Failed to load strategies"); }
  }
);

export const runAnalysis = createAsyncThunk(
  "strategy/analyze",
  async (payload, { rejectWithValue }) => {
    try { return await analyzeStrategy(payload); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Analysis failed"); }
  }
);

export const runCustomAnalysis = createAsyncThunk(
  "strategy/custom",
  async (payload, { rejectWithValue }) => {
    try { return await analyzeCustomStrategy(payload); }
    catch (e) { return rejectWithValue(e.response?.data?.message || "Analysis failed"); }
  }
);

const strategySlice = createSlice({
  name: "strategy",
  initialState: {
    list:          [],
    result:        null,   // { legs, payoffCurve, metrics }
    selectedId:    null,
    listLoading:   false,
    analyzing:     false,
    error:         null,
    // custom builder state
    customLegs:    [],
    mode:          "predefined", // "predefined" | "custom"
  },
  reducers: {
    setSelectedStrategy: (s, a) => { s.selectedId = a.payload; s.result = null; },
    setMode: (s, a)             => { s.mode = a.payload; s.result = null; },
    addCustomLeg: (s, a)        => { s.customLegs.push(a.payload); },
    removeCustomLeg: (s, a)     => { s.customLegs.splice(a.payload, 1); },
    updateCustomLeg: (s, a)     => {
      const { index, field, value } = a.payload;
      s.customLegs[index][field] = value;
    },
    clearCustomLegs: (s)        => { s.customLegs = []; s.result = null; },
    clearResult: (s)            => { s.result = null; },
    clearError: (s)             => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(loadStrategyList.pending,  (s) => { s.listLoading = true; })
      .addCase(loadStrategyList.fulfilled,(s, a) => { s.listLoading = false; s.list = a.payload; })
      .addCase(loadStrategyList.rejected, (s) => { s.listLoading = false; })

      .addCase(runAnalysis.pending,   (s) => { s.analyzing = true; s.error = null; })
      .addCase(runAnalysis.fulfilled, (s, a) => { s.analyzing = false; s.result = a.payload; })
      .addCase(runAnalysis.rejected,  (s, a) => { s.analyzing = false; s.error = a.payload; })

      .addCase(runCustomAnalysis.pending,   (s) => { s.analyzing = true; s.error = null; })
      .addCase(runCustomAnalysis.fulfilled, (s, a) => { s.analyzing = false; s.result = a.payload; })
      .addCase(runCustomAnalysis.rejected,  (s, a) => { s.analyzing = false; s.error = a.payload; });
  },
});

export const {
  setSelectedStrategy, setMode,
  addCustomLeg, removeCustomLeg, updateCustomLeg,
  clearCustomLegs, clearResult, clearError,
} = strategySlice.actions;

export default strategySlice.reducer;