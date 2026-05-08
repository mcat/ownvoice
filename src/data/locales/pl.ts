/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Polish
 * Locale: pl
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 *
 * ── Gender defaults ──────────────────────────────────────────────
 * Polish past-tense verbs, adjectives, and participles inflect for
 * gender (masc / fem / neut). For patient-spoken first-person text
 * this file defaults to MASCULINE forms (broadest intelligibility;
 * feminine patients will need a future gender toggle).
 *
 * Provider → patient address uses impersonal/infinitive constructions
 * where possible ("Jak samopoczucie?", "Proszę odpocząć"). Where
 * direct address is unavoidable, masculine forms are used by default.
 *
 * ── pain.sentence template ──────────────────────────────────────
 * Polish body-region words require locative case after "w" ("in"),
 * but {region} tokens come from nominative labels. The template is
 * therefore restructured as a clinical-report style:
 *   "Ból {descriptor}, okolica: {region}, natężenie {severity}/10"
 * This avoids declining the placeholder and reads naturally.
 *
 * ── wishes.compose template ─────────────────────────────────────
 * Polish copula for noun-to-noun identity is "to" (not "jest").
 * All wishes stems are phrased as noun phrases so they compose
 * cleanly with response lists: "{stem} to {list}."
 *
 * ── {plural} token ──────────────────────────────────────────────
 * Polish has 3-form pluralization (1 / 2-4 / 5+). The {plural}
 * token is a bare English "s" suffix and cannot express this.
 * Surrounding text is worded to minimise awkwardness; a proper
 * plural-rules system is a TODO.
 */
import type { LocaleStrings } from "./en";

const pl: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Tak",
  "quick.no": "Nie",
  "quick.thank_you": "Dziękuję",
  "quick.please_wait": "Proszę czekać",
  "quick.dont_understand": "Nie rozumiem",
  "quick.repeat": "Proszę powtórzyć",
  "quick.retract": "Źle to wyszło",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Potrzebuję wody",
  "needs.comfort.hungry": "Jestem głodny",
  "needs.comfort.cold": "Jest mi zimno",
  "needs.comfort.hot": "Jest mi gorąco",
  "needs.comfort.bed": "Proszę poprawić łóżko",
  "needs.comfort.bathroom": "Potrzebuję do toalety",
  "needs.comfort.hearing_aid": "Potrzebuję aparatu słuchowego",
  "needs.comfort.glasses": "Potrzebuję okularów",
  "needs.comfort.ice": "Potrzebuję kawałków lodu",
  "needs.comfort.pillow": "Proszę poprawić poduszkę",
  "needs.comfort.turn": "Proszę mnie przekręcić",
  "needs.comfort.sit_up": "Proszę pomóc mi usiąść",
  "needs.comfort.quiet": "Proszę o ciszę",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Potrzebuję leku",
  "needs.medical.suction": "Potrzebuję odsysania",
  "needs.medical.nauseous": "Mam mdłości",
  "needs.medical.breathe": "Trudno mi oddychać",
  "needs.medical.nurse": "Potrzebuję pielęgniarki",
  "needs.medical.doctor": "Potrzebuję lekarza",
  "needs.medical.call_light": "Potrzebuję pomocy natychmiast",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Chcę widzieć rodzinę",
  "needs.people.stay": "Czy ktoś może ze mną zostać?",
  "needs.people.call": "Chcę do kogoś zadzwonić",
  "needs.people.interpreter": "Potrzebuję tłumacza",
  "needs.people.respiratory_therapist": "Potrzebuję fizjoterapeuty oddechowego",
  "needs.people.speech_therapist": "Potrzebuję logopedy",

  // ── Patient needs: Hygiene ─────────────────────────────────────
  "needs.hygiene.back": "Proszę umyć mi plecy",
  "needs.hygiene.face": "Proszę umyć mi twarz",
  "needs.hygiene.feet": "Proszę umyć mi stopy",
  "needs.hygiene.hair": "Proszę umyć mi włosy",
  "needs.hygiene.hands": "Proszę umyć mi ręce",
  "needs.hygiene.mouth": "Pielęgnacja jamy ustnej",
  "needs.hygiene.nose": "Proszę wytrzeć mi nos",
  "needs.hygiene.teeth": "Proszę umyć mi zęby",
  "needs.hygiene.wound": "Proszę zmienić mi opatrunek",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Jestem zmęczony",
  "feelings.physical.uncomfortable": "Jest mi niewygodnie",
  "feelings.physical.weak": "Czuję się słabo",
  "feelings.physical.better": "Czuję się lepiej",
  "feelings.physical.dizzy": "Kręci mi się w głowie",
  "feelings.physical.itchy": "Coś mnie swędzi",
  "feelings.physical.wet": "Jestem mokry",
  "feelings.physical.gagging": "Mam odruch wymiotny",
  "feelings.physical.short_of_breath": "Brakuje mi tchu",
  "feelings.physical.nauseated": "Mam mdłości",
  "feelings.physical.worse": "Czuję się gorzej",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Boję się",
  "feelings.emotional.lonely": "Czuję się samotny",
  "feelings.emotional.frustrated": "Jestem sfrustrowany",
  "feelings.emotional.confused": "Jestem zdezorientowany",
  "feelings.emotional.safe": "Czuję się bezpiecznie",
  "feelings.emotional.grateful": "Jestem wdzięczny",
  "feelings.emotional.worried": "Martwię się",
  "feelings.emotional.hopeful": "Mam nadzieję",
  "feelings.emotional.bored": "Nudzę się",
  "feelings.emotional.embarrassed": "Jestem zawstydzony",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Która jest godzina?",
  "questions.day": "Jaki jest dzień?",
  "questions.whats_happening": "Co się ze mną dzieje?",
  "questions.go_home": "Kiedy mogę iść do domu?",
  "questions.next_medication": "Kiedy dostanę następny lek?",
  "questions.explain_treatment": "Czy mogą mi Państwo wyjaśnić leczenie?",
  "questions.nurse_today": "Kto jest dziś moją pielęgniarką?",
  "questions.eat_drink": "Czy mogę jeść lub pić?",
  "questions.see_family": "Kiedy mogę zobaczyć rodzinę?",
  "questions.extubation": "Kiedy wyjmą mi rurkę?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Bez bólu",
  "pain.face.2": "Boli trochę",
  "pain.face.4": "Boli nieco bardziej",
  "pain.face.6": "Boli jeszcze bardziej",
  "pain.face.8": "Boli bardzo mocno",
  "pain.face.10": "Ból najsilniejszy",

  // ── Pain: Descriptors ──────────────────────────────────────────
  // Masculine nominative adjectives agreeing with "ból" (masc noun).
  "pain.descriptor.aching": "Tępy",
  "pain.descriptor.burning": "Piekący",
  "pain.descriptor.sharp": "Kłujący",
  "pain.descriptor.throbbing": "Pulsujący",
  "pain.descriptor.cramping": "Kurczowy",
  "pain.descriptor.constant": "Stały",
  "pain.descriptor.comes_and_goes": "Przerywany",
  "pain.descriptor.numb": "Drętwiejący",
  "pain.descriptor.pressure": "Uciskowy",

  // ── Pain: Body regions ─────────────────────────────────────────
  // Nominative case — used both as standalone chips and inside
  // pain.sentence (clinical-report style avoids locative).
  "pain.region.head": "Głowa",
  "pain.region.face": "Twarz",
  "pain.region.neck": "Szyja",
  "pain.region.chest": "Klatka piersiowa",
  "pain.region.left_shoulder": "Lewy bark",
  "pain.region.right_shoulder": "Prawy bark",
  "pain.region.left_arm": "Lewa ręka",
  "pain.region.right_arm": "Prawa ręka",
  "pain.region.stomach": "Brzuch",
  "pain.region.upper_back": "Górna część pleców",
  "pain.region.lower_back": "Dolna część pleców",
  "pain.region.left_leg": "Lewa noga",
  "pain.region.right_leg": "Prawa noga",

  // ── Pain: Composed sentence template ───────────────────────────
  // Clinical-report style: avoids declining {region} placeholder.
  // {descriptor}, {region}, {severity} are substituted at runtime.
  "pain.sentence":
    "Ból {descriptor}, okolica: {region}, natężenie {severity} na 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Natężenie",
  "pain.step.location": "Lokalizacja",
  "pain.step.descriptor": "Opis",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Moje cele",
  "wishes.worries.label": "Moje obawy",
  "wishes.strength.label": "Moja siła",
  "wishes.joy.label": "Co daje mi radość",
  "wishes.tradeoffs.label": "O leczeniu",
  "wishes.family.label": "Moja rodzina",
  "wishes.hopes.label": "Moje nadzieje",

  // Questions
  "wishes.goals.question": "Jakie są najważniejsze cele?",
  "wishes.worries.question": "Jakie są największe obawy?",
  "wishes.strength.question": "Co daje siłę?",
  "wishes.joy.question": "Co daje radość i sens życia?",
  "wishes.tradeoffs.question":
    "Na ile jest gotowość poddać się leczeniu dla przedłużenia życia?",
  "wishes.family.question":
    "Ile bliscy wiedzą o życzeniach dotyczących opieki?",
  "wishes.hopes.question": "Jakie są nadzieje?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems compose with response lists using "to".
  // All stems are noun phrases so "{stem} to {list}." reads naturally.
  "wishes.goals.stem": "To, co dla mnie najważniejsze",
  "wishes.worries.stem": "Moja największa obawa",
  "wishes.strength.stem": "Źródło mojej siły",
  "wishes.joy.stem": "To, co daje mi radość",
  "wishes.tradeoffs.stem": "Moje zdanie o leczeniu",
  "wishes.family.stem": "Jeśli chodzi o moją rodzinę",
  "wishes.hopes.stem": "Moja nadzieja",

  // Responses — goals
  "wishes.goals.r.family": "Bycie z rodziną",
  "wishes.goals.r.comfort": "Wygoda i brak bólu",
  "wishes.goals.r.longevity": "Życie tak długo, jak to możliwe",
  "wishes.goals.r.home": "Powrót do domu",
  "wishes.goals.r.independence": "Samodzielność",
  "wishes.goals.r.peace": "Spokój",

  // Responses — worries
  "wishes.worries.r.suffering": "Cierpienie lub ból",
  "wishes.worries.r.alone": "Samotność",
  "wishes.worries.r.burden": "Bycie ciężarem dla rodziny",
  "wishes.worries.r.activities": "Brak możliwości robienia tego, co lubię",
  "wishes.worries.r.leaving": "Pozostawienie rodziny",
  "wishes.worries.r.unknown": "Niepewność, co będzie dalej",

  // Responses — strength
  "wishes.strength.r.family": "Moja rodzina",
  "wishes.strength.r.faith": "Moja wiara",
  "wishes.strength.r.friends": "Moi przyjaciele",
  "wishes.strength.r.wishes_heard": "Świadomość, że moje życzenia są znane",
  "wishes.strength.r.hope": "Nadzieja na wyzdrowienie",
  "wishes.strength.r.carers": "Ludzie, którzy się mną opiekują",

  // Responses — joy
  "wishes.joy.r.family": "Spędzanie czasu z rodziną",
  "wishes.joy.r.outdoors": "Przebywanie na świeżym powietrzu",
  "wishes.joy.r.hobbies": "Moje hobby i zainteresowania",
  "wishes.joy.r.helping": "Pomaganie innym",
  "wishes.joy.r.spiritual": "Moja praktyka duchowa",
  "wishes.joy.r.routines": "Proste codzienne czynności",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Chcę każdego możliwego leczenia",
  "wishes.tradeoffs.r.good_chance":
    "Chcę leczenia, jeśli ma duże szanse powodzenia",
  "wishes.tradeoffs.r.try_stop":
    "Chcę spróbować, ale przerwać, jeśli nie pomaga",
  "wishes.tradeoffs.r.comfortable": "Chcę się skupić na komforcie",
  "wishes.tradeoffs.r.think": "Potrzebuję więcej czasu do namysłu",
  "wishes.tradeoffs.r.family_first":
    "Muszę najpierw porozmawiać z rodziną",

  // Responses — family
  "wishes.family.r.know_well": "Dobrze znają moje życzenia",
  "wishes.family.r.know_some": "Znają niektóre moje życzenia",
  "wishes.family.r.not_talked": "Jeszcze o tym nie rozmawialiśmy",
  "wishes.family.r.need_help": "Potrzebuję pomocy, żeby im powiedzieć",
  "wishes.family.r.team_explain":
    "Chcę, żeby zespół opiekuńczy im wyjaśnił",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Wyzdrowienie",
  "wishes.hopes.r.go_home": "Powrót do domu",
  "wishes.hopes.r.comfortable": "Komfort",
  "wishes.hopes.r.family_ok": "Żeby moja rodzina była dobrze",
  "wishes.hopes.r.more_time": "Więcej czasu",
  "wishes.hopes.r.peace": "Spokój",

  // Wish sentence composition templates
  // TODO(translator): "to" is the Polish copula for noun-to-noun identity.
  // Verify all 7 stems + response lists compose naturally.
  "wishes.compose": "{stem} to {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  // Provider → patient: impersonal / infinitive constructions where
  // possible. Where direct address is needed, masculine default.
  "provider.responses.help": "Poproszę kogoś o pomoc.",
  "provider.responses.interpreter": "Poproszę tłumacza.",
  "provider.responses.family": "Zadzwonię do rodziny.",
  "provider.responses.get_that": "Zaraz to przyniosę.",
  "provider.responses.doctor_know": "Powiadomię lekarza.",
  "provider.responses.medication": "Przyniosę lek.",
  "provider.responses.family_coming": "Rodzina jest w drodze.",
  "provider.responses.doctor_soon": "Lekarz zaraz przyjdzie.",
  "provider.responses.doing_well": "Dobrze sobie Pan radzi.",
  "provider.responses.rest": "Proszę teraz odpocząć.",

  "provider.questions.feeling": "Jak samopoczucie?",
  "provider.questions.need": "Czy czegoś potrzeba?",
  "provider.questions.where_hurts":
    "Proszę pokazać, gdzie boli.",
  "provider.questions.rate_pain": "Proszę ocenić ból od 0 do 10.",
  "provider.questions.sleep": "Czy udało się dobrze wyspać?",
  "provider.questions.comfortable": "Czy jest wygodnie?",

  "provider.directions.procedure":
    "Zabieg jest zaplanowany na dziś.",
  "provider.directions.stay_in_bed": "Proszę zostać w łóżku.",
  "provider.directions.vitals": "Zmierzę teraz parametry życiowe.",
  "provider.directions.medication_time": "Pora na lek.",
  "provider.directions.breathe": "Proszę głęboko oddychać.",
  "provider.directions.call_button":
    "Proszę nacisnąć przycisk, jeśli cokolwiek potrzeba.",

  "provider.goals_of_care.matters_most":
    "Chciałbym porozmawiać o tym, co jest najważniejsze.",
  "provider.goals_of_care.goals":
    "Jakie są teraz najważniejsze cele?",
  "provider.goals_of_care.worries":
    "Jakie są największe obawy?",
  "provider.goals_of_care.strength": "Co daje siłę?",
  "provider.goals_of_care.joy":
    "Co daje radość i sens życia?",
  "provider.goals_of_care.wishes":
    "Ile bliscy wiedzą o życzeniach dotyczących opieki?",
  "provider.goals_of_care.hopes": "Jakie są nadzieje?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Dobrze spałem",
  "time.morning.didnt_sleep": "Źle spałem",
  "time.morning.breakfast": "Potrzebuję śniadania",
  "time.morning.doctor_coming": "Kiedy przyjdzie lekarz?",

  "time.afternoon.tired": "Jestem zmęczony",
  "time.afternoon.lunch": "Czy mogę dostać obiad?",
  "time.afternoon.see_family": "Kiedy mogę zobaczyć rodzinę?",
  "time.afternoon.rest": "Muszę odpocząć",

  "time.evening.cant_sleep": "Nie mogę zasnąć",
  "time.evening.medication": "Potrzebuję leku",
  "time.evening.call_family": "Czy mogę zadzwonić do rodziny?",
  "time.evening.pain": "Boli mnie",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Polish verb conjugation and case agreement may not compose
  // cleanly in all paths — review each builder path.
  "suggest.start.i_am": "Jestem",
  "suggest.start.i_feel": "Czuję się",
  "suggest.start.i_want": "Chcę",
  "suggest.start.i_need": "Potrzebuję",
  "suggest.start.please": "Proszę",
  "suggest.start.when": "Kiedy",
  "suggest.start.can_you": "Czy mogą",
  "suggest.start.tell_me": "Proszę powiedzieć",

  "suggest.i_am.in_pain": "mam ból",
  "suggest.i_am.cold": "mi zimno",
  "suggest.i_am.hot": "mi gorąco",
  "suggest.i_am.hungry": "głodny",
  "suggest.i_am.thirsty": "spragniony",
  "suggest.i_am.tired": "zmęczony",
  "suggest.i_am.uncomfortable": "mi niewygodnie",
  "suggest.i_am.okay": "w porządku",
  "suggest.i_am.not_okay": "niedobrze",
  "suggest.i_am.ready": "gotowy",

  "suggest.i_feel.scared": "przestraszony",
  "suggest.i_feel.sick": "chory",
  "suggest.i_feel.dizzy": "oszołomiony",
  "suggest.i_feel.weak": "słabo",
  "suggest.i_feel.better": "lepiej",
  "suggest.i_feel.worse": "gorzej",
  "suggest.i_feel.nauseous": "mam mdłości",
  "suggest.i_feel.lonely": "samotny",
  "suggest.i_feel.confused": "zdezorientowany",
  "suggest.i_feel.safe": "bezpiecznie",

  "suggest.i_feel_scared.procedure": "przed zabiegiem",
  "suggest.i_feel_scared.happening": "z powodu tego, co się dzieje",
  "suggest.i_feel_scared.alone": "że zostanę sam",
  "suggest.i_feel_scared.need_someone": "i potrzebuję kogoś",

  "suggest.i_feel_sick.stomach": "na żołądek",
  "suggest.i_feel_sick.dizzy": "i kręci mi się w głowie",
  "suggest.i_feel_sick.help": "i potrzebuję pomocy",

  "suggest.i_want.water": "wody",
  "suggest.i_want.family": "zobaczyć rodzinę",
  "suggest.i_want.go_home": "iść do domu",
  "suggest.i_want.sleep": "spać",
  "suggest.i_want.medication": "lek",
  "suggest.i_want.blanket": "koc",
  "suggest.i_want.talk": "z kimś porozmawiać",
  "suggest.i_want.nurse": "pielęgniarkę",

  "suggest.i_want_to_go.home": "do domu",
  "suggest.i_want_to_go.sleep": "spać",
  "suggest.i_want_to_go.bathroom": "do toalety",

  "suggest.i_want_my.family": "rodzinę",
  "suggest.i_want_my.medication": "lek",
  "suggest.i_want_my.phone": "telefon",
  "suggest.i_want_my.glasses": "okulary",
  "suggest.i_want_my.blanket": "koc",

  "suggest.i_need.help": "pomocy",
  "suggest.i_need.water": "wody",
  "suggest.i_need.bathroom": "do toalety",
  "suggest.i_need.medication": "leku",
  "suggest.i_need.nurse": "pielęgniarki",
  "suggest.i_need.doctor": "lekarza",
  "suggest.i_need.rest": "odpoczynku",
  "suggest.i_need.blanket": "koca",
  "suggest.i_need.suction": "odsysania",

  "suggest.i_need_the.nurse": "pielęgniarkę",
  "suggest.i_need_the.doctor": "lekarza",
  "suggest.i_need_the.bathroom": "toaletę",
  "suggest.i_need_the.light_off": "wyłączyć światło",
  "suggest.i_need_the.light_on": "włączyć światło",

  "suggest.i_need_my.medication": "lek",
  "suggest.i_need_my.family": "rodzinę",
  "suggest.i_need_my.glasses": "okulary",
  "suggest.i_need_my.phone": "telefon",

  "suggest.please.help_me": "pomóżcie mi",
  "suggest.please.call_family": "zadzwońcie do rodziny",
  "suggest.please.light_off": "wyłączcie światło",
  "suggest.please.adjust_bed": "poprawcie łóżko",
  "suggest.please.give_me": "dajcie mi",
  "suggest.please.explain": "wyjaśnijcie",
  "suggest.please.come_back": "wróćcie niedługo",
  "suggest.please.stay": "zostańcie ze mną",
  "suggest.please.dont_leave": "nie wychodźcie",

  "suggest.please_help_me.pain": "Boli mnie",
  "suggest.please_help_me.breathe": "Nie mogę oddychać",
  "suggest.please_help_me.sick": "Jest mi niedobrze",
  "suggest.please_help_me.scared": "Boję się",

  "suggest.please_give_me.water": "wody",
  "suggest.please_give_me.medication": "lek",
  "suggest.please_give_me.blanket": "koc",
  "suggest.please_give_me.pain_relief": "coś na ból",

  "suggest.when.go_home": "mogę iść do domu?",
  "suggest.when.family": "przyjdzie rodzina?",
  "suggest.when.medication": "dostanę następny lek?",
  "suggest.when.doctor": "przyjdzie lekarz?",
  "suggest.when.eat": "mogę jeść?",
  "suggest.when.over": "to się skończy?",

  "suggest.can_you.help": "mi pomóc?",
  "suggest.can_you.call_family": "zadzwonić do rodziny?",
  "suggest.can_you.get_nurse": "poprosić pielęgniarkę?",
  "suggest.can_you.explain": "wyjaśnić, co się dzieje?",
  "suggest.can_you.light_off": "wyłączyć światło?",
  "suggest.can_you.adjust_bed": "poprawić łóżko?",
  "suggest.can_you.stay": "zostać ze mną?",

  "suggest.tell_me.happening": "co się dzieje",
  "suggest.tell_me.time": "która godzina",
  "suggest.tell_me.go_home": "kiedy mogę iść do domu",
  "suggest.tell_me.day": "jaki jest dzień",
  "suggest.tell_me.treatment": "o moim leczeniu",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "proszę pomóżcie",
  "suggest.i_am_in_pain.worse": "i jest coraz gorzej",
  "suggest.i_am_in_pain.medication": "i potrzebuję leku",
  "suggest.i_am_in_pain.back": "w plecach",
  "suggest.i_am_in_pain.chest": "w klatce piersiowej",
  "suggest.i_am_in_pain.stomach": "w brzuchu",

  // After "I need help"
  "suggest.i_need_help.up": "przy wstawaniu",
  "suggest.i_need_help.breathing": "z oddychaniem",
  "suggest.i_need_help.pain": "z bólem",
  "suggest.i_need_help.now": "natychmiast",
  "suggest.i_need_help.please": "proszę",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "niż wcześniej",
  "suggest.i_feel_better.now": "teraz",
  "suggest.i_feel_better.thanks": "dziękuję",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "niż wcześniej",
  "suggest.i_feel_worse.need_doctor": "Potrzebuję lekarza",
  "suggest.i_feel_worse.help": "proszę pomóżcie",
  "suggest.i_feel_worse.medication": "Potrzebuję leku",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "Czuję się",
  "suggest.ctx.feeling.i_am": "Jestem",
  "suggest.ctx.feeling.better": "Lepiej niż wcześniej",
  "suggest.ctx.feeling.not_great": "Niezbyt dobrze",
  "suggest.ctx.feeling.pain": "Boli mnie",
  "suggest.ctx.feeling.okay": "Jest w porządku",
  "suggest.ctx.feeling.help": "Czy mogą mi pomóc?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "Potrzebuję",
  "suggest.ctx.need.i_want": "Chcę",
  "suggest.ctx.need.fine": "Na razie nie potrzebuję niczego",
  "suggest.ctx.need.yes": "Tak, proszę",
  "suggest.ctx.need.no": "Nie, dziękuję",
  "suggest.ctx.need.stay": "Czy ktoś może zostać?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "Głowa",
  "suggest.ctx.where_hurts.chest": "Klatka piersiowa",
  "suggest.ctx.where_hurts.stomach": "Brzuch",
  "suggest.ctx.where_hurts.back": "Plecy",
  "suggest.ctx.where_hurts.left_arm": "Lewa ręka",
  "suggest.ctx.where_hurts.right_leg": "Prawa noga",
  "suggest.ctx.where_hurts.everywhere": "Wszędzie",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "Bardzo mocno boli",
  "suggest.ctx.pain.worse": "Jest coraz gorzej",
  "suggest.ctx.pain.same": "Tak samo jak wcześniej",
  "suggest.ctx.pain.little_better": "Trochę lepiej",
  "suggest.ctx.pain.need_relief": "Potrzebuję czegoś na ból",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "Jest mi wygodnie",
  "suggest.ctx.comfort.not_comfortable": "Jest mi niewygodnie",
  "suggest.ctx.comfort.cant_sleep": "Nie mogę zasnąć",
  "suggest.ctx.comfort.cold": "Jest mi zimno",
  "suggest.ctx.comfort.hot": "Jest mi gorąco",
  "suggest.ctx.comfort.adjust_bed": "Czy mogą poprawić łóżko?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "Nie mogę zasnąć",
  "suggest.ctx.night.i_need": "Potrzebuję",
  "suggest.ctx.night.pain": "Boli mnie",
  "suggest.ctx.night.i_feel": "Czuję się",
  "suggest.ctx.night.can_you": "Czy mogą",
  "suggest.ctx.night.please": "Proszę",
  "suggest.ctx.night.i_am": "Jestem",
  "suggest.ctx.night.when": "Kiedy",

  // Morning starters
  "suggest.ctx.morning.i_am": "Jestem",
  "suggest.ctx.morning.i_need": "Potrzebuję",
  "suggest.ctx.morning.i_feel": "Czuję się",
  "suggest.ctx.morning.doctor": "Kiedy przyjdzie lekarz?",
  "suggest.ctx.morning.i_want": "Chcę",
  "suggest.ctx.morning.can_you": "Czy mogą",
  "suggest.ctx.morning.please": "Proszę",
  "suggest.ctx.morning.tell_me": "Proszę powiedzieć",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Szybkie",
  "cat.needs": "Potrzebuję",
  "cat.feelings": "Czuję",
  "cat.pain": "Ból",
  "cat.questions": "Pytania",
  "sub.comfort": "Komfort",
  "sub.medical": "Medyczne",
  "sub.people": "Ludzie",
  "sub.hygiene": "Higiena",
  "sub.physical": "Fizyczne",
  "sub.emotional": "Emocjonalne",

  // Provider category labels
  "provider.cat.responses": "Odpowiedzi",
  "provider.cat.questions": "Pytania",
  "provider.cat.directions": "Polecenia",
  "provider.cat.goals_of_care": "Cele opieki",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — rozmowa {name}",
  "ui.patient.app.name_fallback": "Pacjent",
  "ui.patient.header.name_fallback": "Pacjent",
  "ui.patient.header.bed_prefix": "Łóżko ",
  "ui.dual.nav.wishes": "Życzenia",
  "ui.dual.nav.listen": "Słuchaj",
  "ui.provider.nav.staff": "Personel",
  "ui.provider.nav.switch_patient": "Zmień pacjenta",
  "ui.provider.nav.settings": "Ustawienia",
  "ui.provider.nav.theme.auto": "Automatyczny",
  "ui.provider.nav.theme.light": "Jasny",
  "ui.provider.nav.theme.dark": "Ciemny",
  "ui.patient.tabbar.say_more": "Powiedz więcej",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Jak silny jest ból?",
  "ui.dual.pain.heading.location": "Gdzie boli?",
  "ui.dual.pain.heading.descriptor": "Jaki jest charakter bólu?",
  "ui.patient.pain.step_of": "Krok {n} z {total}",
  "ui.patient.pain.back_to": "Wróć do {label}",
  "ui.patient.pain.level_aria": "Poziom bólu {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Życzenia — {name}",
  "ui.patient.wishes.my_wishes": "Moje życzenia",
  "ui.patient.wishes.step_of": "Krok {n} z {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Nie udostępniono żadnych życzeń.",
  "ui.patient.wishes.share_all_again": "Udostępnij wszystkie życzenia ponownie",
  "ui.patient.wishes.close": "Zamknij",
  "ui.patient.wishes.share": "Udostępnij",
  "ui.patient.wishes.skip": "Pomiń",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Dotknij słów poniżej lub pisz...",
  "ui.patient.builder.message_aria": "Wiadomość",
  "ui.patient.builder.undo": "Cofnij ostatnie słowo",
  "ui.patient.builder.clear": "Wyczyść wiadomość",
  "ui.patient.builder.refresh_ai": "Odśwież propozycje AI",
  "ui.patient.builder.ai_thinking": "AI myśli...",
  "ui.patient.builder.no_ai_suggestions":
    "Brak propozycji AI. Dotknij Odśwież, aby spróbować ponownie.",
  "ui.patient.builder.ready":
    "Wiadomość jest gotowa. Dotknij Mów, aby wysłać.",
  "ui.patient.builder.speak": "Mów",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Powtórz: {text}",
  "ui.dual.thread.aria_label": "Conversation",
  "ui.dual.thread.scroll_up_aria": "Przewiń rozmowę w górę",
  "ui.dual.thread.scroll_down_aria": "Przewiń rozmowę w dół",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Zespół opiekuńczy",
  "ui.provider.fallback_name": "Opiekun",
  "ui.provider.speaking_to": "Mówi do {name} jako {prov}",
  "ui.provider.patient_fallback": "pacjent",
  "ui.provider.close_panel": "Zamknij panel",
  "ui.provider.select_provider": "Wybierz {name}",
  "ui.provider.show_category": "Pokaż {key}",
  "ui.provider.speak_phrase": "Powiedz: {phrase}",
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
  "ui.provider.listen.title": "Słuchaj",
  "ui.provider.listen.stop_aria": "Przestań słuchać",
  "ui.provider.listen.start_aria": "Dotknij, aby zacząć słuchać",
  "ui.provider.listen.listening": "Słucham...",
  "ui.provider.listen.transcribing": "Transkrybuję...",
  "ui.provider.listen.listening_placeholder": "Nasłuchiwanie mowy...",
  "ui.provider.listen.transcribing_placeholder": "Transkrypcja mowy...",
  "ui.provider.listen.type_placeholder": "Lub wpisz, co powiedziano...",
  "ui.provider.listen.transcript_aria": "Transkrypcja",
  "ui.provider.listen.audio_level_aria": "Poziom dźwięku mikrofonu",
  "ui.provider.listen.add_as": "Dodaj do rozmowy jako {prov}",
  "ui.provider.listen.privacy_notice":
    "Na urządzeniu · Whisper · żaden dźwięk nie opuszcza tego urządzenia",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Mówi: {text}",
  "ui.dual.speaking.patient_voice": "Twój głos",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Podaj PIN",
  "ui.provider.pin_gate.subtitle": "Tylko dla personelu",
  "ui.provider.pin_gate.incorrect": "Błędny PIN",
  "ui.provider.pin_gate.delete_aria": "Usuń",
  "ui.provider.pin_gate.digit_aria": "Cyfra {n}",
  "ui.provider.pin_gate.cancel": "Anuluj",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Za chwilę przeczytasz zdanie na głos.",
  "ui.provider.voice_capture.coaching_breath":
    "Weź kilka głębokich oddechów.",
  "ui.provider.voice_capture.coaching_ready": "Gotowe.",
  "ui.provider.voice_capture.breathe_in": "Wdech…",
  "ui.provider.voice_capture.breathe_out": "Wydech…",
  "ui.provider.voice_capture.creating": "Tworzę klon głosu...",
  "ui.provider.voice_capture.creating_from_sample":
    "Tworzę klon głosu z próbki...",
  "ui.provider.voice_capture.loading_model":
    "Ładowanie modelu głosu...",
  "ui.provider.voice_capture.clone_failed": "Klonowanie nie powiodło się",
  "ui.provider.voice_capture.captured": "Głos przechwycony",
  "ui.provider.voice_capture.stop": "Zatrzymaj",
  "ui.provider.voice_capture.play": "Odtwórz",
  "ui.provider.voice_capture.discard": "Odrzuć nagranie",
  "ui.provider.voice_capture.use_recording": "Użyj tego nagrania",
  "ui.provider.voice_capture.upload_file": "Prześlij plik",
  "ui.provider.voice_capture.record": "Nagraj",
  "ui.provider.voice_capture.stop_early": "Zatrzymaj wcześniej",
  "ui.provider.voice_capture.remove": "Usuń",
  "ui.provider.voice_capture.retry": "Ponów",
  "ui.provider.voice_capture.done": "Gotowe!",
  "ui.provider.voice_capture.cancel": "Anuluj",
  "ui.provider.voice_capture.seconds_recorded": "{n}s nagrano",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Anuluj odliczanie do nagrania",
  "ui.provider.voice_capture.stop_early_aria":
    "Zatrzymaj nagrywanie wcześniej",
  "ui.provider.voice_capture.audio_level_aria": "Poziom dźwięku",
  "ui.provider.voice_capture.recording_progress_aria":
    "Postęp nagrywania",
  "ui.provider.voice_capture.stop_preview_aria":
    "Zatrzymaj podgląd odtwarzania",
  "ui.provider.voice_capture.play_preview_aria":
    "Odtwórz podgląd nagrania",
  "ui.provider.voice_capture.discard_aria":
    "Odrzuć to nagranie i zacznij od nowa",
  "ui.provider.voice_capture.stop_playback_aria":
    "Zatrzymaj odtwarzanie próbki głosu",
  "ui.provider.voice_capture.play_sample_aria":
    "Odtwórz próbkę nagranego głosu",
  "ui.provider.voice_capture.remove_aria": "Usuń próbkę głosu",
  "ui.provider.voice_capture.retry_aria":
    "Ponów ekstrakcję klonu głosu",
  "ui.provider.voice_capture.upload_aria":
    "Prześlij próbkę głosu z pliku",
  "ui.provider.voice_capture.record_aria":
    "Nagraj próbkę głosu z mikrofonu",
  "ui.provider.voice_capture.err_network":
    "Nie udało się połączyć z modelem głosu. Sprawdź połączenie i dotknij Ponów.",
  "ui.provider.voice_capture.err_timeout":
    "Przetwarzanie głosu trwało za długo. Dotknij Ponów, aby spróbować ponownie.",
  "ui.provider.voice_capture.err_mic_denied":
    "Dostęp do mikrofonu jest zablokowany. Włącz go w ustawieniach przeglądarki lub prześlij plik.",
  "ui.provider.voice_capture.err_generic":
    "Nie udało się przygotować głosu. Dotknij Ponów, aby spróbować ponownie.",
  "ui.provider.voice_capture.err_too_short":
    "Nagranie było zbyt krótkie. Mów przez cały czas odliczania, a potem dotknij Ponów.",
  "ui.provider.voice_capture.err_too_noisy":
    "Hałas w tle był zbyt głośny, by uzyskać czysty klon głosu. Przejdź w cichsze miejsce i dotknij Ponów.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Dostęp do mikrofonu odrzucony. Spróbuj przesłać plik.",
  "ui.provider.voice_capture.err_playback":
    "Nie udało się odtworzyć dźwięku.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Ulepszona",
  "ui.provider.fallback_voice.enhanced_aria": "Ulepszona głos neuronowy",
  "ui.provider.fallback_voice.on_device_badge": "Na urządzeniu",
  "ui.provider.fallback_voice.playing": "Odtwarzam...",
  "ui.provider.fallback_voice.unavailable":
    "Głosy systemowe nie są dostępne na tym urządzeniu.",
  "ui.provider.fallback_voice.loading":
    "Ładowanie dostępnych głosów...",
  "ui.provider.fallback_voice.hide_others": "Ukryj pozostałe głosy",
  "ui.provider.fallback_voice.more_voices": "Więcej głosów ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Pacjent",
  "ui.provider.setup.steps.voice": "Głos",
  "ui.provider.setup.steps.care_team": "Zespół",
  "ui.provider.setup.steps.confirm": "Potwierdź",

  "ui.provider.setup.skip": "Pomiń →",
  "ui.provider.setup.skip_aria": "Pomiń konfigurację",
  "ui.provider.setup.skip_dialog.title": "Pominąć konfigurację?",
  "ui.provider.setup.skip_dialog.body": "Zacznij używać OwnVoice teraz. Konfigurację możesz dokończyć później, dotykając imienia pacjenta w nagłówku.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Żaden pacjent nie zostanie dodany.",
  "ui.provider.setup.skip_dialog.confirm": "Pomiń konfigurację",
  "ui.provider.setup.skip_dialog.cancel": "Kontynuuj",

  "ui.provider.setup.back": "Wstecz",
  "ui.provider.setup.continue": "Dalej",
  "ui.provider.setup.start": "Uruchom OwnVoice",

  "ui.provider.setup.step0.heading": "Witamy w OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Skonfigurujemy tablicę komunikacyjną. Wszystko pozostaje na tym urządzeniu.",
  "ui.provider.setup.step0.name_label": "Imię pacjenta",
  "ui.provider.setup.step0.name_placeholder":
    "Imię lub preferowane zwrócenie",
  "ui.provider.setup.step0.bed_label": "Łóżko / Sala",
  "ui.provider.setup.step0.bed_placeholder": "np. 4B-12",
  "ui.provider.setup.step0.language_label": "Język",

  "ui.provider.setup.step1.heading": "Próbka głosu",
  "ui.provider.setup.step1.body1":
    "Przechwycenie próbki głosu pozwoli OwnVoice mówić głosem pacjenta. Ten krok jest opcjonalny.",
  "ui.provider.setup.step1.body2":
    "Klonowanie głosu odbywa się całkowicie na urządzeniu. Żadne nagranie nie opuszcza tego tabletu.",
  "ui.provider.setup.step1.patient_label": "Pacjent",
  "ui.provider.setup.step1.backup_voice_heading": "Głos zapasowy",
  "ui.provider.setup.step1.backup_voice_body1":
    "Wybierz głos systemowy używany podczas ładowania klonu głosu lub gdy nie nagrano próbki. Dotknij głosu, aby odsłuchać.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Korzysta z wbudowanej syntezy mowy urządzenia.",

  "ui.provider.setup.step2.heading": "Zespół opiekuńczy",
  "ui.provider.setup.step2.body":
    "Dodaj osoby, które będą opiekować się tym pacjentem.",
  "ui.provider.setup.step2.icon_label": "Ikona",
  "ui.provider.setup.step2.name_label": "Imię",
  "ui.provider.setup.step2.name_placeholder":
    "Dr Kowalski, piel. Anna...",
  "ui.provider.setup.step2.add": "Dodaj",

  "ui.provider.setup.step3.heading": "Gotowe do uruchomienia",
  "ui.provider.setup.step3.body":
    "Sprawdź konfigurację. Wszystko można zmienić później w Ustawieniach.",
  "ui.provider.setup.step3.summary.patient": "Pacjent",
  "ui.provider.setup.step3.summary.bed": "Łóżko / Sala",
  "ui.provider.setup.step3.summary.language": "Język",
  "ui.provider.setup.step3.summary.language_default": "Polski",
  "ui.provider.setup.step3.summary.voice": "Głos",
  "ui.provider.setup.step3.summary.care_team": "Zespół opiekuńczy",
  "ui.provider.setup.step3.summary.not_set": "Nie ustawiono",
  "ui.provider.setup.step3.summary.captured": "Przechwycony",
  "ui.provider.setup.step3.summary.not_captured": "Nie przechwycony",
  "ui.provider.setup.step3.summary.none_added": "Nie dodano nikogo",
  "ui.provider.setup.step3.pin_label": "PIN personelu (opcjonalnie)",
  "ui.provider.setup.step3.pin_body":
    "Ustaw 4-cyfrowy PIN, aby chronić ustawienia personelu.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Ustawienia",
  "ui.provider.settings.done": "Gotowe",
  "ui.provider.settings.close_aria": "Zamknij ustawienia",

  "ui.provider.patient_edit.title": "Edytuj {name}",
  "ui.provider.patient_edit.title_default": "Edytuj pacjenta",
  "ui.provider.patient_edit.close_aria": "Zamknij edytor pacjenta",
  "ui.provider.patient_pill.aria": "Edytuj pacjenta: {name}",
  "ui.provider.nav.staff_menu": "Ustawienia",
  "ui.provider.staff_sheet.title": "Personel",
  "ui.provider.staff_sheet.close_aria": "Zamknij menu personelu",
  "ui.provider.staff_sheet.patients_description": "Zmień, dodaj lub edytuj pacjentów",
  "ui.provider.staff_sheet.settings_description": "Zespół opiekuńczy, dostępność, offline",
  "ui.provider.staff_sheet.end_session_description": "Wyjdź z trybu personelu",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Odrzucić przygotowanie głosu {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "Postęp ({current} / {total} fraz) zostanie utracony. Nagrana próbka głosu jest zachowana — przygotowanie można wznowić później.",
  "ui.provider.settings.voice_cache.cancel": "Anuluj",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Anuluj i zachowaj przygotowanie głosu",
  "ui.provider.settings.voice_cache.discard_confirm": "Odrzuć",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Potwierdź odrzucenie przygotowania głosu",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Odrzuć przygotowanie głosu {label}",
  // TODO(translator): {plural} is an English "s" suffix; Polish has 3-form plurals.
  "ui.provider.settings.voice_cache.queued":
    "W kolejce — głos {label} zostanie przygotowany ({total} fraz{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Przygotowywanie głosu {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Wstrzymano — głos {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Wznów",
  "ui.provider.settings.voice_cache.resume_aria":
    "Wznów przygotowywanie głosu {label}",
  "ui.provider.settings.voice_cache.pause": "Wstrzymaj",
  "ui.provider.settings.voice_cache.pause_aria":
    "Wstrzymaj przygotowywanie głosu {label}",
  "ui.provider.settings.voice_cache.done":
    "Klon głosu aktywny — wszystkie {total} frazy gotowe w głosie {label}",
  // TODO(translator): {plural} is an English "s" suffix; Polish has 3-form plurals.
  "ui.provider.settings.voice_cache.failed":
    "{count} fraz{plural} nie powiodło się dla {label}",
  "ui.provider.settings.voice_cache.retry": "Ponów",
  "ui.provider.settings.voice_cache.retry_aria":
    "Ponów nieudane frazy z pamięci podręcznej głosu",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "O aplikacji",
  "ui.provider.settings.about.subtitle":
    "Pomoc komunikacyjna AAC dla pacjentów szpitalnych.",
  "ui.provider.settings.about.attribution_1":
    "Skala bólu: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Cele opieki: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Pamięć podręczna SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Resetuj",
  "ui.provider.settings.reset.action_label":
    "Resetuj aplikację dla nowego pacjenta",
  "ui.provider.settings.reset.confirm_title": "Czy na pewno?",
  "ui.provider.settings.reset.confirm_body":
    "To usunie wszystkie dane pacjenta, próbki głosu, historię rozmów i ustawienia personelu. Tej operacji nie da się cofnąć.",
  "ui.provider.settings.reset.confirm_destructive": "Resetuj wszystko",
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
  "ui.provider.settings.accessibility.heading": "Dostępność",
  "ui.provider.settings.accessibility.toggle_label":
    "Tryb wspomaganego wprowadzania",
  "ui.provider.settings.accessibility.toggle_description":
    "Wzmacnia obramowania fokusa, wydłuża czas reakcji na dotyk i poprawia feedback dla pacjentów korzystających z trackballa, joysticka, kursora AssistiveTouch lub przełącznika.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Wykryto zewnętrzny wskaźnik.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Rozważ włączenie Trybu wspomaganego wprowadzania dla tego pacjenta.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Pacjenci",
  "ui.provider.settings.patients.active_remove_hint":
    "Przełącz na innego pacjenta, aby móc usunąć tego.",
  "ui.provider.settings.patients.remove_button": "Usuń",
  "ui.provider.settings.patients.add_patient": "+ Dodaj pacjenta",
  "ui.provider.settings.patients.remove_dialog.title":
    "Usunąć {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "To usunie próbkę głosu, historię rozmów i zbuforowany dźwięk klonu głosu. Klony głosów zespołu opiekuńczego są zachowane dla innych pacjentów. Tej operacji nie da się cofnąć.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Usuń",
  "ui.provider.settings.patients.active_discharge_hint":
    "Przełącz na innego pacjenta, aby móc wypisać tego.",
  "ui.provider.settings.patients.discharge_dialog.title": "Wypisać {name}?",
  "ui.provider.settings.patients.discharge_dialog.body":
    "Spowoduje to usunięcie wszystkich rozmów, pamięci podręcznej audio i wpisów dziennika aktywności. Tej operacji nie da się cofnąć.",
  "ui.provider.settings.patients.discharge_dialog.confirm": "Wypisz",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Zespół opiekuńczy",
  "ui.provider.settings.care_team.empty":
    "Nie dodano jeszcze żadnych opiekunów.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Informacje o pacjencie",
  "ui.provider.settings.patient_info.name_label": "Imię",
  "ui.provider.settings.patient_info.bed_label": "Łóżko / Sala",
  "ui.provider.settings.patient_info.language_label": "Język",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Język pacjenta",
  "ui.provider.settings.lang.caregiver_section":
    "Język zespołu opiekuńczego",
  "ui.provider.settings.lang.caregiver_helper":
    "Język, który rozumie zespół opiekuńczy. Zazwyczaj ustawiany raz na urządzenie.",
  "ui.provider.settings.lang.change": "Zmień język",

  "ui.provider.settings.lang.picker_title": "Wybierz język",
  "ui.provider.settings.lang.patient_dialog.title":
    "Zmienić język pacjenta na {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Klon głosu pozostaje gotowy — frazy nadal brzmią tak samo. Przygotujemy dźwięk dla {providerCount} głosów zespołu (~{estimatedMinutes} min). Aplikacja działa w tym czasie normalnie.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Klony głosów zespołu opiekuńczego nie są dostępne w języku {lang} — będzie używany głos systemowy. Istniejące nagrania są zachowane na wypadek przełączenia na obsługiwany język.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Frazy nadal brzmią tak samo. Brak skonfigurowanych głosów zespołu — nic nie wymaga ponownego generowania.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Zmienić język zespołu opiekuńczego na {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Klony głosów zespołu pozostają gotowe. Przygotujemy dźwięk głosu pacjenta w nowym języku (~{estimatedMinutes} min). Aplikacja działa w tym czasie normalnie.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Klon głosu pacjenta nie jest dostępny w języku {lang} — będzie używany głos systemowy. Nagrana próbka głosu pacjenta jest zachowana na wypadek przełączenia na obsługiwany język.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Brak skonfigurowanego klonu głosu pacjenta — nic nie wymaga ponownego generowania.",
  "ui.provider.settings.patient_info.voice_label": "Głos",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Głos zapasowy",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Głos systemowy używany podczas ładowania klonu głosu. Dotknij, aby odsłuchać.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.activity_log.heading": "Dziennik aktywności",
  "ui.provider.settings.activity_log.description":
    "Zdarzenia mowy, eksportu i systemu rejestrowane na tym urządzeniu.",
  "ui.provider.settings.offline.heading": "Diagnostyka aplikacji",
  "ui.provider.settings.offline.status_description":
    "Stan modeli AI używanych lokalnie na urządzeniu do generowania głosu, sugestii i rozpoznawania mowy.",
  "ui.provider.settings.offline.downloading":
    "Pobieranie modeli…",
  "ui.provider.settings.offline.download_progress_aria":
    "Postęp pobierania modeli",
  "ui.provider.settings.offline.all_ready":
    "Wszystkie modele gotowe",
  "ui.provider.settings.offline.redownload_button":
    "Pobierz modele ponownie",
  "ui.provider.settings.offline.already_up_to_date":
    "Już aktualne",
  "ui.provider.settings.offline.checking": "Sprawdzanie…",
  "ui.provider.settings.offline.verified": "✓ Modele zweryfikowane",
  "ui.provider.settings.offline.check_button":
    "Sprawdź istniejące modele",
  "ui.provider.settings.offline.redownloading":
    "Ponowne pobieranie…",
  "ui.provider.settings.offline.force_redownload_button":
    "Wymuś ponowne pobranie wszystkich modeli",
  "ui.provider.settings.offline.model_status_ready": "gotowy",
  "ui.provider.settings.offline.model_status_downloading":
    "pobieranie…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "wymaga ponowienia",
  "ui.provider.settings.offline.last_verified_prefix":
    "Ostatnia weryfikacja: ",
  "ui.provider.settings.offline.storage_prefix": "Pamięć: ",
  "ui.provider.settings.offline.storage_of": " z ",
  "ui.provider.settings.offline.storage_used": " użyte",
  "ui.provider.settings.offline.storage_low": " — mało miejsca",
  "ui.provider.settings.offline.clear_audio_cache":
    "Wyczyść pamięć podręczną dźwięku",
  "ui.provider.settings.offline.clearing": "Czyszczenie…",
  "ui.provider.settings.offline.rebuilding":
    "Odbudowa: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Pobrać ponownie wszystkie modele AI?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "To pobierze ok. 1,7 GB. Synteza głosu działa dalej podczas odświeżania.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Pobierz ponownie",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Zmień pacjenta",
  "ui.provider.switch.add_patient": "+ Dodaj pacjenta",
  "ui.provider.patients.title": "Pacjenci",
  "ui.provider.patients.actions_aria": "Akcje dla {name}",
  "ui.provider.patients.action_edit": "Edytuj",
  "ui.provider.patients.action_remove": "Usuń",
  "ui.provider.patients.action_discharge": "Wypisz",
  "ui.provider.switch.voice_captured": "Głos przechwycony",
  "ui.provider.switch.no_voice": "Brak głosu",
  "ui.provider.switch.last_active_just_now": "Przed chwilą",
  "ui.provider.switch.last_active_minutes":
    "Aktywny {n} min temu",
  "ui.provider.switch.last_active_hours": "Aktywny {n} godz. temu",
  "ui.provider.switch.last_active_days": "Aktywny {n} dni temu",
  "ui.provider.switch.currently_active": "Obecnie aktywny",
  "ui.provider.switch.switched_announcement":
    "Przełączono na {name}. {count} wiadomości w rozmowie.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Sesja personelu kończy się",
  "ui.provider.staff_session.warning_body":
    "Dostęp personelu zostanie zablokowany za {n} sekund.",
  "ui.provider.staff_session.extend": "Przedłuż sesję",
  "ui.provider.staff_session.end_now": "Zakończ teraz",
  "ui.provider.nav.end_staff_session": "Zakończ sesję personelu",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",

  // ── Model readiness (TODO: translate) ──
  "ui.readiness.listen.not_ready": "Getting ready to listen…",
  "ui.readiness.listen.with_countdown": "Getting ready to listen — {countdown}",
  "ui.readiness.listen.almost": "Almost ready…",
  "ui.readiness.listen.ready": "Tap to listen",
  "ui.readiness.listen.failed_message": "Couldn't get ready",
  "ui.readiness.listen.failed_action": "Try again",
  "ui.readiness.voice_capture.precapture_hint": "Voice will start as soon as it's ready",
  "ui.readiness.voice_capture.saving": "Saving your voice…",
  "ui.readiness.voice_capture.saving_with_countdown": "Saving your voice — {countdown} remaining",
  "ui.readiness.voice_capture.saving_almost": "Almost ready…",
  "ui.readiness.voice_capture.ready": "Voice ready",
  "ui.readiness.voice_capture.failed_message": "Couldn't prepare your voice",
  "ui.readiness.voice_capture.failed_action": "Try again",
  "ui.patient.header.voice_status.not_ready": "Using a temporary voice",
  "ui.patient.header.voice_status.almost": "Almost ready — using a temporary voice",
  "ui.patient.header.voice_status.failed_message": "Couldn't prepare your voice",
  "ui.patient.header.voice_status.failed_action": "Try again",

  // ── Voice quality score (enrollment feedback) ──
  "ui.voice_quality.title": "Jakość głosu",
  "ui.voice_quality.label.good": "Dobra",
  "ui.voice_quality.label.ok": "OK",
  "ui.voice_quality.label.poor": "Wymaga poprawy",
  "ui.voice_quality.tip.snr": "Spróbuj nagrywać w cichszym miejscu.",
  "ui.voice_quality.tip.clipping": "Odsuń się trochę od mikrofonu.",
  "ui.voice_quality.tip.coverage": "Spróbuj czytać trochę dłużej.",
  "ui.voice_quality.tip.voiced_fraction": "Staraj się mówić przez cały czas nagrania.",
  "ui.voice_quality.tip.pitch_variation": "Czytaj bardziej naturalnie — pozwól głosowi opadać i wznosić się.",
  "ui.voice_quality.tip.loudness": "Staraj się utrzymywać stałą głośność.",
  "ui.voice_quality.tip.tilt_boomy": "Spróbuj odsunąć się trochę dalej od mikrofonu.",
  "ui.voice_quality.tip.tilt_tinny": "Ten mikrofon brzmi cienko — spróbuj innego, jeśli masz.",
};

export default pl;
