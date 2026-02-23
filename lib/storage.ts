import { Redis } from "@upstash/redis";

export type StoredBriefing = {
  storedAt: string;
  data: unknown;
};

export const LATEST_KEY = "morning-edition:latest";

declare global {
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
  const raw = await redis.get<unknown>(LATEST_KEY);
  if (!raw) return null;

  // Handle case where Upstash might return a stringified JSON vs an object
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as StoredBriefing;
    } catch {
      return null;
    }
  }

  return raw as StoredBriefing;
}
