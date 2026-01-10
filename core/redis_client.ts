import Redis from "ioredis";

let redis: Redis | null = null;
if (process.env.REDIS_URL_LOCAL) {
  redis = new Redis(process.env.REDIS_URL_LOCAL);

  redis.on("connect", () => {
    console.log("Connected to Redis successfully");
  });

  redis.on("error", (err) => {
    console.error(" Redis connection error:", err);
    redis = null;
  });
} else {
  console.log("No REDIS_URL_LOCAL");
}

export default redis;
