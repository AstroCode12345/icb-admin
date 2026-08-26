import { NextResponse } from "next/server";
import crypto from "crypto";

function validToken(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  const expected = crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update("icb-admin-v1")
    .digest("hex");
  return token === expected;
}

const REPO = process.env.GITHUB_REPO ?? "";
const FILE = "content.json";
const API  = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

// POST — write updated content.json back to GitHub
export async function POST(req: Request) {
  if (!validToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, sha } = await req.json();

  // Refuse to write when the app is running on the development stub. Without
  // this the request goes to GitHub with a placeholder sha and fails with a
  // confusing API error instead of saying what is actually wrong.
  if (!process.env.GITHUB_TOKEN || !REPO || sha === "dev-sha") {
    return NextResponse.json({
      error: "Not connected to the website repository, so nothing was published. " +
             "Set GITHUB_TOKEN and GITHUB_REPO to publish for real.",
    }, { status: 400 });
  }

  // Stamp the publish date so the site footer reflects when content actually
  // changed, rather than a date somebody has to remember to type by hand.
  const stamped = {
    ...content,
    siteUpdated: new Date().toISOString().slice(0, 10),
  };

  const body = JSON.stringify({
    message: "Update site content via ICB Admin",
    content: Buffer.from(JSON.stringify(stamped, null, 2)).toString("base64"),
    sha,
  });

  const res = await fetch(API, {
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
