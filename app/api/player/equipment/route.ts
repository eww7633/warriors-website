import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { readStore, writeStore } from "@/lib/hq/store";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url));
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

  const store = await readStore();
  const actor = store.users.find((entry) => entry.id === user.id);

  if (!actor) {
    return NextResponse.redirect(new URL("/player?error=account_not_found", request.url));
  }

  actor.equipmentSizes = nextSizes;
  actor.updatedAt = new Date().toISOString();
  await writeStore(store);

  return NextResponse.redirect(new URL("/player?saved=equipment", request.url));
}
