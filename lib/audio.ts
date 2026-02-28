import { get, list, put } from "@vercel/blob";

export type StoredAudio = {
  storedAt: string;
  contentType: string;
  bytes: number;
  latestPath: string;
  historyPath: string;
};

const AUDIO_LATEST_PATH = "morning-edition/audio/latest.mp3";
const AUDIO_HISTORY_PREFIX = "morning-edition/audio/history/";

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

export async function hasLatestAudio(): Promise<boolean> {
  const token = getBlobToken();
  const listed = await list({ prefix: AUDIO_LATEST_PATH, limit: 1, token });
  return Boolean(listed.blobs?.[0]?.pathname);
}

export async function saveLatestAudio(
  body: ArrayBuffer | Uint8Array,
  opts?: { contentType?: string },
): Promise<StoredAudio> {
  const token = getBlobToken();
  const storedAt = new Date().toISOString();
  const contentType =
    (opts?.contentType || "audio/mpeg").split(";")[0] || "audio/mpeg";

  const buf = Buffer.from(body instanceof ArrayBuffer ? new Uint8Array(body) : body);
  const bytes = buf.byteLength;

  const historyPath = `${AUDIO_HISTORY_PREFIX}${ymd(new Date())}.mp3`;

  // latest
  await put(AUDIO_LATEST_PATH, buf, {
    access: "private",
    contentType,
    token,
    allowOverwrite: true,
  });

  // history (best-effort)
  await put(historyPath, buf, {
    access: "private",
    contentType,
    token,
    allowOverwrite: true,
  });

  return {
    storedAt,
    contentType,
    bytes,
    latestPath: AUDIO_LATEST_PATH,
    historyPath,
  };
}

export async function getLatestAudio(range?: string | null) {
  const token = getBlobToken();

  const headers: HeadersInit | undefined = range
    ? {
        Range: range,
      }
    : undefined;

  return get(AUDIO_LATEST_PATH, { token, access: "private", headers });
}
