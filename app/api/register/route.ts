import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName || !email) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  return NextResponse.json({
    message: "Registration submitted.",
    player: {
      fullName,
      email
    }
  });
}
