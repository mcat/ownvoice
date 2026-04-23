/**
 * English locale — canonical phrase list.
 *
 * Every speakable string in OwnVoice lives here. Other locales must
 * satisfy the same key set (enforced by the LocaleStrings type in
 * phraseRegistry.ts). Keys are structured as domain.id so grep can
 * find them: "quick.yes", "pain.descriptor.burning", etc.
 *
 * Composed-phrase templates use {placeholder} syntax. The registry
 * resolves them at runtime with locale-appropriate word order.
 */
const en = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Yes",
  "quick.no": "No",
  "quick.thank_you": "Thank you",
  "quick.please_wait": "Please wait",
  "quick.dont_understand": "I don't understand",
  "quick.repeat": "Please repeat that",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "I need water",
  "needs.comfort.hungry": "I'm hungry",
  "needs.comfort.cold": "I'm cold",
  "needs.comfort.hot": "I'm hot",
  "needs.comfort.bed": "Adjust my bed",
  "needs.comfort.bathroom": "I need the bathroom",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "I need my medication",
  "needs.medical.suction": "I need to be suctioned",
  "needs.medical.nauseous": "I feel nauseous",
  "needs.medical.breathe": "I can't breathe well",
  "needs.medical.nurse": "I need the nurse",
  "needs.medical.doctor": "I need the doctor",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "I want my family",
  "needs.people.stay": "Can someone stay with me?",
  "needs.people.call": "I want to call someone",
  "needs.people.interpreter": "I need an interpreter",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "I'm tired",
  "feelings.physical.uncomfortable": "I'm uncomfortable",
  "feelings.physical.weak": "I feel weak",
  "feelings.physical.better": "I feel better",
  "feelings.physical.dizzy": "I feel dizzy",
  "feelings.physical.itchy": "I feel itchy",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "I'm scared",
  "feelings.emotional.lonely": "I'm lonely",
  "feelings.emotional.frustrated": "I'm frustrated",
  "feelings.emotional.confused": "I'm confused",
  "feelings.emotional.safe": "I feel safe",
  "feelings.emotional.grateful": "I'm grateful",
  "feelings.emotional.worried": "I'm worried",
  "feelings.emotional.hopeful": "I feel hopeful",
  "feelings.emotional.bored": "I'm bored",
  "feelings.emotional.embarrassed": "I'm embarrassed",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "What time is it?",
  "questions.day": "What day is it?",
  "questions.whats_happening": "What's happening to me?",
  "questions.go_home": "When can I go home?",
  "questions.next_medication": "When is my next medication?",
  "questions.explain_treatment": "Can you explain my treatment?",
  "questions.nurse_today": "Who is my nurse today?",
  "questions.eat_drink": "Can I eat or drink?",
  "questions.see_family": "When can I see my family?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "No hurt",
  "pain.face.2": "Hurts a little",
  "pain.face.4": "Hurts a little more",
  "pain.face.6": "Hurts even more",
  "pain.face.8": "Hurts a whole lot",
  "pain.face.10": "Hurts worst",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Aching",
  "pain.descriptor.burning": "Burning",
  "pain.descriptor.sharp": "Sharp",
  "pain.descriptor.throbbing": "Throbbing",
  "pain.descriptor.cramping": "Cramping",
  "pain.descriptor.constant": "Constant",
  "pain.descriptor.comes_and_goes": "Comes and goes",
  "pain.descriptor.numb": "Numb",
  "pain.descriptor.pressure": "Pressure",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Head",
  "pain.region.face": "Face",
  "pain.region.neck": "Neck",
  "pain.region.chest": "Chest",
  "pain.region.left_shoulder": "Left Shoulder",
  "pain.region.right_shoulder": "Right Shoulder",
  "pain.region.left_arm": "Left Arm",
  "pain.region.right_arm": "Right Arm",
  "pain.region.stomach": "Stomach",
  "pain.region.upper_back": "Upper Back",
  "pain.region.lower_back": "Lower Back",
  "pain.region.left_leg": "Left Leg",
  "pain.region.right_leg": "Right Leg",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  "pain.sentence": "I have {descriptor} pain in my {region}, level {severity} out of 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Severity",
  "pain.step.location": "Location",
  "pain.step.descriptor": "Describe",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "My Goals",
  "wishes.worries.label": "My Worries",
  "wishes.strength.label": "My Strength",
  "wishes.joy.label": "What Brings Me Joy",
  "wishes.tradeoffs.label": "About Treatment",
  "wishes.family.label": "My Family",
  "wishes.hopes.label": "My Hopes",

  // Questions
  "wishes.goals.question": "What are your most important goals?",
  "wishes.worries.question": "What are your biggest worries?",
  "wishes.strength.question": "What gives you strength?",
  "wishes.joy.question": "What brings joy and meaning to your life?",
  "wishes.tradeoffs.question": "How much are you willing to go through for more time?",
  "wishes.family.question": "How much do the people closest to you know about your wishes?",
  "wishes.hopes.question": "What are your hopes?",

  // Stems (for composeSentence)
  "wishes.goals.stem": "What matters most to me",
  "wishes.worries.stem": "I am worried about",
  "wishes.strength.stem": "What gives me strength",
  "wishes.joy.stem": "What brings me joy",
  "wishes.tradeoffs.stem": "About my treatment",
  "wishes.family.stem": "About my family",
  "wishes.hopes.stem": "I hope",

  // Responses — goals
  "wishes.goals.r.family": "Being with my family",
  "wishes.goals.r.comfort": "Being comfortable and free of pain",
  "wishes.goals.r.longevity": "Living as long as possible",
  "wishes.goals.r.home": "Going home",
  "wishes.goals.r.independence": "Being able to do things for myself",
  "wishes.goals.r.peace": "Being at peace",

  // Responses — worries
  "wishes.worries.r.suffering": "Suffering or being in pain",
  "wishes.worries.r.alone": "Being alone",
  "wishes.worries.r.burden": "Being a burden to my family",
  "wishes.worries.r.activities": "Not being able to do things I enjoy",
  "wishes.worries.r.leaving": "Leaving my family behind",
  "wishes.worries.r.unknown": "Not knowing what will happen",

  // Responses — strength
  "wishes.strength.r.family": "My family",
  "wishes.strength.r.faith": "My faith",
  "wishes.strength.r.friends": "My friends",
  "wishes.strength.r.wishes_heard": "Knowing my wishes are heard",
  "wishes.strength.r.hope": "Hope that I will get better",
  "wishes.strength.r.carers": "The people caring for me",

  // Responses — joy
  "wishes.joy.r.family": "Spending time with family",
  "wishes.joy.r.outdoors": "Being outdoors",
  "wishes.joy.r.hobbies": "My hobbies and interests",
  "wishes.joy.r.helping": "Helping others",
  "wishes.joy.r.spiritual": "My spiritual practice",
  "wishes.joy.r.routines": "Simple daily routines",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "I want every possible treatment",
  "wishes.tradeoffs.r.good_chance": "I want treatment if it has a good chance",
  "wishes.tradeoffs.r.try_stop": "I want to try but stop if it's not helping",
  "wishes.tradeoffs.r.comfortable": "I want to focus on being comfortable",
  "wishes.tradeoffs.r.think": "I need more time to think about this",
  "wishes.tradeoffs.r.family_first": "I need to talk to my family first",

  // Responses — family
  "wishes.family.r.know_well": "They know my wishes well",
  "wishes.family.r.know_some": "They know some of my wishes",
  "wishes.family.r.not_talked": "We haven't talked about this yet",
  "wishes.family.r.need_help": "I need help telling them",
  "wishes.family.r.team_explain": "I want my care team to help explain",

  // Responses — hopes
  "wishes.hopes.r.get_better": "To get better",
  "wishes.hopes.r.go_home": "To go home",
  "wishes.hopes.r.comfortable": "To be comfortable",
  "wishes.hopes.r.family_ok": "My family will be okay",
  "wishes.hopes.r.more_time": "To have more time",
  "wishes.hopes.r.peace": "To be at peace",

  // Wish sentence composition templates
  "wishes.compose": "{stem} is {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "I will get someone to help.",
  "provider.responses.interpreter": "I will get an interpreter.",
  "provider.responses.family": "I will call your family.",
  "provider.responses.get_that": "I will get that for you.",
  "provider.responses.doctor_know": "I will let the doctor know.",
  "provider.responses.medication": "I will get your medication.",
  "provider.responses.family_coming": "Your family is on the way.",
  "provider.responses.doctor_soon": "The doctor will be here soon.",
  "provider.responses.doing_well": "You are doing well.",
  "provider.responses.rest": "Try to rest now.",

  "provider.questions.feeling": "How are you feeling?",
  "provider.questions.need": "Is there anything you need?",
  "provider.questions.where_hurts": "Can you show me where it hurts?",
  "provider.questions.rate_pain": "Rate your pain, 0 to 10.",
  "provider.questions.sleep": "Did you sleep well?",
  "provider.questions.comfortable": "Are you comfortable?",

  "provider.directions.procedure": "Your procedure is scheduled today.",
  "provider.directions.stay_in_bed": "You need to stay in bed.",
  "provider.directions.vitals": "I'm going to check your vitals.",
  "provider.directions.medication_time": "Time for your medication.",
  "provider.directions.breathe": "Try to take deep breaths.",
  "provider.directions.call_button": "Press the call button if you need anything.",

  "provider.goals_of_care.matters_most": "I would like to talk about what matters most to you.",
  "provider.goals_of_care.goals": "What are your most important goals right now?",
  "provider.goals_of_care.worries": "What are your biggest worries?",
  "provider.goals_of_care.strength": "What gives you strength?",
  "provider.goals_of_care.joy": "What brings joy and meaning to your life?",
  "provider.goals_of_care.wishes": "How much do your loved ones know about your wishes?",
  "provider.goals_of_care.hopes": "What are your hopes?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "I slept well",
  "time.morning.didnt_sleep": "I didn't sleep well",
  "time.morning.breakfast": "I need breakfast",
  "time.morning.doctor_coming": "When is the doctor coming?",

  "time.afternoon.tired": "I'm tired",
  "time.afternoon.lunch": "Can I have lunch?",
  "time.afternoon.see_family": "When can I see my family?",
  "time.afternoon.rest": "I need to rest",

  "time.evening.cant_sleep": "I can't sleep",
  "time.evening.medication": "I need my medication",
  "time.evening.call_family": "Can I call my family?",
  "time.evening.pain": "I'm in pain",

  // ── Sentence builder suggestions ───────────────────────────────
  // These are word/phrase fragments for building sentences.
  // Stored as-is; the builder concatenates them.
  "suggest.start.i_am": "I am",
  "suggest.start.i_feel": "I feel",
  "suggest.start.i_want": "I want",
  "suggest.start.i_need": "I need",
  "suggest.start.please": "Please",
  "suggest.start.when": "When",
  "suggest.start.can_you": "Can you",
  "suggest.start.tell_me": "Tell me",

  "suggest.i_am.in_pain": "in pain",
  "suggest.i_am.cold": "cold",
  "suggest.i_am.hot": "hot",
  "suggest.i_am.hungry": "hungry",
  "suggest.i_am.thirsty": "thirsty",
  "suggest.i_am.tired": "tired",
  "suggest.i_am.uncomfortable": "uncomfortable",
  "suggest.i_am.okay": "okay",
  "suggest.i_am.not_okay": "not okay",
  "suggest.i_am.ready": "ready",

  "suggest.i_feel.scared": "scared",
  "suggest.i_feel.sick": "sick",
  "suggest.i_feel.dizzy": "dizzy",
  "suggest.i_feel.weak": "weak",
  "suggest.i_feel.better": "better",
  "suggest.i_feel.worse": "worse",
  "suggest.i_feel.nauseous": "nauseous",
  "suggest.i_feel.lonely": "lonely",
  "suggest.i_feel.confused": "confused",
  "suggest.i_feel.safe": "safe",

  "suggest.i_feel_scared.procedure": "about the procedure",
  "suggest.i_feel_scared.happening": "about what's happening",
  "suggest.i_feel_scared.alone": "of being alone",
  "suggest.i_feel_scared.need_someone": "and I need someone",

  "suggest.i_feel_sick.stomach": "to my stomach",
  "suggest.i_feel_sick.dizzy": "and dizzy",
  "suggest.i_feel_sick.help": "and need help",

  "suggest.i_want.water": "water",
  "suggest.i_want.family": "my family",
  "suggest.i_want.go_home": "to go home",
  "suggest.i_want.sleep": "to sleep",
  "suggest.i_want.medication": "my medication",
  "suggest.i_want.blanket": "a blanket",
  "suggest.i_want.talk": "to talk to someone",
  "suggest.i_want.nurse": "the nurse",

  "suggest.i_want_to_go.home": "home",
  "suggest.i_want_to_go.sleep": "to sleep",
  "suggest.i_want_to_go.bathroom": "to the bathroom",

  "suggest.i_want_my.family": "family",
  "suggest.i_want_my.medication": "medication",
  "suggest.i_want_my.phone": "phone",
  "suggest.i_want_my.glasses": "glasses",
  "suggest.i_want_my.blanket": "blanket",

  "suggest.i_need.help": "help",
  "suggest.i_need.water": "water",
  "suggest.i_need.bathroom": "the bathroom",
  "suggest.i_need.medication": "my medication",
  "suggest.i_need.nurse": "the nurse",
  "suggest.i_need.doctor": "the doctor",
  "suggest.i_need.rest": "to rest",
  "suggest.i_need.blanket": "a blanket",
  "suggest.i_need.suction": "to be suctioned",

  "suggest.i_need_the.nurse": "nurse",
  "suggest.i_need_the.doctor": "doctor",
  "suggest.i_need_the.bathroom": "bathroom",
  "suggest.i_need_the.light_off": "light off",
  "suggest.i_need_the.light_on": "light on",

  "suggest.i_need_my.medication": "medication",
  "suggest.i_need_my.family": "family",
  "suggest.i_need_my.glasses": "glasses",
  "suggest.i_need_my.phone": "phone",

  "suggest.please.help_me": "help me",
  "suggest.please.call_family": "call my family",
  "suggest.please.light_off": "turn off the light",
  "suggest.please.adjust_bed": "adjust my bed",
  "suggest.please.give_me": "give me",
  "suggest.please.explain": "explain",
  "suggest.please.come_back": "come back soon",
  "suggest.please.stay": "stay with me",
  "suggest.please.dont_leave": "don't leave",

  "suggest.please_help_me.pain": "I'm in pain",
  "suggest.please_help_me.breathe": "I can't breathe",
  "suggest.please_help_me.sick": "I feel sick",
  "suggest.please_help_me.scared": "I'm scared",

  "suggest.please_give_me.water": "water",
  "suggest.please_give_me.medication": "my medication",
  "suggest.please_give_me.blanket": "a blanket",
  "suggest.please_give_me.pain_relief": "something for the pain",

  "suggest.when.go_home": "can I go home?",
  "suggest.when.family": "is my family coming?",
  "suggest.when.medication": "is my next medication?",
  "suggest.when.doctor": "is the doctor coming?",
  "suggest.when.eat": "can I eat?",
  "suggest.when.over": "will this be over?",

  "suggest.can_you.help": "help me?",
  "suggest.can_you.call_family": "call my family?",
  "suggest.can_you.get_nurse": "get the nurse?",
  "suggest.can_you.explain": "explain what's happening?",
  "suggest.can_you.light_off": "turn off the light?",
  "suggest.can_you.adjust_bed": "adjust my bed?",
  "suggest.can_you.stay": "stay with me?",

  "suggest.tell_me.happening": "what's happening",
  "suggest.tell_me.time": "what time it is",
  "suggest.tell_me.go_home": "when I can go home",
  "suggest.tell_me.day": "what day it is",
  "suggest.tell_me.treatment": "about my treatment",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "please help me",
  "suggest.i_am_in_pain.worse": "and it's getting worse",
  "suggest.i_am_in_pain.medication": "and need medication",
  "suggest.i_am_in_pain.back": "in my back",
  "suggest.i_am_in_pain.chest": "in my chest",
  "suggest.i_am_in_pain.stomach": "in my stomach",

  // After "I need help"
  "suggest.i_need_help.up": "getting up",
  "suggest.i_need_help.breathing": "breathing",
  "suggest.i_need_help.pain": "with the pain",
  "suggest.i_need_help.now": "right now",
  "suggest.i_need_help.please": "please",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "than before",
  "suggest.i_feel_better.now": "now",
  "suggest.i_feel_better.thanks": "thank you",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "than before",
  "suggest.i_feel_worse.need_doctor": "I need the doctor",
  "suggest.i_feel_worse.help": "please help",
  "suggest.i_feel_worse.medication": "I need medication",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "I feel",
  "suggest.ctx.feeling.i_am": "I am",
  "suggest.ctx.feeling.better": "Better than before",
  "suggest.ctx.feeling.not_great": "Not great",
  "suggest.ctx.feeling.pain": "I'm in pain",
  "suggest.ctx.feeling.okay": "I'm okay",
  "suggest.ctx.feeling.help": "Can you help me?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "I need",
  "suggest.ctx.need.i_want": "I want",
  "suggest.ctx.need.fine": "I'm fine right now",
  "suggest.ctx.need.yes": "Yes, please",
  "suggest.ctx.need.no": "No thank you",
  "suggest.ctx.need.stay": "Can you stay?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "My head",
  "suggest.ctx.where_hurts.chest": "My chest",
  "suggest.ctx.where_hurts.stomach": "My stomach",
  "suggest.ctx.where_hurts.back": "My back",
  "suggest.ctx.where_hurts.left_arm": "My left arm",
  "suggest.ctx.where_hurts.right_leg": "My right leg",
  "suggest.ctx.where_hurts.everywhere": "Everywhere",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "It's very bad",
  "suggest.ctx.pain.worse": "It's getting worse",
  "suggest.ctx.pain.same": "It's about the same",
  "suggest.ctx.pain.little_better": "It's a little better",
  "suggest.ctx.pain.need_relief": "I need something for the pain",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "I'm comfortable",
  "suggest.ctx.comfort.not_comfortable": "I'm not comfortable",
  "suggest.ctx.comfort.cant_sleep": "I can't sleep",
  "suggest.ctx.comfort.cold": "I'm cold",
  "suggest.ctx.comfort.hot": "I'm hot",
  "suggest.ctx.comfort.adjust_bed": "Can you adjust my bed?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "I can't sleep",
  "suggest.ctx.night.i_need": "I need",
  "suggest.ctx.night.pain": "I'm in pain",
  "suggest.ctx.night.i_feel": "I feel",
  "suggest.ctx.night.can_you": "Can you",
  "suggest.ctx.night.please": "Please",
  "suggest.ctx.night.i_am": "I am",
  "suggest.ctx.night.when": "When",

  // Morning starters
  "suggest.ctx.morning.i_am": "I am",
  "suggest.ctx.morning.i_need": "I need",
  "suggest.ctx.morning.i_feel": "I feel",
  "suggest.ctx.morning.doctor": "When is the doctor coming?",
  "suggest.ctx.morning.i_want": "I want",
  "suggest.ctx.morning.can_you": "Can you",
  "suggest.ctx.morning.please": "Please",
  "suggest.ctx.morning.tell_me": "Tell me",

  // ── Category labels (UI, not spoken but needed for i18n) ───────
  "cat.quick": "Quick",
  "cat.needs": "I Need",
  "cat.feelings": "I Feel",
  "cat.pain": "Pain",
  "cat.questions": "Ask",
  "sub.comfort": "Comfort",
  "sub.medical": "Medical",
  "sub.people": "People",
  "sub.physical": "Physical",
  "sub.emotional": "Emotional",

  // Provider category labels
  "provider.cat.responses": "Responses",
  "provider.cat.questions": "Questions",
  "provider.cat.directions": "Directions",
  "provider.cat.goals_of_care": "Goals of Care",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — {name} conversation",
  "ui.patient.app.name_fallback": "Patient",
  "ui.patient.header.name_fallback": "Patient",
  "ui.patient.header.bed_prefix": "Bed ",
  "ui.dual.nav.wishes": "Wishes",
  "ui.provider.nav.listen": "Listen",
  "ui.provider.nav.staff": "Staff",
  "ui.provider.nav.settings": "Settings",
  "ui.provider.nav.theme.auto": "Auto",
  "ui.provider.nav.theme.light": "Light",
  "ui.provider.nav.theme.dark": "Dark",
  "ui.patient.tabbar.say_more": "Say More",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "How much pain do you have?",
  "ui.dual.pain.heading.location": "Where is your pain?",
  "ui.dual.pain.heading.descriptor": "What does the pain feel like?",
  "ui.patient.pain.step_of": "Step {n} of {total}",
  "ui.patient.pain.back_to": "Go back to {label}",
  "ui.patient.pain.level_aria": "Pain level {n}, {label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "{name}'s Wishes",
  "ui.patient.wishes.my_wishes": "My Wishes",
  "ui.patient.wishes.step_of": "Step {n} of {total}",
  "ui.patient.wishes.none_shared": "No wishes were shared.",
  "ui.patient.wishes.share_all_again": "Share all wishes again",
  "ui.patient.wishes.close": "Close",
  "ui.patient.wishes.share": "Share",
  "ui.patient.wishes.skip": "Skip",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Tap words below or type...",
  "ui.patient.builder.message_aria": "Your message",
  "ui.patient.builder.undo": "Undo last word",
  "ui.patient.builder.clear": "Clear message",
  "ui.patient.builder.refresh_ai": "Refresh AI suggestions",
  "ui.patient.builder.ai_thinking": "AI is thinking...",
  "ui.patient.builder.no_ai_suggestions": "No AI suggestions. Tap refresh to try again.",
  "ui.patient.builder.ready": "Your message is ready. Tap Speak to send.",
  "ui.patient.builder.speak": "Speak",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Repeat: {text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Care Team",
  "ui.provider.fallback_name": "Provider",
  "ui.provider.speaking_to": "Speaking to {name} as {prov}",
  "ui.provider.patient_fallback": "patient",
  "ui.provider.close_panel": "Close panel",
  "ui.provider.select_provider": "Select {name}",
  "ui.provider.show_category": "Show {key}",
  "ui.provider.speak_phrase": "Speak: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Listen",
  "ui.provider.listen.stop_aria": "Stop listening",
  "ui.provider.listen.start_aria": "Tap to start listening",
  "ui.provider.listen.listening": "Listening...",
  "ui.provider.listen.transcribing": "Transcribing...",
  "ui.provider.listen.listening_placeholder": "Listening for speech...",
  "ui.provider.listen.transcribing_placeholder": "Transcribing speech...",
  "ui.provider.listen.type_placeholder": "Or type what was said...",
  "ui.provider.listen.transcript_aria": "Transcript",
  "ui.provider.listen.add_as": "Add to conversation as {prov}",
  "ui.provider.listen.privacy_notice": "On-device · Whisper · no audio leaves this device",
} as const;

export type PhraseKey = keyof typeof en;
export type LocaleStrings = Record<PhraseKey, string>;
export default en;
