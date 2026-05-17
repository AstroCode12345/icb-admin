"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token } = await res.json();
      localStorage.setItem("icb_token", token);
      router.push("/dashboard");
    } else {
      setError("Incorrect password. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--gray-100)" }}>

      {/* ── Left green panel ── */}
      <div style={{
        flex: "0 0 400px",
        background: "var(--green-800)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem",
      }}>
        <div>
          <div style={{
            width: 44, height: 44,
            border: "2px solid rgba(255,255,255,.25)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: "2.5rem",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "1.85rem", fontWeight: 700, color: "white", lineHeight: 1.2, marginBottom: ".75rem" }}>
            ICB Wayland
          </h1>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: ".9rem", lineHeight: 1.65 }}>
            Website Admin Portal. Sign in to update prayer times, events, and announcements.
          </p>
        </div>
        <p style={{ fontSize: ".75rem", color: "rgba(255,255,255,.3)" }}>
          Islamic Center of Boston — Wayland, MA
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: 340 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: ".4rem" }}>Sign in</h2>
          <p style={{ color: "var(--gray-500)", fontSize: ".9rem", marginBottom: "2rem" }}>
            Enter the admin password to continue.
          </p>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="pw">Password</label>
              <input
                id="pw"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
              />
            </div>
            {error && (
              <div style={{
                background: "var(--red-light)", border: "1px solid #fecaca",
                borderRadius: 8, padding: ".6rem .85rem",
                color: "var(--red)", fontSize: ".85rem", marginBottom: "1rem",
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: ".8rem", fontSize: ".95rem" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
