# I-Corps Spark Onsite – Healthcare Delivery @Harvard

**Application prompt:** Please briefly tell us about you and your project.

---

**About Me.** I'm a two-time founder based in Boston with 20 years of experience in software—the last three in applied AI. My previous company, TakeShape (https://www.takeshape.io/), connects enterprise data to multi-agent systems. My current project, OwnVoice (https://www.ownvoice.icu/), builds on the same applied-AI toolkit and points it at the bedside instead of the back office. The problem came to me through family who work as medical providers in ICUs and have spent years watching intubated patients struggle to make themselves understood. I am also the spouse of a Harvard affiliate. My wife finished a postdoctoral fellowship at Harvard earlier this year and currently consults for the university.

**The Problem.** Roughly one-third of ICU patients cannot speak functionally during their stay, due to intubation, tracheostomy, or neurological injury (Freeman-Sanderson et al., 2019). Yet these patients use alternative communication \[devices?\] during only 11% of their stay. Nurses report difficulty understanding them 35% of the time (Freeman-Sanderson et al.). Downstream costs are well-documented: anxiety, delirium, longer stays, more adverse events. Patients describe loss of voice as one of the most distressing parts of critical illness. Existing tablet-based AAC tools (VidaTalk, CommuniCare, YoDoc) are static phrase boards in a generic voice—none offer voice cloning, on-device language models, neural speech-to-text, or structured goals-of-care conversations.

**My Project** OwnVoice is a Progressive Web App for iPad that offers a voiceless ICU patient a way to speak in their own voice, and provides the care team with a structured way to hold goals-of-care and end-of-life conversations *with the patient.*

1. **Speaks in the patient's voice.** A 15-second recording (or a pre-illness sample from a voicemail or family video) yields a speaker embedding for a multilingual neural Text-To-Speech (TTS) model running on-device.
2. **Supports goals-of-care conversations.** A "My Wishes" module structured around Brigham and Women’s *Ariadne Labs Serious Illness Conversation Guide* walks a non-speaking patient through the seven SICG topics. Existing ICU adaptations of the SICG have only been conducted with surrogates of ventilated patients (Pasricha et al., 2020). To my knowledge, no published study has examined SICG conversations conducted directly with non-speaking patients via AAC.
3. **Uses validated clinical instruments.** Pain is captured with the Emoji-FPS scale (Li et al., 2023); the phrase library is organized around ICU communication categories from SPEACS-2 (Happ et al., 2014\) and ICU-Talk (MacAulay et al., 2002).
4. **Runs entirely on-device.** All model inference (TTS, sentence-suggestion LLM, Whisper STT) runs locally via WebGPU and ONNX Runtime Web. No Protected Health Information (PHI) leaves the tablet, which streamlines hospital deployment.

**Why I-Corps.** OwnVoice is a working v0.1 prototype. I can address any technology risks  alone. What I cannot do alone is the customer-discovery work essential to turning this technology into a tool that hospitals will value, buy, deploy, and integrate. Who is the economic buyer: palliative care, ICU nursing, the CNIO, a service line? How does this fit existing AAC consult workflows run by SLPs? A Healthcare Delivery cohort at Harvard puts me in front of the people who can answer these important questions.  
