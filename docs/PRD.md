# OwnVoice — Product Requirements Document

**In-Patient AAC Web Application**
**Version 0.1 · April 2026 · Draft**

---

## 1. Vision

OwnVoice is a browser-based augmentative and alternative communication (AAC) application that runs on hospital tablets. It helps patients who cannot speak, write, or use a phone communicate with their care team — in their own voice.

Unlike existing AAC tools that rely on generic text-to-speech and static phrase boards, OwnVoice recreates the patient's actual voice from a short audio sample, enabling a human connection between patient and caregiver that current tools cannot provide.

OwnVoice runs entirely on-device. No patient data is transmitted, stored remotely, or accessible to anyone outside the room. The app is a URL — no App Store download, no MDM configuration, no IT ticket required. A nurse opens it, types a name, and hands it to a patient.

---

## 2. Problem

Approximately 2.5 million Americans experience conditions that impair their ability to speak. In acute care settings — ICUs, post-surgical recovery, stroke units, ventilator wards — patients frequently lose the ability to communicate for days or weeks at a time.

Current tools fail these patients in several ways:

- **Communication boards** (laminated cards, picture grids) are slow, impersonal, and offer no way to express emotions, ask nuanced questions, or communicate with providers who speak a different language.
- **Existing AAC apps** offer pre-built phrase libraries with generic text-to-speech voices. They treat every patient identically, lack emotional expression categories, don't support true two-way conversation, and require App Store installation and enterprise MDM deployment.
- **Caregivers report** that a generic robotic voice creates emotional distance. Hearing a patient's actual voice saying "I'm scared" or "thank you" changes the quality of the interaction fundamentally.

The gap is not just technological — it's human. Patients in these settings experience fear, loneliness, confusion, and loss of autonomy. The inability to communicate amplifies all of these. Restoring a patient's voice, even synthetically, restores a piece of their identity.

---

## 3. Target Users

### Primary: Non-verbal patients in acute care

- Post-intubation / ventilator patients
- Post-surgical patients (throat, jaw, neurological)
- Stroke patients with expressive aphasia
- Patients with temporary or progressive conditions affecting speech (ALS, Guillain-Barré, head/neck trauma)
- Patients with limited English proficiency who face compounded communication barriers

### Secondary: Bedside caregivers

- Nurses and nursing assistants (primary day-to-day users who set up the device)
- Physicians during rounds
- Respiratory therapists, physical therapists, chaplains
- Family members visiting the patient

### Buyer: Hospital systems and health networks

- Chief Nursing Officers and nursing informatics teams
- Patient Experience / HCAHPS leadership
- Infection prevention (shared device protocols)
- Clinical engineering and biomedical IT

---

## 4. Product Principles

1. **Speed is safety.** A patient saying "I can't breathe" cannot wait 2 seconds. Phrase playback must feel instant — soundboard-level latency.
2. **Zero deployment friction.** A URL, not an app. No IT involvement to get started. Enterprise features layer on, they don't gate access.
3. **The patient's voice matters.** Personal voice is the core differentiator and the emotional center of the product. Everything else is table stakes.
4. **Offline by default.** Hospital WiFi is unreliable, may be firewalled, or may be unavailable in certain wards. The app must function fully without any network connection after initial load.
5. **Nothing leaves the device.** No PHI is ever transmitted. No analytics contain patient-identifiable data. Voice models are created and stored on-device only.
6. **Two-way, not one-way.** Communication is a conversation. The provider's voice and responses are first-class features, not afterthoughts.

---

## 5. Device Requirements

### Supported hardware

| Device | Chip | RAM | WebGPU | Voice Cloning | Notes |
|---|---|---|---|---|---|
| iPad Pro 11"/13" (M5, 2025) | Apple M5 | 12–16 GB | Yes (Safari 26, Metal) | Full support | Primary target device |
| iPad Pro (M4, 2024) | Apple M4 | 8–16 GB | Yes (Safari 26, Metal) | Full support | |
| iPad Air (M3/M4) | Apple M3/M4 | 8 GB | Yes (Safari 26, Metal) | Full support | |
| iPad (A16, 11th gen) | Apple A16 | 8 GB | Yes (Safari 26, Metal) | Supported (smaller model) | Budget deployment option |
| iPad (A14, 10th gen) | Apple A14 | 4 GB | Limited | Fallback to standard TTS | Minimum viable device |

### Software requirements

- iPadOS 26 or later (required for WebGPU in Safari)
- Safari 26 or later
- No additional software installation required

### Why iPad

Hospital tablet deployments overwhelmingly use iPads due to Apple's MDM ecosystem (Jamf), infection control cases available for iPad form factors, established procurement relationships, and AppleCare for Enterprise support agreements. Android tablet support is a future consideration but not a v1 priority.

---

## 6. Core Features

### 6.1 Personal Voice (Voice Cloning)

**The defining feature of OwnVoice.** A caregiver uploads 3–10 seconds of the patient's voice (from a voicemail, video, or voice message provided by family). The app creates a speaker embedding on-device using a zero-shot voice cloning model. All speech output uses the patient's reconstructed voice.

Providers can also load their own voice model. When a provider taps a response like "I will call your family," it is spoken in the provider's voice, translated into the patient's language. The patient hears a familiar caregiver voice speaking their language.

**Technical approach:**

- Speaker embeddings are extracted from the reference audio (~1–5 MB per voice)
- A shared base TTS model (quantized ONNX, ~250–500 MB) handles all speech synthesis
- Two speaker embeddings (patient + provider) are stored alongside the base model
- All processing uses WebGPU via ONNX Runtime Web, mapped to Metal on iPad

**Fallback behavior:**

- If no voice sample is provided, the app uses the device's built-in Web Speech API with a standard voice
- If the base TTS model fails to load or is evicted from storage, the app degrades gracefully to Web Speech API
- The patient always has a voice — personal voice is an enhancement, not a gate

### 6.2 Pre-Generated Audio Architecture

To achieve soundboard-level latency (< 50ms for fixed phrases), OwnVoice pre-generates all known phrases as cached audio clips immediately after a voice model is created.

**Latency tiers:**

| Tier | Latency target | Trigger | Description |
|---|---|---|---|
| Tier 1: Cached playback | < 50ms | Tapping any fixed phrase | ~150 pre-built phrases across all categories, pre-generated as compressed audio (Opus), stored in OPFS. On tap, decode and play via Web Audio API. Covers 90%+ of interactions. |
| Tier 2: Speculative generation | 50–150ms | Contextual suggestions, pain flow predictions | Time-of-day suggestions and likely next phrases in multi-step flows are generated just before they're needed. |
| Tier 3: Real-time synthesis | 300–800ms | Custom typed messages from the keyboard | The TTS model stays loaded in GPU memory. Audio is streamed — playback begins before full generation completes. Used infrequently. |

**Background generation workflow:**

1. Caregiver uploads voice sample → speaker embedding created (2–5 seconds)
2. App immediately begins background generation of all fixed phrases
3. A subtle progress indicator shows status: "Preparing Margaret's voice... 47/150"
4. App is usable immediately — any phrase not yet cached falls back to standard TTS
5. Cached clips replace fallback voices as they become available
6. Full generation completes in approximately 3–5 minutes depending on device
7. On language change, affected phrases are re-queued for generation

**Storage footprint:**

- A 2–3 second audio clip compressed as Opus: ~10–20 KB
- 150 phrases × 2 voices × 2 languages = ~600 clips = ~6–12 MB total
- Base TTS model: ~250–500 MB
- Suggestion language model (q4): ~500 MB–1 GB
- Speech-to-text model (Whisper small q4): ~250 MB
- Speaker embeddings: ~2–10 MB
- **Total footprint: ~1.5–2 GB** (iPad Pro M5 primary target; A16 iPad may require on-demand model loading)

### 6.3 Communication Categories

OwnVoice organizes patient communication into five primary categories accessible from a bottom tab bar (optimized for patients holding a tablet while lying in bed):

**Quick** — High-frequency phrases: Yes, No, Thank you, Please wait, I need help, I don't understand.

**I Need** — Organized into subcategories:
- Comfort: water, food, temperature, bed adjustment, bathroom, lighting
- Medical: medication, suction, nausea, breathing difficulty, nurse, doctor
- People: family, companionship, phone call, chaplain, interpreter

**I Feel** — Separated into physical and emotional states:
- Physical: tired, uncomfortable, weak, better, restless, itchy
- Emotional: scared, lonely, frustrated, confused, safe, grateful, worried, embarrassed, hopeful, bored

**Pain** — A guided three-step flow:
1. Severity — Uses the Emoji-FPS (Li et al., JMIR 2023), a clinically validated 6-face emoji pain scale at levels 0/2/4/6/8/10. The Emoji-FPS showed Spearman ρ 0.91–0.95 correlation with Wong-Baker FACES, NRS, VAS, and FPS-R in adult surgery patients, was the most preferred scale among patients, and is open-source (CC-BY 4.0) with no licensing required. Cross-platform consistency is validated across iOS, Android, Microsoft, and OpenMoji (weighted κ 0.96–0.97).
2. Location (body region selection)
3. Descriptor (aching, burning, sharp, throbbing, etc.)
4. Constructs a complete sentence: "I have sharp pain in my chest, level 8 out of 10"

**Questions** — Common patient questions: What time is it? What day is it? When can I go home? Can you explain my treatment? When can I see my family?

### 6.4 Two-Way Conversation

OwnVoice maintains a visible conversation thread showing both patient and provider messages in a chat-style interface. This provides continuity across interactions and shift changes.

**Provider panel:** Accessible via a dedicated header button, containing structured responses organized into three sections:
- Responses: "I will call your family," "The doctor will be here soon," etc.
- Questions: "How are you feeling?", "Is there anything you need?"
- Directions: "Time for your medication," "I need to draw blood"

Provider responses are spoken in the provider's cloned voice (if configured) and translated into the patient's language. Both the original and translated text appear in the conversation thread.

**Conversation thread behavior:**
- Scrollable, showing the last several exchanges
- Each message labeled with speaker name and timestamp
- Thread persists across app sessions for the current patient
- Cleared on patient reset (between patients)

**Tap to say again:** Any message in the conversation thread can be tapped to repeat it. This re-triggers the speaking output without adding a duplicate entry to the thread. A subtle repeat icon (↻) on each message bubble indicates the affordance, and visual feedback confirms the repeat is firing.

This addresses a critical real-world scenario: a patient says "I'm in pain" but the nurse is across the room or didn't hear. Rather than navigating back to the Pain category or the phrase library, the patient taps the message they already sent. The repeat fires instantly from the pre-generated audio cache — same voice, same phrase, zero navigation.

Both patient and provider messages are repeatable. A provider who said "The doctor will be here soon" can tap it again an hour later without reopening the provider panel.

### 6.5 Contextual Intelligence

The app adapts to context without requiring configuration:

- **Time-of-day suggestions:** Morning surfaces sleep quality and breakfast requests; evening surfaces sleep difficulty, pain, and family contact
- **Sequential prediction:** During the pain flow, after selecting severity and location, the most common descriptors are pre-generated before the patient reaches that step
- **Frequency adaptation:** Phrases the patient uses most often float to more prominent positions over time (v2)
- **Situational profiles:** Pre-configured phrase sets for specific clinical scenarios — post-intubation, post-stroke, end-of-life (v2)

### 6.6 Progressive Sentence Builder

When the pre-built phrase library doesn't contain what the patient needs to say, the sentence builder helps them construct a custom message through progressive taps powered by an on-device language model.

**How it works:**

1. The patient opens the builder (keyboard icon in the header)
2. The suggestion engine generates 6–8 contextually relevant sentence starters based on the current conversation, time of day, and patient profile
3. Tapping a starter (e.g., "I feel") triggers the model to generate the most likely continuations given the partial sentence and context
4. Each tap narrows and refines: "I feel" → "scared" → "about the procedure" → "tomorrow"
5. The built sentence is displayed prominently throughout, with undo (←) and clear (✕) controls
6. The patient can tap "Speak" at any point — incomplete sentences are complete communications
7. A "Type instead" toggle reveals a standard keyboard, pre-populated with whatever has been built

**Why an on-device model, not a fixed tree:**

A static suggestion tree breaks the moment a patient needs to say something it doesn't anticipate — and that's exactly when this feature matters most. A patient who needs to say "I think the tube in my nose moved" or "my daughter's name is Sarah and she's coming at 3" cannot be constrained to pre-authored paths.

An on-device language model generates open-ended completions that respond to what the patient is actually trying to say. It adapts to the conversation context (if the patient just reported pain, it prioritizes pain-related follow-ups), the time of day (medication and sleep suggestions in the evening), and the patient's own usage patterns (surfacing words and phrases the patient has used before).

**Contextual signals fed to the suggestion model:**

- **Partial sentence:** The words selected so far are the primary input
- **Conversation history:** The last 5–10 messages in the thread, giving the model awareness of the ongoing exchange (e.g., if the provider just asked "Where does it hurt?", the model should suggest body parts)
- **Time of day:** Morning, afternoon, evening, night — each shifts the probability distribution toward relevant topics
- **Phrase frequency:** Words and phrases the patient has used in this session are weighted higher in suggestions
- **Clinical vocabulary bias:** The model's prompt or fine-tuning biases suggestions toward medical communication vocabulary appropriate for an in-patient setting, avoiding irrelevant completions

**Technical approach:**

A small quantized language model (1–2B parameters, q4) runs on-device via ONNX Runtime Web with the WebGPU execution provider. The model generates 6–8 candidate next-phrase completions per step. Inference latency target: under 200ms per suggestion refresh, so completions appear by the time the patient's finger lifts from the previous selection.

The model runs in a dedicated Web Worker to avoid blocking the UI thread. Suggestions are generated speculatively — while the patient is reading the current set of suggestions, the model pre-computes the likely next set for each visible option.

**Fallback behavior:**

If the language model is unavailable (failed to load, insufficient memory, older device), the builder falls back to a curated static suggestion set covering the most common sentence patterns in patient communication. This fallback is also used during the first few seconds after app load while the model initializes.

**Relationship to the latency tiers:**

Sentences built through the progressive builder use Tier 3 real-time TTS synthesis (300–800ms). However, the system matches completed builder sentences against the pre-generated audio cache before falling back to synthesis. Common phrases like "I feel scared" or "I need water" built through the builder play from cache at Tier 1 speed.

**Memory and storage budget:**

The suggestion model adds approximately 500MB–1GB to the storage footprint (quantized q4). On an iPad Pro M5 with 12GB unified memory, both the TTS model (~500MB) and the suggestion model (~500MB–1GB) fit comfortably alongside Safari's own memory usage. On the A16 iPad with 8GB RAM, a smaller suggestion model (sub-500MB) or a more aggressively quantized variant may be required. The suggestion model is loaded on-demand when the builder is opened and can be evicted from memory when closed to free resources for TTS inference.

### 6.7 Drawing

A freeform drawing canvas with pen, eraser, and clear functions. Accessible from the main navigation. Sometimes a picture communicates what words cannot.

### 6.8 My Wishes — Goals of Care Conversations (SICG Framework)

OwnVoice integrates the Serious Illness Conversation Guide (SICG) from Ariadne Labs (Brigham and Women's Hospital / Harvard T.H. Chan School of Public Health, in collaboration with Dana-Farber Cancer Institute) to give nonverbal patients a voice in the most consequential conversations about their care. The SICG is licensed under CC-BY-NC-SA 4.0.

The SICG has been used in over 1.8 million conversations worldwide. In clinical trials, it resulted in more conversations about values and goals (89% vs. 44%), conversations earlier in the illness course (5 months vs. 2.5 months before death), greater documentation of patient goals in the medical record (61% vs. 11%), and reductions in moderate to severe anxiety (10.2% control vs. 5.0% intervention) and depression (20.8% control vs. 10.6% intervention).

**The problem OwnVoice addresses:** Existing AAC tools focus on immediate physical needs — water, pain, bathroom, medication. None address the deeper communication layer: a patient's values, goals, fears, hopes, and treatment preferences. A nonverbal patient in the ICU is excluded from the most important conversation of their life. Their autonomy — the right to decide what happens to their own body — is functionally erased. Not because anyone intends it, but because the communication tools don't exist.

**How it works:**

The "My Wishes" feature is accessible via a dedicated header button (❤️). It presents a guided flow structured around the seven EXPLORE topics from the SICG, adapted for patient-initiated communication via tappable responses:

1. **My Goals** (SICG: "What are your most important goals?") — "Being with my family," "Being comfortable and free of pain," "Living as long as possible," "Going home," "Being able to do things for myself," "Being at peace"

2. **My Worries** (SICG: "What are your biggest worries?") — "Suffering or being in pain," "Being alone," "Being a burden to my family," "Not being able to do things I enjoy," "Leaving my family behind," "Not knowing what will happen"

3. **My Strength** (SICG: "What gives you strength?") — "My family," "My faith," "My friends," "Knowing my wishes are heard," "Hope that I will get better," "The people caring for me"

4. **What Brings Me Joy** (SICG: "What activities bring joy and meaning to your life?") — "Spending time with family," "Being outdoors," "My hobbies and interests," "Helping others," "My spiritual practice," "Simple daily routines"

5. **About Treatment** (SICG: "How much would you be willing to go through for more time?") — "I want every possible treatment," "I want treatment if it has a good chance," "I want to try but stop if it's not helping," "I want to focus on being comfortable," "I need more time to think about this," "I need to talk to my family first"

6. **My Family** (SICG: "How much do the people closest to you know about your wishes?") — "They know my wishes well," "They know some of my wishes," "We haven't talked about this yet," "I need help telling them," "I want my care team to help explain"

7. **My Hopes** (SICG: "What are your hopes?") — "I hope to get better," "I hope to go home," "I hope to be comfortable," "I hope my family will be okay," "I hope to have more time," "I hope to be at peace"

Each response is spoken aloud in the patient's cloned voice when tapped, and added to the conversation thread. The overview screen shows a running summary of the patient's expressed wishes, labeled with the patient's name.

**Design principles for this feature:**

- **The patient controls the conversation.** They choose which topics to address, in any order, and can skip any question. No topic is mandatory. The flow auto-advances but never forces progression.
- **Speak at any point.** Every response is spoken immediately — the patient doesn't have to complete the full flow to be heard.
- **Not an advance directive.** This feature is a communication tool, not a legal document. It helps a nonverbal patient participate in goals-of-care conversations. Formal advance directives, POLST forms, and healthcare proxy decisions remain separate legal processes.
- **Voice cloning is profound here.** Hearing a patient express "I want to focus on being comfortable" in their own voice — to their family, their nurse, their doctor — carries a weight that a synthesized voice or a text message cannot. This is the patient reclaiming their identity and agency.
- **The clinician's role is preserved.** The provider panel includes SICG-aligned prompts ("I would like to talk about what matters most to you," "What are your most important goals right now?") so the clinician can initiate the conversation using the validated SICG framework. OwnVoice gives the patient the tools to respond, not to replace the clinician.

**Clinical co-design requirement:**

The response options listed above are a starting point based on the SICG framework and existing palliative care literature. Before clinical deployment, this feature must be co-designed with palliative care physicians, bioethicists, patient advocates, chaplains, and social workers. The response library should be validated through structured testing with actual patients in serious illness conversations, following the same Delphi and clinical validation methodology used for the Emoji-FPS pain scale.

**Cultural adaptation:**

Goals-of-care conversations are deeply cultural. Attitudes toward death, dying, treatment intensity, family decision-making, and spiritual care vary significantly across cultures, religions, and communities. The response library must be adapted for each cultural context, with input from community representatives. The SICG itself has been adapted for diverse populations through Ariadne Labs' equity-focused revision process (May 2023).

### 6.9 Listen — Speech-to-Text Capture

OwnVoice is a two-way communication tool, but the provider's side has been limited to pre-built responses. The Listen feature captures what a healthcare worker (or the patient, when speaking briefly) says aloud, transcribes it on-device, and adds it to the conversation thread — creating a true real-time record of the bedside exchange.

**How it works:**

Accessible via the 👂 button in the header. The Listen panel presents:

1. **Provider selector** — When multiple providers are configured, the user selects which provider is speaking so the transcript is attributed correctly in the conversation thread. With a single provider, their name is shown as a label.
2. **Mic button** — Tapping starts the on-device Whisper model listening to the tablet's microphone. A live transcript appears as words are recognized. Tapping again stops listening.
3. **Editable transcript** — The recognized text appears in an editable text area so the provider can correct any transcription errors before posting. The text area also accepts direct typing for situations where speech-to-text isn't practical (noisy environment, provider wearing a mask).
4. **Add to conversation** — Posts the transcript to the main conversation thread as a provider message, attributed to the selected provider.

**Why this matters:**

The conversation thread becomes a complete log of the bedside interaction, not just the patient's tappable phrases. When Nurse Davis says "We're going to change your IV site this afternoon, and the doctor will be here around 3," that information can be captured and visible in the thread — available for the patient to re-read, for the next shift nurse to review, and for the family to see during visiting hours. The patient doesn't have to remember what was said; it's written in the thread alongside their own responses.

This is especially powerful during goals-of-care conversations. The clinician's questions and explanations — which are nuanced, contextual, and impossible to fully capture with pre-built phrases — can be transcribed and interleaved with the patient's SICG responses from the My Wishes panel.

**Technical approach:**

The speech-to-text model runs on-device via ONNX Runtime Web with the WebGPU execution provider, using the same infrastructure as the TTS and suggestion models. No audio leaves the tablet. This is critical for HIPAA compliance — bedside conversations contain protected health information and cannot be sent to cloud servers for transcription.

Phase 1: OpenAI Whisper small or medium (~250–750MB, ONNX quantized q4/q8), loaded on-demand when the Listen panel opens. Whisper is batch-mode — it processes complete utterances after the speaker pauses. Latency target: under 2 seconds from end-of-speech to transcript. Whisper supports 100 languages, matching OwnVoice's multilingual capability.

Phase 2: Evaluate Voxtral Mini 4B (Mistral AI, Apache 2.0, February 2026) for streaming transcription. Voxtral is a causal-attention model that transcribes in real-time (480ms latency) rather than waiting for speech to end. The Q4 quantized version (2.5GB) has been demonstrated running in-browser via WebGPU. If memory budget permits alongside the TTS and suggestion models, Voxtral would enable true real-time captioning of provider speech.

**Memory budget impact:**

Adding a Whisper small model (~250MB quantized) brings the total on-device storage to approximately 1.5–2GB. On the iPad Pro M5 (12–16GB unified memory), this is well within budget. On the A16 iPad (8GB), loading all four models simultaneously (TTS, suggestion LLM, Whisper STT, plus Safari) may require on-demand loading — the STT model loads when Listen opens and unloads when it closes.

---

## 7. Setup & Lifecycle

### 7.1 First-Run Setup (< 60 seconds)

A three-step wizard, every step skippable:

1. **Patient** — First name and preferred language (13 languages supported). Required minimum to start using the app.
2. **Voices (optional)** — Upload patient voice sample, enter provider name, upload provider voice sample. Each voice is independent and optional.
3. **Confirmation** — Summary of configuration. "You can change all of this in settings anytime."

A "Skip all →" link is always visible. A nurse in a hurry can skip setup entirely and hand the patient a working app with default settings in under 10 seconds.

### 7.2 Between Patients (Reset)

A "New Patient" action in settings clears:
- Conversation history
- Patient name and language selection
- Voice models and cached audio
- Any personalization data

This action requires confirmation ("This will remove all data for Margaret. Continue?").

### 7.3 Returning Patients (v2)

An optional lightweight keying system (room number + first name) allows voice models to be retained in local storage across patient stays. On re-admission, a nurse can restore a previously created voice model without requiring the family to provide a new audio sample.

No PHI is stored — only the first name, room identifier, and voice model data. This is indexed locally and never transmitted.

---

## 8. Multilingual Support

OwnVoice supports 13 languages: English, Spanish, Chinese, Arabic, French, German, Hindi, Portuguese, Russian, Korean, Japanese, Tagalog, Vietnamese.

**Dual-language interaction model:**
- Patient selects their preferred language during setup
- Provider language defaults to English (configurable)
- When a patient taps a phrase, it is spoken in the patient's language and displayed in both languages in the text bar and conversation thread
- When a provider taps a response, it is spoken in the provider's language and translated/displayed in the patient's language

**Voice cloning across languages:**
Modern zero-shot TTS models support cross-lingual voice cloning — a speaker embedding extracted from an English audio sample can generate speech in Spanish using the same voice characteristics. This enables the patient to hear their own voice speaking their native language, even if the original sample was in a different language.

---

## 9. Technology Architecture

### 9.1 Application Stack

| Layer | Technology | Rationale |
|---|---|---|
| UI Framework | TypeScript + Preact | React-compatible API at 3KB vs 40KB. Largest ecosystem for accessibility primitives (ARIA, focus management). Fastest iteration cycle for UX research with real users. |
| Styling | Tailwind CSS | Utility-first, small runtime, works well with Preact. Easy to enforce consistent spacing and responsive design. |
| Build | Vite | Fast dev server, efficient production builds, native TypeScript support. |
| TTS Inference | ONNX Runtime Web (WebGPU EP) | Production-grade inference runtime with WebGPU execution provider. Falls back to WASM on devices without WebGPU. |
| Suggestion Model | ONNX Runtime Web (WebGPU EP) | Small quantized LLM (1–2B, q4) generates contextual next-phrase suggestions for the sentence builder. Runs in a dedicated Web Worker. Loaded on-demand. |
| STT Inference | ONNX Runtime Web (WebGPU EP) | Whisper small/medium (~250–750MB, q4/q8) for on-device speech-to-text. Loaded on-demand when Listen panel opens. No audio leaves the device. |
| Audio Playback | Web Audio API | Low-latency audio playback from pre-decoded AudioBuffers. Enables instant phrase playback. |
| Offline / PWA | Workbox (Service Worker) | Caches app shell, static assets, and both models. Enables full offline operation. |
| Model Storage | Origin Private File System (OPFS) | High-performance file storage for model binaries (TTS + suggestion). Better I/O characteristics than IndexedDB for large files. |
| Audio Cache | IndexedDB | Stores pre-generated audio clips keyed by phrase + voice + language. Fast random access. |
| Persistence | Storage API (`navigator.storage.persist()`) | Requests persistent storage to prevent browser eviction of models and audio cache. |

### 9.2 Why not Rust / Yew?

Rust compiled to WASM has a role as a targeted optimization for inference (v2), but not as the application framework. Reasons:

- **Development velocity:** AAC UX must be iterated with real patients and nurses. The TypeScript/Preact ecosystem allows faster iteration with a larger talent pool.
- **Accessibility:** The web accessibility ecosystem (ARIA, screen reader support, focus management) is far more mature in the JS/TS world. Accessibility is not optional in an AAC app.
- **No performance advantage where it matters:** The inference hot path is already WASM/WebGPU inside ONNX Runtime Web. The UI layer is not performance-bound.
- **Smaller community:** Hiring and open-source support for Yew is a fraction of the React/Preact ecosystem.

Rust may be introduced later as a purpose-built WASM inference module to reduce bundle size (ONNX Runtime Web adds ~15–20 MB) or to optimize for a specific TTS model architecture.

### 9.3 Why not a native app?

| Concern | PWA | Native (Swift/UIKit) |
|---|---|---|
| Distribution | URL, instant access, no install | App Store review, MDM required |
| Updates | Instant, on next load | App Store review cycle, MDM push |
| Deployment friction | Zero | High (IT involvement required) |
| WebGPU/Metal access | Yes, via Safari 26 on iPadOS 26 | Yes, native Metal |
| Inference performance | ~80% of native via WebGPU | 100% (Core ML, Metal) |
| Offline capability | Full (Service Worker + OPFS) | Full |
| Development cost | Single codebase, web skills | iOS-specific skills, separate codebase |
| Cross-platform future | Works on Android tablets if needed | Requires separate Android app |

The 20% inference performance gap is mitigated by the pre-generated audio architecture. For fixed phrases (90%+ of usage), inference performance is irrelevant — playback is from cache. The native performance advantage only applies to real-time custom message generation, where 300ms vs 250ms is imperceptible to the user.

If inference latency for real-time custom messages proves unacceptable in testing, a future option is a thin native wrapper (WKWebView) that exposes Core ML inference to the web layer via a JavaScript bridge while preserving the web-based UI and distribution model.

### 9.4 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Safari (iPadOS 26)                │
│                                                     │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │  Preact UI   │  │     Service Worker          │   │
│  │  (TypeScript) │  │     (Workbox)              │   │
│  │              │  │  ┌──────────────────────┐   │   │
│  │  Categories  │  │  │  App Shell Cache     │   │   │
│  │  Phrases     │  │  │  Static Assets       │   │   │
│  │  Builder     │  │  └──────────────────────┘   │   │
│  │  Conversation│  └────────────────────────────┘   │
│  │  Settings    │                                   │
│  └──────┬───────┘                                   │
│         │                                           │
│  ┌──────▼───────────────────────────────────────┐   │
│  │          Audio Engine (Web Audio API)         │   │
│  │  ┌─────────────┐    ┌─────────────────────┐  │   │
│  │  │ Pre-decoded  │    │  Streaming playback │  │   │
│  │  │ AudioBuffers │    │  (real-time synth)  │  │   │
│  │  │ (hot cache)  │    │                     │  │   │
│  │  └─────────────┘    └─────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│         │                                           │
│  ┌──────▼───────────────────────────────────────┐   │
│  │       Inference Workers (Web Workers)         │   │
│  │                                               │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │  TTS Worker (ONNX Runtime Web, WebGPU)  │  │   │
│  │  │  ┌─────────┐  ┌───────────────────┐     │  │   │
│  │  │  │ Base TTS │  │ Speaker Embedding │     │  │   │
│  │  │  │ Model    │  │ (patient)         │     │  │   │
│  │  │  │ (q4/q8)  │  │ (provider)        │     │  │   │
│  │  │  └─────────┘  └───────────────────┘     │  │   │
│  │  └─────────────────────────────────────────┘  │   │
│  │                                               │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │  Suggestion Worker (ONNX Runtime Web)   │  │   │
│  │  │  ┌──────────┐  ┌────────────────────┐   │  │   │
│  │  │  │ Small LLM│  │ Context window:    │   │  │   │
│  │  │  │ (1-2B q4)│  │  partial sentence  │   │  │   │
│  │  │  │          │  │  recent messages   │   │  │   │
│  │  │  │ Loaded   │  │  time of day       │   │  │   │
│  │  │  │ on-demand│  │  usage frequency   │   │  │   │
│  │  │  └──────────┘  └────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────┘  │   │
│  │                                               │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │  STT Worker (ONNX Runtime Web)          │  │   │
│  │  │  ┌──────────┐  ┌────────────────────┐   │  │   │
│  │  │  │ Whisper  │  │ Mic audio stream   │   │  │   │
│  │  │  │ small/med│  │ On-demand loading  │   │  │   │
│  │  │  │ (q4/q8)  │  │ HIPAA-safe: local  │   │  │   │
│  │  │  └──────────┘  └────────────────────┘   │  │   │
│  │  └─────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│         │                                           │
│  ┌──────▼───────────────────────────────────────┐   │
│  │            On-Device Storage                  │   │
│  │  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ OPFS         │  │ IndexedDB            │  │   │
│  │  │ - TTS model  │  │ - Cached audio clips │  │   │
│  │  │ - LLM model  │  │ - Conversation log   │  │   │
│  │  │ - STT model  │  │ - Settings/config    │  │   │
│  │  │ - Embeddings │  │                      │  │   │
│  │  └──────────────┘  └──────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                        │
                   Metal / GPU
                (Apple M5 / A16)
```

---

## 10. Privacy & Compliance

### HIPAA

OwnVoice is designed to minimize its HIPAA compliance surface area:

- **No PHI transmitted.** All data stays on-device. No cloud services, no remote APIs, no analytics servers receive patient-identifiable information.
- **No PHI stored beyond the session.** Patient name (first name only), voice model, and conversation history are stored locally during the patient's stay and cleared on reset.
- **No BAA required.** Because no PHI is transmitted to or stored by the vendor, a Business Associate Agreement is not required for the software itself. The hospital's existing device management policies (encryption at rest, device locking, physical security) cover the tablet.

### Regulatory positioning

OwnVoice is a **communication aid**, not a medical device. It does not provide clinical decision support, diagnostic information, or treatment recommendations. Pain scale data and symptom reports are communication tools — they help the patient tell their caregiver what they're experiencing.

This positioning avoids FDA Class II device classification, consistent with how existing AAC communication aids are regulated.

### Voice data consent

- Voice samples are provided voluntarily by the patient or their healthcare proxy
- The consent model is straightforward: the patient is using their own voice for their own communication
- Voice models never leave the device and are deleted on patient reset
- No voice data is used for training, analytics, or any purpose beyond the current patient session

### Analytics

Anonymous, non-identifiable usage metrics only:
- Button press frequency (no content)
- Category navigation patterns
- Session duration
- Device model and OS version
- Language selections

These metrics support product improvement and are transmitted only when a network connection is available. No data that could identify a patient is included.

---

## 11. Accessibility

Accessibility is foundational, not additive, for an AAC application. Patients using this app may have motor impairments, cognitive limitations, visual difficulties, or combinations of these.

### v1 requirements

- All interactive elements meet WCAG 2.1 AA minimum touch target sizes (44x44 CSS pixels)
- High-contrast mode toggle in settings
- Adjustable button sizes (small / standard / large)
- Icons, text, or both on phrase buttons (configurable)
- Full VoiceOver compatibility for caregiver-facing screens (settings, setup)
- Clear visual feedback on tap (color change, animation)
- No time-limited interactions — nothing expires or auto-dismisses

### v2 considerations

- Switch access support (for patients with severe motor impairment)
- Eye tracking integration (iPad Pro supports eye tracking via accessibility APIs)
- Dwell-to-select (hover over a button to select it without tapping)
- Scanning mode (auto-highlight buttons sequentially, patient taps to select)

---

## 12. Business Model

### Distribution

OwnVoice is distributed as a URL. No app store listing, no installation required. This enables:

- Instant pilot deployments (share a link, start using it)
- No friction for evaluation by nursing leadership
- No dependency on hospital IT for initial rollout

### Pricing (proposed)

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | Full communication tool with standard TTS voices. All categories, all languages, full offline support. |
| OwnVoice Pro | Per-bed/month or per-device/month | Personal voice cloning (patient + provider), pre-generated audio cache, priority phrase generation. |
| OwnVoice Enterprise | Per-facility annual contract | SSO/MDM integration, custom phrase libraries, clinical workflow integration, dedicated support, usage analytics dashboard. |

### Why freemium works

The free tier is a fully functional AAC tool that competes with existing solutions on features alone. This lowers the barrier to adoption and lets nursing staff evaluate the product without procurement involvement. The voice cloning upgrade is the premium feature that drives conversion — once a nurse hears a patient's real voice come through the app, the value proposition is self-evident.

### Competitive landscape

| Product | Distribution | Voice Cloning | Offline | Languages | Two-Way | Price |
|---|---|---|---|---|---|---|
| Existing AAC apps | App Store + MDM | No | Partial | Varies | Limited | Per-device license |
| Hardware AAC devices | Physical hardware | No | Yes | English-focused | No | ~$1,500/device |
| Picture boards | Physical | No | Yes | Limited | No | ~$20–50 |
| **OwnVoice** | **URL (PWA)** | **Yes** | **Yes** | **13** | **Full conversation** | **Freemium** |

---

## 13. Success Metrics

### Product metrics

- **Time to first communication:** Seconds from app load to patient's first spoken phrase. Target: < 30 seconds (including skipped setup).
- **Phrase playback latency:** Time from tap to audible speech. Target: < 50ms for cached phrases.
- **Voice setup completion rate:** Percentage of sessions where at least one personal voice is configured.
- **Phrases per session:** Average number of phrases spoken per patient session. Higher is better (indicates the tool is being used for real communication, not abandoned).
- **Provider response usage:** Percentage of sessions where the provider panel is used at least once (indicates two-way adoption).

### Clinical metrics (measured via partner studies)

- Patient satisfaction scores (HCAHPS communication domain)
- Nurse-reported communication quality
- Patient-reported anxiety and isolation levels
- Time to pain identification and treatment

### Business metrics

- Facilities with active deployments
- Free to paid conversion rate
- Monthly active beds
- Net revenue retention

---

## 14. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| WebGPU inference too slow for real-time custom messages | Medium | Medium | Pre-generated audio covers 90%+ of interactions. Real-time path is infrequent. Fallback to Web Speech API if needed. Future option: native WKWebView wrapper with Core ML bridge. |
| Browser evicts cached TTS model from storage | Medium | Low | Call `navigator.storage.persist()` on setup. Monitor storage via `navigator.storage.estimate()`. Re-download model from local cache or CDN if evicted. |
| Safari WebGPU bugs or limitations on iPadOS | High | Medium | ONNX Runtime Web falls back to WASM automatically. Pre-generated audio approach reduces dependency on real-time WebGPU inference. Test extensively on target devices. |
| Hospital IT blocks the domain or restricts Safari | Medium | Low | PWA can be pre-loaded via Jamf as a web clip. Provide IT documentation and whitelisting guide. No unusual ports or protocols required. |
| Voice cloning quality insufficient for emotional connection | High | Low | Current zero-shot models (Voxtral, NeuTTS Air, Fish Audio S2) achieve near-indistinguishable quality from 3–10 seconds of audio. Quality improves with longer samples. Always offer "Replace Sample" option. |
| Infection control concerns with shared tablets | Medium | Medium | Standard hospital tablet hygiene protocols apply. OwnVoice adds no hardware. UV-C tablet cleaning cases are commonly deployed. App resets between patients clear all personal data. |
| Regulatory reclassification as medical device | Low | Low | Strict positioning as communication aid. No diagnostic claims. No clinical decision support. Legal review of all marketing materials. |

---

## 15. Roadmap

### Phase 1: Technical Validation (4–6 weeks)

- Select and benchmark TTS model candidates on iPad Pro M5 and iPad A16
- Build proof-of-concept: load quantized ONNX model in Safari, run inference via WebGPU, play audio
- Measure end-to-end latency for real-time synthesis and cached playback
- Validate speaker embedding extraction from short audio clips in-browser
- Validate OPFS storage persistence and model loading times

**Exit criteria:** Sub-second real-time synthesis on iPad Pro M5. Sub-50ms cached playback. Speaker embedding quality subjectively acceptable.

### Phase 2: Core Product (8–12 weeks)

- Build PWA with full phrase library, all five categories, bottom tab navigation
- Implement pre-generated audio architecture (Tier 1 + Tier 2)
- Implement setup wizard with voice upload flow
- Implement provider panel with dual voice support
- Implement conversation thread
- Implement patient reset flow
- Service worker for full offline operation
- Accessibility audit (WCAG 2.1 AA)

**Exit criteria:** Feature-complete app that a nurse can set up in under 60 seconds and a patient can use independently.

### Phase 3: Clinical Pilot (6–8 weeks)

- Partner with 1–2 hospital units (ICU, step-down, or med-surg)
- Deploy on hospital-managed iPads
- Structured observation and feedback collection from nurses and patients
- Iterate on phrase library, UX, and voice quality based on real-world usage
- Collect baseline metrics for communication quality and patient satisfaction

**Exit criteria:** Positive nurse and patient feedback. Identification of top UX issues. Data to support broader rollout.

### Phase 4: Launch & Scale

- Public launch of free tier
- Voice cloning premium feature
- Enterprise sales motion targeting health systems
- Additional language support based on pilot feedback
- EHR integration exploration (FHIR-compatible pain/symptom reporting)
- Android tablet support evaluation

---

## Appendix A: Voice Cloning Technology Landscape (April 2026)

Current state-of-the-art zero-shot voice cloning models relevant to OwnVoice:

| Model | Parameters | Min Sample | Languages | On-Device | Notes |
|---|---|---|---|---|---|
| NeuTTS Air (Neuphonic) | 0.5B | 3 sec | English | Yes (GGUF, runs on mobile) | Compact, designed for on-device. English only currently. |
| Voxtral TTS (Mistral) | 4B | 2–3 sec | 9 | Open source, ONNX available | High quality, may be too large for browser without aggressive quantization. |
| XTTS-v2 (Coqui, community) | ~1B | 6 sec | 17 | ONNX export possible | Most downloaded TTS model on HuggingFace. Company shut down, community-maintained. |
| Fish Audio S2 | ~1B | 10–15 sec | 80+ | API + open source | Cross-lingual voice cloning. Strong multilingual support. |
| Qwen3-TTS (Alibaba) | 1.7B | 3 sec | 10 | Open source | Excellent quality, supports emotion control. Primarily CUDA-focused currently. |

**Recommended approach:** Start with NeuTTS Air or a quantized XTTS-v2 variant for Phase 1 validation. Evaluate Qwen3-TTS if a WebGPU-compatible ONNX export becomes available. The model choice can evolve independently of the application architecture.

---

*This document is a living draft. Last updated April 12, 2026.*
