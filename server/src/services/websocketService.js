const { WebSocketServer, WebSocket } = require("ws");
const axios = require("axios");
const { getAccessToken } = require("./upstoxAuthService");

const UPSTOX_BASE = "https://api.upstox.com/v2";

let wss;            // Server → frontend clients
let upstoxWs;       // Server → Upstox feed
let reconnectTimer;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
const subscribedKeys = new Set();
let upstoxFeedActive = false;

// ── Initialize WebSocket server for frontend clients ──────
const init = (server) => {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    console.log("[WS] Frontend client connected.");

    socket.send(JSON.stringify({
      type: "connected",
      ts: Date.now(),
      upstoxFeedActive,
    }));

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === "subscribe" && Array.isArray(msg.keys)) {
          msg.keys.forEach((k) => subscribedKeys.add(k));
          subscribeToUpstox([...subscribedKeys]);
        }
      } catch { /* ignore malformed messages */ }
    });
  });

  // Attempt to connect to Upstox live feed (optional — REST polling works regardless)
  connectToUpstox();
};

// ── Connect to Upstox Market Data Feed V3 ─────────────────
const connectToUpstox = async () => {
  try {
    let token;
    try {
      token = getAccessToken();
    } catch {
      // No token configured — live feed won't start, but REST data works fine
      console.log("[WS] Live feed skipped (no Upstox token). Market data available via REST.");
      return;
    }

    // Step 1: Get authorized WebSocket URL
    const { data } = await axios.get(
      `${UPSTOX_BASE}/feed/market-data-feed/authorize`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    if (data.status !== "success" || !data.data?.authorized_redirect_uri) {
      console.log("[WS] Live feed unavailable. Market data available via REST.");
      scheduleReconnect();
      return;
    }

    const wsUrl = data.data.authorized_redirect_uri;
    console.log("[WS] Connecting to Upstox live feed...");

    upstoxWs = new WebSocket(wsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    upstoxWs.on("open", () => {
      console.log("[WS] ✓ Upstox live feed connected.");
      reconnectAttempts = 0;
      upstoxFeedActive = true;

      broadcast({ type: "upstox_status", status: "connected" });

      if (subscribedKeys.size > 0) {
        subscribeToUpstox([...subscribedKeys]);
      }
    });

    upstoxWs.on("message", (raw) => {
      try {
        const message = JSON.parse(raw);
        handleUpstoxMessage(message);
      } catch {
        // Binary data from V2 (protobuf) — ignore if on V3
      }
    });

    upstoxWs.on("close", (code) => {
      upstoxFeedActive = false;
      console.log(`[WS] Live feed disconnected (code: ${code}). Will retry.`);
      scheduleReconnect();
    });

    upstoxWs.on("error", (err) => {
      console.error("[WS] Live feed error:", err.message);
    });
  } catch (err) {
    const status = err.response?.status;

    // 410/401/403 = token expired or invalid — don't spam retries
    if (status === 410 || status === 401 || status === 403) {
      console.log("[WS] Live feed skipped (token needs refresh). Market data available via REST.");
      upstoxFeedActive = false;
      return; // Stop — no point retrying with same expired token
    }

    // Network/timeout errors — worth retrying
    console.log("[WS] Live feed connection failed:", err.message, "— will retry.");
    scheduleReconnect();
  }
};

// ── Handle incoming Upstox market data ────────────────────
const handleUpstoxMessage = (message) => {
  const feeds = message.feeds || {};

  for (const [instrumentKey, feedData] of Object.entries(feeds)) {
    const ff = feedData?.ff?.marketFF || feedData?.ff?.indexFF || {};
    const ltpc = ff.ltpc || {};
    const ohlc = ff.marketOHLC?.ohlc?.[0] || {};

    const payload = {
      type: "price",
      instrumentKey,
      symbol: instrumentKey,
      payload: {
        ltp:           ltpc.ltp || 0,
        close:         ltpc.cp || ohlc.close || 0,
        open:          ohlc.open || 0,
        high:          ohlc.high || 0,
        low:           ohlc.low || 0,
        volume:        ohlc.volume || ff.marketOHLC?.ohlc?.[0]?.volume || 0,
        change:        ltpc.ltp && ltpc.cp ? parseFloat((ltpc.ltp - ltpc.cp).toFixed(2)) : 0,
        changePercent: ltpc.ltp && ltpc.cp ? parseFloat((((ltpc.ltp - ltpc.cp) / ltpc.cp) * 100).toFixed(2)) : 0,
        timestamp:     ltpc.ltt || Date.now(),
      },
    };

    broadcast(payload);
  }
};

// ── Subscribe to instruments on Upstox WebSocket ──────────
const subscribeToUpstox = (instrumentKeys) => {
  if (!upstoxWs || upstoxWs.readyState !== WebSocket.OPEN) return;

  const subscriptionMessage = {
    guid: `sub-${Date.now()}`,
    method: "sub",
    data: {
      mode: "full",
      instrumentKeys,
    },
  };

  upstoxWs.send(JSON.stringify(subscriptionMessage));
  console.log(`[WS] Subscribed to ${instrumentKeys.length} instruments.`);
};

// ── Broadcast to all connected frontend clients ───────────
const broadcast = (payload) => {
  if (!wss) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// ── Reconnect with exponential backoff ────────────────────
const scheduleReconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.log("[WS] Live feed: max retries reached. Market data still available via REST.");
    return;
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;

  reconnectTimer = setTimeout(() => {
    connectToUpstox();
  }, delay);
};

// ── Called after successful re-authentication ─────────────
const onTokenRefreshed = () => {
  console.log("[WS] Token refreshed — connecting live feed...");
  reconnectAttempts = 0;

  if (upstoxWs) {
    try { upstoxWs.close(); } catch { /* ignore */ }
    upstoxWs = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  connectToUpstox();
};

module.exports = { init, broadcast, onTokenRefreshed };
