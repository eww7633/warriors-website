export type SocialPost = {
  id: string;
  platform: "instagram" | "facebook";
  text: string;
  permalink: string;
  imageUrl?: string;
  createdAt?: string;
};

function hasMetaConfig() {
  return Boolean(
    process.env.META_GRAPH_ACCESS_TOKEN &&
      process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID &&
      process.env.META_FACEBOOK_PAGE_ID
  );
}

async function fetchInstagramPosts(limit = 4) {
  const token = process.env.META_GRAPH_ACCESS_TOKEN;
  const igId = process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) return [] as SocialPost[];

  const url = new URL(`https://graph.facebook.com/v22.0/${igId}/media`);
  url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) return [] as SocialPost[];
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
    }>;
  };

  return (json.data || []).map((entry) => ({
    id: entry.id,
    platform: "instagram",
    text: (entry.caption || "").trim(),
    permalink: entry.permalink || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com",
    imageUrl: entry.media_type === "VIDEO" ? entry.thumbnail_url : entry.media_url,
    createdAt: entry.timestamp
  }));
}

async function fetchFacebookPosts(limit = 4) {
  const token = process.env.META_GRAPH_ACCESS_TOKEN;
  const pageId = process.env.META_FACEBOOK_PAGE_ID;
  if (!token || !pageId) return [] as SocialPost[];

  const url = new URL(`https://graph.facebook.com/v22.0/${pageId}/posts`);
  url.searchParams.set("fields", "id,message,permalink_url,created_time,full_picture");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) return [] as SocialPost[];
  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      message?: string;
      permalink_url?: string;
      full_picture?: string;
      created_time?: string;
    }>;
  };

  return (json.data || []).map((entry) => ({
    id: entry.id,
    platform: "facebook",
    text: (entry.message || "").trim(),
    permalink: entry.permalink_url || process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com",
    imageUrl: entry.full_picture,
    createdAt: entry.created_time
  }));
}

export async function getHomepageSocialPosts() {
  if (!hasMetaConfig()) {
    return [] as SocialPost[];
  }

  const [ig, fb] = await Promise.all([
    fetchInstagramPosts(4),
    fetchFacebookPosts(4)
  ]);

  return [...ig, ...fb]
    .sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTs - aTs;
    })
    .slice(0, 6);
}
