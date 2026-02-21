import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/hq/store";
import { createSessionRecord } from "@/lib/hq/session";

function toPublicUser(user: {
  id: string;
  fullName: string;
  email: string;
  requestedPosition?: string;
  phone?: string;
  role: string;
  status: string;
  activityStatus: string;
  rosterId?: string;
  jerseyNumber?: number;
  equipmentSizes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}) {
  const mobileRole = user.role === "public" ? "supporter" : user.role;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    requestedPosition: user.requestedPosition,
    phone: user.phone,
    role: mobileRole,
    status: user.status,
    activityStatus: user.activityStatus,
    rosterId: user.rosterId,
    jerseyNumber: user.jerseyNumber,
    equipmentSizes: user.equipmentSizes,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function POST(request: Request) {
  let payload: { email?: string; password?: string } = {};
  try {
    payload = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = String(payload.email ?? "").trim();
  const password = String(payload.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const session = await createSessionRecord(user.id);
  return NextResponse.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: toPublicUser(user)
  });
}
