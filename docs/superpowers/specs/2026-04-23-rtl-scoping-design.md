# Arabic / RTL Support Scoping

**Status:** Draft for review
**Date:** 2026-04-23
**Scope:** Enumerate the work needed to ship Arabic as a patient or caregiver locale. Arabic is the #4 language among US ICU patients (Barwise 2018), so this is the highest-impact locale gated behind technical plumbing.

---

## 1. Summary

OwnVoice's current locale system supports any BCP 47 string in `patientLang` / `caregiverLang`, but the component layer assumes left-to-right (LTR) reading direction. Landing Arabic (and future Hebrew, Farsi, Urdu) requires: (1) a `dir="rtl"` attribute threaded through the right container levels; (2) logical-property CSS migration so margins and padding flip automatically; (3) bidi-aware composed sentences; (4) a small audit of directional icons; (5) an Arabic-script font + contrast sanity check.

This is a single-PR initiative (~3–5 files). No new user-facing features — it's the infra that makes the Phase B-RTL locale addition (`ar.ts`) render correctly.

## 2. Context

### 2.1 Current state

- `src/components/layout/Header.tsx`, `App.tsx`, and patient-surface components use inline styles with directional properties (`marginLeft`, `paddingRight`, `borderLeft`, `left`, etc.).
- `composePainSentence` and `composeWishSentence` use simple `.replace()` template substitution that's insensitive to bidi.
- The root `<div>` in `main.tsx` has no `dir` attribute — browsers default to `ltr`.
- 13 languages are declared in `src/data/phrases.ts` including `ar`, but no locale file exists yet.
- Tests run in jsdom which doesn't render text direction visually; manual iPad testing is the bar.

### 2.2 Out of scope

- **Caregiver RTL** (case where a hospital's staff reads Arabic primarily). Technically supported by the same plumbing but the Setup wizard's English default for `caregiverLang` will be the common case. If a pilot site needs Arabic caregiver UI, the same infra handles it — no new work required beyond translating `ui.provider.*` strings.
- **Hebrew, Farsi, Urdu, Pashto, Kurdish** — all RTL languages that use the same plumbing as Arabic. Adding them after Arabic is a translation-only change.
- **Arabic-language voice quality** — Chatterbox Turbo includes Arabic in its 23-language set. Clone quality per-dialect (MSA vs. Egyptian vs. Gulf vs. Levantine) is a co-design question for Phase B-RTL, not an infra question.
- **Calendar / number formatting** — Arabic-Indic digits. `en.ts` templates use `{severity}` placeholders filled by `String(n)`. Converting to Arabic-Indic digits is an Intl.NumberFormat concern for a later locale-polish PR.

## 3. Architecture

### 3.1 RTL detection

```ts
// src/data/rtlLocales.ts (new file)
/** BCP 47 locales that render right-to-left. Used to set dir attributes
 *  and trigger bidi-aware sentence composition. */
export const RTL_LOCALES: ReadonlySet<string> = new Set([
  "ar", "he", "fa", "ur", "ps", "sd", "ku", "dv",
]);

export function isRTL(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}
```

Placed under `src/data/` for mutation-audit scope alignment with `chatterboxLocales.ts`.

### 3.2 `dir` attribute threading

Three containers need `dir` attributes that flip with the active locale:

1. **Root app container** — reflects `patientLang` (the patient's reading direction, since the patient sees the main UI).
2. **Settings sheet inner container** — reflects `caregiverLang` (staff reads Settings).
3. **Thread bubble** — each bubble's `dir` reflects the speaker's UI locale (patient bubble = `patientLang`, provider bubble = `caregiverLang`).

```tsx
// Root — in App.tsx
const patientLang = useActivePatient()?.patientLang ?? "en";
<div dir={isRTL(patientLang) ? "rtl" : "ltr"}>
  {/* patient-surface rendering */}
</div>

// Settings — in SettingsPanel.tsx
const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
<BottomSheet dir={isRTL(caregiverLang) ? "rtl" : "ltr"}>
  ...
</BottomSheet>

// Thread bubble — in Thread.tsx
<div dir={isRTL(bubbleLocale) ? "rtl" : "ltr"}>
  <DualLocaleText ... />
</div>
```

### 3.3 Logical CSS properties

Inline styles in the codebase use directional properties like `marginLeft`, `paddingRight`, `left`, `borderLeft`. These need migration to logical properties.

**Audit:** `grep -rn 'marginLeft\|marginRight\|paddingLeft\|paddingRight\|borderLeft\|borderRight\| left:\| right:' src/ --include='*.tsx' --include='*.ts'` produces the full list. Expected hits: ~100–150 across the inline-style corpus.

**Migration rule:**

| From | To |
|---|---|
| `marginLeft` | `marginInlineStart` |
| `marginRight` | `marginInlineEnd` |
| `paddingLeft` | `paddingInlineStart` |
| `paddingRight` | `paddingInlineEnd` |
| `borderLeft` | `borderInlineStart` |
| `borderRight` | `borderInlineEnd` |
| `textAlign: "left"` | `textAlign: "start"` |
| `textAlign: "right"` | `textAlign: "end"` |
| `left: N` (absolute positioning) | `insetInlineStart: N` |
| `right: N` | `insetInlineEnd: N` |

Don't migrate `top` / `bottom` — those are physical properties that don't flip.

Properties that STAY physical (intentional, direction-insensitive): `transform`, shadow offsets, flex `flex-direction: row` (becomes visually mirrored under `dir=rtl` which is usually correct).

### 3.4 Composed sentence bidi safety

`composePainSentence` currently produces:

> `I have {descriptor} pain in my {region}, level {severity} out of 10`

For Arabic, the template in `ar.ts` will be:

> `لدي ألم {descriptor} في {region}، مستوى {severity} من 10`

The `.replace()` substitution works without change — placeholders are preserved literally, and the Arabic text flows RTL naturally when the containing element has `dir=rtl`.

**Risk:** mixing Arabic + Latin (e.g. the severity number in Arabic-Indic form) creates weak-directional runs. Unicode Bidi Algorithm handles this correctly in all modern browsers and iPadOS Safari. Wrap numeric spans in `<bdi>` only if empirical testing reveals issues; skip prophylactic `<bdi>` wrapping.

**What to test manually:** `composePainSentence` + `composeWishSentence` outputs in Arabic with severity 10 / 8 / 0 — confirm the number reads correctly when rendered inside a `dir=rtl` container.

### 3.5 Directional icons

Audit for icons that carry implicit directional meaning:

- **Breadcrumb arrows** in `PainFlow` — should mirror under RTL
- **Progress bar** fill — should fill from the start (right in RTL) to the end (left in RTL)
- **Chevrons** on chips or buttons (if any)
- **Back arrow** on overlays — should mirror
- **Skip "→"** arrow in Setup — should mirror

Pattern for CSS: `transform: scaleX(var(--icon-dir, 1))` with `--icon-dir: -1` set on RTL containers. Or use logical-direction-aware Unicode characters (many arrow emojis already have "start"/"end" variants).

For this spec: catalog each directional icon in a commit-time audit; apply the mirror rule where found.

### 3.6 Fonts + contrast

- **Atkinson Hyperlegible** — the project font. Check its Arabic glyph coverage: as of 2025, AH has Latin + Vietnamese + limited Greek/Cyrillic but NOT Arabic. Arabic glyphs would fall back to the system font stack (iPadOS: likely `San Francisco Arabic` or `Geeza Pro`). That's acceptable visually but breaks the patient-facing typographic consistency.
- **Font stack update:** extend the global `font-family` on patient surfaces to include an Arabic-specific fallback:
  ```css
  font-family: "Atkinson Hyperlegible Next", "Geeza Pro", system-ui, -apple-system, sans-serif;
  ```
- **Contrast re-verify:** Arabic glyph weights differ from Latin at the same font-size. Re-check 7:1 AAA contrast (`t.text` on `t.bg`) visually on an iPad with the `ar` locale active. If Arabic looks lighter due to stroke-width differences, consider bumping the font-weight on RTL locales.

### 3.7 Text alignment for mixed-direction content

The `DualLocaleText` primitive currently doesn't set `dir` on its children. For dual-locale display where one is RTL and one is LTR (e.g. Arabic patient bubble with English gloss), each line needs its own `dir`:

```tsx
<div style={...}>
  <div data-dual-primary="" dir={isRTL(primaryLocale) ? "rtl" : "ltr"}>
    {primary}
  </div>
  {showGloss && (
    <div data-dual-gloss="" dir={isRTL(glossLocale) ? "rtl" : "ltr"}>
      {gloss}
    </div>
  )}
</div>
```

## 4. Scope and rollout

**One PR delivers:**

1. `src/data/rtlLocales.ts` + test file.
2. Root-level `dir` attribute on `App.tsx` keyed to `patientLang`.
3. Settings / BottomSheet `dir` attribute keyed to `caregiverLang`.
4. Thread bubble `dir` attribute keyed to speaker.
5. `DualLocaleText` `dir` attribute per-line.
6. Logical-CSS migration across all inline-style callsites (the big change — mechanical but many files).
7. Directional-icon mirror for PainFlow breadcrumb arrow, progress bar, any chevrons.
8. Font stack extension with Arabic fallback.
9. Component tests that render with `patientLang="ar"` and an intentionally-stub `ar.ts` containing `[ar]`-prefixed strings, asserting `dir="rtl"` on the expected containers.
10. Full `npm test` green. Manual iPad verification with `ar` locale is the release gate.

**Out of this PR:**

- Actual Arabic translation of `ui.*` + `quick.*` + SICG + pain strings (translator work).
- Arabic-specific typography polish (Intl.NumberFormat digit conversion, etc.).
- Hebrew / Farsi / Urdu — translate-only after this infra lands.

## 5. Testing

- `rtlLocales.test.ts` — `isRTL` returns true for ar/he/fa/ur/ps/sd/ku/dv and false for en/es/zh/vi.
- `App.test.tsx` — when `patientLang="ar"`, the root container has `dir="rtl"`.
- `Thread.test.tsx` — patient bubble with `patientLang="ar"` has `dir="rtl"`; provider bubble on same thread has `dir="ltr"` (caregiver still English).
- `DualLocaleText.test.tsx` — mixed-direction variant sets per-line dir attributes correctly.
- `SettingsPanel.test.tsx` — when `caregiverLang="ar"`, the sheet has `dir="rtl"`.
- Visual regression — manual iPad screenshots at each major flow (Home, Pain, Wishes, Settings) with Arabic stubs.
- WCAG 1.4.6 AAA contrast re-audit with Arabic glyphs.

## 6. Sequencing

- **Depends on:** nothing — all prerequisite infra (DualLocaleText, locale split, Setup dual pickers) has already merged.
- **Unblocks:** professional Arabic translation of the locale strings; subsequent Hebrew/Farsi/Urdu adds.
- **Recommended timing:** ship this PR alongside or before the `ar.ts` locale file arrives from translators. The stub-locale test pattern (`[ar]`-prefixed strings) lets the team validate the RTL plumbing without waiting on translations.

## 7. Open questions

- **Chatterbox Arabic dialect.** MSA vs. Egyptian vs. Gulf vs. Levantine — different dialects sound distinct. Pilot decision: which dialect is the "default" when a clinician sets `patientLang="ar"`? Possibly no default — the patient's voice sample dictates dialect naturally. Worth confirming with Chatterbox docs.
- **`<bdi>` prophylactic wrapping.** The spec says "wrap numeric spans in `<bdi>` only if empirical testing reveals issues." Decide after iPad testing whether to add `<bdi>` around severity numbers / time strings / bed numbers.
- **Mixed LTR+RTL in the conversation thread.** If `patientLang="ar"` but `caregiverLang="en"`, patient bubbles are RTL and provider bubbles are LTR in the same vertical list. Confirm this reads clearly in manual testing; the `dir`-per-bubble approach should handle it but visual rhythm can be disruptive.
- **`prefers-reduced-motion` interaction.** The dir-flip animation (if any) on language change should respect reduced-motion. No animation is currently triggered by locale change, so this is a non-issue today; flag for future locale-switch transitions.

## 8. Out-of-scope future work

- **Number formatting** via Intl.NumberFormat (Arabic-Indic vs. European digits).
- **Date / time** in Arabic locales (Hijri calendar?).
- **Currency** — not relevant for OwnVoice.
- **List ordering conventions** in Arabic that differ from English (less common in clinical UI).
