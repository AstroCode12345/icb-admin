"use client";
import { useState } from "react";
import {
  Prayers, Event, Khateeb, Ramadan, SchoolDate,
  BLANK_EVENT, BLANK_KHATEEB, BLANK_RAMADAN, BLANK_SCHOOL_DATE,
  Membership, BoardMember, Committee, Management,
  BLANK_BOARD_MEMBER, BLANK_COMMITTEE, BLANK_MANAGEMENT,
  Icon, Section, Grid, Field, Divider, FlyerField, SchoolDateList,
  PeopleList, CommitteeList, PortalShell, PortalLoading,
  usePortal, isUpcoming, shortDate,
} from "../../portal";

type BoardListKey = "boardElected" | "boardAppointed";

type RamadanListKey = "khutbas" | "maximizingProgram" | "communityIftars";

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
  // Board and committee edits all reshape one key, so they share these helpers.
  function withManagement(fn: (m: Management) => Management) {
    setContent(c => c ? { ...c, management: fn(c.management ?? { ...BLANK_MANAGEMENT }) } : c);
  }
  function updatePerson(list: BoardListKey, i: number, field: keyof BoardMember, value: string) {
    withManagement(m => {
      const rows = [...(m[list] ?? [])];
      rows[i] = { ...rows[i], [field]: value };
      return { ...m, [list]: rows };
    });
  }
  function addPerson(list: BoardListKey) {
    withManagement(m => ({ ...m, [list]: [...(m[list] ?? []), { ...BLANK_BOARD_MEMBER }] }));
  }
  function removePerson(list: BoardListKey, i: number) {
    withManagement(m => ({ ...m, [list]: (m[list] ?? []).filter((_, idx) => idx !== i) }));
  }
  function updateCommittee(i: number, field: keyof Committee, value: string) {
    withManagement(m => {
      const rows = [...(m.committees ?? [])];
      // Chairs are typed as one comma-separated line and stored as a list, so
      // the website can put each name on its own row.
      rows[i] = field === "leads"
        ? { ...rows[i], leads: value.split(",").map(s => s.trim()).filter(Boolean) }
        : { ...rows[i], [field]: value };
      return { ...m, committees: rows };
    });
  }
  function addCommittee() {
    withManagement(m => ({ ...m, committees: [...(m.committees ?? []), { ...BLANK_COMMITTEE }] }));
  }
  function removeCommittee(i: number) {
    withManagement(m => ({ ...m, committees: (m.committees ?? []).filter((_, idx) => idx !== i) }));
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

  // --- Ramadan --------------------------------------------------------------
  function setRamadanField<K extends keyof Ramadan>(key: K, value: Ramadan[K]) {
    setContent(c => c ? { ...c, ramadan: { ...BLANK_RAMADAN, ...c.ramadan, [key]: value } } : c);
  }
  function setRamadanIqama(key: keyof NonNullable<Ramadan["iqama"]>, value: string) {
    setContent(c => {
      if (!c) return c;
      const ramadan = { ...BLANK_RAMADAN, ...c.ramadan };
      return { ...c, ramadan: { ...ramadan, iqama: { ...ramadan.iqama!, [key]: value } } };
    });
  }
  function updateRamadanList(key: RamadanListKey, i: number, field: keyof SchoolDate, value: string) {
    setContent(c => {
      if (!c) return c;
      const ramadan = { ...BLANK_RAMADAN, ...c.ramadan };
      const list = [...(ramadan[key] ?? [])];
      list[i] = { ...list[i], [field]: value };
      return { ...c, ramadan: { ...ramadan, [key]: list } };
    });
  }
  function addRamadanList(key: RamadanListKey) {
    setContent(c => {
      if (!c) return c;
      const ramadan = { ...BLANK_RAMADAN, ...c.ramadan };
      return { ...c, ramadan: { ...ramadan, [key]: [...(ramadan[key] ?? []), { ...BLANK_SCHOOL_DATE }] } };
    });
  }
  function removeRamadanList(key: RamadanListKey, i: number) {
    setContent(c => {
      if (!c) return c;
      const ramadan = { ...BLANK_RAMADAN, ...c.ramadan };
      return { ...c, ramadan: { ...ramadan, [key]: (ramadan[key] ?? []).filter((_, idx) => idx !== i) } };
    });
  }

  // Guess next year if it's autumn or later, since that is when Ramadan
  // planning for the following February or March actually starts. The admin
  // sees the fetched date range before publishing, so a wrong guess here
  // costs one click to correct rather than becoming a silent mistake.
  const [scheduleYear, setScheduleYear] = useState(
    String(new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0))
  );
  const [fetchingSchedule, setFetchingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  async function fetchSchedule() {
    setFetchingSchedule(true);
    setScheduleError("");
    try {
      const token = localStorage.getItem("icb_token") ?? "";
      const res = await fetch(`/api/ramadan-schedule?year=${encodeURIComponent(scheduleYear)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const out = await res.json();
      if (!res.ok) { setScheduleError(out.error ?? "Could not fetch the schedule."); return; }
      setRamadanField("schedule", out.days);
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : "Could not fetch the schedule.");
    } finally {
      setFetchingSchedule(false);
    }
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
        { label: "Ramadan Page",     href: "#ramadan",      icon: Icon.calendar },
        { label: "Iftar Sponsorship", href: "#iftar",       icon: Icon.moon },
        { label: "Scholarship",      href: "#scholarship",  icon: Icon.book },
        { label: "Membership Fees",  href: "#membership",   icon: Icon.users },
        { label: "Board & Committees", href: "#management", icon: Icon.users },
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

        {/* Ramadan */}
        <Section id="ramadan" title="Ramadan Page" icon={Icon.calendar}
          subtitle="The dedicated Ramadan page and its nav link both stay hidden on the website until you turn this on.">
          <div style={{ marginBottom: "1.5rem" }}>
            <label className="toggle-wrap" style={{ display: "inline-flex" }}>
              <span className="toggle">
                <input type="checkbox" checked={content.ramadan?.visible ?? false}
                  onChange={e => setRamadanField("visible", e.target.checked)} />
                <span className="toggle-track" />
              </span>
              <span style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--gray-700)", textTransform: "none", letterSpacing: 0 }}>
                {content.ramadan?.visible ? "Ramadan page is live" : "Ramadan page is hidden"}
              </span>
            </label>
          </div>

          <Divider label="This Year's Iqama Times" />
          <Grid cols={3}>
            {(["fajr", "zuhr", "asr", "maghrib", "isha"] as const).map(name => (
              <Field key={name} label={name.charAt(0).toUpperCase() + name.slice(1)}>
                <input type="text" value={content.ramadan?.iqama?.[name] ?? ""}
                  onChange={e => setRamadanIqama(name, e.target.value)} placeholder="5:00 AM" />
              </Field>
            ))}
          </Grid>

          <Divider label="Suhoor &amp; Iftar Schedule" />
          <p style={{ fontSize: ".84rem", color: "var(--gray-500)", marginBottom: ".85rem", lineHeight: 1.55 }}>
            Calculated automatically for Wayland, MA (ISNA method), the same source the old site&rsquo;s
            schedule used. Enter the Gregorian year Ramadan starts in and fetch it. No typing required.
          </p>
          <div style={{ display: "flex", gap: ".75rem", alignItems: "flex-end", marginBottom: ".85rem" }}>
            <Field label="Year" style={{ flex: "0 0 120px" }}>
              <input type="text" value={scheduleYear} onChange={e => setScheduleYear(e.target.value)} placeholder="2027" />
            </Field>
            <button onClick={fetchSchedule} className="btn btn-ghost" disabled={fetchingSchedule} style={{ padding: ".6rem 1.1rem" }}>
              {fetchingSchedule ? "Fetching…" : "Fetch Schedule"}
            </button>
          </div>
          {scheduleError && (
            <p style={{ fontSize: ".85rem", color: "var(--red)", marginBottom: ".75rem" }}>{scheduleError}</p>
          )}
          {(content.ramadan?.schedule ?? []).length > 0 ? (
            <div style={{
              background: "var(--green-50)", border: "1px solid var(--green-100,#d8f3dc)", borderRadius: 8,
              padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".75rem",
            }}>
              <span style={{ fontSize: ".88rem", color: "var(--gray-700)" }}>
                {content.ramadan!.schedule!.length} days loaded, {shortDate(content.ramadan!.schedule![0].date)}
                {" "}to {shortDate(content.ramadan!.schedule![content.ramadan!.schedule!.length - 1].date)}
              </span>
              <button onClick={() => setRamadanField("schedule", [])} className="btn btn-ghost" style={{ fontSize: ".82rem", padding: ".4rem .8rem" }}>
                Clear
              </button>
            </div>
          ) : (
            <p style={{ fontSize: ".85rem", color: "var(--gray-500)" }}>
              No schedule loaded yet. The website will say the day-by-day schedule has not been posted.
            </p>
          )}

          <SchoolDateList label="Friday Khutbas"
            rows={content.ramadan?.khutbas ?? []}
            onChange={(i, f, v) => updateRamadanList("khutbas", i, f, v)}
            onAdd={() => addRamadanList("khutbas")}
            onRemove={i => removeRamadanList("khutbas", i)} />

          <SchoolDateList label="Maximizing Ramadan Program"
            rows={content.ramadan?.maximizingProgram ?? []}
            onChange={(i, f, v) => updateRamadanList("maximizingProgram", i, f, v)}
            onAdd={() => addRamadanList("maximizingProgram")}
            onRemove={i => removeRamadanList("maximizingProgram", i)} />

          <SchoolDateList label="Community Iftars"
            rows={content.ramadan?.communityIftars ?? []}
            onChange={(i, f, v) => updateRamadanList("communityIftars", i, f, v)}
            onAdd={() => addRamadanList("communityIftars")}
            onRemove={i => removeRamadanList("communityIftars", i)} />

          <Divider label="Tarawih" />
          <Field label="Tarawih Note">
            <textarea value={content.ramadan?.tarawihNote ?? ""}
              onChange={e => setRamadanField("tarawihNote", e.target.value)}
              placeholder="Tarawih prayers start February 17. Isha at 7:30 PM through March 1, then 8:30 PM."
              rows={2} />
          </Field>

          <Divider label="Lailatul Qadr" />
          <Field label="Lailatul Qadr Note">
            <textarea value={content.ramadan?.lailatulQadrNote ?? ""}
              onChange={e => setRamadanField("lailatulQadrNote", e.target.value)}
              placeholder="Qiyam al-Layl on the 27th of Ramadan, March 15 after Tarawih to March 16 Suhoor."
              rows={2} />
          </Field>
          <Grid cols={2}>
            <Field label="Registration Link">
              <input type="url" value={content.ramadan?.lailatulQadrRegisterUrl ?? ""}
                onChange={e => setRamadanField("lailatulQadrRegisterUrl", e.target.value)}
                placeholder="https://www.eventbrite.com/..." />
            </Field>
            <Field label="Food Sign-Up Link">
              <input type="url" value={content.ramadan?.lailatulQadrFoodUrl ?? ""}
                onChange={e => setRamadanField("lailatulQadrFoodUrl", e.target.value)}
                placeholder="https://signup.com/..." />
            </Field>
          </Grid>

          <Divider label="Zakat al-Fitr &amp; Fidyah" />
          <Grid cols={2}>
            <Field label="Zakat al-Fitr Amount ($ per person)">
              <input type="text" value={content.ramadan?.zakatFitrAmount ?? ""}
                onChange={e => setRamadanField("zakatFitrAmount", e.target.value)} placeholder="15" />
            </Field>
            <Field label="Fidyah Amount ($ per missed fast)">
              <input type="text" value={content.ramadan?.fidyahAmount ?? ""}
                onChange={e => setRamadanField("fidyahAmount", e.target.value)} placeholder="12" />
            </Field>
          </Grid>
        </Section>

        {/* Iftar Sponsorship */}
        <Section id="iftar" title="Iftar Sponsorship" icon={Icon.moon}
          subtitle="The Iftar Sponsorship page, its card on the Prayers page, and its quick link on the homepage.">
          <label className="toggle-wrap" style={{ display: "inline-flex" }}>
            <span className="toggle">
              <input type="checkbox" checked={content.ramadan?.showIftarSponsorship ?? false}
                onChange={e => setRamadanField("showIftarSponsorship", e.target.checked)} />
              <span className="toggle-track" />
            </span>
            <span style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--gray-700)", textTransform: "none", letterSpacing: 0 }}>
              {content.ramadan?.showIftarSponsorship ? "Iftar sponsorship is showing" : "Iftar sponsorship is hidden"}
            </span>
          </label>
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            Turn this off when sponsorship closes. The card and the quick link disappear, and the
            page stays at its address but says sponsorship is not open right now.
          </p>
        </Section>

        {/* Scholarship */}
        <Section id="scholarship" title="College Scholarship" icon={Icon.book}
          subtitle="The one field on the scholarship page that changes every cycle. Applications, past recipients, and requirements live in the page itself.">
          <Field label="Starting College Fall Year">
            <input type="text" value={content.scholarship?.startYear ?? ""}
              onChange={e => setContent(c => c ? { ...c, scholarship: { ...(c.scholarship ?? {}), startYear: e.target.value } } : c)}
              placeholder="2027" />
          </Field>
        </Section>

        {/* Membership */}
        <Section id="membership" title="Membership Fees" icon={Icon.users}
          subtitle="The dollar amounts on the Membership page, both in the summary text and the renewal dropdown, plus the PayPal button behind the renewal form.">
          <Grid cols={2}>
            <Field label="Family Fee ($ USD)">
              <input type="text" value={content.membership?.familyFee ?? ""}
                onChange={e => setContent(c => c ? { ...c, membership: { ...(c.membership ?? {}), familyFee: e.target.value } } : c)}
                placeholder="204.56" />
            </Field>
            <Field label="Single Fee ($ USD)">
              <input type="text" value={content.membership?.singleFee ?? ""}
                onChange={e => setContent(c => c ? { ...c, membership: { ...(c.membership ?? {}), singleFee: e.target.value } } : c)}
                placeholder="102.53" />
            </Field>
          </Grid>
          <Field label="PayPal Button ID" style={{ marginTop: ".85rem" }}>
            <input type="text" value={content.membership?.paypalButtonId ?? ""}
              onChange={e => setContent(c => c ? { ...c, membership: { ...(c.membership ?? {}), paypalButtonId: e.target.value } } : c)}
              placeholder="VBNU2YYYNYDEL" />
          </Field>
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            Found in PayPal under the button&rsquo;s own settings, not a password. Only change this if the
            renewal button is recreated on PayPal&rsquo;s side.
          </p>
        </Section>

        {/* Board & Committees */}
        <Section id="management" title="Board & Committees" icon={Icon.users}
          subtitle="Who holds each position on the About &rsaquo; Board &amp; Committees page.">
          <PeopleList
            label="Elected Board"
            rows={content.management?.boardElected ?? []}
            onChange={(i, f, v) => updatePerson("boardElected", i, f, v)}
            onAdd={() => addPerson("boardElected")}
            onRemove={i => removePerson("boardElected", i)}
            addLabel="Add Board Member"
            emptyNote="No board members listed. The Board of Directors table will be empty."
          />
          <PeopleList
            label="Appointed Positions"
            rows={content.management?.boardAppointed ?? []}
            onChange={(i, f, v) => updatePerson("boardAppointed", i, f, v)}
            onAdd={() => addPerson("boardAppointed")}
            onRemove={i => removePerson("boardAppointed", i)}
            addLabel="Add Appointed Position"
            emptyNote="No appointed positions listed. That table will be empty."
          />
          <CommitteeList
            rows={content.management?.committees ?? []}
            onChange={updateCommittee}
            onAdd={addCommittee}
            onRemove={removeCommittee}
          />
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".85rem" }}>
            Separate two chairpersons with a comma. Emails are lowercased automatically.
          </p>
        </Section>

    </PortalShell>
  );
}
