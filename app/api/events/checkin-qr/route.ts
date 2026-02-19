import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const scanUrl = `${url.origin}/check-in/scan?token=${encodeURIComponent(token)}`;
  const png = await QRCode.toBuffer(scanUrl, {
    type: "png",
    width: 500,
    margin: 2
  });

  return new NextResponse(png, {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store"
    }
  });
}
