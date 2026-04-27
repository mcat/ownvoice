# OwnVoice — Design Guidelines

**Designing for patients at their most vulnerable**
**Version 0.2 · April 2026**

---

## 1. Understanding the User

These guidelines exist because OwnVoice's primary users are unlike the users of almost any other software product. They are people in crisis — physically impaired, often frightened, frequently medicated, and unable to perform the most basic human act: speaking. Every design decision must start from an understanding of who they are in this moment.

### 1.1 Physical state

Patients using OwnVoice may be experiencing one or more of the following:

- **Post-intubation weakness.** Patients recently extubated often have significant upper extremity weakness from prolonged immobility and ICU-acquired weakness, which affects up to 80% of mechanically ventilated patients.[^1] Grip strength may be reduced. Fine motor control is impaired. Reaching, pointing, and sustained arm elevation are exhausting.
- **IV lines and restraints.** One or both hands may be tethered by IV lines, arterial lines, pulse oximeters, or soft restraints. The dominant hand may be unavailable. Clinical studies of iPad-based AAC in ICU settings note that physical access to the device is one of the primary barriers to adoption.[^2]
- **Tremor and involuntary movement.** Medication effects, neurological conditions, and general debility cause hand tremor and imprecise touch. Research on motor-impaired touchscreen interaction shows tap drift of 10–20mm from intended targets is common.[^3]
- **Limited range of motion.** The patient is typically supine or semi-reclined. The tablet may be on a bedside tray, resting on their lap, or held by a mount. They may only be able to reach a portion of the screen. AAC access research recommends positioning the device at an angle on a stand rather than flat, and notes that screen positioning significantly affects independent access.[^4]
- **Fatigue.** Even brief interactions are physically taxing. A patient who can tap 20 phrases at 9am may only manage 3 by 2pm. The interface must be efficient enough that critical communication never requires many taps.
- **Gloved caregivers.** Nurses and care team members setting up or interacting with the app may be wearing medical gloves, which reduce touch precision on capacitive screens.

### 1.2 Cognitive state

- **Sedation.** Many ICU patients are on continuous or intermittent sedation. The PADIS clinical practice guidelines recommend light sedation targets for mechanically ventilated adults, but even light sedation slows processing speed, reduces attention span, and impairs decision-making.[^5] Interfaces must be immediately comprehensible, not learned.
- **Delirium.** Delirium occurs in 60–80% of mechanically ventilated ICU patients and up to 50% of those not on mechanical ventilation.[^6] Delirium causes fluctuating attention, disorganized thinking, and altered consciousness. A patient may be lucid at one moment and confused the next. The interface must be usable at the patient's worst cognitive moment, not their best.
- **Opioid and analgesic effects.** Pain medication causes drowsiness, slowed cognition, and visual blurring. Text must be readable under impaired visual acuity.
- **Sleep deprivation.** ICU patients experience severe sleep disruption from noise, light, vital sign checks, and medication schedules. The PADIS guidelines identify sleep disruption as a distinct clinical concern alongside pain, agitation, and delirium.[^5] Chronic sleep deprivation further impairs cognition, mood, and motor function.

### 1.3 Emotional state

- **Fear and anxiety.** Up to 90% of communication-impaired ICU patients report extreme distress, with associated anxiety, panic, anger, and sleeplessness.[^2] The inability to call for help, ask what's happening, or express pain creates a state of learned helplessness.
- **Frustration and anger.** Failed communication attempts compound over time. Inadequate communication may result in impaired symptom identification and reduced participation in care decisions.[^2] If the app is difficult to use, it adds to this frustration rather than relieving it. Every unnecessary tap, confusing label, or slow response is an emotional injury.
- **Loneliness and isolation.** Particularly during night shifts, patients may be alone for extended periods. Sensory deprivation through prolonged immobilization and isolation from loved ones are identified precipitating factors for ICU delirium.[^6] The app may be the patient's only tool for connection.
- **Loss of identity.** Being unable to speak in an institutional setting strips away personhood. The patient's own voice speaking through the app directly addresses this loss.

### 1.4 Environmental conditions

- **Variable lighting.** Hospital rooms range from brightly lit during procedures to near-dark during sleep hours. The interface must be readable in both extremes. Research on clinical interface design recommends dark mode support for ICU environments where clinicians and patients operate in reduced lighting.[^7]
- **Noise.** ICU baseline ambient noise levels typically range from 50–75 dB, with alarm peaks reaching 80–90 dB.[^8] Audio output must be clear and adjustable. Visual confirmation that a phrase was spoken is essential because the patient may not hear it themselves.
- **Glare.** Overhead fluorescent lighting creates screen glare. Anti-glare screen protectors are common but reduce perceived contrast.
- **Shared space.** The patient may share a room. Audio volume must be controllable and conversations may need to be private.

---

## 2. Design Principles

Three foundational principles govern every design decision in OwnVoice. They are ordered by priority.

### 2.1 Hard to use wrong

Adapted from the "hard to use wrong" principle articulated in Ku and Lupton's *Health Design Thinking*, drawn from the Firefly phototherapy device case study — a device designed so that common sources of failure are eliminated by design rather than by user training.[^9]

For OwnVoice, this means:

- **There is no wrong tap.** Tapping any phrase speaks it. There is no mode where a tap does something destructive, confusing, or irreversible. A mis-tap produces the wrong phrase — an inconvenience, not a failure. The cost of hearing "I'm cold" when you meant "I'm hot" is trivially low compared to the cost of adding a confirmation step that slows every interaction.
- **There is no wrong sequence.** The app does not require actions in a specific order. A patient can tap phrases in any category in any order. The pain flow (severity → location → descriptor) is guided but not enforced — a patient can exit at any step and the partial information still communicates something useful.
- **There is no wrong state.** The patient-facing interface has no modes, toggles, or settings that change the behavior of phrase buttons. A tap always means "speak this." There is no edit mode, no selection mode, no multi-select. The app behaves identically every time.
- **Destructive actions are physically separated.** Patient reset, voice model deletion, and settings changes are behind the caregiver interface, which requires a deliberate action to access (tap-and-hold or two-finger tap on the settings icon). A confused or delirious patient pressing random areas of the screen cannot accidentally delete their voice model or clear their conversation history.
- **Failure defaults to communication.** If the TTS model fails to load, the app falls back to the built-in Web Speech API. If WebGPU is unavailable, ONNX Runtime falls back to WASM. If audio output fails entirely, the phrase text is still displayed visually. The patient always has a way to communicate. No single technical failure should render the app silent.

### 2.2 No dead ends

Every screen, every state, and every interaction must have a clear and obvious path forward. A patient should never reach a point where they don't know what to do next, where they're stuck, or where the only option is to ask a caregiver for help navigating the interface.

Specifically:

- **Every screen has a visible way back.** The bottom tab bar is always visible and always functional. Tapping any tab returns to that category's top-level view. There is no screen in the patient interface that lacks the tab bar.
- **Multi-step flows always show progress and escape.** The pain flow shows where the patient is (severity → location → descriptor) and provides a way to go back to the previous step or abandon the flow entirely. Abandoning a flow is not penalized — no data is lost, no state is corrupted.
- **No modals or overlays in the patient interface.** Modals create dead ends for confused patients who may not understand how to dismiss them. Provider panel and settings are overlays, but these are caregiver-facing features accessed through deliberate actions. Patient-facing features use inline navigation only.
- **Empty states have clear guidance.** If a category has no phrases (which shouldn't happen, but defensive design requires it), the screen shows a clear message and a path to another category, not a blank area.
- **The conversation thread never blocks communication.** If the thread fills the screen, it scrolls, but it never covers the phrase buttons or navigation. The patient can always reach a phrase regardless of conversation length.
- **Network and loading failures are handled visibly.** If the TTS model is still loading, the app shows progress and provides immediate access to Web Speech API fallback phrases. A loading state is not a dead end — it's a temporary state with a clear expected resolution and an interim alternative.

### 2.3 Speed is safety

A patient communicating "I can't breathe" cannot wait. Latency in an AAC app is not a performance metric — it is a safety metric.

- Pre-generated phrases play in under 50ms (Tier 1 cached playback).
- Contextual suggestions are pre-generated before they appear (Tier 2 speculative generation, 50–150ms).
- Custom typed messages begin playing within 300–800ms (Tier 3 real-time synthesis).
- Visual feedback on tap appears within 50ms regardless of audio latency.

---

## 3. Interaction Design

### 3.1 Touch targets

Standard mobile touch target guidelines (44×44 CSS pixels per WCAG 2.2[^10], 48×48dp per Material Design) are **not sufficient** for this population.

**OwnVoice minimum touch target: 64×64 CSS pixels (approximately 17mm × 17mm on an iPad).**

This accounts for tremor-induced tap drift of 10–20mm[^3], imprecise reach from a supine position, reduced grip strength, and interaction through bedside table positioning. For critical actions (Yes, No, I need help), targets should be even larger — at minimum 80×80 CSS pixels.

**Minimum spacing between targets: 12px.**

Healthcare-specific accessibility guidance recommends touch targets of at least 48×48dp with 8dp spacing for motor-impaired and elderly users.[^11] OwnVoice exceeds this baseline to account for the compounding impairments of acute illness. Adjacent targets must have enough dead space that a tremor-driven mis-tap doesn't trigger the wrong phrase.

### 3.2 Touch interaction model

- **Single tap only.** No double-tap, long-press, pinch, swipe, or multi-finger gestures anywhere in the patient-facing interface. Every interaction is a single touch. Motor-impairment accessibility research identifies complex gestures as a primary barrier for users with limited motor control.[^3]
- **No drag interactions.** Scrolling is acceptable (it's a natural single-finger motion), but no drag-to-reorder, slider controls, or pull-to-refresh for patients. The pain scale must use discrete tap targets (0, 1, 2... 10), never a slider. This follows the "hard to use wrong" principle: a slider requires sustained finger contact and precise positioning, both of which are unreliable under tremor or weakness.
- **No hover states.** There is no hover on a touchscreen. Do not design interactions that depend on hover for discoverability.
- **Generous tap debouncing.** A 300ms debounce prevents accidental double-fires from tremor. If a patient taps "I need help" and their hand shakes on the screen, it should fire once.
- **Immediate visual feedback.** On tap, the button must change state within 50ms (color shift, scale animation). This confirms the touch registered before the audio plays. For patients with hearing loss or in noisy environments, visual confirmation is the primary feedback channel.

### 3.3 Scroll behavior

- Vertical scroll only. No horizontal scrolling within the main content area (horizontal scroll is acceptable for the contextual suggestion pills, which are a secondary UI element).
- No infinite scroll. The patient must be able to see where they are in a list and how much remains.
- Scroll position must persist when switching between tabs.

### 3.4 Navigation

- **Bottom tab bar** is the primary navigation. This is the most reachable area of the screen for a patient holding a tablet on their lap or on a bedside tray. Top-of-screen navigation requires shoulder elevation, which is exhausting and may be impossible for post-intubation patients.
- **Maximum two taps to any phrase.** Tab → phrase. For subcategories (e.g., I Need → Medical → "I need my medication"), this extends to three taps, which is the absolute maximum depth.
- **No hamburger menus, no hidden navigation.** Everything patient-facing must be visible. The patient cannot be expected to discover features. Recognition over recall is a core usability heuristic[^12], and it applies with amplified force to cognitively impaired users.
- **Persistent emergency phrase.** A persistent, always-visible "I need help" button accessible from every screen. This is the AAC equivalent of a nurse call button and should never be more than one tap away. This follows the no-dead-ends principle: regardless of where the patient is in the app, help is one tap away.

---

## 4. Visual Design

### 4.1 Typography

- **Minimum body text size: 18px.** This accounts for opioid-induced visual blurring, age-related vision changes, and screen distance (the tablet may be 40–60cm from the patient's eyes on a bedside tray).
- **Phrase button text: 16px minimum, 18px preferred.** Bold weight (600+) for all phrase labels.
- **Conversation thread text: 16px minimum.**
- **Caregiver-facing UI (settings, setup wizard): 14px minimum.** Caregivers are closer to the screen, cognitively intact, and under less visual stress.
- **Font choice:** Use a humanist sans-serif with open apertures and distinct letterforms. Characters like I/l/1, O/0, and rn/m must be visually distinct. Atkinson Hyperlegible, designed specifically for low-vision readability by the Braille Institute[^13], is the recommended choice for the patient-facing interface.
- **Line height: 1.5 minimum** for any multi-line text.
- **No italics** in the patient-facing interface. Italics reduce legibility under visual impairment.
- **No ALL CAPS for phrases.** Sentence case only. All-caps text removes word-shape recognition cues that aid reading under cognitive impairment.
- **Support 200% text scaling** without horizontal scrolling or content overlap, per WCAG 2.1 SC 1.4.4.[^10]

### 4.2 Color, contrast, and color blindness

**Contrast ratios:**
- **Minimum contrast ratio: 4.5:1 for all text** (WCAG 2.1 AA). **Target 7:1** (WCAG AAA) for phrase button labels and any text the patient must read to communicate. Healthcare accessibility guidance recommends targeting AAA contrast for critical clinical content.
- **Verify contrast for every text/background combination.** This includes text inside colored message bubbles (e.g., white text on blue patient bubbles), text in the speaking overlay, timestamp and meta-text, and text on button states (default, tapped, disabled).
- **Never use opacity to create secondary text colors.** Opacity-based text (e.g., `opacity: 0.5`) produces unpredictable contrast depending on the background. Always use explicit color values that have been verified against their specific background. This is especially important for dark mode, where opacity-reduced white text on dark backgrounds can drop below readable contrast thresholds.
- **Audit contrast in both light and dark modes independently.** A color that passes 4.5:1 in light mode may fail in dark mode or vice versa. Maintain separate verified color tokens for each theme.

**Color blindness (affects ~8% of males, ~0.5% of females):**
- **Never use red-green color encoding for critical information.** The pain scale must not use a green-to-red gradient. Use a single-hue intensity ramp (e.g., light indigo to deep indigo) where increasing intensity maps to increasing severity. The numeric label on each level is the primary information channel; color is reinforcement only.
- **Test all color-differentiated elements with a color blindness simulator.** Tools like Stark, Sim Daltonism, or Chrome DevTools' vision deficiency emulation should be part of every design review. Test for protanopia (red-blind), deuteranopia (green-blind), and tritanopia (blue-blind).
- **Use shape, position, weight, or text label to differentiate — not color alone.** The active tab in the bottom bar should be identifiable by a structural indicator (filled background, indicator dot, heavier text weight) even if the user cannot perceive the color difference. WCAG 2.1 SC 1.4.1 (Use of Color) requires this.
- **Patient vs. provider messages must be distinguishable without color.** Currently, patient messages are right-aligned (blue) and provider messages are left-aligned (white/card). The positional difference alone makes them distinguishable without color perception. Add speaker labels ("Margaret" / "Nurse Davis") on every message for redundancy.

**Semantic color palette:**
- Use a constrained, purposeful palette where every color has one meaning:
  - **Blue (#2563EB):** Patient actions, primary interactive elements, patient message bubbles
  - **Green (#059669):** Provider/care team, confirmation, voice status
  - **Red (#DC2626):** Urgency, help button only. Do not use red for errors — in a clinical context, red means emergency.
  - **Indigo ramp (#C7D2FE → #3316A0):** Pain severity scale (colorblind-safe intensity progression)
  - **Neutrals:** All other text, borders, backgrounds. Neutral grays should be warm (slight yellow/brown undertone) in light mode to reduce the clinical/sterile feeling.
- **Avoid decorative color.** In a healthcare AAC context, every color the patient sees should convey information. Decorative gradients, colorful backgrounds, or multi-hued illustrations add visual noise without aiding communication.

**Dark mode specifics:**
- Dark mode background should be a true dark (#111113) rather than a gray, to maximize contrast and reduce light emission at night.
- Avoid pure white (#FFFFFF) text on dark backgrounds — use a slightly warm off-white (#F5F5F5) to reduce perceived harshness and eye strain.
- Blue interactive elements need to be slightly lighter in dark mode to maintain contrast (consider #3B82F6 instead of #2563EB).
- Auto-activate dark mode based on ambient light or time of day, with a manual toggle always available in the header.

**Light and dark mode should be separate verified palettes, not computed.** Do not derive dark mode colors by inverting or adjusting light mode values programmatically. Each theme should be a hand-verified set of color tokens where every foreground/background pair has been checked for contrast compliance.

### 4.3 Icons and imagery

- **Icons accompany text, they don't replace it.** "Icons and Text" display mode should be the default. "Icons Only" is available for patients who cannot read, but it should not be the default.
- **Icons must be concrete, not abstract.** Patients with delirium or cognitive impairment interpret literally.[^6] The icon for "I need water" should look like water, not an abstract symbol.
- **Consistent icon style.** All icons should share a visual language — same line weight, same level of detail, same color treatment.
- **Consider photorealistic alternatives.** Clinical AAC research shows that photorealistic images are easier to comprehend for patients with cognitive impairment than stylized symbols.[^4]

### 4.4 Layout

- **Content gravity: center and bottom of screen.** The most frequently used elements should be in the lower two-thirds of the screen, within easy reach of a supine patient.
- **No dense grids.** Maximum 3 columns for phrase buttons on an 11-inch iPad, 4 on a 13-inch. More columns means smaller targets and higher mis-tap risk.
- **Generous padding.** Whitespace between interactive elements is a safety margin, not wasted space.
- **Fixed elements stay fixed.** The header, bottom tab bar, and any persistent emergency button must not scroll. The patient must never lose access to navigation (no-dead-ends principle).
- **No overlapping elements in the patient interface.** Modals create dead ends for confused patients. Caregiver-facing features may use overlays; patient-facing features use inline navigation only.

---

## 5. Cognitive Load

### 5.1 Reduce choices per screen

Decision-making degrades rapidly under sedation and sleep deprivation.[^5] Hick's Law — reaction time increases logarithmically with the number of options — applies with amplified force to cognitively impaired users.

- **Maximum 12 phrase buttons visible at once** without scrolling. Fewer is better. The Quick tab shows 6 — this is a good target.
- **Use progressive disclosure.** Categories → subcategories → phrases. Don't show everything at once. But keep depth shallow (max 3 taps, per the no-dead-ends principle).
- **Group related items visually.** Subcategory chips (Comfort, Medical, People) help the patient scan and orient without reading every phrase.

### 5.2 Eliminate memory burden

- **No modes that the patient must remember.** The app should never be in a state where tapping a button does something different than it did last time (hard-to-use-wrong principle).
- **Show state explicitly.** If the patient is in the pain flow, show a visible breadcrumb or progress indicator ("Pain > Level 7 > Chest > describe it").
- **The conversation thread is external memory.** Patients with delirium may forget what they just said.[^6] The visible conversation thread serves as a reference.

### 5.3 Use recognition over recall

- **Every option is visible.** If it's not on screen, it doesn't exist for this user. This follows Nielsen's recognition-over-recall heuristic[^12], applied to a population where recall is clinically impaired.
- **Phrase text matches spoken output exactly.** What you see is what you hear. No reformulation.
- **Icons reinforce text.** The combination of visual icon + written text + spoken audio creates three encoding channels, supporting patients with impairment in any one modality.

---

## 6. Audio Design

### 6.1 Speech output

- **Volume must be adjustable** and loud enough to be heard over ambient ICU noise, which typically ranges from 50–75 dB with alarm peaks at 80–90 dB.[^8] Provide a visible volume control, not buried in settings.
- **Speech rate should be natural, not rushed.** Slightly slower than conversational pace.
- **Visual confirmation accompanies every utterance.** The speaking indicator confirms that speech is happening even if the patient can't hear it.
- **No audio interruption on rapid taps.** If a patient taps a second phrase while the first is still speaking, queue it. Don't cut off the first phrase.

### 6.2 Notification sounds

- **No alarm-like sounds.** ICU patients and staff already experience alarm fatigue — clinicians override 93–96% of clinical alarms due to poor prioritization.[^7] Any audio feedback from OwnVoice must be soft, non-medical, and clearly distinguishable from clinical alarms.
- **Consider haptic feedback** as an alternative to audio confirmation tones.

---

## 7. Accessibility Tiers

Not every patient can tap a screen with their finger. AAC access research documents that users with physical impairments may use fingers, knuckles, toes, styluses, mouth sticks, head tracking, eye gaze, or switches to interact with communication devices.[^4]

### Tier 1: Direct touch (v1)

The default interaction method. Patient touches phrase buttons directly. Design supports imprecise touch through large targets and generous spacing.

### Tier 2: Stylus and adaptive tools (v1)

Capacitive styluses, mouth sticks, or hand-strapped pointers. All touch targets must work with a single point of contact without requiring pressure or multi-touch.

### Tier 3: iPad accessibility features (v1)

OwnVoice must be fully compatible with iPadOS built-in accessibility:

- **Switch Control:** iPadOS scans through on-screen elements and selects them via an external switch. All interactive elements must be properly labeled and focusable. Tab order must be logical. Switch users rely on consistency of UI element positions across screens.[^3]
- **AssistiveTouch:** Custom gestures and on-screen controls for patients with limited range of motion.
- **Head Tracking / Eye Tracking:** iPad Pro's TrueDepth camera supports head tracking as a pointer replacement. Elements must be large enough for dwell selection.
- **VoiceOver:** Must work on caregiver-facing screens. Patient-facing screens should be VoiceOver-compatible.

### Tier 4: External switch hardware (v2)

Bluetooth-connected external switches and sip-and-puff devices via iPadOS Switch Control. Requires proper semantic markup and focus management, plus testing with actual switch hardware.

### Tier 5: Dwell selection (v2)

Configurable dwell-to-select mode (default: 1 second hover to select) for head tracking or eye tracking. Requires app-level implementation.

---

## 8. Caregiver vs. Patient Interface

### Patient-facing (primary)

- Large touch targets, minimal text, maximum visual clarity
- No settings access, no destructive actions (hard to use wrong)
- No modals or overlays (no dead ends)
- Optimized for one-handed, imprecise, fatigued interaction
- Emotional warmth in language ("I feel" not "Select emotional state")

### Caregiver-facing (secondary)

- Standard mobile UI conventions are acceptable
- Settings, voice management, patient reset, provider panel
- Can use smaller text, more dense layouts, standard touch targets
- Protected behind a deliberate action (tap-and-hold or two-finger tap) to prevent confused patients from accidentally accessing destructive actions

---

## 9. Emotional Design

### 9.1 Language and tone

- **First person, active voice.** "I need water," not "Patient requests water." The phrases speak as the patient. This reinforces identity and agency.
- **Warm, not clinical.** "I'm scared" not "Patient reports anxiety."
- **No jargon** unless patients use it themselves.

### 9.2 Emotional expression as a first-class feature

Emotional phrases must be as prominent and accessible as physical needs. "I'm scared" is as important as "I need water." Research shows that inadequate communication is associated with anxiety, panic, anger, frustration, sleeplessness, and distress in ICU patients.[^2] The emotional vocabulary in OwnVoice directly addresses these documented harms.

### 9.3 The voice as emotional design

The patient's cloned voice is the single most powerful emotional design element. When personal voice is active, the speaking indicator shows the patient's name ("Speaking as Margaret"), reinforcing personhood for both patient and caregiver.

### 9.4 Avoid infantilization

- Do not use cartoon imagery, child-like colors, or oversimplified language for adult patients. Simplicity is not childishness.
- Do not use praise language ("Great job!") in response to patient actions. The patient is communicating, not performing. This is an AAC anti-pattern borrowed from pediatric tools that is inappropriate for adults experiencing a temporary limitation.
- Ku and Lupton emphasize that individuals who experience ailments or disabilities are experts on their own life condition.[^9] The interface should reflect this respect.

---

## 10. Error Prevention and Recovery

### 10.1 Prevent before correct (hard to use wrong)

- **No destructive actions in the patient interface.** A patient cannot delete their voice model, reset their profile, or clear conversation history.
- **No confirmation dialogs for phrases.** Tapping a phrase immediately speaks it. The cost of a mis-tap (hearing the wrong phrase) is far lower than the cost of a confirmation step that slows every interaction in an emergency.
- **State is always recoverable.** No patient action produces an irreversible result. Even in the pain flow, going back to a previous step is always possible (no dead ends).

### 10.2 Handle mis-taps gracefully

- The conversation thread provides context for caregivers. If a patient accidentally says "I'm cold" when they meant "I'm hot," the caregiver can see both messages.
- Consider a quick-access "That's wrong" correction phrase (v2).

### 10.3 Graceful degradation (no dead ends, even in failure)

- If the TTS model fails → fall back to Web Speech API.
- If WebGPU is unavailable → fall back to WASM inference.
- If audio output fails → phrase text is displayed visually.
- If the device battery is critically low → the interface remains usable until shutdown.
- No single technical failure renders the app non-functional. Every failure mode has a fallback that preserves communication.

---

## 11. Design Process

Informed by the health design thinking methodology described by Ku and Lupton[^9], OwnVoice's design process must be as intentional as its design output.

### 11.1 Codesign, not just empathy

Ku and Lupton draw a critical distinction: empathy is necessary but insufficient. Focusing exclusively on empathy separates "us" (designers) from "them" (patients). Patients and caregivers must be active participants in design, not objects of empathic feeling.[^9]

**For OwnVoice this means:**

- Recruit 3–5 former ICU patients and family members as codesign partners before Phase 2 (Core Product) begins. These individuals are not testers — they are designers with lived expertise.
- Involve at least 2 bedside nurses (day shift and night shift) as codesign partners. Their workflow constraints shape setup speed, device positioning, and between-patient reset.
- Codesign the phrase library collaboratively. Which phrases do patients actually need? Which emotional expressions matter most? Which are missing? The current phrase list is an educated guess — codesign makes it evidence-based.
- Codesign sessions should be compensated and accessible (remote participation, flexible scheduling, accommodation for disability).

### 11.2 Embodied simulation

The design team should physically simulate the patient experience to build foundational empathy. Ku and Lupton recommend activities like sleeping in an emergency department, navigating a hospital in a wheelchair, and taking complex medication schedules.[^9]

**For OwnVoice, the team should:**

- Communicate exclusively through the app for one hour while lying in a hospital bed with one hand immobilized and a pulse oximeter on the other.
- Attempt to use the app wearing simulation gloves that reduce fine motor control (tremor gloves are commercially available for medical education).
- Use the app in a noisy environment with simulated ICU ambient sound.
- Attempt to set up a new patient in under 60 seconds while a colleague interrupts with questions (simulating a busy nurse's workflow).

**However, the book warns explicitly:** simulated experience does not replicate the emotional reality of illness. People most often experience health care when feeling unwell and unlike their normal selves — they may be anxious, scared, or harboring other feelings not fully present in a simulated experience.[^9] Embodied simulation is a starting point for empathy, not a substitute for codesign with real patients or for clinical pilot testing.

### 11.3 Journey mapping

Map the full patient arc, not just the moment of app interaction:

- **Pre-admission:** A family receives a call that their loved one is being intubated. When and how are they asked for a voice sample? What format is it in? What emotional state are they in when they provide it?
- **Setup:** A nurse on a busy shift picks up a tablet. How many seconds do they have? What are they doing immediately before and after? Is this their patient or a covering nurse?
- **First use:** The patient is emerging from sedation. They may be disoriented, frightened, and unsure where they are. What is the first thing they see? Is it immediately clear that this is a tool for them to speak?
- **Ongoing use:** Shift changes. New nurses unfamiliar with the device. Family visits where the patient wants to express emotion, not just needs. Night hours when the patient is alone.
- **Between patients:** How does reset work in the context of room turnover, cleaning protocols, and device sanitization?
- **Re-admission:** A patient returns weeks later. Is their voice still available? How does the nurse know?

Each stage of this journey reveals design requirements that screen-level design thinking cannot surface.

### 11.4 Storytelling as design tool

Ku and Lupton treat narrative as central to health design, not as a marketing artifact.[^9] OwnVoice's defining story is:

*Margaret's daughter sent a voicemail from last Thanksgiving. Three minutes later, when Margaret tapped "I'm scared," her own voice filled the room, and her night nurse stopped charting and came to her bedside.*

Every feature and design decision should pass the test: does this make Margaret's story better? Does this get in the way of Margaret's story?

### 11.5 Clinical pilot as codesign

The Phase 3 clinical pilot described in the PRD should be structured not as validation testing but as a codesign session. The patients and nurses in that pilot are designers, not test subjects. Specific methods:

- **Observation:** Watch patients and nurses use the app in real clinical conditions. Note what they do, not just what they say. Where do they hesitate? What do they try that doesn't work?
- **Contextual interviews:** Brief, bedside conversations with patients (where possible) and nurses. What phrase did they wish existed? When did the app frustrate them? What did they use instead?
- **Photo journaling:** Ask nurses to photograph how and where they position the tablet, what their workspace looks like during setup, and any workarounds they create.
- **Rapid iteration:** Fix observed problems between pilot sessions, not after the pilot concludes. If a nurse says "my patient couldn't reach the bottom of the screen," adjust content gravity that week.

---

## 12. Clinical Environment Integration

### 12.1 Infection control

- The app must function with standard screen protectors and antimicrobial screen covers.
- Touch sensitivity settings should be adjustable to account for screen protectors.
- Patient reset supports infection control workflows (new patient = clean device = clean app state).

### 12.2 Shared device considerations

- No patient data should persist visually after a reset.
- No login or authentication for the patient. Authentication barriers are incompatible with a patient who cannot speak.
- Caregiver features may optionally be protected by a simple PIN.

### 12.3 Night mode

- Auto-dimming or dark mode that activates in low-light conditions.
- The speaking indicator should use muted visual effects at night.

---

## 13. Design Review Checklist

Before any screen ships, verify:

**Hard to use wrong:**
- [ ] Can a confused or delirious patient tap randomly without causing harm?
- [ ] Is every patient-facing action non-destructive and reversible?
- [ ] Does every button do the same thing every time, regardless of app state?
- [ ] Are destructive actions physically separated behind a deliberate caregiver gesture?

**No dead ends:**
- [ ] Can the patient reach the home screen from this screen in one tap?
- [ ] Is the bottom tab bar visible and functional?
- [ ] Does this screen have a clear path forward and a clear path back?
- [ ] If a failure occurs on this screen, is there a visible fallback?
- [ ] Can the patient still communicate if this specific feature breaks?

**Speed and safety:**
- [ ] Does visual feedback appear within 50ms of a tap?
- [ ] Is the most urgent phrase on this screen reachable in one tap?

**Physical accessibility:**
- [ ] Are all touch targets at least 64×64 CSS pixels with 12px spacing?
- [ ] Can every interactive element be used with a single, imprecise tap?
- [ ] Is the screen usable with only one hand, from a semi-reclined position?
- [ ] Has this screen passed the manual switch-testing protocol? See [docs/switch-testing-protocol.md](./switch-testing-protocol.md) — the macOS Switch Control proxy is the v0.1 verification bar; iPadOS hardware verification is deferred to A2.

**Cognitive accessibility:**
- [ ] Can the screen be understood by a person who just woke from sedation?
- [ ] Are there 12 or fewer choices visible without scrolling?
- [ ] Is every option visible without recall or discovery?
- [ ] Does phrase text exactly match spoken output?

**Visual accessibility:**
- [ ] Does text contrast meet 7:1 ratio for phrase labels?
- [ ] Does the screen work in bright overhead lighting and in near-darkness?
- [ ] Does every interactive element have a visible text label?

**Emotional design:**
- [ ] Does this screen treat the patient as a capable adult?
- [ ] Are emotional expressions as accessible as physical needs?

**Codesign validation:**
- [ ] Has this screen been reviewed by a codesign partner with lived ICU experience?
- [ ] Has this screen been tested by a nurse in a simulated workflow?

---

## References

[^1]: Appleton, R.T., Kinsella, J., & Quasim, T. (2015). "The incidence of intensive care unit-acquired weakness syndromes: A systematic review." *Journal of the Intensive Care Society*, 16(2), 126–136.

[^2]: Dind, A.J., Starr, J.S., & Arora, S. (2021). "iPad-based Apps to Facilitate Communication in Critically Ill Patients with Impaired Ability to Communicate: A Preclinical Analysis." *Indian Journal of Critical Care Medicine*, 25(11), 1232–1240.

[^3]: Naftali, M., & Findlater, L. (2014). "Accessibility in Context: Understanding the Truly Mobile Experience of Smartphone Users with Motor Impairments." *ASSETS '14: ACM SIGACCESS Conference on Computers and Accessibility*. See also: Vendome, C., et al. (2024). "MotorEase: Automated Detection of Motor Impairment Accessibility Issues in Mobile App UIs." *arXiv:2403.13690*.

[^4]: AAC Community. "AAC and Physical Access: Options for Every Body." aaccommunity.net. See also: Beukelman, D.R. & Light, J.C. (2020). *Augmentative & Alternative Communication*, 5th ed. Paul H. Brookes Publishing.

[^5]: Devlin, J.W., Skrobik, Y., Gélinas, C., et al. (2018). "Clinical Practice Guidelines for the Prevention and Management of Pain, Agitation/Sedation, Delirium, Immobility, and Sleep Disruption in Adult Patients in the ICU." *Critical Care Medicine*, 46(9), e825–e873.

[^6]: Ely, E.W., Shintani, A., Truman, B., et al. (2004). "Delirium as a predictor of mortality in mechanically ventilated patients in the intensive care unit." *JAMA*, 291(14), 1753–1762. See also: Girard, T.D., et al. (2008). "Efficacy and safety of a paired sedation and ventilator weaning protocol." *The Lancet*, 371(9607), 126–134.

[^7]: Creative Navy. "Healthcare UX & Patient Safety." creative.navy/blog. See also: Ruskin, K.J. & Hueske-Kraus, D. (2015). "Alarm fatigue: impacts on patient safety." *Current Opinion in Anesthesiology*, 28(6), 685–690.

[^8]: Darbyshire, J.L. & Young, J.D. (2013). "An investigation of sound levels on intensive care units with reference to the WHO guidelines." *Critical Care*, 17(5), R187.

[^9]: Ku, B. & Lupton, E. (2022). *Health Design Thinking: Creating Products and Services for Better Health*, 2nd ed. MIT Press / Cooper Hewitt, Smithsonian Design Museum.

[^10]: W3C. "Web Content Accessibility Guidelines (WCAG) 2.1." w3.org/TR/WCAG21. Level AA and AAA conformance criteria.

[^11]: Boundev. (2026). "Healthcare App Accessibility and WCAG Compliance Guide." boundev.com/blog.

[^12]: Nielsen, J. (1994). "10 Usability Heuristics for User Interface Design." Nielsen Norman Group. nngroup.com.

[^13]: Braille Institute. "Atkinson Hyperlegible Font." brailleinstitute.org/freefont.

---

*These guidelines should be revisited after every clinical pilot session. The patients will teach us what we got wrong.[^9]*
