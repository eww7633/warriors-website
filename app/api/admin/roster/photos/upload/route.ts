import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/hq/session";
import { canAccessAdminPanel } from "@/lib/hq/permissions";
import { addPlayerPhoto } from "@/lib/hq/roster";

function sanitizeExt(filename: string) {
  const lower = filename.toLowerCase();
  return ".jpg";
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || !(await canAccessAdminPanel(actor))) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const makePrimary = String(formData.get("makePrimary") ?? "").trim() === "on";
  const file = formData.get("photoFile");

  if (!userId || !file || typeof file === "string") {
    return NextResponse.redirect(new URL("/admin/roster?error=invalid_photo_payload", request.url), 303);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.redirect(new URL("/admin/roster?error=empty_photo_file", request.url), 303);
  }
  const maxBytes = 8 * 1024 * 1024;
  if (bytes.length > maxBytes) {
    return NextResponse.redirect(new URL("/admin/roster?error=photo_file_too_large", request.url), 303);
  }

  try {
    const ext = sanitizeExt(file.name || "");
    const fileName = `${userId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "headshots");
    await fs.mkdir(uploadDir, { recursive: true });

    const fullPath = path.join(uploadDir, fileName);
    // Normalize to a consistent roster headshot format.
    const processed = await sharp(bytes)
      .rotate()
      .resize(900, 1200, { fit: "cover", position: "attention" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    await fs.writeFile(fullPath, processed);

    const imageUrl = `/uploads/headshots/${fileName}`;
    await addPlayerPhoto({
      userId,
      imageUrl,
      caption,
      makePrimary
    });

    return NextResponse.redirect(new URL("/admin/roster?saved=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/roster?error=photo_upload_failed", request.url), 303);
  }
}
