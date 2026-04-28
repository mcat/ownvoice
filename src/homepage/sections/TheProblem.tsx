import { homepageTheme as t } from "../theme";

/**
 * §1 — The problem. Four stat cards backed by citations. Numbers come
 * from docs/ownvoice-research-plan.md §2.1 (Zubow & Hurtig 2013;
 * Happ et al. 2014; Freeman-Sanderson 2019; Happ et al. 2011).
 *
 * Each citation links to the canonical DOI (Crossref-verified).
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
            text="of ICU patients meet AAC candidacy criteria"
            cite="Zubow & Hurtig, 2013"
            doi="10.1044/aac22.2.79"
          />
          <StatCard
            stat="54%"
            text="of mechanically ventilated ICU patients are awake and alert enough to use AAC"
            cite="Happ et al., 2014"
            doi="10.1016/j.hrtlng.2014.08.010"
          />
          <StatCard
            stat="11%"
            text="of stay involves any alternative communication"
            cite="Freeman-Sanderson et al., 2019"
            doi="10.1016/j.aucc.2018.09.002"
          />
          <StatCard
            stat="35%"
            text="of staff report difficulty understanding patients"
            cite="Happ et al., 2011"
            doi="10.4037/ajcc2011433"
          />
        </div>
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
