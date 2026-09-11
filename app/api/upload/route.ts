import { NextResponse } from "next/server";
import { scopesFromToken } from "../../../lib/scopes";

/**
 * Upload a flyer into the website repo under /images/events/.
 *
 * There is no image store behind this site, just files in a repo, so an upload
 * is a commit. Vercel redeploys on the commit and the image is then served as a
 * plain static file. That keeps the flyer in the same place as everything else
 * on the site rather than depending on some third-party host staying up.
 */

const FOLDER = "images/events";
const MAX_BYTES = 4 * 1024 * 1024;

// Only formats a browser will render inline. SVG is deliberately excluded: it
// can carry script, and these files are served from the site's own origin.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function repo() {
  return process.env.GITHUB_REPO ?? "";
}

/** Lowercase, dash-separated, no path segments, always our own extension. */
function safeName(name: string, ext: string) {
  const base = (name || "flyer")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "flyer";
  // A date prefix keeps the folder readable and makes collisions unlikely
  // without resorting to opaque hashes in the URL.
  const stamp = new Date().toISOString().slice(0, 10);
  return `${stamp}-${base}.${ext}`;
}

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const scopes = scopesFromToken(auth.replace("Bearer ", "").trim());
  // Only the portals that own an events list may add a flyer.
  if (!scopes || !scopes.some(s => s === "main" || s === "youth")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GITHUB_TOKEN || !repo()) {
    return NextResponse.json({
      error: "Not connected to the website repository, so the image was not uploaded.",
    }, { status: 400 });
  }

  const { filename, contentType, data } = await req.json();

  const ext = ALLOWED[contentType];
  if (!ext) {
    return NextResponse.json({
      error: "That file type is not supported. Use a JPG, PNG, WebP or GIF.",
    }, { status: 400 });
  }

  const base64 = String(data ?? "").split(",").pop() ?? "";
  const bytes = Math.floor(base64.length * 3 / 4);
  if (!base64) {
    return NextResponse.json({ error: "No image data received." }, { status: 400 });
  }
  if (bytes > MAX_BYTES) {
    return NextResponse.json({
      error: `That image is ${(bytes / 1024 / 1024).toFixed(1)}MB. Please use one under 4MB.`,
    }, { status: 400 });
  }

  const name = safeName(filename, ext);
  const path = `${FOLDER}/${name}`;
  const url = `https://api.github.com/repos/${repo()}/contents/${path}`;

  // A same-named file would need its sha to overwrite. The date prefix makes
  // that unlikely, but two uploads of the same photo on one day would collide.
  let sha: string | undefined;
  const existing = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (existing.ok) sha = (await existing.json()).sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      message: `Add event flyer ${name} via ICB Admin`,
      content: base64,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "Upload failed", detail }, { status: 502 });
  }

  // The path the website will serve it from once the deploy finishes.
  return NextResponse.json({ path: `/${path}`, bytes });
}
