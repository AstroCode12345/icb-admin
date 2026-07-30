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

const DEV_MOCK = {
  sha: "dev-sha",
  content: {
    prayers: { fajr:"5:00 AM", zuhr:"1:30 PM", asr:"6:00 PM", maghrib:"8:30 PM", isha:"10:05 PM", jumuah:{ khutbah:"1:00 PM", iqamah:"1:30 PM" }, lastUpdated:"July 2026" },
    fridaySpeaker: { name:"Dr. Saleem Khanani", date:"July 17, 2026" },
    events: [
      { featured:true,  month:"May", day:"1", tag:"Community Program", title:"Unlocking Door to Jannah with Imam Adnan Wood-Smith", meta:"Thursday · 6:30–9:00 PM · Dinner included · Registration required" },
      { featured:false, month:"May", day:"9", tag:"Charity",           title:"First Annual Humanitarian Walk",                        meta:"Saturday · 10:00 AM · Open to all" },
    ],
    announcement: { show:false, text:"" },
    donateUrl: "https://icbwayland.org/donations.html",
  },
};

// GET — fetch current content.json from GitHub
export async function GET(req: Request) {
  if (!validToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In development with no real token, return mock data so the UI can be previewed
  const token = process.env.GITHUB_TOKEN ?? "";
  if (!token || token.startsWith("ghp_xxx")) {
    return NextResponse.json(DEV_MOCK);
  }

  const res = await fetch(API, {
    headers: {
      Authorization: `Bearer ${token}`,
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
  return NextResponse.json({ content, sha: data.sha });
}
