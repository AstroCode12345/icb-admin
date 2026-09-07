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
export type Scope = "main" | "school" | "youth";

export const SCOPES: Scope[] = ["main", "school", "youth"];

/** The content.json keys each portal owns. Anything else it sends is ignored. */
export const SCOPE_KEYS: Record<Scope, string[]> = {
  main: ["prayers", "khateebs", "announcement", "events", "contact", "donateUrl"],
  school: ["sundaySchool"],
  youth: ["youth", "youthEvents"],
};

/** Env var holding each portal's password. */
const ENV_VAR: Record<Scope, string> = {
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

/** Scopes a token carries, or null if it is missing, malformed or unsigned. */
export function scopesFromToken(token: string | null | undefined): Scope[] | null {
  if (!token || !secret()) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const list = token.slice(0, dot);
  const scopes = list.split(",").filter(s => SCOPES.includes(s as Scope)) as Scope[];
  if (!scopes.length || scopes.length !== list.split(",").length) return null;
  // Re-derive rather than compare strings, so a tampered scope list fails.
  const expected = tokenFor(scopes);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return scopes;
}

/**
 * Which portals a password opens. ADMIN_PASSWORD is the master and opens all
 * three, so the site admin keeps one password rather than three. A portal
 * password with no env var set simply never matches.
 */
export function scopesForPassword(password: string): Scope[] {
  if (!password) return [];
  const admin = process.env.ADMIN_PASSWORD;
  if (admin && safeEqual(password, admin)) return [...SCOPES];

  const matched = SCOPES.filter(s => {
    const expected = process.env[ENV_VAR[s]];
    return expected ? safeEqual(password, expected) : false;
  });
  return matched;
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
  const allowed = new Set(scopes.flatMap(s => SCOPE_KEYS[s]));
  const out: Record<string, unknown> = { ...live };
  for (const key of allowed) {
    if (key in incoming) out[key] = incoming[key];
  }
  out.siteUpdated = new Date().toISOString().slice(0, 10);
  return out;
}
