import { NextResponse } from "next/server";
import { destroySessionByToken, getBearerTokenFromRequest } from "@/lib/hq/session";

export async function POST(request: Request) {
  const token = getBearerTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: "missing_bearer_token" }, { status: 401 });
  }

  await destroySessionByToken(token);
  return NextResponse.json({ ok: true });
}

