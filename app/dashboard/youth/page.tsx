"use client";
import {
  Youth, YouthEvent, BLANK_YOUTH_EVENT,
  Icon, Section, Grid, Field, Divider, FlyerField, PortalShell, PortalLoading,
  usePortal, isUpcoming, shortDate,
} from "../../portal";

/**
 * Youth Group portal. Everything the youth coordinator changes during a year:
 * the event list, the registration heading, and the four outside links.
 */
export default function YouthPortal() {
  const { content, setContent, isMock, repo, loading, saving, toast, publish, logout } = usePortal();

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

  function setYouth(field: keyof Youth, value: string) {
    setContent(c => c ? { ...c, youth: { ...(c.youth ?? {}), [field]: value } } : c);
  }

  if (loading) return <PortalLoading />;
  if (!content) return null;

  const y = content.youth ?? {};

  return (
    <PortalShell
      portal="youth"
      sections={[
        { label: "Youth Events",  href: "#youth",        icon: Icon.calendar },
        { label: "Registration",  href: "#registration", icon: Icon.book },
        { label: "Group Links",   href: "#links",        icon: Icon.mail },
      ]}
      saving={saving} isMock={isMock} repo={repo} toast={toast}
      onPublish={publish} onLogout={logout}
    >
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

                <FlyerField
                  value={ev.image}
                  alt={ev.imageAlt}
                  onChange={v => updateYouthEvent(i, "image", v)}
                  onAltChange={v => updateYouthEvent(i, "imageAlt", v)}
                />
              </div>
            );
          })}
          <button onClick={addYouthEvent} className="btn btn-ghost" style={{ width: "100%", gap: ".4rem", marginTop: ".25rem" }}>
            {Icon.plus} Add Youth Event
          </button>
        </Section>


        <Section id="registration" title="Registration Card" icon={Icon.book}
          subtitle="The heading and blurb on the Youth page's registration card, and the form it points to. All three change at the start of each school year.">
          <Field label="Heading">
            <input type="text" value={y.registrationTitle ?? ""}
              onChange={e => setYouth("registrationTitle", e.target.value)}
              placeholder="2026–2027 Registration" />
          </Field>
          <Field label="Description" style={{ marginTop: ".85rem" }}>
            <input type="text" value={y.registrationBody ?? ""}
              onChange={e => setYouth("registrationBody", e.target.value)}
              placeholder="Sign up for the ICB Wayland Youth Group for this school year." />
          </Field>
          <Field label="Registration Form URL" style={{ marginTop: ".85rem" }}>
            <input type="url" value={y.registerUrl ?? ""}
              onChange={e => setYouth("registerUrl", e.target.value)}
              placeholder="https://docs.google.com/forms/..." />
          </Field>
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".6rem", lineHeight: 1.55 }}>
            A new Google Form each year means a new URL here. The card keeps
            working as soon as you paste it in.
          </p>
        </Section>

        <Section id="links" title="Group Links" icon={Icon.mail}
          subtitle="The honor code document, Instagram, and the Linktree, as linked from the Youth page.">
          <Field label="Honor Code Document URL">
            <input type="url" value={y.honorCodeUrl ?? ""}
              onChange={e => setYouth("honorCodeUrl", e.target.value)}
              placeholder="https://docs.google.com/document/..." />
          </Field>
          <Divider label="Instagram" />
          <Grid cols={2}>
            <Field label="Handle (shown on the page)">
              <input type="text" value={y.instagramHandle ?? ""}
                onChange={e => setYouth("instagramHandle", e.target.value)}
                placeholder="@icbwayland.yg" />
            </Field>
            <Field label="Profile URL">
              <input type="url" value={y.instagramUrl ?? ""}
                onChange={e => setYouth("instagramUrl", e.target.value)}
                placeholder="https://www.instagram.com/icbwayland.yg/" />
            </Field>
          </Grid>
          <Field label="Linktree URL" style={{ marginTop: ".85rem" }}>
            <input type="url" value={y.linktreeUrl ?? ""}
              onChange={e => setYouth("linktreeUrl", e.target.value)}
              placeholder="https://linktr.ee/icbyg" />
          </Field>
        </Section>
    </PortalShell>
  );
}
