"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── Types ── */
type Prayers = {
  fajr: string; zuhr: string; asr: string;
  maghrib: string; isha: string;
  jumuah: { khutbah: string; iqamah: string };
  lastUpdated: string;
};
// `date` is an ISO yyyy-mm-dd string. The website derives the month/day badge
// from it and hides anything already past, so an event that is not removed
// here simply stops showing instead of sitting on the homepage as "upcoming".
type Event = { date: string; featured: boolean; tag: string; title: string; meta: string; };
type YouthEvent = { date: string; title: string; tag?: string; meta?: string; signupUrl?: string; };
type Khateeb = { date: string; name: string };
// Free text rather than an ISO date: the school publishes ranges like
// "Jul 1-Aug 15, 2026" alongside single days, and these are printed as
// written rather than sorted or filtered.
type SchoolDate = { when: string; what: string };
type SundaySchool = {
  year?: string; zuhr?: string; asr?: string;
  existingDates?: SchoolDate[]; newDates?: SchoolDate[];
};
type Content = {
  prayers: Prayers;
  khateebs?: Khateeb[];
  fridaySpeaker?: { name: string; date: string };  // legacy, superseded by khateebs
  events: Event[];
  youthEvents?: YouthEvent[];
  announcement: { show: boolean; text: string };
  sundaySchool?: SundaySchool;
  contact?: { email: string; facebook: string; youtube: string };
  donateUrl: string;
  siteUpdated?: string;
};

const BLANK_EVENT: Event = { date: "", featured: false, tag: "", title: "", meta: "" };
const BLANK_YOUTH_EVENT: YouthEvent = { date: "", title: "", tag: "", meta: "", signupUrl: "" };
const BLANK_KHATEEB: Khateeb = { date: "", name: "" };
const BLANK_SCHOOL_DATE: SchoolDate = { when: "", what: "" };

/** Is this ISO date today or later? Mirrors the website's own filter. */
function isUpcoming(iso: string) {
  if (!iso) return true;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) >= today;
}

/** "2026-08-28" -> "Aug 28" for the little date badge. */
function shortDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[m - 1]} ${d}`;
}

/* ── SVG Icons ── */
const Icon = {
  clock:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  mic:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  bell:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  heart:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  plus:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  home:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  upload:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  logout:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  book:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  mail:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
};

/* ── Main Component ── */
export default function Dashboard() {
  const router = useRouter();
  const [content, setContent] = useState<Content | null>(null);
  const [sha, setSha]         = useState<string>("");
  const [isMock, setIsMock]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("icb_token") ?? "" : "";

  const loadContent = useCallback(async () => {
    const res = await fetch("/api/content", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    setContent(data.content);
    setSha(data.sha);
    setIsMock(Boolean(data.mock));
    setLoading(false);
  }, [token, router]);

  useEffect(() => {
    if (!token) { router.push("/"); return; }
    loadContent();
  }, [token, router, loadContent]);

  async function publish() {
    setSaving(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, sha }),
    });
    if (res.ok) {
      showToast("Published — the website will update in about 30 seconds.", "success");
      await loadContent();
    } else {
      const err = await res.json();
      showToast("Publish failed: " + (err.error ?? "unknown error"), "error");
    }
    setSaving(false);
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  function logout() { localStorage.removeItem("icb_token"); router.push("/"); }

  function setPrayer(key: keyof Omit<Prayers, "jumuah" | "lastUpdated">, val: string) {
    setContent(c => c ? { ...c, prayers: { ...c.prayers, [key]: val } } : c);
  }
  function setJumuah(key: "khutbah" | "iqamah", val: string) {
    setContent(c => c ? { ...c, prayers: { ...c.prayers, jumuah: { ...c.prayers.jumuah, [key]: val } } } : c);
  }
  function updateEvent(i: number, field: keyof Event, value: string | boolean) {
    setContent(c => {
      if (!c) return c;
      const events = [...c.events];
      events[i] = { ...events[i], [field]: value };
      return { ...c, events };
    });
  }
  function addEvent() {
    setContent(c => c ? { ...c, events: [...c.events, { ...BLANK_EVENT }] } : c);
  }
  function removeEvent(i: number) {
    setContent(c => c ? { ...c, events: c.events.filter((_, idx) => idx !== i) } : c);
  }

  /* Friday khateebs */
  function updateKhateeb(i: number, field: keyof Khateeb, value: string) {
    setContent(c => {
      if (!c) return c;
      const khateebs = [...(c.khateebs ?? [])];
      khateebs[i] = { ...khateebs[i], [field]: value };
      return { ...c, khateebs };
    });
  }
  function addKhateeb() {
    setContent(c => c ? { ...c, khateebs: [...(c.khateebs ?? []), { ...BLANK_KHATEEB }] } : c);
  }
  function removeKhateeb(i: number) {
    setContent(c => c ? { ...c, khateebs: (c.khateebs ?? []).filter((_, idx) => idx !== i) } : c);
  }

  /* Sunday school */
  type DateList = "existingDates" | "newDates";
  function setSchool(field: keyof SundaySchool, value: string) {
    setContent(c => c ? { ...c, sundaySchool: { ...(c.sundaySchool ?? {}), [field]: value } } : c);
  }
  function updateSchoolDate(list: DateList, i: number, field: keyof SchoolDate, value: string) {
    setContent(c => {
      if (!c) return c;
      const rows = [...(c.sundaySchool?.[list] ?? [])];
      rows[i] = { ...rows[i], [field]: value };
      return { ...c, sundaySchool: { ...(c.sundaySchool ?? {}), [list]: rows } };
    });
  }
  function addSchoolDate(list: DateList) {
    setContent(c => c ? { ...c, sundaySchool: {
      ...(c.sundaySchool ?? {}),
      [list]: [...(c.sundaySchool?.[list] ?? []), { ...BLANK_SCHOOL_DATE }],
    } } : c);
  }
  function removeSchoolDate(list: DateList, i: number) {
    setContent(c => c ? { ...c, sundaySchool: {
      ...(c.sundaySchool ?? {}),
      [list]: (c.sundaySchool?.[list] ?? []).filter((_, idx) => idx !== i),
    } } : c);
  }

  /* Youth events */
  function updateYouthEvent(i: number, field: keyof YouthEvent, value: string) {
    setContent(c => {
      if (!c) return c;
      const youthEvents = [...(c.youthEvents ?? [])];
      youthEvents[i] = { ...youthEvents[i], [field]: value };
      return { ...c, youthEvents };
    });
  }
  function addYouthEvent() {
    setContent(c => c ? { ...c, youthEvents: [...(c.youthEvents ?? []), { ...BLANK_YOUTH_EVENT }] } : c);
  }
  function removeYouthEvent(i: number) {
    setContent(c => c ? { ...c, youthEvents: (c.youthEvents ?? []).filter((_, idx) => idx !== i) } : c);
  }

  /* ── Loading screen ── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--gray-500)", fontSize: ".9rem" }}>
      Loading…
    </div>
  );
  if (!content) return null;

  /* ── Layout ── */
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: "var(--green-900)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, bottom: 0, left: 0,
        padding: "1.5rem 0",
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".65rem" }}>
            <div style={{ width: 32, height: 32, border: "1.5px solid rgba(255,255,255,.25)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              {Icon.home}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: ".9rem", color: "white" }}>ICB Wayland</div>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.45)" }}>Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "1rem .75rem", display: "flex", flexDirection: "column", gap: ".15rem" }}>
          {[
            { label: "Prayer Times",    href: "#prayers",      icon: Icon.clock    },
            { label: "Friday Khateebs", href: "#speaker",      icon: Icon.mic      },
            { label: "Announcement",    href: "#announcement", icon: Icon.bell     },
            { label: "Events",          href: "#events",       icon: Icon.calendar },
            { label: "Youth Events",    href: "#youth",        icon: Icon.calendar },
            { label: "Sunday School",   href: "#school",       icon: Icon.book     },
            { label: "Contact & Social",href: "#contact",      icon: Icon.mail     },
            { label: "Donate Link",     href: "#donate",       icon: Icon.heart    },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: ".65rem",
                padding: ".55rem .75rem",
                borderRadius: 7,
                color: "rgba(255,255,255,.72)",
                fontSize: ".85rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "background .15s, color .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.08)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.72)"; }}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "1rem .75rem", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <button
            onClick={logout}
            style={{
              display: "flex", alignItems: "center", gap: ".6rem",
              width: "100%", padding: ".55rem .75rem",
              background: "transparent", border: "none",
              color: "rgba(255,255,255,.45)", fontSize: ".82rem",
              fontWeight: 500, cursor: "pointer", borderRadius: 7,
              fontFamily: "inherit", transition: "color .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.8)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.45)"; }}
          >
            {Icon.logout}
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <header style={{
          height: 58,
          background: "var(--white)",
          borderBottom: "1px solid var(--gray-200)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 2rem",
          position: "sticky", top: 0, zIndex: 9,
        }}>
          <span style={{ fontSize: ".88rem", color: "var(--gray-500)", fontWeight: 500 }}>
            Changes publish directly to the live website.
          </span>
          <button
            onClick={publish}
            className="btn btn-primary"
            disabled={saving}
            style={{ gap: ".5rem", padding: ".6rem 1.4rem" }}
          >
            {Icon.upload}
            {saving ? "Publishing…" : "Publish Changes"}
          </button>
        </header>

        {/* Scrollable sections */}
        <main style={{ padding: "2rem", maxWidth: 740, width: "100%" }}>

          {/* Sample-data warning. Without this an admin can edit a full screen
              of plausible-looking values and believe they are the live site. */}
          {isMock && (
            <div style={{
              background: "var(--gold-light,#fdf3e3)",
              border: "1px solid #f0d9a8",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              fontSize: ".88rem",
              color: "var(--gray-700)",
              lineHeight: 1.6,
            }}>
              <strong>These are sample values, not the live website.</strong> This admin is not
              connected to the website repository, so nothing here can be published. Set{" "}
              <code>GITHUB_TOKEN</code> and <code>GITHUB_REPO</code> to edit the real site.
            </div>
          )}

          {/* Prayer Times */}
          <Section id="prayers" title="Prayer Times" icon={Icon.clock}
            subtitle="Iqamah times — when the congregation starts. Update whenever the seasonal schedule changes.">
            <Grid cols={3}>
              {(["fajr", "zuhr", "asr", "maghrib", "isha"] as const).map(name => (
                <Field key={name} label={name.charAt(0).toUpperCase() + name.slice(1)}>
                  <input type="text" value={content.prayers[name]} onChange={e => setPrayer(name, e.target.value)} placeholder="5:00 AM" />
                </Field>
              ))}
              <Field label="Last Updated">
                <input type="text" value={content.prayers.lastUpdated}
                  onChange={e => setContent(c => c ? { ...c, prayers: { ...c.prayers, lastUpdated: e.target.value } } : c)}
                  placeholder="July 2026" />
              </Field>
            </Grid>
            <Divider label="Friday Prayer" />
            <Grid cols={2}>
              <Field label="Khutbah Begins">
                <input type="text" value={content.prayers.jumuah.khutbah} onChange={e => setJumuah("khutbah", e.target.value)} placeholder="1:00 PM" />
              </Field>
              <Field label="Iqamah">
                <input type="text" value={content.prayers.jumuah.iqamah} onChange={e => setJumuah("iqamah", e.target.value)} placeholder="1:30 PM" />
              </Field>
            </Grid>
          </Section>

          {/* Friday Khateebs */}
          <Section id="speaker" title="Friday Khateebs" icon={Icon.mic}
            subtitle="The schedule shown on the Prayers page. The soonest upcoming date is used automatically as “this week’s khateeb,” and past dates stop showing on their own.">
            {(content.khateebs ?? []).length === 0 && (
              <p style={{ fontSize: ".88rem", color: "var(--gray-500)", marginBottom: ".75rem" }}>
                No khateebs scheduled. The Prayers page will say the schedule has not been posted yet.
              </p>
            )}
            {(content.khateebs ?? []).map((k, i) => {
              const past = k.date && !isUpcoming(k.date);
              return (
                <div key={i} style={{
                  background: "var(--white)",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "10px",
                  padding: "1rem 1.25rem",
                  marginBottom: ".75rem",
                  opacity: past ? .6 : 1,
                }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                    <Field label="Date" style={{ flex: "0 0 170px" }}>
                      <input type="date" value={k.date}
                        onChange={e => updateKhateeb(i, "date", e.target.value)} />
                    </Field>
                    <Field label="Khateeb" style={{ flex: 1 }}>
                      <input type="text" value={k.name}
                        onChange={e => updateKhateeb(i, "name", e.target.value)}
                        placeholder="Imam Talal Eid, or TBD" />
                    </Field>
                    <button
                      onClick={() => removeKhateeb(i)}
                      title="Remove"
                      style={{
                        background: "transparent", border: "none",
                        color: "var(--gray-300)", cursor: "pointer",
                        padding: ".55rem .2rem", lineHeight: 0, transition: "color .15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--gray-300)"; }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  {past && (
                    <p style={{ fontSize: ".78rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
                      This date has passed, so it is already hidden on the website. Safe to remove.
                    </p>
                  )}
                </div>
              );
            })}
            <button onClick={addKhateeb} className="btn btn-ghost" style={{ width: "100%", gap: ".4rem", marginTop: ".25rem" }}>
              {Icon.plus} Add Khateeb
            </button>
          </Section>

          {/* Announcement */}
          <Section id="announcement" title="Announcement Banner" icon={Icon.bell}
            subtitle="Appears as a bar at the top of the homepage. Turn off when there is nothing to announce.">
            <div style={{ marginBottom: "1rem" }}>
              <label className="toggle-wrap" style={{ display: "inline-flex" }}>
                <span className="toggle">
                  <input type="checkbox" checked={content.announcement.show}
                    onChange={e => setContent(c => c ? { ...c, announcement: { ...c.announcement, show: e.target.checked } } : c)} />
                  <span className="toggle-track" />
                </span>
                <span style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--gray-700)", textTransform: "none", letterSpacing: 0 }}>
                  {content.announcement.show ? "Banner is on" : "Banner is off"}
                </span>
              </label>
            </div>
            {content.announcement.show && (
              <Field label="Announcement Text">
                <textarea value={content.announcement.text}
                  onChange={e => setContent(c => c ? { ...c, announcement: { ...c.announcement, text: e.target.value } } : c)}
                  placeholder="Ramadan Mubarak! Tarawih begins tonight at 9:30 PM."
                  rows={2} />
              </Field>
            )}
          </Section>

          {/* Events */}
          <Section id="events" title="Upcoming Events" icon={Icon.calendar}
            subtitle="Shown on the homepage and calendar page. Past dates drop off the website automatically, so nothing goes stale if you forget to tidy up.">
            {content.events.map((ev, i) => (
              <div key={i} style={{
                background: "var(--white)",
                border: "1px solid var(--gray-200)",
                borderRadius: "10px",
                padding: "1.25rem",
                marginBottom: ".75rem",
              }}>
                {/* Row 1: date badge + remove */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                    {ev.date && (
                      <span style={{
                        background: "var(--green-50)",
                        color: "var(--green-800)",
                        border: "1px solid var(--green-100,#d8f3dc)",
                        borderRadius: 6,
                        padding: ".2rem .65rem",
                        fontSize: ".78rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}>
                        {shortDate(ev.date)}
                      </span>
                    )}
                    {ev.date && !isUpcoming(ev.date) && (
                      <span style={{
                        background: "var(--gray-100,#f2f0ee)",
                        color: "var(--gray-500)",
                        border: "1px solid var(--gray-200)",
                        borderRadius: 6,
                        padding: ".2rem .65rem",
                        fontSize: ".75rem",
                        fontWeight: 700,
                      }}>
                        Past — hidden on site
                      </span>
                    )}
                    {ev.featured && (
                      <span style={{
                        background: "var(--gold-light,#fdf3e3)",
                        color: "var(--gold,#c9984a)",
                        border: "1px solid #f0d9a8",
                        borderRadius: 6,
                        padding: ".2rem .65rem",
                        fontSize: ".75rem",
                        fontWeight: 700,
                      }}>
                        Featured
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeEvent(i)}
                    title="Remove event"
                    style={{
                      background: "transparent", border: "none",
                      color: "var(--gray-300)", cursor: "pointer",
                      padding: ".2rem", lineHeight: 0,
                      transition: "color .15s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--gray-300)"; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                {/* Row 2: title full width */}
                <Field label="Event Title">
                  <input value={ev.title} onChange={e => updateEvent(i, "title", e.target.value)} placeholder="Event name" />
                </Field>

                {/* Row 3: details full width */}
                <Field label="Details" style={{ marginTop: ".75rem" }}>
                  <input value={ev.meta} onChange={e => updateEvent(i, "meta", e.target.value)} placeholder="Saturday · 10:00 AM · Open to all" />
                </Field>

                {/* Row 4: date + category side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginTop: ".75rem" }}>
                  <Field label="Date">
                    <input type="date" value={ev.date} onChange={e => updateEvent(i, "date", e.target.value)} />
                  </Field>
                  <Field label="Category">
                    <input value={ev.tag} onChange={e => updateEvent(i, "tag", e.target.value)} placeholder="Community Program" />
                  </Field>
                </div>

                {/* Row 5: featured checkbox */}
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: ".45rem",
                  marginTop: ".85rem", cursor: "pointer",
                  fontSize: ".84rem", color: "var(--gray-500)",
                  fontWeight: 400, textTransform: "none", letterSpacing: 0,
                }}>
                  <input
                    type="checkbox"
                    checked={ev.featured}
                    onChange={e => updateEvent(i, "featured", e.target.checked)}
                    style={{ width: "auto", accentColor: "var(--green-700)" }}
                  />
                  Featured — shown with a gold highlight on the homepage
                </label>
              </div>
            ))}

            <button onClick={addEvent} className="btn btn-ghost" style={{ width: "100%", gap: ".4rem", marginTop: ".25rem" }}>
              {Icon.plus} Add Event
            </button>
          </Section>

          {/* Youth Events */}
          <Section id="youth" title="Youth Events" icon={Icon.calendar}
            subtitle="Shown on the Youth Group page under “Upcoming Events.” Past dates disappear from the website automatically.">
            {(content.youthEvents ?? []).length === 0 && (
              <p style={{ fontSize: ".88rem", color: "var(--gray-500)", marginBottom: ".75rem" }}>
                No youth events posted. The Youth page will show its “nothing posted right now” message with a link to Instagram.
              </p>
            )}
            {(content.youthEvents ?? []).map((ev, i) => {
              const past = ev.date && !isUpcoming(ev.date);
              return (
                <div key={i} style={{
                  background: "var(--white)",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  marginBottom: ".75rem",
                  opacity: past ? .6 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                      {ev.date && (
                        <span style={{
                          background: "var(--green-50)", color: "var(--green-800)",
                          border: "1px solid var(--green-100,#d8f3dc)", borderRadius: 6,
                          padding: ".2rem .65rem", fontSize: ".78rem", fontWeight: 700, whiteSpace: "nowrap",
                        }}>
                          {shortDate(ev.date)}
                        </span>
                      )}
                      {past && (
                        <span style={{
                          background: "var(--gray-100,#f2f0ee)", color: "var(--gray-500)",
                          border: "1px solid var(--gray-200)", borderRadius: 6,
                          padding: ".2rem .65rem", fontSize: ".75rem", fontWeight: 700,
                        }}>
                          Past — hidden on site
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeYouthEvent(i)}
                      title="Remove event"
                      style={{
                        background: "transparent", border: "none",
                        color: "var(--gray-300)", cursor: "pointer",
                        padding: ".2rem", lineHeight: 0, transition: "color .15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--gray-300)"; }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <Field label="Event Title">
                    <input value={ev.title} onChange={e => updateYouthEvent(i, "title", e.target.value)} placeholder="Event name" />
                  </Field>

                  <Field label="Details" style={{ marginTop: ".75rem" }}>
                    <input value={ev.meta ?? ""} onChange={e => updateYouthEvent(i, "meta", e.target.value)} placeholder="Friday · 7:00 PM · Grades 6–12" />
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginTop: ".75rem" }}>
                    <Field label="Date">
                      <input type="date" value={ev.date} onChange={e => updateYouthEvent(i, "date", e.target.value)} />
                    </Field>
                    <Field label="Category">
                      <input value={ev.tag ?? ""} onChange={e => updateYouthEvent(i, "tag", e.target.value)} placeholder="Social" />
                    </Field>
                  </div>

                  <Field label="Sign-up Link (optional)" style={{ marginTop: ".75rem" }}>
                    <input value={ev.signupUrl ?? ""} onChange={e => updateYouthEvent(i, "signupUrl", e.target.value)}
                      placeholder="https://forms.gle/…" />
                  </Field>
                </div>
              );
            })}
            <button onClick={addYouthEvent} className="btn btn-ghost" style={{ width: "100%", gap: ".4rem", marginTop: ".25rem" }}>
              {Icon.plus} Add Youth Event
            </button>
          </Section>

          {/* Sunday School */}
          <Section id="school" title="Sunday School" icon={Icon.book}
            subtitle="The school year, the two admissions date tables on the School page, and the prayer times held during the school session.">
            <Grid cols={3}>
              <Field label="School Year">
                <input type="text" value={content.sundaySchool?.year ?? ""}
                  onChange={e => setSchool("year", e.target.value)}
                  placeholder="2026–27" />
              </Field>
              <Field label="Zuhr (end of morning)">
                <input type="text" value={content.sundaySchool?.zuhr ?? ""}
                  onChange={e => setSchool("zuhr", e.target.value)}
                  placeholder="1:15 PM" />
              </Field>
              <Field label="Asr (end of afternoon)">
                <input type="text" value={content.sundaySchool?.asr ?? ""}
                  onChange={e => setSchool("asr", e.target.value)}
                  placeholder="4:45 PM" />
              </Field>
            </Grid>

            <SchoolDateList
              label="Key Dates: Existing Families"
              rows={content.sundaySchool?.existingDates ?? []}
              onChange={(i, f, v) => updateSchoolDate("existingDates", i, f, v)}
              onAdd={() => addSchoolDate("existingDates")}
              onRemove={i => removeSchoolDate("existingDates", i)}
            />
            <SchoolDateList
              label="Key Dates: New Families"
              rows={content.sundaySchool?.newDates ?? []}
              onChange={(i, f, v) => updateSchoolDate("newDates", i, f, v)}
              onAdd={() => addSchoolDate("newDates")}
              onRemove={i => removeSchoolDate("newDates", i)}
            />
          </Section>

          {/* Contact & Social */}
          <Section id="contact" title="Contact & Social" icon={Icon.mail}
            subtitle="The email address and social pages linked across the site.">
            <Field label="Contact Email">
              <input type="text" value={content.contact?.email ?? ""}
                onChange={e => setContent(c => c ? { ...c, contact: { ...(c.contact ?? { email:"", facebook:"", youtube:"" }), email: e.target.value } } : c)}
                placeholder="webmaster@icbwayland.org" />
            </Field>
            <Field label="Facebook Page URL" style={{ marginTop: ".85rem" }}>
              <input type="url" value={content.contact?.facebook ?? ""}
                onChange={e => setContent(c => c ? { ...c, contact: { ...(c.contact ?? { email:"", facebook:"", youtube:"" }), facebook: e.target.value } } : c)}
                placeholder="https://www.facebook.com/icbwayland" />
            </Field>
            <Field label="YouTube Channel URL" style={{ marginTop: ".85rem" }}>
              <input type="url" value={content.contact?.youtube ?? ""}
                onChange={e => setContent(c => c ? { ...c, contact: { ...(c.contact ?? { email:"", facebook:"", youtube:"" }), youtube: e.target.value } } : c)}
                placeholder="https://youtube.com/c/ICBWayland" />
            </Field>
          </Section>

          {/* Donate */}
          <Section id="donate" title="Donation Link" icon={Icon.heart}
            subtitle="Update this if the donation platform or URL changes.">
            <Field label="Donate URL">
              <input type="url" value={content.donateUrl}
                onChange={e => setContent(c => c ? { ...c, donateUrl: e.target.value } : c)}
                placeholder="https://..." />
            </Field>
          </Section>

          {/* Bottom publish */}
          <button onClick={publish} className="btn btn-primary" disabled={saving}
            style={{ width: "100%", padding: ".85rem", fontSize: ".95rem", gap: ".5rem", borderRadius: 10, marginTop: ".5rem" }}>
            {Icon.upload}
            {saving ? "Publishing…" : "Publish Changes"}
          </button>
        </main>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

/* ── Layout sub-components ── */
function Section({ id, title, icon, subtitle, children }: {
  id: string; title: string; icon: React.ReactNode; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div id={id} style={{
      background: "var(--white)",
      border: "1px solid var(--gray-200)",
      borderRadius: 12,
      padding: "1.75rem",
      marginBottom: "1.5rem",
      scrollMarginTop: "80px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: subtitle ? ".4rem" : "1.4rem" }}>
        <span style={{ color: "var(--green-700)" }}>{icon}</span>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--gray-900)" }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: ".84rem", color: "var(--gray-500)", marginBottom: "1.4rem", lineHeight: 1.55 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

/**
 * One of the School page's two admissions tables. Rows are printed in the order
 * they sit here, so reordering in the portal reorders them on the site.
 */
function SchoolDateList({ label, rows, onChange, onAdd, onRemove }: {
  label: string;
  rows: SchoolDate[];
  onChange: (i: number, field: keyof SchoolDate, value: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div style={{ marginTop: "1.5rem" }}>
      <Divider label={label} />
      {rows.length === 0 && (
        <p style={{ fontSize: ".88rem", color: "var(--gray-500)", margin: ".75rem 0" }}>
          No dates listed. The School page will say the dates for the coming year
          have not been announced yet.
        </p>
      )}
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", marginBottom: ".6rem" }}>
          <Field label={i === 0 ? "When" : ""} style={{ flex: "0 0 170px" }}>
            <input type="text" value={r.when}
              onChange={e => onChange(i, "when", e.target.value)}
              placeholder="May 15, 2026" />
          </Field>
          <Field label={i === 0 ? "What happens" : ""} style={{ flex: 1 }}>
            <input type="text" value={r.what}
              onChange={e => onChange(i, "what", e.target.value)}
              placeholder="Deadline to register without late fee" />
          </Field>
          <button onClick={() => onRemove(i)} title="Remove"
            style={{
              background: "transparent", border: "none", color: "var(--gray-300)",
              cursor: "pointer", padding: ".55rem .2rem", lineHeight: 0, transition: "color .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--red)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--gray-300)"; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
      <button onClick={onAdd} className="btn btn-ghost" style={{ width: "100%", gap: ".4rem", marginTop: ".25rem" }}>
        {Icon.plus} Add Date
      </button>
    </div>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "1rem" }}>
      {children}
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}><label>{label}</label>{children}</div>;
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", margin: "1.5rem 0 1.25rem" }}>
      <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
      <span style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
    </div>
  );
}
