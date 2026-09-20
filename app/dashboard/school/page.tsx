"use client";
import {
  SundaySchool, SchoolDate, BLANK_SCHOOL_DATE,
  SchoolContact, BLANK_SCHOOL_CONTACT,
  Icon, Section, Grid, Field, Divider, SchoolDateList, SchoolContactList,
  PortalShell, PortalLoading, usePortal,
} from "../../portal";

/**
 * Sunday School portal. The school year label and the two admissions tables
 * turn over annually; the SunWeb links change when the school moves systems.
 */
export default function SchoolPortal() {
  const { content, setContent, isMock, repo, loading, saving, toast, publish, logout } = usePortal("school");

  type DateList = "existingDates" | "newDates" | "calendarDates";

  function setSchool(field: keyof SundaySchool, value: string | boolean) {
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

  function updateContact(i: number, field: keyof SchoolContact, value: string) {
    setContent(c => {
      if (!c) return c;
      const rows = [...(c.sundaySchool?.contacts ?? [])];
      rows[i] = { ...rows[i], [field]: value };
      return { ...c, sundaySchool: { ...(c.sundaySchool ?? {}), contacts: rows } };
    });
  }
  function addContact() {
    setContent(c => {
      if (!c) return c;
      const rows = c.sundaySchool?.contacts ?? [];
      // Start a new person in the same table as the last one, which is almost
      // always the intent when adding several people to one group.
      const group = rows.length ? rows[rows.length - 1].group : "";
      return { ...c, sundaySchool: {
        ...(c.sundaySchool ?? {}), contacts: [...rows, { ...BLANK_SCHOOL_CONTACT, group }],
      } };
    });
  }
  function removeContact(i: number) {
    setContent(c => c ? { ...c, sundaySchool: {
      ...(c.sundaySchool ?? {}),
      contacts: (c.sundaySchool?.contacts ?? []).filter((_, idx) => idx !== i),
    } } : c);
  }

  if (loading) return <PortalLoading />;
  if (!content) return null;

  return (
    <PortalShell
      portal="school"
      sections={[
        { label: "School Details",  href: "#school",   icon: Icon.book },
        { label: "School Calendar", href: "#calendar", icon: Icon.calendar },
        { label: "Contacts",        href: "#contacts", icon: Icon.users },
        { label: "Portal Links",    href: "#portals",  icon: Icon.mail },
      ]}
      saving={saving} isMock={isMock} repo={repo} toast={toast}
      onPublish={publish} onLogout={logout}
    >
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

          <Divider label="Admissions Status" />
          <Field label="Existing Families: what to say right now" style={{ marginTop: ".75rem" }}>
            <textarea rows={3} value={content.sundaySchool?.existingNote ?? ""}
              onChange={e => setSchool("existingNote", e.target.value)}
              placeholder="Admissions are now complete and school has started..." />
          </Field>
          <Field label="New Families: what to say right now" style={{ marginTop: ".85rem" }}>
            <textarea rows={3} value={content.sundaySchool?.newNote ?? ""}
              onChange={e => setSchool("newNote", e.target.value)}
              placeholder="As-salaamu 'alaykum, and welcome! We offer two program options..." />
          </Field>
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            The opening paragraph of each admissions card. Use this to say whether admissions are
            open, closed, or complete. The SunWebApp link and the register button stay put.
          </p>

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
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            Leave a list empty and its table stays off the page, rather than showing last
            year&rsquo;s deadlines.
          </p>

          <Divider label="Curriculum Section" />
          <label className="toggle-wrap" style={{ display: "inline-flex", marginTop: ".75rem" }}>
            <span className="toggle">
              <input type="checkbox" checked={content.sundaySchool?.showCurriculum ?? false}
                onChange={e => setSchool("showCurriculum", e.target.checked)} />
              <span className="toggle-track" />
            </span>
            <span style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--gray-700)", textTransform: "none", letterSpacing: 0 }}>
              {content.sundaySchool?.showCurriculum ? "Curriculum section is showing" : "Curriculum section is hidden"}
            </span>
          </label>
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            The Islamic Arabic and Religion cards with their curriculum PDFs. Hidden because the
            documents are from 2019-20. Turn back on once they are replaced.
          </p>
        </Section>


        {/* School Calendar */}
        <Section id="calendar" title="School Calendar" icon={Icon.calendar}
          subtitle="The key Sundays of the school year, shown on the School page between the timetable and admissions.">
          <label className="toggle-wrap" style={{ display: "inline-flex" }}>
            <span className="toggle">
              <input type="checkbox" checked={content.sundaySchool?.showCalendar ?? false}
                onChange={e => setSchool("showCalendar", e.target.checked)} />
              <span className="toggle-track" />
            </span>
            <span style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--gray-700)", textTransform: "none", letterSpacing: 0 }}>
              {content.sundaySchool?.showCalendar ? "Calendar section is showing" : "Calendar section is hidden"}
            </span>
          </label>

          <SchoolDateList
            label="Key Sundays"
            rows={content.sundaySchool?.calendarDates ?? []}
            onChange={(i, f, v) => updateSchoolDate("calendarDates", i, f, v)}
            onAdd={() => addSchoolDate("calendarDates")}
            onRemove={i => removeSchoolDate("calendarDates", i)}
            whenLabel="Date (Sunday)"
            whatLabel="School calendar event"
            addLabel="Add Date"
            whenPlaceholder="9/13/2026"
            whatPlaceholder="First day of school"
            emptyNote="No dates listed yet. Add the year's Sundays, then turn the section on above."
          />
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            First and last day, no-school Sundays, breaks, assessment days, conferences and
            graduation. Listed in the order you enter them.
          </p>
        </Section>

        {/* Contacts */}
        <Section id="contacts" title="School Contacts" icon={Icon.users}
          subtitle="The staff tables at the bottom of the School page. Principals, assistant principals, and the leadership and support team.">
          <SchoolContactList
            rows={content.sundaySchool?.contacts ?? []}
            onChange={updateContact}
            onAdd={addContact}
            onRemove={removeContact}
          />
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            &ldquo;Table&rdquo; is the heading a person appears under, and people are listed in the
            order you enter them. Give two people the same table and role, such as two assistant
            principals, and they share one row. Emails are lowercased automatically.
          </p>
        </Section>

        <Section id="portals" title="SunWeb Portal Links" icon={Icon.mail}
          subtitle="The parent and teacher logins, linked from the top of the School page and again from its quick links.">
          <Field label="Parent Portal URL">
            <input type="url" value={content.sundaySchool?.parentPortalUrl ?? ""}
              onChange={e => setSchool("parentPortalUrl", e.target.value)}
              placeholder="https://sunweb.us/?s=icbwaylandss" />
          </Field>
          <Field label="Teacher Portal URL" style={{ marginTop: ".85rem" }}>
            <input type="url" value={content.sundaySchool?.teacherPortalUrl ?? ""}
              onChange={e => setSchool("teacherPortalUrl", e.target.value)}
              placeholder="https://sunweb.us/admin/admin-login?s=icbwaylandss" />
          </Field>
          <Field label="School Calendar URL" style={{ marginTop: ".85rem" }}>
            <input type="text" value={content.sundaySchool?.calendarUrl ?? ""}
              onChange={e => setSchool("calendarUrl", e.target.value)}
              placeholder="/calendar/" />
          </Field>
          <p style={{ fontSize: ".8rem", color: "var(--gray-500)", marginTop: ".5rem" }}>
            Behind the School Calendar button in the School page quick links. Currently the ICB
            events calendar; point it at the school&rsquo;s own calendar when there is one.
          </p>
        </Section>
    </PortalShell>
  );
}
