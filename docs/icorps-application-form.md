# I-Corps Spark Application, New England Hub

Field-by-field answers for the MIT I-Corps Forms "Add Spark Application" page. Source narrative: [`docs/icorps-application.md`](./icorps-application.md).

---

## Program & contact

- **Program date I am interested in:** _Healthcare Delivery @ Harvard cohort_ (select from dropdown)
- **Name of Project/Venture:** OwnVoice
- **Primary Contact First Name:** Mark
- **Primary Contact Last Name:** Catalano
- **Pronunciation of first name:** _(leave blank; "Mark" is phonetic)_
- **Primary Contact's Email:** catalano.m@gmail.com
- **LinkedIn URL:** https://www.linkedin.com/in/markcatalano/
- **Gender identity:** Male
- **Ethnicity:** Prefer not to answer
- **Access requirements:** No

## Additional Team Members

None. Applying as an individual.

## Affiliation

> ⚠️ **Form inconsistency to resolve before submitting:** the PDF shows *Northeastern* pre-selected under "University," but the narrative positions me as a Harvard-affiliated spouse applying to the Healthcare Delivery @ Harvard cohort. Confirm which hub/university selection matches the cohort I'm applying to, then update both fields together.

- **I am:** affiliated with another university or college *(spouse of a recent Harvard postdoc and current Harvard consultant),* or "not affiliated," depending on how the hub interprets spousal affiliation.
- **University:** Harvard *(pending confirmation per note above)*
- **Affiliation:** Other
- **Department or lab:** N/A
- **PI:** N/A
- **PI/advisor supportive of participation:** Yes

---

## One paragraph non-technical description of the technology (3–4 sentences)

OwnVoice is an iPad app for hospitalized patients who temporarily cannot speak, most often because they are on a ventilator in the ICU. From a short voice recording (or a pre-illness sample pulled from a voicemail or family video), it lets the patient tap sentences on the screen and hear them spoken aloud in their own voice instead of a generic synthetic one. It also gives clinicians a structured way to hold goals-of-care and end-of-life conversations directly with the patient, using the validated Serious Illness Conversation Guide. Everything runs on the tablet itself, so no patient information leaves the device.

---

## Technology origin & IP

- **Is this technology based on university research?** No
- **Have you been involved in the research?** Yes
- **Has an invention disclosure been submitted to your Technology Licensing office?** No

### Is there IP? Describe IP status and access/licensing

The novel work in OwnVoice is the integration: a voice-cloning text-to-speech pipeline, a sentence-suggestion language model, and neural speech-to-text recognition, all running fully on-device in a browser via WebGPU and ONNX Runtime Web, wrapped around the validated Serious Illness Conversation Guide and SPEACS-2 / ICU-Talk phrase taxonomies. The codebase is mine and is unencumbered. The underlying models (Chatterbox Multilingual TTS, Whisper STT, DeepFilterNet) are used under their permissive open-source licenses; the clinical instruments are used under their published Creative Commons licenses (CC-BY for Emoji-FPS; CC-BY-NC-SA for SICG, used without modification). No third party currently has a claim on the work, and no Harvard or other university tech-transfer office is involved. Any patentable elements, such as the on-device voice-enrollment-quality scoring and the AAC-mediated SICG flow, would be filed by the venture directly.

---

## Why do you want to participate in this I-Corps program?

OwnVoice is a working prototype, and the remaining technology risks are ones I am well-equipped to handle on my own. The next step is customer discovery, and I am genuinely excited to do it; I want to spend the next several months in front of nurses, SLPs, intensivists, palliative care physicians, and hospital administrators, learning what the bedside actually looks like through their eyes and whether this fits.

What I cannot manufacture on my own is the structure and the network around that work. I-Corps gives me both. The curriculum is a proven framework for running customer discovery with discipline instead of drifting into confirmation bias, and the cohort and mentors open doors into the clinicians and administrators I most need to talk to. A Healthcare Delivery cohort based at Harvard is the right concentration of those connections for an inpatient AAC tool aimed at ICU settings.

---

## What do you hope to learn?

The biggest open question is who the economic buyer actually is. The candidate list runs from palliative care service lines to ICU nursing leadership, the chief nursing informatics officer, patient experience, and risk management, and each one implies a very different sales motion, evidence bar, and price point. I need to figure out which of those budgets a tool like this comes out of, and what the buying committee around it looks like.

Closely related: how OwnVoice fits the existing AAC consult workflows run by speech-language pathologists, and whether SLPs end up being champions, gatekeepers, or both. SLPs are the people closest to the patient communication problem today, and any deployment plan that treats them as anything other than primary partners is probably wrong.

I also want to learn what clinical evidence hospitals require before they will pilot, and what kind of study design (a single-site quality-improvement project, a multi-site randomized controlled trial, a registry, something else) is realistic for a solo-founder venture to actually run. Adjacent to that is the practical question of how procurement, IT security, and biomed evaluate a Progressive Web App that runs on hospital-owned or bring-your-own-device iPads with no Protected Health Information leaving the tablet; I have hypotheses about why the on-device architecture should shorten that review, but I have not yet tested them with the people who do those reviews.

Finally, I want to test which adjacent use cases (post-stroke aphasia, ALS, post-operative recovery, pediatric ICU, inpatients who are deaf or hard-of-hearing) the same platform should and should not chase next, and whether the "speaks in the patient's own voice" framing resonates most with clinicians, with families, or with patients themselves. The answer probably changes the messaging.

---

## What outcomes do you hope to achieve?

By the end of Spark I want to have completed 30 or more structured customer-discovery interviews across at least four stakeholder segments: bedside ICU nurses, speech-language pathologists, palliative care physicians, and hospital administrators or chief nursing informatics officers. Out of those interviews I expect to come away with either a validated or a falsified hypothesis about the primary economic buyer and the beachhead clinical setting, and a value-proposition and pricing hypothesis grounded in what the interviews actually say rather than in founder intuition.

I also want a clear go/no-go decision on applying to NSF I-Corps Fusion (National Teams), with a defined first pilot site and a named clinical champion attached to it, and a short list of other institutions where a pilot could realistically begin in the following 6 to 12 months.

---

## About me (background for the reviewers)

I am a two-time founder based in Boston with 20 years of experience in software, the last three in applied AI. My previous company, [TakeShape](https://www.takeshape.io/), connects enterprise data to multi-agent systems. OwnVoice builds on the same applied-AI toolkit and points it at the bedside instead of the back office. The problem came to me through family who work as medical providers in ICUs and have spent years watching intubated patients struggle to make themselves understood. I am also the spouse of a Harvard affiliate; my wife finished a postdoctoral fellowship at Harvard earlier this year and currently consults for the university.

## The problem

Roughly one-third of ICU patients cannot speak functionally during their stay due to intubation, tracheostomy, or neurological injury (Freeman-Sanderson et al., 2019). Yet these patients use alternative communication devices during only 11% of their stay, and nurses report difficulty understanding them 35% of the time. Downstream costs are well documented: anxiety, delirium, longer stays, more adverse events. Patients themselves describe loss of voice as one of the most distressing parts of critical illness. Existing tablet-based AAC tools (VidaTalk, CommuniCare, YoDoc) are static phrase boards in a generic voice. None of them offer voice cloning, on-device language models, neural speech-to-text, or structured goals-of-care conversations.

## The project

OwnVoice is a Progressive Web App for iPad that gives a voiceless ICU patient a way to speak in their own voice, and gives the care team a structured way to hold goals-of-care and end-of-life conversations *with the patient*.

1. **Speaks in the patient's voice.** A 15-second recording (or a pre-illness sample from a voicemail or family video) yields a speaker embedding for a multilingual neural TTS model running on-device.
2. **Supports goals-of-care conversations.** A "My Wishes" module structured around Brigham and Women's *Ariadne Labs Serious Illness Conversation Guide* walks a non-speaking patient through the seven SICG topics. Existing ICU adaptations of the SICG have only been conducted with surrogates of ventilated patients (Pasricha et al., 2020). To my knowledge, no published study has examined SICG conversations conducted directly with non-speaking patients via AAC.
3. **Uses validated clinical instruments.** Pain is captured with the Emoji-FPS scale (Li et al., 2023); the phrase library is organized around ICU communication categories from SPEACS-2 (Happ et al., 2014) and ICU-Talk (MacAulay et al., 2002).
4. **Runs entirely on-device.** All model inference (text-to-speech, the sentence-suggestion language model, and Whisper speech recognition) runs locally via WebGPU and ONNX Runtime Web. No Protected Health Information leaves the tablet, which should shorten hospital security review.

---

## Entrepreneurial program participation

Founder and CEO of TakeShape (https://www.takeshape.io/), a venture-backed applied-AI company connecting enterprise data to multi-agent systems. Prior founding/early-stage roles in software over the last 20 years. Have not previously participated in I-Corps, NSF SBIR, or a university accelerator.

## Referral / how I heard about the program

- **Referred by / how I heard:** Other (please specify)
- **How did you find out about the program:** Flyer in SEAS building

## Anything else you'd like us to know?

OwnVoice is being developed openly with clinical input from colleagues who work in ICU settings, and is *not* intended for clinical use in its current state. The point of participating in Spark is to figure out what evidence, partnerships, and product changes would be required to move responsibly from prototype to pilot.
