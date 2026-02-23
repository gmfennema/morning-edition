import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const shared = process.env.MORNING_EDITION_SHARED_SECRET;
  const headerSecret = req.headers.get("x-shared-secret");
  
  if (!shared || headerSecret !== shared) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "env_missing" });
  }

  try {
    const redis = new Redis({ url, token });
    const val = await redis.get("morning-edition:latest");
    return NextResponse.json({ 
      ok: true, 
      key: "morning-edition:latest",
      type: typeof val,
      value: val 
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message });
  }
}
