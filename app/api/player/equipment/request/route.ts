import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createEquipmentRequest } from "@/lib/hq/equipment";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  const formData = await request.formData();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const itemName = String(formData.get("itemName") ?? "").trim();
  const sizeNeeded = String(formData.get("sizeNeeded") ?? "").trim();
  const urgency = String(formData.get("urgency") ?? "normal").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!itemName) {
    return NextResponse.redirect(new URL("/player?section=gear&error=equipment_request_item_required", request.url), 303);
  }

  try {
    await createEquipmentRequest({
      userId: user.id,
      itemId,
      itemName,
      sizeNeeded,
      urgency,
      notes
    });
    return NextResponse.redirect(new URL("/player?section=gear&saved=equipment_request", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "equipment_request_failed");
    return NextResponse.redirect(new URL(`/player?section=gear&error=${reason}`, request.url), 303);
  }
}
