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

  const body = JSON.stringify({
    message: "Update site content via ICB Admin",
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
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
