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

// Sample data for local development only, returned when there is no real
// GitHub token to read the live file with. It is flagged `mock: true` so the
// dashboard can say plainly that these are not the live values — an admin
// should never be looking at this and believe it is what the public sees.
//
// Keep it in step with the site's content.json. A stale copy here once left a
// decommissioned donate URL sitting in the editor.
const DEV_MOCK = {
  sha: "dev-sha",
  mock: true,
  content: {
    prayers: {
      fajr: "5:10 AM", zuhr: "1:30 PM", asr: "6:00 PM",
      maghrib: "8:10 PM", isha: "9:45 PM",
      jumuah: { khutbah: "1:00 PM", iqamah: "1:30 PM" },
      lastUpdated: "August 2026",
    },
    khateebs: [
      { date: "2026-08-28", name: "Dr. Mohamed Lazzouni" },
    ],
    events: [],
    youthEvents: [],
    announcement: { show: false, text: "" },
    sundaySchool: { zuhr: "12:30 PM" },
    contact: {
      email: "webmaster@icbwayland.org",
      facebook: "https://www.facebook.com/icbwayland",
      youtube: "https://youtube.com/c/ICBWayland",
    },
    donateUrl: "https://www.paypal.com/donate?hosted_button_id=Z25J5QYZZSYSE",
    siteUpdated: "2026-08-26",
  },
};

function usingMockData() {
  const token = process.env.GITHUB_TOKEN ?? "";
  return !token || token.startsWith("ghp_xxx") || !REPO;
}

// GET — fetch current content.json from GitHub
export async function GET(req: Request) {
  if (!validToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In development with no real token, return mock data so the UI can be previewed
  if (usingMockData()) {
    return NextResponse.json(DEV_MOCK);
  }

  const res = await fetch(API, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "GitHub fetch failed", detail: text }, { status: 502 });
  }

  const data = await res.json();
  const content = JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
  return NextResponse.json({ content, sha: data.sha, mock: false });
}
