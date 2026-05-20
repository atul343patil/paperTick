const { createClient } = require("redis");
const { env } = require("./env");

let client;

const connectRedis = async () => {
	if (!env.REDIS_URL) {
		console.log("Redis disabled (REDIS_URL not set)");
		return null;
	}

	client = createClient({ url: env.REDIS_URL });
	client.on("error", (err) => console.error("Redis error", err));
	await client.connect();
	console.log("Redis connected");
	return client;
};

const getRedis = () => client;

module.exports = { connectRedis, getRedis };
