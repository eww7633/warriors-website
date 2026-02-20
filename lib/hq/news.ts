import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImageUrl?: string;
  videoUrl?: string;
  galleryImageUrls: string[];
  tags: string[];
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  authorUserId?: string;
};

type NewsStore = {
  posts: NewsPost[];
};

const defaultStore: NewsStore = {
  posts: []
};

function storePath() {
  if (process.env.NEWS_STORE_PATH) {
    return process.env.NEWS_STORE_PATH;
  }
  if (process.env.NODE_ENV === "production") {
    return "/tmp/news-posts.json";
  }
  return path.join(process.cwd(), "data", "news-posts.json");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toSlug(raw: string) {
  const base = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `news-${Date.now()}`;
}

async function ensureStoreFile() {
  const filePath = storePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
    return;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8")) as Partial<NewsStore>;
    const normalized: NewsStore = {
      posts: Array.isArray(parsed.posts) ? parsed.posts : []
    };
    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf-8");
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  return JSON.parse(await fs.readFile(storePath(), "utf-8")) as NewsStore;
}

async function writeStore(store: NewsStore) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf-8");
}

export async function listAllNewsPosts() {
  const store = await readStore();
  return [...store.posts].sort((a, b) => {
    const aTime = new Date(a.publishedAt || a.createdAt).getTime();
    const bTime = new Date(b.publishedAt || b.createdAt).getTime();
    return bTime - aTime;
  });
}

export async function listPublishedNewsPosts(limit?: number) {
  const all = await listAllNewsPosts();
  const published = all
    .filter((post) => post.published)
    .sort((a, b) => {
      const aFeatured = a.tags.includes("home_feature") ? 1 : 0;
      const bFeatured = b.tags.includes("home_feature") ? 1 : 0;
      if (aFeatured !== bFeatured) {
        return bFeatured - aFeatured;
      }
      const aTime = new Date(a.publishedAt || a.createdAt).getTime();
      const bTime = new Date(b.publishedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  return typeof limit === "number" ? published.slice(0, limit) : published;
}

export async function getNewsPostBySlug(slug: string) {
  const store = await readStore();
  return store.posts.find((entry) => entry.slug === slug);
}

export async function deleteNewsPost(postId: string) {
  const store = await readStore();
  const before = store.posts.length;
  store.posts = store.posts.filter((entry) => entry.id !== postId);
  await writeStore(store);
  return { removed: before - store.posts.length };
}

export async function upsertNewsPost(input: {
  postId?: string;
  title: string;
  slug?: string;
  summary: string;
  body: string;
  coverImageUrl?: string;
  videoUrl?: string;
  galleryImageUrls?: string[];
  tags?: string[];
  published: boolean;
  authorUserId?: string;
}) {
  const store = await readStore();
  const requestedSlug = normalizeText(input.slug) ? toSlug(input.slug || "") : toSlug(input.title);

  const duplicateSlug = store.posts.find(
    (entry) => entry.slug === requestedSlug && entry.id !== input.postId
  );

  const slug = duplicateSlug ? `${requestedSlug}-${Date.now().toString().slice(-4)}` : requestedSlug;

  const galleryImageUrls = (input.galleryImageUrls || [])
    .map((entry) => normalizeText(entry))
    .filter((entry): entry is string => Boolean(entry));

  const tags = (input.tags || [])
    .map((entry) => normalizeText(entry)?.toLowerCase())
    .filter((entry): entry is string => Boolean(entry));

  if (input.postId) {
    const idx = store.posts.findIndex((entry) => entry.id === input.postId);
    if (idx < 0) {
      throw new Error("news_post_not_found");
    }

    const current = store.posts[idx];
    const next: NewsPost = {
      ...current,
      title: input.title,
      slug,
      summary: input.summary,
      body: input.body,
      coverImageUrl: normalizeText(input.coverImageUrl),
      videoUrl: normalizeText(input.videoUrl),
      galleryImageUrls,
      tags,
      published: input.published,
      publishedAt: input.published ? current.publishedAt || nowIso() : undefined,
      updatedAt: nowIso(),
      authorUserId: input.authorUserId || current.authorUserId
    };

    store.posts[idx] = next;
    await writeStore(store);
    return next;
  }

  const created: NewsPost = {
    id: crypto.randomUUID(),
    slug,
    title: input.title,
    summary: input.summary,
    body: input.body,
    coverImageUrl: normalizeText(input.coverImageUrl),
    videoUrl: normalizeText(input.videoUrl),
    galleryImageUrls,
    tags,
    published: input.published,
    publishedAt: input.published ? nowIso() : undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    authorUserId: input.authorUserId
  };

  store.posts.push(created);
  await writeStore(store);
  return created;
}
