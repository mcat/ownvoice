import { homepageTheme as t } from "../theme";

/**
 * §4 — Study at a glance. Five aims, study type, status, and a link
 * to the full research plan at /research. Status string mirrors the
 * spec exactly: "Protocol drafted; not yet IRB-submitted."
 */
export function StudyAtAGlance() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        borderTop: `1px solid ${t.color.border}`,
      }}
    >
      <div style={{ maxWidth: t.maxWidth, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: t.color.muted,
          }}
        >
          §4 &middot; Study at a glance
        </div>
        <h2
          style={{
            marginTop: 12,
            fontSize: 22,
            fontWeight: 600,
            color: t.color.text,
            letterSpacing: "-0.01em",
            maxWidth: t.bodyMaxWidth,
          }}
        >
          A prospective, single-center, mixed-methods clinical validation study.
        </h2>
        <ol
          style={{
            marginTop: 20,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 8,
            color: t.color.text,
            fontSize: 13,
          }}
        >
          <li>
            <strong>Aim 1</strong> &mdash; Communication ease (ECS) vs. standard of care
          </li>
          <li>
            <strong>Aim 2</strong> &mdash; Voice identity and emotional wellbeing
          </li>
          <li>
            <strong>Aim 3</strong> &mdash; SICG feasibility with AAC
          </li>
          <li>
            <strong>Aim 4</strong> &mdash; On-device inference latency and reliability
          </li>
          <li>
            <strong>Aim 5</strong> &mdash; Nursing workflow and communication burden
          </li>
        </ol>
        <p style={{ marginTop: 20, fontSize: 13, color: t.color.body }}>
          <span style={{ color: t.color.muted }}>Status:</span>{" "}
          <span style={{ color: "#92400e", fontWeight: 600 }}>
            Protocol drafted; not yet IRB-submitted.
          </span>
        </p>
        <a
          href="/research"
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "8px 14px",
            border: `1px solid ${t.color.border}`,
            borderRadius: 5,
            fontSize: 13,
            color: t.color.text,
            textDecoration: "none",
          }}
        >
          Read the full research plan &rarr;
        </a>
      </div>
    </section>
  );
}
