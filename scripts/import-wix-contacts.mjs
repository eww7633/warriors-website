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
    // Ignore missing .env file.
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

function normalizeContact(record) {
  const firstName = val(record, ["first name", "firstname", "first"]);
  const lastName = val(record, ["last name", "lastname", "last"]);
  const fullNameRaw = val(record, ["name", "full name", "contact", "display name"]);
  const fullName = fullNameRaw || [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const email = val(record, [
    "email",
    "email address",
    "primary email",
    "e-mail",
    "email 1"
  ]).toLowerCase() || null;
  const phone =
    val(record, [
      "phone",
      "phone number",
      "mobile",
      "primary phone",
      "phone 1",
      "phone 2",
      "phone1",
      "phone2"
    ]) || null;
  const tags = val(record, ["tags", "labels", "groups"]) || null;
  const notes = val(record, ["notes", "note"]) || null;

  return { fullName, email, phone, tags, notes, rawJson: record };
}

function toCandidatePaths(argPath) {
  if (argPath) {
    return [path.resolve(process.cwd(), argPath)];
  }
  return [
    path.join(process.cwd(), "migration", "wix", "contacts.csv"),
    path.join(process.cwd(), "migration", "wix", "exports", "contacts-3.csv"),
    path.join(process.cwd(), "nigration", "contacts.csv"),
    path.join(process.cwd(), "contacts.csv")
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
    const csv = files.find((entry) => entry.toLowerCase().endsWith(".csv"));
    if (csv) {
      return path.join(exportsDir, csv);
    }
  } catch {
    // Ignore directory scan failures.
  }

  return null;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const pathArg = process.argv
    .slice(2)
    .find((arg) => !arg.startsWith("--"));

  await loadDotEnvIfNeeded();

  if (!process.env.DATABASE_URL && !isDryRun) {
    throw new Error("DATABASE_URL is not set. Set it in .env or environment variables.");
  }

  const csvPath = await resolveCsvPath(pathArg);
  if (!csvPath) {
    throw new Error(
      "Could not find contacts CSV. Pass file path or place it at migration/wix/contacts.csv."
    );
  }

  const csvContent = await fs.readFile(csvPath, "utf-8");
  const rawRows = parseCsv(csvContent);
  const normalized = rawRows.map(normalizeContact);

  const summaryPath = path.join(process.cwd(), "migration", "wix", "contacts-normalized.json");
  await fs.mkdir(path.dirname(summaryPath), { recursive: true });
  await fs.writeFile(summaryPath, JSON.stringify(normalized, null, 2), "utf-8");

  if (isDryRun) {
    console.log(`Dry run complete for ${csvPath}`);
    console.log(`Total rows: ${rawRows.length}`);
    console.log(`Normalized output: ${summaryPath}`);
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });

  let created = 0;
  let skipped = 0;

  for (const contact of normalized) {
    if (!contact.email && !contact.phone && !contact.fullName) {
      skipped += 1;
      continue;
    }

    const duplicate = contact.email
      ? await prisma.contactLead.findFirst({
          where: {
            source: "wix",
            email: contact.email
          },
          select: { id: true }
        })
      : null;

    if (duplicate) {
      skipped += 1;
      continue;
    }

    await prisma.contactLead.create({
      data: {
        fullName: contact.fullName,
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags,
        notes: contact.notes,
        source: "wix",
        rawJson: contact.rawJson
      }
    });
    created += 1;
  }

  await prisma.$disconnect();

  console.log(`Imported contacts from ${csvPath}`);
  console.log(`Total rows: ${rawRows.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Normalized output: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
