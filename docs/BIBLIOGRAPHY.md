# OwnVoice — Applied Research Bibliography

**How evidence informs this codebase**
**Version 0.1 · April 2026**

---

## Purpose

This document traces every research reference used in OwnVoice to the specific design decisions, clinical frameworks, and code that it informs. It serves three audiences:

1. **Clinical reviewers and IRB** — to demonstrate that design choices are evidence-based, not arbitrary.
2. **Developers** — to understand *why* a constraint exists before modifying the code that implements it.
3. **Co-design partners** — to identify which elements are clinically validated (do not change without clinical guidance) and which are educated guesses awaiting validation.

References are grouped by what they inform, not by publication date.

---

## 1. Embedded Clinical Frameworks

These are validated instruments or protocols that OwnVoice implements directly. Their clinical structure should not be modified without expert guidance.

### Emoji Faces Pain Scale (Emoji-FPS)

> Li, L., et al. (2023). Development of the Emoji Faces Pain Scale and its validation on mobile devices in adult surgery patients. *Journal of Medical Internet Research*, 25, e41189.

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

> Bernacki, R., et al. (2019). Effect of a Serious Illness Communication Program on surrogate decision-making. *JAMA Internal Medicine*, 179(10), 1334–1341.
>
> Paladino, J., et al. (2019). Patient and clinician experience of a serious illness conversation guide. *Annals of Internal Medicine*, 170(10), 681–688.

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

---

## 2. Patient Communication Needs

Research that shaped the phrase library, communication categories, and emotional vocabulary.

### Psychoemotional Distress in Mechanically Ventilated Patients

> Khalaila, R., et al. (2011). Communication difficulties and psychoemotional distress in patients receiving mechanical ventilation. *American Journal of Critical Care*, 20(6), 470–479.

**Finding:** Mechanically ventilated patients experience significant psychoemotional distress directly associated with communication difficulties. Distress manifests as anxiety, frustration, fear, anger, and feelings of helplessness.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Emotional categories are first-class, equal to physical needs | `src/data/phraseRegistry.ts:112-141` — "I Feel" category with Physical *and* Emotional subcategories |
| Emotional phrases include: scared, lonely, frustrated, confused, worried, embarrassed | `src/data/locales/en.ts:51-61` — 10 emotional state phrases |
| Emotional keywords trigger contextual suggestions in the sentence builder | `src/data/suggestion-trees.ts` — keyword patterns for "scared", "lonely", "confused", "frustrated", "worried", "embarrassed" |

---

### Nurse-Patient Communication in the ICU

> Happ, M. B., et al. (2011). Nurse-patient communication interactions in the ICU. *American Journal of Critical Care*, 20(2), e28–e40.
>
> Happ, M. B., et al. (2014). Effect of a multi-level intervention on nurse-patient communication in the ICU: Results of the SPEACS-2 trial. *Heart & Lung*, 43(2), 89–98.

**Finding:** SPEACS-2 identified frequency categories of nurse-patient ICU communication: pain reporting, physical needs (water, repositioning, bathroom), emotional expression, and questions about care plans. Communication attempts were often unsuccessful due to tool limitations. The study developed the Communication Satisfaction Rating Instrument (CSRI) for nonverbal ICU patients.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| 5 phrase categories map to documented communication needs | `src/data/phraseRegistry.ts:56-163` — Quick, I Need, I Feel, Pain, Ask |
| "I Need" subcategories: Comfort, Medical, People | `src/data/phraseRegistry.ts:77-110` — maps to physical needs from SPEACS-2 |
| Two-way conversation model with provider responses | `src/components/provider/ProviderPanel.tsx` — structured provider responses |
| Conversation thread preserves exchange history across shifts | `src/stores/conversationStore.ts` — IndexedDB-backed persistent store |
| CSRI planned as primary outcome measure | `docs/ownvoice-research-plan.md:149` |

---

### The Lived Experience of Nonverbal Ventilated Patients

> Carroll, S. M. (2007). Silent, slow lifeworld: The communication experience of nonvocal ventilated patients. *Qualitative Health Research*, 17(9), 1165–1177.

**Finding:** Nonverbal ventilated patients describe their experience as a "silent, slow lifeworld" — marked by lost agency, time distortion, difficulty initiating communication, and emotional isolation. Patients reported that the inability to express emotions was as distressing as the inability to report physical symptoms.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| First-person phrasing — "I need water", not "Patient requests water" | `src/data/locales/en.ts` — all phrases use first person |
| Time-of-day contextual suggestions address time disorientation | `src/data/suggestion-trees.ts:420-437` — nighttime, morning, and daytime suggestion reranking |
| Emotional phrases as prominent as physical phrases | `src/data/phraseRegistry.ts:112-141` — "I Feel" is a top-level tab, not buried |
| Tap-to-repeat on conversation thread | `src/components/conversation/Thread.tsx:31-35` — patient can re-speak without re-navigating |

---

### AAC Needs in Hospital Settings

> Zubow, L., & Hurtig, R. (2013). A demographic study of AAC/AT needs in a large university hospital. *Perspectives on Augmentative and Alternative Communication*, 22(2), 79–86.

**Finding:** Surveyed AAC needs across a large university hospital. Identified that the most common communication needs were: pain reporting, basic needs (water, bathroom, repositioning), emotional expression, and questions about care timeline. Also documented the demographic diversity of patients needing AAC, supporting the case for multilingual support.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Phrase categories prioritize pain, basic needs, emotional expression, and questions | `src/data/phraseRegistry.ts:56-163` — 5 categories with these exact priorities |
| 13-language support planned | `docs/PRD.md` — multilingual phrase architecture |
| Locale-driven phrase registry for i18n | `src/data/phraseRegistry.ts:33-45` — all phrases resolved via `t(key, locale)` |

---

### iPad-Based AAC in Critically Ill Patients

> Dind, A.J., Starr, J.S., & Arora, S. (2021). iPad-based Apps to Facilitate Communication in Critically Ill Patients with Impaired Ability to Communicate: A Preclinical Analysis. *Indian Journal of Critical Care Medicine*, 25(11), 1232–1240.

**Finding:** Physical access to the device is a primary barrier to AAC adoption in ICUs. Up to 90% of communication-impaired ICU patients report extreme distress. Inadequate communication may result in impaired symptom identification and reduced participation in care decisions.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Bottom tab bar navigation — reachable from supine position | `src/components/layout/TabBar.tsx` — fixed bottom navigation |
| 64px minimum touch targets for all patient-facing buttons | `src/app.css:59` — `--size-target: 64px` |
| Emotional expression treated as clinical need, not secondary feature | `src/data/phraseRegistry.ts:112-141` — "I Feel" category |
| No dead ends — every screen has navigation | `src/components/layout/TabBar.tsx` — always visible |

---

### ICU Communication Challenges

> Freeman-Sanderson, A., et al. (2019). Challenges of patient communication in the ICU. *Australian Critical Care*, 32(S1), 36.

**Finding:** Summarizes the persistent challenges of ICU patient communication: tool limitations, nurse workflow constraints, and the gap between patient communication needs and available AAC solutions.

**Where it's applied:** Informs the overall product rationale documented in `docs/PRD.md:17-28` — the "Problem" section.

---

## 3. Motor Impairment and Touch Interaction

Research that shaped touch target sizes, debouncing, and interaction model.

### Motor-Impaired Touchscreen Interaction

> Naftali, M., & Findlater, L. (2014). Accessibility in Context: Understanding the Truly Mobile Experience of Smartphone Users with Motor Impairments. *ASSETS '14: ACM SIGACCESS Conference on Computers and Accessibility*.
>
> Vendome, C., et al. (2024). MotorEase: Automated Detection of Motor Impairment Accessibility Issues in Mobile App UIs. *arXiv:2403.13690*.

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

> Appleton, R.T., Kinsella, J., & Quasim, T. (2015). The incidence of intensive care unit-acquired weakness syndromes: A systematic review. *Journal of the Intensive Care Society*, 16(2), 126–136.

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

**Finding:** The foundational AAC textbook. Documents that users with physical impairments may use fingers, knuckles, toes, styluses, mouth sticks, head tracking, eye gaze, or switches. Recommends positioning devices at an angle, notes that screen positioning significantly affects independent access. Photorealistic images are easier to comprehend than stylized symbols for patients with cognitive impairment.

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

> Devlin, J.W., Skrobik, Y., Gélinas, C., et al. (2018). Clinical Practice Guidelines for the Prevention and Management of Pain, Agitation/Sedation, Delirium, Immobility, and Sleep Disruption in Adult Patients in the ICU. *Critical Care Medicine*, 46(9), e825–e873.

**Finding:** The PADIS guidelines document that even light sedation slows processing speed, reduces attention span, and impairs decision-making. Sleep disruption is identified as a distinct clinical concern alongside pain, agitation, and delirium.

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

> Ely, E.W., Shintani, A., Truman, B., et al. (2004). Delirium as a predictor of mortality in mechanically ventilated patients in the intensive care unit. *JAMA*, 291(14), 1753–1762.
>
> Girard, T.D., et al. (2008). Efficacy and safety of a paired sedation and ventilator weaning protocol. *The Lancet*, 371(9607), 126–134.

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

> Darbyshire, J.L. & Young, J.D. (2013). An investigation of sound levels on intensive care units with reference to the WHO guidelines. *Critical Care*, 17(5), R187.

**Finding:** ICU baseline ambient noise levels typically range from 50–75 dB, with alarm peaks reaching 80–90 dB. The WHO guideline of 35 dB for patient areas is routinely exceeded.

**Where it's applied:**

| Decision | Implementation |
|---|---|
| Visual confirmation accompanies every utterance | `src/components/shared/Speaking.tsx` — visual overlay with speaker name, text, and animated progress bar |
| Volume must be adjustable and sufficient for ICU noise | Speaker and conversation design accounts for noisy environments |

---

### Alarm Fatigue

> Ruskin, K.J. & Hueske-Kraus, D. (2015). Alarm fatigue: impacts on patient safety. *Current Opinion in Anesthesiology*, 28(6), 685–690.

**Finding:** Clinicians override 93–96% of clinical alarms due to alarm fatigue. Audio signals from non-clinical devices should not resemble clinical alarms.

**Where it's applied:** No alarm-like sounds in OwnVoice. Audio output is speech only, distinguishable from clinical monitoring equipment.

---

## 6. Accessibility Standards

### WCAG 2.1

> W3C. Web Content Accessibility Guidelines (WCAG) 2.1. w3.org/TR/WCAG21.

**Where it's applied:**

| Criterion | Implementation |
|---|---|
| SC 1.4.3 — Contrast minimum 4.5:1 (AA) | `src/theme/tokens.ts:9-39` — every color token annotated with verified contrast ratio |
| SC 1.4.6 — Enhanced contrast target 7:1 (AAA) | `src/theme/tokens.ts` — most text tokens exceed 7:1 |
| SC 1.4.1 — Color not sole differentiator | Patient/provider messages differ by position, speaker label, and color |
| SC 1.4.4 — 200% text scaling without overflow | Font sizes use relative units; minimum 18px body text |

---

### Healthcare App Accessibility

> Boundev. (2026). Healthcare App Accessibility and WCAG Compliance Guide. boundev.com/blog.

**Finding:** Recommends touch targets of at least 48×48dp with 8dp spacing for motor-impaired and elderly users.

**Where it's applied:** OwnVoice exceeds this baseline — 64px minimum targets with 12px spacing — to account for the compounding impairments of acute illness (`src/app.css:59-61`).

---

### Atkinson Hyperlegible

> Braille Institute. Atkinson Hyperlegible Font. brailleinstitute.org/freefont.

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

> Ku, B. & Lupton, E. (2022). *Health Design Thinking: Creating Products and Services for Better Health*, 2nd ed. MIT Press / Cooper Hewitt, Smithsonian Design Museum.

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

> Nielsen, J. (1994). 10 Usability Heuristics for User Interface Design. Nielsen Norman Group.

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

> Brooke, J. (1996). SUS: A "quick and dirty" usability scale. *Usability Evaluation in Industry*, 189, 4–7.

Used in Phase 2 evaluation — administered to nurses at end of study participation.

> Braun, V., & Clarke, V. (2019). Reflecting on reflexive thematic analysis. *Qualitative Research in Sport, Exercise and Health*, 11(4), 589–597.

Methodology for qualitative analysis of interview data in the research plan.

---

## 9. Elements Awaiting Validation

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
