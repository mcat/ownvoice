# OwnVoice — Applied Research Bibliography

**How evidence informs this codebase**
**Version 0.1 · April 2026**

---

## Purpose

This document traces every research reference in OwnVoice to the design decisions, clinical frameworks, and code it informs. It serves three audiences:

1. **Clinical reviewers and IRB** — to demonstrate that design choices are evidence-based, not arbitrary.
2. **Developers** — to understand *why* a constraint exists before modifying the code that implements it.
3. **Co-design partners** — to identify which elements are clinically validated (do not change without clinical guidance) and which are educated guesses awaiting validation.

References are grouped by what they inform, not by publication date.

---

## 1. Embedded Clinical Frameworks

These are validated instruments or protocols that OwnVoice implements directly. Their clinical structure should not be modified without expert guidance.

### Emoji Faces Pain Scale (Emoji-FPS)

> Li, L., Wu, S., Wang, J., et al. (2023). Development of the Emoji Faces Pain Scale and Its Validation on Mobile Devices in Adult Surgery Patients: Longitudinal Observational Study. *Journal of Medical Internet Research*, 25, e41189. [doi.org/10.2196/41189](https://doi.org/10.2196/41189)

**What it is:** A 6-face emoji pain scale at levels 0/2/4/6/8/10, validated against Wong-Baker FACES, NRS, VAS, and FPS-R in adult surgery patients (Spearman ρ 0.91–0.95). Cross-platform consistency validated across iOS, Android, Microsoft, and OpenMoji (weighted κ 0.96–0.97). Most preferred scale among study patients. Licensed CC-BY 4.0.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 6 faces at exactly 0/2/4/6/8/10 — not 0-10 continuous | `src/data/phraseRegistry.ts:212-221` — `getEmojiFPS()` returns the 6 validated levels |
| Face labels use the validated wording | `src/data/locales/en.ts:74-81` — "No hurt", "Hurts a little", ... "Hurts worst" |
| Three-step pain flow (severity → location → descriptor) | `src/components/pain/PainFlow.tsx` — guided flow with back navigation at each step |
| Severity buttons sized as critical touch targets (80px) | `src/components/pain/PainFlow.tsx:169` — `minHeight: 80` |
| Single-hue indigo ramp, not red-green | `src/theme/tokens.ts:57-70` — `painColors` array, 11 entries from `#C7D2FE` to `#3316A0` |
| Emoji faces, not custom illustrations | `src/data/phraseRegistry.ts:214-219` — uses Unicode emoji for cross-platform consistency per Li et al. |

**Validation status:** Clinically validated. Do not modify the number of faces, their numeric values, or the pairing of faces to severity levels.

---

### Serious Illness Conversation Guide (SICG)

> Bernacki, R., Paladino, J., Neville, B. A., et al. (2019). Effect of the Serious Illness Care Program in Outpatient Oncology: A Cluster Randomized Clinical Trial. *JAMA Internal Medicine*, 179(6), 751–759. [doi.org/10.1001/jamainternmed.2019.0077](https://doi.org/10.1001/jamainternmed.2019.0077)
>
> Paladino, J., Bernacki, R., Neville, B. A., et al. (2019). Evaluating an Intervention to Improve Communication Between Oncology Clinicians and Patients With Life-Limiting Cancer: A Cluster Randomized Clinical Trial of the Serious Illness Care Program. *JAMA Oncology*, 5(6), 801–809. [doi.org/10.1001/jamaoncol.2019.0292](https://doi.org/10.1001/jamaoncol.2019.0292)

**What it is:** A structured conversation framework from Ariadne Labs (Brigham and Women's Hospital / Harvard T.H. Chan School of Public Health / Dana-Farber Cancer Institute) for goals-of-care conversations. 7 EXPLORE topics. Used in over 1.8 million conversations worldwide. Clinical trials showed: more documented values conversations (89% vs. 44%), earlier conversations (5 months vs. 2.5 months before death), greater documentation of goals (61% vs. 11%), and reductions in moderate-to-severe anxiety (10.2% → 5.0%) and depression (20.8% → 10.6%). Licensed CC-BY-NC-SA 4.0.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 7 EXPLORE topics preserved in exact SICG order | `src/data/phraseRegistry.ts:270` — `WISH_IDS = ["goals", "worries", "strength", "joy", "tradeoffs", "family", "hopes"]` |
| Questions use SICG wording | `src/data/locales/en.ts:128-134` — e.g., "What are your most important goals?" |
| Response options aligned with SICG themes | `src/data/phraseRegistry.ts:282-311` — `WISH_RESPONSE_KEYS` per topic |
| Patient controls the conversation — skip any topic, any order | `src/components/wishes/MyWishes.tsx` — non-enforced progression, exit at any point |
| Provider panel includes SICG-aligned prompts | `src/data/phraseRegistry.ts:198-207` — goals-of-care category with 7 provider prompts |
| Composed wish sentences use patient-centered stems | `src/data/phraseRegistry.ts:325-349` — `composeWishSentence()` builds "What matters most to me is..." |

**Validation status:** The SICG framework structure is clinically validated. The response options (e.g., "Being with my family", "Being at peace") are adapted from palliative care literature but need co-design validation with palliative care physicians, bioethicists, and patients before clinical deployment.

#### ICU adaptations of the SICG — and the gap OwnVoice fills

> Pasricha, V., Gorman, D., Laothamatas, K., Bhardwaj, A., Ganta, N., & Mikkelsen, M. E. (2020). Use of the Serious Illness Conversation Guide to Improve Communication with Surrogates of Critically Ill Patients: A Pilot Study. *ATS Scholar*, 1(2), 119–133. [doi.org/10.34197/ats-scholar.2019-0006OC](https://doi.org/10.34197/ats-scholar.2019-0006OC) — local copy: `docs/research/icu-communication/pasricha-2020-sicg-surrogates-critically-ill-pilot.pdf`
>
> Improving Critical Care Communication with the Serious Illness Conversation Guide at an Academic Medical Center. (2025). *Journal of Pain and Symptom Management*. [jpsmjournal.com](https://www.jpsmjournal.com/article/S0885-3924(25)00589-5/fulltext)

**Why these matter:** Pasricha et al. (2020) is, to our knowledge, the first and only published ICU adaptation of the SICG. Critically, it was used with **surrogates** of mechanically ventilated patients — not the patients themselves — because the patients could not speak. The 2025 JPSM follow-up extends critical-care SICG use but again works through surrogates and clinicians. Across the broader AAC-in-ICU literature (SPEACS-2, VidaTalk, the 2016 *Critical Care* systematic review, the 2024 *AJSLP* scoping review), AAC has been studied for symptom and needs communication — never for SICG-structured goals-of-care conversations conducted directly with the patient.

**Implication for OwnVoice:** The "My Wishes" feature is, to our knowledge, the first AAC-mediated implementation of the SICG framework that lets a non-speaking patient participate **directly** in their own goals-of-care conversation, rather than having one held *about* them through a surrogate. This is the specific gap to validate in clinical study (research plan Aim 3, H3).

---

## 2. Patient Communication Needs

Research that shaped the phrase library, communication categories, and emotional vocabulary.

### Psychoemotional Distress in Mechanically Ventilated Patients

> Khalaila, R., Zbidat, W., Anwar, K., et al. (2011). Communication difficulties and psychoemotional distress in patients receiving mechanical ventilation. *American Journal of Critical Care*, 20(6), 470–479. [doi.org/10.4037/ajcc2011989](https://doi.org/10.4037/ajcc2011989)

**Finding:** Mechanically ventilated patients experience significant psychoemotional distress directly associated with communication difficulties. Distress manifests as anxiety, frustration, fear, anger, and feelings of helplessness.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Emotional categories are first-class, equal to physical needs | `src/data/phraseRegistry.ts:112-141` — "I Feel" category with Physical *and* Emotional subcategories |
| Emotional phrases include: scared, lonely, frustrated, confused, worried, embarrassed | `src/data/locales/en.ts:51-61` — 10 emotional state phrases |
| Emotional keywords trigger contextual suggestions in the sentence builder | `src/data/suggestion-trees.ts` — keyword patterns for "scared", "lonely", "confused", "frustrated", "worried", "embarrassed" |

---

### Nurse-Patient Communication in the ICU

> Happ, M. B., Garrett, K., Thomas, D. D., et al. (2011). Nurse-Patient Communication Interactions in the Intensive Care Unit. *American Journal of Critical Care*, 20(2), e28–e40. [doi.org/10.4037/ajcc2011433](https://doi.org/10.4037/ajcc2011433)
>
> Happ, M. B., Garrett, K. L., Tate, J. A., et al. (2014). Effect of a multi-level intervention on nurse-patient communication in the intensive care unit: Results of the SPEACS trial. *Heart & Lung*, 43(2), 89–98. [doi.org/10.1016/j.hrtlng.2013.11.010](https://doi.org/10.1016/j.hrtlng.2013.11.010)

**Finding:** In video-recorded usual care (2011 study), nurses initiated 86.2% of exchanges; communication was generally (>70%) successful, but more than one-third (37.7%) of exchanges about pain failed, patients rated 40% of sessions somewhat to extremely difficult, and assistive communication materials were essentially unused. The SPEACS trial (2014) showed that nurse communication-skills training plus AAC materials and speech-language pathologist consultation increased AAC use (p = .002), improved successful communication about pain (p = .03), and reduced patient-rated communication difficulty (p < .01). Patients self-rated communication ease with the Ease of Communication Scale (ECS).

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 5 phrase categories map to documented communication needs | `src/data/phraseRegistry.ts:56-163` — Quick, I Need, I Feel, Pain, Ask |
| "I Need" subcategories: Comfort, Medical, People | `src/data/phraseRegistry.ts:77-110` — maps to physical needs from SPEACS-2 |
| Two-way conversation model with provider responses | `src/components/provider/ProviderPanel.tsx` — structured provider responses |
| Conversation thread preserves exchange history across shifts | `src/stores/conversationStore.ts` — IndexedDB-backed persistent store |
| ECS planned as primary outcome measure | `docs/ownvoice-research-plan.md:149` |

---

### ICU-Talk Phrase Capture

> MacAulay, F., Judson, A., Etchels, M., Ashraf, S., Ricketts, I. W., Waller, A., Brodie, J. K., Alm, N., Warden, A., Shearer, A. J., & Gordon, B. (2002). ICU-Talk, a communication aid for intubated intensive care patients. In *Proceedings of the Fifth International ACM Conference on Assistive Technologies (Assets '02)*, 226–227. [doi.org/10.1145/638249.638290](https://doi.org/10.1145/638249.638290) — see also: *Capturing phrases for ICU-Talk* (companion paper). Local copies: `docs/research/icu-talk/`.

**Finding:** Empirical capture of the phrase vocabulary intubated ICU patients actually need, derived from observed nurse-patient interactions and pilot deployment of a computerized communication aid in an ICU. One of the earliest evidence-based ICU AAC phrase libraries.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Phrase library structured by observed ICU communication categories, not generic hospital-board content | `src/data/phraseRegistry.ts` (Quick, I Need, I Feel, Pain, Ask) — combined with SPEACS-2 categories above |
| ICU-specific vocabulary (suction, ventilator, restraints) | `src/data/locales/en.ts` |

---

### AAC Candidacy Among Mechanically Ventilated Patients

> Happ, M. B., Seaman, J. B., Nilsen, M. L., Sciulli, A., Tate, J. A., Saul, M., & Barnato, A. E. (2015). The number of mechanically ventilated ICU patients meeting communication criteria. *Heart & Lung*, 44(1), 45–49. [doi.org/10.1016/j.hrtlng.2014.08.010](https://doi.org/10.1016/j.hrtlng.2014.08.010)

**Finding:** Across 6 ICUs in 2 hospitals, 1,440 of 2,671 mechanically ventilated patients (53.9%) met basic communication criteria — defined as awake, alert, and responsive to verbal communication for at least one 12-hour nursing shift while receiving MV ≥ 2 consecutive days. The proportion ranged from 40.8% in the neurological ICU to 70.0% in the trauma ICU. This is the strongest population-specific candidacy estimate for the patient group OwnVoice serves.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Homepage problem section uses 54% as the candidacy stat for OwnVoice's specific target population (vented ICU patients) | `src/homepage/sections/TheProblem.tsx` — second stat card |
| Phase 1 inclusion criteria use the same alertness/responsiveness threshold as the screening study | `docs/ownvoice-research-plan.md` Phase 1 inclusion |

**Validation status:** Primary source for the 53.9% figure. Single multi-site study within one health system; the per-ICU range (40.8%–70.0%) suggests the underlying clinical pattern is robust to ICU type, but external validity to other US health systems and to non-US ICUs is an open question.

---

### Communication Program of Research Overview

> Happ, M. B. (2021). Giving Voice: Nurse-Patient Communication in the Intensive Care Unit. *American Journal of Critical Care*, 30(4), 256–265. [doi.org/10.4037/ajcc2021666](https://doi.org/10.4037/ajcc2021666)

**Finding:** Lecture summary of a 23-year program of research on nurse-patient communication in critical care, with explicit COVID-era framing on visitor restrictions and PPE-driven communication breakdowns. Synthesizes findings across the SPEACS, SPEACS-2, and Bedside-Patient-Provider Communication trials and positions nurse-led, multimodal AAC interventions (training + tools + assessment) as the demonstrated path to better patient communication — not tools alone.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Two-way design — provider has first-class tools, not a thin admin surface | `src/components/provider/ProviderPanel.tsx`, `src/components/provider/ListenPanel.tsx` |
| Combination intervention (tooling + structured prompts + assessment cues) shipped as a single bundle | App ships phrase library + provider prompts + pain assessment workflow + voice cloning together |
| Phase 2 outcomes include nurse-side measures, not just patient-side | `docs/ownvoice-research-plan.md` Phase 2 outcomes |

---

### Recent Scoping Review of AAC Interventions in MV/Trach Patients

> LaValley, M., Chavers-Edgar, T., Wu, M., Schlosser, R., & Koul, R. (2024). Augmentative and Alternative Communication Interventions in Critical and Acute Care With Mechanically Ventilated and Tracheostomy Patients: A Scoping Review. *American Journal of Speech-Language Pathology*, 33(5), 2667–2686. [doi.org/10.1044/2024_AJSLP-23-00310](https://doi.org/10.1044/2024_AJSLP-23-00310)

**Finding:** Maps the AAC intervention literature for mechanically ventilated and tracheostomy patients in critical and acute care. Reports small-to-large treatment effect sizes for high-tech and no-tech visual-interface interventions, and for systematic nurse-training interventions, with patient outcomes spanning anxiety reduction, communication satisfaction, comfort, symptom self-reporting, and changes in nursing practice. Concludes that high-quality AAC intervention research in this population remains scarce — most evidence is small-N, observational, or single-site.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Visual-interface as the primary modality (categorized phrase grids, pain scale, sentence builder), not text-input or speech-recognition | `src/components/phrases/PhraseGrid.tsx`; `src/components/pain/PainFlow.tsx`; `src/components/builder/SentenceBuilder.tsx` |
| Phase 2 design treats AAC adoption as a "complex intervention" — bundled tooling + provider-side prompts + clinical staff onboarding — rather than a tool-only handoff | `docs/ownvoice-research-plan.md` Phase 2 protocol |
| Patient-reported outcomes (anxiety, communication satisfaction, symptom reporting accuracy) prioritized as primary endpoints because the scoping review identifies these as where existing interventions show the most defensible effect sizes | `docs/ownvoice-research-plan.md` Phase 2 outcomes |

**Validation status:** A scoping review that synthesises the existing literature; informs design priorities and study endpoints rather than constraining specific implementation choices.

---

### Multi-Site Survey of Staff Communication Difficulty

> IJssennagger, C. E., Ten Hoorn, S., Van Wijk, A., Van den Broek, J. M., Girbes, A. R., & Tuinman, P. R. (2018). Caregivers' perceptions towards communication with mechanically ventilated patients: The results of a multicenter survey. *Journal of Critical Care*, 48, 263–268. [doi.org/10.1016/j.jcrc.2018.08.036](https://doi.org/10.1016/j.jcrc.2018.08.036)

**Finding:** Multi-site survey of ICU caregivers across 5 hospitals; 457 of 1,740 invited staff responded. Caregivers experienced communication difficulties in roughly half of all interactions with mechanically ventilated patients. Over 75% of respondents reported these difficulties harmed patient care; 43% reported a negative impact on job satisfaction, most often unfulfillment (76%) and frustration (72%). Replaces the older single-site Happ 2011 figure as the homepage's primary "staff impact" stat.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Homepage problem section uses the 75% figure as the staff-impact stat | `src/homepage/sections/TheProblem.tsx` — fourth stat card |
| Frames the design priority on provider-side tooling: communication failure isn't just a patient-experience issue, it measurably degrades the care staff can deliver | `src/components/provider/ProviderPanel.tsx`, `src/components/provider/ListenPanel.tsx` |

**Validation status:** Multi-site Dutch ICU sample; the underlying directional finding (most ICU staff say communication failures harm care) is consistent with prior single-site work going back to the SPEACS program, but US-specific replication would strengthen this.

---

### The Lived Experience of Nonverbal Ventilated Patients

> Carroll, S. M. (2007). Silent, Slow Lifeworld: The Communication Experience of Nonvocal Ventilated Patients. *Qualitative Health Research*, 17(9), 1165–1177. [doi.org/10.1177/1049732307307334](https://doi.org/10.1177/1049732307307334)

**Finding:** Ventilated patients without functional speech describe their experience as a "silent, slow lifeworld" — marked by lost agency, time distortion, difficulty initiating communication, and emotional isolation. Patients reported that the inability to express emotions was as distressing as the inability to report physical symptoms.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| First-person phrasing — "I need water", not "Patient requests water" | `src/data/locales/en.ts` — all phrases use first person |
| Time-of-day contextual suggestions address time disorientation | `src/data/suggestion-trees.ts:420-437` — nighttime, morning, and daytime suggestion reranking |
| Emotional phrases as prominent as physical phrases | `src/data/phraseRegistry.ts:112-141` — "I Feel" is a top-level tab, not buried |
| Tap-to-repeat on conversation thread | `src/components/conversation/Thread.tsx:31-35` — patient can re-speak without re-navigating |

---

### AAC Needs in Hospital Settings

> Zubow, L., & Hurtig, R. (2013). A Demographic Study of AAC/AT Needs in Hospitalized Patients. *Perspectives on Augmentative and Alternative Communication*, 22(2), 79–90. [doi.org/10.1044/aac22.2.79](https://doi.org/10.1044/aac22.2.79)

**Finding:** Surveyed AAC needs across a large university hospital. Identified that the most common communication needs were: pain reporting, basic needs (water, bathroom, repositioning), emotional expression, and questions about care timeline. Also documented the demographic diversity of patients needing AAC, supporting the case for multilingual support.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Phrase categories prioritize pain, basic needs, emotional expression, and questions | `src/data/phraseRegistry.ts:56-163` — 5 categories with these exact priorities |
| 13-language support planned | `docs/PRD.md` — multilingual phrase architecture |
| Locale-driven phrase registry for i18n | `src/data/phraseRegistry.ts:33-45` — all phrases resolved via `t(key, locale)` |

---

### iPad-Based AAC in Critically Ill Patients

> Dind, A. J., Starr, J. S., & Arora, S. (2021). iPad-based Apps to Facilitate Communication in Critically Ill Patients with Impaired Ability to Communicate: A Preclinical Analysis. *Indian Journal of Critical Care Medicine*, 25(11), 1232–1240. [doi.org/10.5005/jp-journals-10071-24019](https://doi.org/10.5005/jp-journals-10071-24019)

**Findings:**

- Physical access to the device is a primary barrier to AAC adoption in ICUs. Up to 90% of communication-impaired ICU patients report extreme distress. Inadequate communication can impair symptom identification and reduce patient participation in care decisions.
- **Competitor landscape.** The paper conducts a head-to-head preclinical evaluation of nine iPad-based ICU communication apps, including VidaTalk, CommuniCare ICU, and YoDoc. All three are static phrase boards: pre-translated content played back via either pre-recorded human audio (VidaTalk) or device-level text-to-speech for typed input (YoDoc, CommuniCare). None offer voice cloning, on-device language models for contextual sentence suggestion, or neural speech-to-text. Multilingual support is achieved through human-translated phrase libraries, not AI translation. Local copy: `docs/research/icu-communication/dind-2021-ipad-based-apps-to-facilitate-communication-in-cri.pdf`.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Bottom tab bar navigation — reachable from supine position | `src/components/layout/TabBar.tsx` — fixed bottom navigation |
| 64px minimum touch targets for all patient-facing buttons | `src/app.css:59` — `--size-target: 64px` |
| Emotional expression treated as clinical need, not secondary feature | `src/data/phraseRegistry.ts:112-141` — "I Feel" category |
| No dead ends — every screen has navigation | `src/components/layout/TabBar.tsx` — always visible |
| Competitive positioning — OwnVoice as AI-native AAC vs. static phrase boards | `docs/ownvoice-research-plan.md` §2.1; `src/homepage/sections/CommercialOpportunity.tsx` — "Differentiation" block |

---

### ICU Communication Challenges

> Freeman-Sanderson, A., Morris, K., & Elkins, M. (2019). Characteristics of patient communication and prevalence of communication difficulty in the intensive care unit: An observational study. *Australian Critical Care*, 32(5), 373–377. [doi.org/10.1016/j.aucc.2018.09.002](https://doi.org/10.1016/j.aucc.2018.09.002)

**Finding:** A ten-weekday multidisciplinary ward audit (87 patients, 232 occupied bed-days) in a 30-bed Australian tertiary ICU. Staff reported difficulty communicating with patients on 35% of bed-days, and on 49% of those days communication was not possible at all; altered cognition was present on 11% of bed-days. Alternate communication modes (gesture most common) were reported but not used with all suitable patients. Patients from non-English-speaking backgrounds made up 14% of the cohort.

**Where it's applied:** Informs the overall product rationale documented in `docs/PRD.md:17-28` — the "Problem" section.

---

## 3. Motor Impairment and Touch Interaction

Research that shaped touch target sizes, debouncing, and interaction model.

### Motor-Impaired Touchscreen Interaction

> Naftali, M., & Findlater, L. (2014). Accessibility in Context: Understanding the Truly Mobile Experience of Smartphone Users with Motor Impairments. *Proceedings of the 16th International ACM SIGACCESS Conference on Computers & Accessibility (ASSETS '14)*, 209–216. [doi.org/10.1145/2661334.2661372](https://doi.org/10.1145/2661334.2661372)
>
> Krishna Vajjala, A., Mansur, S. M., Jose, J., Vendome, C., & Moran, K. (2024). MotorEase: Automated Detection of Motor Impairment Accessibility Issues in Mobile App UIs. *Proceedings of the IEEE/ACM 46th International Conference on Software Engineering (ICSE 2024)*, 1–13. [doi.org/10.1145/3597503.3639167](https://doi.org/10.1145/3597503.3639167) (preprint: [arXiv:2403.13690](https://arxiv.org/abs/2403.13690))

**Finding:** Tap drift of 10–20mm from intended targets is common in motor-impaired users. Complex gestures (double-tap, long-press, swipe, pinch) are primary barriers for users with limited motor control.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 64px (17mm) minimum touch targets | `src/app.css:59` — `--size-target: 64px` |
| 80px touch targets for critical actions (pain scale, help) | `src/app.css:60` — `--size-target-critical: 80px`; `PainFlow.tsx:169` |
| 12px minimum spacing between targets | `src/app.css:61` — `--spacing-target-gap: 12px` |
| 300ms debounce to prevent tremor double-fires | `src/components/shared/Btn.tsx:13-30` — ref-based lockout on every button |
| Single-tap only — no complex gestures in patient interface | `src/components/shared/Btn.tsx` — all interactions are single `onClick` |
| No slider controls — discrete tap targets for pain scale | `src/components/pain/PainFlow.tsx:159-200` — 6 individual buttons, not a slider |

---

### ICU-Acquired Weakness

> Appleton, R. T., Kinsella, J., & Quasim, T. (2015). The incidence of intensive care unit-acquired weakness syndromes: A systematic review. *Journal of the Intensive Care Society*, 16(2), 126–136. [doi.org/10.1177/1751143714563016](https://doi.org/10.1177/1751143714563016)

**Finding:** ICU-acquired weakness affects up to 80% of mechanically ventilated patients, causing reduced grip strength, impaired fine motor control, and exhaustion from sustained arm elevation.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Content gravity in lower two-thirds of screen | `src/components/layout/TabBar.tsx` — bottom tab bar; phrase grids in main content area |
| No sustained touch interactions | `src/components/shared/Btn.tsx` — single tap only |
| Generous button sizing exceeds standard mobile guidelines | Touch targets throughout components: 64px minimum, 80px for critical |

---

### AAC Physical Access

> Beukelman, D.R. & Light, J.C. (2020). *Augmentative & Alternative Communication*, 5th ed. Paul H. Brookes Publishing.

**Finding:** The foundational AAC textbook. Documents that users with physical impairments may use fingers, knuckles, toes, styluses, mouth sticks, head tracking, eye gaze, or switches. Recommends positioning devices at an angle and notes that screen angle significantly affects independent access. Photorealistic images are easier to comprehend than stylized symbols for patients with cognitive impairment.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| All touch targets work with single point of contact | `src/components/shared/Btn.tsx` — no multi-touch or pressure sensitivity |
| iPadOS Switch Control and AssistiveTouch compatibility planned | `docs/DESIGN_GUIDELINES.md:237-248` — Accessibility Tiers 3-5 |
| Icons accompany text, not replace it | `src/components/phrases/PhraseButton.tsx` — icon + label in every button |

---

## 4. Cognitive and Sedation Considerations

Research that shaped cognitive load limits, external memory features, and interface simplicity.

### PADIS Clinical Practice Guidelines

> Devlin, J. W., Skrobik, Y., Gélinas, C., et al. (2018). Clinical Practice Guidelines for the Prevention and Management of Pain, Agitation/Sedation, Delirium, Immobility, and Sleep Disruption in Adult Patients in the ICU. *Critical Care Medicine*, 46(9), e825–e873. [doi.org/10.1097/CCM.0000000000003299](https://doi.org/10.1097/CCM.0000000000003299)

**Finding:** The PADIS guidelines document that even light sedation slows processing speed, reduces attention span, and impairs decision-making. Sleep disruption joins pain, agitation, and delirium as a distinct clinical concern.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Maximum 12 phrase buttons visible at once | `src/components/phrases/PhraseGrid.tsx` — renders 6-9 phrases per category view |
| Progressive disclosure: tab → subcategory → phrase | `src/components/phrases/SubcategoryChips.tsx` — chip navigation within categories |
| Maximum 3 taps to any phrase | Tab bar → optional subcategory → phrase button |
| Time-of-day aware suggestions (night = sleep and pain focus) | `src/data/suggestion-trees.ts:421-428` — nighttime reranking |
| No modes that change button behavior | Every `Btn` in patient interface always does the same thing on tap |

---

### ICU Delirium

> Ely, E. W., Shintani, A., Truman, B., et al. (2004). Delirium as a Predictor of Mortality in Mechanically Ventilated Patients in the Intensive Care Unit. *JAMA*, 291(14), 1753–1762. [doi.org/10.1001/jama.291.14.1753](https://doi.org/10.1001/jama.291.14.1753)
>
> Girard, T. D., Kress, J. P., Fuchs, B. D., et al. (2008). Efficacy and safety of a paired sedation and ventilator weaning protocol for mechanically ventilated patients in intensive care (Awakening and Breathing Controlled trial): a randomised controlled trial. *The Lancet*, 371(9607), 126–134. [doi.org/10.1016/S0140-6736(08)60105-1](https://doi.org/10.1016/S0140-6736(08)60105-1)

**Finding:** Delirium occurs in 60–80% of mechanically ventilated ICU patients. Causes fluctuating attention, disorganized thinking, and altered consciousness. A patient may be lucid one moment and confused the next. Sensory deprivation and isolation are precipitating factors.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Conversation thread as external memory | `src/components/conversation/Thread.tsx` — visible, scrollable history |
| Persistent conversation store survives page reloads | `src/stores/conversationStore.ts` — IndexedDB-backed with Zustand persist |
| No hidden navigation — everything visible | `src/components/layout/TabBar.tsx` — always-visible tabs |
| Icons must be concrete, not abstract | `src/data/phraseRegistry.ts` — emoji icons paired with explicit text labels |
| Interface usable at patient's worst cognitive moment | Design principle: no modes, no memory burden, no hidden state |

---

## 5. Environmental Factors

### ICU Sound Levels

> Darbyshire, J. L., & Young, J. D. (2013). An investigation of sound levels on intensive care units with reference to the WHO guidelines. *Critical Care*, 17(5), R187. [doi.org/10.1186/cc12870](https://doi.org/10.1186/cc12870)

**Finding:** ICU baseline ambient noise levels typically range from 50–75 dB, with alarm peaks reaching 80–90 dB. Alarm peaks routinely exceed the WHO guideline of 35 dB for patient areas.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Visual confirmation accompanies every utterance | `src/components/shared/Speaking.tsx` — visual overlay with speaker name, text, and animated progress bar |
| Volume must be adjustable and sufficient for ICU noise | Speaker and conversation design accounts for noisy environments |

---

### Alarm Fatigue

> Ruskin, K. J., & Hueske-Kraus, D. (2015). Alarm fatigue: impacts on patient safety. *Current Opinion in Anaesthesiology*, 28(6), 685–690. [doi.org/10.1097/ACO.0000000000000260](https://doi.org/10.1097/ACO.0000000000000260)

**Finding:** Alarm fatigue drives clinicians to override 93–96% of clinical alarms. Audio signals from non-clinical devices should not resemble clinical alarms.

**Where it's applied:** No alarm-like sounds in OwnVoice. Audio output is speech only, distinguishable from clinical monitoring equipment.

---

## 6. Accessibility Standards

### WCAG 2.1

> W3C. Web Content Accessibility Guidelines (WCAG) 2.1. [w3.org/TR/WCAG21](https://www.w3.org/TR/WCAG21/)

**Where it's applied:**

| Criterion | Implementation |
|---|---|
| SC 1.4.3 — Contrast minimum 4.5:1 (AA) | `src/theme/tokens.ts:9-39` — every color token annotated with verified contrast ratio |
| SC 1.4.6 — Enhanced contrast target 7:1 (AAA) | `src/theme/tokens.ts` — most text tokens exceed 7:1 |
| SC 1.4.1 — Color not sole differentiator | Patient/provider messages differ by position, speaker label, and color |
| SC 1.4.4 — 200% text scaling without overflow | Font sizes use relative units; minimum 18px body text |

---

### Healthcare App Accessibility

> Boundev. (2026). Healthcare App Accessibility and WCAG Compliance Guide. [boundev.com/blog](https://boundev.com/blog)

**Finding:** Recommends touch targets of at least 48×48dp with 8dp spacing for motor-impaired and elderly users.

**Where it's applied:** OwnVoice exceeds this baseline — 64px minimum targets with 12px spacing — to account for the compounding impairments of acute illness (`src/app.css:59-61`).

---

### Atkinson Hyperlegible

> Braille Institute. Atkinson Hyperlegible Font. [brailleinstitute.org/freefont](https://www.brailleinstitute.org/freefont/)

**What it is:** A typeface designed specifically for low-vision readability. Characters like I/l/1, O/0, and rn/m are visually distinct. Free and open-source.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Patient-facing font | `src/app.css:4-18` — `@font-face` for Atkinson Hyperlegible Next at weights 400 and 700 |
| CSS custom property | `src/app.css:56` — `--font-sans: "Atkinson Hyperlegible Next", system-ui, sans-serif` |
| Font files bundled for offline use | `public/fonts/atkinson-next-400.ttf`, `public/fonts/atkinson-next-700.ttf` |

---

## 7. Design Methodology

### Health Design Thinking

> Ku, B., & Lupton, E. (2022). *Health Design Thinking: Creating Products and Services for Better Health*, 2nd ed. MIT Press / Cooper Hewitt, Smithsonian Design Museum. [doi.org/10.7551/mitpress/14494.001.0001](https://doi.org/10.7551/mitpress/14494.001.0001)

**Finding:** Articulates the "hard to use wrong" principle (from the Firefly phototherapy device case study). Emphasizes co-design over pure empathy — patients are experts on their own condition. Warns against infantilizing adult patients. Treats narrative as central to health design.

**Where it's applied:**

| Principle | Implementation |
|---|---|
| "Hard to use wrong" — no wrong tap, no wrong sequence, no wrong state | Every `Btn` tap speaks immediately; no modes, no confirmation dialogs for phrases |
| No destructive actions in patient interface | Settings/reset behind provider PIN gate — `src/components/shared/PinGate.tsx` |
| No infantilization — no "Great job!" praise language | Phrase language uses adult-appropriate, first-person wording throughout `src/data/locales/en.ts` |
| Co-design requirement | `docs/DESIGN_GUIDELINES.md:326-335` — documented mandate for patient and nurse co-design partners |

---

### Usability Heuristics

> Nielsen, J. (1994). 10 Usability Heuristics for User Interface Design. Nielsen Norman Group. [nngroup.com/articles/ten-usability-heuristics/](https://www.nngroup.com/articles/ten-usability-heuristics/)

**Finding:** Recognition over recall — minimize the user's memory load by making objects, actions, and options visible.

**Where it's applied:**

| Heuristic | Implementation |
|---|---|
| Recognition over recall | All phrase options visible; no hamburger menus; tab bar always present |
| Visibility of system status | `src/components/shared/Speaking.tsx` — visual speaking indicator; PainFlow progress breadcrumb |
| User control and freedom | Back button in PainFlow; undo/clear in SentenceBuilder; tab bar always accessible |

---

## 8. Research Plan Instruments

These instruments are referenced for the planned clinical validation study, not implemented in the app itself.

> Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & A. L. McClelland (Eds.), *Usability Evaluation in Industry* (pp. 189–194). Taylor & Francis. [doi.org/10.1201/9781498710411-35](https://doi.org/10.1201/9781498710411-35)

Used in Phase 2 evaluation — administered to nurses at end of study participation.

> Braun, V., & Clarke, V. (2019). Reflecting on reflexive thematic analysis. *Qualitative Research in Sport, Exercise and Health*, 11(4), 589–597. [doi.org/10.1080/2159676X.2019.1628806](https://doi.org/10.1080/2159676X.2019.1628806)

Methodology for qualitative analysis of interview data in the research plan.

---

## 9. Voice Cloning Reference Audio

Research informing the recording-capture UX: what the patient sees while we capture 15 seconds of audio for speaker-embedding extraction.

### The Rainbow Passage

> Fairbanks, G. (1960). *Voice and Articulation Drillbook*, 2nd ed. Harper & Row. (Rainbow Passage pp. 124–139.)

**What it is:** A ~330-word paragraph engineered for proportional English phoneme coverage. The opening two sentences — *"When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors."* — run approximately 12–15 seconds at conversational pace and cover a representative distribution of English phonemes, including most vowels and consonant clusters.

**Why it's the default recording script:** The Rainbow Passage is the canonical reference passage in the VCTK Corpus (Veaux et al., 2019) — the most widely used multi-speaker TTS training corpus — and in decades of speech-science research. For a 15-second recording budget, no free-form speech sample reliably matches its phonetic balance.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| English-locale voice capture shows the Rainbow Passage opening as a scripted read | `src/data/recordingScripts.ts` — `english.passage` |
| Patient reads aloud; the embedding captures their full phonetic and prosodic range | `src/components/shared/VoiceCapture.tsx` — recording-state render |
| Pre-recording orientation sequence (intro → breathing → "Ready" → 5-4-3-2-1) runs before the 15 s capture begins, so the clock doesn't start until the patient is settled | `VoiceCapture.tsx` — `COUNTDOWN_TIMELINE`; `beginCountdownTimeline()` |
| Soft sine-wave tones (not speech) mark each beat with long fade envelopes to avoid startle | `VoiceCapture.tsx` — `playTone()` |
| Messages fade in / hold / fade out rather than hard cutting | `src/app.css` — `@keyframes voiceCoachFade` |
| Closing cue appears only in the final 3 s of the capture; middle stays quiet | `VoiceCapture.tsx` — recording-state `coaching` logic |
| Non-English locales fall back to free-speak coaching until a native-speaker-reviewed passage is added | `src/data/recordingScripts.ts` — `freeSpeakFallback` |

**Validation status:** The *use* of the Rainbow Passage is well-validated for English phonetic balance in speech research. Its *efficacy specifically for Chatterbox Multilingual embedding quality* in an ICU recording context is an educated prediction — see §4 below. Co-design target: native-speaker-reviewed balanced passages for each of the other 22 Chatterbox-supported languages.

---

### Zero-Shot Voice Cloning and Reference-Audio Requirements

> Casanova, E., Weber, J., Shulby, C. D., Junior, A. C., Gölge, E., & Ponti, M. A. (2022). YourTTS: Towards Zero-Shot Multi-Speaker TTS and Zero-Shot Voice Conversion for Everyone. *Proceedings of the 39th International Conference on Machine Learning (ICML 2022)*. [arxiv.org/abs/2112.02418](https://arxiv.org/abs/2112.02418)
>
> Wang, C., Chen, S., Wu, Y., Zhang, Z., Zhou, L., Liu, S., et al. (2023). Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers (VALL-E). *arXiv preprint*. [arxiv.org/abs/2301.02111](https://arxiv.org/abs/2301.02111) (journal version: [doi.org/10.1109/TASLPRO.2025.3530270](https://doi.org/10.1109/TASLPRO.2025.3530270))
>
> Coqui AI. XTTS-v2 model card and documentation. [huggingface.co/coqui/XTTS-v2](https://huggingface.co/coqui/XTTS-v2)
>
> Veaux, C., Yamagishi, J., & MacDonald, K. (2019). CSTR VCTK Corpus: English Multi-speaker Corpus for CSTR Voice Cloning Toolkit (version 0.92). University of Edinburgh, Centre for Speech Technology Research. [doi.org/10.7488/ds/2645](https://doi.org/10.7488/ds/2645)

**Finding:** Across the zero-shot voice-cloning literature and community documentation, there is convergent guidance on reference audio:

- **10–15 seconds is the consensus sweet spot.** Quality improves up to roughly 20 seconds then plateaus; samples under 3 seconds produce noticeably degraded embeddings (NVIDIA NIM Voice Cloning docs).
- **Phonetic diversity matters more than length.** Speaker encoders average spectral envelope, pitch statistics, and formant structure across the clip — diverse phonemes exercise different vocal-tract configurations.
- **Prosodic variety improves pitch-range capture.** Including a question alongside statements exercises both declarative and interrogative intonation, which is reflected in the embedding's F0 statistics.
- **Avoid:** whispered or breathy speech (distorts formants), monotone reading (under-estimates F0 variance), background noise and reverb (contaminate the embedding), multiple speakers, shouting, and clips over 30 seconds (diminishing returns and posture drift).

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 15-second recording budget | `src/components/shared/VoiceCapture.tsx` — `RECORD_DURATION = 15` |
| Scripted read (phonetically balanced, prosodically varied) preferred over free-form speech | `src/data/recordingScripts.ts` |
| Contraindication guidance communicated via warm, non-alarming UI (no red) | `VoiceCapture.tsx` — amber palette for recording state |
| Microphone-noise prevention handled at capture (single-speaker, clean audio assumed) | `src/hooks/useMicrophone.ts`; Web Audio post-processing in `src/speak.ts` |

---

### Chatterbox Multilingual Speaker Encoder (CAMPPlus)

> Wang, H., Zheng, S., Chen, Y., Cheng, L., & Chen, Q. (2023). CAM++: A Fast and Efficient Network for Speaker Verification Using Context-Aware Masking. *Proceedings of Interspeech 2023*, 5301–5305. [doi.org/10.21437/Interspeech.2023-1513](https://doi.org/10.21437/Interspeech.2023-1513)
>
> Resemble AI. Chatterbox Multilingual. <https://huggingface.co/ResembleAI/chatterbox-multilingual>
>
> Resemble AI. Zero-Shot Voice Cloning Guide. <https://www.resemble.ai/zero-shot-voice-cloning-guide/>

**Finding:** Chatterbox Multilingual's speaker representation is a 192-dimensional x-vector produced by the CAMPPlus encoder (a variant of CAM++) — the same encoder family used by the original English-only Chatterbox model. This is a *statistical* embedding: it summarizes the reference speaker's spectral and prosodic characteristics into a fixed-size vector, which the synthesis model then conditions on. It is **not** an in-context-learning prompt, so what the patient says directly shapes what the clone *can* sound like.

Resemble AI's product page suggests 5 seconds minimum; community guidance converges on 10–30 seconds with 10–15 seconds optimal. No official Resemble script is published.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 15-second recording budget chosen within the published 10–30s community range | `VoiceCapture.tsx` — `RECORD_DURATION = 15` |
| Scripted read chosen to exploit the "statistical embedding" property (patient's full range captured in one pass) | `src/data/recordingScripts.ts`; `docs/PRD.md` §6.1 |
| Embedding stored as `speakerData` in the settings store, never transmitted | `src/stores/settingsStore.ts` — on-device only |

**Validation status:** The model architecture facts (192-dim, CAMPPlus, statistical averaging) are from Resemble's published materials and the CAM++ paper. The specific claim that the Rainbow Passage produces a *measurably better* Chatterbox Multilingual embedding than 15 seconds of free speech for the same patient is an educated prediction — consistent with decades of speech-science research but not specifically benchmarked against this model. A Phase 2 study could quantify this via MOS comparison.

---

## 10. Elements Awaiting Validation

The following elements are informed by the research above but have not been independently validated. They are marked as co-design targets.

| Element | Current basis | Validation needed |
|---|---|---|
| Phrase library content (which specific phrases) | Clinical literature + team judgment | Co-design with patients, nurses, SLPs |
| Sentence builder keyword patterns (28 medical/emotional categories) | Derived from clinical communication literature | Phase 1 usage frequency data |
| Sentence builder suggestion tree depth and paths | Team judgment | Phase 1 interaction logs |
| Response options for SICG wish topics | Adapted from palliative care literature | Co-design with palliative care physicians and bioethicists |
| Subcategory organization (Comfort/Medical/People, Physical/Emotional) | Clinical grouping conventions | Card sorting with patients and nurses |
| Time-of-day suggestion reranking weights | Assumed from clinical schedules | Phase 1 time-series usage data |
| Cultural adaptation of emotional vocabulary | English-only prototype | Multilingual co-design per community |
| Provider phrase library content | Clinical communication patterns | Co-design with nurses, physicians, RTs |

---

## License Summary

| Framework | License | Constraint |
|---|---|---|
| Emoji-FPS (Li et al.) | CC-BY 4.0 | Attribution required |
| SICG (Ariadne Labs) | CC-BY-NC-SA 4.0 | Attribution, non-commercial, share-alike |
| Atkinson Hyperlegible | SIL Open Font License | Free to use, attribution appreciated |
| WCAG 2.1 | W3C Document License | Open standard |

---

## 11. Language Prevalence in ICU Populations

This section informs which locales OwnVoice prioritises for translation. Full working brief with data-gap notes and regional breakdowns is preserved in `docs/superpowers/specs/2026-04-22-localization-design.md` Appendix B; citations below are reproduced in the project's canonical format.

### US LEP baseline

Approximately 25.7 million US residents (8% of population aged 5+) have limited English proficiency. The top five LEP languages nationally are Spanish (63%), Chinese (7%), Vietnamese (3%), Arabic (2%), Tagalog (2%) — covering ~77% of US LEP. All five are present in OwnVoice's 13-language list.

> Kaiser Family Foundation. (2024). *Overview of health coverage and care for individuals with limited English proficiency (LEP).* KFF Issue Brief.

> U.S. Census Bureau. (2023). Press release on English proficiency. American Community Survey 5-year estimates, 2018–2022.

### Hospital-interpreter operational data (ranks healthcare encounters, not just population)

AMN Healthcare's 2023 study of 204 million minutes of interpretation services across US healthcare facilities ranks the most-requested non-English languages as: Spanish, Mandarin, Cantonese, Vietnamese, Arabic, **Haitian Creole**, Russian, Portuguese, Korean. Additional high-demand: Nepali, Somali, Ukrainian, Hmong, Amharic, Rohingya.

> AMN Healthcare. (2023). *AMN Healthcare study tracks 45 languages spoken in patient/provider encounters in U.S.* Press release, November 14, 2023.

### ICU-specific evidence

The only US multi-patient ICU language study identified is Barwise et al. (2018) at Mayo Clinic — 779 LEP ICU admissions out of 27,523 total. Distribution: Arabic 26.4%, Spanish 26.3%, **Somali 8.7%**, Cambodian 4.4%, Vietnamese 2.8%, Lao 2.6%, **Hmong 2.4%**. LEP patients had 0.6-day longer ICU stays and 2.7-day longer hospital stays (p<.001). The sample is single-site and reflects local refugee populations; it's the best evidence that ICU linguistic profiles diverge from the general LEP census.

> Barwise, A. K., Jaramillo, C., Novotny, P., et al. (2018). Differences in Code Status and End-of-Life Decision Making in Patients With Limited English Proficiency in the Intensive Care Unit. *Mayo Clinic Proceedings*, 93(9), 1271–1281. [doi.org/10.1016/j.mayocp.2018.04.021](https://doi.org/10.1016/j.mayocp.2018.04.021)

> Barwise, A. K., Nyquist, C. A., Espinoza Suarez, N. R., et al. (2019). End-of-Life Decision-Making for ICU Patients With Limited English Proficiency: A Qualitative Study of Healthcare Team Insights. *Critical Care Medicine*, 47(10), 1380–1387. [doi.org/10.1097/CCM.0000000000003920](https://doi.org/10.1097/CCM.0000000000003920)

### Policy context

The Joint Commission's 2026 National Performance Goals require US hospitals to stratify safety data (readmissions, falls, medication errors, length of stay) by preferred language. HCAHPS surveys are administered in English, Spanish, Chinese, Russian, Vietnamese, Portuguese, German, Tagalog, and Arabic.

> Joint Commission. (2026). *Language access and interpreter services — understanding the requirements.* Standards FAQ.

> CMS. (2025). *HCAHPS: Patients' perspectives of care survey.* [hcahpsonline.org](https://hcahpsonline.org/)

### Supporting reviews

> Twersky, S. E., Jefferson, R., Garcia-Ortiz, L., et al. (2024). The Impact of Limited English Proficiency on Healthcare Access and Outcomes in the U.S.: A Scoping Review. *Healthcare*, 12(3), 364. [doi.org/10.3390/healthcare12030364](https://doi.org/10.3390/healthcare12030364)

> Sliwinski, K., Kutney-Lee, A., McHugh, M. D., & Lasater, K. B. (2024). A Review of Disparities in Outcomes of Hospitalized Patients with Limited English Proficiency: The Importance of Nursing Resources. *Journal of Health Care for the Poor and Underserved*, 35(1), 359–374. [doi.org/10.1353/hpu.2024.a919823](https://doi.org/10.1353/hpu.2024.a919823)

> Lehman, R., & Moriarty, H. (2024). Limited English Proficiency and Outcomes in the Intensive Care Unit: An Integrated Review. *Journal of Transcultural Nursing*, 35(3), 226–236. [doi.org/10.1177/10436596241229485](https://doi.org/10.1177/10436596241229485)

### Evidence-informed roadmap priorities

The current 13-language list covers ~77% of US LEP by population. Gap analysis against ICU-specific evidence identifies three languages absent from the current list but strongly supported by US ICU data:

| Add next | Evidence | Chatterbox-native? | OwnVoice path |
|---|---|---|---|
| Haitian Creole (`ht`) | Top-6 US healthcare per AMN 2023; critical in FL and NY | No | Web Speech fallback |
| Somali (`so`) | 8.7% of Mayo ICU LEP cohort; concentrated in MN/OH/ME | No | Web Speech fallback |
| Hmong (`hmn`) | 2.4% of Mayo ICU LEP cohort; concentrated in WI/MN | No | Web Speech fallback |

Two low-cost additions for international pilots (both Chatterbox-native, no new fallback plumbing needed): **Polish** (UK NHS, Germany) and **Turkish** (Germany, Australia).

### Data gaps

No multi-site US ICU language census exists; Mayo (Barwise 2018) is the only peer-reviewed ICU-specific prevalence source. HCAHPS collects preferred language but CMS does not release national distributions. Joint Commission language-stratified quality requirements are new in 2026 — aggregate findings not yet published. Global ICU language data outside the US is extremely sparse.
