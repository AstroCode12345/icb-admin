import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not set in .env.local" }, { status: 500 });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Simple deterministic token — derived from the password so no DB needed
  const token = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update("icb-admin-v1")
    .digest("hex");

  return NextResponse.json({ token });
}
