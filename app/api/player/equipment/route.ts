import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { upsertEquipmentSizes } from "@/lib/hq/store";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = await request.formData();

  const nextSizes = {
    helmet: String(formData.get("helmet") ?? "").trim(),
    gloves: String(formData.get("gloves") ?? "").trim(),
    skates: String(formData.get("skates") ?? "").trim(),
    pants: String(formData.get("pants") ?? "").trim(),
    stick: String(formData.get("stick") ?? "").trim(),
    jersey: String(formData.get("jersey") ?? "").trim(),
    shell: String(formData.get("shell") ?? "").trim(),
    warmupTop: String(formData.get("warmupTop") ?? "").trim(),
    warmupBottom: String(formData.get("warmupBottom") ?? "").trim()
  };

  try {
    await upsertEquipmentSizes(user.id, nextSizes);
  } catch {
    return NextResponse.redirect(new URL("/player?error=account_not_found", request.url), 303);
  }

  return NextResponse.redirect(new URL("/player?saved=equipment", request.url), 303);
}
