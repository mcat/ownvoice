import { useState } from "preact/hooks";
import { homepageTheme as t } from "../theme";

/**
 * §6 — References & citing this work. Selected citations with hanging
 * indents, BibTeX block, link to the full bibliography.
 *
 * Each citation is paired with the canonical DOI. Citations were verified
 * against Crossref before linking — see docs/BIBLIOGRAPHY.md for the full
 * audited list.
 */
type Citation = { text: string; doi: string };

type CopyState = "idle" | "copied" | "error";

export function References() {
  const citations: Citation[] = [
    {
      text:
        "Bernacki, R., Paladino, J., Neville, B. A., et al. (2019). Effect of the Serious Illness Care Program in Outpatient Oncology: A Cluster Randomized Clinical Trial. JAMA Internal Medicine, 179(6), 751–759.",
      doi: "10.1001/jamainternmed.2019.0077",
    },
    {
      text:
        "Carroll, S. M. (2007). Silent, Slow Lifeworld: The Communication Experience of Nonvocal Ventilated Patients. Qualitative Health Research, 17(9), 1165–1177.",
      doi: "10.1177/1049732307307334",
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
        "Happ, M. B., Seaman, J. B., Nilsen, M. L., et al. (2014). The number of mechanically ventilated ICU patients meeting communication criteria. Heart & Lung, 44(1), 45–49.",
      doi: "10.1016/j.hrtlng.2014.08.010",
    },
    {
      text:
        "Happ, M. B. (2021). Giving Voice: Nurse-Patient Communication in the Intensive Care Unit. American Journal of Critical Care, 30(4), 256–265.",
      doi: "10.4037/ajcc2021666",
    },
    {
      text:
        "IJssennagger, C. E., Ten Hoorn, S., Van Wijk, A., Van den Broek, J. M., Girbes, A. R., & Tuinman, P. R. (2018). Caregivers' perceptions towards communication with mechanically ventilated patients: The results of a multicenter survey. Journal of Critical Care, 48, 263–268.",
      doi: "10.1016/j.jcrc.2018.08.036",
    },
    {
      text:
        "Khalaila, R., Zbidat, W., Anwar, K., Bayya, A., Linton, D. M., & Sviri, S. (2011). Communication difficulties and psychoemotional distress in patients receiving mechanical ventilation. American Journal of Critical Care, 20(6), 470–479.",
      doi: "10.4037/ajcc2011989",
    },
    {
      text:
        "LaValley, M., Chavers-Edgar, T., Wu, M., Schlosser, R., & Koul, R. (2024). Augmentative and Alternative Communication Interventions in Critical and Acute Care With Mechanically Ventilated and Tracheostomy Patients: A Scoping Review. American Journal of Speech-Language Pathology. Advance online publication.",
      doi: "10.1044/2024_AJSLP-23-00310",
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
  url = {https://www.ownvoice.icu},
  note = {Clinical validation study protocol}
}`;

  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    // Reset to idle after 2s so the button returns to its default label.
    setTimeout(() => setCopyState("idle"), 2000);
  }

  const buttonLabel =
    copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy";

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
          §6 &middot; References & citing this work
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
        <div style={{ position: "relative", marginTop: 8 }}>
          <pre
            style={{
              margin: 0,
              padding: 14,
              paddingRight: 80,
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
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy citation to clipboard"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontFamily: t.font,
              fontWeight: 500,
              color: t.color.text,
              background: t.color.bg,
              border: `1px solid ${t.color.border}`,
              borderRadius: t.radius - 2,
              cursor: "pointer",
            }}
          >
            {buttonLabel}
          </button>
          {/* Screen-reader-only live region: announces copy result without
              disrupting visual layout. The visible button label updates too,
              but a11y trees handle aria-live more reliably than mutated text. */}
          <span
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {copyState === "copied"
              ? "Citation copied to clipboard"
              : copyState === "error"
                ? "Copy failed"
                : ""}
          </span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 13,
            color: t.color.body,
          }}
        >
          Full bibliography:{" "}
          <a href="/bibliography" style={{ color: t.color.text }}>
            www.ownvoice.icu/bibliography
          </a>
          .
        </div>
      </div>
    </section>
  );
}
