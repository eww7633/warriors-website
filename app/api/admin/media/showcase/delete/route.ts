import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getCurrentUser } from "@/lib/hq/session";
import { userHasPermission } from "@/lib/hq/permissions";

function normalizeRelativeMediaPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withoutPrefix = trimmed.startsWith("/uploads/showcase/")
    ? trimmed.slice("/uploads/showcase/".length)
    : trimmed;
  if (!withoutPrefix) return "";
  if (withoutPrefix.includes("..")) return "";
  if (!/^[a-zA-Z0-9._/-]+$/.test(withoutPrefix)) return "";
  return withoutPrefix.replace(/^\/+/, "");
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_media"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const imagePath = normalizeRelativeMediaPath(String(formData.get("imagePath") ?? ""));
  if (!imagePath) {
    return NextResponse.redirect(new URL("/admin?section=media&error=invalid_media_file", request.url), 303);
  }

  try {
    const fullPath = path.join(process.cwd(), "public", "uploads", "showcase", imagePath);
    await fs.unlink(fullPath);
    return NextResponse.redirect(new URL("/admin?section=media&media=deleted", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=media&error=media_delete_failed", request.url), 303);
  }
}
