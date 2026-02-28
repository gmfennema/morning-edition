import { get, list, put } from "@vercel/blob";

export type StoredBriefing = {
  storedAt: string;
  data: unknown;
};

const LATEST_PATH = "morning-edition/latest.json";
const HISTORY_PREFIX = "morning-edition/history/";

function getBlobToken(): string {
  const t =
    process.env.morning_edition_READ_WRITE_TOKEN ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_RW_TOKEN;

  if (!t) {
    throw new Error(
      "Missing Vercel Blob token. Set morning_edition_READ_WRITE_TOKEN (preferred) or BLOB_READ_WRITE_TOKEN.",
    );
  }
  return t;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseStoredBriefing(raw: unknown): StoredBriefing | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as StoredBriefing;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as StoredBriefing;
  return null;
}

export async function saveLatestBriefing(data: unknown): Promise<StoredBriefing> {
  const storedAt = new Date().toISOString();
  const payload: StoredBriefing = { storedAt, data };
  const token = getBlobToken();

  const body = JSON.stringify(payload);
  // latest
  await put(LATEST_PATH, body, {
    access: "private",
    contentType: "application/json",
    token,
    allowOverwrite: true,
  });

  // history (best-effort)
  const histPath = `${HISTORY_PREFIX}${ymd(new Date())}.json`;
  await put(histPath, body, {
    access: "private",
    contentType: "application/json",
    token,
    allowOverwrite: true,
  });

  return payload;
}

export async function readLatestBriefing(): Promise<StoredBriefing | null> {
  const token = getBlobToken();

  // Prefer direct get by pathname.
  try {
    const res = await get(LATEST_PATH, { token, access: "private" });
    if (!res) throw new Error("blob_not_found");
    const txt = await new Response(res.stream).text();
    return parseStoredBriefing(txt);
  } catch {
    // fall through
  }

  // Fallback: list + fetch first match
  try {
    const listed = await list({ prefix: LATEST_PATH, limit: 1, token });
    const url = listed.blobs?.[0]?.url;
    if (!url) return null;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!r.ok) return null;
    const txt = await r.text();
    return parseStoredBriefing(txt);
  } catch {
    return null;
  }
}
