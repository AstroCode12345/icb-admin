import { NextResponse } from "next/server";
import {
  Portal, PORTAL_IDS, isLobbyPassword, isPortalPassword,
  tokenFor, scopesFromToken,
} from "../../../lib/scopes";

/**
 * Two-stage sign in.
 *
 *   POST { password }            the shared password, returns a lobby token
 *   POST { password, portal }    that portal's password, returns a portal token
 *
 * The second call requires the lobby token, so both keys are genuinely needed:
 * the shared password alone edits nothing, and a portal password alone gets
 * past no door.
 */
export async function POST(req: Request) {
  if (!process.env.ADMIN_PASSWORD && !process.env.TOKEN_SECRET) {
    return NextResponse.json(
      { error: "No ADMIN_PASSWORD or TOKEN_SECRET set in .env.local" },
      { status: 500 },
    );
  }

  const { password, portal } = await req.json();

  // Stage 1: the shared password.
  if (!portal) {
    if (!isLobbyPassword(password ?? "")) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    return NextResponse.json({ token: tokenFor(["lobby"]), scopes: ["lobby"] });
  }

  // Stage 2: unlock one portal. Must already be through the front door.
  if (!PORTAL_IDS.includes(portal as Portal)) {
    return NextResponse.json({ error: "Unknown portal" }, { status: 400 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  const have = scopesFromToken(auth.replace("Bearer ", "").trim());
  if (!have || !have.includes("lobby")) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (!isPortalPassword(password ?? "", portal as Portal)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Keep "lobby" so the chooser stays reachable without signing in again.
  const scopes: Portal[] | string[] = ["lobby", portal];
  return NextResponse.json({ token: tokenFor(scopes as never), scopes });
}
