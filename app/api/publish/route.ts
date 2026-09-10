import { NextResponse } from "next/server";
import { scopesFromToken, mergeScoped } from "../../../lib/scopes";

function scopesOf(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  return scopesFromToken(auth.replace("Bearer ", "").trim());
}

const FILE = "content.json";

// Read the repo per request, not once at module load. Next reloads .env.local
// in dev, but a module-level `const API = ...` keeps whatever the value was
// when the file was first imported. That is how three publishes went to the
// old repo after GITHUB_REPO had already been corrected on disk.
function repo() {
  return process.env.GITHUB_REPO ?? "";
}
function apiUrl() {
  return `https://api.github.com/repos/${repo()}/contents/${FILE}`;
}

// POST — write updated content.json back to GitHub
export async function POST(req: Request) {
  const scopes = scopesOf(req);
  if (!scopes) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, sha } = await req.json();

  // Refuse to write when the app is running on the development stub. Without
  // this the request goes to GitHub with a placeholder sha and fails with a
  // confusing API error instead of saying what is actually wrong.
  if (!process.env.GITHUB_TOKEN || !repo() || sha === "dev-sha") {
    return NextResponse.json({
      error: "Not connected to the website repository, so nothing was published. " +
             "Set GITHUB_TOKEN and GITHUB_REPO to publish for real.",
    }, { status: 400 });
  }

  // Re-read what is live and let this token overwrite only the keys its portals
  // own. A portal password must not be able to publish a whole content file:
  // otherwise the Youth password could replace the Iqamah times. This also
  // means two people editing different portals cannot clobber each other.
  const current = await fetch(apiUrl(), {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
    cache: "no-store",
  });
  if (!current.ok) {
    return NextResponse.json({ error: "Could not read current content" }, { status: 502 });
  }
  const currentJson = await current.json();
  const live = JSON.parse(Buffer.from(currentJson.content, "base64").toString("utf8"));

  // Publish against the sha we just read, not one the browser has been holding,
  // so a stale tab cannot overwrite a newer publish.
  const stamped = mergeScoped(live, content ?? {}, scopes);
  const writeSha = currentJson.sha;

  const body = JSON.stringify({
    message: "Update site content via ICB Admin",
    content: Buffer.from(JSON.stringify(stamped, null, 2)).toString("base64"),
    sha: writeSha,
  });

  const res = await fetch(apiUrl(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "GitHub write failed", detail: text }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
