import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { completeQrCheckIn } from "@/lib/hq/events";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { token?: string } = {};
  try {
    payload = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = String(payload.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  try {
    const result = await completeQrCheckIn({ token, userId: user.id });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "qr_check_in_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

