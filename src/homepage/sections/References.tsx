import { homepageTheme as t } from "../theme";

/**
 * §5 — References & citing this work. Selected citations with hanging
 * indents, BibTeX block, links to GitHub + bibliography.
 */
export function References() {
  const citations = [
    "Bernacki, R., Paladino, J., Neville, B. A., et al. (2019). Effect of the Serious Illness Care Program in outpatient oncology: A cluster randomized clinical trial. JAMA Internal Medicine, 179(6), 751–759.",
    "Freeman-Sanderson, A., Togher, L., Elkins, M., et al. (2019). Quality of life improves for tracheostomy patients with return of voice. Heart & Lung, 48(2), 143–149.",
    "Happ, M. B., Garrett, K., Thomas, D. D., et al. (2011). Nurse-patient communication interactions in the intensive care unit. American Journal of Critical Care, 20(2), e28–e40.",
    "Li, P., Buchanan, S., Goyal, A., et al. (2023). Development of the Emoji Faces Pain Scale and its evaluation. JMIR Human Factors, 10, e41994.",
    "Paladino, J., Bernacki, R., Neville, B. A., et al. (2019). Evaluating an intervention to improve communication between oncology clinicians and patients with life-limiting cancer. JAMA Oncology, 5(6), 801–809.",
    "Zubow, L., & Hurtig, R. (2013). A demographic study of AAC/AT needs in hospitalized patients. Perspectives on Augmentative and Alternative Communication, 22(2), 79–90.",
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
              key={c}
              style={{ paddingLeft: 24, textIndent: -24, marginBottom: 10 }}
            >
              {c}
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
          <a
            href="https://github.com/mcat/ownvoice/blob/main/docs/BIBLIOGRAPHY.md"
            style={{ color: t.color.text }}
          >
            docs/BIBLIOGRAPHY.md
          </a>{" "}
          on GitHub.
        </div>
      </div>
    </section>
  );
}
