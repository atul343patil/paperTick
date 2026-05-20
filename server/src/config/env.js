const requiredEnvVars = [
  "PORT",
  "MONGO_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLIENT_URL",
  "UPSTOX_API_KEY",
  "UPSTOX_API_SECRET",
  "UPSTOX_REDIRECT_URI",
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[ENV ERROR] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // UPSTOX_ACCESS_TOKEN is optional at startup — obtained via OAuth flow
  if (!process.env.UPSTOX_ACCESS_TOKEN) {
    console.warn(
      "[ENV WARN] UPSTOX_ACCESS_TOKEN is not set. Visit http://localhost:5000/api/upstox/login to authenticate."
    );
  }
};

module.exports = validateEnv;