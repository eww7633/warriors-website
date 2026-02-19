import { NextResponse } from "next/server";
import { registerSponsorClick } from "@/lib/hq/ops-data";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const to = url.searchParams.get("to") ?? "/partners";

  try {
    await registerSponsorClick(params.id);
  } catch {
    // Ignore tracking failures, still redirect user.
  }

  return NextResponse.redirect(to, 302);
}
