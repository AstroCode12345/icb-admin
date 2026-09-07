"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PORTALS, Icon } from "../portal";

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

  useEffect(() => {
    if (!localStorage.getItem("icb_token")) { router.push("/"); return; }
    setScopes((localStorage.getItem("icb_scopes") ?? "").split(",").filter(Boolean));
  }, [router]);

  if (scopes === null) return null;
  const visible = scopes.length ? PORTALS.filter(p => scopes.includes(p.id)) : PORTALS;

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
            <a
              key={p.id}
              href={p.href}
              style={{
                display: "flex", gap: "1.1rem", alignItems: "flex-start",
                background: "var(--white)", border: "1px solid var(--gray-200)",
                borderRadius: 12, padding: "1.5rem 1.6rem", textDecoration: "none",
                transition: "border-color .15s, box-shadow .15s, transform .15s",
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
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
