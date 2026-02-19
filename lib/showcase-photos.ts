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

const fallbackPhotos: ShowcasePhoto[] = [
  {
    id: "fallback-1",
    imageUrl: "/brand/warriors-logo-font.svg",
    viewUrl: "/"
  }
];

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
