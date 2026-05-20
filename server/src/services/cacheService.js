// Simple in-memory cache (no Redis needed for now)
// Swappable with Redis later — same interface

const cache = new Map();

const set = (key, value, ttlSeconds = 15) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const del = (key) => cache.delete(key);

const flush = () => cache.clear();

module.exports = { set, get, del, flush };