/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Not registered in the LOCALES map — this file exists as a starting
 * point for professional translators and native-speaking clinicians.
 * Do NOT expose to users until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *   3. Registration in src/data/phraseRegistry.ts LOCALES
 *
 * Language: Tagalog (Filipino, Manila register)
 * Locale: tl
 * Generated: 2026-04-23
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const tl: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Oo",
  "quick.no": "Hindi",
  "quick.thank_you": "Salamat",
  "quick.please_wait": "Sandali lang",
  "quick.dont_understand": "Hindi ko maintindihan",
  "quick.repeat": "Pakiulit",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Kailangan ko ng tubig",
  "needs.comfort.hungry": "Gutom na ako",
  "needs.comfort.cold": "Nilalamig ako",
  "needs.comfort.hot": "Naiinitan ako",
  "needs.comfort.bed": "Ayusin ang kama ko",
  "needs.comfort.bathroom": "Kailangan ko pumunta sa banyo",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Kailangan ko ang gamot ko",
  "needs.medical.suction": "Kailangan ko ng suction",
  "needs.medical.nauseous": "Naduduwal ako",
  "needs.medical.breathe": "Hirap akong huminga",
  "needs.medical.nurse": "Kailangan ko ang nars",
  "needs.medical.doctor": "Kailangan ko ang doktor",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Gusto kong makita ang pamilya ko",
  "needs.people.stay": "Puwede bang may mag-stay kasama ko?",
  "needs.people.call": "Gusto kong tumawag sa isang tao",
  "needs.people.interpreter": "Kailangan ko ng interpreter",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Pagod na ako",
  "feelings.physical.uncomfortable": "Hindi ako komportable",
  "feelings.physical.weak": "Nanghihina ako",
  "feelings.physical.better": "Bumuti ang pakiramdam ko",
  "feelings.physical.dizzy": "Nahihilo ako",
  "feelings.physical.itchy": "Makati",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Natatakot ako",
  "feelings.emotional.lonely": "Nalulungkot ako",
  "feelings.emotional.frustrated": "Frustrated ako",
  "feelings.emotional.confused": "Nalilito ako",
  "feelings.emotional.safe": "Ligtas ang pakiramdam ko",
  "feelings.emotional.grateful": "Nagpapasalamat ako",
  "feelings.emotional.worried": "Nag-aalala ako",
  "feelings.emotional.hopeful": "May pag-asa ako",
  "feelings.emotional.bored": "Nababagot ako",
  "feelings.emotional.embarrassed": "Nahihiya ako",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Anong oras na?",
  "questions.day": "Anong araw ngayon?",
  "questions.whats_happening": "Ano ang nangyayari sa akin?",
  "questions.go_home": "Kailan ako makakauwi?",
  "questions.next_medication": "Kailan ang susunod kong gamot?",
  "questions.explain_treatment":
    "Puwede bang ipaliwanag ang treatment ko?",
  "questions.nurse_today": "Sino ang nars ko ngayon?",
  "questions.eat_drink": "Puwede ba akong kumain o uminom?",
  "questions.see_family": "Kailan ko makikita ang pamilya ko?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Walang sakit",
  "pain.face.2": "Konting sakit",
  "pain.face.4": "Medyo masakit",
  "pain.face.6": "Mas masakit pa",
  "pain.face.8": "Sobrang sakit",
  "pain.face.10": "Pinakamasakit",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Masakit-sakit",
  "pain.descriptor.burning": "Nasusunog",
  "pain.descriptor.sharp": "Matalas na sakit",
  "pain.descriptor.throbbing": "Tumitibok na sakit",
  "pain.descriptor.cramping": "Parang pulikat",
  "pain.descriptor.constant": "Tuloy-tuloy",
  "pain.descriptor.comes_and_goes": "Pumapala at nawawala",
  "pain.descriptor.numb": "Namamanhid",
  "pain.descriptor.pressure": "Parang dinidiin",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Ulo",
  "pain.region.face": "Mukha",
  "pain.region.neck": "Leeg",
  "pain.region.chest": "Dibdib",
  "pain.region.left_shoulder": "Kaliwang balikat",
  "pain.region.right_shoulder": "Kanang balikat",
  "pain.region.left_arm": "Kaliwang braso",
  "pain.region.right_arm": "Kanang braso",
  "pain.region.stomach": "Tiyan",
  "pain.region.upper_back": "Itaas na likod",
  "pain.region.lower_back": "Ibabang likod",
  "pain.region.left_leg": "Kaliwang binti",
  "pain.region.right_leg": "Kanang binti",

  // ── Pain: Composed sentence template ───────────────────────────
  "pain.sentence":
    "May {descriptor} na sakit ako sa aking {region}, antas {severity} sa 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Tindi",
  "pain.step.location": "Lokasyon",
  "pain.step.descriptor": "Uri",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Mga layunin ko",
  "wishes.worries.label": "Mga alalahanin ko",
  "wishes.strength.label": "Ang nagbibigay sa akin ng lakas",
  "wishes.joy.label": "Ang nagbibigay sa akin ng kasiyahan",
  "wishes.tradeoffs.label": "Tungkol sa treatment",
  "wishes.family.label": "Ang pamilya ko",
  "wishes.hopes.label": "Mga pag-asa ko",

  // Questions
  "wishes.goals.question":
    "Ano ang pinakamahalagang mga layunin mo?",
  "wishes.worries.question":
    "Ano ang pinakamalaking mga alalahanin mo?",
  "wishes.strength.question":
    "Ano ang nagbibigay sa iyo ng lakas?",
  "wishes.joy.question":
    "Ano ang nagbibigay ng kasiyahan at kahulugan sa buhay mo?",
  "wishes.tradeoffs.question":
    "Gaano kalayo ang gusto mong pagdaanan para sa mas matagal na oras?",
  "wishes.family.question":
    "Gaano karaming nalalaman ng mga taong malapit sa iyo tungkol sa mga gusto mo?",
  "wishes.hopes.question": "Ano ang mga pag-asa mo?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems compose naturally with response lists in Tagalog
  "wishes.goals.stem": "Ang pinakamahalaga sa akin",
  "wishes.worries.stem": "Nag-aalala ako tungkol sa",
  "wishes.strength.stem": "Ang nagbibigay sa akin ng lakas",
  "wishes.joy.stem": "Ang nagbibigay sa akin ng kasiyahan",
  "wishes.tradeoffs.stem": "Tungkol sa aking treatment",
  "wishes.family.stem": "Tungkol sa aking pamilya",
  "wishes.hopes.stem": "Umaasa ako",

  // Responses — goals
  "wishes.goals.r.family": "Makasama ang pamilya ko",
  "wishes.goals.r.comfort": "Maging komportable at walang sakit",
  "wishes.goals.r.longevity":
    "Mabuhay nang pinakamatagal na puwede",
  "wishes.goals.r.home": "Makauwi",
  "wishes.goals.r.independence":
    "Magawa ang mga bagay para sa sarili ko",
  "wishes.goals.r.peace": "Maging payapa",

  // Responses — worries
  "wishes.worries.r.suffering": "Magdusa o masaktan",
  "wishes.worries.r.alone": "Mag-isa",
  "wishes.worries.r.burden": "Maging pabigat sa pamilya ko",
  "wishes.worries.r.activities":
    "Hindi magawa ang mga gustong gawin",
  "wishes.worries.r.leaving": "Maiwan ang pamilya ko",
  "wishes.worries.r.unknown": "Hindi malaman kung ano ang mangyayari",

  // Responses — strength
  "wishes.strength.r.family": "Ang pamilya ko",
  "wishes.strength.r.faith": "Ang pananampalataya ko",
  "wishes.strength.r.friends": "Ang mga kaibigan ko",
  "wishes.strength.r.wishes_heard":
    "Ang pagkaalam na naririnig ang mga gusto ko",
  "wishes.strength.r.hope": "Pag-asang gagaling ako",
  "wishes.strength.r.carers": "Ang mga nag-aalaga sa akin",

  // Responses — joy
  "wishes.joy.r.family": "Pagsasama ng pamilya",
  "wishes.joy.r.outdoors": "Nasa labas",
  "wishes.joy.r.hobbies": "Mga libangan at interes ko",
  "wishes.joy.r.helping": "Pagtulong sa iba",
  "wishes.joy.r.spiritual": "Ang espirituwal kong pamumuhay",
  "wishes.joy.r.routines": "Simpleng gawain araw-araw",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything":
    "Gusto ko ang lahat ng posibleng treatment",
  "wishes.tradeoffs.r.good_chance":
    "Gusto ko ng treatment kung may magandang pagkakataon",
  "wishes.tradeoffs.r.try_stop":
    "Gusto kong subukan pero tumigil kung hindi nakakatulong",
  "wishes.tradeoffs.r.comfortable":
    "Gusto kong mag-focus sa pagiging komportable",
  "wishes.tradeoffs.r.think":
    "Kailangan ko pa ng oras para mag-isip",
  "wishes.tradeoffs.r.family_first":
    "Kailangan kong makausap muna ang pamilya ko",

  // Responses — family
  "wishes.family.r.know_well": "Alam nila ang mga gusto ko",
  "wishes.family.r.know_some":
    "Alam nila ang ilan sa mga gusto ko",
  "wishes.family.r.not_talked":
    "Hindi pa namin napag-usapan ito",
  "wishes.family.r.need_help":
    "Kailangan ko ng tulong para sabihin sa kanila",
  "wishes.family.r.team_explain":
    "Gusto kong tulungan ng care team ko na ipaliwanag",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Gumaling",
  "wishes.hopes.r.go_home": "Makauwi",
  "wishes.hopes.r.comfortable": "Maging komportable",
  "wishes.hopes.r.family_ok": "Maayos ang pamilya ko",
  "wishes.hopes.r.more_time": "Magkaroon ng mas maraming oras",
  "wishes.hopes.r.peace": "Maging payapa",

  // Wish sentence composition templates
  // TODO(translator): "ay" linkage may not work for all stem + list combos in Tagalog
  "wishes.compose": "{stem} ay {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help":
    "Hahanap ako ng tumulong.",
  "provider.responses.interpreter":
    "Hahanap ako ng interpreter.",
  "provider.responses.family":
    "Tatawagan ko ang pamilya mo.",
  "provider.responses.get_that": "Kukunin ko iyan para sa iyo.",
  "provider.responses.doctor_know":
    "Sasabihin ko sa doktor.",
  "provider.responses.medication":
    "Kukunin ko ang gamot mo.",
  "provider.responses.family_coming":
    "Paparating na ang pamilya mo.",
  "provider.responses.doctor_soon":
    "Darating na ang doktor.",
  "provider.responses.doing_well": "Maganda ang takbo mo.",
  "provider.responses.rest": "Magpahinga ka muna.",

  "provider.questions.feeling": "Kumusta ang pakiramdam mo?",
  "provider.questions.need": "May kailangan ka ba?",
  "provider.questions.where_hurts":
    "Puwede mo bang ipakita kung saan masakit?",
  "provider.questions.rate_pain":
    "I-rate ang sakit mo, 0 hanggang 10.",
  "provider.questions.sleep": "Nakatulog ka ba nang maayos?",
  "provider.questions.comfortable": "Komportable ka ba?",

  "provider.directions.procedure":
    "Naka-schedule ang procedure mo ngayon.",
  "provider.directions.stay_in_bed":
    "Kailangan mong manatili sa kama.",
  "provider.directions.vitals":
    "Titingnan ko ang vitals mo.",
  "provider.directions.medication_time":
    "Oras na ng gamot mo.",
  "provider.directions.breathe":
    "Subukan mong huminga nang malalim.",
  "provider.directions.call_button":
    "Pindutin ang call button kung kailangan mo ng kahit ano.",

  "provider.goals_of_care.matters_most":
    "Gusto kong pag-usapan kung ano ang pinakamahalaga sa iyo.",
  "provider.goals_of_care.goals":
    "Ano ang pinakamahalaga mong mga layunin ngayon?",
  "provider.goals_of_care.worries":
    "Ano ang pinakamalaking alalahanin mo?",
  "provider.goals_of_care.strength":
    "Ano ang nagbibigay sa iyo ng lakas?",
  "provider.goals_of_care.joy":
    "Ano ang nagbibigay ng kasiyahan at kahulugan sa buhay mo?",
  "provider.goals_of_care.wishes":
    "Gaano karaming nalalaman ng mga mahal mo sa buhay tungkol sa mga gusto mo?",
  "provider.goals_of_care.hopes": "Ano ang mga pag-asa mo?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Nakatulog ako nang maayos",
  "time.morning.didnt_sleep": "Hindi ako nakatulog nang maayos",
  "time.morning.breakfast": "Kailangan ko ng almusal",
  "time.morning.doctor_coming": "Kailan darating ang doktor?",

  "time.afternoon.tired": "Pagod na ako",
  "time.afternoon.lunch": "Puwede ba akong mag-lunch?",
  "time.afternoon.see_family":
    "Kailan ko makikita ang pamilya ko?",
  "time.afternoon.rest": "Kailangan kong magpahinga",

  "time.evening.cant_sleep": "Hindi ako makatulog",
  "time.evening.medication": "Kailangan ko ang gamot ko",
  "time.evening.call_family":
    "Puwede ba akong tumawag sa pamilya ko?",
  "time.evening.pain": "Masakit",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate sequentially.
  // Tagalog word order (VSO/VOS) may not compose correctly — review each chain.
  "suggest.start.i_am": "Ako ay",
  "suggest.start.i_feel": "Nararamdaman ko",
  "suggest.start.i_want": "Gusto ko",
  "suggest.start.i_need": "Kailangan ko",
  "suggest.start.please": "Paki",
  "suggest.start.when": "Kailan",
  "suggest.start.can_you": "Puwede mo bang",
  "suggest.start.tell_me": "Sabihin mo sa akin",

  "suggest.i_am.in_pain": "masakit",
  "suggest.i_am.cold": "nilalamig",
  "suggest.i_am.hot": "naiinitan",
  "suggest.i_am.hungry": "gutom",
  "suggest.i_am.thirsty": "uhaw",
  "suggest.i_am.tired": "pagod",
  "suggest.i_am.uncomfortable": "hindi komportable",
  "suggest.i_am.okay": "okay",
  "suggest.i_am.not_okay": "hindi okay",
  "suggest.i_am.ready": "handa na",

  "suggest.i_feel.scared": "takot",
  "suggest.i_feel.sick": "masama",
  "suggest.i_feel.dizzy": "hilo",
  "suggest.i_feel.weak": "mahina",
  "suggest.i_feel.better": "mas maganda",
  "suggest.i_feel.worse": "mas masama",
  "suggest.i_feel.nauseous": "nauseous",
  "suggest.i_feel.lonely": "malungkot",
  "suggest.i_feel.confused": "nalilito",
  "suggest.i_feel.safe": "ligtas",

  "suggest.i_feel_scared.procedure": "tungkol sa procedure",
  "suggest.i_feel_scared.happening": "tungkol sa nangyayari",
  "suggest.i_feel_scared.alone": "mag-isa",
  "suggest.i_feel_scared.need_someone":
    "at kailangan ko ng kasama",

  "suggest.i_feel_sick.stomach": "sa tiyan",
  "suggest.i_feel_sick.dizzy": "at nahihilo",
  "suggest.i_feel_sick.help": "at kailangan ko ng tulong",

  "suggest.i_want.water": "tubig",
  "suggest.i_want.family": "ang pamilya ko",
  "suggest.i_want.go_home": "umuwi",
  "suggest.i_want.sleep": "matulog",
  "suggest.i_want.medication": "ang gamot ko",
  "suggest.i_want.blanket": "kumot",
  "suggest.i_want.talk": "makausap ang isang tao",
  "suggest.i_want.nurse": "ang nars",

  "suggest.i_want_to_go.home": "uwi",
  "suggest.i_want_to_go.sleep": "tulog",
  "suggest.i_want_to_go.bathroom": "sa banyo",

  "suggest.i_want_my.family": "pamilya",
  "suggest.i_want_my.medication": "gamot",
  "suggest.i_want_my.phone": "telepono",
  "suggest.i_want_my.glasses": "salamin",
  "suggest.i_want_my.blanket": "kumot",

  "suggest.i_need.help": "tulong",
  "suggest.i_need.water": "tubig",
  "suggest.i_need.bathroom": "ang banyo",
  "suggest.i_need.medication": "ang gamot ko",
  "suggest.i_need.nurse": "ang nars",
  "suggest.i_need.doctor": "ang doktor",
  "suggest.i_need.rest": "magpahinga",
  "suggest.i_need.blanket": "kumot",
  "suggest.i_need.suction": "suction",

  "suggest.i_need_the.nurse": "nars",
  "suggest.i_need_the.doctor": "doktor",
  "suggest.i_need_the.bathroom": "banyo",
  "suggest.i_need_the.light_off": "patayin ang ilaw",
  "suggest.i_need_the.light_on": "buksan ang ilaw",

  "suggest.i_need_my.medication": "gamot",
  "suggest.i_need_my.family": "pamilya",
  "suggest.i_need_my.glasses": "salamin",
  "suggest.i_need_my.phone": "telepono",

  "suggest.please.help_me": "tulungan mo ako",
  "suggest.please.call_family": "tawagan ang pamilya ko",
  "suggest.please.light_off": "patayin ang ilaw",
  "suggest.please.adjust_bed": "ayusin ang kama ko",
  "suggest.please.give_me": "bigyan mo ako",
  "suggest.please.explain": "ipaliwanag",
  "suggest.please.come_back": "bumalik agad",
  "suggest.please.stay": "manatili ka",
  "suggest.please.dont_leave": "huwag kang umalis",

  "suggest.please_help_me.pain": "Masakit",
  "suggest.please_help_me.breathe": "Hindi ako makahinga",
  "suggest.please_help_me.sick": "Masama ang pakiramdam ko",
  "suggest.please_help_me.scared": "Natatakot ako",

  "suggest.please_give_me.water": "tubig",
  "suggest.please_give_me.medication": "gamot ko",
  "suggest.please_give_me.blanket": "kumot",
  "suggest.please_give_me.pain_relief":
    "pampaginhawa ng sakit",

  "suggest.when.go_home": "ako makakauwi?",
  "suggest.when.family": "darating ang pamilya ko?",
  "suggest.when.medication": "ang susunod kong gamot?",
  "suggest.when.doctor": "darating ang doktor?",
  "suggest.when.eat": "ako kakain?",
  "suggest.when.over": "matatapos ito?",

  "suggest.can_you.help": "tulungan ako?",
  "suggest.can_you.call_family": "tawagan ang pamilya ko?",
  "suggest.can_you.get_nurse": "tawagin ang nars?",
  "suggest.can_you.explain": "ipaliwanag ang nangyayari?",
  "suggest.can_you.light_off": "patayin ang ilaw?",
  "suggest.can_you.adjust_bed": "ayusin ang kama ko?",
  "suggest.can_you.stay": "manatili ka?",

  "suggest.tell_me.happening": "kung ano ang nangyayari",
  "suggest.tell_me.time": "kung anong oras na",
  "suggest.tell_me.go_home": "kung kailan ako makakauwi",
  "suggest.tell_me.day": "kung anong araw ngayon",
  "suggest.tell_me.treatment": "tungkol sa treatment ko",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "tulungan mo ako",
  "suggest.i_am_in_pain.worse": "at lumalala",
  "suggest.i_am_in_pain.medication": "at kailangan ko ng gamot",
  "suggest.i_am_in_pain.back": "sa likod",
  "suggest.i_am_in_pain.chest": "sa dibdib",
  "suggest.i_am_in_pain.stomach": "sa tiyan",

  "suggest.i_need_help.up": "tumayo",
  "suggest.i_need_help.breathing": "huminga",
  "suggest.i_need_help.pain": "sa sakit",
  "suggest.i_need_help.now": "ngayon na",
  "suggest.i_need_help.please": "pakiusap",

  "suggest.i_feel_better.than_before": "kaysa kanina",
  "suggest.i_feel_better.now": "ngayon",
  "suggest.i_feel_better.thanks": "salamat",

  "suggest.i_feel_worse.than_before": "kaysa kanina",
  "suggest.i_feel_worse.need_doctor": "Kailangan ko ang doktor",
  "suggest.i_feel_worse.help": "tulungan mo ako",
  "suggest.i_feel_worse.medication": "Kailangan ko ng gamot",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Nararamdaman ko",
  "suggest.ctx.feeling.i_am": "Ako ay",
  "suggest.ctx.feeling.better": "Mas maganda kaysa kanina",
  "suggest.ctx.feeling.not_great": "Hindi maganda",
  "suggest.ctx.feeling.pain": "Masakit",
  "suggest.ctx.feeling.okay": "Okay naman ako",
  "suggest.ctx.feeling.help": "Puwede mo ba akong tulungan?",

  "suggest.ctx.need.i_need": "Kailangan ko",
  "suggest.ctx.need.i_want": "Gusto ko",
  "suggest.ctx.need.fine": "Okay na ako ngayon",
  "suggest.ctx.need.yes": "Oo, pakiusap",
  "suggest.ctx.need.no": "Hindi, salamat",
  "suggest.ctx.need.stay": "Puwede ka bang manatili?",

  "suggest.ctx.where_hurts.head": "Ang ulo ko",
  "suggest.ctx.where_hurts.chest": "Ang dibdib ko",
  "suggest.ctx.where_hurts.stomach": "Ang tiyan ko",
  "suggest.ctx.where_hurts.back": "Ang likod ko",
  "suggest.ctx.where_hurts.left_arm": "Ang kaliwang braso ko",
  "suggest.ctx.where_hurts.right_leg": "Ang kanang binti ko",
  "suggest.ctx.where_hurts.everywhere": "Lahat",

  "suggest.ctx.pain.very_bad": "Sobrang sakit",
  "suggest.ctx.pain.worse": "Lumalala",
  "suggest.ctx.pain.same": "Pareho pa rin",
  "suggest.ctx.pain.little_better": "Kaunting ginhawa",
  "suggest.ctx.pain.need_relief":
    "Kailangan ko ng pampaginhawa ng sakit",

  "suggest.ctx.comfort.comfortable": "Komportable ako",
  "suggest.ctx.comfort.not_comfortable": "Hindi ako komportable",
  "suggest.ctx.comfort.cant_sleep": "Hindi ako makatulog",
  "suggest.ctx.comfort.cold": "Nilalamig ako",
  "suggest.ctx.comfort.hot": "Naiinitan ako",
  "suggest.ctx.comfort.adjust_bed":
    "Puwede mo bang ayusin ang kama ko?",

  "suggest.ctx.night.cant_sleep": "Hindi ako makatulog",
  "suggest.ctx.night.i_need": "Kailangan ko",
  "suggest.ctx.night.pain": "Masakit",
  "suggest.ctx.night.i_feel": "Nararamdaman ko",
  "suggest.ctx.night.can_you": "Puwede mo bang",
  "suggest.ctx.night.please": "Paki",
  "suggest.ctx.night.i_am": "Ako ay",
  "suggest.ctx.night.when": "Kailan",

  "suggest.ctx.morning.i_am": "Ako ay",
  "suggest.ctx.morning.i_need": "Kailangan ko",
  "suggest.ctx.morning.i_feel": "Nararamdaman ko",
  "suggest.ctx.morning.doctor": "Kailan darating ang doktor?",
  "suggest.ctx.morning.i_want": "Gusto ko",
  "suggest.ctx.morning.can_you": "Puwede mo bang",
  "suggest.ctx.morning.please": "Paki",
  "suggest.ctx.morning.tell_me": "Sabihin mo sa akin",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Mabilis",
  "cat.needs": "Kailangan ko",
  "cat.feelings": "Nararamdaman",
  "cat.pain": "Sakit",
  "cat.questions": "Tanong",
  "sub.comfort": "Ginhawa",
  "sub.medical": "Medikal",
  "sub.people": "Tao",
  "sub.physical": "Pisikal",
  "sub.emotional": "Emosyonal",

  // Provider category labels
  "provider.cat.responses": "Mga tugon",
  "provider.cat.questions": "Mga tanong",
  "provider.cat.directions": "Mga tagubilin",
  "provider.cat.goals_of_care": "Mga layunin ng pangangalaga",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label":
    "OwnVoice — usapan ni {name}",
  "ui.patient.app.name_fallback": "Pasyente",
  "ui.patient.header.name_fallback": "Pasyente",
  "ui.patient.header.bed_prefix": "Kama ",
  "ui.dual.nav.wishes": "Mga gusto",
  "ui.provider.nav.listen": "Makinig",
  "ui.provider.nav.staff": "Staff",
  "ui.provider.nav.switch_patient": "Palitan ang pasyente",
  "ui.provider.nav.settings": "Mga Setting",
  "ui.provider.nav.theme.auto": "Auto",
  "ui.provider.nav.theme.light": "Maliwanag",
  "ui.provider.nav.theme.dark": "Madilim",
  "ui.patient.tabbar.say_more": "Magsalita pa",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Gaano katindi ang sakit?",
  "ui.dual.pain.heading.location": "Saan masakit?",
  "ui.dual.pain.heading.descriptor":
    "Ano ang pakiramdam ng sakit?",
  "ui.patient.pain.step_of": "Hakbang {n} ng {total}",
  "ui.patient.pain.back_to": "Bumalik sa {label}",
  "ui.patient.pain.level_aria": "Antas ng sakit {n}, {label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Mga gusto ni {name}",
  "ui.patient.wishes.my_wishes": "Mga gusto ko",
  "ui.patient.wishes.step_of": "Hakbang {n} ng {total}",
  "ui.patient.wishes.none_shared":
    "Walang mga gusto na na-share.",
  "ui.patient.wishes.share_all_again":
    "I-share ulit lahat ng mga gusto",
  "ui.patient.wishes.close": "Isara",
  "ui.patient.wishes.share": "I-share",
  "ui.patient.wishes.skip": "Laktawan",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder":
    "I-tap ang mga salita sa ibaba o mag-type...",
  "ui.patient.builder.message_aria": "Ang mensahe mo",
  "ui.patient.builder.undo": "I-undo ang huling salita",
  "ui.patient.builder.clear": "Burahin ang mensahe",
  "ui.patient.builder.refresh_ai":
    "I-refresh ang mga AI suggestion",
  "ui.patient.builder.ai_thinking": "Nag-iisip ang AI...",
  "ui.patient.builder.no_ai_suggestions":
    "Walang AI suggestion. I-tap ang refresh para subukan ulit.",
  "ui.patient.builder.ready":
    "Handa na ang mensahe mo. I-tap ang Magsalita para ipadala.",
  "ui.patient.builder.speak": "Magsalita",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Ulitin: {text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Care team",
  "ui.provider.fallback_name": "Provider",
  "ui.provider.speaking_to":
    "Nakikipag-usap kay {name} bilang {prov}",
  "ui.provider.patient_fallback": "pasyente",
  "ui.provider.close_panel": "Isara ang panel",
  "ui.provider.select_provider": "Piliin si {name}",
  "ui.provider.show_category": "Ipakita ang {key}",
  "ui.provider.speak_phrase": "Sabihin: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Makinig",
  "ui.provider.listen.stop_aria": "Itigil ang pakikinig",
  "ui.provider.listen.start_aria":
    "I-tap para magsimulang makinig",
  "ui.provider.listen.listening": "Nakikinig...",
  "ui.provider.listen.transcribing": "Nag-transcribe...",
  "ui.provider.listen.listening_placeholder":
    "Nakikinig sa pagsasalita...",
  "ui.provider.listen.transcribing_placeholder":
    "Nagta-transcribe ng pagsasalita...",
  "ui.provider.listen.type_placeholder":
    "O i-type ang sinabi...",
  "ui.provider.listen.transcript_aria": "Transcript",
  "ui.provider.listen.add_as":
    "Idagdag sa usapan bilang {prov}",
  "ui.provider.listen.privacy_notice":
    "Sa device · Whisper · walang audio ang umaalis sa device na ito",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Nagsasalita: {text}",
  "ui.dual.speaking.patient_voice": "Boses mo",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Ilagay ang PIN",
  "ui.provider.pin_gate.subtitle":
    "Para sa staff lamang",
  "ui.provider.pin_gate.incorrect": "Maling PIN",
  "ui.provider.pin_gate.delete_aria": "Burahin",
  "ui.provider.pin_gate.digit_aria": "Digit {n}",
  "ui.provider.pin_gate.cancel": "Kanselahin",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Magbabasa ka ng isang pangungusap nang malakas.",
  "ui.provider.voice_capture.coaching_breath":
    "Huminga ng malalim nang ilang beses.",
  "ui.provider.voice_capture.coaching_ready": "Handa na.",
  "ui.provider.voice_capture.breathe_in": "Huminga…",
  "ui.provider.voice_capture.breathe_out": "Ilabas…",
  "ui.provider.voice_capture.creating":
    "Gumagawa ng voice clone...",
  "ui.provider.voice_capture.creating_from_sample":
    "Gumagawa ng voice clone mula sa sample...",
  "ui.provider.voice_capture.loading_model":
    "Naglo-load ng voice model...",
  "ui.provider.voice_capture.clone_failed":
    "Nabigo ang pag-clone",
  "ui.provider.voice_capture.captured": "Na-capture ang boses",
  "ui.provider.voice_capture.stop": "Itigil",
  "ui.provider.voice_capture.play": "I-play",
  "ui.provider.voice_capture.discard": "Itapon ang recording",
  "ui.provider.voice_capture.use_recording":
    "Gamitin ang recording na ito",
  "ui.provider.voice_capture.upload_file": "Mag-upload ng file",
  "ui.provider.voice_capture.record": "Mag-record",
  "ui.provider.voice_capture.stop_early": "Itigil agad",
  "ui.provider.voice_capture.remove": "Alisin",
  "ui.provider.voice_capture.retry": "Subukan ulit",
  "ui.provider.voice_capture.done": "Tapos na!",
  "ui.provider.voice_capture.cancel": "Kanselahin",
  "ui.provider.voice_capture.seconds_recorded":
    "{n}s na-record",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Kanselahin ang countdown ng recording",
  "ui.provider.voice_capture.stop_early_aria":
    "Itigil agad ang recording",
  "ui.provider.voice_capture.audio_level_aria":
    "Antas ng audio",
  "ui.provider.voice_capture.recording_progress_aria":
    "Progreso ng recording",
  "ui.provider.voice_capture.stop_preview_aria":
    "Itigil ang preview playback",
  "ui.provider.voice_capture.play_preview_aria":
    "I-play ang recording preview",
  "ui.provider.voice_capture.discard_aria":
    "Itapon ang recording na ito at magsimula ulit",
  "ui.provider.voice_capture.stop_playback_aria":
    "Itigil ang playback ng naka-record na sample",
  "ui.provider.voice_capture.play_sample_aria":
    "I-play ang naka-record na voice sample",
  "ui.provider.voice_capture.remove_aria":
    "Alisin ang voice sample",
  "ui.provider.voice_capture.retry_aria":
    "Subukan ulit ang voice clone extraction",
  "ui.provider.voice_capture.upload_aria":
    "Mag-upload ng voice sample mula sa file",
  "ui.provider.voice_capture.record_aria":
    "Mag-record ng voice sample mula sa microphone",
  "ui.provider.voice_capture.err_network":
    "Hindi maabot ang voice model. Tingnan ang connection, at i-tap ang Subukan ulit.",
  "ui.provider.voice_capture.err_timeout":
    "Masyadong matagal ang voice processing. I-tap ang Subukan ulit.",
  "ui.provider.voice_capture.err_mic_denied":
    "Naka-block ang access sa microphone. I-enable sa browser settings o mag-upload ng file.",
  "ui.provider.voice_capture.err_generic":
    "Hindi natapos ang paghahanda ng boses. I-tap ang Subukan ulit.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Na-deny ang access sa microphone. Subukang mag-upload ng file.",
  "ui.provider.voice_capture.err_playback":
    "Hindi ma-play ang audio.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Enhanced",
  "ui.provider.fallback_voice.enhanced_aria":
    "Enhanced neural na boses",
  "ui.provider.fallback_voice.on_device_badge": "Sa device",
  "ui.provider.fallback_voice.playing": "Nagpe-play...",
  "ui.provider.fallback_voice.unavailable":
    "Hindi available ang mga system voice sa device na ito.",
  "ui.provider.fallback_voice.loading":
    "Naglo-load ng mga available na boses...",
  "ui.provider.fallback_voice.hide_others":
    "Itago ang ibang boses",
  "ui.provider.fallback_voice.more_voices":
    "Higit pang boses ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Pasyente",
  "ui.provider.setup.steps.voice": "Boses",
  "ui.provider.setup.steps.care_team": "Team",
  "ui.provider.setup.steps.confirm": "Kumpirmahin",

  "ui.provider.setup.skip": "Laktawan →",
  "ui.provider.setup.skip_aria": "Laktawan ang setup",
  "ui.provider.setup.skip_dialog.title": "Laktawan ang setup?",
  "ui.provider.setup.skip_dialog.body":
    "Puwede mo itong tapusin mamaya sa Mga Setting.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Walang maidadagdag na pasyente.",
  "ui.provider.setup.skip_dialog.confirm": "Laktawan ang setup",
  "ui.provider.setup.skip_dialog.cancel": "Ipagpatuloy",

  "ui.provider.setup.back": "Bumalik",
  "ui.provider.setup.continue": "Magpatuloy",
  "ui.provider.setup.start": "Simulan ang OwnVoice",

  "ui.provider.setup.step0.heading": "Maligayang pagdating sa OwnVoice",
  "ui.provider.setup.step0.subhead":
    "I-set up natin ang communication board mo. Lahat ay nananatili sa device na ito.",
  "ui.provider.setup.step0.name_label": "Pangalan ng pasyente",
  "ui.provider.setup.step0.name_placeholder":
    "Unang pangalan o preferred na pangalan",
  "ui.provider.setup.step0.bed_label": "Kama / Kuwarto",
  "ui.provider.setup.step0.bed_placeholder": "hal. 4B-12",
  "ui.provider.setup.step0.language_label": "Wika",

  "ui.provider.setup.step1.heading": "Voice sample",
  "ui.provider.setup.step1.body1":
    "Kumuha ng voice sample para magsalita ang OwnVoice sa sariling boses ng pasyente. Opsyonal lang ang hakbang na ito.",
  "ui.provider.setup.step1.body2":
    "Ang voice cloning ay tumatakbo sa device mismo. Walang audio ang umaalis sa tablet.",
  "ui.provider.setup.step1.patient_label": "Pasyente",
  "ui.provider.setup.step1.backup_voice_heading":
    "Backup na boses",
  "ui.provider.setup.step1.backup_voice_body1":
    "Pumili ng system voice na gagamitin habang naglo-load ang voice clone, o kung walang na-record. I-tap ang boses para marinig ang preview.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Ginagamit nito ang built-in na text-to-speech ng device mo.",

  "ui.provider.setup.step2.heading": "Care team",
  "ui.provider.setup.step2.body":
    "Idagdag ang mga provider na mag-aalaga sa pasyente.",
  "ui.provider.setup.step2.icon_label": "Icon",
  "ui.provider.setup.step2.name_label": "Pangalan",
  "ui.provider.setup.step2.name_placeholder":
    "Dr. Santos, Nurse Maria...",
  "ui.provider.setup.step2.add": "Idagdag",

  "ui.provider.setup.step3.heading": "Handa na",
  "ui.provider.setup.step3.body":
    "I-review ang setup mo. Puwede mong baguhin mamaya sa Mga Setting.",
  "ui.provider.setup.step3.summary.patient": "Pasyente",
  "ui.provider.setup.step3.summary.bed": "Kama / Kuwarto",
  "ui.provider.setup.step3.summary.language": "Wika",
  "ui.provider.setup.step3.summary.language_default": "English",
  "ui.provider.setup.step3.summary.voice": "Boses",
  "ui.provider.setup.step3.summary.care_team": "Care team",
  "ui.provider.setup.step3.summary.not_set": "Hindi pa naka-set",
  "ui.provider.setup.step3.summary.captured": "Na-capture",
  "ui.provider.setup.step3.summary.not_captured":
    "Hindi pa na-capture",
  "ui.provider.setup.step3.summary.none_added": "Wala pang naidagdag",
  "ui.provider.setup.step3.pin_label":
    "Staff PIN (opsyonal)",
  "ui.provider.setup.step3.pin_body":
    "Mag-set ng 4-digit PIN para protektahan ang provider settings.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Mga Setting",
  "ui.provider.settings.done": "Tapos na",
  "ui.provider.settings.close_aria": "Isara ang settings",

  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Itapon ang paghahanda ng boses ni {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "Mawawala ang progreso ({current} / {total} na parirala). Ang naka-record na voice sample ay nananatili — puwede mong simulan ulit mamaya.",
  "ui.provider.settings.voice_cache.cancel": "Kanselahin",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Kanselahin at panatilihin ang paghahanda ng boses",
  "ui.provider.settings.voice_cache.discard_confirm": "Itapon",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Kumpirmahin na itapon ang paghahanda ng boses",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Itapon ang paghahanda ng boses ni {label}",
  // TODO(translator): {plural} is an English suffix marker — renders empty in Tagalog
  "ui.provider.settings.voice_cache.queued":
    "Nakapila — ihahanda ang boses ni {label} ({total} na parirala{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Inihahanda ang boses ni {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Naka-pause — boses ni {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Ituloy",
  "ui.provider.settings.voice_cache.resume_aria":
    "Ituloy ang paghahanda ng boses ni {label}",
  "ui.provider.settings.voice_cache.pause": "I-pause",
  "ui.provider.settings.voice_cache.pause_aria":
    "I-pause ang paghahanda ng boses ni {label}",
  "ui.provider.settings.voice_cache.done":
    "Active ang voice clone — lahat ng {total} na parirala handa na sa boses ni {label}",
  // TODO(translator): {plural} is an English suffix marker — renders empty in Tagalog
  "ui.provider.settings.voice_cache.failed":
    "{count} parirala{plural} ang nabigo para kay {label}",
  "ui.provider.settings.voice_cache.retry": "Subukan ulit",
  "ui.provider.settings.voice_cache.retry_aria":
    "Subukan ulit ang mga nabigong voice cache phrase",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Tungkol",
  "ui.provider.settings.about.subtitle":
    "AAC communication aid para sa mga in-patient.",
  "ui.provider.settings.about.attribution_1":
    "Pain scale: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Goals of care: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW cache:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "I-reset",
  "ui.provider.settings.reset.action_label":
    "I-reset ang app para sa bagong pasyente",
  "ui.provider.settings.reset.confirm_title":
    "Sigurado ka ba?",
  "ui.provider.settings.reset.confirm_body":
    "Mabubura lahat ng datos ng pasyente, voice samples, conversation history, at provider settings. Hindi ito puwedeng i-undo.",
  "ui.provider.settings.reset.confirm_destructive":
    "I-reset lahat",

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "Accessibility",
  "ui.provider.settings.accessibility.toggle_label":
    "Assistive Input Mode",
  "ui.provider.settings.accessibility.toggle_description":
    "Pinapalakas ang focus rings, pinapahaba ang tap debounce, at pinapalakas ang hover feedback para sa mga pasyenteng gumagamit ng trackball, joystick, AssistiveTouch cursor, o switch.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "May nakitang external pointer.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Isaalang-alang ang pag-enable ng Assistive Input Mode para sa pasyenteng ito.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Mga pasyente",
  "ui.provider.settings.patients.active_remove_hint":
    "Lumipat muna sa ibang pasyente bago alisin ito.",
  "ui.provider.settings.patients.remove_button": "Alisin",
  "ui.provider.settings.patients.add_patient":
    "+ Magdagdag ng pasyente",
  "ui.provider.settings.patients.remove_dialog.title":
    "Alisin si {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Mabubura ang kanilang voice sample, conversation history, at cached audio ng voice clone. Ang mga care-team voice clone ay nananatili para sa ibang pasyente. Hindi ito puwedeng i-undo.",
  "ui.provider.settings.patients.remove_dialog.confirm":
    "Alisin",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Care team",
  "ui.provider.settings.care_team.empty":
    "Wala pang naidagdag na provider.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Impormasyon ng pasyente",
  "ui.provider.settings.patient_info.name_label": "Pangalan",
  "ui.provider.settings.patient_info.bed_label":
    "Kama / Kuwarto",
  "ui.provider.settings.patient_info.language_label": "Wika",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section":
    "Wika ng pasyente",
  "ui.provider.settings.lang.caregiver_section":
    "Wika ng care team",
  "ui.provider.settings.lang.caregiver_helper":
    "Ang wikang naiintindihan ng care team mo. Karaniwan isang beses lang ise-set bawat device.",
  "ui.provider.settings.lang.change": "Palitan ang wika",

  "ui.provider.settings.lang.patient_dialog.title":
    "Palitan ang wika ng pasyente sa {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Handa pa rin ang voice clone mo — pareho pa rin ang tunog ng mga parirala na ita-tap mo. Maghahanda kami ng audio para sa {providerCount} care-team voice (~{estimatedMinutes} min). Puwede mong gamitin pa rin ang app habang nangyayari ito.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Hindi available ang care-team voice clone sa {lang} — gagamitin ang system voice. Nananatili ang mga existing recording kung sakaling lumipat sa supported na wika.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Pareho pa rin ang tunog ng mga parirala na ita-tap mo. Walang care-team voice na naka-configure, kaya walang kailangang i-regenerate.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Palitan ang wika ng care team sa {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Handa pa rin ang care-team voice clone mo. Maghahanda kami ng patient-voice audio sa bagong wika (~{estimatedMinutes} min). Puwede mong gamitin pa rin ang app habang nangyayari ito.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Hindi available ang patient voice clone sa {lang} — gagamitin ang system voice. Nananatili ang naka-record na patient voice sample kung sakaling lumipat sa supported na wika.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Walang patient voice clone na naka-configure, kaya walang kailangang i-regenerate.",
  "ui.provider.settings.patient_info.voice_label": "Boses",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Backup na boses",
  "ui.provider.settings.patient_info.backup_voice_body":
    "System voice na ginagamit habang naglo-load ang voice clone. I-tap para marinig.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading":
    "Kahandaan para sa offline",
  "ui.provider.settings.offline.status_description":
    "Status ng mga AI model na ginagamit ng app sa device para sa voice generation, mga suggestion, at speech recognition.",
  "ui.provider.settings.offline.downloading":
    "Nagda-download ng mga model…",
  "ui.provider.settings.offline.download_progress_aria":
    "Progreso ng pag-download ng model",
  "ui.provider.settings.offline.all_ready":
    "Lahat ng model handa na",
  "ui.provider.settings.offline.redownload_button":
    "I-download ulit ang mga model",
  "ui.provider.settings.offline.already_up_to_date":
    "Updated na",
  "ui.provider.settings.offline.checking": "Tinitingnan…",
  "ui.provider.settings.offline.verified":
    "✓ Na-verify ang mga model",
  "ui.provider.settings.offline.check_button":
    "Tingnan ang mga existing model",
  "ui.provider.settings.offline.redownloading":
    "Nagda-download ulit…",
  "ui.provider.settings.offline.force_redownload_button":
    "Puwersahang i-download ulit lahat ng model",
  "ui.provider.settings.offline.model_status_ready": "handa",
  "ui.provider.settings.offline.model_status_downloading":
    "nagda-download…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "kailangang subukan ulit",
  "ui.provider.settings.offline.last_verified_prefix":
    "Huling na-verify: ",
  "ui.provider.settings.offline.storage_prefix": "Storage: ",
  "ui.provider.settings.offline.storage_of": " ng ",
  "ui.provider.settings.offline.storage_used": " ginamit",
  "ui.provider.settings.offline.storage_low": " — malapit nang maubos",
  "ui.provider.settings.offline.clear_audio_cache":
    "Burahin ang audio cache",
  "ui.provider.settings.offline.clearing": "Binubura…",
  "ui.provider.settings.offline.rebuilding":
    "Nire-rebuild: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "I-download ulit lahat ng AI model?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Magda-download ulit ng humigit-kumulang 1.7 GB. Patuloy na gumagana ang voice synthesis habang nagre-refresh.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "I-download ulit",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Palitan ang pasyente",
  "ui.provider.switch.add_patient": "+ Magdagdag ng pasyente",
  "ui.provider.switch.voice_captured": "Na-capture ang boses",
  "ui.provider.switch.no_voice": "Walang boses",
  "ui.provider.switch.last_active_just_now": "Ngayon lang",
  "ui.provider.switch.last_active_minutes":
    "Active {n}m ang nakalipas",
  "ui.provider.switch.last_active_hours":
    "Active {n}h ang nakalipas",
  "ui.provider.switch.last_active_days":
    "Active {n}d ang nakalipas",
  "ui.provider.switch.currently_active": "Kasalukuyang active",
  "ui.provider.switch.switched_announcement":
    "Lumipat kay {name}. {count} na conversation message.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Matatapos na ang staff session",
  "ui.provider.staff_session.warning_body":
    "Mala-lock ang staff access mo sa {n} segundo.",
  "ui.provider.staff_session.extend": "Pahabain ang session",
  "ui.provider.staff_session.end_now": "Tapusin na",
  "ui.provider.nav.end_staff_session": "Tapusin ang staff session",
};

export default tl;
