# OwnVoice — Business Strategy

**Status:** Working hypothesis (early discovery and validation)
**Last updated:** 2026-05-06
**Audience:** Founder, prospective clinical co-founder, advisors, future hires, eventual diligence

---

## 1. Outcome shape

OwnVoice is a **bootstrapped venture optimized for durable independence with optionality for strategic acquisition**. No outside venture capital. Modest team (founder + clinical co-founder + 1–2 hires across 4 years). Acquirer-readiness as a steering function rather than a day-1 obligation.

The exit thesis is a **strategic acquisition by Tobii Dynavox (NASDAQ: TOBII)** at Year 4–5, in the **$25–50M range**. Tobii is the natural acquirer because their flagship products are dated (Windows tablets, generic synthesized voices, English-focused, no on-device AI), their patient population overlaps OwnVoice's design center, and they have FDA, CMS-billing, and SLP-channel infrastructure that would otherwise take 5+ years to build. Tobii has demonstrated M&A appetite (acquired Smartbox in 2022 for ~$22M).

A multi-buyer process at exit (PRC-Saltillo, Lingraphica, voice-AI players if they enter healthcare) is the operational mode for valuation optimization, but Tobii is the primary thesis.

Respeecher is a critical **product partner**, not a viable acquirer.

---

## 2. Beachhead market and customer model

The buyer is the **clinical organization, structured bottom-up: ICU / step-down / acute-care unit → hospital → health system**. The end user is the patient, but the patient and family are never asked for money in a clinical setting. Patient-pays-mid-crisis was rejected as exploitative.

**Design-center user:** the suddenly-hospitalized voiceless patient who could not have prepared a voice sample in advance. Family arrives at the bedside with whatever audio they happen to have — a voicemail, a video clip, an Instagram story. This patient is materially under-served by Apple Personal Voice (which requires 15 minutes of clean training on the patient's own iOS device while they can still speak fluently), by hardware AAC vendors (which sell generic synthesized voices), and by existing software AAC apps (which offer no voice cloning at all).

**Geographic anchor:** Boston, with **Brigham and Women's Hospital (Adult Palliative Care, with Ariadne Labs alignment, jointly with a Brigham ICU)** as the first institution. The SICG framework (Serious Illness Conversation Guide) — already integrated into OwnVoice's My Wishes feature — was created at Ariadne Labs (BWH/Harvard). This institutional alignment is the single strongest opening pitch available; it is the asset to spend first.

Subsequent geographic expansion (Penn, Hopkins, UPMC, NYC, Bay Area) is deferred until Boston has produced signal.

A secondary SKU is **voice banking for pre-loss patients** (laryngectomy, ALS, MND), sold one-time at clinic referral, paid by the patient or family *outside* a crisis context. Different SKU, different purchase moment, different ethical posture from in-hospital subscription.

---

## 3. Pricing

Pricing is locked at the following structure. Annual prepay only — no monthly billing — because every tier fits within typical academic-medical-center unit-director discretionary authority and can be put on a credit card for unit-level reimbursement, bypassing central procurement entirely.

| SKU | Price | Includes |
|---|---|---|
| Small unit (≤10 beds) | **$3,000/yr** | Unlimited on-device voice cloning, all AAC features, 23 languages, on-device LLM + STT, conversation thread, My Wishes (SICG) |
| Mid unit (11–20 beds) | **$6,000/yr** | Same |
| Large unit (21+ beds) | **$12,000/yr** | Same |
| Hospital aggregate (3+ units same facility) | 15% volume discount | Adds CNO/admin dashboard (de-identified usage summary) |
| Health system (5+ hospitals same system) | Custom annual (~$50K–$250K) | Adds admin console, SLA, clinical implementation support |
| Premium voice clone (cloud-enrolled, hard cases) | **$299 per voice activation** | Charged to unit subscription as passthrough; for patients with poor / short / noisy reference audio |
| Voice banking SKU (pre-loss, clinic-referred) | **$99 one-time** | On-device clone, stored for later in-hospital use |
| Pilot | **30 days, free** | Full product, time-limited, converts to subscription or auto-deactivates |

**No permanent free tier.** The PRD §12 freemium model has been retired. Free is reserved for (a) 30-day pilots, (b) up to three named clinical-research sites in exchange for being published reference customers.

---

## 4. Distribution and acquirer thesis

Distribution is the **URL** (PWA, browser-based, no App Store, no MDM dependency). A nurse opens it, types a name, hands the iPad to a patient. Hospital deployment is via a hospital's existing iPad fleet; no integration required.

The acquirer thesis (Tobii primary, $25–50M at Year 4–5) requires the following durable artifacts at the time of acquisition discussion:

1. **Peer-reviewed publication** with clinical outcomes data (the BWH study) — *Critical Care Medicine*, *JAMA Network Open*, or *Journal of Palliative Medicine* ideal.
2. **$2–5M ARR with 50–80% YoY growth**, with cohort-level retention proven (90%+ unit retention).
3. **Class II 510(k) cleared or filed** (Speech Generating Device, predicate = Tobii's own products).
4. **1–3 patents filed and granted or pending** — hybrid on-device + cloud voice-cloning architecture, SICG-AAC integration, multilingual voice-direction model, voice-quality scoring.
5. **Reference customers across 5+ US health systems** with attributed quotes and case studies.
6. **Clean cap table** — Delaware C-corp, founder + co-founder vested, attorney-blessed, no toxic preferred.
7. **Team retention package** — key engineering and clinical staff signed for 2+ years post-close.

Each quarter of the 4–5 year arc is measured against whether at least one of these seven artifacts has materially advanced.

---

## 5. Regulatory posture

OwnVoice operates as a **wellness / communication aid** under the FDA General Wellness Policy. **No 510(k) filing during the bootstrap arc.**

**Rationale:** The closest competitive set (VidaTalk, CommuniCare, YoDoc, Proloquo2Go) operates without FDA registration. The unit-subscription business model does not require HCPCS reimbursement (which would require Class II clearance). Tobii has the FDA expertise, predicate devices, and QSR systems already; they would likely prefer to do the 510(k) themselves post-acquisition for IP/control reasons. $75–160K of regulatory spend over 18–24 months is misallocated during bootstrap when the same capital should fund clinical evidence, customer count, and ARR.

**Class I exempt registration is *not* a clean middle ground for OwnVoice** because the FDA's classification scheme places speech-generating products under product code NRR (Class II under 21 CFR 890.3700). Class I exempt would require positioning the product as something other than an SGD, which contradicts the headline feature.

**Optionality for Year 4:** if exit-stage modeling shows that a self-filed 510(k) materially lifts Tobii's offer, file then. Default assumption: don't.

**Discovery probe to confirm:** "What's your hospital's posture on procuring software AAC tools that aren't FDA-cleared?" If 5+ procurement-relevant interviewees flag this as a deal-blocker, revisit Class I exempt as procurement insurance.

---

## 6. Locked durable commitments

These are project invariants — operating rules that hold across the entire bootstrap arc, not one-time decisions:

1. **Marketing claims discipline.** Hold the "communication aid, not medical device, no diagnostic claims" line ruthlessly. Quote BWH study findings; never make device-level claims yourself.
2. **Design history file from day 1.** Every architectural decision, model swap, UX change documented in a structured way that folds into a future Quality Management System.
3. **Provisional patents at architectural milestones.** ~$15–25K total over Year 1–2; first provisional filed within 60 days regardless of co-founder timing.
4. **My Wishes / Listen / SICG copy framed as communication outputs**, not clinical outputs. Cheap and reversible discipline.

---

## 7. Discovery and validation phase (next 90 days)

The venture is currently in **discovery and validation mode**. No incorporation, no co-founder equity grants, no SRA, no IRB protocol drafting until the existential risk is resolved.

The existential risk is well-articulated by the founder: **the discovery conversations may reveal that voiceless-ICU-patient communication isn't painful enough that ICUs are actively trying to solve it.** Documented pain (Happ, Khalaila, Carroll, Freeman-Sanderson, IJssennagger) is real but does not necessarily map to actively-funded pain. Hospitals tolerate enormous quantities of well-documented pain that isn't on anyone's procurement list.

**Discovery activities run in parallel:**

- **Customer discovery interviews:** 25 conversations over 90 days. 20 ICU stakeholders (nursing directors, intensivists, palliative care MDs, SLPs, recently-discharged ICU survivors, families). 5 pivot-domain probes (2 outpatient palliative care, 2 ALS clinic SLPs, 1 head-and-neck oncology SLP).
- **Clinical co-founder hunt:** 8–12 first coffees over 90 days. Lead path: warm intros to Paladino/Bernacki tier at Ariadne Labs via founder's BWH/MGH peer-network contacts. Backup paths: BWH critical care, MGH palliative care, BIDMC palliative care.
- **Demo polish:** 60-second voice-clone demo (drag voicemail in → hear cloned voice say a line) tested against 5–10 real-world poor-reference samples (consenting non-patient: research collaborators, friends-and-family, public-domain audio). Plus a full-pilot demo at Q12-locked feature scope.
- **Patent filing:** First provisional within 60 days.

**Discovery interview probes are organized around three hypotheses:**

1. Is voiceless-ICU communication actually on funded priority lists? (existential)
2. Does the HRO / institutional-safety framing (sentinel events, Joint Commission, ICU Liberation Bundle, CMS Health Equity reporting) unlock budget conversations that pure patient-experience framing does not?
3. Is FDA registration a procurement requirement at the hospitals we're targeting, or do they procure VidaTalk-class apps without it?

See `docs/discovery/2026-05-06-discovery-interview-script.md` for the full script and probe inventory.

**Day 90 decision gate:**

- **Strong positive signal** → incorporate, formalize co-founder, file remaining provisionals, draft IRB protocol, begin STTR Phase I drafting.
- **Mixed signal** → 60-day extension with focused experiments; no incorporation yet.
- **Strong negative signal** → pivot to outpatient palliative / ALS / head-and-neck / Year-2 Tobii license deal; revisit B+D shape entirely.

---

## 8. Clinical credibility path

A **clinical co-founder** is required, not optional. Solo-founder healthcare procurement fails the first question of every nursing-director conversation ("who's your clinical advisor?"). Co-founder profile: palliative care or critical care attending, 5–15 years post-training, BWH or MGH faculty appointment, publishing-active, openness to industry partnership.

**Co-founder simultaneously:**
- Anchors clinical credibility (the named clinical voice in every discovery conversation, every demo, every diligence call)
- Files and runs the IRB study from their institutional appointment (with MGB COI disclosure)
- Becomes the first reference customer (their unit is the pilot)
- Bridges into the broader academic-medical-center palliative care and critical care networks
- Is the MGB Innovation IP-disclosure point of contact (engaged cooperatively, not adversarially)

**Equity:** 10–20% with 4-year vest, 1-year cliff. This is a real chunk; price it as the cost of getting into the market.

A clinical advisory board (3–5 members, ~0.1–0.25% equity each, $1–5K/mo honoraria) layers on as parallel infrastructure once the co-founder is onboarded — sourced through the co-founder's own network, not cold-recruited.

---

## 9. Funding model

**Baseline:** founder personal runway (12–24 months target). Without this, the bootstrap path is brittle.

**Strategic non-dilutive layer:** **STTR (Small Business Technology Transfer)** — the SBIR variant that requires a small-business + non-profit-research-institution partnership, with ≥30% of work performed by the research partner. With a BWH co-founder running the IRB study, STTR is a near-perfect fit. HHS / NIH STTR Phase I (~$300K, 12 months) → Phase II (~$1.5M, 24 months). Existing `ownvoice-research-plan.md` is essentially most of an STTR Specific Aims section already.

**Layered non-dilutive:** disease-foundation and clinical-research grants (NPCRC, Donaghue, RWJF Pioneer, NIH R-series). Don't fund the founder personally; subsidize study costs the company would otherwise eat. Apply once co-founder is onboarded and named PI.

**MGB Innovation Discovery Grants** ($25–100K) become accessible once the co-founder makes their faculty IP disclosure.

**Soft fallback:** consulting (1–2 days/week at Boston rates, ~$150–450K/year). Trade: 30–40% slower venture velocity. Acceptable if A runs short before C lands.

**Last resort:** F&F convertible note ($100–300K). Compromises pure-bootstrap structure but caps dilution at <10%.

**SBIR consultant:** budget $10–25K for first proposal; STTR proposal writing is 3–6 months of effort and ~15–25% hit rate for first-time applicants.

---

## 10. Team and hiring sequence

| Trigger | Hire | Compensation | Equity |
|---|---|---|---|
| Day 1 | Clinical co-founder | $0 cash (faculty appointment continues) or modest stipend | 10–20% vesting 4y / 1y cliff |
| Year 1 | Clinical advisory board (3–5 members) | $1–5K/mo + occasional honoraria | 0.1–0.25% each, vesting 2y |
| ~$200K ARR (Year 3) | First BD / sales hire | $80–120K + commission | 0.5–2% vesting 4y |
| ~$700K ARR (Year 4) | Senior engineer | $130–170K + bonus | 0.5–1.5% vesting 4y |
| ~$1.5M ARR (Year 4–5) | Optional: clinical implementation specialist (RN / SLP background) | $90–120K | 0.2–0.5% |

Team caps at 5–6 people through acquisition. Founder + clinical co-founder retain ~70–85% combined equity at exit. BD / sales is the right first non-cofounder addition because clinical co-founder is bandwidth-locked at their home institution and founder cannot simultaneously close pilots in 5 cities and build product.

---

## 11. Patent strategy

**Aggressive provisional cadence — 3–5 provisionals over Year 1, ~$15–25K total. First provisional filed within 60 days regardless of co-founder timing.**

The four target claim areas:

1. **Hybrid on-device-plus-cloud voice-cloning architecture** with consent-bounded enrollment and on-device inference. Differentiates from pure-cloud (ElevenLabs) and pure-device (Apple Personal Voice) approaches.
2. **SICG-AAC integration UX** — mapping a clinical conversation framework into a tappable patient-driven interface with bilateral conversation thread.
3. **Multilingual voice-direction model** — patient's voice in caregiver's language, caregiver's voice in patient's language. Cross-lingual bilateral pattern.
4. **Voice-quality scoring + recalibration framework** — algorithm for assessing whether a reference clip is sufficient for a usable clone, with model-version-aware recalibration.

Convert provisionals to non-provisionals as Year 2 budget allows. Boston patent attorney sourcing is on the founder.

---

## 12. Positioning architecture

```
HEADLINE:    Voice as identity — patients reclaim their voice
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
PILLAR (B):           PILLAR (NEW):           PILLAR (E):
Patient autonomy      Institutional safety    Linguistic equity
& goals-of-care       & reliability (HRO)     across populations
SICG / Ariadne Labs   Joint Commission /      CMS health equity /
audience              ICU Liberation /        LEP disparity audience
                      CQO audience
                              │
                       PILLAR (C, supporting):
                       Communication accuracy at the bedside
```

Voice-as-identity is the singular emotional headline (every demo, every homepage hero, every co-founder pitch, every Tobii deck). The four pillars are deployed by audience segment.

**Institutional KPIs to connect OwnVoice to**, ranked by budget gravity:

**Tier 1 (lead with these):**
- High Reliability Organization (HRO) maturity — communication failure is the #1 root cause in Joint Commission Sentinel Event data
- ICU Liberation / PADIS A2F Bundle compliance — the "F" (Family engagement) ties to delirium reduction, which is CMS HAC-Reduction-Program reimbursement-linked
- CMS Health Equity reporting (CMS-3387) — multilingual capability addresses LEP outcome disparities, uniquely among AAC tools

**Tier 2 (supporting evidence):**
- Magnet Recognition / Pathway to Excellence
- Restraint reduction (Joint Commission priority)
- Press Ganey Family Experience surveys

**Tier 3 (mention only when relevant):**
- HCAHPS communication-domain scores (caveat: voiceless patients are excluded from HCAHPS)
- Length of Stay; ICU-driven readmissions
- Translation / interpreter services cost reduction

The HRO frame is the most consequential positioning shift: it reframes OwnVoice from a patient-experience tool (weak budget gravity) into a patient-safety / institutional-reliability tool (strong budget gravity at the buyer level).

---

## 13. Differentiation against the competitive landscape

The AAC market splits into two segments:

**Hardware-centric vendors** — Tobii Dynavox, PRC-Saltillo, Lingraphica. FDA Class II 510(k)-cleared Speech Generating Devices on Windows tablets or dedicated hardware. Generic synthesized voices, English-focused, strong CMS reimbursement pathway via HCPCS codes E2500–E2511, but weak hospital adoption because the procurement-and-billing cycle runs patient-by-patient through DME suppliers.

**Software AAC apps for ICU** — VidaTalk (Vidatak), CommuniCare ICU, YoDoc, Proloquo2Go (AssistiveWare, broader AAC). Tablet apps with phrase libraries. **No FDA registration** (operate under General Wellness Policy). No voice cloning. No on-device LLM, no on-device STT. Limited multilingual support. Distributed via app stores or hospital MDM. VidaTalk is the most directly comparable to OwnVoice and is the canonical competitive benchmark for positioning.

**OwnVoice differentiates on four dimensions uncontested by either segment:**

1. On-device voice cloning from short reference samples, with cloud premium tier for hard cases (poor / short / noisy reference audio).
2. 23-language voice synthesis with cross-lingual capability — patient's voice in caregiver's language, caregiver's voice in patient's language.
3. Browser-based deployment (URL, no MDM, no app store, no install).
4. Goals-of-care integration (SICG framework from Ariadne Labs at BWH).

Each dimension is independently defensible; together they form a moat that cannot be matched without 12–24 months of rebuild from any incumbent.

---

## 14. Market sizing

### US TAM (steady-state full-penetration recurring revenue)

| Segment | Units | Avg annual price | TAM contribution |
|---|---|---|---|
| US ICUs | ~6,000 (85K beds total) | $7,000 (mid-tier weighted) | **$42M/yr** |
| Step-down / progressive care units | ~3,000 | $5,000 | **$15M/yr** |
| Acute stroke units / neuro | ~1,500 | $4,000 | **$6M/yr** |
| Specialty critical care | ~500 | $5,000 | **$2.5M/yr** |
| **Subtotal: clinical-org subscriptions** | **~11,000 units** | | **~$65M/yr** |
| Voice banking SKU | ~50K addressable patients/yr × 30% take | $99 one-time | **$1.5M/yr** |
| Premium-clone passthrough | 20% of subscribed units active | $299/clone | **~$5–10M/yr** |
| **US TAM total recurring** | | | **~$70–85M/yr** |

International (EU + UK + AUS + Japan, Singapore) adds approximately **$80–120M/yr** at full penetration, accessible Year 5+ post-acquisition under the acquirer's CE / ISO infrastructure. Total global TAM ~$150–200M/yr recurring.

### How market size scales with GTM motion

| GTM motion | Year | Realistic units / customers | ARR | % of US TAM | Tobii valuation at this level (5–10× ARR) |
|---|---|---|---|---|---|
| Founder-led, single anchor (Boston) | Year 1 | 1–3 BWH units (mostly free pilots) | $0–30K | <0.1% | Pre-revenue, ~$2–5M acqui-hire if exit |
| Co-founder + KOL referral, single city | Year 2 | 5–15 units across BWH + MGH | $30–100K | 0.1% | $5–10M (technology + clinical evidence purchase) |
| Multi-city KOL + first BD / sales hire | Year 3 | 25–60 units across 3–5 cities | $150–450K | 0.2–0.6% | $10–20M (early-revenue strategic) |
| Established customer references + second hire | Year 4 | 80–150 units across 8–12 cities | $500K–1.2M | 0.7–1.5% | $20–40M (typical Tobii target) |
| System-level contracts + Tobii in active discussion | Year 5 | 200–400 units + 1–2 health-system contracts | $2–4M | 3–5% | **$30–60M (B+D bootstrap-to-acquisition target)** |
| Post-acquisition national rollout | Year 6+ | 1,500–3,000 units + 50–100 system contracts | $15–35M | 20–40% | not relevant — exited |

**Pattern:** revenue scales roughly with sales-motion intensity, capped by penetration rate. Bootstrapped + co-founder + 1–2 BD hires gets to ~$2–4M ARR by Year 5, mapping to a $30–60M acquisition. Anything materially larger requires capital intensity that breaks the bootstrap structure, Class II clearance + CMS reimbursement (a longer harder play), or adjacent-market expansion (post-acute, home, ALS — different motion).

---

## 15. Risk inventory

The existential risk is **#1**: voiceless-ICU-patient communication may not be a funded category in current US ICU procurement. Documented pain ≠ actively-funded pain. If discovery returns negative signal here, the venture in current shape doesn't work and must pivot.

| # | Risk | Failure mechanism | Mitigation posture |
|---|---|---|---|
| 1 | **ICU pain isn't actively-funded** | Hospitals tolerate documented pain that isn't on procurement priority lists | Front-loaded discovery probes; explicit kill criteria; pivot-domain parallel probes |
| 2 | Co-founder recruitment fails in 6–12 months | No yes from Paladino/Bernacki tier; B-tier candidates lukewarm | Parallel multiple targets; MGH backup; advisory board as way station |
| 3 | Personal runway exhausts before STTR award | Savings out month 14; STTR award arrives month 18 | Consulting bridge; F&F note as last resort |
| 4 | Voice clone quality fails clinical use | Real-world ICU reference audio too poor for usable clones even via premium tier | Validate in 90-day discovery with 5–10 real bad samples; honest quality threshold; graceful degradation |
| 5 | Apple ships clinical Live Speech extension | Personal Voice + Live Speech gains hospital-deployment story | Moat shifts to multilingual + clinical workflow + premium voice quality + SICG integration |
| 6 | Tobii acquires a competitor first | Startup with similar voice-cloning AAC tech bought before our threshold | Multi-buyer process at exit; PRC-Saltillo, Lingraphica as alternatives |
| 7 | Privacy incident with cloud premium tier | Family voicemail mishandled; news story | Tight BAA; bulletproof consent flow; audit logging; on-device-only fallback architecture |
| 8 | BWH IRB study runs 3+ years | Recruitment slow, regulatory loops, statistical issues | Co-PI + backup site queued early; pre-register; publish interim findings |
| 9 | Hospital procurement harder than expected at unit level | Credit-card-on-unit-budget thesis fails | Lower price tier 1; lean on co-founder's home unit as proof point |
| 10 | Open-source clones erode moat | Chatterbox, Whisper, LFM all open-source; competitor copies stack | Moat shifts from model selection to clinical evidence + customer base + brand + premium voice partnership + integration patents |
| 11 | STTR proposal fails twice | Two cycles of rejection cost 12+ months | SBIR consultant; resubmission with reviewer feedback; parallel non-dilutive sources |
| 12 | Co-founder governance dispute post-equity grant | Strategic disagreement, departure, IP dispute | Strong founders' agreement with vesting + acceleration triggers + IP assignment; attorney-drafted |
| 13 | Patent infringement claim from incumbent | Tobii or PRC-Saltillo asserts patents on AAC UX or SGD architecture | Provisional patents create defensive position; FTO opinion before commercial launch (~$15–30K) |

Top three to actively manage: **#1 (existential), #2 (co-founder), #3 (runway)**. Mitigation plans for the rest are deferred until signals appear.

---

## 16. 12-month operational sequence

### Months 1–3: Discovery + co-founder hunt + demo polish (parallel)

- 25 customer-discovery interviews (20 ICU + 5 pivot-domain probes)
- 8–12 co-founder first coffees via warm intros
- 60-second voice-clone demo + full-pilot demo with locked feature set
- First provisional patent filed (within 60 days)
- Boston patent attorney engaged
- Pre-MGB-Innovation informational coffee
- Honest monthly runway tracking
- SBIR consultant identified

### Day 90 decision gate

Read discovery memo against kill criterion. Strong positive → incorporate. Mixed → extend. Strong negative → pivot.

### Months 4–6: Formalization + IRB draft (assuming positive gate)

- Boston healthcare-startup attorney engaged (Goodwin, Foley Hoag, Mintz, or WilmerHale)
- Delaware C-corp incorporation; founder restricted stock + 83(b) elections
- Clinical co-founder onboarded: equity grant, vesting, MGB COI disclosure, founders' agreement, IP assignment
- IRB protocol drafted: primary aim sharpened toward SICG-via-AAC feasibility
- STTR Phase I proposal drafted
- iHub application if timing aligns
- 2–3 more provisional patents filed
- Premium-voice-cloning wholesale pricing negotiation

### Months 7–12: Pilot + funding

- IRB approval (typical 8–12 weeks)
- BWH first-unit pilot launched (free 30-day → annual subscription)
- STTR Phase I award (typical month 9–12)
- MGB Innovation Discovery Grant (if iHub path active)
- 5–10 anonymized customer-discovery patient cases for case-study material
- Conferences: AACN NTI, SCCM, AAHPM
- Begin second-site recruitment
- Year 1 closing position: 1–3 paid units, $10–30K ARR, IRB study running, 2–3 patents filed, STTR funded, co-founder fully engaged

---

## 17. Deferred decisions

These are deliberately left open because answering them prematurely without the relevant signal would just create commitments to revisit:

- Geographic expansion sequence after Boston (Penn / Hopkins / UPMC / NYC / Bay Area)
- International expansion trigger and partner shape
- IRB study primary-aim sharpening (happens with co-founder)
- Discovery interview script details beyond the v1 in `docs/discovery/2026-05-06-discovery-interview-script.md`
- Detailed mitigation plans for risks #4–#13
- Homepage rebuild specifics beyond the abbreviated Business Opportunity section

---

## 18. Glossary and references

- **AAC** — Augmentative and Alternative Communication
- **HRO** — High Reliability Organization
- **SICG** — Serious Illness Conversation Guide (Ariadne Labs)
- **PADIS** — Pain, Agitation/Sedation, Delirium, Immobility, Sleep guidelines (SCCM)
- **A2F Bundle** — ICU Liberation Bundle: Assess pain, Both SAT/SBT, Choice of analgesia, Delirium, Early mobility, Family engagement
- **STTR** — Small Business Technology Transfer (SBIR variant requiring small-business + research-institution partnership)
- **SGD** — Speech Generating Device (FDA product code NRR, 21 CFR 890.3700, Class II)
- **HCPCS E2500–E2511** — Medicare/Medicaid billing codes for SGDs
- **MGB Innovation** — Mass General Brigham's commercialization arm (formerly Partners Innovation)
- **iHub** — MGB Innovation's digital-health incubator program
- **ECS** — Ease of Communication Scale (Happ et al., 2004, 2014; patient-reported primary outcome in `ownvoice-research-plan.md`)
- **VIS** — Voice Identity Scale (custom instrument proposed in `ownvoice-research-plan.md`)

Adjacent project documents:
- `docs/PRD.md` — full product requirements (§12 Business Model section reflects this strategy)
- `docs/ownvoice-research-plan.md` — IRB-ready research plan, the basis for the BWH study and STTR Specific Aims
- `docs/discovery/2026-05-06-discovery-interview-script.md` — discovery script and probe inventory for the 90-day discovery phase
- `docs/BIBLIOGRAPHY.md` — full audited bibliography of cited literature
