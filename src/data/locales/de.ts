/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: German (Hochdeutsch)
 * Locale: de
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const de: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Ja",
  "quick.no": "Nein",
  "quick.thank_you": "Danke",
  "quick.please_wait": "Bitte warten",
  "quick.dont_understand": "Ich verstehe nicht",
  "quick.repeat": "Bitte wiederholen Sie das",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Ich brauche Wasser",
  "needs.comfort.hungry": "Ich habe Hunger",
  "needs.comfort.cold": "Mir ist kalt",
  "needs.comfort.hot": "Mir ist heiß",
  "needs.comfort.bed": "Bitte mein Bett verstellen",
  "needs.comfort.bathroom": "Ich brauche die Toilette",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Ich brauche mein Medikament",
  "needs.medical.suction": "Ich muss abgesaugt werden",
  "needs.medical.nauseous": "Mir ist übel",
  "needs.medical.breathe": "Ich bekomme schlecht Luft",
  "needs.medical.nurse": "Ich brauche die Pflegekraft",
  "needs.medical.doctor": "Ich brauche den Arzt",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Ich möchte meine Familie sehen",
  "needs.people.stay": "Kann jemand bei mir bleiben?",
  "needs.people.call": "Ich möchte jemanden anrufen",
  "needs.people.interpreter": "Ich brauche einen Dolmetscher",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Ich bin müde",
  "feelings.physical.uncomfortable": "Ich fühle mich unwohl",
  "feelings.physical.weak": "Ich fühle mich schwach",
  "feelings.physical.better": "Ich fühle mich besser",
  "feelings.physical.dizzy": "Mir ist schwindelig",
  "feelings.physical.itchy": "Es juckt mich",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Ich habe Angst",
  "feelings.emotional.lonely": "Ich fühle mich einsam",
  "feelings.emotional.frustrated": "Ich bin frustriert",
  "feelings.emotional.confused": "Ich bin verwirrt",
  "feelings.emotional.safe": "Ich fühle mich sicher",
  "feelings.emotional.grateful": "Ich bin dankbar",
  "feelings.emotional.worried": "Ich mache mir Sorgen",
  "feelings.emotional.hopeful": "Ich bin zuversichtlich",
  "feelings.emotional.bored": "Mir ist langweilig",
  "feelings.emotional.embarrassed": "Es ist mir peinlich",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Wie spät ist es?",
  "questions.day": "Welcher Tag ist heute?",
  "questions.whats_happening": "Was passiert mit mir?",
  "questions.go_home": "Wann kann ich nach Hause?",
  "questions.next_medication": "Wann bekomme ich mein nächstes Medikament?",
  "questions.explain_treatment": "Können Sie mir meine Behandlung erklären?",
  "questions.nurse_today": "Wer ist heute meine Pflegekraft?",
  "questions.eat_drink": "Darf ich essen oder trinken?",
  "questions.see_family": "Wann kann ich meine Familie sehen?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Kein Schmerz",
  "pain.face.2": "Tut ein wenig weh",
  "pain.face.4": "Tut etwas mehr weh",
  "pain.face.6": "Tut noch mehr weh",
  "pain.face.8": "Tut sehr weh",
  "pain.face.10": "Tut am meisten weh",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Dumpf",
  "pain.descriptor.burning": "Brennend",
  "pain.descriptor.sharp": "Stechend",
  "pain.descriptor.throbbing": "Pochend",
  "pain.descriptor.cramping": "Krampfartig",
  "pain.descriptor.constant": "Dauerhaft",
  "pain.descriptor.comes_and_goes": "Kommt und geht",
  "pain.descriptor.numb": "Taub",
  "pain.descriptor.pressure": "Druck",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Kopf",
  "pain.region.face": "Gesicht",
  "pain.region.neck": "Hals",
  "pain.region.chest": "Brust",
  "pain.region.left_shoulder": "Linke Schulter",
  "pain.region.right_shoulder": "Rechte Schulter",
  "pain.region.left_arm": "Linker Arm",
  "pain.region.right_arm": "Rechter Arm",
  "pain.region.stomach": "Bauch",
  "pain.region.upper_back": "Oberer Rücken",
  "pain.region.lower_back": "Unterer Rücken",
  "pain.region.left_leg": "Linkes Bein",
  "pain.region.right_leg": "Rechtes Bein",

  // ── Pain: Composed sentence template ───────────────────────────
  // TODO(translator): German gendered articles make "in my {region}" impossible
  // without per-region preposition. This draft uses a dash construction to avoid
  // gendered possessives. Review for natural clinical phrasing.
  "pain.sentence":
    "Ich habe {descriptor} Schmerzen – {region}, Stärke {severity} von 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Stärke",
  "pain.step.location": "Stelle",
  "pain.step.descriptor": "Beschreibung",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Meine Ziele",
  "wishes.worries.label": "Meine Sorgen",
  "wishes.strength.label": "Meine Kraft",
  "wishes.joy.label": "Was mir Freude macht",
  "wishes.tradeoffs.label": "Zur Behandlung",
  "wishes.family.label": "Meine Familie",
  "wishes.hopes.label": "Meine Hoffnungen",

  // Questions
  "wishes.goals.question": "Was sind Ihre wichtigsten Ziele?",
  "wishes.worries.question": "Was sind Ihre größten Sorgen?",
  "wishes.strength.question": "Was gibt Ihnen Kraft?",
  "wishes.joy.question": "Was gibt Ihrem Leben Freude und Sinn?",
  "wishes.tradeoffs.question":
    "Wie viel sind Sie bereit durchzumachen, um mehr Zeit zu haben?",
  "wishes.family.question":
    "Wie viel wissen die Menschen, die Ihnen am nächsten stehen, über Ihre Wünsche?",
  "wishes.hopes.question": "Was sind Ihre Hoffnungen?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems compose naturally with response lists.
  // German requires noun-clause stems ("Was mir …") to work with "ist {list}."
  "wishes.goals.stem": "Was mir am wichtigsten ist",
  "wishes.worries.stem": "Ich mache mir Sorgen wegen",
  "wishes.strength.stem": "Was mir Kraft gibt",
  "wishes.joy.stem": "Was mir Freude macht",
  "wishes.tradeoffs.stem": "Zu meiner Behandlung",
  "wishes.family.stem": "Über meine Familie",
  "wishes.hopes.stem": "Ich hoffe",

  // Responses — goals
  "wishes.goals.r.family": "Bei meiner Familie zu sein",
  "wishes.goals.r.comfort": "Schmerzfrei und bequem zu sein",
  "wishes.goals.r.longevity": "So lange wie möglich zu leben",
  "wishes.goals.r.home": "Nach Hause zu gehen",
  "wishes.goals.r.independence": "Dinge selbst tun zu können",
  "wishes.goals.r.peace": "In Frieden zu sein",

  // Responses — worries
  "wishes.worries.r.suffering": "Zu leiden oder Schmerzen zu haben",
  "wishes.worries.r.alone": "Allein zu sein",
  "wishes.worries.r.burden": "Meiner Familie zur Last zu fallen",
  "wishes.worries.r.activities": "Dinge, die mir Freude machen, nicht mehr tun zu können",
  "wishes.worries.r.leaving": "Meine Familie zurückzulassen",
  "wishes.worries.r.unknown": "Nicht zu wissen, was passieren wird",

  // Responses — strength
  "wishes.strength.r.family": "Meine Familie",
  "wishes.strength.r.faith": "Mein Glaube",
  "wishes.strength.r.friends": "Meine Freunde",
  "wishes.strength.r.wishes_heard": "Zu wissen, dass meine Wünsche gehört werden",
  "wishes.strength.r.hope": "Die Hoffnung, dass es mir besser geht",
  "wishes.strength.r.carers": "Die Menschen, die mich pflegen",

  // Responses — joy
  "wishes.joy.r.family": "Zeit mit meiner Familie verbringen",
  "wishes.joy.r.outdoors": "Draußen in der Natur sein",
  "wishes.joy.r.hobbies": "Meine Hobbys und Interessen",
  "wishes.joy.r.helping": "Anderen helfen",
  "wishes.joy.r.spiritual": "Meine spirituelle Praxis",
  "wishes.joy.r.routines": "Einfache tägliche Routinen",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Ich möchte jede mögliche Behandlung",
  "wishes.tradeoffs.r.good_chance":
    "Ich möchte eine Behandlung, wenn sie gute Aussichten hat",
  "wishes.tradeoffs.r.try_stop":
    "Ich möchte es versuchen, aber aufhören, wenn es nicht hilft",
  "wishes.tradeoffs.r.comfortable": "Ich möchte mich auf mein Wohlbefinden konzentrieren",
  "wishes.tradeoffs.r.think": "Ich brauche mehr Zeit zum Nachdenken",
  "wishes.tradeoffs.r.family_first":
    "Ich muss zuerst mit meiner Familie sprechen",

  // Responses — family
  "wishes.family.r.know_well": "Sie kennen meine Wünsche gut",
  "wishes.family.r.know_some": "Sie kennen einige meiner Wünsche",
  "wishes.family.r.not_talked": "Wir haben noch nicht darüber gesprochen",
  "wishes.family.r.need_help": "Ich brauche Hilfe, es ihnen zu sagen",
  "wishes.family.r.team_explain":
    "Ich möchte, dass mein Behandlungsteam es erklärt",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Wieder gesund zu werden",
  "wishes.hopes.r.go_home": "Nach Hause zu gehen",
  "wishes.hopes.r.comfortable": "Mich wohlzufühlen",
  "wishes.hopes.r.family_ok": "Dass es meiner Familie gut geht",
  "wishes.hopes.r.more_time": "Mehr Zeit zu haben",
  "wishes.hopes.r.peace": "In Frieden zu sein",

  // Wish sentence composition templates
  // TODO(translator): Verify "ist" works for all stem + list combinations.
  // Some stems (e.g. "Ich hoffe") may not compose naturally with "ist {list}."
  "wishes.compose": "{stem} ist {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Ich werde jemanden holen, der Ihnen hilft.",
  "provider.responses.interpreter": "Ich werde einen Dolmetscher holen.",
  "provider.responses.family": "Ich werde Ihre Familie anrufen.",
  "provider.responses.get_that": "Ich werde das für Sie holen.",
  "provider.responses.doctor_know": "Ich werde den Arzt informieren.",
  "provider.responses.medication": "Ich werde Ihr Medikament holen.",
  "provider.responses.family_coming": "Ihre Familie ist unterwegs.",
  "provider.responses.doctor_soon": "Der Arzt kommt gleich.",
  "provider.responses.doing_well": "Es geht Ihnen gut.",
  "provider.responses.rest": "Versuchen Sie jetzt zu ruhen.",

  "provider.questions.feeling": "Wie fühlen Sie sich?",
  "provider.questions.need": "Brauchen Sie etwas?",
  "provider.questions.where_hurts":
    "Können Sie mir zeigen, wo es wehtut?",
  "provider.questions.rate_pain": "Bewerten Sie Ihren Schmerz von 0 bis 10.",
  "provider.questions.sleep": "Haben Sie gut geschlafen?",
  "provider.questions.comfortable": "Sind Sie bequem?",

  "provider.directions.procedure":
    "Ihr Eingriff ist für heute geplant.",
  "provider.directions.stay_in_bed": "Sie müssen im Bett bleiben.",
  "provider.directions.vitals": "Ich werde jetzt Ihre Vitalzeichen überprüfen.",
  "provider.directions.medication_time": "Zeit für Ihr Medikament.",
  "provider.directions.breathe": "Versuchen Sie, tief durchzuatmen.",
  "provider.directions.call_button":
    "Drücken Sie die Klingel, wenn Sie etwas brauchen.",

  "provider.goals_of_care.matters_most":
    "Ich möchte mit Ihnen darüber sprechen, was Ihnen am wichtigsten ist.",
  "provider.goals_of_care.goals":
    "Was sind Ihre wichtigsten Ziele im Moment?",
  "provider.goals_of_care.worries":
    "Was sind Ihre größten Sorgen?",
  "provider.goals_of_care.strength": "Was gibt Ihnen Kraft?",
  "provider.goals_of_care.joy":
    "Was gibt Ihrem Leben Freude und Sinn?",
  "provider.goals_of_care.wishes":
    "Wie viel wissen Ihre Angehörigen über Ihre Wünsche?",
  "provider.goals_of_care.hopes": "Was sind Ihre Hoffnungen?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Ich habe gut geschlafen",
  "time.morning.didnt_sleep": "Ich habe schlecht geschlafen",
  "time.morning.breakfast": "Ich brauche Frühstück",
  "time.morning.doctor_coming": "Wann kommt der Arzt?",

  "time.afternoon.tired": "Ich bin müde",
  "time.afternoon.lunch": "Kann ich Mittagessen haben?",
  "time.afternoon.see_family": "Wann kann ich meine Familie sehen?",
  "time.afternoon.rest": "Ich muss mich ausruhen",

  "time.evening.cant_sleep": "Ich kann nicht schlafen",
  "time.evening.medication": "Ich brauche mein Medikament",
  "time.evening.call_family": "Kann ich meine Familie anrufen?",
  "time.evening.pain": "Ich habe Schmerzen",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // German word order and case inflection may not compose cleanly — review each path.
  // "Ich bin" + "kalt" yields "Ich bin kalt" (wrong — should be "Mir ist kalt").
  // Consider this a known limitation of the builder for German.
  "suggest.start.i_am": "Ich bin",
  "suggest.start.i_feel": "Ich fühle mich",
  "suggest.start.i_want": "Ich möchte",
  "suggest.start.i_need": "Ich brauche",
  "suggest.start.please": "Bitte",
  "suggest.start.when": "Wann",
  "suggest.start.can_you": "Können Sie",
  "suggest.start.tell_me": "Sagen Sie mir",

  "suggest.i_am.in_pain": "habe Schmerzen",
  "suggest.i_am.cold": "mir ist kalt",
  "suggest.i_am.hot": "mir ist heiß",
  "suggest.i_am.hungry": "habe Hunger",
  "suggest.i_am.thirsty": "habe Durst",
  "suggest.i_am.tired": "müde",
  "suggest.i_am.uncomfortable": "unwohl",
  "suggest.i_am.okay": "okay",
  "suggest.i_am.not_okay": "nicht okay",
  "suggest.i_am.ready": "bereit",

  "suggest.i_feel.scared": "ängstlich",
  "suggest.i_feel.sick": "krank",
  "suggest.i_feel.dizzy": "schwindelig",
  "suggest.i_feel.weak": "schwach",
  "suggest.i_feel.better": "besser",
  "suggest.i_feel.worse": "schlechter",
  "suggest.i_feel.nauseous": "übel",
  "suggest.i_feel.lonely": "einsam",
  "suggest.i_feel.confused": "verwirrt",
  "suggest.i_feel.safe": "sicher",

  "suggest.i_feel_scared.procedure": "wegen des Eingriffs",
  "suggest.i_feel_scared.happening": "wegen dem, was passiert",
  "suggest.i_feel_scared.alone": "allein zu sein",
  "suggest.i_feel_scared.need_someone": "und brauche jemanden",

  "suggest.i_feel_sick.stomach": "im Magen",
  "suggest.i_feel_sick.dizzy": "und schwindelig",
  "suggest.i_feel_sick.help": "und brauche Hilfe",

  "suggest.i_want.water": "Wasser",
  "suggest.i_want.family": "meine Familie",
  "suggest.i_want.go_home": "nach Hause",
  "suggest.i_want.sleep": "schlafen",
  "suggest.i_want.medication": "mein Medikament",
  "suggest.i_want.blanket": "eine Decke",
  "suggest.i_want.talk": "mit jemandem sprechen",
  "suggest.i_want.nurse": "die Pflegekraft",

  "suggest.i_want_to_go.home": "nach Hause",
  "suggest.i_want_to_go.sleep": "schlafen",
  "suggest.i_want_to_go.bathroom": "zur Toilette",

  "suggest.i_want_my.family": "Familie",
  "suggest.i_want_my.medication": "Medikament",
  "suggest.i_want_my.phone": "Telefon",
  "suggest.i_want_my.glasses": "Brille",
  "suggest.i_want_my.blanket": "Decke",

  "suggest.i_need.help": "Hilfe",
  "suggest.i_need.water": "Wasser",
  "suggest.i_need.bathroom": "die Toilette",
  "suggest.i_need.medication": "mein Medikament",
  "suggest.i_need.nurse": "die Pflegekraft",
  "suggest.i_need.doctor": "den Arzt",
  "suggest.i_need.rest": "Ruhe",
  "suggest.i_need.blanket": "eine Decke",
  "suggest.i_need.suction": "abgesaugt werden",

  "suggest.i_need_the.nurse": "Pflegekraft",
  "suggest.i_need_the.doctor": "Arzt",
  "suggest.i_need_the.bathroom": "Toilette",
  "suggest.i_need_the.light_off": "Licht aus",
  "suggest.i_need_the.light_on": "Licht an",

  "suggest.i_need_my.medication": "Medikament",
  "suggest.i_need_my.family": "Familie",
  "suggest.i_need_my.glasses": "Brille",
  "suggest.i_need_my.phone": "Telefon",

  "suggest.please.help_me": "helfen Sie mir",
  "suggest.please.call_family": "rufen Sie meine Familie an",
  "suggest.please.light_off": "machen Sie das Licht aus",
  "suggest.please.adjust_bed": "verstellen Sie mein Bett",
  "suggest.please.give_me": "geben Sie mir",
  "suggest.please.explain": "erklären Sie",
  "suggest.please.come_back": "kommen Sie bald wieder",
  "suggest.please.stay": "bleiben Sie bei mir",
  "suggest.please.dont_leave": "gehen Sie nicht",

  "suggest.please_help_me.pain": "Ich habe Schmerzen",
  "suggest.please_help_me.breathe": "Ich bekomme keine Luft",
  "suggest.please_help_me.sick": "Mir ist schlecht",
  "suggest.please_help_me.scared": "Ich habe Angst",

  "suggest.please_give_me.water": "Wasser",
  "suggest.please_give_me.medication": "mein Medikament",
  "suggest.please_give_me.blanket": "eine Decke",
  "suggest.please_give_me.pain_relief": "etwas gegen die Schmerzen",

  "suggest.when.go_home": "kann ich nach Hause?",
  "suggest.when.family": "kommt meine Familie?",
  "suggest.when.medication": "ist mein nächstes Medikament?",
  "suggest.when.doctor": "kommt der Arzt?",
  "suggest.when.eat": "darf ich essen?",
  "suggest.when.over": "ist das vorbei?",

  "suggest.can_you.help": "mir helfen?",
  "suggest.can_you.call_family": "meine Familie anrufen?",
  "suggest.can_you.get_nurse": "die Pflegekraft holen?",
  "suggest.can_you.explain": "erklären, was passiert?",
  "suggest.can_you.light_off": "das Licht ausmachen?",
  "suggest.can_you.adjust_bed": "mein Bett verstellen?",
  "suggest.can_you.stay": "bei mir bleiben?",

  "suggest.tell_me.happening": "was passiert",
  "suggest.tell_me.time": "wie spät es ist",
  "suggest.tell_me.go_home": "wann ich nach Hause kann",
  "suggest.tell_me.day": "welcher Tag es ist",
  "suggest.tell_me.treatment": "etwas über meine Behandlung",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "bitte helfen Sie mir",
  "suggest.i_am_in_pain.worse": "und es wird schlimmer",
  "suggest.i_am_in_pain.medication": "und brauche Medikament",
  "suggest.i_am_in_pain.back": "im Rücken",
  "suggest.i_am_in_pain.chest": "in der Brust",
  "suggest.i_am_in_pain.stomach": "im Bauch",

  // After "I need help"
  "suggest.i_need_help.up": "beim Aufstehen",
  "suggest.i_need_help.breathing": "beim Atmen",
  "suggest.i_need_help.pain": "gegen die Schmerzen",
  "suggest.i_need_help.now": "sofort",
  "suggest.i_need_help.please": "bitte",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "als vorher",
  "suggest.i_feel_better.now": "jetzt",
  "suggest.i_feel_better.thanks": "danke",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "als vorher",
  "suggest.i_feel_worse.need_doctor": "Ich brauche den Arzt",
  "suggest.i_feel_worse.help": "bitte helfen Sie mir",
  "suggest.i_feel_worse.medication": "Ich brauche Medikament",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "Ich fühle mich",
  "suggest.ctx.feeling.i_am": "Ich bin",
  "suggest.ctx.feeling.better": "Besser als vorher",
  "suggest.ctx.feeling.not_great": "Nicht gut",
  "suggest.ctx.feeling.pain": "Ich habe Schmerzen",
  "suggest.ctx.feeling.okay": "Es geht mir gut",
  "suggest.ctx.feeling.help": "Können Sie mir helfen?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "Ich brauche",
  "suggest.ctx.need.i_want": "Ich möchte",
  "suggest.ctx.need.fine": "Im Moment geht es",
  "suggest.ctx.need.yes": "Ja, bitte",
  "suggest.ctx.need.no": "Nein, danke",
  "suggest.ctx.need.stay": "Können Sie bleiben?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "Mein Kopf",
  "suggest.ctx.where_hurts.chest": "Meine Brust",
  "suggest.ctx.where_hurts.stomach": "Mein Bauch",
  "suggest.ctx.where_hurts.back": "Mein Rücken",
  "suggest.ctx.where_hurts.left_arm": "Mein linker Arm",
  "suggest.ctx.where_hurts.right_leg": "Mein rechtes Bein",
  "suggest.ctx.where_hurts.everywhere": "Überall",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "Sehr schlimm",
  "suggest.ctx.pain.worse": "Es wird schlimmer",
  "suggest.ctx.pain.same": "Ungefähr gleich",
  "suggest.ctx.pain.little_better": "Etwas besser",
  "suggest.ctx.pain.need_relief": "Ich brauche etwas gegen die Schmerzen",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "Mir geht es gut",
  "suggest.ctx.comfort.not_comfortable": "Ich fühle mich unwohl",
  "suggest.ctx.comfort.cant_sleep": "Ich kann nicht schlafen",
  "suggest.ctx.comfort.cold": "Mir ist kalt",
  "suggest.ctx.comfort.hot": "Mir ist heiß",
  "suggest.ctx.comfort.adjust_bed": "Können Sie mein Bett verstellen?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "Ich kann nicht schlafen",
  "suggest.ctx.night.i_need": "Ich brauche",
  "suggest.ctx.night.pain": "Ich habe Schmerzen",
  "suggest.ctx.night.i_feel": "Ich fühle mich",
  "suggest.ctx.night.can_you": "Können Sie",
  "suggest.ctx.night.please": "Bitte",
  "suggest.ctx.night.i_am": "Ich bin",
  "suggest.ctx.night.when": "Wann",

  // Morning starters
  "suggest.ctx.morning.i_am": "Ich bin",
  "suggest.ctx.morning.i_need": "Ich brauche",
  "suggest.ctx.morning.i_feel": "Ich fühle mich",
  "suggest.ctx.morning.doctor": "Wann kommt der Arzt?",
  "suggest.ctx.morning.i_want": "Ich möchte",
  "suggest.ctx.morning.can_you": "Können Sie",
  "suggest.ctx.morning.please": "Bitte",
  "suggest.ctx.morning.tell_me": "Sagen Sie mir",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Schnell",
  "cat.needs": "Ich brauche",
  "cat.feelings": "Ich fühle",
  "cat.pain": "Schmerz",
  "cat.questions": "Fragen",
  "sub.comfort": "Komfort",
  "sub.medical": "Medizinisch",
  "sub.people": "Personen",
  "sub.physical": "Körperlich",
  "sub.emotional": "Emotional",

  // Provider category labels
  "provider.cat.responses": "Antworten",
  "provider.cat.questions": "Fragen",
  "provider.cat.directions": "Anweisungen",
  "provider.cat.goals_of_care": "Therapieziele",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice – Gespräch von {name}",
  "ui.patient.app.name_fallback": "Patient",
  "ui.patient.header.name_fallback": "Patient",
  "ui.patient.header.bed_prefix": "Bett ",
  "ui.dual.nav.wishes": "Wünsche",
  "ui.dual.nav.listen": "Zuhören",
  "ui.provider.nav.staff": "Personal",
  "ui.provider.nav.switch_patient": "Patient wechseln",
  "ui.provider.nav.settings": "Einstellungen",
  "ui.provider.nav.theme.auto": "Automatisch",
  "ui.provider.nav.theme.light": "Hell",
  "ui.provider.nav.theme.dark": "Dunkel",
  "ui.patient.tabbar.say_more": "Mehr sagen",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Wie stark sind Ihre Schmerzen?",
  "ui.dual.pain.heading.location": "Wo tut es weh?",
  "ui.dual.pain.heading.descriptor": "Wie fühlt sich der Schmerz an?",
  "ui.patient.pain.step_of": "Schritt {n} von {total}",
  "ui.patient.pain.back_to": "Zurück zu {label}",
  "ui.patient.pain.level_aria": "Schmerzstufe {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Wünsche von {name}",
  "ui.patient.wishes.my_wishes": "Meine Wünsche",
  "ui.patient.wishes.step_of": "Schritt {n} von {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Es wurden keine Wünsche geteilt.",
  "ui.patient.wishes.share_all_again": "Alle Wünsche erneut teilen",
  "ui.patient.wishes.close": "Schließen",
  "ui.patient.wishes.share": "Teilen",
  "ui.patient.wishes.skip": "Überspringen",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Tippen Sie Wörter unten an oder schreiben Sie …",
  "ui.patient.builder.message_aria": "Ihre Nachricht",
  "ui.patient.builder.undo": "Letztes Wort rückgängig",
  "ui.patient.builder.clear": "Nachricht löschen",
  "ui.patient.builder.refresh_ai": "KI-Vorschläge aktualisieren",
  "ui.patient.builder.ai_thinking": "KI denkt nach …",
  "ui.patient.builder.no_ai_suggestions":
    "Keine KI-Vorschläge. Tippen Sie auf Aktualisieren, um es erneut zu versuchen.",
  "ui.patient.builder.ready":
    "Ihre Nachricht ist bereit. Tippen Sie auf Sprechen, um sie zu senden.",
  "ui.patient.builder.speak": "Sprechen",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Wiederholen: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Behandlungsteam",
  "ui.provider.fallback_name": "Behandler",
  "ui.provider.speaking_to": "Spricht mit {name} als {prov}",
  "ui.provider.patient_fallback": "Patient",
  "ui.provider.close_panel": "Panel schließen",
  "ui.provider.select_provider": "{name} auswählen",
  "ui.provider.show_category": "{key} anzeigen",
  "ui.provider.speak_phrase": "Sprechen: {phrase}",
  "ui.provider.speaking_as_aria": "Speaking as",
  "ui.provider.section_aria": "Phrase category",
  "ui.provider.phrases_aria": "{section} phrases",
  "ui.provider.listen.capture_aria": "Voice capture",
  "ui.provider.setup.progress_aria": "Setup progress",
  "ui.provider.settings.aria_label": "Settings",
  "ui.provider.settings.reset.aria_label": "Reset actions",
  "ui.provider.patients.list_aria": "Patients",
  "ui.provider.fallback_voice.recommended_aria": "Recommended voices",
  "ui.provider.fallback_voice.other_aria": "Other voices",
  "ui.provider.fallback_voice.all_aria": "Available voices",
  "ui.provider.pin_gate.keypad_aria": "PIN keypad",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Zuhören",
  "ui.provider.listen.stop_aria": "Aufhören zuzuhören",
  "ui.provider.listen.start_aria": "Tippen, um zuzuhören",
  "ui.provider.listen.listening": "Hört zu …",
  "ui.provider.listen.transcribing": "Transkribiert …",
  "ui.provider.listen.listening_placeholder": "Hört auf Sprache …",
  "ui.provider.listen.transcribing_placeholder": "Transkribiert Sprache …",
  "ui.provider.listen.type_placeholder": "Oder tippen Sie das Gesagte ein …",
  "ui.provider.listen.transcript_aria": "Transkript",
  "ui.provider.listen.audio_level_aria": "Mikrofon-Audiopegel",
  "ui.provider.listen.add_as": "Zum Gespräch hinzufügen als {prov}",
  "ui.provider.listen.privacy_notice":
    "Auf dem Gerät · Whisper · kein Audio verlässt dieses Gerät",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Spricht: {text}",
  "ui.dual.speaking.patient_voice": "Ihre Stimme",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "PIN eingeben",
  "ui.provider.pin_gate.subtitle": "Nur für Personal",
  "ui.provider.pin_gate.incorrect": "Falsche PIN",
  "ui.provider.pin_gate.delete_aria": "Löschen",
  "ui.provider.pin_gate.digit_aria": "Ziffer {n}",
  "ui.provider.pin_gate.cancel": "Abbrechen",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Sie werden gleich einen Satz laut vorlesen.",
  "ui.provider.voice_capture.coaching_breath":
    "Atmen Sie ein paar Mal tief durch.",
  "ui.provider.voice_capture.coaching_ready": "Bereit.",
  "ui.provider.voice_capture.breathe_in": "Einatmen …",
  "ui.provider.voice_capture.breathe_out": "Ausatmen …",
  "ui.provider.voice_capture.creating": "Stimmklon wird erstellt …",
  "ui.provider.voice_capture.creating_from_sample":
    "Stimmklon wird aus Probe erstellt …",
  "ui.provider.voice_capture.loading_model":
    "Stimmmodell wird geladen …",
  "ui.provider.voice_capture.clone_failed": "Klonen fehlgeschlagen",
  "ui.provider.voice_capture.captured": "Stimme aufgenommen",
  "ui.provider.voice_capture.stop": "Stopp",
  "ui.provider.voice_capture.play": "Abspielen",
  "ui.provider.voice_capture.discard": "Aufnahme verwerfen",
  "ui.provider.voice_capture.use_recording": "Diese Aufnahme verwenden",
  "ui.provider.voice_capture.upload_file": "Datei hochladen",
  "ui.provider.voice_capture.record": "Aufnehmen",
  "ui.provider.voice_capture.stop_early": "Vorzeitig stoppen",
  "ui.provider.voice_capture.remove": "Entfernen",
  "ui.provider.voice_capture.retry": "Erneut versuchen",
  "ui.provider.voice_capture.done": "Fertig!",
  "ui.provider.voice_capture.cancel": "Abbrechen",
  "ui.provider.voice_capture.seconds_recorded": "{n} s aufgenommen",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Aufnahme-Countdown abbrechen",
  "ui.provider.voice_capture.stop_early_aria":
    "Aufnahme vorzeitig stoppen",
  "ui.provider.voice_capture.audio_level_aria": "Audiopegel",
  "ui.provider.voice_capture.recording_progress_aria":
    "Aufnahmefortschritt",
  "ui.provider.voice_capture.stop_preview_aria":
    "Vorschau-Wiedergabe stoppen",
  "ui.provider.voice_capture.play_preview_aria":
    "Aufnahmevorschau abspielen",
  "ui.provider.voice_capture.discard_aria":
    "Diese Aufnahme verwerfen und neu beginnen",
  "ui.provider.voice_capture.stop_playback_aria":
    "Wiedergabe der aufgenommenen Probe stoppen",
  "ui.provider.voice_capture.play_sample_aria":
    "Aufgenommene Stimmprobe abspielen",
  "ui.provider.voice_capture.remove_aria": "Stimmprobe entfernen",
  "ui.provider.voice_capture.retry_aria":
    "Stimmklon-Extraktion erneut versuchen",
  "ui.provider.voice_capture.upload_aria":
    "Stimmprobe aus Datei hochladen",
  "ui.provider.voice_capture.record_aria":
    "Stimmprobe über Mikrofon aufnehmen",
  "ui.provider.voice_capture.err_network":
    "Das Stimmmodell konnte nicht erreicht werden. Prüfen Sie die Verbindung und tippen Sie auf Erneut versuchen.",
  "ui.provider.voice_capture.err_timeout":
    "Die Stimmverarbeitung hat zu lange gedauert. Tippen Sie auf Erneut versuchen.",
  "ui.provider.voice_capture.err_mic_denied":
    "Der Mikrofonzugriff ist blockiert. Aktivieren Sie ihn in den Browsereinstellungen oder laden Sie stattdessen eine Datei hoch.",
  "ui.provider.voice_capture.err_generic":
    "Wir konnten die Vorbereitung Ihrer Stimme nicht abschließen. Tippen Sie auf Erneut versuchen.",
  "ui.provider.voice_capture.err_too_short":
    "Die Aufnahme war zu kurz. Sprechen Sie den gesamten Countdown durch und tippen Sie dann auf Erneut versuchen.",
  "ui.provider.voice_capture.err_too_noisy":
    "Die Hintergrundgeräusche waren zu laut für einen sauberen Stimmklon. Gehen Sie an einen ruhigeren Ort und tippen Sie auf Erneut versuchen.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Mikrofonzugriff verweigert. Versuchen Sie, stattdessen eine Datei hochzuladen.",
  "ui.provider.voice_capture.err_playback":
    "Audio konnte nicht abgespielt werden.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Erweitert",
  "ui.provider.fallback_voice.enhanced_aria": "Erweiterte neuronale Stimme",
  "ui.provider.fallback_voice.on_device_badge": "Auf dem Gerät",
  "ui.provider.fallback_voice.playing": "Wird abgespielt …",
  "ui.provider.fallback_voice.unavailable":
    "Systemstimmen sind auf diesem Gerät nicht verfügbar.",
  "ui.provider.fallback_voice.loading":
    "Verfügbare Stimmen werden geladen …",
  "ui.provider.fallback_voice.hide_others": "Andere Stimmen ausblenden",
  "ui.provider.fallback_voice.more_voices": "Weitere Stimmen ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  // Step labels (progress bar)
  "ui.provider.setup.steps.patient": "Patient",
  "ui.provider.setup.steps.voice": "Stimme",
  "ui.provider.setup.steps.care_team": "Team",
  "ui.provider.setup.steps.confirm": "Bestätigen",

  // Skip button + confirm dialog
  "ui.provider.setup.skip": "Überspringen →",
  "ui.provider.setup.skip_aria": "Einrichtung überspringen",
  "ui.provider.setup.skip_dialog.title": "Einrichtung überspringen?",
  "ui.provider.setup.skip_dialog.body": "OwnVoice jetzt verwenden. Sie können die Einrichtung später abschließen, indem Sie oben auf den Patientennamen tippen.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Es wird kein Patient hinzugefügt.",
  "ui.provider.setup.skip_dialog.confirm": "Einrichtung überspringen",
  "ui.provider.setup.skip_dialog.cancel": "Weiter einrichten",

  // Navigation
  "ui.provider.setup.back": "Zurück",
  "ui.provider.setup.continue": "Weiter",
  "ui.provider.setup.start": "OwnVoice starten",

  // Step 0: Patient info
  "ui.provider.setup.step0.heading": "Willkommen bei OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Wir richten Ihre Kommunikationstafel ein. Alles bleibt auf diesem Gerät.",
  "ui.provider.setup.step0.name_label": "Patientenname",
  "ui.provider.setup.step0.name_placeholder":
    "Vorname oder bevorzugter Name",
  "ui.provider.setup.step0.bed_label": "Bett / Zimmer",
  "ui.provider.setup.step0.bed_placeholder": "z. B. 4B-12",
  "ui.provider.setup.step0.language_label": "Sprache",

  // Step 1: Voice sample
  "ui.provider.setup.step1.heading": "Stimmprobe",
  "ui.provider.setup.step1.body1":
    "Nehmen Sie eine Stimmprobe auf, damit OwnVoice in der Stimme des Patienten sprechen kann. Dieser Schritt ist optional.",
  "ui.provider.setup.step1.body2":
    "Das Stimmklonen läuft vollständig auf dem Gerät. Kein Audio verlässt dieses Tablet.",
  "ui.provider.setup.step1.patient_label": "Patient",
  "ui.provider.setup.step1.backup_voice_heading": "Ersatzstimme",
  "ui.provider.setup.step1.backup_voice_body1":
    "Wählen Sie eine Systemstimme, die verwendet wird, während der Stimmklon lädt oder wenn keine Probe aufgenommen wurde. Tippen Sie auf eine Stimme, um eine Vorschau zu hören.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Dies nutzt die eingebaute Sprachsynthese Ihres Geräts.",

  // Step 2: Care team
  "ui.provider.setup.step2.heading": "Behandlungsteam",
  "ui.provider.setup.step2.body":
    "Fügen Sie die Behandler hinzu, die diesen Patienten betreuen.",
  "ui.provider.setup.step2.icon_label": "Symbol",
  "ui.provider.setup.step2.name_label": "Name",
  "ui.provider.setup.step2.name_placeholder":
    "Dr. Müller, Pfleger Jan …",
  "ui.provider.setup.step2.add": "Hinzufügen",

  // Step 3: Confirm
  "ui.provider.setup.step3.heading": "Bereit",
  "ui.provider.setup.step3.body":
    "Überprüfen Sie Ihre Einrichtung. Sie können alles später in den Einstellungen ändern.",
  "ui.provider.setup.step3.summary.patient": "Patient",
  "ui.provider.setup.step3.summary.bed": "Bett / Zimmer",
  "ui.provider.setup.step3.summary.language": "Sprache",
  "ui.provider.setup.step3.summary.language_default": "Deutsch",
  "ui.provider.setup.step3.summary.voice": "Stimme",
  "ui.provider.setup.step3.summary.care_team": "Behandlungsteam",
  "ui.provider.setup.step3.summary.not_set": "Nicht festgelegt",
  "ui.provider.setup.step3.summary.captured": "Aufgenommen",
  "ui.provider.setup.step3.summary.not_captured": "Nicht aufgenommen",
  "ui.provider.setup.step3.summary.none_added": "Keine hinzugefügt",
  "ui.provider.setup.step3.pin_label": "Personal-PIN (optional)",
  "ui.provider.setup.step3.pin_body":
    "Legen Sie eine 4-stellige PIN fest, um die Behandlereinstellungen zu schützen.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Einstellungen",
  "ui.provider.settings.done": "Fertig",
  "ui.provider.settings.close_aria": "Einstellungen schließen",

  "ui.provider.patient_edit.title": "{name} bearbeiten",
  "ui.provider.patient_edit.title_default": "Patient bearbeiten",
  "ui.provider.patient_edit.close_aria": "Patientenbearbeitung schließen",
  "ui.provider.patient_pill.aria": "Patient bearbeiten: {name}",
  "ui.provider.nav.staff_menu": "Einstellungen",
  "ui.provider.staff_sheet.title": "Personal",
  "ui.provider.staff_sheet.close_aria": "Personalmenü schließen",
  "ui.provider.staff_sheet.patients_description": "Patienten wechseln, hinzufügen oder bearbeiten",
  "ui.provider.staff_sheet.settings_description": "Pflegeteam, Barrierefreiheit, Offline",
  "ui.provider.staff_sheet.end_session_description": "Personal-Modus verlassen",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Stimmvorbereitung von {label} verwerfen?",
  "ui.provider.settings.voice_cache.discard_body":
    "Der Fortschritt ({current} / {total} Phrasen) geht verloren. Die aufgenommene Stimmprobe wird behalten – Sie können die Vorbereitung später neu starten.",
  "ui.provider.settings.voice_cache.cancel": "Abbrechen",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Abbrechen und Stimmvorbereitung behalten",
  "ui.provider.settings.voice_cache.discard_confirm": "Verwerfen",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Verwerfen der Stimmvorbereitung bestätigen",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Stimmvorbereitung von {label} verwerfen",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "In Warteschlange – Stimme von {label} wird als Nächstes vorbereitet ({total} Phrase{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Stimme von {label} wird vorbereitet … {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Pausiert – Stimme von {label} … {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Fortsetzen",
  "ui.provider.settings.voice_cache.resume_aria":
    "Stimmvorbereitung von {label} fortsetzen",
  "ui.provider.settings.voice_cache.pause": "Pausieren",
  "ui.provider.settings.voice_cache.pause_aria":
    "Stimmvorbereitung von {label} pausieren",
  "ui.provider.settings.voice_cache.done":
    "Stimmklon aktiv – alle {total} Phrasen in der Stimme von {label} bereit",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} Phrase{plural} fehlgeschlagen für {label}",
  "ui.provider.settings.voice_cache.retry": "Erneut versuchen",
  "ui.provider.settings.voice_cache.retry_aria":
    "Fehlgeschlagene Stimm-Cache-Phrasen erneut versuchen",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Über",
  "ui.provider.settings.about.subtitle":
    "AAC-Kommunikationshilfe für stationäre Patienten.",
  "ui.provider.settings.about.attribution_1":
    "Schmerzskala: Emoji-FPS (Li et al., JMIR 2023) – CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Therapieziele: SICG (Ariadne Labs) – CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW-Cache:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Zurücksetzen",
  "ui.provider.settings.reset.action_label":
    "App für neuen Patienten zurücksetzen",
  "ui.provider.settings.reset.confirm_title": "Sind Sie sicher?",
  "ui.provider.settings.reset.confirm_body":
    "Hiermit werden alle Patientendaten, Stimmproben, der Gesprächsverlauf und die Behandlereinstellungen gelöscht. Dies kann nicht rückgängig gemacht werden.",
  "ui.provider.settings.reset.confirm_destructive": "Alles zurücksetzen",
  "ui.provider.settings.reset.row_label": "Reset",
  "ui.provider.settings.reset.row_description": "Erase patient data, care team, or the whole device",
  "ui.provider.settings.reset.confirm_action": "Erase",
  "ui.provider.settings.reset.patients.label": "Erase and Reset All Patient Data",
  "ui.provider.settings.reset.patients.description": "Remove patients, conversations, and patient voice clips. Keeps care team.",
  "ui.provider.settings.reset.patients.confirm_title": "Erase all patient data?",
  "ui.provider.settings.reset.patients.confirm_body": "All patients, their conversations, and their voice clips will be erased. Care team configuration is preserved. This cannot be undone.",
  "ui.provider.settings.reset.care_team.label": "Erase and Reset All Care Team Data",
  "ui.provider.settings.reset.care_team.description": "Remove care-team profiles and their voice clips. Keeps patients.",
  "ui.provider.settings.reset.care_team.confirm_title": "Erase all care team data?",
  "ui.provider.settings.reset.care_team.confirm_body": "All care-team profiles and their voice clips will be erased. Patient data is preserved. This cannot be undone.",
  "ui.provider.settings.reset.everything.label": "Erase and Reset Everything",
  "ui.provider.settings.reset.everything.description": "Wipe the device — patients, care team, voice models, and settings.",
  "ui.provider.settings.reset.empty_hint": "No data to erase",

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "Barrierefreiheit",
  "ui.provider.settings.accessibility.toggle_label":
    "Assistive Eingabe",
  "ui.provider.settings.accessibility.toggle_description":
    "Verstärkt Fokusringe, verlängert die Tipp-Entprellung und verstärkt das Hover-Feedback für Patienten, die Trackball, Joystick, AssistiveTouch-Cursor oder Schalter verwenden.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Externer Zeiger erkannt.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Erwägen Sie, die assistive Eingabe für diesen Patienten zu aktivieren.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Patienten",
  "ui.provider.settings.patients.active_remove_hint":
    "Wechseln Sie zu einem anderen Patienten, bevor Sie diesen entfernen.",
  "ui.provider.settings.patients.remove_button": "Entfernen",
  "ui.provider.settings.patients.add_patient": "+ Patient hinzufügen",
  "ui.provider.settings.patients.remove_dialog.title":
    "{name} entfernen?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Hiermit werden Stimmprobe, Gesprächsverlauf und zwischengespeichertes Audio für den Stimmklon gelöscht. Stimmklone des Behandlungsteams werden für andere Patienten behalten. Dies kann nicht rückgängig gemacht werden.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Entfernen",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Behandlungsteam",
  "ui.provider.settings.care_team.empty":
    "Noch keine Behandler hinzugefügt.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Patienteninformation",
  "ui.provider.settings.patient_info.name_label": "Name",
  "ui.provider.settings.patient_info.bed_label": "Bett / Zimmer",
  "ui.provider.settings.patient_info.language_label": "Sprache",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Patientensprache",
  "ui.provider.settings.lang.caregiver_section":
    "Sprache des Behandlungsteams",
  "ui.provider.settings.lang.caregiver_helper":
    "Die Sprache, die Ihr Behandlungsteam versteht. Wird normalerweise einmal pro Gerät festgelegt.",
  "ui.provider.settings.lang.change": "Sprache ändern",

  "ui.provider.settings.lang.picker_title": "Sprache wählen",
  "ui.provider.settings.lang.patient_dialog.title":
    "Patientensprache auf {lang} ändern?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Ihr Stimmklon bleibt bereit – die angetippten Phrasen klingen weiterhin gleich. Wir bereiten Audio für {providerCount} Stimmen des Behandlungsteams vor (~{estimatedMinutes} Min.). Sie können die App währenddessen weiter nutzen.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Stimmklone des Behandlungsteams sind in {lang} nicht verfügbar – stattdessen wird die Systemstimme verwendet. Bestehende Aufnahmen werden für den Fall behalten, dass Sie später zu einer unterstützten Sprache wechseln.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Die angetippten Phrasen klingen weiterhin gleich. Es sind keine Stimmen des Behandlungsteams konfiguriert, sodass nichts neu generiert werden muss.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Sprache des Behandlungsteams auf {lang} ändern?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Die Stimmklone Ihres Behandlungsteams bleiben bereit. Wir bereiten Patienten-Stimm-Audio in der neuen Sprache vor (~{estimatedMinutes} Min.). Sie können die App währenddessen weiter nutzen.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Der Patienten-Stimmklon ist in {lang} nicht verfügbar – stattdessen wird die Systemstimme verwendet. Die aufgenommene Stimmprobe wird für den Fall behalten, dass Sie später zu einer unterstützten Sprache wechseln.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Kein Patienten-Stimmklon konfiguriert, sodass nichts neu generiert werden muss.",
  "ui.provider.settings.patient_info.voice_label": "Stimme",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Ersatzstimme",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Systemstimme, die verwendet wird, während der Stimmklon lädt. Tippen Sie zum Vorhören.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "App-Diagnose",
  "ui.provider.settings.offline.status_description":
    "Status der KI-Modelle, die die App auf dem Gerät für Sprachgenerierung, Vorschläge und Spracherkennung verwendet.",
  "ui.provider.settings.offline.downloading":
    "Modelle werden heruntergeladen …",
  "ui.provider.settings.offline.download_progress_aria":
    "Fortschritt beim Herunterladen der Modelle",
  "ui.provider.settings.offline.all_ready":
    "Alle Modelle bereit",
  "ui.provider.settings.offline.redownload_button":
    "Modelle erneut herunterladen",
  "ui.provider.settings.offline.already_up_to_date":
    "Bereits aktuell",
  "ui.provider.settings.offline.checking": "Wird geprüft …",
  "ui.provider.settings.offline.verified": "✓ Modelle verifiziert",
  "ui.provider.settings.offline.check_button":
    "Vorhandene Modelle prüfen",
  "ui.provider.settings.offline.redownloading":
    "Wird erneut heruntergeladen …",
  "ui.provider.settings.offline.force_redownload_button":
    "Alle Modelle erzwungen neu herunterladen",
  "ui.provider.settings.offline.model_status_ready": "bereit",
  "ui.provider.settings.offline.model_status_downloading":
    "wird heruntergeladen …",
  "ui.provider.settings.offline.model_status_needs_retry":
    "Wiederholung nötig",
  "ui.provider.settings.offline.last_verified_prefix":
    "Zuletzt verifiziert: ",
  "ui.provider.settings.offline.storage_prefix": "Speicher: ",
  "ui.provider.settings.offline.storage_of": " von ",
  "ui.provider.settings.offline.storage_used": " belegt",
  "ui.provider.settings.offline.storage_low": " – wird knapp",
  "ui.provider.settings.offline.clear_audio_cache":
    "Audio-Cache leeren",
  "ui.provider.settings.offline.clearing": "Wird geleert …",
  "ui.provider.settings.offline.rebuilding":
    "Neuaufbau: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Alle KI-Modelle erneut herunterladen?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Hiermit werden etwa 1,7 GB erneut heruntergeladen. Die Sprachsynthese funktioniert während der Aktualisierung weiter.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Erneut herunterladen",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Patient wechseln",
  "ui.provider.switch.add_patient": "+ Patient hinzufügen",
  "ui.provider.patients.title": "Patienten",
  "ui.provider.patients.actions_aria": "Aktionen für {name}",
  "ui.provider.patients.action_edit": "Bearbeiten",
  "ui.provider.patients.action_remove": "Entfernen",
  "ui.provider.switch.voice_captured": "Stimme aufgenommen",
  "ui.provider.switch.no_voice": "Keine Stimme",
  "ui.provider.switch.last_active_just_now": "Gerade eben",
  "ui.provider.switch.last_active_minutes":
    "Zuletzt aktiv vor {n} Min.",
  "ui.provider.switch.last_active_hours": "Zuletzt aktiv vor {n} Std.",
  "ui.provider.switch.last_active_days": "Zuletzt aktiv vor {n} T.",
  "ui.provider.switch.currently_active": "Derzeit aktiv",
  "ui.provider.switch.switched_announcement":
    "Gewechselt zu {name}. {count} Gesprächsnachrichten.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Personalsitzung endet bald",
  "ui.provider.staff_session.warning_body":
    "Ihr Personalzugang wird in {n} Sekunden gesperrt.",
  "ui.provider.staff_session.extend": "Sitzung verlängern",
  "ui.provider.staff_session.end_now": "Jetzt beenden",
  "ui.provider.nav.end_staff_session": "Personalsitzung beenden",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",

  // ── Model readiness (TODO: translate) ──
  "ui.readiness.listen.not_ready": "Getting ready to listen",
  "ui.readiness.listen.with_countdown": "Getting ready to listen — {countdown}",
  "ui.readiness.listen.almost": "Almost ready…",
  "ui.readiness.listen.ready": "Tap to listen",
  "ui.readiness.listen.failed_message": "Couldn't get ready",
  "ui.readiness.listen.failed_action": "Try again",
  "ui.readiness.voice_capture.precapture_hint": "Voice will start as soon as it's ready",
  "ui.readiness.voice_capture.saving": "Saving your voice — about {countdown} left",
  "ui.readiness.voice_capture.saving_almost": "Almost ready…",
  "ui.readiness.voice_capture.ready": "Voice ready",
  "ui.readiness.voice_capture.failed_message": "Couldn't prepare your voice",
  "ui.readiness.voice_capture.failed_action": "Try again",
  "ui.patient.header.voice_status.not_ready": "Using a temporary voice while yours gets ready — {countdown}",
  "ui.patient.header.voice_status.almost": "Almost ready — using a temporary voice",
  "ui.patient.header.voice_status.failed_message": "Couldn't prepare your voice",
  "ui.patient.header.voice_status.failed_action": "Try again",
};

export default de;
