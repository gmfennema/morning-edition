import { Redis } from "@upstash/redis";

// Manual parsing since .env might be missing or in a different format
const env = {
  KV_REST_API_URL: "https://known-hookworm-38360.upstash.io",
  KV_REST_API_TOKEN: "AZXYAAIncDJiMTg3NzBhZDEyZGQ0Y2JjOTJkMDM0OWNlYzZmNDE5YXAyMzgzNjA"
};

async function test() {
  const redis = new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN });
  const key = "morning-edition:latest";
  
  console.log(`Checking key: ${key}`);
  const val = await redis.get(key);
  console.log("Value found:", JSON.stringify(val, null, 2));
}

test();
