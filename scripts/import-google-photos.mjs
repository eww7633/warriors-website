#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const MAX_DRIVE_FOLDERS = 500;

function parseArgs(argv) {
  const args = {
    urls: [],
    file: "",
    outDir: path.join(process.cwd(), "migration", "google-photos")
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file") {
      args.file = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--out") {
      args.outDir = path.resolve(process.cwd(), argv[i + 1] || args.outDir);
      i += 1;
      continue;
    }
    if (token.startsWith("--")) {
      continue;
    }
    args.urls.push(token);
  }

  return args;
}

async function readUrlsFromFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  const raw = await fs.readFile(resolved, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function extractGooglePhotosImageUrls(html) {
  const matches = html.match(/https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9._\-=%?&]+/gim) || [];
  const cleaned = matches
    .map((entry) => entry.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&"))
    .map((entry) => entry.replace(/=w\d+-h\d+[^"'\\s]*/gi, "=s0"));
  return Array.from(new Set(cleaned));
}

function extractDriveFolderId(url) {
  const m = url.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/i);
  return m ? m[1] : "";
}

function extractDriveFolderLinks(html) {
  const out = new Set();
  const matches = html.match(/https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/gim) || [];
  for (const link of matches) {
    out.add(link.split("?")[0]);
  }
  return Array.from(out);
}

function extractDriveFileIds(html) {
  const ids = new Set();

  const fileLinks = html.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/gim) || [];
  for (const link of fileLinks) {
    const m = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (m) ids.add(m[1]);
  }

  const openLinks = html.match(/open\?id=([a-zA-Z0-9_-]+)/gim) || [];
  for (const link of openLinks) {
    const m = link.match(/open\?id=([a-zA-Z0-9_-]+)/i);
    if (m) ids.add(m[1]);
  }

  return Array.from(ids);
}

function toDriveImageCandidates(fileId) {
  return {
    fileId,
    viewUrl: `https://drive.google.com/file/d/${fileId}/view`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; WarriorsGooglePhotosImporter/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function crawlDriveFolder(rootFolderId) {
  const queue = [rootFolderId];
  const seenFolders = new Set();
  const fileIds = new Set();

  while (queue.length > 0) {
    const folderId = queue.shift();
    if (!folderId || seenFolders.has(folderId)) {
      continue;
    }

    seenFolders.add(folderId);

    if (seenFolders.size > MAX_DRIVE_FOLDERS) {
      break;
    }

    const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch {
      continue;
    }

    const childFolderLinks = extractDriveFolderLinks(html);
    for (const link of childFolderLinks) {
      const id = extractDriveFolderId(link);
      if (id && !seenFolders.has(id)) {
        queue.push(id);
      }
    }

    for (const id of extractDriveFileIds(html)) {
      fileIds.add(id);
    }
  }

  return {
    folderCount: seenFolders.size,
    fileIds: Array.from(fileIds)
  };
}

async function main() {
  const args = parseArgs(process.argv);
  let urls = [...args.urls];

  if (args.file) {
    const fileUrls = await readUrlsFromFile(args.file);
    urls = urls.concat(fileUrls);
  }

  urls = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean)));

  if (urls.length === 0) {
    throw new Error("No Google Photos/Drive URLs provided. Pass URLs or --file urls.txt");
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceCount: urls.length,
    imageCount: 0,
    sources: [],
    images: [],
    driveFiles: []
  };

  const globalImages = new Set();
  const globalDriveFiles = new Map();

  for (const url of urls) {
    const driveFolderId = extractDriveFolderId(url);

    if (driveFolderId) {
      try {
        const crawl = await crawlDriveFolder(driveFolderId);

        for (const fileId of crawl.fileIds) {
          const candidate = toDriveImageCandidates(fileId);
          globalDriveFiles.set(fileId, candidate);
          globalImages.add(candidate.thumbnailUrl);
        }

        output.sources.push({
          url,
          type: "google-drive-folder",
          folderCount: crawl.folderCount,
          fileCount: crawl.fileIds.length,
          files: crawl.fileIds.slice(0, 200).map((id) => toDriveImageCandidates(id))
        });

        console.log(`Crawled Drive folder ${url} -> ${crawl.fileIds.length} file IDs across ${crawl.folderCount} folders`);
      } catch (error) {
        output.sources.push({
          url,
          type: "google-drive-folder",
          error: error instanceof Error ? error.message : String(error),
          folderCount: 0,
          fileCount: 0,
          files: []
        });
        console.log(`Failed Drive folder ${url}`);
      }

      continue;
    }

    try {
      const html = await fetchHtml(url);
      const images = extractGooglePhotosImageUrls(html);
      images.forEach((img) => globalImages.add(img));
      output.sources.push({
        url,
        type: "google-photos",
        imageCount: images.length,
        images
      });
      console.log(`Fetched ${url} -> ${images.length} image URLs`);
    } catch (error) {
      output.sources.push({
        url,
        type: "google-photos",
        error: error instanceof Error ? error.message : String(error),
        imageCount: 0,
        images: []
      });
      console.log(`Failed ${url}`);
    }
  }

  output.images = Array.from(globalImages);
  output.driveFiles = Array.from(globalDriveFiles.values());
  output.imageCount = output.images.length;

  await fs.mkdir(args.outDir, { recursive: true });

  const manifestPath = path.join(args.outDir, "manifest.json");
  const listPath = path.join(args.outDir, "images.txt");
  const drivePath = path.join(args.outDir, "drive-files.json");

  await fs.writeFile(manifestPath, JSON.stringify(output, null, 2), "utf-8");
  await fs.writeFile(listPath, output.images.join("\n"), "utf-8");
  await fs.writeFile(drivePath, JSON.stringify(output.driveFiles, null, 2), "utf-8");

  console.log(`Done. Unique image URLs: ${output.imageCount}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Image list: ${listPath}`);
  console.log(`Drive file map: ${drivePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
