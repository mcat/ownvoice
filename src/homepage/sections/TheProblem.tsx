import { homepageTheme as t } from "../theme";

/**
 * §1 — The problem. Four stat cards backed by citations: AAC candidacy
 * hospital-wide (Zubow & Hurtig 2013) and in MV ICU patients
 * (Happ et al. 2015), communication breakdown at the bedside
 * (Freeman-Sanderson et al. 2019), and staff impact
 * (IJssennagger et al. 2018).
 *
 * Each citation links to the canonical DOI (Crossref-verified), and each
 * stat was checked against the source abstract (2026-06-12 audit):
 * Zubow & Hurtig studied *hospitalized* patients (not ICU-only);
 * Happ: 1440/2671 = 53.9%; Freeman-Sanderson: staff-reported difficulty
 * on 35% of bed-days, inability in 49% of those; IJssennagger: "over 75%".
 */
export function TheProblem() {
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
          §1 &middot; The problem
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
          Communication failure in the ICU is common, harmful, and under-addressed.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          <StatCard
            stat="~33%"
            text="of hospitalized patients meet AAC candidacy criteria"
            cite="Zubow & Hurtig, 2013"
            doi="10.1044/aac22.2.79"
          />
          <StatCard
            stat="54%"
            text="of mechanically ventilated ICU patients are awake and alert enough to use AAC"
            cite="Happ et al., 2015"
            doi="10.1016/j.hrtlng.2014.08.010"
          />
          <StatCard
            stat="35%"
            text="of ICU bed-days involve staff-reported difficulty communicating with patients — on half of those days, no communication is possible at all"
            cite="Freeman-Sanderson et al., 2019"
            doi="10.1016/j.aucc.2018.09.002"
          />
          <StatCard
            stat="75%"
            text="of ICU staff say communication failures harm patient care"
            cite="IJssennagger et al., 2018"
            doi="10.1016/j.jcrc.2018.08.036"
          />
        </div>
        <p
          style={{
            marginTop: 22,
            fontSize: 14,
            lineHeight: 1.6,
            color: t.color.body,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          And the eligible population keeps widening. As ICU practice has shifted from
          heavy continuous sedation toward light-sedation and early-mobilization protocols{" "}
          <a
            href="https://doi.org/10.1097/CCM.0000000000003299"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: t.color.muted, textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            (PADIS, 2018)
          </a>
          , more mechanically ventilated patients stay awake and interactive — exactly
          the population AAC was built to serve, and exactly the gap still unmet at the
          bedside.
        </p>
      </div>
    </section>
  );
}

function StatCard({
  stat,
  text,
  cite,
  doi,
}: {
  stat: string;
  text: string;
  cite: string;
  doi: string;
}) {
  return (
    <div
      style={{
        background: t.color.surface,
        padding: 16,
        borderRadius: t.radius,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 600, color: t.color.text }}>{stat}</div>
      <div
        style={{
          fontSize: 13,
          color: t.color.body,
          lineHeight: 1.45,
          marginTop: 6,
        }}
      >
        {text}{" "}
        <a
          href={`https://doi.org/${doi}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: t.color.muted, textDecoration: "underline", textUnderlineOffset: 2 }}
        >
          ({cite})
        </a>
      </div>
    </div>
  );
}
