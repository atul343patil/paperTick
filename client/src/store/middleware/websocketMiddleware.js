import { setQuote, updateIndicesLive } from "../slices/marketSlice";

let socket;
let reconnectTimer;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

const websocketMiddleware = (store) => (next) => (action) => {
  if (action.type === "ws/connect") {
    const url = action.payload || "ws://localhost:5000/ws";

    // Close existing connection
    if (socket) {
      socket.close();
      socket = null;
    }

    reconnectAttempts = 0;
    connect(url, store);
  }

  if (action.type === "ws/disconnect") {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) {
      socket.close();
      socket = null;
    }
    reconnectAttempts = 0;
  }

  if (action.type === "ws/subscribe" && socket?.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({ type: "subscribe", keys: action.payload })
    );
  }

  return next(action);
};

function connect(url, store) {
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log("[WS] Connected to server.");
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.type === "price" && message.payload) {
        store.dispatch(
          setQuote({ symbol: message.symbol, data: message.payload })
        );
      }

      if (message.type === "indices" && message.payload) {
        store.dispatch(updateIndicesLive(message.payload));
      }
    } catch (error) {
      console.warn("[WS] Message parse error:", error);
    }
  };

  socket.onclose = (event) => {
    console.warn(`[WS] Connection closed (code: ${event.code}). Reconnecting...`);
    scheduleReconnect(url, store);
  };

  socket.onerror = (error) => {
    console.error("[WS] Error:", error);
  };
}

function scheduleReconnect(url, store) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.error("[WS] Max reconnection attempts reached.");
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT})...`);

  reconnectTimer = setTimeout(() => connect(url, store), delay);
}

export default websocketMiddleware;
