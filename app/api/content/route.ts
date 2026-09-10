import { NextResponse } from "next/server";
import { scopesFromToken } from "../../../lib/scopes";

function validToken(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  // Any portal token may read the whole file. Reading is not the risk here;
  // writing is, and publish restricts that by scope.
  return scopesFromToken(auth.replace("Bearer ", "").trim()) !== null;
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
    sundaySchool: {
      year: "2026\u201327",
      zuhr: "1:15 PM",
      asr: "4:45 PM",
      existingDates: [],
      newDates: [],
      parentPortalUrl: "https://sunweb.us/?s=icbwaylandss",
      teacherPortalUrl: "https://sunweb.us/admin/admin-login?s=icbwaylandss",
    },
    youth: {
      registrationTitle: "2026\u20132027 Registration",
      registrationBody: "Sign up for the ICB Wayland Youth Group for this school year.",
      registerUrl: "",
      honorCodeUrl: "",
      instagramHandle: "@icbwayland.yg",
      instagramUrl: "https://www.instagram.com/icbwayland.yg/",
      linktreeUrl: "https://linktr.ee/icbyg",
    },
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
  return !token || token.startsWith("ghp_xxx") || !repo();
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

  const res = await fetch(apiUrl(), {
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
  // Send the repo back so the portal can show where it publishes. A wrong
  // GITHUB_REPO is otherwise invisible until someone notices the website did
  // not change, which is exactly how three publishes went to the wrong repo.
  return NextResponse.json({ content, sha: data.sha, mock: false, repo: repo() });
}
