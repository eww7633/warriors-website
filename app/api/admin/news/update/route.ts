import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel, userHasPermission } from "@/lib/hq/permissions";
import { upsertNewsPost } from "@/lib/hq/news";

function parseCsvList(raw: string) {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor)) || !(await userHasPermission(actor, "manage_news"))) {
    return NextResponse.redirect(new URL("/admin?section=overview&error=news_admin_required", request.url), 303);
  }

  const formData = await request.formData();
  const postId = String(formData.get("postId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const galleryImageUrls = parseCsvList(String(formData.get("galleryImageUrls") ?? ""));
  const tags = parseCsvList(String(formData.get("tags") ?? ""));
  const published = String(formData.get("published") ?? "").trim() === "on";

  if (!postId || !title || !summary || !body) {
    return NextResponse.redirect(new URL("/admin?section=news&error=missing_news_fields", request.url), 303);
  }

  await upsertNewsPost({
    postId,
    title,
    slug,
    summary,
    body,
    coverImageUrl,
    videoUrl,
    galleryImageUrls,
    tags,
    published,
    authorUserId: actor.id
  });

  return NextResponse.redirect(new URL("/admin?section=news&news=updated", request.url), 303);
}
