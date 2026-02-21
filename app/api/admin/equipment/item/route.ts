import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { userHasPermission } from "@/lib/hq/permissions";
import { deleteEquipmentItem, upsertEquipmentItem } from "@/lib/hq/equipment";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_players"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "save").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();

  if (action === "delete") {
    await deleteEquipmentItem(itemId);
    return NextResponse.redirect(new URL("/admin?section=equipment&equipment=deleted", request.url), 303);
  }

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const quantityTotal = Number(String(formData.get("quantityTotal") ?? "0").trim());
  const quantityAvailable = Number(String(formData.get("quantityAvailable") ?? "0").trim());
  const condition = String(formData.get("condition") ?? "good").trim();
  const locationBin = String(formData.get("locationBin") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isActive = formData.get("isActive") !== null;

  try {
    await upsertEquipmentItem({
      itemId: itemId || undefined,
      name,
      category,
      size,
      quantityTotal: Number.isFinite(quantityTotal) ? quantityTotal : 0,
      quantityAvailable: Number.isFinite(quantityAvailable) ? quantityAvailable : 0,
      condition,
      locationBin,
      photoUrl,
      notes,
      isActive
    });
    return NextResponse.redirect(new URL("/admin?section=equipment&equipment=saved", request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "equipment_save_failed");
    return NextResponse.redirect(new URL(`/admin?section=equipment&error=${reason}`, request.url), 303);
  }
}
