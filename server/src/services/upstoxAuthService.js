const axios = require("axios");
const fs = require("fs");
const path = require("path");

const UPSTOX_BASE = "https://api.upstox.com/v2";

// ── Build OAuth login URL ─────────────────────────────────
const getAuthUrl = () => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.UPSTOX_API_KEY,
    redirect_uri: process.env.UPSTOX_REDIRECT_URI,
  });
  return `${UPSTOX_BASE}/login/authorization/dialog?${params.toString()}`;
};

// ── Exchange auth code for access token ───────────────────
const exchangeCodeForToken = async (code) => {
  const { data } = await axios.post(
    `${UPSTOX_BASE}/login/authorization/token`,
    new URLSearchParams({
      code,
      client_id: process.env.UPSTOX_API_KEY,
      client_secret: process.env.UPSTOX_API_SECRET,
      redirect_uri: process.env.UPSTOX_REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      timeout: 10000,
    }
  );

  const token = data.access_token;
  if (!token) throw new Error("No access_token in Upstox response");

  // Store in process memory
  process.env.UPSTOX_ACCESS_TOKEN = token;

  // Persist to .env file so it survives server restarts
  persistTokenToEnv(token);

  console.log("[UpstoxAuth] Access token obtained and saved.");
  return token;
};

// ── Get current access token ──────────────────────────────
const getAccessToken = () => {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Upstox access token not set. Visit /api/upstox/login to authenticate."
    );
  }
  return token;
};

// ── Check if token is valid ───────────────────────────────
const isTokenValid = async () => {
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) return false;

  try {
    const { data } = await axios.get(`${UPSTOX_BASE}/user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      timeout: 5000,
    });
    return data.status === "success";
  } catch {
    return false;
  }
};

// ── Helper: persist token to .env file ────────────────────
const persistTokenToEnv = (token) => {
  try {
    const envPath = path.resolve(__dirname, "../../../.env");
    let content = fs.readFileSync(envPath, "utf8");

    if (content.includes("UPSTOX_ACCESS_TOKEN=")) {
      content = content.replace(
        /UPSTOX_ACCESS_TOKEN=.*/,
        `UPSTOX_ACCESS_TOKEN=${token}`
      );
    } else {
      content += `\nUPSTOX_ACCESS_TOKEN=${token}`;
    }

    fs.writeFileSync(envPath, content, "utf8");
  } catch (err) {
    console.warn("[UpstoxAuth] Could not persist token to .env:", err.message);
  }
};

module.exports = { getAuthUrl, exchangeCodeForToken, getAccessToken, isTokenValid };
