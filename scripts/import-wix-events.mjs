#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function parseEnvLine(line) {
  const idx = line.indexOf("=");
  if (idx <= 0) {
    return null;
  }
  const key = line.slice(0, idx).trim();
  if (!key || key.startsWith("#")) {
    return null;
  }
  const raw = line.slice(idx + 1).trim();
  const value = raw.replace(/^['"]|['"]$/g, "");
  return { key, value };
}

async function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL) {
    return;
  }
  const envPath = path.join(process.cwd(), ".env");
  try {
    const content = await fs.readFile(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
  } catch {
    // Ignore missing .env.
  }
}

function parseCsv(content) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((entry) => entry.trim());
  return rows.slice(1).map((values) => {
    const record = {};
    for (let i = 0; i < headers.length; i += 1) {
      record[headers[i]] = (values[i] ?? "").trim();
    }
    return record;
  });
}

function val(record, keys) {
  const lowerMap = new Map(
    Object.entries(record).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? "").trim()])
  );
  for (const key of keys) {
    const found = lowerMap.get(key.toLowerCase());
    if (found) {
      return found;
    }
  }
  return "";
}

function parseDateTime(input) {
  if (!input) {
    return null;
  }
  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const cleaned = input.replace(/\s+/g, " ").trim();
  const fallback = new Date(cleaned);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  return null;
}

function normalizeEvent(record) {
  const title =
    val(record, ["event title", "title", "event name", "name", "subject"]) || "Untitled Event";
  const startRaw =
    val(record, [
      "start date",
      "start",
      "starts at",
      "date",
      "event date",
      "date/time"
    ]) ||
    [
      val(record, ["date", "event date"]),
      val(record, ["start time", "time"])
    ]
      .filter(Boolean)
      .join(" ");
  const endRaw =
    val(record, ["end date", "end", "ends at"]) ||
    [
      val(record, ["end date"]),
      val(record, ["end time"])
    ]
      .filter(Boolean)
      .join(" ");
  const location =
    val(record, ["location", "venue", "address", "event location"]) || undefined;
  const details =
    val(record, ["description", "details", "about event", "event details"]) || "";
  const status = val(record, ["status", "event status"]).toLowerCase();

  let visibility = "public";
  if (status.includes("private")) {
    visibility = "player_only";
  }

  return {
    title,
    startsAt: parseDateTime(startRaw),
    endsAt: parseDateTime(endRaw),
    location,
    publicDetails: details || "Imported from Wix Events.",
    privateDetails: "",
    visibility,
    published: !status.includes("draft") && !status.includes("hidden"),
    raw: record
  };
}

function toCandidatePaths(argPath) {
  if (argPath) {
    return [path.resolve(process.cwd(), argPath)];
  }
  return [
    path.join(process.cwd(), "migration", "wix", "exports", "events.csv"),
    path.join(process.cwd(), "migration", "wix", "events.csv")
  ];
}

async function resolveCsvPath(argPath) {
  const candidates = toCandidatePaths(argPath);
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next.
    }
  }

  const exportsDir = path.join(process.cwd(), "migration", "wix", "exports");
  try {
    const files = await fs.readdir(exportsDir);
    const eventCsv = files.find((entry) => {
      const lower = entry.toLowerCase();
      return lower.endsWith(".csv") && lower.includes("event");
    });
    if (eventCsv) {
      return path.join(exportsDir, eventCsv);
    }
  } catch {
    // Ignore.
  }

  return null;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const pathArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

  await loadDotEnvIfNeeded();
  if (!process.env.DATABASE_URL && !isDryRun) {
    throw new Error("DATABASE_URL is not set. Set it in .env or environment variables.");
  }

  const csvPath = await resolveCsvPath(pathArg);
  if (!csvPath) {
    throw new Error("Could not find events CSV. Provide path or place at migration/wix/exports/.");
  }

  const csvContent = await fs.readFile(csvPath, "utf-8");
  const rows = parseCsv(csvContent);
  const normalized = rows.map(normalizeEvent);

  const previewPath = path.join(process.cwd(), "migration", "wix", "events-normalized.json");
  await fs.mkdir(path.dirname(previewPath), { recursive: true });
  await fs.writeFile(previewPath, JSON.stringify(normalized, null, 2), "utf-8");

  if (isDryRun) {
    const parseable = normalized.filter((entry) => entry.startsAt).length;
    console.log(`Dry run complete for ${csvPath}`);
    console.log(`Total rows: ${rows.length}`);
    console.log(`Rows with parseable start date: ${parseable}`);
    console.log(`Normalized output: ${previewPath}`);
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });

  let created = 0;
  let skipped = 0;

  for (const item of normalized) {
    if (!item.startsAt) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.event.findFirst({
      where: {
        title: item.title,
        startsAt: item.startsAt
      },
      select: { id: true }
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.event.create({
      data: {
        title: item.title,
        startsAt: item.startsAt,
        publicDetails: item.publicDetails,
        privateDetails: item.privateDetails,
        visibility: item.visibility,
        published: item.published,
        locationPublic: item.location || null,
        locationPrivate: null
      }
    });
    created += 1;
  }

  await prisma.$disconnect();

  console.log(`Imported events from ${csvPath}`);
  console.log(`Total rows: ${rows.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Normalized output: ${previewPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
