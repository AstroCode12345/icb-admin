"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared plumbing for the three portals.
 *
 * There is one content file behind all of them (content.json on the website
 * repo), so each portal loads the whole thing, edits its own corner, and
 * publishes the whole thing back. Splitting the editor by audience is a
 * navigation decision, not a storage one: the youth coordinator should not
 * have to scroll past the Iqamah times to change a registration link.
 */

/* ── Types ── */
export type Prayers = {
  fajr: string; zuhr: string; asr: string;
  maghrib: string; isha: string;
  jumuah: { khutbah: string; iqamah: string };
  lastUpdated: string;
};
// `date` is an ISO yyyy-mm-dd string. The website derives the month/day badge
// from it and hides anything already past, so an event that is not removed
// here simply stops showing instead of sitting on the homepage as "upcoming".
export type Event = { date: string; featured: boolean; tag: string; title: string; meta: string; image?: string; imageAlt?: string; };
export type YouthEvent = { date: string; title: string; tag?: string; meta?: string; signupUrl?: string; image?: string; imageAlt?: string; };
export type Khateeb = { date: string; name: string };
// Free text rather than an ISO date: the school publishes ranges like
// "Jul 1-Aug 15, 2026" alongside single days, and these are printed as
// written rather than sorted or filtered.
export type SchoolDate = { when: string; what: string };
export type SundaySchool = {
  year?: string; zuhr?: string; asr?: string;
  existingDates?: SchoolDate[]; newDates?: SchoolDate[];
  parentPortalUrl?: string; teacherPortalUrl?: string;
};
export type Content = {
  prayers: Prayers;
  khateebs?: Khateeb[];
  fridaySpeaker?: { name: string; date: string };  // legacy, superseded by khateebs
  events: Event[];
  youthEvents?: YouthEvent[];
  announcement: { show: boolean; text: string };
  sundaySchool?: SundaySchool;
  youth?: Youth;
  contact?: { email: string; facebook: string; youtube: string };
  donateUrl: string;
  siteUpdated?: string;
};

export const BLANK_EVENT: Event = { date: "", featured: false, tag: "", title: "", meta: "", image: "", imageAlt: "" };
export const BLANK_YOUTH_EVENT: YouthEvent = { date: "", title: "", tag: "", meta: "", signupUrl: "", image: "", imageAlt: "" };
export const BLANK_KHATEEB: Khateeb = { date: "", name: "" };
export const BLANK_SCHOOL_DATE: SchoolDate = { when: "", what: "" };

/** Is this ISO date today or later? Mirrors the website's own filter. */
// Youth page fields. The registration heading and the four outside links turn
// over every school year.
export type Youth = {
  registrationTitle?: string; registrationBody?: string;
  registerUrl?: string; honorCodeUrl?: string;
  instagramHandle?: string; instagramUrl?: string; linktreeUrl?: string;
};

export function isUpcoming(iso: string) {
  if (!iso) return true;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(y, m - 1, d) >= today;
}

/** "2026-08-28" -> "Aug 28" for the little date badge. */
export function shortDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[m - 1]} ${d}`;
}

/* ── SVG Icons ── */
export const Icon = {
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


/* ── Shared state ── */

/**
 * Loads content.json, tracks edits, and publishes. Every portal calls this,
 * so they all read and write the same file and cannot drift apart.
 */
export function usePortal(requiredScope?: string) {
  const router = useRouter();
  const [content, setContent] = useState<Content | null>(null);
  const [sha, setSha]         = useState<string>("");
  const [isMock, setIsMock]   = useState(false);
  const [repo, setRepo]       = useState<string>("");
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
    setRepo(data.repo ?? "");
    setLoading(false);
  }, [token, router]);

  useEffect(() => {
    if (!token) { router.push("/"); return; }
    // Publishing is already restricted by scope on the server, but without this
    // a youth-only login could open the School editor, type changes and get a
    // success message while nothing actually changed.
    if (requiredScope && !localScopes().includes(requiredScope)) {
      router.replace("/dashboard");
      return;
    }
    loadContent();
  }, [token, router, loadContent, requiredScope]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function publish() {
    setSaving(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, sha }),
    });
    if (res.ok) {
      showToast("Published. The website will update in about 30 seconds.", "success");
      await loadContent();
    } else {
      const err = await res.json();
      showToast("Publish failed: " + (err.error ?? "unknown error"), "error");
    }
    setSaving(false);
  }

  function logout() {
    localStorage.removeItem("icb_token");
    localStorage.removeItem("icb_scopes");
    router.push("/");
  }

  return { content, setContent, sha, isMock, repo, loading, saving, toast, publish, logout };
}

/**
 * Scopes this browser's token carries. Read from the token rather than a
 * separate localStorage key: the token is "<scopes>.<signature>", so anyone who
 * edits the scope list to widen it breaks the signature and the server rejects
 * the whole token. A separate key could be edited freely.
 */
export function localScopes(): string[] {
  if (typeof window === "undefined") return [];
  const t = localStorage.getItem("icb_token") ?? "";
  const dot = t.lastIndexOf(".");
  if (dot < 1) return [];
  return t.slice(0, dot).split(",").filter(Boolean);
}

/** The three portals, in the order they appear in the sidebar. */
export const PORTALS = [
  { id: "main",   href: "/dashboard/main",   label: "Main Website",
    blurb: "Iqamah times, Friday khateebs, events, the announcement banner, contact details and the donate link." },
  { id: "school", href: "/dashboard/school", label: "Sunday School",
    blurb: "School year, prayer times during the session, both admissions date tables, and the SunWeb portal links." },
  { id: "youth",  href: "/dashboard/youth",  label: "Youth Group",
    blurb: "Youth events, the registration heading, and the registration, honor code, Instagram and Linktree links." },
];


/* ── UI primitives ── */
export function Section({ id, title, icon, subtitle, children }: {
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
export function SchoolDateList({ label, rows, onChange, onAdd, onRemove }: {
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

export function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "1rem" }}>
      {children}
    </div>
  );
}

export function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}><label>{label}</label>{children}</div>;
}

export function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", margin: "1.5rem 0 1.25rem" }}>
      <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
      <span style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
    </div>
  );
}

/* ── Shell ── */

/**
 * The frame every portal shares: portal switcher, in-page section links, and
 * the publish button. `sections` are anchors within the current portal.
 */

/**
 * Flyer for an event. Takes a URL rather than an upload: the website is a set
 * of files in a GitHub repo with no image store behind it, so the honest
 * options are a path to a file already committed under /images, or a link to
 * one hosted elsewhere. The preview is the check that the URL actually works.
 */
export function FlyerField({ value, alt, onChange, onAltChange }: {
  value?: string;
  alt?: string;
  onChange: (v: string) => void;
  onAltChange: (v: string) => void;
}) {
  const url = (value ?? "").trim();
  const usable = /^https?:\/\//i.test(url) || /^\/[^/]/.test(url);
  return (
    <div style={{ marginTop: ".85rem" }}>
      <Field label="Flyer image (optional)">
        <input type="text" value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="/images/flyer-sep-18.jpg  or  https://..." />
      </Field>
      {url && !usable && (
        <p style={{ fontSize: ".8rem", color: "var(--red)", marginTop: ".4rem" }}>
          That will not load. Use a path starting with a single slash
          (/images/…) or a full https:// address.
        </p>
      )}
      {url && usable && (
        <>
          <Field label="Describe the flyer (for screen readers)" style={{ marginTop: ".85rem" }}>
            <input type="text" value={alt ?? ""}
              onChange={e => onAltChange(e.target.value)}
              placeholder="Flyer for the Sept 18 talk, with the time and venue" />
          </Field>
          <div style={{
            marginTop: ".7rem", padding: ".6rem", background: "var(--gray-50)",
            border: "1px solid var(--gray-200)", borderRadius: 8,
          }}>
            <div style={{ fontSize: ".72rem", fontWeight: 700, letterSpacing: ".07em",
                          textTransform: "uppercase", color: "var(--gray-500)", marginBottom: ".45rem" }}>
              Preview
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{ maxWidth: 180, height: "auto", display: "block", borderRadius: 6 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              onLoad={e => { (e.currentTarget as HTMLImageElement).style.display = "block"; }} />
          </div>
        </>
      )}
    </div>
  );
}

export function PortalShell({ portal, sections, saving, isMock, repo, toast, onPublish, onLogout, children }: {
  portal: string;
  sections: { label: string; href: string; icon: React.ReactNode }[];
  saving: boolean;
  isMock: boolean;
  repo?: string;
  toast: { msg: string; type: "success" | "error" } | null;
  onPublish: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const current = PORTALS.find(p => p.id === portal);
  // Only offer the portals this password opens. The server enforces this too;
  // hiding them here just avoids showing a door that will not open.
  const [allowed, setAllowed] = useState<string[]>([]);
  useEffect(() => { setAllowed(localScopes()); }, []);
  const visible = PORTALS.filter(p => allowed.includes(p.id));
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: 220, background: "var(--green-900)", display: "flex", flexDirection: "column",
        position: "fixed", top: 0, bottom: 0, left: 0, padding: "1.5rem 0", zIndex: 10,
      }}>
        <div style={{ padding: "0 1.25rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: ".65rem", textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, border: "1.5px solid rgba(255,255,255,.25)", borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center", color: "white",
            }}>{Icon.home}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: ".9rem", color: "white" }}>ICB Wayland</div>
              <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,.45)" }}>Admin Portal</div>
            </div>
          </a>
        </div>

        {/* Portal switcher. Named so it is obvious which website each one edits. */}
        <div style={{ padding: ".9rem .75rem .5rem", display: visible.length > 1 ? "block" : "none" }}>
          <div style={{
            fontSize: ".65rem", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase",
            color: "rgba(255,255,255,.35)", padding: "0 .75rem .5rem",
          }}>Portals</div>
          {visible.map(p => {
            const active = p.id === portal;
            return (
              <a key={p.id} href={p.href} style={{
                display: "block", padding: ".5rem .75rem", borderRadius: 7, marginBottom: ".1rem",
                color: active ? "white" : "rgba(255,255,255,.7)",
                background: active ? "rgba(255,255,255,.12)" : "transparent",
                fontSize: ".85rem", fontWeight: active ? 600 : 500, textDecoration: "none",
              }}>{p.label}</a>
            );
          })}
        </div>

        <nav style={{ flex: 1, padding: ".75rem", display: "flex", flexDirection: "column", gap: ".15rem", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{
            fontSize: ".65rem", fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase",
            color: "rgba(255,255,255,.35)", padding: ".4rem .75rem .35rem",
          }}>{current?.label ?? "Sections"}</div>
          {sections.map(item => (
            <a key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: ".65rem", padding: ".5rem .75rem",
              borderRadius: 7, color: "rgba(255,255,255,.72)", fontSize: ".85rem",
              fontWeight: 500, textDecoration: "none",
            }}>{item.icon}{item.label}</a>
          ))}
        </nav>

        <div style={{ padding: "1rem .75rem", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", gap: ".6rem", width: "100%", padding: ".55rem .75rem",
            background: "transparent", border: "none", color: "rgba(255,255,255,.45)",
            fontSize: ".82rem", fontWeight: 500, cursor: "pointer", borderRadius: 7, fontFamily: "inherit",
          }}>{Icon.logout}Sign Out</button>
        </div>
      </aside>

      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{
          height: 58, background: "var(--white)", borderBottom: "1px solid var(--gray-200)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 2rem", position: "sticky", top: 0, zIndex: 9,
        }}>
          <span style={{ fontSize: ".88rem", color: "var(--gray-500)", fontWeight: 500 }}>
            Editing {current?.label ?? "the website"}. Publishing to{" "}
            <code style={{
              fontSize: ".82rem", background: "var(--gray-100)", padding: ".12rem .4rem",
              borderRadius: 5, color: "var(--gray-900)",
            }}>{repo || "…"}</code>
          </span>
          <button onClick={onPublish} className="btn btn-primary" disabled={saving}
            style={{ gap: ".45rem", padding: ".5rem 1rem", fontSize: ".85rem", borderRadius: 8 }}>
            {Icon.upload}{saving ? "Publishing…" : "Publish Changes"}
          </button>
        </header>

        <main style={{ padding: "2rem", maxWidth: 900, width: "100%" }}>
          {isMock && (
            <div style={{
              background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 10,
              padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: ".86rem", color: "#7a5c00",
            }}>
              <strong>Sample data.</strong> This portal is not connected to the website
              repository yet, so nothing here will publish. Set GITHUB_TOKEN to go live.
            </div>
          )}
          {children}
          <button onClick={onPublish} className="btn btn-primary" disabled={saving}
            style={{ width: "100%", padding: ".85rem", fontSize: ".95rem", gap: ".5rem", borderRadius: 10, marginTop: ".5rem" }}>
            {Icon.upload}{saving ? "Publishing…" : "Publish Changes"}
          </button>
        </main>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

export function PortalLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--gray-500)", fontSize: ".9rem" }}>
      Loading…
    </div>
  );
}
