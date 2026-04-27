/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in LOCALES (DRAFT)
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Dutch (NL standard, Flemish-compatible)
 * Locale: nl
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const nl: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Ja",
  "quick.no": "Nee",
  "quick.thank_you": "Dank u",
  "quick.please_wait": "Wacht alstublieft",
  "quick.dont_understand": "Ik begrijp het niet",
  "quick.repeat": "Kunt u dat herhalen?",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Ik heb water nodig",
  "needs.comfort.hungry": "Ik heb honger",
  "needs.comfort.cold": "Ik heb het koud",
  "needs.comfort.hot": "Ik heb het warm",
  "needs.comfort.bed": "Kunt u mijn bed verstellen?",
  "needs.comfort.bathroom": "Ik moet naar het toilet",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Ik heb mijn medicatie nodig",
  "needs.medical.suction": "Ik moet worden uitgezogen",
  "needs.medical.nauseous": "Ik ben misselijk",
  "needs.medical.breathe": "Ik kan niet goed ademhalen",
  "needs.medical.nurse": "Ik heb de verpleegkundige nodig",
  "needs.medical.doctor": "Ik heb de dokter nodig",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Ik wil mijn familie",
  "needs.people.stay": "Kan er iemand bij mij blijven?",
  "needs.people.call": "Ik wil iemand bellen",
  "needs.people.interpreter": "Ik heb een tolk nodig",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Ik ben moe",
  "feelings.physical.uncomfortable": "Ik lig niet lekker",
  "feelings.physical.weak": "Ik voel me zwak",
  "feelings.physical.better": "Ik voel me beter",
  "feelings.physical.dizzy": "Ik ben duizelig",
  "feelings.physical.itchy": "Ik heb jeuk",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Ik ben bang",
  "feelings.emotional.lonely": "Ik voel me eenzaam",
  "feelings.emotional.frustrated": "Ik ben gefrustreerd",
  "feelings.emotional.confused": "Ik ben in de war",
  "feelings.emotional.safe": "Ik voel me veilig",
  "feelings.emotional.grateful": "Ik ben dankbaar",
  "feelings.emotional.worried": "Ik maak me zorgen",
  "feelings.emotional.hopeful": "Ik heb hoop",
  "feelings.emotional.bored": "Ik verveel me",
  "feelings.emotional.embarrassed": "Ik schaam me",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Hoe laat is het?",
  "questions.day": "Welke dag is het?",
  "questions.whats_happening": "Wat gebeurt er met mij?",
  "questions.go_home": "Wanneer mag ik naar huis?",
  "questions.next_medication": "Wanneer krijg ik mijn volgende medicatie?",
  "questions.explain_treatment": "Kunt u mijn behandeling uitleggen?",
  "questions.nurse_today": "Wie is mijn verpleegkundige vandaag?",
  "questions.eat_drink": "Mag ik eten of drinken?",
  "questions.see_family": "Wanneer kan ik mijn familie zien?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Geen pijn",
  "pain.face.2": "Een beetje pijn",
  "pain.face.4": "Iets meer pijn",
  "pain.face.6": "Nog meer pijn",
  "pain.face.8": "Heel veel pijn",
  "pain.face.10": "Ergste pijn",

  // ── Pain: Descriptors ──────────────────────────────────────────
  // NOTE: Inflected (-e) forms for use in attributive position before "pijn"
  "pain.descriptor.aching": "Zeurende",
  "pain.descriptor.burning": "Brandende",
  "pain.descriptor.sharp": "Stekende",
  "pain.descriptor.throbbing": "Kloppende",
  "pain.descriptor.cramping": "Krampende",
  "pain.descriptor.constant": "Constante",
  "pain.descriptor.comes_and_goes": "Af en aan",
  "pain.descriptor.numb": "Gevoelloze",
  "pain.descriptor.pressure": "Drukkende",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Hoofd",
  "pain.region.face": "Gezicht",
  "pain.region.neck": "Nek",
  "pain.region.chest": "Borst",
  "pain.region.left_shoulder": "Linkerschouder",
  "pain.region.right_shoulder": "Rechterschouder",
  "pain.region.left_arm": "Linkerarm",
  "pain.region.right_arm": "Rechterarm",
  "pain.region.stomach": "Buik",
  "pain.region.upper_back": "Bovenrug",
  "pain.region.lower_back": "Onderrug",
  "pain.region.left_leg": "Linkerbeen",
  "pain.region.right_leg": "Rechterbeen",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  "pain.sentence":
    "Ik heb {descriptor} pijn in mijn {region}, niveau {severity} van de 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Ernst",
  "pain.step.location": "Locatie",
  "pain.step.descriptor": "Beschrijving",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Mijn doelen",
  "wishes.worries.label": "Mijn zorgen",
  "wishes.strength.label": "Mijn kracht",
  "wishes.joy.label": "Wat mij vreugde geeft",
  "wishes.tradeoffs.label": "Over mijn behandeling",
  "wishes.family.label": "Mijn familie",
  "wishes.hopes.label": "Mijn hoop",

  // Questions
  "wishes.goals.question": "Wat zijn uw belangrijkste doelen?",
  "wishes.worries.question": "Wat zijn uw grootste zorgen?",
  "wishes.strength.question": "Wat geeft u kracht?",
  "wishes.joy.question": "Wat geeft u vreugde en betekenis in uw leven?",
  "wishes.tradeoffs.question":
    "Hoeveel bent u bereid te doorstaan voor meer tijd?",
  "wishes.family.question":
    "Hoeveel weten de mensen die u het naast staan over uw wensen?",
  "wishes.hopes.question": "Wat zijn uw verwachtingen?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "Het belangrijkst voor mij",
  "wishes.worries.stem": "Ik maak me zorgen over",
  "wishes.strength.stem": "Wat mij kracht geeft",
  "wishes.joy.stem": "Wat mij vreugde geeft",
  "wishes.tradeoffs.stem": "Over mijn behandeling",
  "wishes.family.stem": "Over mijn familie",
  "wishes.hopes.stem": "Ik hoop",

  // Responses — goals
  "wishes.goals.r.family": "Bij mijn familie zijn",
  "wishes.goals.r.comfort": "Comfortabel en zonder pijn zijn",
  "wishes.goals.r.longevity": "Zo lang mogelijk leven",
  "wishes.goals.r.home": "Naar huis gaan",
  "wishes.goals.r.independence": "Zelf dingen kunnen doen",
  "wishes.goals.r.peace": "In vrede zijn",

  // Responses — worries
  "wishes.worries.r.suffering": "Lijden of pijn hebben",
  "wishes.worries.r.alone": "Alleen zijn",
  "wishes.worries.r.burden": "Een last zijn voor mijn familie",
  "wishes.worries.r.activities": "Niet meer kunnen doen wat ik graag doe",
  "wishes.worries.r.leaving": "Mijn familie achterlaten",
  "wishes.worries.r.unknown": "Niet weten wat er gaat gebeuren",

  // Responses — strength
  "wishes.strength.r.family": "Mijn familie",
  "wishes.strength.r.faith": "Mijn geloof",
  "wishes.strength.r.friends": "Mijn vrienden",
  "wishes.strength.r.wishes_heard": "Weten dat mijn wensen gehoord worden",
  "wishes.strength.r.hope": "Hoop dat ik beter word",
  "wishes.strength.r.carers": "De mensen die voor mij zorgen",

  // Responses — joy
  "wishes.joy.r.family": "Tijd doorbrengen met mijn familie",
  "wishes.joy.r.outdoors": "Buiten zijn",
  "wishes.joy.r.hobbies": "Mijn hobby's en interesses",
  "wishes.joy.r.helping": "Anderen helpen",
  "wishes.joy.r.spiritual": "Mijn geestelijke leven",
  "wishes.joy.r.routines": "Dagelijkse routines",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Ik wil elke mogelijke behandeling",
  "wishes.tradeoffs.r.good_chance":
    "Ik wil behandeling als er een goede kans is",
  "wishes.tradeoffs.r.try_stop":
    "Ik wil het proberen, maar stoppen als het niet helpt",
  "wishes.tradeoffs.r.comfortable":
    "Ik wil me richten op comfort",
  "wishes.tradeoffs.r.think": "Ik heb meer tijd nodig om hierover na te denken",
  "wishes.tradeoffs.r.family_first":
    "Ik moet eerst met mijn familie overleggen",

  // Responses — family
  "wishes.family.r.know_well": "Zij kennen mijn wensen goed",
  "wishes.family.r.know_some": "Zij kennen een deel van mijn wensen",
  "wishes.family.r.not_talked": "We hebben het hier nog niet over gehad",
  "wishes.family.r.need_help": "Ik heb hulp nodig om het hen te vertellen",
  "wishes.family.r.team_explain":
    "Ik wil dat mijn zorgteam het aan hen uitlegt",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Beter worden",
  "wishes.hopes.r.go_home": "Naar huis gaan",
  "wishes.hopes.r.comfortable": "Comfortabel zijn",
  "wishes.hopes.r.family_ok": "Dat het goed gaat met mijn familie",
  "wishes.hopes.r.more_time": "Meer tijd hebben",
  "wishes.hopes.r.peace": "In vrede zijn",

  // Wish sentence composition templates
  // TODO(translator): Verify "is" works for all stem + list combinations in Dutch
  "wishes.compose": "{stem} is {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Ik ga iemand halen om u te helpen.",
  "provider.responses.interpreter": "Ik ga een tolk halen.",
  "provider.responses.family": "Ik ga uw familie bellen.",
  "provider.responses.get_that": "Ik ga dat voor u halen.",
  "provider.responses.doctor_know": "Ik laat het de dokter weten.",
  "provider.responses.medication": "Ik ga uw medicatie halen.",
  "provider.responses.family_coming": "Uw familie is onderweg.",
  "provider.responses.doctor_soon": "De dokter komt zo.",
  "provider.responses.doing_well": "Het gaat goed met u.",
  "provider.responses.rest": "Probeer nu te rusten.",

  "provider.questions.feeling": "Hoe voelt u zich?",
  "provider.questions.need": "Heeft u ergens behoefte aan?",
  "provider.questions.where_hurts":
    "Kunt u mij laten zien waar het pijn doet?",
  "provider.questions.rate_pain": "Geef uw pijn een cijfer van 0 tot 10.",
  "provider.questions.sleep": "Heeft u goed geslapen?",
  "provider.questions.comfortable": "Ligt u goed?",

  "provider.directions.procedure":
    "Uw ingreep staat vandaag gepland.",
  "provider.directions.stay_in_bed": "U moet in bed blijven.",
  "provider.directions.vitals":
    "Ik ga uw vitale functies controleren.",
  "provider.directions.medication_time": "Het is tijd voor uw medicatie.",
  "provider.directions.breathe": "Probeer diep adem te halen.",
  "provider.directions.call_button":
    "Druk op de belknop als u iets nodig heeft.",

  "provider.goals_of_care.matters_most":
    "Ik wil graag met u bespreken wat het belangrijkst voor u is.",
  "provider.goals_of_care.goals":
    "Wat zijn uw belangrijkste doelen op dit moment?",
  "provider.goals_of_care.worries": "Wat zijn uw grootste zorgen?",
  "provider.goals_of_care.strength": "Wat geeft u kracht?",
  "provider.goals_of_care.joy":
    "Wat geeft u vreugde en betekenis in uw leven?",
  "provider.goals_of_care.wishes":
    "Hoeveel weten uw naasten over uw wensen?",
  "provider.goals_of_care.hopes": "Wat zijn uw verwachtingen?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Ik heb goed geslapen",
  "time.morning.didnt_sleep": "Ik heb niet goed geslapen",
  "time.morning.breakfast": "Ik wil ontbijten",
  "time.morning.doctor_coming": "Wanneer komt de dokter?",

  "time.afternoon.tired": "Ik ben moe",
  "time.afternoon.lunch": "Mag ik lunchen?",
  "time.afternoon.see_family": "Wanneer kan ik mijn familie zien?",
  "time.afternoon.rest": "Ik moet rusten",

  "time.evening.cant_sleep": "Ik kan niet slapen",
  "time.evening.medication": "Ik heb mijn medicatie nodig",
  "time.evening.call_family": "Mag ik mijn familie bellen?",
  "time.evening.pain": "Ik heb pijn",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Dutch verb placement and "heb/ben" splits may not compose cleanly — review each path.
  "suggest.start.i_am": "Ik ben",
  "suggest.start.i_feel": "Ik voel me",
  "suggest.start.i_want": "Ik wil",
  "suggest.start.i_need": "Ik heb",
  "suggest.start.please": "Alstublieft",
  "suggest.start.when": "Wanneer",
  "suggest.start.can_you": "Kunt u",
  "suggest.start.tell_me": "Vertel mij",

  "suggest.i_am.in_pain": "pijn",
  "suggest.i_am.cold": "koud",
  "suggest.i_am.hot": "warm",
  "suggest.i_am.hungry": "honger",
  "suggest.i_am.thirsty": "dorst",
  "suggest.i_am.tired": "moe",
  "suggest.i_am.uncomfortable": "niet comfortabel",
  "suggest.i_am.okay": "in orde",
  "suggest.i_am.not_okay": "niet in orde",
  "suggest.i_am.ready": "klaar",

  "suggest.i_feel.scared": "bang",
  "suggest.i_feel.sick": "ziek",
  "suggest.i_feel.dizzy": "duizelig",
  "suggest.i_feel.weak": "zwak",
  "suggest.i_feel.better": "beter",
  "suggest.i_feel.worse": "slechter",
  "suggest.i_feel.nauseous": "misselijk",
  "suggest.i_feel.lonely": "eenzaam",
  "suggest.i_feel.confused": "verward",
  "suggest.i_feel.safe": "veilig",

  "suggest.i_feel_scared.procedure": "voor de ingreep",
  "suggest.i_feel_scared.happening": "over wat er gebeurt",
  "suggest.i_feel_scared.alone": "om alleen te zijn",
  "suggest.i_feel_scared.need_someone": "en ik heb iemand nodig",

  "suggest.i_feel_sick.stomach": "van mijn maag",
  "suggest.i_feel_sick.dizzy": "en duizelig",
  "suggest.i_feel_sick.help": "en heb hulp nodig",

  "suggest.i_want.water": "water",
  "suggest.i_want.family": "mijn familie",
  "suggest.i_want.go_home": "naar huis",
  "suggest.i_want.sleep": "slapen",
  "suggest.i_want.medication": "mijn medicatie",
  "suggest.i_want.blanket": "een deken",
  "suggest.i_want.talk": "met iemand praten",
  "suggest.i_want.nurse": "de verpleegkundige",

  "suggest.i_want_to_go.home": "naar huis",
  "suggest.i_want_to_go.sleep": "slapen",
  "suggest.i_want_to_go.bathroom": "naar het toilet",

  "suggest.i_want_my.family": "familie",
  "suggest.i_want_my.medication": "medicatie",
  "suggest.i_want_my.phone": "telefoon",
  "suggest.i_want_my.glasses": "bril",
  "suggest.i_want_my.blanket": "deken",

  "suggest.i_need.help": "hulp nodig",
  "suggest.i_need.water": "water nodig",
  "suggest.i_need.bathroom": "het toilet nodig",
  "suggest.i_need.medication": "mijn medicatie nodig",
  "suggest.i_need.nurse": "de verpleegkundige nodig",
  "suggest.i_need.doctor": "de dokter nodig",
  "suggest.i_need.rest": "rust nodig",
  "suggest.i_need.blanket": "een deken nodig",
  "suggest.i_need.suction": "uitzuigen nodig",

  "suggest.i_need_the.nurse": "verpleegkundige",
  "suggest.i_need_the.doctor": "dokter",
  "suggest.i_need_the.bathroom": "toilet",
  "suggest.i_need_the.light_off": "licht uit",
  "suggest.i_need_the.light_on": "licht aan",

  "suggest.i_need_my.medication": "medicatie",
  "suggest.i_need_my.family": "familie",
  "suggest.i_need_my.glasses": "bril",
  "suggest.i_need_my.phone": "telefoon",

  "suggest.please.help_me": "help mij",
  "suggest.please.call_family": "bel mijn familie",
  "suggest.please.light_off": "doe het licht uit",
  "suggest.please.adjust_bed": "verstel mijn bed",
  "suggest.please.give_me": "geef mij",
  "suggest.please.explain": "leg uit",
  "suggest.please.come_back": "kom snel terug",
  "suggest.please.stay": "blijf bij mij",
  "suggest.please.dont_leave": "ga niet weg",

  "suggest.please_help_me.pain": "Ik heb pijn",
  "suggest.please_help_me.breathe": "Ik kan niet ademhalen",
  "suggest.please_help_me.sick": "Ik voel me ziek",
  "suggest.please_help_me.scared": "Ik ben bang",

  "suggest.please_give_me.water": "water",
  "suggest.please_give_me.medication": "mijn medicatie",
  "suggest.please_give_me.blanket": "een deken",
  "suggest.please_give_me.pain_relief": "iets tegen de pijn",

  "suggest.when.go_home": "mag ik naar huis?",
  "suggest.when.family": "komt mijn familie?",
  "suggest.when.medication": "is mijn volgende medicatie?",
  "suggest.when.doctor": "komt de dokter?",
  "suggest.when.eat": "mag ik eten?",
  "suggest.when.over": "is dit voorbij?",

  "suggest.can_you.help": "mij helpen?",
  "suggest.can_you.call_family": "mijn familie bellen?",
  "suggest.can_you.get_nurse": "de verpleegkundige halen?",
  "suggest.can_you.explain": "uitleggen wat er gebeurt?",
  "suggest.can_you.light_off": "het licht uitdoen?",
  "suggest.can_you.adjust_bed": "mijn bed verstellen?",
  "suggest.can_you.stay": "bij mij blijven?",

  "suggest.tell_me.happening": "wat er gebeurt",
  "suggest.tell_me.time": "hoe laat het is",
  "suggest.tell_me.go_home": "wanneer ik naar huis mag",
  "suggest.tell_me.day": "welke dag het is",
  "suggest.tell_me.treatment": "over mijn behandeling",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "help mij alstublieft",
  "suggest.i_am_in_pain.worse": "en het wordt erger",
  "suggest.i_am_in_pain.medication": "en heb medicatie nodig",
  "suggest.i_am_in_pain.back": "in mijn rug",
  "suggest.i_am_in_pain.chest": "in mijn borst",
  "suggest.i_am_in_pain.stomach": "in mijn buik",

  // After "I need help"
  "suggest.i_need_help.up": "met opstaan",
  "suggest.i_need_help.breathing": "met ademhalen",
  "suggest.i_need_help.pain": "vanwege de pijn",
  "suggest.i_need_help.now": "nu meteen",
  "suggest.i_need_help.please": "alstublieft",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "dan eerder",
  "suggest.i_feel_better.now": "nu",
  "suggest.i_feel_better.thanks": "dank u",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "dan eerder",
  "suggest.i_feel_worse.need_doctor": "Ik heb de dokter nodig",
  "suggest.i_feel_worse.help": "help mij alstublieft",
  "suggest.i_feel_worse.medication": "Ik heb medicatie nodig",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "Ik voel me",
  "suggest.ctx.feeling.i_am": "Ik ben",
  "suggest.ctx.feeling.better": "Beter dan eerder",
  "suggest.ctx.feeling.not_great": "Niet zo goed",
  "suggest.ctx.feeling.pain": "Ik heb pijn",
  "suggest.ctx.feeling.okay": "Het gaat",
  "suggest.ctx.feeling.help": "Kunt u mij helpen?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "Ik heb nodig",
  "suggest.ctx.need.i_want": "Ik wil",
  "suggest.ctx.need.fine": "Het gaat goed zo",
  "suggest.ctx.need.yes": "Ja, alstublieft",
  "suggest.ctx.need.no": "Nee, dank u",
  "suggest.ctx.need.stay": "Kunt u blijven?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "Mijn hoofd",
  "suggest.ctx.where_hurts.chest": "Mijn borst",
  "suggest.ctx.where_hurts.stomach": "Mijn buik",
  "suggest.ctx.where_hurts.back": "Mijn rug",
  "suggest.ctx.where_hurts.left_arm": "Mijn linkerarm",
  "suggest.ctx.where_hurts.right_leg": "Mijn rechterbeen",
  "suggest.ctx.where_hurts.everywhere": "Overal",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "Het is heel erg",
  "suggest.ctx.pain.worse": "Het wordt erger",
  "suggest.ctx.pain.same": "Het is ongeveer hetzelfde",
  "suggest.ctx.pain.little_better": "Het is iets beter",
  "suggest.ctx.pain.need_relief": "Ik heb iets nodig tegen de pijn",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "Ik lig goed",
  "suggest.ctx.comfort.not_comfortable": "Ik lig niet lekker",
  "suggest.ctx.comfort.cant_sleep": "Ik kan niet slapen",
  "suggest.ctx.comfort.cold": "Ik heb het koud",
  "suggest.ctx.comfort.hot": "Ik heb het warm",
  "suggest.ctx.comfort.adjust_bed": "Kunt u mijn bed verstellen?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "Ik kan niet slapen",
  "suggest.ctx.night.i_need": "Ik heb nodig",
  "suggest.ctx.night.pain": "Ik heb pijn",
  "suggest.ctx.night.i_feel": "Ik voel me",
  "suggest.ctx.night.can_you": "Kunt u",
  "suggest.ctx.night.please": "Alstublieft",
  "suggest.ctx.night.i_am": "Ik ben",
  "suggest.ctx.night.when": "Wanneer",

  // Morning starters
  "suggest.ctx.morning.i_am": "Ik ben",
  "suggest.ctx.morning.i_need": "Ik heb nodig",
  "suggest.ctx.morning.i_feel": "Ik voel me",
  "suggest.ctx.morning.doctor": "Wanneer komt de dokter?",
  "suggest.ctx.morning.i_want": "Ik wil",
  "suggest.ctx.morning.can_you": "Kunt u",
  "suggest.ctx.morning.please": "Alstublieft",
  "suggest.ctx.morning.tell_me": "Vertel mij",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Snel",
  "cat.needs": "Ik heb nodig",
  "cat.feelings": "Ik voel",
  "cat.pain": "Pijn",
  "cat.questions": "Vragen",
  "sub.comfort": "Comfort",
  "sub.medical": "Medisch",
  "sub.people": "Mensen",
  "sub.physical": "Lichamelijk",
  "sub.emotional": "Emotioneel",

  // Provider category labels
  "provider.cat.responses": "Antwoorden",
  "provider.cat.questions": "Vragen",
  "provider.cat.directions": "Aanwijzingen",
  "provider.cat.goals_of_care": "Zorgdoelen",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — gesprek van {name}",
  "ui.patient.app.name_fallback": "Patiënt",
  "ui.patient.header.name_fallback": "Patiënt",
  "ui.patient.header.bed_prefix": "Bed ",
  "ui.dual.nav.wishes": "Wensen",
  "ui.dual.nav.listen": "Luisteren",
  "ui.provider.nav.staff": "Personeel",
  "ui.provider.nav.switch_patient": "Andere patiënt",
  "ui.provider.nav.settings": "Instellingen",
  "ui.provider.nav.theme.auto": "Automatisch",
  "ui.provider.nav.theme.light": "Licht",
  "ui.provider.nav.theme.dark": "Donker",
  "ui.patient.tabbar.say_more": "Meer zeggen",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Hoeveel pijn heeft u?",
  "ui.dual.pain.heading.location": "Waar zit de pijn?",
  "ui.dual.pain.heading.descriptor": "Hoe voelt de pijn?",
  "ui.patient.pain.step_of": "Stap {n} van {total}",
  "ui.patient.pain.back_to": "Terug naar {label}",
  "ui.patient.pain.level_aria": "Pijnniveau {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Wensen van {name}",
  "ui.patient.wishes.my_wishes": "Mijn wensen",
  "ui.patient.wishes.step_of": "Stap {n} van {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Er zijn geen wensen gedeeld.",
  "ui.patient.wishes.share_all_again": "Alle wensen opnieuw delen",
  "ui.patient.wishes.close": "Sluiten",
  "ui.patient.wishes.share": "Delen",
  "ui.patient.wishes.skip": "Overslaan",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Tik op woorden hieronder of typ...",
  "ui.patient.builder.message_aria": "Uw bericht",
  "ui.patient.builder.undo": "Laatste woord ongedaan maken",
  "ui.patient.builder.clear": "Bericht wissen",
  "ui.patient.builder.refresh_ai": "AI-suggesties vernieuwen",
  "ui.patient.builder.ai_thinking": "AI denkt na...",
  "ui.patient.builder.no_ai_suggestions":
    "Geen AI-suggesties. Tik op vernieuwen om het opnieuw te proberen.",
  "ui.patient.builder.ready":
    "Uw bericht is klaar. Tik op Spreken om te versturen.",
  "ui.patient.builder.speak": "Spreken",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Herhalen: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Zorgteam",
  "ui.provider.fallback_name": "Zorgverlener",
  "ui.provider.speaking_to": "Spreekt met {name} als {prov}",
  "ui.provider.patient_fallback": "patiënt",
  "ui.provider.close_panel": "Paneel sluiten",
  "ui.provider.select_provider": "Selecteer {name}",
  "ui.provider.show_category": "Toon {key}",
  "ui.provider.speak_phrase": "Zeg: {phrase}",
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
  "ui.provider.listen.title": "Luisteren",
  "ui.provider.listen.stop_aria": "Stop met luisteren",
  "ui.provider.listen.start_aria": "Tik om te beginnen met luisteren",
  "ui.provider.listen.listening": "Luistert...",
  "ui.provider.listen.transcribing": "Transcribeert...",
  "ui.provider.listen.listening_placeholder": "Luistert naar spraak...",
  "ui.provider.listen.transcribing_placeholder":
    "Spraak wordt getranscribeerd...",
  "ui.provider.listen.type_placeholder": "Of typ wat er gezegd is...",
  "ui.provider.listen.transcript_aria": "Transcriptie",
  "ui.provider.listen.add_as": "Toevoegen aan gesprek als {prov}",
  "ui.provider.listen.privacy_notice":
    "Op het apparaat · Whisper · geen audio verlaat dit apparaat",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Spreekt: {text}",
  "ui.dual.speaking.patient_voice": "Uw stem",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Voer PIN in",
  "ui.provider.pin_gate.subtitle": "Alleen toegang voor personeel",
  "ui.provider.pin_gate.incorrect": "Onjuiste PIN",
  "ui.provider.pin_gate.delete_aria": "Wissen",
  "ui.provider.pin_gate.digit_aria": "Cijfer {n}",
  "ui.provider.pin_gate.cancel": "Annuleren",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "U gaat een zin hardop voorlezen.",
  "ui.provider.voice_capture.coaching_breath":
    "Haal een paar keer diep adem.",
  "ui.provider.voice_capture.coaching_ready": "Klaar.",
  "ui.provider.voice_capture.breathe_in": "Adem in…",
  "ui.provider.voice_capture.breathe_out": "Adem uit…",
  "ui.provider.voice_capture.creating": "Stemkloon wordt gemaakt...",
  "ui.provider.voice_capture.creating_from_sample":
    "Stemkloon wordt gemaakt van opname...",
  "ui.provider.voice_capture.loading_model":
    "Stemmodel wordt geladen...",
  "ui.provider.voice_capture.clone_failed": "Klonen mislukt",
  "ui.provider.voice_capture.captured": "Stem vastgelegd",
  "ui.provider.voice_capture.stop": "Stoppen",
  "ui.provider.voice_capture.play": "Afspelen",
  "ui.provider.voice_capture.discard": "Opname verwijderen",
  "ui.provider.voice_capture.use_recording": "Deze opname gebruiken",
  "ui.provider.voice_capture.upload_file": "Bestand uploaden",
  "ui.provider.voice_capture.record": "Opnemen",
  "ui.provider.voice_capture.stop_early": "Vroegtijdig stoppen",
  "ui.provider.voice_capture.remove": "Verwijderen",
  "ui.provider.voice_capture.retry": "Opnieuw proberen",
  "ui.provider.voice_capture.done": "Klaar!",
  "ui.provider.voice_capture.cancel": "Annuleren",
  "ui.provider.voice_capture.seconds_recorded": "{n}s opgenomen",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Aftelling voor opname annuleren",
  "ui.provider.voice_capture.stop_early_aria":
    "Opname vroegtijdig stoppen",
  "ui.provider.voice_capture.audio_level_aria": "Geluidsniveau",
  "ui.provider.voice_capture.recording_progress_aria":
    "Voortgang opname",
  "ui.provider.voice_capture.stop_preview_aria":
    "Voorbeeldweergave stoppen",
  "ui.provider.voice_capture.play_preview_aria":
    "Voorbeeld van opname afspelen",
  "ui.provider.voice_capture.discard_aria":
    "Deze opname verwijderen en opnieuw beginnen",
  "ui.provider.voice_capture.stop_playback_aria":
    "Afspelen van opgenomen fragment stoppen",
  "ui.provider.voice_capture.play_sample_aria":
    "Opgenomen stemfragment afspelen",
  "ui.provider.voice_capture.remove_aria": "Stemfragment verwijderen",
  "ui.provider.voice_capture.retry_aria":
    "Stemkloon opnieuw proberen",
  "ui.provider.voice_capture.upload_aria":
    "Stemfragment uploaden vanuit bestand",
  "ui.provider.voice_capture.record_aria":
    "Stemfragment opnemen via microfoon",
  "ui.provider.voice_capture.err_network":
    "Kan het stemmodel niet bereiken. Controleer uw verbinding en tik op Opnieuw proberen.",
  "ui.provider.voice_capture.err_timeout":
    "Stemverwerking duurde te lang. Tik op Opnieuw proberen.",
  "ui.provider.voice_capture.err_mic_denied":
    "Microfoontoegang is geblokkeerd. Schakel deze in via uw browserinstellingen of upload een bestand.",
  "ui.provider.voice_capture.err_generic":
    "We konden het voorbereiden van uw stem niet afronden. Tik op Opnieuw proberen.",
  "ui.provider.voice_capture.err_too_short":
    "De opname was te kort. Spreek gedurende het hele aftellen en tik daarna op Opnieuw proberen.",
  "ui.provider.voice_capture.err_too_noisy":
    "Het achtergrondgeluid was te luid voor een zuivere stemkloon. Ga naar een stillere plek en tik op Opnieuw proberen.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Microfoontoegang geweigerd. Probeer een bestand te uploaden.",
  "ui.provider.voice_capture.err_playback":
    "Kan audio niet afspelen.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Verbeterd",
  "ui.provider.fallback_voice.enhanced_aria": "Verbeterde neurale stem",
  "ui.provider.fallback_voice.on_device_badge": "Op apparaat",
  "ui.provider.fallback_voice.playing": "Speelt af...",
  "ui.provider.fallback_voice.unavailable":
    "Systeemgeluiden zijn niet beschikbaar op dit apparaat.",
  "ui.provider.fallback_voice.loading":
    "Beschikbare stemmen laden...",
  "ui.provider.fallback_voice.hide_others": "Andere stemmen verbergen",
  "ui.provider.fallback_voice.more_voices": "Meer stemmen ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  // Step labels (progress bar)
  "ui.provider.setup.steps.patient": "Patiënt",
  "ui.provider.setup.steps.voice": "Stem",
  "ui.provider.setup.steps.care_team": "Zorgteam",
  "ui.provider.setup.steps.confirm": "Bevestigen",

  // Skip button + confirm dialog
  "ui.provider.setup.skip": "Overslaan →",
  "ui.provider.setup.skip_aria": "Instellen overslaan",
  "ui.provider.setup.skip_dialog.title": "Instellen overslaan?",
  "ui.provider.setup.skip_dialog.body": "Begin nu met OwnVoice. U kunt de installatie later afronden door op de patiëntnaam in de kop te tikken.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Er wordt geen patiënt toegevoegd.",
  "ui.provider.setup.skip_dialog.confirm": "Overslaan",
  "ui.provider.setup.skip_dialog.cancel": "Doorgaan",

  // Navigation
  "ui.provider.setup.back": "Terug",
  "ui.provider.setup.continue": "Doorgaan",
  "ui.provider.setup.start": "OwnVoice starten",

  // Step 0: Patient info
  "ui.provider.setup.step0.heading": "Welkom bij OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Laten we uw communicatiebord instellen. Alles blijft op dit apparaat.",
  "ui.provider.setup.step0.name_label": "Naam patiënt",
  "ui.provider.setup.step0.name_placeholder":
    "Voornaam of gewenste naam",
  "ui.provider.setup.step0.bed_label": "Bed / Kamer",
  "ui.provider.setup.step0.bed_placeholder": "bijv. 4B-12",
  "ui.provider.setup.step0.language_label": "Taal",

  // Step 1: Voice sample
  "ui.provider.setup.step1.heading": "Stemfragment",
  "ui.provider.setup.step1.body1":
    "Neem een stemfragment op zodat OwnVoice kan spreken met de stem van de patiënt. Deze stap is optioneel.",
  "ui.provider.setup.step1.body2":
    "Het klonen van de stem gebeurt volledig op het apparaat. Er verlaat geen audio deze tablet.",
  "ui.provider.setup.step1.patient_label": "Patiënt",
  "ui.provider.setup.step1.backup_voice_heading": "Reservestem",
  "ui.provider.setup.step1.backup_voice_body1":
    "Kies een systeemstem om te gebruiken terwijl de stemkloon wordt geladen, of als er geen opname is gemaakt. Tik op een stem om een voorbeeld te horen.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Dit maakt gebruik van de ingebouwde spraaksynthese van uw apparaat.",

  // Step 2: Care team
  "ui.provider.setup.step2.heading": "Zorgteam",
  "ui.provider.setup.step2.body":
    "Voeg de zorgverleners toe die deze patiënt zullen verzorgen.",
  "ui.provider.setup.step2.icon_label": "Pictogram",
  "ui.provider.setup.step2.name_label": "Naam",
  "ui.provider.setup.step2.name_placeholder":
    "Dr. Jansen, Verpleegk. Eva...",
  "ui.provider.setup.step2.add": "Toevoegen",

  // Step 3: Confirm
  "ui.provider.setup.step3.heading": "Klaar om te beginnen",
  "ui.provider.setup.step3.body":
    "Controleer uw instellingen. U kunt alles later wijzigen in Instellingen.",
  "ui.provider.setup.step3.summary.patient": "Patiënt",
  "ui.provider.setup.step3.summary.bed": "Bed / Kamer",
  "ui.provider.setup.step3.summary.language": "Taal",
  "ui.provider.setup.step3.summary.language_default": "Nederlands",
  "ui.provider.setup.step3.summary.voice": "Stem",
  "ui.provider.setup.step3.summary.care_team": "Zorgteam",
  "ui.provider.setup.step3.summary.not_set": "Niet ingesteld",
  "ui.provider.setup.step3.summary.captured": "Vastgelegd",
  "ui.provider.setup.step3.summary.not_captured": "Niet vastgelegd",
  "ui.provider.setup.step3.summary.none_added": "Niemand toegevoegd",
  "ui.provider.setup.step3.pin_label": "Personeel-PIN (optioneel)",
  "ui.provider.setup.step3.pin_body":
    "Stel een 4-cijferige PIN in om de instellingen voor zorgverleners te beschermen.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Instellingen",
  "ui.provider.settings.done": "Klaar",
  "ui.provider.settings.close_aria": "Instellingen sluiten",

  "ui.provider.patient_edit.title": "{name} bewerken",
  "ui.provider.patient_edit.title_default": "Patiënt bewerken",
  "ui.provider.patient_edit.close_aria": "Patiënteditor sluiten",
  "ui.provider.patient_pill.aria": "Patiënt bewerken: {name}",
  "ui.provider.nav.staff_menu": "Instellingen",
  "ui.provider.staff_sheet.title": "Personeel",
  "ui.provider.staff_sheet.close_aria": "Personeelmenu sluiten",
  "ui.provider.staff_sheet.patients_description": "Patiënten wisselen, toevoegen of bewerken",
  "ui.provider.staff_sheet.settings_description": "Zorgteam, toegankelijkheid, offline",
  "ui.provider.staff_sheet.end_session_description": "Personeelsmodus verlaten",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Stemvoorbereiding van {label} verwijderen?",
  "ui.provider.settings.voice_cache.discard_body":
    "De voortgang ({current} / {total} zinnen) gaat verloren. Het opgenomen stemfragment wordt bewaard — u kunt de voorbereiding later opnieuw starten.",
  "ui.provider.settings.voice_cache.cancel": "Annuleren",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Annuleren en stemvoorbereiding behouden",
  "ui.provider.settings.voice_cache.discard_confirm": "Verwijderen",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Bevestig verwijdering stemvoorbereiding",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Stemvoorbereiding van {label} verwijderen",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "In wachtrij — de stem van {label} wordt als volgende voorbereid ({total} zin{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Stem van {label} wordt voorbereid… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Gepauzeerd — stem van {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Hervatten",
  "ui.provider.settings.voice_cache.resume_aria":
    "Stemvoorbereiding van {label} hervatten",
  "ui.provider.settings.voice_cache.pause": "Pauzeren",
  "ui.provider.settings.voice_cache.pause_aria":
    "Stemvoorbereiding van {label} pauzeren",
  "ui.provider.settings.voice_cache.done":
    "Stemkloon actief — alle {total} zinnen klaar in de stem van {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} zin{plural} mislukt voor {label}",
  "ui.provider.settings.voice_cache.retry": "Opnieuw proberen",
  "ui.provider.settings.voice_cache.retry_aria":
    "Mislukte stemcachezinnen opnieuw proberen",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Over",
  "ui.provider.settings.about.subtitle":
    "AAC-communicatiehulpmiddel voor opgenomen patiënten.",
  "ui.provider.settings.about.attribution_1":
    "Pijnschaal: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Zorgdoelen: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW-cache:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Resetten",
  "ui.provider.settings.reset.action_label":
    "App resetten voor nieuwe patiënt",
  "ui.provider.settings.reset.confirm_title": "Weet u het zeker?",
  "ui.provider.settings.reset.confirm_body":
    "Dit wist alle patiëntgegevens, stemfragmenten, gespreksgeschiedenis en instellingen voor zorgverleners. Dit kan niet ongedaan worden gemaakt.",
  "ui.provider.settings.reset.confirm_destructive": "Alles resetten",
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
  "ui.provider.settings.accessibility.heading": "Toegankelijkheid",
  "ui.provider.settings.accessibility.toggle_label":
    "Ondersteunde invoermodus",
  "ui.provider.settings.accessibility.toggle_description":
    "Versterkt focusringen, verlengt tikvertraging en verbetert aanwijsfeedback voor patiënten die een trackball, joystick, AssistiveTouch-cursor of schakelaar gebruiken.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Extern aanwijsapparaat gedetecteerd.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Overweeg de Ondersteunde invoermodus in te schakelen voor deze patiënt.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Patiënten",
  "ui.provider.settings.patients.active_remove_hint":
    "Wissel eerst naar een andere patiënt voordat u deze verwijdert.",
  "ui.provider.settings.patients.remove_button": "Verwijderen",
  "ui.provider.settings.patients.add_patient": "+ Patiënt toevoegen",
  "ui.provider.settings.patients.remove_dialog.title":
    "{name} verwijderen?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Dit verwijdert het stemfragment, de gespreksgeschiedenis en de gecachte audio voor de stemkloon. Stemklonen van het zorgteam blijven beschikbaar voor andere patiënten. Dit kan niet ongedaan worden gemaakt.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Verwijderen",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Zorgteam",
  "ui.provider.settings.care_team.empty":
    "Er zijn nog geen zorgverleners toegevoegd.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading": "Patiëntinformatie",
  "ui.provider.settings.patient_info.name_label": "Naam",
  "ui.provider.settings.patient_info.bed_label": "Bed / Kamer",
  "ui.provider.settings.patient_info.language_label": "Taal",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Taal van de patiënt",
  "ui.provider.settings.lang.caregiver_section": "Taal van het zorgteam",
  "ui.provider.settings.lang.caregiver_helper":
    "De taal die uw zorgteam begrijpt. Wordt meestal eenmalig per apparaat ingesteld.",
  "ui.provider.settings.lang.change": "Taal wijzigen",

  "ui.provider.settings.lang.picker_title": "Kies taal",
  "ui.provider.settings.lang.patient_dialog.title":
    "Patiënttaal wijzigen naar {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Uw stemkloon blijft klaar — de zinnen die u tikt klinken nog steeds hetzelfde. We bereiden audio voor {providerCount} zorgteamstemmen voor (~{estimatedMinutes} min). U kunt de app blijven gebruiken terwijl dit gebeurt.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Stemklonen van het zorgteam zijn niet beschikbaar in {lang} — de systeemstem wordt in plaats daarvan gebruikt. Bestaande opnames worden bewaard voor het geval u later naar een ondersteunde taal overschakelt.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "De zinnen die u tikt klinken nog steeds hetzelfde. Er zijn geen zorgteamstemmen ingesteld, dus er hoeft niets opnieuw te worden gegenereerd.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Zorgteamtaal wijzigen naar {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Uw zorgteamstemklonen blijven klaar. We bereiden patiëntspraakaudio voor in de nieuwe taal (~{estimatedMinutes} min). U kunt de app blijven gebruiken terwijl dit gebeurt.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "De stemkloon van de patiënt is niet beschikbaar in {lang} — de systeemstem wordt in plaats daarvan gebruikt. Het opgenomen stemfragment van de patiënt wordt bewaard voor het geval u later naar een ondersteunde taal overschakelt.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Er is geen stemkloon van de patiënt ingesteld, dus er hoeft niets opnieuw te worden gegenereerd.",
  "ui.provider.settings.patient_info.voice_label": "Stem",
  "ui.provider.settings.patient_info.backup_voice_label": "Reservestem",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Systeemstem die wordt gebruikt terwijl de stemkloon wordt geladen. Tik om te beluisteren.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "App-diagnose",
  "ui.provider.settings.offline.status_description":
    "Status van de AI-modellen die de app op het apparaat gebruikt voor stemgeneratie, suggesties en spraakherkenning.",
  "ui.provider.settings.offline.downloading": "Modellen downloaden…",
  "ui.provider.settings.offline.download_progress_aria":
    "Downloadvoortgang modellen",
  "ui.provider.settings.offline.all_ready": "Alle modellen gereed",
  "ui.provider.settings.offline.redownload_button":
    "Modellen opnieuw downloaden",
  "ui.provider.settings.offline.already_up_to_date": "Al bijgewerkt",
  "ui.provider.settings.offline.checking": "Controleren…",
  "ui.provider.settings.offline.verified": "✓ Modellen geverifieerd",
  "ui.provider.settings.offline.check_button":
    "Bestaande modellen controleren",
  "ui.provider.settings.offline.redownloading": "Opnieuw downloaden…",
  "ui.provider.settings.offline.force_redownload_button":
    "Alle modellen geforceerd opnieuw downloaden",
  "ui.provider.settings.offline.model_status_ready": "gereed",
  "ui.provider.settings.offline.model_status_downloading":
    "downloaden…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "opnieuw proberen nodig",
  "ui.provider.settings.offline.last_verified_prefix":
    "Laatst geverifieerd: ",
  "ui.provider.settings.offline.storage_prefix": "Opslag: ",
  "ui.provider.settings.offline.storage_of": " van ",
  "ui.provider.settings.offline.storage_used": " gebruikt",
  "ui.provider.settings.offline.storage_low": " — bijna vol",
  "ui.provider.settings.offline.clear_audio_cache": "Audiocache wissen",
  "ui.provider.settings.offline.clearing": "Wissen…",
  "ui.provider.settings.offline.rebuilding":
    "Opnieuw opbouwen: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Alle AI-modellen opnieuw downloaden?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Hiermee wordt ongeveer 1,7 GB opnieuw opgehaald. Spraaksynthese blijft werken tijdens het verversen.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Opnieuw downloaden",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Andere patiënt",
  "ui.provider.switch.add_patient": "+ Patiënt toevoegen",
  "ui.provider.patients.title": "Patiënten",
  "ui.provider.patients.actions_aria": "Acties voor {name}",
  "ui.provider.patients.action_edit": "Bewerken",
  "ui.provider.patients.action_remove": "Verwijderen",
  "ui.provider.switch.voice_captured": "Stem vastgelegd",
  "ui.provider.switch.no_voice": "Geen stem",
  "ui.provider.switch.last_active_just_now": "Zojuist",
  "ui.provider.switch.last_active_minutes":
    "Laatst actief {n} min geleden",
  "ui.provider.switch.last_active_hours":
    "Laatst actief {n}u geleden",
  "ui.provider.switch.last_active_days":
    "Laatst actief {n}d geleden",
  "ui.provider.switch.currently_active": "Momenteel actief",
  "ui.provider.switch.switched_announcement":
    "Gewisseld naar {name}. {count} gespreksberichten.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Personeelssessie loopt af",
  "ui.provider.staff_session.warning_body":
    "Uw personeelstoegang wordt over {n} seconden vergrendeld.",
  "ui.provider.staff_session.extend": "Sessie verlengen",
  "ui.provider.staff_session.end_now": "Nu beëindigen",
  "ui.provider.nav.end_staff_session": "Personeelssessie beëindigen",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",
};

export default nl;
