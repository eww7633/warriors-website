#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

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

function extractImageUrls(html) {
  const matches = html.match(/https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9._\-=%?&]+/gim) || [];
  const cleaned = matches
    .map((entry) => entry.replace(/\\u003d/g, "=").replace(/\\u0026/g, "&"))
    .map((entry) => entry.replace(/=w\d+-h\d+[^"'\\s]*/gi, "=s0"));
  return Array.from(new Set(cleaned));
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

async function main() {
  const args = parseArgs(process.argv);
  let urls = [...args.urls];

  if (args.file) {
    const fileUrls = await readUrlsFromFile(args.file);
    urls = urls.concat(fileUrls);
  }

  urls = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean)));

  if (urls.length === 0) {
    throw new Error("No Google Photos URLs provided. Pass URLs or --file urls.txt");
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceCount: urls.length,
    imageCount: 0,
    sources: [],
    images: []
  };

  const globalImages = new Set();

  for (const url of urls) {
    try {
      const html = await fetchHtml(url);
      const images = extractImageUrls(html);
      images.forEach((img) => globalImages.add(img));
      output.sources.push({
        url,
        imageCount: images.length,
        images
      });
      console.log(`Fetched ${url} -> ${images.length} image URLs`);
    } catch (error) {
      output.sources.push({
        url,
        error: error instanceof Error ? error.message : String(error),
        imageCount: 0,
        images: []
      });
      console.log(`Failed ${url}`);
    }
  }

  output.images = Array.from(globalImages);
  output.imageCount = output.images.length;

  await fs.mkdir(args.outDir, { recursive: true });

  const manifestPath = path.join(args.outDir, "manifest.json");
  const listPath = path.join(args.outDir, "images.txt");

  await fs.writeFile(manifestPath, JSON.stringify(output, null, 2), "utf-8");
  await fs.writeFile(listPath, output.images.join("\n"), "utf-8");

  console.log(`Done. Unique image URLs: ${output.imageCount}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Image list: ${listPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
