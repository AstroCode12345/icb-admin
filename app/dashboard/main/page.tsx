"use client";
import {
  Prayers, Event, Khateeb, BLANK_EVENT, BLANK_KHATEEB,
  Icon, Section, Grid, Field, Divider, FlyerField, PortalShell, PortalLoading,
  usePortal, isUpcoming, shortDate,
} from "../../portal";

/**
 * Main website portal: the content that changes across the site as a whole,
 * rather than on the School or Youth pages.
 */
export default function MainPortal() {
  const { content, setContent, isMock, repo, loading, saving, toast, publish, logout } = usePortal("main");

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

  if (loading) return <PortalLoading />;
  if (!content) return null;

  return (
    <PortalShell
      portal="main"
      sections={[
        { label: "Prayer Times",     href: "#prayers",      icon: Icon.clock },
        { label: "Friday Khateebs",  href: "#speaker",      icon: Icon.mic },
        { label: "Announcement",     href: "#announcement", icon: Icon.bell },
        { label: "Events",           href: "#events",       icon: Icon.calendar },
        { label: "Contact & Social", href: "#contact",      icon: Icon.mail },
        { label: "Donate Link",      href: "#donate",       icon: Icon.heart },
      ]}
      saving={saving} isMock={isMock} repo={repo} toast={toast}
      onPublish={publish} onLogout={logout}
    >
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

                <FlyerField
                  value={ev.image}
                  alt={ev.imageAlt}
                  onChange={v => updateEvent(i, "image", v)}
                  onAltChange={v => updateEvent(i, "imageAlt", v)}
                />

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

    </PortalShell>
  );
}
