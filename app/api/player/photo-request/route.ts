import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { createPhotoSubmissionRequest } from "@/lib/hq/player-requests";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=sign_in_required", request.url), 303);
  }

  if (user.role !== "player" || user.status !== "approved") {
    return NextResponse.redirect(new URL("/player?error=approval_required", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  if (!imageUrl) {
    return NextResponse.redirect(new URL("/player?error=image_url_required", request.url), 303);
  }

  try {
    await createPhotoSubmissionRequest({
      userId: user.id,
      imageUrl,
      caption
    });
    return NextResponse.redirect(new URL("/player?saved=photo_request", request.url), 303);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "photo_request_failed";
    return NextResponse.redirect(
      new URL(`/player?error=${encodeURIComponent(reason)}`, request.url),
      303
    );
  }
}
