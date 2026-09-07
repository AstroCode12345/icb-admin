import { NextResponse } from "next/server";
import { scopesForPassword, tokenFor } from "../../../lib/scopes";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!process.env.ADMIN_PASSWORD && !process.env.TOKEN_SECRET) {
    return NextResponse.json(
      { error: "No ADMIN_PASSWORD or TOKEN_SECRET set in .env.local" },
      { status: 500 },
    );
  }

  const scopes = scopesForPassword(password ?? "");
  if (!scopes.length) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ token: tokenFor(scopes), scopes });
}
