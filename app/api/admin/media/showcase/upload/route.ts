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

function sanitizeGalleryName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return normalized || "general";
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await userHasPermission(actor, "manage_media"))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const galleryNameRaw = String(formData.get("galleryName") ?? "").trim();
  const galleryName = sanitizeGalleryName(galleryNameRaw || "general");
  const inputFiles = formData
    .getAll("photoFiles")
    .filter((entry): entry is File => typeof entry !== "string" && entry.size > 0);
  const singleFile = formData.get("photoFile");
  const files = inputFiles.length > 0
    ? inputFiles
    : singleFile && typeof singleFile !== "string" && singleFile.size > 0
    ? [singleFile]
    : [];

  if (files.length === 0) {
    return NextResponse.redirect(new URL("/admin?section=media&error=invalid_media_payload", request.url), 303);
  }

  const maxBytes = 12 * 1024 * 1024;

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "showcase", galleryName);
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.length === 0) continue;
      if (bytes.length > maxBytes) {
        return NextResponse.redirect(new URL("/admin?section=media&error=media_file_too_large", request.url), 303);
      }

      const base = sanitizeBaseName(file.name.replace(/\.[^.]+$/, "")) || "showcase";
      const fileName = `${Date.now()}-${base}-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const fullPath = path.join(uploadDir, fileName);

      const processed = await sharp(bytes)
        .rotate()
        .resize(2000, 1320, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
      await fs.writeFile(fullPath, processed);
    }

    return NextResponse.redirect(new URL("/admin?section=media&media=saved", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin?section=media&error=media_upload_failed", request.url), 303);
  }
}
