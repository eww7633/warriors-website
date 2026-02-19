import { NextResponse } from "next/server";
import {
  ingestSportsEngineWebhook,
  verifySportsEngineWebhook
} from "@/lib/integrations/sportsengine";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySportsEngineWebhook(rawBody, request.headers)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = await ingestSportsEngineWebhook(payload, request.headers);
  return NextResponse.json({ ok: true, ...result }, { status: 202 });
}
