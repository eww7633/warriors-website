import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/hq/session";
import { userHasPermission } from "@/lib/hq/permissions";

function sanitizeBaseName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_media"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const file = formData.get("photoFile");
  if (!file || typeof file === "string") {
    return NextResponse.redirect(new URL("/admin?section=media&error=invalid_media_payload", request.url), 303);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.redirect(new URL("/admin?section=media&error=empty_media_file", request.url), 303);
  }

  const maxBytes = 12 * 1024 * 1024;
  if (bytes.length > maxBytes) {
    return NextResponse.redirect(new URL("/admin?section=media&error=media_file_too_large", request.url), 303);
  }

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "showcase");
    await fs.mkdir(uploadDir, { recursive: true });
    const base = sanitizeBaseName((file as File).name.replace(/\.[^.]+$/, "")) || "showcase";
    const fileName = `${Date.now()}-${base}-${crypto.randomUUID().slice(0, 8)}.jpg`;
    const fullPath = path.join(uploadDir, fileName);

    const processed = await sharp(bytes)
      .rotate()
      .resize(2000, 1320, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(fullPath, processed);

    return NextResponse.redirect(new URL("/admin?section=media&media=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=media&error=media_upload_failed", request.url), 303);
  }
}
