import crypto from "crypto";

/**
 * Each portal has its own password, so the person who runs the Youth Group can
 * be given access to the Youth portal without also being handed the keys to the
 * prayer times.
 *
 * A scope is enforced twice: the token only opens its own portal, and publish
 * only writes that portal's keys back into content.json. The second check is
 * the one that matters. Without it a youth token could POST a whole content
 * file and quietly replace the Iqamah times.
 */
export type Portal = "main" | "school" | "youth";
export type Scope = Portal | "lobby";

export const PORTAL_IDS: Portal[] = ["main", "school", "youth"];
export const SCOPES: Portal[] = PORTAL_IDS;

/** The content.json keys each portal owns. Anything else it sends is ignored. */
export const SCOPE_KEYS: Record<string, string[]> = {
  // "lobby" is the first key only. It gets you to the chooser and nothing else,
  // so it owns no content and can publish nothing.
  lobby: [],
  main: ["prayers", "khateebs", "announcement", "events", "contact", "donateUrl"],
  school: ["sundaySchool"],
  youth: ["youth", "youthEvents"],
};

/** Env var holding each portal's password. */
const ENV_VAR: Record<Portal, string> = {
  main: "MAIN_PASSWORD",
  school: "SCHOOL_PASSWORD",
  youth: "YOUTH_PASSWORD",
};

function secret() {
  // One server-side secret signs every token, so a token cannot be forged by
  // someone who knows only their own portal password.
  return process.env.TOKEN_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function tokenFor(scopes: Scope[]) {
  const list = [...scopes].sort().join(",");
  const sig = crypto.createHmac("sha256", secret())
    .update("icb-admin-v2:" + list).digest("hex");
  return `${list}.${sig}`;
}

/**
 * Scopes a token carries, or null if it is missing, malformed, unsigned, or
 * structurally impossible.
 *
 * The mint path (this file's auth route) never issues more than one real
 * portal scope per token, by construction, so this rejects any token
 * claiming otherwise as a fixed rule rather than trusting the mint path to
 * stay correct forever. That matters because tokens are not versioned or
 * expiring: an earlier iteration of this auth system minted a single
 * ADMIN_PASSWORD login straight into `[main, school, youth]` (no lobby
 * step existed yet), and any token from that era, still holding a valid
 * signature under an unrotated secret, would otherwise still be honored
 * today. This check would have caught it even without the secret rotation
 * that accompanied this fix.
 */
export function scopesFromToken(token: string | null | undefined): Scope[] | null {
  if (!token || !secret()) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const list = token.slice(0, dot);
  const valid: Scope[] = [...PORTAL_IDS, "lobby"];
  const scopes = list.split(",").filter(s => valid.includes(s as Scope)) as Scope[];
  if (!scopes.length || scopes.length !== list.split(",").length) return null;
  const realPortals = scopes.filter(s => s !== "lobby");
  if (realPortals.length > 1) return null;
  // Re-derive rather than compare strings, so a tampered scope list fails.
  const expected = tokenFor(scopes);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return scopes;
}

/**
 * Getting in takes two keys.
 *
 * The shared ADMIN_PASSWORD opens the front door and nothing else: you land on
 * the chooser and can see which portals exist. Opening one then needs that
 * portal's own password. So the shared password alone edits nothing, and a
 * leaked portal password is no use without the shared one.
 */
export function isLobbyPassword(password: string): boolean {
  const admin = process.env.ADMIN_PASSWORD;
  return Boolean(password && admin && safeEqual(password, admin));
}

/** Does this password open that particular portal? */
export function isPortalPassword(password: string, portal: Portal): boolean {
  if (!password || !PORTAL_IDS.includes(portal)) return false;
  const own = process.env[ENV_VAR[portal]];
  // A portal with no password of its own falls back to the shared one, so a
  // half-configured install is reachable rather than locked.
  if (!own) return isLobbyPassword(password);
  return safeEqual(password, own);
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Build the content to publish: start from what is live, and let the caller
 * overwrite only the keys their scopes own.
 */
export function mergeScoped(
  live: Record<string, unknown>,
  incoming: Record<string, unknown>,
  scopes: Scope[],
) {
  const allowed = new Set(scopes.flatMap(s => SCOPE_KEYS[s] ?? []));
  const out: Record<string, unknown> = { ...live };
  for (const key of allowed) {
    if (key in incoming) out[key] = incoming[key];
  }
  out.siteUpdated = new Date().toISOString().slice(0, 10);
  return out;
}
