import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";
import { removeMobileDeviceToken, upsertMobileDeviceToken } from "@/lib/hq/mobile-device-tokens";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { token?: string; platform?: "ios" | "android" | "web"; appVersion?: string; deviceLabel?: string } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = String(payload.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "device_token_required" }, { status: 400 });
  }

  const record = await upsertMobileDeviceToken({
    userId: user.id,
    token,
    platform: payload.platform,
    appVersion: payload.appVersion,
    deviceLabel: payload.deviceLabel
  });
  return NextResponse.json({ ok: true, tokenId: record.id });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { token?: string } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = String(payload.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "device_token_required" }, { status: 400 });
  }

  await removeMobileDeviceToken({ token, userId: user.id });
  return NextResponse.json({ ok: true });
}
