"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PORTALS, Icon, localScopes } from "../portal";

const ICONS: Record<string, React.ReactNode> = {
  main: Icon.home,
  school: Icon.book,
  youth: Icon.calendar,
};

/**
 * Portal chooser. Three editors, split by who maintains them: whoever runs the
 * Youth Group should not have to scroll past the Iqamah times to change a
 * registration link. All three edit the same content file underneath.
 */
export default function PortalChooser() {
  const router = useRouter();
  const [scopes, setScopes] = useState<string[] | null>(null);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("icb_token")) { router.push("/"); return; }
    setScopes(localScopes());
    // A portal page bounces back here with ?unlock= when the session does not
    // hold its scope, so the prompt is already open when you land.
    const want = new URLSearchParams(location.search).get("unlock");
    if (want && PORTALS.some(p => p.id === want)) setUnlocking(want);
  }, [router]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!unlocking) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("icb_token") ?? ""}`,
      },
      body: JSON.stringify({ password, portal: unlocking }),
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem("icb_token", token);
      router.push(`/dashboard/${unlocking}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error === "Sign in first"
        ? "Your session expired. Please sign in again."
        : "That is not the password for this section.");
      setBusy(false);
    }
  }

  if (scopes === null) return null;
  // Everyone through the front door sees all three; each still needs its own
  // password to open.
  const visible = PORTALS;
  const target = PORTALS.find(p => p.id === unlocking);

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", padding: "4rem 2rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{
            fontSize: ".7rem", fontWeight: 700, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--green-700)", marginBottom: ".5rem",
          }}>
            ICB Wayland
          </div>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 700, color: "var(--gray-900)", marginBottom: ".6rem" }}>
            What are you updating?
          </h1>
          <p style={{ fontSize: ".95rem", color: "var(--gray-500)", lineHeight: 1.6 }}>
            Pick the part of the website you want to change. You can switch
            between these at any time from the sidebar.
          </p>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          {visible.map(p => (
            <button
              key={p.id}
              onClick={() => { setUnlocking(p.id); setPassword(""); setError(""); }}
              style={{
                display: "flex", gap: "1.1rem", alignItems: "flex-start",
                background: "var(--white)", border: "1px solid var(--gray-200)",
                borderRadius: 12, padding: "1.5rem 1.6rem", textDecoration: "none",
                transition: "border-color .15s, box-shadow .15s, transform .15s",
                width: "100%", textAlign: "left", cursor: "pointer",
                font: "inherit", color: "inherit",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--green-700)";
                el.style.boxShadow = "0 6px 20px rgba(0,0,0,.06)";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "var(--gray-200)";
                el.style.boxShadow = "none";
                el.style.transform = "none";
              }}
            >
              <span style={{
                flex: "0 0 auto", width: 38, height: 38, borderRadius: 9,
                background: "var(--green-900)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {ICONS[p.id]}
              </span>
              <span>
                <span style={{
                  display: "block", fontSize: "1.02rem", fontWeight: 700,
                  color: "var(--gray-900)", marginBottom: ".3rem",
                }}>
                  {p.label}
                </span>
                <span style={{ display: "block", fontSize: ".88rem", color: "var(--gray-500)", lineHeight: 1.6 }}>
                  {p.blurb}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-title"
          onClick={e => { if (e.target === e.currentTarget) setUnlocking(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(10,20,15,.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1.5rem", zIndex: 50,
          }}
        >
          <form
            onSubmit={unlock}
            style={{
              background: "var(--white)", borderRadius: 14, padding: "2rem",
              width: "100%", maxWidth: 420, boxShadow: "0 18px 50px rgba(0,0,0,.25)",
            }}
          >
            <div style={{
              fontSize: ".7rem", fontWeight: 700, letterSpacing: ".1em",
              textTransform: "uppercase", color: "var(--green-700)", marginBottom: ".4rem",
            }}>
              {target.label}
            </div>
            <h2 id="unlock-title" style={{
              fontSize: "1.25rem", fontWeight: 700, color: "var(--gray-900)",
              marginBottom: ".5rem",
            }}>
              Enter the section password
            </h2>
            <p style={{ fontSize: ".88rem", color: "var(--gray-500)", lineHeight: 1.6, marginBottom: "1.1rem" }}>
              This is the password for {target.label}, not the one you signed in with.
            </p>

            <label htmlFor="portal-password" style={{
              display: "block", fontSize: ".72rem", fontWeight: 700,
              letterSpacing: ".08em", textTransform: "uppercase",
              color: "var(--gray-500)", marginBottom: ".35rem",
            }}>
              Password
            </label>
            <input
              id="portal-password"
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: "100%" }}
            />

            {error && (
              <p style={{ fontSize: ".85rem", color: "var(--red)", marginTop: ".6rem" }}>{error}</p>
            )}

            <div style={{ display: "flex", gap: ".6rem", marginTop: "1.25rem" }}>
              <button type="submit" className="btn btn-primary" disabled={busy || !password}
                style={{ flex: 1, padding: ".7rem", borderRadius: 9 }}>
                {busy ? "Checking…" : "Open " + target.label}
              </button>
              <button type="button" className="btn btn-ghost"
                onClick={() => { setUnlocking(null); setError(""); }}
                style={{ padding: ".7rem 1rem", borderRadius: 9 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
