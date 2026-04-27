# Patient Framing Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace trait-label "nonverbal" with state-and-cause framing across all OwnVoice documentation, so the project no longer describes its target patients by what they can't do.

**Architecture:** Pure prose change. Hand-edit each occurrence (~31 across 4 files) using academic-register replacements; verify by grep. The bibliography retains "nonverbal" only inside cited paper titles — OwnVoice's own framing of those works is rewritten. No code changes; no tests beyond grep verification.

**Tech Stack:** Markdown. The "test" for each task is a `grep -ci "nonverbal\|non-verbal"` count check.

**Spec:** `docs/superpowers/specs/2026-04-27-homepage-design.md` §9

---

## Replacement vocabulary

Use these phrases. Do not pick one and apply globally — rotate to fit context. Stilted prose ("patients without functional speech who cannot speak") fails the spirit of the change.

| Context | Recommended phrase |
|---|---|
| Title-case heading or paper-title style | "ICU Patients Without Functional Speech" or "Patients Who Cannot Speak" |
| Body prose, formal/academic | "patients without functional speech" |
| Body prose, less formal | "patients who cannot speak" / "patients temporarily unable to speak" |
| Cause-naming context | "patients who cannot speak — typically post-tracheostomy, post-intubation, or post-stroke" |
| Eligibility language | "AAC-eligible patients" / "AAC-eligible ICU patients" |
| Adverbial uses ("nonverbal administration", "nonverbally") | "administration to patients without functional speech" / "via AAC" |
| Inclusion-criteria use ("nonverbal due to X") | "without functional speech due to X" |
| Duration use ("nonverbal period") | "period without functional speech" |

**Reject:** "speech-impaired patients" (medicalizes), "voiceless patients" (has the same trait-label problem), "muted patients."

---

## File structure

| File | Occurrences | Action |
|---|---|---|
| `docs/DESIGN_GUIDELINES.md` | 2 | Rewrite all → final count 0 |
| `docs/PRD.md` | 4 | Rewrite all → final count 0 |
| `docs/BIBLIOGRAPHY.md` | 3 | Rewrite OwnVoice's own framing (2); preserve cited paper title (1) → final count 1 |
| `docs/ownvoice-research-plan.md` | 22 | Rewrite all → final count 0 |

**Total final count across 4 files: 1** (the preserved paper title in BIBLIOGRAPHY.md line 108).

---

### Task 1: Rewrite `docs/DESIGN_GUIDELINES.md`

**Files:**
- Modify: `docs/DESIGN_GUIDELINES.md` (lines 35, 393)

- [ ] **Step 1: Confirm starting count**

```bash
grep -ci "nonverbal\|non-verbal" docs/DESIGN_GUIDELINES.md
```
Expected: `2`

- [ ] **Step 2: Edit line 35**

Find:
```
- **Loss of identity.** Being non-verbal in an institution strips away personhood. The patient's own voice speaking through the app directly addresses this loss.
```

Replace with:
```
- **Loss of identity.** Being unable to speak in an institutional setting strips away personhood. The patient's own voice speaking through the app directly addresses this loss.
```

- [ ] **Step 3: Edit line 393**

Find:
```
- No login or authentication for the patient. Authentication barriers are incompatible with a non-verbal patient.
```

Replace with:
```
- No login or authentication for the patient. Authentication barriers are incompatible with a patient who cannot speak.
```

- [ ] **Step 4: Verify count is 0**

```bash
grep -ci "nonverbal\|non-verbal" docs/DESIGN_GUIDELINES.md
```
Expected: `0`

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN_GUIDELINES.md
git commit -m "docs(framing): rewrite 'nonverbal' in DESIGN_GUIDELINES.md

Use state-and-cause language ('unable to speak', 'patient who cannot
speak') instead of the trait label."
```

---

### Task 2: Rewrite `docs/PRD.md`

**Files:**
- Modify: `docs/PRD.md` (lines 34, 286, 290, 316)

- [ ] **Step 1: Confirm starting count**

```bash
grep -ci "nonverbal\|non-verbal" docs/PRD.md
```
Expected: `4`

- [ ] **Step 2: Edit line 34**

Find:
```
### Primary: Non-verbal patients in acute care
```

Replace with:
```
### Primary: Patients in acute care who cannot speak
```

- [ ] **Step 3: Edit line 286**

Find:
```
OwnVoice integrates the Serious Illness Conversation Guide (SICG) from Ariadne Labs (Brigham and Women's Hospital / Harvard T.H. Chan School of Public Health, in collaboration with Dana-Farber Cancer Institute) to give nonverbal patients a voice in the most consequential conversations about their care. The SICG is licensed under CC-BY-NC-SA 4.0.
```

Replace with:
```
OwnVoice integrates the Serious Illness Conversation Guide (SICG) from Ariadne Labs (Brigham and Women's Hospital / Harvard T.H. Chan School of Public Health, in collaboration with Dana-Farber Cancer Institute) to give patients without functional speech a voice in the most consequential conversations about their care. The SICG is licensed under CC-BY-NC-SA 4.0.
```

- [ ] **Step 4: Edit line 290**

Find:
```
**The problem OwnVoice addresses:** Existing AAC tools focus on immediate physical needs — water, pain, bathroom, medication. None address the deeper communication layer: a patient's values, goals, fears, hopes, and treatment preferences. A nonverbal patient in the ICU is excluded from the most important conversation of their life. Their autonomy — the right to decide what happens to their own body — is functionally erased. Not because anyone intends it, but because the communication tools don't exist.
```

Replace with:
```
**The problem OwnVoice addresses:** Existing AAC tools focus on immediate physical needs — water, pain, bathroom, medication. None address the deeper communication layer: a patient's values, goals, fears, hopes, and treatment preferences. An ICU patient who cannot speak is excluded from the most important conversation of their life. Their autonomy — the right to decide what happens to their own body — is functionally erased. Not because anyone intends it, but because the communication tools don't exist.
```

- [ ] **Step 5: Edit line 316**

Find:
```
- **Not an advance directive.** This feature is a communication tool, not a legal document. It helps a nonverbal patient participate in goals-of-care conversations. Formal advance directives, POLST forms, and healthcare proxy decisions remain separate legal processes.
```

Replace with:
```
- **Not an advance directive.** This feature is a communication tool, not a legal document. It helps a patient who cannot speak participate in goals-of-care conversations. Formal advance directives, POLST forms, and healthcare proxy decisions remain separate legal processes.
```

- [ ] **Step 6: Verify count is 0**

```bash
grep -ci "nonverbal\|non-verbal" docs/PRD.md
```
Expected: `0`

- [ ] **Step 7: Commit**

```bash
git add docs/PRD.md
git commit -m "docs(framing): rewrite 'nonverbal' in PRD.md

Use state-and-cause language across the primary-audience section,
SICG description, and goals-of-care framing."
```

---

### Task 3: Rewrite `docs/BIBLIOGRAPHY.md`

**Files:**
- Modify: `docs/BIBLIOGRAPHY.md` (lines 94, 112; preserve line 108)

This file requires care: line 108 is a heading that mirrors a published paper's title and stays as-is. Lines 94 and 112 are OwnVoice's own framing of papers and get rewritten.

- [ ] **Step 1: Confirm starting count**

```bash
grep -ci "nonverbal\|non-verbal" docs/BIBLIOGRAPHY.md
```
Expected: `3`

- [ ] **Step 2: Read the file once to confirm context around each line**

Read lines 90–120 of `docs/BIBLIOGRAPHY.md` and confirm:
- Line 94 is OwnVoice describing what the CSRI is for (rewrite).
- Line 108 is a section heading mirroring a published paper title (preserve).
- Line 112 is OwnVoice summarizing a paper's findings in OwnVoice's own voice (rewrite).

If any of those three are not as described, stop and ask before editing.

- [ ] **Step 3: Edit line 94**

Find:
```
**Finding:** SPEACS-2 identified frequency categories of nurse-patient ICU communication: pain reporting, physical needs (water, repositioning, bathroom), emotional expression, and questions about care plans. Communication attempts were often unsuccessful due to tool limitations. The study developed the Communication Satisfaction Rating Instrument (CSRI) for nonverbal ICU patients.
```

Replace with:
```
**Finding:** SPEACS-2 identified frequency categories of nurse-patient ICU communication: pain reporting, physical needs (water, repositioning, bathroom), emotional expression, and questions about care plans. Communication attempts were often unsuccessful due to tool limitations. The study developed the Communication Satisfaction Rating Instrument (CSRI) for ICU patients without functional speech.
```

- [ ] **Step 4: Edit line 112**

Find:
```
**Finding:** Nonverbal ventilated patients describe their experience as a "silent, slow lifeworld" — marked by lost agency, time distortion, difficulty initiating communication, and emotional isolation. Patients reported that the inability to express emotions was as distressing as the inability to report physical symptoms.
```

Replace with:
```
**Finding:** Ventilated patients without functional speech describe their experience as a "silent, slow lifeworld" — marked by lost agency, time distortion, difficulty initiating communication, and emotional isolation. Patients reported that the inability to express emotions was as distressing as the inability to report physical symptoms.
```

- [ ] **Step 5: Verify count is 1 (preserved paper title)**

```bash
grep -ci "nonverbal\|non-verbal" docs/BIBLIOGRAPHY.md
```
Expected: `1`

```bash
grep -n "nonverbal\|non-verbal" docs/BIBLIOGRAPHY.md
```
Expected: `108:### The Lived Experience of Nonverbal Ventilated Patients`

If any other line still matches, you missed an edit. Fix it.

- [ ] **Step 6: Commit**

```bash
git add docs/BIBLIOGRAPHY.md
git commit -m "docs(framing): rewrite OwnVoice's framing in BIBLIOGRAPHY.md

Cited paper title at line 108 ('The Lived Experience of Nonverbal
Ventilated Patients') is preserved as-is. Two other occurrences
that are OwnVoice's own framing of the cited works are rewritten."
```

---

### Task 4: Rewrite `docs/ownvoice-research-plan.md`

**Files:**
- Modify: `docs/ownvoice-research-plan.md` (22 occurrences across 21 lines: 1, 11, 29, 31, 43, 53, 87, 91, 101, 104, 124, 152, 159, 160, 276, 304, 329, 380, 382, 393, 395, 407)

This is the largest task. Edits are line-by-line with academic-register replacements. Below are the specific replacements; apply each.

Note: Line 152 contains TWO occurrences in one line — both must be replaced.

- [ ] **Step 1: Confirm starting count**

```bash
grep -ci "nonverbal\|non-verbal" docs/ownvoice-research-plan.md
```
Expected: `22`

- [ ] **Step 2: Apply each edit below**

For each line, find the exact text shown and replace it.

**Line 1 (title):**

Find: `# OwnVoice: On-Device Voice-Cloning AAC with Goals-of-Care Integration for Nonverbal ICU Patients`

Replace: `# OwnVoice: On-Device Voice-Cloning AAC with Goals-of-Care Integration for ICU Patients Without Functional Speech`

**Line 11 (abstract — two phrases on one line, both `nonverbal patients`):**

Find: `for nonverbal ICU patients using on-device voice cloning`

Replace: `for ICU patients without functional speech, using on-device voice cloning`

Then in the same line, find: `tablet-based SICG conversations with nonverbal patients`

Replace: `tablet-based SICG conversations with patients without functional speech`

**Line 29 (heading):**

Find: `### 2.3 Goals-of-Care Conversations with Nonverbal Patients`

Replace: `### 2.3 Goals-of-Care Conversations with Patients Who Cannot Speak`

**Line 31:**

Find: `whether structured goals-of-care conversations can be conducted effectively with nonverbal patients using AAC technology.`

Replace: `whether structured goals-of-care conversations can be conducted effectively with patients without functional speech, using AAC technology.`

**Line 43:**

Find: `compared to standard-of-care AAC methods in nonverbal ICU patients.`

Replace: `compared to standard-of-care AAC methods in ICU patients without functional speech.`

**Line 53:**

Find: `the feasibility and clinical utility of conducting SICG-structured goals-of-care conversations with nonverbal ICU patients via OwnVoice.`

Replace: `the feasibility and clinical utility of conducting SICG-structured goals-of-care conversations with ICU patients without functional speech, via OwnVoice.`

**Line 87:**

Find: `adequate patient volume of nonverbal patients`

Replace: `adequate volume of AAC-eligible patients`

**Line 91:**

Find: `Patient participation: duration of nonverbal ICU stay (typically 2–14 days).`

Replace: `Patient participation: duration of ICU stay without functional speech (typically 2–14 days).`

**Line 101:**

Find: `- Nonverbal due to endotracheal intubation, tracheostomy, or other condition preventing functional speech`

Replace: `- Without functional speech due to endotracheal intubation, tracheostomy, or other qualifying condition`

**Line 104:**

Find: `- Expected nonverbal period ≥ 24 hours`

Replace: `- Expected period without functional speech ≥ 24 hours`

**Line 124:**

Find: `The consent process will accommodate nonverbal communication (written, gestural, or AAC-assisted).`

Replace: `The consent process will accommodate non-spoken communication (written, gestural, or AAC-assisted).`

**Line 152 (two occurrences in one line):**

Find: `a validated 16-item instrument for nonverbal ICU patients. Administered at 24 hours post-enrollment and at ICU discharge or return of speech (whichever is first). The CSRI is designed for nonverbal administration using a visual analog response format.`

Replace: `a validated 16-item instrument for ICU patients without functional speech. Administered at 24 hours post-enrollment and at ICU discharge or return of speech (whichever is first). The CSRI is designed for administration to patients without functional speech, using a visual analog response format.`

**Line 159:**

Find: `Adapted for nonverbal administration with AAC.`

Replace: `Adapted for administration via AAC.`

**Line 160:**

Find: `Semi-structured interviews conducted after return of speech or via OwnVoice if still nonverbal.`

Replace: `Semi-structured interviews conducted after return of speech, or via OwnVoice if the patient still cannot speak.`

**Line 276:**

Find: `reason for nonverbal status (intubation vs. tracheostomy vs. neurological)`

Replace: `cause of impaired speech (intubation vs. tracheostomy vs. neurological)`

**Line 304:**

Find: `### 10.2 Consent for Nonverbal Patients`

Replace: `### 10.2 Consent for Patients Who Cannot Speak`

**Line 329:**

Find: `Critically ill nonverbal patients are a vulnerable population.`

Replace: `Critically ill patients without functional speech are a vulnerable population.`

**Line 380:**

Find: `2. **First application** of the Serious Illness Conversation Guide with nonverbal ICU patients via AAC technology, with feasibility and effectiveness data.`

Replace: `2. **First application** of the Serious Illness Conversation Guide with ICU patients who cannot speak, via AAC technology, with feasibility and effectiveness data.`

**Line 382:**

Find: `4. **Open-source validated instruments** for measuring voice identity preservation and communication satisfaction in nonverbal ICU populations.`

Replace: `4. **Open-source validated instruments** for measuring voice identity preservation and communication satisfaction in ICU populations without functional speech.`

**Line 393 (table row, two occurrences):**

Find: `| Nonverbal patient self-report may be unreliable | Use of validated instruments designed for nonverbal populations; triangulation with nursing assessments and observational data |`

Replace: `| Self-report from patients without functional speech may be unreliable | Use of validated instruments designed for these populations; triangulation with nursing assessments and observational data |`

**Line 395 (table row):**

Find: `| Short ICU stays may limit exposure | Inclusion criterion of ≥24 hours nonverbal period; subgroup analysis by exposure duration |`

Replace: `| Short ICU stays may limit exposure | Inclusion criterion of ≥24 hours without functional speech; subgroup analysis by exposure duration |`

**Line 407:**

Find: `- **Goals-of-care manuscript:** My Wishes feasibility, SICG adaptation for nonverbal patients, and care plan impact. Target: Journal of Palliative Medicine or JAMA Internal Medicine.`

Replace: `- **Goals-of-care manuscript:** My Wishes feasibility, SICG adaptation for patients who cannot speak, and care plan impact. Target: Journal of Palliative Medicine or JAMA Internal Medicine.`

- [ ] **Step 3: Verify count is 0**

```bash
grep -ci "nonverbal\|non-verbal" docs/ownvoice-research-plan.md
```
Expected: `0`

If any occurrences remain, list them and fix:

```bash
grep -n "nonverbal\|non-verbal" docs/ownvoice-research-plan.md
```

- [ ] **Step 4: Re-read the document for tone**

Open `docs/ownvoice-research-plan.md` and skim the abstract, §2.3, §3, §4, §5 (inclusion criteria), §10 (ethics), §11 (limitations). Confirm:
- Sentences flow; no awkward repetition of "without functional speech" in adjacent sentences.
- Academic register is preserved.
- No replacement reads as more clinical/jargon-heavy than the original "nonverbal."

If anything reads stiff, soften by varying phrasing using the vocabulary table at the top of this plan (e.g., switch "without functional speech" to "who cannot speak" or "AAC-eligible" where it sounds less repetitive). Make the edit.

- [ ] **Step 5: Commit**

```bash
git add docs/ownvoice-research-plan.md
git commit -m "docs(framing): rewrite 'nonverbal' in ownvoice-research-plan.md

22 occurrences rewritten with academic-register replacements
('without functional speech', 'who cannot speak', 'AAC-eligible')
varied by context. Title, abstract, aims, inclusion criteria,
analysis plan, ethics, and risks/limitations sections all updated."
```

---

### Task 5: Final project-wide verification

**Files:**
- No edits. Pure verification.

- [ ] **Step 1: Confirm only the preserved paper title remains**

```bash
grep -rn "nonverbal\|non-verbal" --include="*.md" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v dist | grep -v coverage | grep -v ".superpowers/"
```

Expected (single line):
```
docs/BIBLIOGRAPHY.md:108:### The Lived Experience of Nonverbal Ventilated Patients
```

If any other line appears, identify the file and either:
- It's another OwnVoice doc → rewrite using the vocabulary table, then re-run this check.
- It's a code file → unexpected (we verified at plan-write time there were no code occurrences); investigate before editing.

- [ ] **Step 2: Confirm grep finds nothing in app source code**

```bash
grep -rn "nonverbal\|non-verbal" src/ public/ 2>/dev/null
```
Expected: no output (empty result).

- [ ] **Step 3: Update memory entry to reflect completed sweep**

Edit `/Users/mark/.claude/projects/-Users-mark-IdeaProjects-ownvoice/memory/feedback_patient_framing.md`:

In the "How to apply" paragraph, replace:
```
Existing occurrences (~31 across docs, 2026-04-27) should be migrated as part of homepage work or whenever encountered.
```

with:
```
Existing occurrences were migrated 2026-04-27 across docs/PRD.md, docs/ownvoice-research-plan.md, docs/BIBLIOGRAPHY.md (one paper-title occurrence preserved), and docs/DESIGN_GUIDELINES.md. Catch any new occurrences at PR review.
```

- [ ] **Step 4: Commit memory update**

```bash
git -C ~/.claude/projects/-Users-mark-IdeaProjects-ownvoice/memory diff
```
(If that path is not a git repo, skip the git step — just save the file. The memory directory may not be tracked.)

If it is a git repo:
```bash
cd ~/.claude/projects/-Users-mark-IdeaProjects-ownvoice/memory
git add feedback_patient_framing.md
git commit -m "memory: mark project-wide nonverbal sweep complete"
cd -
```

- [ ] **Step 5: Final summary**

Print to terminal:
```
Patient framing rewrite complete.
- 4 doc files edited
- 30 occurrences rewritten (22 in research plan, 4 PRD, 2 design guidelines, 2 of 3 in bibliography)
- 1 occurrence preserved (BIBLIOGRAPHY.md:108, cited paper title)
- 0 occurrences remaining in OwnVoice's own prose
```

No further commit. Plan A complete.

---

## Notes for the executing engineer

- **Read the full file before editing**, even though this plan gives you exact line numbers. Other contributors may have moved lines since the plan was written. If the line content shown in this plan does not match what's on the named line, search the file for the *content* and edit it where it actually lives.
- **Tone matters.** A find-and-replace that produces "patients without functional speech who can't communicate" because two adjacent sentences both got the same replacement is a regression, not a fix. After Task 4, the re-read step (Step 4) is non-optional.
- **Do not modify** `docs/superpowers/specs/2026-04-27-homepage-design.md` itself even though §9 of that spec lists "nonverbal" — the spec is documenting the rule, not violating it.
- **Do not modify** files outside `docs/`. The earlier audit confirmed no source-code or string-table occurrences. The Task 5 verification re-confirms this; if it fails, investigate before editing.
