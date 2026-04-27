# Homepage Design

**Status:** Draft for review
**Date:** 2026-04-27
**Scope:** Add an informational homepage at `ownvoice.icu` (`/`) and a research-plan page (`/research`); move the existing PWA to `/app`. Reframe the patient population project-wide. Add a demo entry point that pre-seeds the app with a sample voice for evaluation.

---

## 1. Summary

OwnVoice currently exposes the PWA at `/`. Researchers, IRB reviewers, and academic collaborators landing on `ownvoice.icu` need a homepage that explains the project before they decide to evaluate it. This spec adds two routes — `/` (homepage) and `/research` (full research plan) — and moves the existing app to `/app`. The homepage primary audience is academic researchers; secondary (later) is hospital decision-makers, then bedside clinicians and families.

The hero is problem-led: it opens with a citation-backed statistic on ICU communication failure, then names what OwnVoice is in one sentence. The page summarizes the system, the study aims, the on-device privacy posture, and references; the dense research plan is rendered separately at `/research` from the existing `docs/ownvoice-research-plan.md`. Two CTAs hand researchers off to the app: "Try a demo" pre-seeds a Demo Patient using `sample-voices/mark-voice.m4a`; "Set up a real session" runs the existing first-run flow.

This spec also includes a project-wide framing change: patients are not described as "nonverbal." They are described by state and cause — typically "currently unable to speak due to a tracheostomy." The change applies to homepage copy AND to existing source documents (~31 occurrences across `docs/PRD.md`, `docs/ownvoice-research-plan.md`, `docs/BIBLIOGRAPHY.md`, `docs/DESIGN_GUIDELINES.md`).

## 2. Context and motivation

### 2.1 Deployment context

Domain `ownvoice.icu` is registered. Cloudflare Pages is the deployment target. There are no existing users with bookmarks or installed PWAs; the app does not yet live on the public internet. We can rearrange routes without migration concern.

### 2.2 Why a homepage

The PRD and the research plan exist as Markdown in the repo; arXiv submission is the next step for the research plan. A web presence at the bare URL serves three purposes, in order:
1. Anyone receiving the link can read what OwnVoice is and what the study claims, without cloning the repo.
2. The live PWA at `/app` becomes a credibility artifact a reader can try in 30 seconds.
3. Future stakeholders (hospitals, clinicians, journalists, funders) can be sent to a single canonical URL.

The "marketing vs. research proposal" tension resolves by audience priority: this homepage is built for a researcher first. Marketing tone follows when audience B (hospital decision-makers) becomes the primary reader.

### 2.3 What needs to change

- Routing: introduce `/`, `/research`, and `/app`. Today the app is at `/`.
- Build: split into two Vite entries so the homepage isn't bundled with the app's heavy ML dependencies.
- Service worker: narrow scope from `/` to `/app/`. PWA `start_url` becomes `/app/`. Headers (COOP/COEP) only apply to `/app/*`.
- App: add a demo-mode entry that bypasses Setup using a pre-extracted speaker embedding from `sample-voices/mark-voice.m4a`.
- Docs: project-wide replace "nonverbal" with state-and-cause framing.

## 3. Audience and tone

| Audience | Priority | What they want from `/` |
|---|---|---|
| Academic researchers / IRB reviewers / collaborators | **Primary (now)** | Citations, hypotheses, method summary, study status, link to full research plan, working demo |
| Hospital decision-makers (CNOs, patient experience, bio-IT) | Secondary (later) | Problem framing, privacy/HIPAA-by-design, deployment story, evidence of safety |
| Bedside clinicians and families | Tertiary (later) | Warmth, "what does it feel like," "open the app" |

Tone is academic-leaning: third-person, citation-grounded, restrained. We earn trust through specificity (numbers, model names, study aims), not enthusiasm. Visual style is hybrid (§7): editorial typography (system-sans body, generous whitespace) with the app's accent colors retained for buttons and CTAs to keep brand continuity.

## 4. Routes and architecture

### 4.1 Routes

| URL | Renders | Service worker | COOP/COEP | Notes |
|---|---|---|---|---|
| `/` | Homepage (this spec) | none | none | Static; lightweight; no ML deps |
| `/research` | Full research plan | none | none | Markdown-rendered from `docs/ownvoice-research-plan.md` |
| `/app/` | Existing PWA (unchanged behavior) | scoped to `/app/` | yes | Existing experience |
| `/app/?demo=1` | PWA in demo mode (this spec) | scoped to `/app/` | yes | Bypasses Setup with seeded patient |

### 4.2 Build structure

Vite multi-entry build. Two HTML entries with separate JS roots so the homepage does not bundle the model manager, ONNX runtime, or worker code.

```
/
  index.html              ← homepage entry; refs /src/main-homepage.tsx
  app/
    index.html            ← app entry; refs /src/main-app.tsx
  src/
    main-homepage.tsx     ← new: mounts <HomepageApp /> with router
    main-app.tsx          ← renamed from main.tsx; mounts existing <App />
    homepage/             ← new: homepage components and routes
      HomepageApp.tsx
      pages/Home.tsx
      pages/Research.tsx
      sections/Hero.tsx
      sections/TheProblem.tsx
      sections/TheSystem.tsx
      sections/StudyAtAGlance.tsx
      sections/OnDeviceAndPrivacy.tsx
      sections/References.tsx
      sections/CTA.tsx
      sections/Footer.tsx
      mdx/research-plan.md.tsx  ← imports docs/ownvoice-research-plan.md
      theme.ts              ← homepage typography tokens
    (existing app code under src/ stays where it is)
  public/
    sw.js                 ← unchanged file path; scope changes via registration
    app/
      (existing public/ contents move into /app/ scope on Cloudflare via routing)
```

### 4.3 Routing inside the homepage entry

Two pages (`/` and `/research`) plus the redirect target. Use **`preact-iso`** (~2 KB, official Preact router) rather than rolling our own. No nested routes, no params; `preact-iso` is overkill-resistant here but it's the path of least surprise for a future contributor.

Inside the app entry there is no router — `/app/` and `/app/?demo=1` both render `<App />`; the demo seeding is a boot-time effect (§6).

### 4.4 Why two entries instead of one router across everything

The app's main bundle pulls in `onnxruntime-web`, `@huggingface/transformers`, model worker shells, OPFS code, and a service worker. None of that should load when a researcher is reading `/research`. Two entries keep the homepage payload small (target: <100 KB JS gzip) and let Cloudflare cache the homepage aggressively without coupling its cache lifetime to app deploys.

### 4.5 Service worker scoping

The current `index.html` registers `/sw.js` unconditionally. The new behavior:

- The homepage entry **does not** register a service worker.
- The app entry registers `/sw.js` with `{ scope: "/app/" }`. This requires the Cloudflare response for `/sw.js` to include `Service-Worker-Allowed: /app/`.
- `public/sw.js` updates its `urlsToCache` to `/app/`, `/app/index.html`, asset paths under `/app/assets/`, and `/app/models-manifest.json`. The `/models/*` OPFS proxy logic continues unchanged.
- `public/manifest.json` updates `start_url` from `/` to `/app/` and `scope` to `/app/`.

### 4.6 Cloudflare configuration

`public/_headers` (Cloudflare Pages convention):

```
/sw.js
  Service-Worker-Allowed: /app/

/app/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

`public/_redirects`:

```
/app    /app/   301
```

(One-line redirect so `/app` without trailing slash still works.)

No COOP/COEP on the homepage path. The homepage is free to embed Plausible-style analytics, third-party fonts via standard CDNs, etc. without restriction.

## 5. Homepage content (`/`)

Eight blocks total, in this order:

1. **Hero** — problem-led. Headline: *"Roughly 33% of ICU patients can't speak. They use AAC only 11% of the time."* Subhead: *"OwnVoice is a browser-based AAC application for ICU patients who are temporarily unable to speak — typically due to tracheostomy, intubation, or post-surgical recovery. On-device voice cloning, validated pain assessment, structured goals-of-care."* Three CTAs: **Try a demo** (`/app/?demo=1`), **Set up a real session** (`/app/`), **Read the research plan** (`/research`).
2. **§1 The problem** — three stat cards (~33% AAC candidacy, 11% AAC use during stay, 35% staff difficulty), each with citation. One-line connecting prose.
3. **§2 The system** — four-pillar grid: Personal voice (Chatterbox Multilingual, 23 languages), Pain assessment (Emoji-FPS), Goals of care (SICG), Listen (Whisper STT). Each ~2 sentences with model/citation.
4. **§3 Study at a glance** — five aims (one line each), study type ("prospective, single-center, mixed-methods clinical validation"), status: **"Protocol drafted; not yet IRB-submitted."** Link to `/research`.
5. **§4 On-device & privacy** — privacy-by-design paragraph (PHI never leaves device, WebGPU + ONNX Runtime Web, app is a URL).
6. **§5 References & citing this work** — selected citations with hanging indents, BibTeX block to cite OwnVoice, GitHub link, full bibliography link.
7. **CTA strip** — repeats Try a demo / Set up a real session, with device-support note ("Best on iPad Pro M5/M4 with Safari 26+; works in Chrome/Edge/Firefox for evaluation").
8. **Footer** — version, "Not for clinical use without validation," GitHub, research plan, privacy.

All copy uses the new patient-framing rule (§9). No "nonverbal" anywhere on the homepage.

## 6. Demo mode (`/app/?demo=1`)

### 6.1 What the researcher sees

A fully-configured app within ~3 seconds of clicking "Try a demo." Patient is "Demo (Mark)" with `sample-voices/mark-voice.m4a` as the voice sample. Default English locale. One default provider ("Care Team") with no voice. ICU phrase library loaded. A small unobtrusive banner: *"You're trying a demo. Settings → Reset to start fresh."*

### 6.2 Demo seed data

The encoder pipeline (Chatterbox Multilingual speech encoder → 192-dim x-vector + condEmb + promptToken) is heavy to run client-side at boot. Pre-extract once:

- **Extraction tool** (preferred path: in-browser dev page; fallback: Node script): the Chatterbox Multilingual speech encoder runs through ONNX Runtime. The browser path uses the same code already in the app's Setup flow — we add a hidden `/app/?extract-demo` route that loads `sample-voices/mark-voice.m4a`, runs encoding, and downloads the resulting `SpeakerData` as JSON for the developer to commit. A Node-side `scripts/extract-demo-voice.ts` using `onnxruntime-node` is also viable if we want this in CI; default to the in-browser approach to avoid dual-runtime maintenance.
- The output is `public/demo/speakerdata.json` containing the serialized `SpeakerData` (condEmb, promptToken, speakerEmbeddings, speakerFeatures), plus a `modelVersion` field naming which TTS model produced it.
- The JSON is committed. It is regenerated whenever the TTS model changes (i.e., another swap like PR #111). Boot-time check (§6.3) compares `modelVersion` against the active model and falls back to running encoder at boot if mismatched.
- At runtime, demo mode `fetch("/demo/speakerdata.json")` and hydrates the settings store with a `Patient` whose `speakerData` is loaded.

### 6.3 Boot sequence in demo mode

`App.tsx` already has a setup gate: `if (!cfg || cfg.patients.length === 0 || cfg.activePatientId === null)` returns `<Setup />`. Demo mode runs **before** that gate:

```
useEffect: detect ?demo=1 in URL
  if (no demo patient already in IDB) {
    fetch /demo/speakerdata.json
    settingsStore.addPatient({
      name: "Demo (Mark)",
      bed: "—",
      patientLang: "en",
      caregiverLang: "en",
      speakerData: <fetched>,
      isDemo: true,
    })
    settingsStore.setActivePatient(<id>)
  }
```

The demo patient is persisted in IDB the same way real patients are. It's tagged `isDemo: true` on the `Patient` type so the banner can render conditionally. `resetAll()` wipes it like everything else.

### 6.4 Coexistence with real patients

If a researcher first tries the demo and later sets up a real patient, both exist in `cfg.patients`. The Switch sheet shows both. The demo can be removed via Settings → Patients → Remove like any other. Demo mode does NOT auto-recreate the demo patient if one already exists in IDB; the URL flag is honored only on first demo-mode entry.

### 6.5 What demo mode does NOT do

- Does not auto-record any speech, send any data, or surface any "demo limitations" beyond the banner.
- Does not modify or hide existing app behavior. The provider list, audio cache pre-generation, voice cloning paths all run identically.
- Does not require connectivity beyond the initial download (same as real-patient mode).

## 7. Visual style

Hybrid of academic editorial and OwnVoice brand:
- **Body type**: system-sans (San Francisco / Segoe UI / Inter fallback) at ~17px, 1.55 line-height. Generous whitespace; max body-width ~680 px.
- **Headings**: same family, weight 600. Section labels in small-caps with 2 px letter-spacing.
- **Color**: app's existing dark slate (`#0f172a`) for hero background and primary buttons. Stone neutrals (`#fafaf8` / `#1c1917`) for body and secondary surfaces. Accent reserved for inline links and the "Try a demo" CTA.
- **No Atkinson Hyperlegible on the homepage** — that font lives in the patient-facing app where its legibility benefits are needed. Homepage uses system stacks for fast rendering and editorial feel.
- **Hairline rules** between sections (1 px `#e7e5e4`).

A `src/homepage/theme.ts` module exports a `homepageTokens` object mirroring the structure of the existing `src/theme/`, keeping homepage styling visually distinct without forking the design system.

## 8. Research page (`/research`)

Renders `docs/ownvoice-research-plan.md` through an MDX-or-equivalent loader (`@mdx-js/preact` with `vite-plugin-mdx`, or `vite-plugin-md`). The exact plugin choice is implementation; the requirement is: source of truth is the markdown file in `docs/`, edits to that file are reflected at `/research` automatically on next build, citations and links work, and headings render with anchor IDs (so external links can deep-link).

Reading-friendly typography (matches §7), a sticky table of contents on wider viewports, citation links rendered as superscripts with hover or click expansions to the bibliography. The bibliography itself either inlines from `docs/BIBLIOGRAPHY.md` or links out to it.

The research plan currently uses "nonverbal patients" 22 times. Per §9, that markdown file is rewritten as part of this work; `/research` will render the rewritten version.

## 9. Project-wide patient framing

Replace trait-label "nonverbal" with state-and-cause framing across all prose. The user has explicitly approved a project-wide rewrite.

| File | Occurrences | Notes |
|---|---|---|
| `docs/ownvoice-research-plan.md` | 22 | Heaviest. Keep academic register; substitute phrase-by-phrase, not always with the same replacement. |
| `docs/PRD.md` | 4 | |
| `docs/BIBLIOGRAPHY.md` | 3 | Probably citation titles; only rewrite OwnVoice's own framing of those works, not the original titles. |
| `docs/DESIGN_GUIDELINES.md` | 2 | |

Replacement vocabulary (rotate to fit context, don't pick one and replace globally):
- "patients who are temporarily unable to speak"
- "patients without the ability to speak"
- "ICU patients who cannot speak — typically post-tracheostomy, post-intubation, or post-stroke"
- "AAC-eligible ICU patients"
- "patients in acute care without their voice"

Each occurrence is reviewed by hand. A blind global find-and-replace would produce stilted prose, especially in the research plan abstract and aims sections.

The app codebase has no occurrences of "nonverbal" in source code or strings (verified). No app-string changes needed.

## 10. Out of scope

- Internationalization of the homepage (English only for v1).
- Server-side rendering or prerendering (Cloudflare Pages serves the SPA; Lighthouse score is a non-goal for v1).
- A `/privacy` or `/about` standalone page (footer link can go to a section anchor on `/` for now; promote to standalone pages when audiences B/C come online).
- Analytics. The homepage may add Plausible or similar later; not part of this change.
- A `npm run demo:extract` integration into CI. Manual run is fine for v1.
- Newsletter signup, contact form, "Request access" flow.

## 11. Risks and open questions

- **MDX plugin choice** is unsettled. `@mdx-js/preact` + `vite-plugin-mdx` is the conventional pick but adds Babel to the build. `vite-plugin-md` is lighter but less mature on Preact. Decide during the implementation plan; both are reversible.
- **Service worker registration scope** requires the `Service-Worker-Allowed: /app/` header on `/sw.js`. If Cloudflare Pages strips or misroutes this header, the SW will register at root scope and start intercepting homepage requests. Test this end-to-end before declaring deployment ready.
- **Demo speaker embedding versioning**: if the TTS model changes (e.g. another swap like #111), the cached `public/demo/speakerdata.json` becomes incompatible. The `version` field lets boot detect mismatch and fall back to running encoder at boot, but adds a one-time slowdown.
- **Research-plan rewrite scope**: 22 hand-edits in a paper-style document is a meaningful editorial pass. The user may want to review the rewritten markdown before it goes to `/research`. Build the homepage first, gate the `/research` go-live on review of the updated markdown.
- **Status string drift**: §3 says "Protocol drafted; not yet IRB-submitted." That string is in one place but is the kind of detail that becomes wrong silently. Either source it from a single constant or pick a phrasing that doesn't promise a current state ("Protocol available; pre-IRB").

## 12. Open implementation choices (for the plan, not this spec)

- Whether to introduce `preact-iso` or hand-roll a 30-line route switcher in `HomepageApp.tsx`. Default: `preact-iso`.
- Whether the demo banner is a component shared with normal-app surfaces or homepage-only.
- Whether the BibTeX block on `/` is hand-authored or generated from a `cite.bib` file.
- Test strategy: the existing `vitest` suite exercises components and stores. Homepage components get the same treatment (unit tests on each section, snapshot test for the homepage shell).

---

## Appendix A — Section-by-section copy seed

(Drafts to be refined. All copy adheres to §9 framing.)

**Hero subhead:** "OwnVoice is a browser-based AAC application for ICU patients who are temporarily unable to speak — typically due to tracheostomy, intubation, or post-surgical recovery. On-device voice cloning, validated pain assessment, structured goals-of-care."

**§1 connecting prose:** "Communication failure in the ICU is common, harmful, and under-addressed. Existing AAC tools rely on generic synthesized voices and cloud connectivity; few support goals-of-care conversations; none restore the patient's own voice."

**§4 paragraph:** "All inference — voice cloning, sentence suggestion, speech-to-text — runs in the browser via WebGPU and ONNX Runtime Web. Voice samples and patient data are created and stored on-device only. The app is a URL: no App Store install, no cloud, no MDM dependency. A nurse opens it, types a name, and hands the iPad to a patient."

**§3 status string:** "Protocol drafted; not yet IRB-submitted."
