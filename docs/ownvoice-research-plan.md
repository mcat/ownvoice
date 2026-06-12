# OwnVoice: On-Device Voice-Cloning AAC with Goals-of-Care Integration for ICU Patients Without Functional Speech

## A Clinical Validation Research Plan

*Prepared for submission to arXiv (cs.HC / cs.CY)*

---

## 1. Abstract

This document describes the research plan for a clinical validation study of OwnVoice, a Progressive Web Application that provides augmentative and alternative communication (AAC) for ICU patients without functional speech, using on-device voice cloning, a validated emoji pain scale, contextual sentence building powered by on-device language models, and structured goals-of-care conversations based on the Serious Illness Conversation Guide (SICG). The study is a prospective, mixed-methods clinical trial conducted in a single-center ICU. The primary aim is to evaluate whether OwnVoice reduces patient-reported communication difficulty compared to standard-of-care communication methods. Secondary aims assess the impact of voice cloning on patient identity and emotional wellbeing, the feasibility and clinical utility of tablet-based SICG conversations with patients without functional speech, on-device inference latency and reliability in the clinical environment, and nursing workflow integration.

---

## 2. Background and Rationale

### 2.1 Communication Failure in the ICU

Approximately 33% of hospitalized patients meet AAC candidacy criteria from endotracheal intubation, tracheostomy, or neurological impairment (Zubow & Hurtig, 2013); within the ICU specifically, Freeman-Sanderson et al. (2019) observed that roughly one-third of the ICU caseload experienced communication difficulty across 232 occupied bed-days at a tertiary Australian hospital. Staff reported difficulty communicating with patients on 35% of bed-days, with an inability to communicate at all in 49% of those, and although alternate communication modes were in use, they were not offered to all suitable patients (Freeman-Sanderson et al., 2019). The candidacy figure is higher in the specific population OwnVoice serves: 53.9% of mechanically ventilated patients meet basic communication criteria — awake, alert, and responsive — for at least one 12-hour nursing shift while on MV ≥ 2 consecutive days (Happ et al., 2015). Communication difficulty predicts psychoemotional distress, fear, and anger in mechanically ventilated patients (Khalaila et al., 2011), and in observed usual care more than one-third of nurse–patient communication exchanges about pain were unsuccessful (Happ et al., 2011).

Existing tablet-based AAC tools for the ICU (VidaTalk, CommuniCare, YoDoc) are essentially static phrase boards: pre-translated content played back in a generic synthetic or pre-recorded voice (Dind, Starr, & Arora, 2021). The preclinical comparison of nine iPad-based ICU communication apps in *Indian Journal of Critical Care Medicine* (Dind et al., 2021) confirms that none of the three offer voice cloning, on-device language models for contextual sentence suggestion, or neural speech-to-text. They do not address four gaps OwnVoice targets: (1) speech in the patient's own voice via zero-shot voice cloning, (2) AI-assisted sentence construction from limited reference content, (3) structured goals-of-care conversations using the SICG framework, and (4) on-device neural inference that eliminates cloud dependency, BAA negotiation, and PHI egress in the first place.

### 2.2 Voice Cloning and Patient Identity

Patients consistently report loss of voice as one of the most distressing aspects of ICU admission (Khalaila et al., 2011; Carroll, 2007). Voice is a core marker of personal identity. Zero-shot voice cloning technology now enables the recreation of an individual's voice characteristics from a 3–10 second audio sample. No published study has examined the effect of hearing one's own cloned voice — versus a generic synthesized voice — on patient emotional wellbeing, identity preservation, and family experience during critical illness.

**Recording protocol.** OwnVoice captures 15 seconds of audio and extracts a 192-dim x-vector speaker embedding using Chatterbox Multilingual's CAMPPlus encoder (Resemble AI, 2025). Because this is a statistical embedding — spectral envelope, pitch statistics, and formant structure averaged across the clip — phonetic and prosodic coverage of the reference audio directly shapes clone quality (Casanova et al., 2022; Wang et al., 2023). The English-locale recording protocol therefore prompts the patient to read the opening two sentences of the Rainbow Passage (Fairbanks, 1960), the canonical phonetically balanced passage used in the VCTK corpus (Veaux et al., 2019). Full rationale and citations in `docs/BIBLIOGRAPHY.md` §9.

### 2.3 Goals-of-Care Conversations with Patients Who Cannot Speak

The Serious Illness Conversation Guide (SICG) from Ariadne Labs has demonstrated significant improvements in goals-of-care communication: more conversations about values and goals (89% vs. 44%), earlier conversations (5 months vs. 2.5 months before death), increased documentation (61% vs. 11%), and reduced anxiety and depression (Bernacki et al., 2019; Paladino et al., 2019). However, the SICG was designed for patients who can speak. No published study has examined whether structured goals-of-care conversations can be conducted effectively with patients without functional speech, using AAC technology.

### 2.4 On-Device Inference

OwnVoice runs entirely on-device using WebGPU-accelerated neural inference (ONNX Runtime Web). This eliminates cloud dependency, ensures HIPAA compliance by design, and enables offline operation. The technical feasibility of running multiple quantized models (TTS, sentence suggestion LLM, speech-to-text) simultaneously on consumer tablet hardware in a clinical setting has not been validated.

---

## 3. Study Aims and Hypotheses

### 3.1 Primary Aim

Evaluate whether OwnVoice reduces patient-reported communication difficulty compared to standard-of-care AAC methods in ICU patients without functional speech.

**H1:** Patients using OwnVoice will report significantly lower communication difficulty (Ease of Communication Scale scores) than patients using standard-of-care communication methods.

### 3.2 Secondary Aims

**Aim 2 — Voice Identity:** Assess the impact of personalized voice cloning versus generic TTS on patient emotional wellbeing and sense of identity.

**H2:** Patients whose communications are spoken in their cloned voice will report higher scores on the voice identity subscale (custom instrument) than patients using a generic TTS voice.

**Aim 3 — Goals-of-Care Feasibility:** Determine the feasibility and clinical utility of conducting SICG-structured goals-of-care conversations with ICU patients without functional speech, via OwnVoice.

**H3:** A clinically meaningful proportion (≥50%) of eligible patients will complete ≥4 of 7 SICG EXPLORE topics using the My Wishes feature.

**Aim 4 — Technical Performance:** Measure on-device inference latency, reliability, and resource utilization under clinical conditions.

**H4:** Pre-generated phrase playback latency will be <100ms and real-time TTS synthesis latency will be <1000ms for ≥95% of interactions.

**Aim 5 — Nursing Workflow:** Assess the impact of OwnVoice on nursing communication burden, time, and satisfaction.

**H5:** Nurses using OwnVoice will report reduced communication difficulty and increased confidence in understanding patient needs.

### 3.3 Exploratory Aims

- Evaluate the Emoji-FPS pain scale's concordance with nurse-assessed pain scores in the ICU population
- Assess the accuracy and clinical acceptability of on-device Whisper speech-to-text for capturing provider communication
- Examine family member experience of hearing the patient's cloned voice during goals-of-care conversations
- Characterize patient phrase usage patterns to inform future phrase library design
- **Reference-audio protocol efficacy.** Compare clone quality (patient-rated similarity; optionally Mean Opinion Score from blinded raters) between patients who read the Rainbow Passage and those who free-speak for 15 seconds. The scripted-read hypothesis — that phonetic and prosodic balance improves the Chatterbox Multilingual speaker embedding in ways patients can perceive — is well-supported in general speech science but unbenchmarked against this specific model and population (ICU patients with possible vocal fatigue)

---

## 4. Study Design

### 4.1 Design Overview

Prospective, single-center, two-phase mixed-methods study.

**Phase 1 — Usability and Technical Validation (Weeks 1–4):** Non-randomized feasibility study with 10–15 patients. Focus on usability, technical performance, and workflow integration. Iterative refinement of the application based on feedback.

**Phase 2 — Comparative Effectiveness (Weeks 5–20):** Stepped-wedge cluster design with 60–80 patients. ICU beds are grouped into clusters; clusters cross over from standard-of-care to OwnVoice on a staggered schedule. This design is preferred over parallel RCT because: (a) contamination between groups is likely if nurses use OwnVoice with some patients but not others, (b) all patients eventually receive the intervention, addressing ethical concerns about withholding a beneficial communication tool, and (c) it is practical within a single ICU.

### 4.2 Setting

Single academic medical center ICU (medical-surgical, 20–30 beds). Selected for: adequate volume of AAC-eligible patients, existing palliative care consultation service (for SICG component), institutional Wi-Fi infrastructure (for initial app deployment; the app operates offline after first load), and prior experience with AAC research or clinical implementation.

### 4.3 Duration

Total study duration: 6 months (1 month setup/training, 1 month Phase 1, 4 months Phase 2). Patient participation: duration of ICU stay without functional speech (typically 2–14 days).

---

## 5. Participants

### 5.1 Inclusion Criteria

- Age ≥ 18 years
- Admitted to the study ICU
- Without functional speech due to endotracheal intubation, tracheostomy, or other qualifying condition
- Alert and oriented to person (CAM-ICU negative or ≤1 feature positive)
- Able to interact with a tablet via touch (direct touch, stylus, or switch access)
- Expected period without functional speech ≥ 24 hours
- English-speaking or one of OwnVoice's 13 supported languages

### 5.2 Exclusion Criteria

- Richmond Agitation-Sedation Scale (RASS) score < −2 (moderate to deep sedation)
- Positive CAM-ICU (delirium with ≥2 features)
- Inability to interact with a tablet by any access method
- Expected death or transition to comfort-only care within 24 hours (these patients may be included in the My Wishes analysis as a separate subgroup if they or their surrogate consent)
- Prior enrollment in this study
- Cognitive impairment documented prior to ICU admission that would preclude meaningful tablet interaction

### 5.3 Sample Size Justification

**Phase 1:** 10–15 patients (usability convention for iterative design; Nielsen, 2000).

**Phase 2:** Based on prior AAC studies in ICU populations that used the same instrument (Happ et al., 2004; Happ et al., 2014; Trotta et al., 2020), we estimate a medium effect size (Cohen's d = 0.5) for the primary outcome (ECS communication difficulty). With alpha = 0.05, power = 0.80, and accounting for the stepped-wedge design effect and expected 20% attrition (extubation, transfer, death, withdrawal), we require approximately 60–80 patients across 4–6 clusters.

### 5.4 Recruitment and Consent

A trained research coordinator will screen ICU admissions daily. For patients who meet inclusion criteria, informed consent will be obtained from the patient (if capable of written or gestural consent) or from the legally authorized representative (LAR). Assent will be obtained from the patient whenever possible, even when LAR consent is required. The consent process will accommodate non-spoken communication (written, gestural, or AAC-assisted).

---

## 6. Intervention

### 6.1 OwnVoice Application

The intervention is the OwnVoice PWA deployed on iPad Pro tablets (M5 chip, 12.9-inch display). Each enrolled patient receives a dedicated tablet positioned on the bedside tray. A research coordinator or trained nurse completes the setup wizard (patient name, bed number, language, voice sample if available, provider profiles) within the first 2 hours of enrollment.

**Voice sample collection:** If a pre-illness voice sample is available (voicemail, family video, voice message), it is uploaded during setup. If the patient can produce any vocalization, a brief sample is recorded. If neither is available, the app uses a default TTS voice, and a voice sample may be added later.

**Provider onboarding:** The primary nurse and attending physician are configured as providers during setup, with name, optional emoji, and optional voice sample. Providers are trained in a 15-minute session covering: sending provider responses, using Listen (speech-to-text), and initiating My Wishes conversations.

### 6.2 Standard-of-Care Comparator

Standard-of-care AAC methods in the ICU, which may include: pen and paper, alphabet boards, picture boards, gesture/mouthing, and any existing electronic communication tools already in use on the unit. No AAC tools are removed during the study; OwnVoice is additive.

### 6.3 My Wishes Protocol

For patients with an anticipated ICU stay ≥72 hours and a serious illness trajectory, a palliative care clinician will initiate a goals-of-care conversation using the SICG framework delivered through OwnVoice's My Wishes feature. The clinician uses the provider panel's "goals of care" prompts; the patient responds using the My Wishes ranked selection interface. The conversation is captured in the app's thread and documented in the electronic medical record per institutional SICG documentation standards.

---

## 7. Outcome Measures

### 7.1 Primary Outcome

**Communication Difficulty:** Patient-reported difficulty communicating, measured with the Ease of Communication Scale (ECS; Happ, Roesch, & Garrett, 2004; Happ et al., 2014) — the patient-reported instrument used in the SPEACS trial and in a five-ICU implementation study (Trotta et al., 2020), and the most widely used patient-reported communication outcome in this population. Lower scores indicate easier communication. Administered at 24 hours post-enrollment and at ICU discharge or return of speech (whichever is first); the ECS is designed for self-administration by patients who cannot speak.

### 7.2 Secondary Outcomes

**Communication Satisfaction**

- Satisfaction with Communication Method Tool (Rodriguez et al., 2016): satisfaction with the current communication method, adapted from QUEST 2.0 and previously used with suddenly speechless critical care patients; 5-point scale. Administered at the same time points as the ECS.

**Voice Identity and Emotional Wellbeing**

- Custom Voice Identity Scale (VIS): A 6-item instrument developed for this study measuring the patient's sense of being "heard," identity preservation, and emotional response to hearing their own voice. Items rated on a 5-point visual scale (faces or thumbs-up/down). To be validated in Phase 1.
- Hospital Anxiety and Depression Scale (HADS): Administered at enrollment and discharge. Adapted for AAC use.
- Patient experience interviews (qualitative): Semi-structured interviews conducted after return of speech, or via OwnVoice if the patient still cannot speak.

**Goals-of-Care Feasibility**

- Completion rate: Proportion of eligible patients who complete ≥4 of 7 SICG EXPLORE topics (from aggregate research metrics: topic IDs addressed, not content)
- Documentation rate: Proportion of My Wishes conversations documented in the medical record (chart audit)
- Content analysis: Thematic analysis of clinician-authored EMR documentation of the goals-of-care conversation, conducted under the institution's existing chart review and HIPAA authorization framework
- Clinician assessment: Palliative care clinicians rate the quality and completeness of the goals-of-care conversation on a 5-point scale compared to their typical bedside SICG experience

**Technical Performance**

- Phrase playback latency (ms): Time from tap to audio onset, logged automatically
- TTS synthesis latency (ms): Time from custom text submission to audio onset
- STT word error rate: Measured during Phase 1 using standardized, non-clinical test phrases spoken by consenting staff (not during patient interactions). Clinical accuracy assessed via provider self-report of transcript correctness (binary: "accurate enough to post" vs. "needed editing")
- Model load time (seconds): Time from app launch to inference readiness
- Crash/failure rate: Proportion of interactions resulting in error states
- Battery consumption: iPad battery drain rate during active use
- Storage utilization: Total on-device storage consumed by models and cached audio

**Nursing Outcomes**

- Nurse-perceived communication difficulty: single-item per-shift rating (study-specific item; the patient-reported ECS is the primary outcome, §7.1)
- Communication frequency: Number of patient-initiated interactions per shift, by category (aggregate count from research metrics, no content)
- Time-to-respond: Time between patient communication and nurse acknowledgment (observational subsample, not app-logged)
- Nurse Satisfaction Questionnaire: Custom 10-item instrument assessing perceived utility, workflow impact, and training adequacy
- System Usability Scale (SUS; Brooke, 1996): Standardized usability measure administered to nurses at end of study

**Pain Assessment**

- Emoji-FPS concordance with nurse-assessed pain (BPS or CPOT) at matched time points
- Patient preference: Emoji-FPS vs. NRS preference rating

### 7.3 Exploratory Outcomes

- Family experience: Semi-structured interviews with family members present during voice-cloned communications or My Wishes conversations (target: 10–15 family members)
- Category usage patterns: Aggregate frequency and timing distribution of communications by category (not content), analyzed to identify which communication categories are underserved
- Conversation thread completeness: Proportion of bedside exchanges captured in the app thread, assessed via observational subsample (not app logging)

---

## 8. Data Collection

### 8.1 Data Architecture: Clinical Record vs. Research Metrics

OwnVoice generates two distinct categories of data. They are governed by different rules, stored separately, and never mixed.

**Category 1 — Clinical Communication Record (PHI)**

The conversation thread — the actual text of what the patient and providers said — is protected health information (PHI). It belongs to the patient's medical record and falls under the institution's existing HIPAA compliance framework, not under research telemetry.

- The conversation thread lives on-device only, encrypted at rest using iPadOS data protection (AES-256, tied to the device passcode)
- It never crosses a network. It never enters a research database
- At discharge, the clinical team may choose to document a summary of the conversation in the electronic medical record per institutional documentation standards (e.g., a palliative care note summarizing My Wishes responses). This documentation follows existing clinical workflows and is not a research procedure
- App reset between patients destroys the conversation thread. No content remains on the device

**Category 2 — Aggregate Research Metrics (De-identified)**

Research data collection is limited to aggregate, content-free metrics that cannot be used to reconstruct what the patient said. These metrics are keyed to a study ID, never a patient name or MRN.

Metrics collected:

- **Counts by category:** Number of interactions per feature (Quick phrases, I Need, I Feel, Pain, Questions, Sentence Builder, My Wishes, Listen) per session. No content, only category tallies.
- **Latency measurements:** Millisecond timestamps for audio playback and synthesis events, stored as numeric values with no associated phrase content.
- **Session metrics:** Total session duration, active interaction time, idle time. No content.
- **My Wishes completion:** Which SICG topics were addressed (by topic ID, not patient response text) and how many selections per topic. The specific selections are part of the clinical record (Category 1) and are not exported.
- **Pain scale usage:** Severity levels selected (numeric only), frequency of pain assessments, time between assessments. No associated clinical context.
- **Error and performance metrics:** Crash events, model load times, memory utilization, battery drain. No patient data.
- **Feature adoption:** Binary flags for whether voice cloning, Listen, and My Wishes were used during the enrollment period. No content.

These metrics are logged on-device in a separate storage partition from the clinical record. At the end of each patient's enrollment, the research coordinator exports the aggregate metrics file (JSON) via a secure institutional transfer mechanism (e.g., encrypted USB or institutional SFTP). The export file contains only the study ID and numeric/categorical metrics. A second researcher verifies that the export contains no PHI before it enters the research database.

**What is explicitly NOT collected for research:**

- The text content of any patient phrase, sentence builder output, or My Wishes selection
- The text content of any provider message or Listen transcription
- Voice samples or cloned voice model data
- Any audio recordings
- Patient name, bed number, MRN, or any direct identifier
- Timestamps precise enough to correlate with clinical events (research timestamps are rounded to the nearest hour)

### 8.2 Research Coordinator Assessments

| Instrument | Timing | Administrator |
|---|---|---|
| Demographics and clinical characteristics | Enrollment | Coordinator |
| RASS and CAM-ICU | Daily, each shift | Bedside nurse |
| ECS | 24h post-enrollment; discharge | Coordinator |
| Satisfaction with Communication Method Tool | 24h post-enrollment; discharge | Coordinator |
| HADS | Enrollment; discharge | Coordinator |
| Voice Identity Scale (VIS) | 48h post-enrollment | Coordinator |
| Emoji-FPS / NRS preference | 48h post-enrollment | Coordinator |
| Patient experience interview | Return of speech or discharge | Coordinator |

### 8.3 Nursing Data

| Instrument | Timing | Administrator |
|---|---|---|
| ECS | End of each shift | Bedside nurse |
| SUS | End of study participation | Bedside nurse |
| Nurse Satisfaction Questionnaire | End of study participation | Bedside nurse |
| Communication time observation | Random 2-hour blocks (subsample) | Research observer |

### 8.4 Goals-of-Care Data

| Instrument | Timing | Administrator |
|---|---|---|
| My Wishes completion log | Post-conversation | Auto-logged |
| Clinician quality rating | Post-conversation | Palliative care clinician |
| EMR documentation audit | Weekly | Coordinator |
| Patient/family interview | Post-conversation | Coordinator |

---

## 9. Analysis Plan

### 9.1 Primary Analysis

We will analyze the primary outcome (ECS score) using a generalized linear mixed model (GLMM) with fixed effects for intervention condition (OwnVoice vs. standard-of-care), time period, and cluster, and random effects for patient nested within cluster. The stepped-wedge design requires adjustment for time trends. The model will control for patient age, APACHE III severity score, cause of impaired speech (intubation vs. tracheostomy vs. neurological), and ICU length of stay at enrollment. Analysis will follow intention-to-treat principles.

### 9.2 Secondary Analyses

**Voice Identity:** VIS scores compared between patients with cloned voice and patients using default TTS, using independent-samples analysis adjusted for potential confounders. Within-patient comparison where voice sample is added after initial enrollment (paired analysis).

**Goals-of-Care:** Descriptive statistics for completion rates, documentation rates, and topic selection patterns. Thematic analysis of clinician quality ratings. Content analysis of patient selections with comparison to documented advance directives (where available).

**Technical Performance:** Descriptive statistics for latency distributions, error rates, and resource utilization. 95th percentile latency reported as primary technical metric. Subgroup analysis by device model (M5 vs. A16) and model configuration.

**Nursing Outcomes:** ECS scores analyzed with mixed-effects model (repeated measures within nurse, crossed with patient). SUS scores reported as means with benchmarking against published norms.

### 9.3 Qualitative Analysis

Semi-structured interview transcripts (patient, family, clinician) analyzed using reflexive thematic analysis (Braun & Clarke, 2019). Two independent coders with reconciliation. Member checking with a subset of participants. Qualitative and quantitative findings integrated using a joint display approach.

### 9.4 Missing Data

We will use multiple imputation for missing ECS and HADS data (expected sources: patient discharge, death, withdrawal, or inability to complete from clinical deterioration). Sensitivity analyses will compare results under complete-case, last-observation-carried-forward, and worst-case imputation assumptions.

---

## 10. Ethical Considerations

### 10.1 IRB Approval

We will submit the study protocol, consent documents, and all data collection instruments for institutional review board (IRB) review and approval before participant enrollment.

### 10.2 Consent for Patients Who Cannot Speak

Informed consent presents a specific challenge for this population. The study will use a tiered consent model:

1. **LAR consent:** If the patient cannot provide written consent, the legally authorized representative provides written consent.
2. **Patient assent:** The study coordinator obtains assent from the patient using the OwnVoice app itself (tapping "Yes" or "No" to a series of simple statements about study participation), documented with a witness.
3. **Delayed self-consent:** If the patient regains speech during the study, they are offered the opportunity to provide full informed consent or withdraw.

### 10.3 Voice Sample Privacy

Voice samples and cloned voice models live exclusively on the study tablet. No voice data crosses a network. App reset between patients destroys voice samples and models. The consent form explicitly addresses voice cloning, including: the nature of voice recreation, that the voice model exists only on the device, that we destroy it at discharge, and that no voice recordings persist for research beyond the study period.

### 10.4 My Wishes and Advance Care Planning

The My Wishes feature is a communication tool, not a legal document. The research protocol, consent form, and clinical training materials will clearly state:

- My Wishes responses do not constitute an advance directive, POLST, or healthcare proxy designation
- My Wishes responses should inform but not replace formal advance care planning processes
- Clinicians retain full clinical judgment regarding care decisions
- Patients may change their selections at any time

The study will document instances where My Wishes conversations led to changes in the formal care plan, advance directive completion, or family communication about goals of care.

### 10.5 Vulnerable Population Protections

Critically ill patients without functional speech are a vulnerable population. Additional protections include:

- Daily assessment of continued willingness to participate (via app interaction or nurse assessment)
- Immediate withdrawal without consequence if the patient shows distress related to the device
- No study procedures that delay, alter, or interfere with clinical care
- An independent Data Safety Monitoring Board (DSMB) for Phase 2, with pre-specified stopping rules for safety events

### 10.6 Data Security

**On-device clinical data (PHI):** The iPad encrypts the conversation thread, voice samples, and cloned voice models at rest via iPadOS data protection (AES-256, hardware-bound). We configure each tablet with a device passcode and Guided Access to prevent access to other apps. Clinical data never leaves the device; app reset between patients destroys it. Lost or stolen tablets contain no PHI once reset; before reset, the device passcode and encryption protect the data.

**Research metrics (de-identified):** The coordinator exports aggregate metrics as a JSON file keyed to a study ID. A two-person verification process confirms the export contains no PHI before it enters the institutional research database. The research database lives on encrypted, HIPAA-compliant institutional servers with role-based access control.

**Interview recordings:** Qualitative interview audio records on an encrypted institutional device (not the patient's OwnVoice tablet). Within 48 hours, the team transcribes and de-identifies recordings, then destroys the audio files. Transcripts live in the research database under the study ID.

**No research data leaves the institution.** The research database, interview transcripts, and analysis outputs remain on institutional infrastructure. Published results contain only aggregate statistics, representative de-identified quotes from interviews, and no individually identifiable information.

---

## 11. Team and Roles

| Role | Qualifications | Responsibilities |
|---|---|---|
| Principal Investigator | ICU physician or nurse scientist with AAC research experience | Study design, IRB oversight, clinical oversight, manuscript lead |
| Co-Investigator (Palliative Care) | Palliative care physician trained in SICG | My Wishes protocol design, clinician training, goals-of-care quality assessment |
| Co-Investigator (Technology) | Computer scientist or engineer with ML/HCI expertise | Technical architecture, on-device inference optimization, telemetry design |
| Co-Investigator (Speech-Language Pathology) | SLP with AAC and ICU experience | AAC assessment, patient screening, communication instrument selection |
| Biostatistician | PhD-level statistician with stepped-wedge design experience | Sample size, randomization, analysis plan, statistical oversight |
| Research Coordinator | Clinical research coordinator with ICU experience | Daily screening, enrollment, consent, data collection, instrument administration |
| Research Observer | Trained observer (nursing or SLP student) | Communication time observations, fidelity monitoring |
| Technical Support | Software engineer | App deployment, troubleshooting, telemetry export |

---

## 12. Timeline

| Month | Phase | Activities |
|---|---|---|
| 1 | Setup | IRB submission and approval. Tablet procurement and configuration. App deployment to study tablets. Staff training (nurses, palliative care, research team). Instrument piloting. |
| 2 | Phase 1 | Usability study (10–15 patients). Technical performance baseline. Iterative app refinement. VIS instrument validation. Training refinement based on feedback. |
| 3–6 | Phase 2 | Stepped-wedge rollout (4 periods, 4–6 clusters). Enrollment target: 60–80 patients. Ongoing data collection, quality monitoring, DSMB reviews. |
| 7–8 | Analysis | Data cleaning, statistical analysis, qualitative analysis. Integration of quantitative and qualitative findings. |
| 9 | Dissemination | Manuscript preparation. Preprint submission to arXiv. Peer-reviewed journal submission (target: Critical Care Medicine, AJRCCM, or JMIR). Conference abstract submission (SCCM, ATS). |

---

## 13. Anticipated Contributions

This study would contribute:

1. **First clinical evidence** for voice cloning in AAC for critically ill patients, including its impact on patient identity, emotional wellbeing, and family experience.
2. **First application** of the Serious Illness Conversation Guide with ICU patients who cannot speak, via AAC technology, with feasibility and effectiveness data.
3. **Technical validation** of multi-model on-device neural inference (TTS + LLM + STT) running simultaneously on consumer tablet hardware in a clinical environment.
4. **Open-source validated instruments** for measuring voice identity preservation and communication satisfaction in ICU populations without functional speech.
5. **Design guidelines** for AAC applications in acute care, informed by codesign with patients, families, and clinicians.

---

## 14. Limitations and Mitigations

| Limitation | Mitigation |
|---|---|
| Single-center design limits generalizability | Study site selected for demographic diversity; multi-center follow-up study planned |
| Stepped-wedge design may introduce time-period confounding | Time-period fixed effects in GLMM; sensitivity analysis for temporal trends |
| Self-report from patients without functional speech may be unreliable | Use of validated instruments designed for these populations; triangulation with nursing assessments and observational data |
| Voice sample availability varies | Analysis stratified by voice condition (cloned vs. default TTS); pre-illness samples from family encouraged |
| Short ICU stays may limit exposure | Inclusion criterion of ≥24 hours without functional speech; subgroup analysis by exposure duration |
| Hawthorne effect | Stepped-wedge design provides within-cluster comparison; research observers trained in unobtrusive observation |
| Delirium fluctuation may change eligibility during enrollment | Daily CAM-ICU screening; data analyzed for interaction between delirium status and outcomes |

---

## 15. Dissemination Plan

### 15.1 Publications

- **Primary manuscript:** Clinical outcomes (ECS, HADS, nursing outcomes). Target: Critical Care Medicine or American Journal of Respiratory and Critical Care Medicine.
- **Technical manuscript:** On-device inference performance, architecture, and open-source implementation. Target: arXiv (cs.HC), then JMIR or CHI.
- **Goals-of-care manuscript:** My Wishes feasibility, SICG adaptation for patients who cannot speak, and care plan impact. Target: Journal of Palliative Medicine or JAMA Internal Medicine.
- **Voice identity manuscript:** Voice cloning impact on patient identity and family experience. Target: Patient Education and Counseling or Annals of Internal Medicine.

### 15.2 Open Science

- Pre-registration on ClinicalTrials.gov prior to first enrollment
- Protocol published on Open Science Framework (OSF)
- De-identified dataset deposited in institutional repository
- OwnVoice application source code published on GitHub
- Custom instruments (VIS, Nurse Satisfaction Questionnaire) published with validation data under CC-BY 4.0

### 15.3 Conference Presentations

- Society of Critical Care Medicine (SCCM) Annual Congress
- American Thoracic Society (ATS) International Conference
- ASHA Convention (speech-language pathology audience)
- ACM CHI Conference on Human Factors (HCI and technology audience)

---

## 16. References

Bernacki, R., Paladino, J., Neville, B. A., et al. (2019). Effect of the Serious Illness Care Program in outpatient oncology: A cluster randomized clinical trial. JAMA Internal Medicine, 179(6), 751–759. https://doi.org/10.1001/jamainternmed.2019.0077

Braun, V., & Clarke, V. (2019). Reflecting on reflexive thematic analysis. Qualitative Research in Sport, Exercise and Health, 11(4), 589–597.

Brooke, J. (1996). SUS: A "quick and dirty" usability scale. Usability Evaluation in Industry, 189, 4–7.

Carroll, S. M. (2007). Silent, slow lifeworld: The communication experience of nonvocal ventilated patients. Qualitative Health Research, 17(9), 1165–1177.

Freeman-Sanderson, A., Morris, K., & Elkins, M. (2019). Characteristics of patient communication and prevalence of communication difficulty in the intensive care unit: An observational study. Australian Critical Care, 32(5), 373–377. https://doi.org/10.1016/j.aucc.2018.09.002

Happ, M. B., Roesch, T. K., & Garrett, K. (2004). Electronic voice-output communication aids for temporarily nonspeaking patients in a medical intensive care unit: A feasibility study. Heart & Lung, 33(2), 92–101. https://doi.org/10.1016/j.hrtlng.2003.12.005

Happ, M. B., et al. (2011). Nurse-patient communication interactions in the ICU. American Journal of Critical Care, 20(2), e28–e40.

Happ, M. B., et al. (2014). Effect of a multi-level intervention on nurse-patient communication in the ICU: Results of the SPEACS trial. Heart & Lung, 43(2), 89–98.

Happ, M. B., Seaman, J. B., Nilsen, M. L., et al. (2015). The number of mechanically ventilated ICU patients meeting communication criteria. Heart & Lung, 44(1), 45–49. https://doi.org/10.1016/j.hrtlng.2014.08.010

Khalaila, R., et al. (2011). Communication difficulties and psychoemotional distress in patients receiving mechanical ventilation. American Journal of Critical Care, 20(6), 470–479.

Li, L., et al. (2023). Development of the Emoji Faces Pain Scale and its validation on mobile devices in adult surgery patients. Journal of Medical Internet Research, 25, e41189.

Paladino, J., Bernacki, R., Neville, B. A., et al. (2019). Evaluating an intervention to improve communication between oncology clinicians and patients with life-limiting cancer: A cluster randomized clinical trial of the Serious Illness Care Program. JAMA Oncology, 5(6), 801–809. https://doi.org/10.1001/jamaoncol.2019.0292

Rodriguez, C. S., Rowe, M., Thomas, L., Shuster, J., Koeppel, B., & Cairns, P. (2016). Enhancing the communication of suddenly speechless critical care patients. American Journal of Critical Care, 25(3), e40–e47. https://doi.org/10.4037/ajcc2016217

Trotta, R. L., Hermann, R. M., Polomano, R. C., & Happ, M. B. (2020). Improving nonvocal critical care patients' ease of communication using a modified SPEACS-2 program. Journal for Healthcare Quality, 42(1), e1–e9. https://doi.org/10.1097/JHQ.0000000000000163

Zubow, L., & Hurtig, R. (2013). A demographic study of AAC/AT needs in hospitalized patients. Perspectives on Augmentative and Alternative Communication, 22(2), 79–90. https://doi.org/10.1044/aac22.2.79

---

*OwnVoice Research Plan v1.0 — April 2026*
*Prepared for IRB submission and arXiv preprint (cs.HC / cs.CY)*
