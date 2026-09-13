import { NextResponse } from "next/server";
import { scopesFromToken } from "../../../lib/scopes";

/**
 * Fetches this year's Suhoor and Iftar schedule from Aladhan, a free prayer
 * time calculation API, instead of asking an admin to hand type roughly
 * thirty rows of times every year or scrape a page that could change its
 * layout at any time.
 *
 * Wayland, MA is a fixed coordinate pair rather than a looked up city name,
 * since this route only ever means the mosque's own schedule. Method 2 is
 * ISNA / North America, the same calculation method the old site's schedule
 * was built with.
 */
const LAT = 42.3626;
const LNG = -71.3595;
const METHOD = 2;

type AladhanDay = {
  date: { gregorian: { date: string }; hijri: { month: { number: number } } };
  timings: Record<string, string>;
};

/** Aladhan returns "05:43 (EST)". The site's own time fields read "5:43 AM". */
function to12Hour(raw: string): string {
  const hhmm = raw.split(" ")[0];
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${period}`;
}

/** Aladhan gives "28-01-2028". The site's own date fields are ISO. */
function isoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split("-");
  return `${y}-${m}-${d}`;
}

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const scopes = scopesFromToken(auth.replace("Bearer ", "").trim());
  if (!scopes || !scopes.includes("main")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Give a valid four digit year." }, { status: 400 });
  }

  // Scan every month of the given year rather than guessing which one or two
  // months Ramadan falls in. Ramadan moves about eleven days earlier every
  // Gregorian year, so a formula that guesses the month is one year away
  // from being wrong, which is a real risk on a fasting schedule. Twelve
  // quick calls to a free API, for one admin click a year, is a fair price
  // for never getting this wrong.
  try {
    const months = await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(async month => {
        const url = `https://api.aladhan.com/v1/calendar/${year}/${month}` +
          `?latitude=${LAT}&longitude=${LNG}&method=${METHOD}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`The prayer time service failed for month ${month}.`);
        const json = await res.json();
        return (json.data ?? []) as AladhanDay[];
      })
    );

    const ramadanDays = months.flat()
      .filter(d => d.date.hijri.month.number === 9)
      .map(d => ({
        date: isoDate(d.date.gregorian.date),
        fajr: to12Hour(d.timings.Fajr),
        dhuhr: to12Hour(d.timings.Dhuhr),
        asr: to12Hour(d.timings.Asr),
        maghrib: to12Hour(d.timings.Maghrib),
        isha: to12Hour(d.timings.Isha),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!ramadanDays.length) {
      return NextResponse.json({
        error: `No days in ${year} fall in Ramadan. It may start in ` +
               `${year - 1} or ${year + 1} instead, try one of those years.`,
      }, { status: 404 });
    }

    return NextResponse.json({ days: ramadanDays });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Could not reach the prayer time calculation service.",
    }, { status: 502 });
  }
}
