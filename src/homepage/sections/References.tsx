import { homepageTheme as t } from "../theme";

/**
 * §5 — References & citing this work. Selected citations with hanging
 * indents, BibTeX block, links to GitHub + bibliography.
 *
 * Each citation is paired with the canonical DOI. Citations were verified
 * against Crossref before linking — see docs/BIBLIOGRAPHY.md for the full
 * audited list.
 */
type Citation = { text: string; doi: string };

export function References() {
  const citations: Citation[] = [
    {
      text:
        "Bernacki, R., Paladino, J., Neville, B. A., et al. (2019). Effect of the Serious Illness Care Program in Outpatient Oncology: A Cluster Randomized Clinical Trial. JAMA Internal Medicine, 179(6), 751–759.",
      doi: "10.1001/jamainternmed.2019.0077",
    },
    {
      text:
        "Freeman-Sanderson, A., Morris, K., & Elkins, M. (2019). Characteristics of patient communication and prevalence of communication difficulty in the intensive care unit: An observational study. Australian Critical Care, 32(5), 373–377.",
      doi: "10.1016/j.aucc.2018.09.002",
    },
    {
      text:
        "Happ, M. B., Garrett, K., Thomas, D. D., et al. (2011). Nurse-Patient Communication Interactions in the Intensive Care Unit. American Journal of Critical Care, 20(2), e28–e40.",
      doi: "10.4037/ajcc2011433",
    },
    {
      text:
        "Li, L., Wu, S., Wang, J., et al. (2023). Development of the Emoji Faces Pain Scale and Its Validation on Mobile Devices in Adult Surgery Patients: Longitudinal Observational Study. Journal of Medical Internet Research, 25, e41189.",
      doi: "10.2196/41189",
    },
    {
      text:
        "Paladino, J., Bernacki, R., Neville, B. A., et al. (2019). Evaluating an Intervention to Improve Communication Between Oncology Clinicians and Patients With Life-Limiting Cancer: A Cluster Randomized Clinical Trial of the Serious Illness Care Program. JAMA Oncology, 5(6), 801–809.",
      doi: "10.1001/jamaoncol.2019.0292",
    },
    {
      text:
        "Zubow, L., & Hurtig, R. (2013). A Demographic Study of AAC/AT Needs in Hospitalized Patients. Perspectives on Augmentative and Alternative Communication, 22(2), 79–90.",
      doi: "10.1044/aac22.2.79",
    },
  ];

  const bibtex = `@misc{ownvoice2026,
  title = {OwnVoice: On-Device Voice-Cloning AAC for ICU Patients Without Functional Speech},
  year = {2026},
  url = {https://ownvoice.icu},
  note = {Clinical validation study protocol}
}`;

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
          §5 &middot; References & citing this work
        </div>
        <ul
          style={{
            marginTop: 20,
            padding: 0,
            listStyle: "none",
            fontSize: 13,
            lineHeight: 1.55,
            color: t.color.body,
          }}
        >
          {citations.map((c) => (
            <li
              key={c.doi}
              style={{ paddingLeft: 24, textIndent: -24, marginBottom: 10 }}
            >
              {c.text}{" "}
              <a
                href={`https://doi.org/${c.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: t.color.text, whiteSpace: "nowrap" }}
              >
                doi.org/{c.doi}
              </a>
            </li>
          ))}
        </ul>
        <h3
          style={{
            marginTop: 28,
            fontSize: 14,
            fontWeight: 600,
            color: t.color.text,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Cite this work
        </h3>
        <pre
          style={{
            marginTop: 8,
            padding: 14,
            background: t.color.surface,
            border: `1px solid ${t.color.border}`,
            borderRadius: t.radius,
            fontSize: 12,
            lineHeight: 1.5,
            overflowX: "auto",
            color: t.color.text,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          {bibtex}
        </pre>
        <div
          style={{
            marginTop: 18,
            fontSize: 13,
            color: t.color.body,
          }}
        >
          Full bibliography:{" "}
          <a href="/bibliography" style={{ color: t.color.text }}>
            ownvoice.icu/bibliography
          </a>{" "}
          (or the source on{" "}
          <a
            href="https://github.com/mcat/ownvoice/blob/main/docs/BIBLIOGRAPHY.md"
            style={{ color: t.color.text }}
          >
            GitHub
          </a>
          ).
        </div>
      </div>
    </section>
  );
}
