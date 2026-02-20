import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/hq/session";

function allowedOrigin(origin: string | null) {
  if (!origin) {
    return "";
  }
  const defaultAllowed = [
    "https://pghwarriorhockey.us",
    "https://www.pghwarriorhockey.us",
    "http://localhost:3000"
  ];
  const envAllowed = (process.env.PUBLIC_SITE_ORIGIN_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const allowlist = new Set([...defaultAllowed, ...envAllowed]);
  return allowlist.has(origin) ? origin : "";
}

function summaryPayload(hqBaseUrl: string, publicBaseUrl: string, role?: string) {
  const loggedIn = Boolean(role);
  const isPlayerOrAdmin = role === "player" || role === "admin";
  return {
    loggedIn,
    role: role || "public",
    actions: {
      primary: loggedIn
        ? isPlayerOrAdmin
          ? { label: "HQ", href: `${hqBaseUrl}${role === "admin" ? "/admin" : "/player"}` }
          : { label: "Support", href: `${publicBaseUrl}/donate` }
        : { label: "Join", href: `${hqBaseUrl}/join` },
      secondary: loggedIn
        ? { label: "Log Out", href: `${hqBaseUrl}/api/public/auth/logout` }
        : { label: "Log In", href: `${hqBaseUrl}/login` }
    }
  };
}

export async function GET(request: Request) {
  const hqBaseUrl = new URL(request.url).origin;
  const publicBaseUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://pghwarriorhockey.us";
  const actor = await getCurrentUserFromRequest(request);
  const payload = summaryPayload(hqBaseUrl, publicBaseUrl, actor?.role);
  const origin = allowedOrigin(request.headers.get("origin"));
  const response = NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      user: actor
        ? {
            id: actor.id,
            fullName: actor.fullName,
            email: actor.email,
            role: actor.role,
            status: actor.status
          }
        : null,
      ...payload
    },
    { status: 200 }
  );
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export async function OPTIONS(request: Request) {
  const origin = allowedOrigin(request.headers.get("origin"));
  const response = new NextResponse(null, { status: 204 });
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Vary", "Origin");
  }
  return response;
}
