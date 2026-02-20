import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { addPlayerPhoto } from "@/lib/hq/roster";
import {
  listPendingPhotoSubmissionRequests,
  reviewPhotoSubmissionRequest
} from "@/lib/hq/player-requests";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = (await request.formData()) as unknown as {
    get: (name: string) => FormDataEntryValue | null;
  };

  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const notes = String(formData.get("reviewNotes") ?? "").trim();

  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_photo_review_payload", request.url), 303);
  }

  try {
    const pending = (await listPendingPhotoSubmissionRequests()).find((entry) => entry.id === requestId);
    if (!pending) {
      throw new Error("photo_request_not_found");
    }

    let approvedPhotoId: string | undefined;
    if (decision === "approved") {
      const created = await addPlayerPhoto({
        userId: pending.userId,
        imageUrl: pending.imageUrl,
        caption: pending.caption,
        makePrimary: true
      });
      approvedPhotoId = created.id;
    }

    await reviewPhotoSubmissionRequest({
      requestId,
      reviewedByUserId: actor.id,
      decision,
      reviewNotes: notes,
      approvedPhotoId
    });

    return NextResponse.redirect(new URL(`/admin/roster?request=${decision}`, request.url), 303);
  } catch (error) {
    const reason = encodeURIComponent(error instanceof Error ? error.message : "photo_review_failed");
    return NextResponse.redirect(new URL(`/admin/roster?error=${reason}`, request.url), 303);
  }
}
