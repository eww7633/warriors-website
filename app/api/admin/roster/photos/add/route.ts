import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { addPlayerPhoto } from "@/lib/hq/roster";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !canAccessAdminPanel(actor)) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };
  const userId = String(formData.get("userId") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const makePrimary = String(formData.get("makePrimary") ?? "").trim() === "on";

  if (!userId || !imageUrl) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_photo_payload", request.url), 303);
  }

  try {
    await addPlayerPhoto({
      userId,
      imageUrl,
      caption,
      makePrimary
    });

    return NextResponse.redirect(new URL("/admin/roster?saved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/roster?error=photo_save_failed", request.url), 303);
  }
}
