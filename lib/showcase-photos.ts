import fs from "node:fs/promises";
import path from "node:path";

type DriveFile = {
  fileId: string;
  viewUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
};

export type ShowcasePhoto = {
  id: string;
  imageUrl: string;
  viewUrl: string;
};

export type LocalShowcasePhoto = {
  id: string;
  fileName: string;
  gallery: string;
  imageUrl: string;
  viewUrl: string;
};

const fallbackPhotos: ShowcasePhoto[] = [
  {
    id: "fallback-1",
    imageUrl: "/brand/warriors-logo-font.svg",
    viewUrl: "/"
  }
];

const localExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const localDirPath = () => path.join(process.cwd(), "public", "uploads", "showcase");

async function listLocalFileEntries() {
  const root = localDirPath();
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: Array<{ gallery: string; name: string }> = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      if (localExtensions.has(path.extname(entry.name).toLowerCase())) {
        files.push({ gallery: "general", name: entry.name });
      }
      continue;
    }
    if (!entry.isDirectory()) continue;

    const gallery = entry.name;
    const nested = await fs.readdir(path.join(root, gallery), { withFileTypes: true });
    for (const child of nested) {
      if (!child.isFile()) continue;
      if (!localExtensions.has(path.extname(child.name).toLowerCase())) continue;
      files.push({ gallery, name: child.name });
    }
  }

  return files;
}

export async function listLocalShowcasePhotos() {
  try {
    const files = await listLocalFileEntries();
    return files
      .sort((a, b) => {
        const galleryDelta = a.gallery.localeCompare(b.gallery);
        if (galleryDelta !== 0) return galleryDelta;
        return a.name.localeCompare(b.name);
      })
      .map((entry) => {
        const prefix = entry.gallery === "general" ? "" : `${entry.gallery}/`;
        const imageUrl = `/uploads/showcase/${prefix}${entry.name}`;
        return {
          id: `local-${entry.gallery}-${entry.name}`,
          fileName: entry.name,
          gallery: entry.gallery,
          imageUrl,
          viewUrl: imageUrl
        } satisfies LocalShowcasePhoto;
      });
  } catch {
    return [] as LocalShowcasePhoto[];
  }
}

export async function listLocalShowcaseGalleries() {
  const photos = await listLocalShowcasePhotos();
  return Array.from(new Set(photos.map((entry) => entry.gallery))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function pickEvenly<T>(items: T[], count: number) {
  if (items.length <= count) {
    return items;
  }

  const picked: T[] = [];
  const step = (items.length - 1) / (count - 1);

  for (let i = 0; i < count; i += 1) {
    const index = Math.round(i * step);
    picked.push(items[index]);
  }

  return picked;
}

export async function getHomepageShowcasePhotos(limit = 9): Promise<ShowcasePhoto[]> {
  const filePath = path.join(process.cwd(), "migration", "google-photos", "drive-files.json");

  try {
    const localPhotos = (await listLocalShowcasePhotos()).map((entry) => ({
      id: entry.id,
      imageUrl: entry.imageUrl,
      viewUrl: entry.viewUrl
    }));

    if (localPhotos.length > 0) {
      return pickEvenly(localPhotos, limit);
    }
  } catch {
    // Fall through to legacy Google-export file support.
  }

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return fallbackPhotos;
    }

    const candidates = parsed
      .filter((entry): entry is DriveFile => {
        return (
          entry &&
          typeof entry === "object" &&
          typeof entry.fileId === "string" &&
          typeof entry.thumbnailUrl === "string" &&
          typeof entry.viewUrl === "string"
        );
      })
      .map((entry) => ({
        id: entry.fileId,
        imageUrl: entry.thumbnailUrl,
        viewUrl: entry.viewUrl
      }));

    if (candidates.length === 0) {
      return fallbackPhotos;
    }

    return pickEvenly(candidates, limit);
  } catch {
    return fallbackPhotos;
  }
}
