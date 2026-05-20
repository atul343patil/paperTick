import { configureStore } from "@reduxjs/toolkit";
import authReducer      from "./slices/authSlice";
import marketReducer    from "./slices/marketSlice";
import portfolioReducer from "./slices/portfolioSlice";
import optionsReducer   from "./slices/optionsSlice";
import strategyReducer  from "./slices/strategySlice";
import websocketMiddleware from "./middleware/websocketMiddleware";

const store = configureStore({
  reducer: {
    auth:      authReducer,
    market:    marketReducer,
    portfolio: portfolioReducer,
    options:   optionsReducer,
    strategy:  strategyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(websocketMiddleware),
  devTools: import.meta.env.MODE !== "production",
});

export default store;