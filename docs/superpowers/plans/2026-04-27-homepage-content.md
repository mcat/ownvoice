# Homepage Content + /research Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder homepage with the eight-section design from the spec (problem-led hero, problem stats, system pillars, study summary, privacy, references, CTA, footer) and add a `/research` route that renders `docs/ownvoice-research-plan.md` with reading-friendly typography. Introduces `preact-iso` for in-page routing and `markdown-to-jsx` for safe markdown rendering.

**Architecture:** The homepage entry mounts a `<Router>` from `preact-iso` over two routes: `/` renders `<Home />` (composes eight section components from `src/homepage/sections/`), `/research` renders `<Research />` (loads the markdown via Vite's `?raw` import, renders via the `<Markdown>` component from `markdown-to-jsx` which produces real Preact VNodes — no raw HTML injection). Section components are static JSX; styling lives in component-local inline objects pulling from a shared `src/homepage/theme.ts` token map. No Tailwind on the homepage — keeps the bundle clean per Plan B's bundle-separation goal.

**Tech Stack:** Preact, TypeScript, `preact-iso` (~2 KB, official Preact router), `markdown-to-jsx` (~13 KB, parses markdown directly to React/Preact elements). No Tailwind on the homepage entry. No raw-HTML injection — `markdown-to-jsx` produces a real VNode tree, so the markdown body is rendered through the framework's normal element pipeline.

**Spec:** `docs/superpowers/specs/2026-04-27-homepage-design.md` §5 (homepage content), §7 (visual style), §8 (research page)

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `preact-iso` and `markdown-to-jsx` dependencies |
| `src/homepage/theme.ts` | Create | Typography + color token map for the homepage |
| `src/homepage/HomepageApp.tsx` | Create | Top-level component: `<LocationProvider>` + `<Router>` over `/` and `/research` |
| `src/homepage/pages/Home.tsx` | Create | Composes the eight section components |
| `src/homepage/pages/Home.test.tsx` | Create | Integration test: page renders, key copy present, CTAs link correctly |
| `src/homepage/pages/Research.tsx` | Create | Renders `docs/ownvoice-research-plan.md` via `<Markdown>` |
| `src/homepage/pages/Research.test.tsx` | Create | Integration test: page renders headings from the markdown |
| `src/homepage/sections/Hero.tsx` | Create | Dark-slate hero with three CTAs |
| `src/homepage/sections/TheProblem.tsx` | Create | §1 stat cards |
| `src/homepage/sections/TheSystem.tsx` | Create | §2 four-pillar grid |
| `src/homepage/sections/StudyAtAGlance.tsx` | Create | §3 five aims + status |
| `src/homepage/sections/OnDeviceAndPrivacy.tsx` | Create | §4 privacy paragraph |
| `src/homepage/sections/References.tsx` | Create | §5 citations + BibTeX block |
| `src/homepage/sections/CTA.tsx` | Create | Bottom CTA strip |
| `src/homepage/sections/Footer.tsx` | Create | Footer |
| `src/main-homepage.tsx` | Modify | Mount `<HomepageApp />` instead of `<PlaceholderApp />` |
| `src/homepage/PlaceholderApp.tsx` | Delete | Superseded by sections |
| `src/homepage/PlaceholderApp.test.tsx` | Delete | Superseded |

The eight section components are self-contained: each receives no props, renders a single section, owns its own copy. They import only from `src/homepage/theme.ts` and from `preact` — no app-side imports. This preserves Plan B's bundle-separation guarantee.

The research page imports the markdown via Vite's `?raw` query (`import researchMd from "../../../docs/ownvoice-research-plan.md?raw";`) and renders it via the `<Markdown>` component exported from `markdown-to-jsx`. That library walks the markdown AST and emits real Preact VNodes (headings, paragraphs, lists, etc.) through the standard render path — no string-to-DOM shortcut, so the security model is the same as any other JSX render.

---

## Visual style — token reference

All section components import these tokens from `src/homepage/theme.ts`:

```ts
export const homepageTheme = {
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  color: {
    bg: "#ffffff",          // page background
    surface: "#fafaf8",     // alternating section bg (stone-50 ish)
    text: "#0f172a",        // primary text (slate-900)
    body: "#44403c",        // body text (stone-700)
    muted: "#78716c",       // labels, citation refs (stone-500)
    border: "#e7e5e4",      // hairline rules (stone-200)
    accent: "#0f172a",      // primary button bg (matches text)
    heroBg: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    heroText: "#ffffff",
    heroSubdued: "#cbd5e1",
  },
  radius: 6,
  maxWidth: 880,           // content max-width on desktop
  bodyMaxWidth: 680,       // prose paragraphs max-width for readability
  bodyFontSize: 16,
  bodyLineHeight: 1.55,
  sectionPadding: "48px 32px",
} as const;
```

These tokens are the contract every section uses — change here, change everywhere.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json` (auto-updated)

- [ ] **Step 1: Install `preact-iso` and `markdown-to-jsx`**

```bash
npm install preact-iso@^2.9.0 markdown-to-jsx@^7.7.4
```

`markdown-to-jsx` ships its own TypeScript types — no separate `@types/` package needed. The library calls `React.createElement` directly, which under the existing `react: "preact/compat"` Vite alias resolves to Preact transparently.

- [ ] **Step 2: Verify installation**

```bash
npm test 2>&1 | tail -3
```

Expected: existing 1273 tests still pass (no test changes; just dependency addition).

```bash
node -e "console.log(require('preact-iso').LocationProvider ? 'preact-iso ok' : 'missing')"
node -e "console.log(typeof require('markdown-to-jsx').default === 'function' ? 'markdown-to-jsx ok' : 'missing')"
```

Expected: prints `preact-iso ok` and `markdown-to-jsx ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps(homepage): add preact-iso + markdown-to-jsx

preact-iso (~2 KB) for client-side routing on the homepage entry
between / and /research. markdown-to-jsx (~13 KB) for rendering the
research plan markdown — produces real VNodes (no raw-HTML injection)
and works under the existing react→preact/compat alias. Both are
scoped to the homepage entry so the app bundle is unaffected."
```

---

### Task 2: Create homepage theme tokens

**Files:**
- Create: `src/homepage/theme.ts`

- [ ] **Step 1: Write the file**

Create `src/homepage/theme.ts` with this content:

```ts
/**
 * Design tokens for the homepage entry (/ and /research).
 *
 * Lives separate from `src/theme/` (the app's theme module) because the
 * homepage uses different typography (system sans, not Atkinson Hyperlegible)
 * and a different color palette (stone neutrals + slate accent for an
 * editorial reading experience). Bundle separation per Plan B means the
 * homepage entry must not import from src/theme/.
 */
export const homepageTheme = {
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  color: {
    bg: "#ffffff",
    surface: "#fafaf8",
    text: "#0f172a",
    body: "#44403c",
    muted: "#78716c",
    border: "#e7e5e4",
    accent: "#0f172a",
    heroBg: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    heroText: "#ffffff",
    heroSubdued: "#cbd5e1",
  },
  radius: 6,
  maxWidth: 880,
  bodyMaxWidth: 680,
  bodyFontSize: 16,
  bodyLineHeight: 1.55,
  sectionPadding: "48px 32px",
} as const;

export type HomepageTheme = typeof homepageTheme;
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/homepage/theme.ts
git commit -m "feat(homepage): add typography and color tokens

Single source of truth for homepage styling. System-sans typography,
stone/slate palette, separate from the app's Atkinson Hyperlegible +
warm beige theme. Section components consume these tokens via inline
style objects."
```

---

### Task 3: Build static section components — Hero, CTA, Footer

**Files:**
- Create: `src/homepage/sections/Hero.tsx`
- Create: `src/homepage/sections/CTA.tsx`
- Create: `src/homepage/sections/Footer.tsx`

These three are the simplest — fully static, no grids, three CTAs total.

- [ ] **Step 1: Create `src/homepage/sections/Hero.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * Problem-led hero. Opens with the citation-grounded ICU stat from
 * Zubow & Hurtig 2013 / Freeman-Sanderson 2019. Three CTAs: demo, real
 * setup, research plan. The dark-slate background contrasts against the
 * lighter sections below.
 */
export function Hero() {
  return (
    <section
      style={{
        background: t.color.heroBg,
        color: t.color.heroText,
        padding: "72px 32px 56px",
      }}
    >
      <div style={{ maxWidth: t.maxWidth, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          OwnVoice
        </div>
        <h1
          style={{
            marginTop: 16,
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 600,
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            maxWidth: 720,
          }}
        >
          Roughly 33% of ICU patients can&rsquo;t speak. They use AAC only 11% of the time.
        </h1>
        <p
          style={{
            marginTop: 18,
            fontSize: 17,
            lineHeight: t.bodyLineHeight,
            color: t.color.heroSubdued,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          OwnVoice is a browser-based AAC application for ICU patients who are temporarily
          unable to speak &mdash; typically due to tracheostomy, intubation, or post-surgical
          recovery. On-device voice cloning, validated pain assessment, structured
          goals-of-care.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <a
            href="/app/?demo=1"
            style={{
              background: t.color.heroText,
              color: t.color.text,
              padding: "10px 18px",
              borderRadius: t.radius,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Try a demo &rarr;
          </a>
          <a
            href="/app/"
            style={{
              border: `1px solid ${t.color.heroText}`,
              color: t.color.heroText,
              padding: "10px 18px",
              borderRadius: t.radius,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Set up a real session
          </a>
          <a
            href="/research"
            style={{
              color: t.color.heroSubdued,
              padding: "10px 14px",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Read the research plan
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/homepage/sections/CTA.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * Bottom CTA strip. Mirrors the hero's primary actions for readers who
 * scrolled to the end. The device-support note clarifies that the iPad
 * is the production target but desktop browsers work for evaluation.
 */
export function CTA() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        textAlign: "center",
        borderTop: `1px solid ${t.color.border}`,
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: t.color.text,
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        Try the app on your iPad.
      </h2>
      <p
        style={{
          fontSize: 14,
          color: t.color.muted,
          marginTop: 8,
        }}
      >
        Best on iPad Pro (M5/M4) with Safari 26+. Works in Chrome, Edge, and Firefox for
        evaluation.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 18,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          href="/app/?demo=1"
          style={{
            background: t.color.accent,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: t.radius,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Try a demo &rarr;
        </a>
        <a
          href="/app/"
          style={{
            border: `1px solid ${t.color.border}`,
            color: t.color.text,
            padding: "10px 18px",
            borderRadius: t.radius,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            background: t.color.bg,
          }}
        >
          Set up a real session
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/homepage/sections/Footer.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * Footer. Status line + three external links. The "Not for clinical use"
 * disclaimer is non-negotiable per the project README and PRD.
 */
export function Footer() {
  return (
    <footer
      style={{
        padding: "24px 32px",
        background: "#1c1917",
        color: "#a8a29e",
        fontSize: 12,
      }}
    >
      <div
        style={{
          maxWidth: t.maxWidth,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>OwnVoice &middot; v0.1 prototype &middot; Not for clinical use without validation</div>
        <div style={{ display: "flex", gap: 16 }}>
          <a
            href="https://github.com/mcat/ownvoice"
            style={{ color: "#a8a29e", textDecoration: "none" }}
          >
            GitHub
          </a>
          <a href="/research" style={{ color: "#a8a29e", textDecoration: "none" }}>
            Research plan
          </a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/homepage/sections/Hero.tsx src/homepage/sections/CTA.tsx src/homepage/sections/Footer.tsx
git commit -m "feat(homepage): add Hero, CTA, and Footer sections

Three of the eight homepage sections. Hero is problem-led with the
ICU stat headline; CTA mirrors the hero's two primary actions; Footer
ships the project status disclaimer + external links."
```

---

### Task 4: Build static section components — TheProblem, TheSystem

**Files:**
- Create: `src/homepage/sections/TheProblem.tsx`
- Create: `src/homepage/sections/TheSystem.tsx`

Both are grid-based. Three stat cards for §1, four pillar cards for §2.

- [ ] **Step 1: Create `src/homepage/sections/TheProblem.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * §1 — The problem. Three stat cards backed by citations. Numbers come
 * from docs/ownvoice-research-plan.md §2.1 (Zubow & Hurtig 2013;
 * Freeman-Sanderson 2019; Happ et al. 2011).
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
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          <StatCard
            stat="~33%"
            text="of ICU patients meet AAC candidacy criteria"
            cite="Zubow & Hurtig, 2013"
          />
          <StatCard
            stat="11%"
            text="of stay involves any alternative communication"
            cite="Freeman-Sanderson et al., 2019"
          />
          <StatCard
            stat="35%"
            text="of staff report difficulty understanding patients"
            cite="Happ et al., 2011"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, text, cite }: { stat: string; text: string; cite: string }) {
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
        {text} <span style={{ color: t.color.muted }}>({cite})</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/homepage/sections/TheSystem.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * §2 — The system. Four pillars in a 2×2 grid. Each pillar is one
 * feature plus a short technical detail (model name + license / paper
 * citation) so a researcher can verify what's running.
 */
export function TheSystem() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        borderTop: `1px solid ${t.color.border}`,
        background: t.color.surface,
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
          §2 &middot; The system
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
          Four pillars, all running on the tablet &mdash; no data leaves the device.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          <Pillar
            title="Personal voice"
            body="Zero-shot voice cloning from 15 s of reference audio. Chatterbox Multilingual, 23 languages."
          />
          <Pillar
            title="Pain assessment"
            body="Emoji-FPS validated 6-face scale (Li et al., JMIR 2023)."
          />
          <Pillar
            title="Goals of care"
            body="Serious Illness Conversation Guide adapted for AAC (Ariadne Labs)."
          />
          <Pillar
            title="Listen"
            body="On-device Whisper STT captures provider speech for the patient."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: t.color.bg,
        border: `1px solid ${t.color.border}`,
        padding: 16,
        borderRadius: t.radius,
      }}
    >
      <div style={{ fontWeight: 600, color: t.color.text }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          color: t.color.body,
          lineHeight: 1.5,
          marginTop: 6,
        }}
      >
        {body}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/homepage/sections/TheProblem.tsx src/homepage/sections/TheSystem.tsx
git commit -m "feat(homepage): add TheProblem and TheSystem sections

§1 renders three stat cards backed by ICU communication-failure
citations. §2 renders the four-pillar grid (voice cloning, pain,
SICG, listen) with technical attribution for each."
```

---

### Task 5: Build static section components — StudyAtAGlance, OnDeviceAndPrivacy, References

**Files:**
- Create: `src/homepage/sections/StudyAtAGlance.tsx`
- Create: `src/homepage/sections/OnDeviceAndPrivacy.tsx`
- Create: `src/homepage/sections/References.tsx`

Three text-heavy sections. References includes a BibTeX block.

- [ ] **Step 1: Create `src/homepage/sections/StudyAtAGlance.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * §3 — Study at a glance. Five aims, study type, status, and a link
 * to the full research plan at /research. Status string mirrors the
 * spec exactly: "Protocol drafted; not yet IRB-submitted."
 */
export function StudyAtAGlance() {
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
          §3 &middot; Study at a glance
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
          A prospective, single-center, mixed-methods clinical validation study.
        </h2>
        <ol
          style={{
            marginTop: 20,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 8,
            color: t.color.text,
            fontSize: 13,
          }}
        >
          <li>
            <strong>Aim 1</strong> &mdash; Communication satisfaction (CSRI) vs. standard of care
          </li>
          <li>
            <strong>Aim 2</strong> &mdash; Voice identity and emotional wellbeing
          </li>
          <li>
            <strong>Aim 3</strong> &mdash; SICG feasibility with AAC
          </li>
          <li>
            <strong>Aim 4</strong> &mdash; On-device inference latency and reliability
          </li>
          <li>
            <strong>Aim 5</strong> &mdash; Nursing workflow and communication burden
          </li>
        </ol>
        <p style={{ marginTop: 20, fontSize: 13, color: t.color.body }}>
          <span style={{ color: t.color.muted }}>Status:</span>{" "}
          <span style={{ color: "#92400e", fontWeight: 600 }}>
            Protocol drafted; not yet IRB-submitted.
          </span>
        </p>
        <a
          href="/research"
          style={{
            display: "inline-block",
            marginTop: 18,
            padding: "8px 14px",
            border: `1px solid ${t.color.border}`,
            borderRadius: 5,
            fontSize: 13,
            color: t.color.text,
            textDecoration: "none",
          }}
        >
          Read the full research plan &rarr;
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `src/homepage/sections/OnDeviceAndPrivacy.tsx`**

```tsx
import { homepageTheme as t } from "../theme";

/**
 * §4 — On-device & privacy. Single paragraph reinforcing the
 * privacy-by-design posture for IRB readers.
 */
export function OnDeviceAndPrivacy() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        borderTop: `1px solid ${t.color.border}`,
        background: t.color.surface,
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
          §4 &middot; On-device & privacy
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
          No PHI ever leaves the tablet.
        </h2>
        <p
          style={{
            marginTop: 14,
            fontSize: t.bodyFontSize,
            lineHeight: t.bodyLineHeight,
            color: t.color.body,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          All inference &mdash; voice cloning, sentence suggestion, speech-to-text &mdash;
          runs in the browser via WebGPU and ONNX Runtime Web. Voice samples and patient
          data are created and stored on-device only. The app is a URL: no App Store
          install, no cloud, no MDM dependency. A nurse opens it, types a name, and hands
          the iPad to a patient.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create `src/homepage/sections/References.tsx`**

```tsx
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/homepage/sections/StudyAtAGlance.tsx src/homepage/sections/OnDeviceAndPrivacy.tsx src/homepage/sections/References.tsx
git commit -m "feat(homepage): add StudyAtAGlance, OnDeviceAndPrivacy, References

§3 lists the five aims and surfaces the study status string. §4 is the
privacy-by-design paragraph for IRB readers. §5 selects six citations
with hanging-indent formatting and a minimal BibTeX block for citing
OwnVoice in published work."
```

---

### Task 6: Compose Home page + integration test

**Files:**
- Create: `src/homepage/pages/Home.tsx`
- Create: `src/homepage/pages/Home.test.tsx`

TDD this one — the integration test is meaningful (it verifies the page composes correctly and the CTAs link to the right URLs).

- [ ] **Step 1: Write the failing test**

Create `src/homepage/pages/Home.test.tsx`:

```tsx
import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Home } from "./Home";

describe("Home page", () => {
  it("renders the hero headline with the ICU stat", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/33%/);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AAC only 11%/);
  });

  it("renders all five major section headings", () => {
    render(<Home />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /communication failure/i.test(t))).toBe(true);
    expect(h2s.some((t) => /four pillars/i.test(t))).toBe(true);
    expect(h2s.some((t) => /clinical validation study/i.test(t))).toBe(true);
    expect(h2s.some((t) => /no PHI ever leaves/i.test(t))).toBe(true);
    expect(h2s.some((t) => /try the app on your iPad/i.test(t))).toBe(true);
  });

  it("links 'Try a demo' to /app/?demo=1", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /try a demo/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/app/?demo=1"));
  });

  it("links 'Set up a real session' to /app/", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /set up a real session/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/app/"));
  });

  it("links 'Read the research plan' to /research", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /read the research plan/i });
    expect(link).toHaveAttribute("href", "/research");
  });

  it("links the 'Read the full research plan' deep link to /research", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /read the full research plan/i });
    expect(link).toHaveAttribute("href", "/research");
  });

  it("includes the study status string", () => {
    render(<Home />);
    expect(screen.getByText(/protocol drafted; not yet IRB-submitted/i)).toBeInTheDocument();
  });

  it("includes a BibTeX block for citing OwnVoice", () => {
    render(<Home />);
    expect(screen.getByText(/@misc\{ownvoice2026/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
npx vitest run src/homepage/pages/Home.test.tsx
```

Expected: FAIL with "Cannot find module './Home'".

- [ ] **Step 3: Create `src/homepage/pages/Home.tsx`**

```tsx
import { Hero } from "../sections/Hero";
import { TheProblem } from "../sections/TheProblem";
import { TheSystem } from "../sections/TheSystem";
import { StudyAtAGlance } from "../sections/StudyAtAGlance";
import { OnDeviceAndPrivacy } from "../sections/OnDeviceAndPrivacy";
import { References } from "../sections/References";
import { CTA } from "../sections/CTA";
import { Footer } from "../sections/Footer";
import { homepageTheme as t } from "../theme";

/**
 * The homepage at `/`. Composes the eight sections in scroll order:
 * hero → problem → system → study → privacy → references → CTA → footer.
 * No layout logic of its own — each section owns its padding and width.
 */
export function Home() {
  return (
    <main style={{ fontFamily: t.font, color: t.color.text, background: t.color.bg }}>
      <Hero />
      <TheProblem />
      <TheSystem />
      <StudyAtAGlance />
      <OnDeviceAndPrivacy />
      <References />
      <CTA />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
npx vitest run src/homepage/pages/Home.test.tsx
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/homepage/pages/Home.tsx src/homepage/pages/Home.test.tsx
git commit -m "feat(homepage): compose Home page from eight sections + integration test

Home composes hero, problem, system, study, privacy, references, CTA,
and footer in scroll order. Test verifies all five major headings
render, all CTAs link to the correct URLs, the study status appears,
and the BibTeX block is present."
```

---

### Task 7: Build Research page + integration test

**Files:**
- Create: `src/homepage/pages/Research.tsx`
- Create: `src/homepage/pages/Research.test.tsx`
- Modify: `src/env.d.ts` (one declaration, see Step 1)

The research page imports the markdown via Vite's `?raw` query string and renders it through the `<Markdown>` component from `markdown-to-jsx`. That component parses the markdown AST and emits real Preact VNodes — no string-to-DOM shortcut, so the security model is the same as ordinary JSX.

- [ ] **Step 1: Add `?raw` import declaration to `src/env.d.ts`**

Read `src/env.d.ts`. If it already declares `*?raw`, skip this step. Otherwise append:

```ts
declare module "*?raw" {
  const content: string;
  export default content;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/homepage/pages/Research.test.tsx`:

```tsx
import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Research } from "./Research";

describe("Research page", () => {
  it("renders the research plan title from the markdown", () => {
    render(<Research />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/OwnVoice/i);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /ICU patients without functional speech/i,
    );
  });

  it("renders the abstract section heading", () => {
    render(<Research />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /abstract/i.test(t))).toBe(true);
  });

  it("renders the study aims section heading", () => {
    render(<Research />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /study aims/i.test(t) || /aims and hypotheses/i.test(t))).toBe(true);
  });

  it("uses the new patient framing in the abstract", () => {
    render(<Research />);
    // After Plan A, the rendered prose should not contain the trait label.
    expect(document.body.textContent).not.toMatch(/\bnonverbal\b/i);
  });
});
```

- [ ] **Step 3: Run the test and verify it fails**

```bash
npx vitest run src/homepage/pages/Research.test.tsx
```

Expected: FAIL with "Cannot find module './Research'".

- [ ] **Step 4: Create `src/homepage/pages/Research.tsx`**

```tsx
import Markdown from "markdown-to-jsx";
import researchMd from "../../../docs/ownvoice-research-plan.md?raw";
import { homepageTheme as t } from "../theme";

/**
 * The research page at `/research`. Source of truth is
 * `docs/ownvoice-research-plan.md` — imported via Vite's `?raw` query
 * and rendered by `<Markdown>` from markdown-to-jsx. The library walks
 * the markdown AST and emits real Preact VNodes; no string-to-DOM
 * shortcut, so the security model is the same as any ordinary JSX
 * render.
 *
 * The `overrides` map applies the homepage typography to each markdown
 * element type. Section IDs are auto-generated by markdown-to-jsx
 * from heading text, so external links can deep-link
 * (e.g. /research#abstract).
 */
const inlineCodeStyle = {
  background: t.color.surface,
  padding: "1px 5px",
  borderRadius: 3,
  fontSize: "0.9em",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
};

const overrides = {
  h1: {
    props: {
      style: {
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: t.color.text,
        margin: "0 0 24px 0",
      },
    },
  },
  h2: {
    props: {
      style: {
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: t.color.text,
        margin: "40px 0 12px 0",
      },
    },
  },
  h3: {
    props: {
      style: {
        fontSize: 17,
        fontWeight: 600,
        color: t.color.text,
        margin: "28px 0 8px 0",
      },
    },
  },
  h4: {
    props: {
      style: {
        fontSize: 15,
        fontWeight: 600,
        color: t.color.text,
        margin: "20px 0 6px 0",
      },
    },
  },
  p: { props: { style: { margin: "12px 0" } } },
  ul: { props: { style: { paddingLeft: 24, margin: "12px 0" } } },
  ol: { props: { style: { paddingLeft: 24, margin: "12px 0" } } },
  li: { props: { style: { margin: "6px 0" } } },
  a: { props: { style: { color: t.color.text } } },
  hr: {
    props: {
      style: {
        border: "none",
        borderTop: `1px solid ${t.color.border}`,
        margin: "32px 0",
      },
    },
  },
  code: { props: { style: inlineCodeStyle } },
  pre: {
    props: {
      style: {
        background: t.color.surface,
        padding: 12,
        borderRadius: t.radius,
        overflowX: "auto",
        fontSize: "0.85em",
      },
    },
  },
  blockquote: {
    props: {
      style: {
        borderLeft: `3px solid ${t.color.border}`,
        paddingLeft: 14,
        color: t.color.muted,
        margin: "14px 0",
      },
    },
  },
  table: {
    props: {
      style: {
        borderCollapse: "collapse",
        width: "100%",
        margin: "14px 0",
        fontSize: "0.92em",
      },
    },
  },
  th: {
    props: {
      style: {
        border: `1px solid ${t.color.border}`,
        padding: "6px 10px",
        textAlign: "left",
        verticalAlign: "top",
        background: t.color.surface,
      },
    },
  },
  td: {
    props: {
      style: {
        border: `1px solid ${t.color.border}`,
        padding: "6px 10px",
        textAlign: "left",
        verticalAlign: "top",
      },
    },
  },
} as const;

export function Research() {
  return (
    <article
      style={{
        fontFamily: t.font,
        color: t.color.body,
        background: t.color.bg,
        padding: "48px 32px 96px",
      }}
    >
      <div
        style={{
          maxWidth: t.bodyMaxWidth,
          margin: "0 auto",
          fontSize: t.bodyFontSize,
          lineHeight: t.bodyLineHeight,
        }}
      >
        <Markdown options={{ overrides, slugify: undefined }}>{researchMd}</Markdown>
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Run the test and verify it passes**

```bash
npx vitest run src/homepage/pages/Research.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: exit 0.

If TypeScript complains about the `?raw` import, confirm `src/env.d.ts` includes the declaration from Step 1.

- [ ] **Step 7: Commit**

```bash
git add src/homepage/pages/Research.tsx src/homepage/pages/Research.test.tsx src/env.d.ts
git commit -m "feat(research): render docs/ownvoice-research-plan.md at /research

Imports the markdown via Vite's ?raw query, renders via
<Markdown> from markdown-to-jsx with style overrides for each
element type. Real VNode tree (no raw-HTML injection). Test verifies
the title, key section headings, and that the post-Plan-A framing
held (no 'nonverbal' in the rendered prose)."
```

---

### Task 8: Wire main-homepage entry to use HomepageApp + Router

**Files:**
- Create: `src/homepage/HomepageApp.tsx`
- Modify: `src/main-homepage.tsx`

- [ ] **Step 1: Create `src/homepage/HomepageApp.tsx`**

```tsx
import { LocationProvider, Router, Route } from "preact-iso";
import { Home } from "./pages/Home";
import { Research } from "./pages/Research";

/**
 * Top-level component for the homepage entry. Routes:
 *   /          → <Home />
 *   /research  → <Research />
 *
 * Anything else 404s — the homepage entry doesn't own /app/* (that's
 * a separate Vite entry served from /app/index.html), and we don't
 * have any other top-level routes.
 */
export function HomepageApp() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/research" component={Research} />
      </Router>
    </LocationProvider>
  );
}
```

- [ ] **Step 2: Update `src/main-homepage.tsx`**

Replace the entire contents of `src/main-homepage.tsx` with:

```tsx
import { render } from "preact";
import { HomepageApp } from "./homepage/HomepageApp";

render(<HomepageApp />, document.getElementById("root")!);
```

- [ ] **Step 3: Verify TypeScript and tests**

```bash
npx tsc --noEmit
```

Expected: exit 0.

```bash
npm test 2>&1 | tail -3
```

Expected: all tests pass. Total count at this stage: **1285** (Plan B's 1273 already includes the 2 PlaceholderApp tests; Plan C adds 8 Home + 4 Research = +12). Task 9 removes the 2 placeholder tests, dropping the final count to 1283.

- [ ] **Step 4: Commit**

```bash
git add src/homepage/HomepageApp.tsx src/main-homepage.tsx
git commit -m "feat(homepage): wire / and /research routes via preact-iso

HomepageApp uses LocationProvider + Router for client-side navigation
between Home and Research. main-homepage.tsx mounts HomepageApp.
PlaceholderApp is no longer reachable from the homepage entry; it
will be removed in the next task."
```

---

### Task 9: Remove the PlaceholderApp

**Files:**
- Delete: `src/homepage/PlaceholderApp.tsx`
- Delete: `src/homepage/PlaceholderApp.test.tsx`

- [ ] **Step 1: Confirm PlaceholderApp is no longer referenced**

```bash
grep -rn "PlaceholderApp" src/ 2>/dev/null
```

Expected: no output. (If grep finds matches, they're stale — investigate before deleting.)

- [ ] **Step 2: Delete the files**

```bash
git rm src/homepage/PlaceholderApp.tsx src/homepage/PlaceholderApp.test.tsx
```

- [ ] **Step 3: Run tests**

```bash
npm test 2>&1 | tail -3
```

Expected: all tests pass. Total count: **1283** (Plan B's 1273 + 12 new homepage/research tests − 2 deleted placeholder tests).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(homepage): remove PlaceholderApp now that real Home page ships

PlaceholderApp.tsx and its test served as the Plan B routing-skeleton
landmark. Plan C replaces it with the actual eight-section homepage."
```

---

### Task 10: End-to-end verification + push + PR

**Files:**
- No edits.

- [ ] **Step 1: Build and inspect**

```bash
npm run build
ls dist/index.html dist/app/index.html
```

Expected: both HTML files present.

- [ ] **Step 2: Confirm bundle separation still holds**

The homepage chunk should remain free of app code despite getting bigger. Check size and content:

```bash
ls -la dist/assets/main-*.js dist/assets/app-*.js | head -5
```

Expected: `main-*.js` in the low tens of KB (homepage now includes preact-iso + markdown-to-jsx + 8 sections + a markdown payload). Order of magnitude OK; if it crosses 200 KB, investigate.

```bash
for f in dist/assets/main-*.js; do
  if grep -q "Chatterbox\|getModelManager\|MyWishes\|setupCare\|onnxruntime" "$f"; then
    echo "FAIL: $f contains app code"
  else
    echo "PASS: $f free of app code"
  fi
done
```

Expected: PASS for every homepage chunk.

- [ ] **Step 3: Preview server smoke check**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3

echo "=== Homepage at / ==="
curl -s http://localhost:4173/ | grep -o '<title>[^<]*</title>'

echo "=== Homepage script ref ==="
curl -s http://localhost:4173/ | grep -c "main-"

echo "=== App at /app/ ==="
curl -s http://localhost:4173/app/ | grep -o '<title>[^<]*</title>'

kill $PREVIEW_PID 2>/dev/null
wait 2>/dev/null
```

Expected:
- Homepage title: `<title>OwnVoice — In-patient AAC with personal voice</title>`
- Homepage HTML references the homepage entry script (count >= 1)
- App title: `<title>OwnVoice</title>` (unchanged)

The `/research` route is client-side; on a static preview server, navigating directly to `/research` won't hit the right HTML file. In production, Cloudflare Pages handles SPA fallback. To verify locally, open `http://localhost:4173/` in a browser, click "Read the research plan," and watch the URL flip to `/research` and the content update.

- [ ] **Step 4: Run the full test suite**

```bash
npm test 2>&1 | tail -3
```

Expected: 1283 tests pass.

- [ ] **Step 5: Run manifest integrity check**

```bash
npm run manifest:check
```

Expected: `models-manifest.json is up to date.`

- [ ] **Step 6: Push the branch**

```bash
git push -u origin feat/homepage-content
```

- [ ] **Step 7: Open PR**

```bash
gh pr create --title "feat(homepage): add eight-section homepage + /research page" --body "$(cat <<'EOF'
## Summary

Plan C of 4 from the homepage spec. Replaces the placeholder homepage with the eight-section design (problem-led hero, problem stats, system pillars, study summary, privacy, references, CTA, footer) and adds a /research route that renders \`docs/ownvoice-research-plan.md\` with reading-friendly typography.

## What changes

- **Routing**: introduces \`preact-iso\` (~2 KB) for client-side navigation between \`/\` and \`/research\` inside the homepage entry.
- **Markdown rendering**: introduces \`markdown-to-jsx\` (~13 KB), which parses the research markdown to a real Preact VNode tree (no raw-HTML injection). Style overrides per element type apply homepage typography.
- **Eight section components** under \`src/homepage/sections/\`, each a static, prop-less Preact component that owns its copy, layout, and styles via inline objects pulling from \`src/homepage/theme.ts\`.
- **Theme tokens**: \`src/homepage/theme.ts\` is the single source of truth for homepage typography (system-sans, not Atkinson Hyperlegible) and color palette (stone neutrals + slate accent). The app's theme is unaffected.
- **Research page**: imports the markdown via Vite's \`?raw\` query, renders with markdown-to-jsx + scoped style overrides for editorial typography.
- **PlaceholderApp removed**: the Plan B landmark is replaced by the real Home page.

## Test plan

- [x] Type-check (\`npx tsc --noEmit\`) clean
- [x] Build produces both \`dist/index.html\` and \`dist/app/index.html\`
- [x] Homepage chunk free of app code (grep for Chatterbox/onnxruntime/MyWishes returns 0)
- [x] Full test suite passes (1283 tests; +12 new homepage/research, −2 placeholder)
- [x] Preview server smoke check: \`/\` serves homepage HTML, \`/app/\` serves app HTML
- [ ] Cloudflare deploy preview shows the eight-section page (deferred until Plan E unblocks deployment)

## Out of scope (deferred)

- **Plan D**: Demo mode (\`/app/?demo=1\` actually pre-seeds Demo Patient). Plan C wires the homepage CTAs to that URL but doesn't change app behavior.
- **Plan E**: Asset hosting. Until R2 is set up, the Cloudflare deploy will continue failing on the 25 MiB ONNX wasm — same as PR #118.

## Spec / plan

- Spec: \`docs/superpowers/specs/2026-04-27-homepage-design.md\` §5 (homepage content), §7 (visual style), §8 (research page)
- Plan: \`docs/superpowers/plans/2026-04-27-homepage-content.md\`
EOF
)"
```

Expected: PR opened. Capture URL.

---

## Notes for the executing engineer

- **Don't reach into `src/components/`, `src/stores/`, `src/models/`, or `src/hooks/` from any homepage file.** Those are app-side imports that would break Plan B's bundle separation. If you find yourself wanting one of them on the homepage, stop — that's an architectural decision worth raising rather than silently making.
- **The visual style is deliberately editorial, not branded-marketing.** No gradients on body sections, no oversized headlines, no animated hero. The reader is a researcher; clarity beats spectacle.
- **The BibTeX block uses minimal fields (no `author` line).** When the actual citation policy is decided (e.g., a paper authored by specific people), update `References.tsx` to include the author list. For v1, the minimal block is correct — the user explicitly said to "ask along the way" rather than block on these details.
- **The patient framing established in Plan A applies here too.** All copy in Plan C uses state-and-cause language ("ICU patients who are temporarily unable to speak", "without functional speech"), not trait labels. The Research page's content comes from the rewritten markdown, so it's covered automatically.
- **`markdown-to-jsx` produces real VNodes**, not an HTML string. That's why it works under preact/compat and why the security posture is straightforward — every node is rendered through Preact's normal element pipeline. If you find yourself wanting to inject HTML strings, stop and reach for the AST instead.
- **Cloudflare deploy will fail this PR's auto-build with the 25 MiB error**, same as PR #118. That's expected. Don't try to fix it inside this branch — it's Plan E's territory.
