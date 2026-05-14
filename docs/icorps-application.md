# I-Corps Spark Onsite – Healthcare Delivery @Harvard

**Application prompt:** Please briefly tell us about you and your project.

---

**About me.** I'm a two-time founder in Boston with 20 years in software and the last three in applied AI. My previous company, [TakeShape](https://www.takeshape.io/), connects enterprise data to multi-LLM agents via GraphQL and MCP; My current project, OwnVoice pushes the same skill set the other direction, small, quantized models running entirely on an iPad, no data leaving the device. I'm not affiliated with Harvard; my wife finished a fellowship there and currently consults for the university, which is how I learned about this cohort.

**The problem.** Roughly one-third of ICU patients cannot speak functionally during their stay, from intubation, tracheostomy, or neurological injury (Freeman-Sanderson et al., 2019), yet they use any alternative communication during only 11% of their stay; nurses report difficulty understanding them 35% of the time (same study). Downstream costs are well-documented: anxiety, delirium, longer stays, more adverse events. Patients describe loss of voice as one of the most distressing parts of critical illness. Existing tablet AAC tools (VidaTalk, CommuniCare, YoDoc) are static phrase boards in a generic voice — none offer voice cloning, on-device language models, neural speech-to-text, or structured goals-of-care conversations.

**What OwnVoice is.** A Progressive Web App for iPad that gives a voiceless ICU patient a way to talk in something close to their own voice, and the care team a structured way to hold goals-of-care and end-of-life conversations *with* the patient:

1. **Speaks in the patient's voice.** A 15-second recording (or a pre-illness sample from a voicemail or family video) yields a speaker embedding for a multilingual neural TTS model running on-device.
2. **Supports goals-of-care conversations.** A "My Wishes" module structured around BWH's Ariadne Labs Serious Illness Conversation Guide walks a non-speaking patient through the seven SICG topics via touch. Existing ICU adaptations of the SICG have only been tested with surrogates of ventilated patients (Pasricha et al., 2020); to my knowledge, no published study has examined SICG conversations conducted directly with non-speaking patients via AAC.
3. **Runs entirely on-device.** All inference (TTS, sentence-suggestion LLM, Whisper STT) runs locally via WebGPU and ONNX Runtime Web. No PHI leaves the tablet, which makes hospital deployment realistic rather than a six-month security review.
4. **Uses validated clinical instruments.** Pain is captured with the Emoji-FPS scale (Li et al., 2023); the phrase library is organized around ICU communication categories from SPEACS-2 (Happ et al., 2014) and ICU-Talk (MacAulay et al., 2002).

**Why I-Corps.** OwnVoice is a working v0.1 prototype; the technology risks I can attack alone. What I cannot do alone is the customer-discovery work that turns this into something a hospital will buy, deploy, and integrate. Who is the economic buyer: palliative care, ICU nursing, the CNIO, a service line? How does this fit existing AAC consult workflows run by SLPs? A Healthcare Delivery cohort at Harvard puts me in front of the people who can answer.
