"use client";
import {
  SundaySchool, SchoolDate, BLANK_SCHOOL_DATE,
  Icon, Section, Grid, Field, SchoolDateList, PortalShell, PortalLoading, usePortal,
} from "../../portal";

/**
 * Sunday School portal. The school year label and the two admissions tables
 * turn over annually; the SunWeb links change when the school moves systems.
 */
export default function SchoolPortal() {
  const { content, setContent, isMock, repo, loading, saving, toast, publish, logout } = usePortal();

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

  if (loading) return <PortalLoading />;
  if (!content) return null;

  return (
    <PortalShell
      portal="school"
      sections={[
        { label: "School Details", href: "#school",  icon: Icon.book },
        { label: "Portal Links",   href: "#portals", icon: Icon.mail },
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
        </Section>
    </PortalShell>
  );
}
