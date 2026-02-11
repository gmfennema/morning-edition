import { Redis } from "@upstash/redis";

export type StoredBriefing = {
  storedAt: string;
  data: unknown;
};

const LATEST_KEY = "morning-edition:latest";

declare global {
  // eslint-disable-next-line no-var
  var __morningEditionRedis: Redis | undefined;
}

function getRedis(): Redis {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "KV_REST_API_URL / KV_REST_API_TOKEN env vars are required to use KV storage.",
    );
  }

  if (!global.__morningEditionRedis) {
    global.__morningEditionRedis = new Redis({ url, token });
  }
  return global.__morningEditionRedis;
}

export async function saveLatestBriefing(data: unknown) {
  const storedAt = new Date().toISOString();
  const payload: StoredBriefing = { storedAt, data };

  const redis = getRedis();
  // Store as object to avoid double serialization issues with the Upstash SDK
  await redis.set(LATEST_KEY, payload);

  return payload;
}

export async function readLatestBriefing(): Promise<StoredBriefing | null> {
  const redis = getRedis();
  const raw = await redis.get<StoredBriefing>(LATEST_KEY);
  if (!raw) return null;

  return raw;
}
