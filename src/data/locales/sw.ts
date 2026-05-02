/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Kiswahili (East Africa standard)
 * Locale: sw
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const sw: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Ndiyo",
  "quick.no": "Hapana",
  "quick.thank_you": "Asante",
  "quick.please_wait": "Tafadhali subiri",
  "quick.dont_understand": "Sielewi",
  "quick.repeat": "Tafadhali rudia tena",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Ninahitaji maji",
  "needs.comfort.hungry": "Nina njaa",
  "needs.comfort.cold": "Nina baridi",
  "needs.comfort.hot": "Nina joto",
  "needs.comfort.bed": "Nirekebishie kitanda",
  "needs.comfort.bathroom": "Ninahitaji choo",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Ninahitaji dawa yangu",
  "needs.medical.suction": "Ninahitaji kufanyiwa suction",
  "needs.medical.nauseous": "Ninahisi kichefuchefu",
  "needs.medical.breathe": "Sipumui vizuri",
  "needs.medical.nurse": "Ninahitaji muuguzi",
  "needs.medical.doctor": "Ninahitaji daktari",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Nataka familia yangu",
  "needs.people.stay": "Mtu anaweza kukaa nami?",
  "needs.people.call": "Nataka kupiga simu",
  "needs.people.interpreter": "Ninahitaji mkalimani",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Nimechoka",
  "feelings.physical.uncomfortable": "Sijisikii vizuri",
  "feelings.physical.weak": "Ninahisi udhaifu",
  "feelings.physical.better": "Ninahisi nafuu",
  "feelings.physical.dizzy": "Ninahisi kizunguzungu",
  "feelings.physical.itchy": "Ninahisi kuwashwa",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Ninaogopa",
  "feelings.emotional.lonely": "Ninahisi upweke",
  "feelings.emotional.frustrated": "Nimechoshwa",
  "feelings.emotional.confused": "Nimechanganyikiwa",
  "feelings.emotional.safe": "Ninahisi usalama",
  "feelings.emotional.grateful": "Ninashukuru",
  "feelings.emotional.worried": "Nina wasiwasi",
  "feelings.emotional.hopeful": "Nina matumaini",
  "feelings.emotional.bored": "Nimechoka na kukaa bure",
  "feelings.emotional.embarrassed": "Ninaona aibu",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Saa ngapi sasa?",
  "questions.day": "Leo ni siku gani?",
  "questions.whats_happening": "Ninapata nini?",
  "questions.go_home": "Nitarudi nyumbani lini?",
  "questions.next_medication": "Dawa yangu ya pili ni lini?",
  "questions.explain_treatment": "Unaweza kunieleza matibabu yangu?",
  "questions.nurse_today": "Muuguzi wangu wa leo ni nani?",
  "questions.eat_drink": "Ninaweza kula au kunywa?",
  "questions.see_family": "Nitawaona familia yangu lini?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Hakuna maumivu",
  "pain.face.2": "Maumivu kidogo",
  "pain.face.4": "Maumivu zaidi kidogo",
  "pain.face.6": "Maumivu makubwa zaidi",
  "pain.face.8": "Maumivu makubwa sana",
  "pain.face.10": "Maumivu mabaya kabisa",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "yanayouma",
  "pain.descriptor.burning": "yanayowaka",
  "pain.descriptor.sharp": "makali",
  "pain.descriptor.throbbing": "yanayopwita",
  "pain.descriptor.cramping": "ya kukaza",
  "pain.descriptor.constant": "ya kudumu",
  "pain.descriptor.comes_and_goes": "yanayokuja na kwenda",
  "pain.descriptor.numb": "ya ganzi",
  "pain.descriptor.pressure": "ya shinikizo",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Kichwa",
  "pain.region.face": "Uso",
  "pain.region.neck": "Shingo",
  "pain.region.chest": "Kifua",
  "pain.region.left_shoulder": "Bega la kushoto",
  "pain.region.right_shoulder": "Bega la kulia",
  "pain.region.left_arm": "Mkono wa kushoto",
  "pain.region.right_arm": "Mkono wa kulia",
  "pain.region.stomach": "Tumbo",
  "pain.region.upper_back": "Mgongo wa juu",
  "pain.region.lower_back": "Mgongo wa chini",
  "pain.region.left_leg": "Mguu wa kushoto",
  "pain.region.right_leg": "Mguu wa kulia",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  "pain.sentence":
    "Nina maumivu {descriptor} katika {region}, kiwango cha {severity} kati ya 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Ukali",
  "pain.step.location": "Mahali",
  "pain.step.descriptor": "Maelezo",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Malengo Yangu",
  "wishes.worries.label": "Wasiwasi Wangu",
  "wishes.strength.label": "Nguvu Yangu",
  "wishes.joy.label": "Kinachonifurahisha",
  "wishes.tradeoffs.label": "Kuhusu Matibabu",
  "wishes.family.label": "Familia Yangu",
  "wishes.hopes.label": "Matumaini Yangu",

  // Questions
  "wishes.goals.question": "Malengo yako muhimu zaidi ni yapi?",
  "wishes.worries.question": "Wasiwasi wako wakubwa zaidi ni upi?",
  "wishes.strength.question": "Nini kinakupa nguvu?",
  "wishes.joy.question":
    "Nini kinakupatia furaha na maana maishani?",
  "wishes.tradeoffs.question":
    "Uko tayari kupitia nini ili kupata muda zaidi?",
  "wishes.family.question":
    "Watu wako wa karibu wanajua kiasi gani kuhusu matakwa yako?",
  "wishes.hopes.question": "Matumaini yako ni yapi?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "Kinachonijali zaidi",
  "wishes.worries.stem": "Wasiwasi wangu",
  "wishes.strength.stem": "Kinachonipa nguvu",
  "wishes.joy.stem": "Kinachonifurahisha",
  "wishes.tradeoffs.stem": "Kuhusu matibabu yangu",
  "wishes.family.stem": "Kuhusu familia yangu",
  "wishes.hopes.stem": "Tumaini langu",

  // Responses — goals
  "wishes.goals.r.family": "Kuwa na familia yangu",
  "wishes.goals.r.comfort": "Kuwa na raha bila maumivu",
  "wishes.goals.r.longevity": "Kuishi muda mrefu iwezekanavyo",
  "wishes.goals.r.home": "Kurudi nyumbani",
  "wishes.goals.r.independence": "Kuweza kujifanyia mambo mwenyewe",
  "wishes.goals.r.peace": "Kuwa na amani",

  // Responses — worries
  "wishes.worries.r.suffering": "Kuteseka au kuwa na maumivu",
  "wishes.worries.r.alone": "Kubaki peke yangu",
  "wishes.worries.r.burden": "Kuwa mzigo kwa familia yangu",
  "wishes.worries.r.activities": "Kutoweza kufanya mambo ninayofurahia",
  "wishes.worries.r.leaving": "Kuiacha familia yangu nyuma",
  "wishes.worries.r.unknown": "Kutojua kitakachotokea",

  // Responses — strength
  "wishes.strength.r.family": "Familia yangu",
  "wishes.strength.r.faith": "Imani yangu",
  "wishes.strength.r.friends": "Marafiki zangu",
  "wishes.strength.r.wishes_heard": "Kujua matakwa yangu yanasikika",
  "wishes.strength.r.hope": "Tumaini la kupona",
  "wishes.strength.r.carers": "Watu wanaonihudumia",

  // Responses — joy
  "wishes.joy.r.family": "Kutumia muda na familia",
  "wishes.joy.r.outdoors": "Kuwa nje",
  "wishes.joy.r.hobbies": "Mambo ninayopenda kufanya",
  "wishes.joy.r.helping": "Kusaidia wengine",
  "wishes.joy.r.spiritual": "Ibada yangu",
  "wishes.joy.r.routines": "Utaratibu wa kila siku",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Nataka matibabu yote yanayowezekana",
  "wishes.tradeoffs.r.good_chance":
    "Nataka matibabu ikiwa yana nafasi nzuri",
  "wishes.tradeoffs.r.try_stop":
    "Nataka kujaribu lakini kusimamisha ikiwa hayasaidii",
  "wishes.tradeoffs.r.comfortable": "Nataka kujikita kwenye raha",
  "wishes.tradeoffs.r.think": "Ninahitaji muda zaidi wa kufikiri",
  "wishes.tradeoffs.r.family_first":
    "Ninahitaji kuongea na familia yangu kwanza",

  // Responses — family
  "wishes.family.r.know_well": "Wanajua matakwa yangu vizuri",
  "wishes.family.r.know_some": "Wanajua baadhi ya matakwa yangu",
  "wishes.family.r.not_talked": "Bado hatujazungumza kuhusu hili",
  "wishes.family.r.need_help": "Ninahitaji msaada kuwaeleza",
  "wishes.family.r.team_explain":
    "Nataka timu ya huduma isaidie kueleza",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Kupona",
  "wishes.hopes.r.go_home": "Kurudi nyumbani",
  "wishes.hopes.r.comfortable": "Kuwa na raha",
  "wishes.hopes.r.family_ok": "Familia yangu itakuwa sawa",
  "wishes.hopes.r.more_time": "Kupata muda zaidi",
  "wishes.hopes.r.peace": "Kuwa na amani",

  // Wish sentence composition templates
  // TODO(translator): Verify "ni" works for all stem + list combinations
  "wishes.compose": "{stem} ni {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Nitamwita mtu akusaidie.",
  "provider.responses.interpreter": "Nitamwita mkalimani.",
  "provider.responses.family": "Nitawapigia familia yako.",
  "provider.responses.get_that": "Nitakuletea hicho.",
  "provider.responses.doctor_know": "Nitamjulisha daktari.",
  "provider.responses.medication": "Nitaleta dawa yako.",
  "provider.responses.family_coming": "Familia yako inakuja.",
  "provider.responses.doctor_soon": "Daktari atakuja hivi karibuni.",
  "provider.responses.doing_well": "Unafanya vizuri.",
  "provider.responses.rest": "Jaribu kupumzika sasa.",

  "provider.questions.feeling": "Unajisikiaje?",
  "provider.questions.need": "Kuna kitu unachohitaji?",
  "provider.questions.where_hurts":
    "Unaweza kunionyesha mahali panapokuuma?",
  "provider.questions.rate_pain": "Kadiria maumivu yako, 0 hadi 10.",
  "provider.questions.sleep": "Ulilala vizuri?",
  "provider.questions.comfortable": "Uko vizuri?",

  "provider.directions.procedure":
    "Utaratibu wako umepangwa leo.",
  "provider.directions.stay_in_bed": "Unahitaji kubaki kitandani.",
  "provider.directions.vitals": "Nitakagua dalili zako muhimu.",
  "provider.directions.medication_time": "Ni wakati wa dawa yako.",
  "provider.directions.breathe": "Jaribu kupumua kwa kina.",
  "provider.directions.call_button":
    "Bonyeza kitufe cha wito ukihitaji chochote.",

  "provider.goals_of_care.matters_most":
    "Ningependa kuzungumza kuhusu kinachokujali zaidi.",
  "provider.goals_of_care.goals":
    "Malengo yako muhimu zaidi sasa hivi ni yapi?",
  "provider.goals_of_care.worries":
    "Wasiwasi wako wakubwa zaidi ni upi?",
  "provider.goals_of_care.strength": "Nini kinakupa nguvu?",
  "provider.goals_of_care.joy":
    "Nini kinakupatia furaha na maana maishani?",
  "provider.goals_of_care.wishes":
    "Wapendwa wako wanajua kiasi gani kuhusu matakwa yako?",
  "provider.goals_of_care.hopes": "Matumaini yako ni yapi?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Nimelala vizuri",
  "time.morning.didnt_sleep": "Sikulala vizuri",
  "time.morning.breakfast": "Ninahitaji kiamsha kinywa",
  "time.morning.doctor_coming": "Daktari anakuja lini?",

  "time.afternoon.tired": "Nimechoka",
  "time.afternoon.lunch": "Ninaweza kupata chakula cha mchana?",
  "time.afternoon.see_family": "Nitawaona familia yangu lini?",
  "time.afternoon.rest": "Ninahitaji kupumzika",

  "time.evening.cant_sleep": "Siwezi kulala",
  "time.evening.medication": "Ninahitaji dawa yangu",
  "time.evening.call_family": "Ninaweza kuwapigia familia yangu?",
  "time.evening.pain": "Nina maumivu",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Swahili agglutinative verb morphology may not compose cleanly — review each path.
  "suggest.start.i_am": "Ni",
  "suggest.start.i_feel": "Ninahisi",
  "suggest.start.i_want": "Nataka",
  "suggest.start.i_need": "Ninahitaji",
  "suggest.start.please": "Tafadhali",
  "suggest.start.when": "Lini",
  "suggest.start.can_you": "Unaweza",
  "suggest.start.tell_me": "Niambie",

  "suggest.i_am.in_pain": "na maumivu",
  "suggest.i_am.cold": "na baridi",
  "suggest.i_am.hot": "na joto",
  "suggest.i_am.hungry": "na njaa",
  "suggest.i_am.thirsty": "na kiu",
  "suggest.i_am.tired": "nimechoka",
  "suggest.i_am.uncomfortable": "sijisikii vizuri",
  "suggest.i_am.okay": "sawa",
  "suggest.i_am.not_okay": "si sawa",
  "suggest.i_am.ready": "tayari",

  "suggest.i_feel.scared": "hofu",
  "suggest.i_feel.sick": "mgonjwa",
  "suggest.i_feel.dizzy": "kizunguzungu",
  "suggest.i_feel.weak": "udhaifu",
  "suggest.i_feel.better": "nafuu",
  "suggest.i_feel.worse": "vibaya zaidi",
  "suggest.i_feel.nauseous": "kichefuchefu",
  "suggest.i_feel.lonely": "upweke",
  "suggest.i_feel.confused": "kuchanganyikiwa",
  "suggest.i_feel.safe": "usalama",

  "suggest.i_feel_scared.procedure": "kuhusu utaratibu",
  "suggest.i_feel_scared.happening": "kuhusu kinachotokea",
  "suggest.i_feel_scared.alone": "kubaki peke yangu",
  "suggest.i_feel_scared.need_someone": "na ninahitaji mtu",

  "suggest.i_feel_sick.stomach": "tumboni",
  "suggest.i_feel_sick.dizzy": "na kizunguzungu",
  "suggest.i_feel_sick.help": "na ninahitaji msaada",

  "suggest.i_want.water": "maji",
  "suggest.i_want.family": "familia yangu",
  "suggest.i_want.go_home": "kurudi nyumbani",
  "suggest.i_want.sleep": "kulala",
  "suggest.i_want.medication": "dawa yangu",
  "suggest.i_want.blanket": "blanketi",
  "suggest.i_want.talk": "kuzungumza na mtu",
  "suggest.i_want.nurse": "muuguzi",

  "suggest.i_want_to_go.home": "nyumbani",
  "suggest.i_want_to_go.sleep": "kulala",
  "suggest.i_want_to_go.bathroom": "chooni",

  "suggest.i_want_my.family": "familia",
  "suggest.i_want_my.medication": "dawa",
  "suggest.i_want_my.phone": "simu",
  "suggest.i_want_my.glasses": "miwani",
  "suggest.i_want_my.blanket": "blanketi",

  "suggest.i_need.help": "msaada",
  "suggest.i_need.water": "maji",
  "suggest.i_need.bathroom": "choo",
  "suggest.i_need.medication": "dawa yangu",
  "suggest.i_need.nurse": "muuguzi",
  "suggest.i_need.doctor": "daktari",
  "suggest.i_need.rest": "kupumzika",
  "suggest.i_need.blanket": "blanketi",
  "suggest.i_need.suction": "kufanyiwa suction",

  "suggest.i_need_the.nurse": "muuguzi",
  "suggest.i_need_the.doctor": "daktari",
  "suggest.i_need_the.bathroom": "choo",
  "suggest.i_need_the.light_off": "kuzima taa",
  "suggest.i_need_the.light_on": "kuwasha taa",

  "suggest.i_need_my.medication": "dawa",
  "suggest.i_need_my.family": "familia",
  "suggest.i_need_my.glasses": "miwani",
  "suggest.i_need_my.phone": "simu",

  "suggest.please.help_me": "nisaidie",
  "suggest.please.call_family": "wapigie familia yangu",
  "suggest.please.light_off": "zima taa",
  "suggest.please.adjust_bed": "rekebisha kitanda changu",
  "suggest.please.give_me": "nipe",
  "suggest.please.explain": "eleza",
  "suggest.please.come_back": "rudi hivi karibuni",
  "suggest.please.stay": "kaa nami",
  "suggest.please.dont_leave": "usiende",

  "suggest.please_help_me.pain": "Nina maumivu",
  "suggest.please_help_me.breathe": "Sipumui vizuri",
  "suggest.please_help_me.sick": "Ninahisi mgonjwa",
  "suggest.please_help_me.scared": "Ninaogopa",

  "suggest.please_give_me.water": "maji",
  "suggest.please_give_me.medication": "dawa yangu",
  "suggest.please_give_me.blanket": "blanketi",
  "suggest.please_give_me.pain_relief": "kitu cha maumivu",

  "suggest.when.go_home": "ninaweza kurudi nyumbani?",
  "suggest.when.family": "familia yangu inakuja?",
  "suggest.when.medication": "ni dawa yangu ya pili?",
  "suggest.when.doctor": "daktari anakuja?",
  "suggest.when.eat": "ninaweza kula?",
  "suggest.when.over": "hii itaisha?",

  "suggest.can_you.help": "kunisaidia?",
  "suggest.can_you.call_family": "kuwapigia familia yangu?",
  "suggest.can_you.get_nurse": "kumwita muuguzi?",
  "suggest.can_you.explain": "kueleza kinachotokea?",
  "suggest.can_you.light_off": "kuzima taa?",
  "suggest.can_you.adjust_bed": "kurekebisha kitanda changu?",
  "suggest.can_you.stay": "kukaa nami?",

  "suggest.tell_me.happening": "kinachotokea",
  "suggest.tell_me.time": "saa ngapi",
  "suggest.tell_me.go_home": "nitarudi nyumbani lini",
  "suggest.tell_me.day": "leo ni siku gani",
  "suggest.tell_me.treatment": "kuhusu matibabu yangu",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "tafadhali nisaidie",
  "suggest.i_am_in_pain.worse": "na yanazidi",
  "suggest.i_am_in_pain.medication": "na ninahitaji dawa",
  "suggest.i_am_in_pain.back": "mgongoni",
  "suggest.i_am_in_pain.chest": "kifuani",
  "suggest.i_am_in_pain.stomach": "tumboni",

  // After "I need help"
  "suggest.i_need_help.up": "kuinuka",
  "suggest.i_need_help.breathing": "kupumua",
  "suggest.i_need_help.pain": "na maumivu",
  "suggest.i_need_help.now": "sasa hivi",
  "suggest.i_need_help.please": "tafadhali",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "kuliko awali",
  "suggest.i_feel_better.now": "sasa",
  "suggest.i_feel_better.thanks": "asante",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "kuliko awali",
  "suggest.i_feel_worse.need_doctor": "Ninahitaji daktari",
  "suggest.i_feel_worse.help": "tafadhali nisaidie",
  "suggest.i_feel_worse.medication": "Ninahitaji dawa",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "Ninahisi",
  "suggest.ctx.feeling.i_am": "Ni",
  "suggest.ctx.feeling.better": "Nafuu kuliko awali",
  "suggest.ctx.feeling.not_great": "Si vizuri",
  "suggest.ctx.feeling.pain": "Nina maumivu",
  "suggest.ctx.feeling.okay": "Niko sawa",
  "suggest.ctx.feeling.help": "Unaweza kunisaidia?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "Ninahitaji",
  "suggest.ctx.need.i_want": "Nataka",
  "suggest.ctx.need.fine": "Niko sawa kwa sasa",
  "suggest.ctx.need.yes": "Ndiyo, tafadhali",
  "suggest.ctx.need.no": "Hapana, asante",
  "suggest.ctx.need.stay": "Unaweza kukaa?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "Kichwa changu",
  "suggest.ctx.where_hurts.chest": "Kifua changu",
  "suggest.ctx.where_hurts.stomach": "Tumbo langu",
  "suggest.ctx.where_hurts.back": "Mgongo wangu",
  "suggest.ctx.where_hurts.left_arm": "Mkono wangu wa kushoto",
  "suggest.ctx.where_hurts.right_leg": "Mguu wangu wa kulia",
  "suggest.ctx.where_hurts.everywhere": "Kila mahali",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "Ni mabaya sana",
  "suggest.ctx.pain.worse": "Yanazidi kuwa mabaya",
  "suggest.ctx.pain.same": "Ni sawa na awali",
  "suggest.ctx.pain.little_better": "Ni bora kidogo",
  "suggest.ctx.pain.need_relief": "Ninahitaji kitu cha maumivu",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "Niko vizuri",
  "suggest.ctx.comfort.not_comfortable": "Siko vizuri",
  "suggest.ctx.comfort.cant_sleep": "Siwezi kulala",
  "suggest.ctx.comfort.cold": "Nina baridi",
  "suggest.ctx.comfort.hot": "Nina joto",
  "suggest.ctx.comfort.adjust_bed": "Unaweza kurekebisha kitanda changu?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "Siwezi kulala",
  "suggest.ctx.night.i_need": "Ninahitaji",
  "suggest.ctx.night.pain": "Nina maumivu",
  "suggest.ctx.night.i_feel": "Ninahisi",
  "suggest.ctx.night.can_you": "Unaweza",
  "suggest.ctx.night.please": "Tafadhali",
  "suggest.ctx.night.i_am": "Ni",
  "suggest.ctx.night.when": "Lini",

  // Morning starters
  "suggest.ctx.morning.i_am": "Ni",
  "suggest.ctx.morning.i_need": "Ninahitaji",
  "suggest.ctx.morning.i_feel": "Ninahisi",
  "suggest.ctx.morning.doctor": "Daktari anakuja lini?",
  "suggest.ctx.morning.i_want": "Nataka",
  "suggest.ctx.morning.can_you": "Unaweza",
  "suggest.ctx.morning.please": "Tafadhali",
  "suggest.ctx.morning.tell_me": "Niambie",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Haraka",
  "cat.needs": "Ninahitaji",
  "cat.feelings": "Ninahisi",
  "cat.pain": "Maumivu",
  "cat.questions": "Uliza",
  "sub.comfort": "Faraja",
  "sub.medical": "Matibabu",
  "sub.people": "Watu",
  "sub.physical": "Kimwili",
  "sub.emotional": "Kihisia",

  // Provider category labels
  "provider.cat.responses": "Majibu",
  "provider.cat.questions": "Maswali",
  "provider.cat.directions": "Maelekezo",
  "provider.cat.goals_of_care": "Malengo ya Huduma",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — mazungumzo ya {name}",
  "ui.patient.app.name_fallback": "Mgonjwa",
  "ui.patient.header.name_fallback": "Mgonjwa",
  "ui.patient.header.bed_prefix": "Kitanda ",
  "ui.dual.nav.wishes": "Matakwa",
  "ui.dual.nav.listen": "Sikiliza",
  "ui.provider.nav.staff": "Wafanyakazi",
  "ui.provider.nav.switch_patient": "Badili Mgonjwa",
  "ui.provider.nav.settings": "Mipangilio",
  "ui.provider.nav.theme.auto": "Otomatiki",
  "ui.provider.nav.theme.light": "Mwanga",
  "ui.provider.nav.theme.dark": "Giza",
  "ui.patient.tabbar.say_more": "Sema Zaidi",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Una maumivu kiasi gani?",
  "ui.dual.pain.heading.location": "Maumivu yako yako wapi?",
  "ui.dual.pain.heading.descriptor": "Maumivu yanajisikiaje?",
  "ui.patient.pain.step_of": "Hatua {n} ya {total}",
  "ui.patient.pain.back_to": "Rudi kwa {label}",
  "ui.patient.pain.level_aria": "Kiwango cha maumivu {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Matakwa ya {name}",
  "ui.patient.wishes.my_wishes": "Matakwa Yangu",
  "ui.patient.wishes.step_of": "Hatua {n} ya {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Hakuna matakwa yaliyoshirikiwa.",
  "ui.patient.wishes.share_all_again": "Shiriki matakwa yote tena",
  "ui.patient.wishes.close": "Funga",
  "ui.patient.wishes.share": "Shiriki",
  "ui.patient.wishes.skip": "Ruka",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Gusa maneno hapo chini au andika...",
  "ui.patient.builder.message_aria": "Ujumbe wako",
  "ui.patient.builder.undo": "Ondoa neno la mwisho",
  "ui.patient.builder.clear": "Futa ujumbe",
  "ui.patient.builder.refresh_ai": "Onyesha upya mapendekezo ya AI",
  "ui.patient.builder.ai_thinking": "AI inafikiria...",
  "ui.patient.builder.no_ai_suggestions":
    "Hakuna mapendekezo ya AI. Gusa onyesha upya kujaribu tena.",
  "ui.patient.builder.ready":
    "Ujumbe wako uko tayari. Gusa Sema kutuma.",
  "ui.patient.builder.speak": "Sema",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Rudia: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Timu ya Huduma",
  "ui.provider.fallback_name": "Mhudumu",
  "ui.provider.speaking_to": "Unazungumza na {name} kama {prov}",
  "ui.provider.patient_fallback": "mgonjwa",
  "ui.provider.close_panel": "Funga paneli",
  "ui.provider.select_provider": "Chagua {name}",
  "ui.provider.show_category": "Onyesha {key}",
  "ui.provider.speak_phrase": "Sema: {phrase}",
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
  "ui.provider.listen.title": "Sikiliza",
  "ui.provider.listen.stop_aria": "Acha kusikiliza",
  "ui.provider.listen.start_aria": "Gusa kuanza kusikiliza",
  "ui.provider.listen.listening": "Inasikiliza...",
  "ui.provider.listen.transcribing": "Inandika...",
  "ui.provider.listen.listening_placeholder": "Inasikiliza usemi...",
  "ui.provider.listen.transcribing_placeholder": "Inandika usemi...",
  "ui.provider.listen.type_placeholder": "Au andika kilichosemwa...",
  "ui.provider.listen.transcript_aria": "Maandishi",
  "ui.provider.listen.audio_level_aria": "Kiwango cha sauti cha kipaza sauti",
  "ui.provider.listen.add_as": "Ongeza kwenye mazungumzo kama {prov}",
  "ui.provider.listen.privacy_notice":
    "Kwenye kifaa · Whisper · hakuna sauti inayotoka kwenye kifaa hiki",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Inasema: {text}",
  "ui.dual.speaking.patient_voice": "Sauti yako",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Weka PIN",
  "ui.provider.pin_gate.subtitle": "Ufikiaji wa wafanyakazi pekee",
  "ui.provider.pin_gate.incorrect": "PIN si sahihi",
  "ui.provider.pin_gate.delete_aria": "Futa",
  "ui.provider.pin_gate.digit_aria": "Tarakimu {n}",
  "ui.provider.pin_gate.cancel": "Ghairi",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Unakaribia kusoma sentensi kwa sauti.",
  "ui.provider.voice_capture.coaching_breath":
    "Pumua kwa kina mara kadhaa.",
  "ui.provider.voice_capture.coaching_ready": "Tayari.",
  "ui.provider.voice_capture.breathe_in": "Vuta pumzi...",
  "ui.provider.voice_capture.breathe_out": "Toa pumzi...",
  "ui.provider.voice_capture.creating": "Inaunda nakala ya sauti...",
  "ui.provider.voice_capture.creating_from_sample":
    "Inaunda nakala ya sauti kutoka sampuli...",
  "ui.provider.voice_capture.loading_model":
    "Modeli ya sauti inapakia...",
  "ui.provider.voice_capture.clone_failed": "Nakala ya sauti imeshindwa",
  "ui.provider.voice_capture.captured": "Sauti imenaswa",
  "ui.provider.voice_capture.stop": "Simamisha",
  "ui.provider.voice_capture.play": "Cheza",
  "ui.provider.voice_capture.discard": "Tupa rekodi",
  "ui.provider.voice_capture.use_recording": "Tumia rekodi hii",
  "ui.provider.voice_capture.upload_file": "Pakia faili",
  "ui.provider.voice_capture.record": "Rekodi",
  "ui.provider.voice_capture.stop_early": "Simamisha mapema",
  "ui.provider.voice_capture.remove": "Ondoa",
  "ui.provider.voice_capture.retry": "Jaribu tena",
  "ui.provider.voice_capture.done": "Imekamilika!",
  "ui.provider.voice_capture.cancel": "Ghairi",
  "ui.provider.voice_capture.seconds_recorded": "sekunde {n} zimerekodiwa",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Ghairi hesabu ya kurekodi",
  "ui.provider.voice_capture.stop_early_aria":
    "Simamisha kurekodi mapema",
  "ui.provider.voice_capture.audio_level_aria": "Kiwango cha sauti",
  "ui.provider.voice_capture.recording_progress_aria":
    "Maendeleo ya kurekodi",
  "ui.provider.voice_capture.stop_preview_aria":
    "Simamisha kucheza hakikisho",
  "ui.provider.voice_capture.play_preview_aria":
    "Cheza hakikisho la rekodi",
  "ui.provider.voice_capture.discard_aria":
    "Tupa rekodi hii na uanze upya",
  "ui.provider.voice_capture.stop_playback_aria":
    "Simamisha kucheza sampuli iliyorekodiwa",
  "ui.provider.voice_capture.play_sample_aria":
    "Cheza sampuli ya sauti iliyorekodiwa",
  "ui.provider.voice_capture.remove_aria": "Ondoa sampuli ya sauti",
  "ui.provider.voice_capture.retry_aria":
    "Jaribu tena kutoa nakala ya sauti",
  "ui.provider.voice_capture.upload_aria":
    "Pakia sampuli ya sauti kutoka faili",
  "ui.provider.voice_capture.record_aria":
    "Rekodi sampuli ya sauti kutoka maikrofoni",
  "ui.provider.voice_capture.err_network":
    "Haikuweza kufikia modeli ya sauti. Angalia muunganisho wako, kisha gusa Jaribu tena.",
  "ui.provider.voice_capture.err_timeout":
    "Uchakataji wa sauti ulichukua muda mrefu sana. Gusa Jaribu tena.",
  "ui.provider.voice_capture.err_mic_denied":
    "Ufikiaji wa maikrofoni umezuiwa. Wezesha katika mipangilio ya kivinjari au pakia faili badala yake.",
  "ui.provider.voice_capture.err_generic":
    "Hatukuweza kumaliza kuandaa sauti yako. Gusa Jaribu tena.",
  "ui.provider.voice_capture.err_too_short":
    "Rekodi ilikuwa fupi sana. Ongea wakati wote wa kuhesabu nyuma, kisha uguse Jaribu tena.",
  "ui.provider.voice_capture.err_too_noisy":
    "Kelele za mazingira zilikuwa kubwa sana kwa kunakili sauti safi. Nenda mahali patulivu zaidi kisha uguse Jaribu tena.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Ufikiaji wa maikrofoni umekataliwa. Jaribu kupakia faili badala yake.",
  "ui.provider.voice_capture.err_playback":
    "Haikuweza kucheza sauti.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Iliyoboreshwa",
  "ui.provider.fallback_voice.enhanced_aria": "Sauti ya neural iliyoboreshwa",
  "ui.provider.fallback_voice.on_device_badge": "Kwenye kifaa",
  "ui.provider.fallback_voice.playing": "Inacheza...",
  "ui.provider.fallback_voice.unavailable":
    "Sauti za mfumo hazipatikani kwenye kifaa hiki.",
  "ui.provider.fallback_voice.loading":
    "Inapakia sauti zinazopatikana...",
  "ui.provider.fallback_voice.hide_others": "Ficha sauti nyingine",
  "ui.provider.fallback_voice.more_voices": "Sauti zaidi ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  // Step labels (progress bar)
  "ui.provider.setup.steps.patient": "Mgonjwa",
  "ui.provider.setup.steps.voice": "Sauti",
  "ui.provider.setup.steps.care_team": "Timu",
  "ui.provider.setup.steps.confirm": "Thibitisha",

  // Skip button + confirm dialog
  "ui.provider.setup.skip": "Ruka →",
  "ui.provider.setup.skip_aria": "Ruka usanidi",
  "ui.provider.setup.skip_dialog.title": "Ruka usanidi?",
  "ui.provider.setup.skip_dialog.body": "Anza kutumia OwnVoice sasa. Unaweza kumaliza usanidi baadaye kwa kugusa jina la mgonjwa kwenye kichwa.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Hakuna mgonjwa atakayeongezwa.",
  "ui.provider.setup.skip_dialog.confirm": "Ruka usanidi",
  "ui.provider.setup.skip_dialog.cancel": "Endelea",

  // Navigation
  "ui.provider.setup.back": "Rudi",
  "ui.provider.setup.continue": "Endelea",
  "ui.provider.setup.start": "Anza OwnVoice",

  // Step 0: Patient info
  "ui.provider.setup.step0.heading": "Karibu OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Tuandae ubao wako wa mawasiliano. Kila kitu kinabaki kwenye kifaa hiki.",
  "ui.provider.setup.step0.name_label": "Jina la mgonjwa",
  "ui.provider.setup.step0.name_placeholder":
    "Jina la kwanza au jina analopendwa",
  "ui.provider.setup.step0.bed_label": "Kitanda / Chumba",
  "ui.provider.setup.step0.bed_placeholder": "k.m. 4B-12",
  "ui.provider.setup.step0.language_label": "Lugha",

  // Step 1: Voice sample
  "ui.provider.setup.step1.heading": "Sampuli ya sauti",
  "ui.provider.setup.step1.body1":
    "Nasa sampuli ya sauti ili OwnVoice izungumze kwa sauti ya mgonjwa. Hatua hii si lazima.",
  "ui.provider.setup.step1.body2":
    "Kunakili sauti kunafanywa kwenye kifaa. Hakuna sauti inayotoka kwenye kibao hiki.",
  "ui.provider.setup.step1.patient_label": "Mgonjwa",
  "ui.provider.setup.step1.backup_voice_heading": "Sauti mbadala",
  "ui.provider.setup.step1.backup_voice_body1":
    "Chagua sauti ya mfumo itakayotumika wakati nakala ya sauti inapakia, au kama hakuna sampuli iliyorekodiwa. Gusa sauti kusikia hakikisho.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Hii inatumia usanisi wa sauti uliojengwa ndani ya kifaa chako.",

  // Step 2: Care team
  "ui.provider.setup.step2.heading": "Timu ya huduma",
  "ui.provider.setup.step2.body":
    "Ongeza wahudumu watakaomhudumia mgonjwa huyu.",
  "ui.provider.setup.step2.icon_label": "Ikoni",
  "ui.provider.setup.step2.name_label": "Jina",
  "ui.provider.setup.step2.name_placeholder":
    "Dk. Mwangi, Muuguzi Amina...",
  "ui.provider.setup.step2.add": "Ongeza",

  // Step 3: Confirm
  "ui.provider.setup.step3.heading": "Tayari kuanza",
  "ui.provider.setup.step3.body":
    "Kagua usanidi wako. Unaweza kubadilisha chochote baadaye katika Mipangilio.",
  "ui.provider.setup.step3.summary.patient": "Mgonjwa",
  "ui.provider.setup.step3.summary.bed": "Kitanda / Chumba",
  "ui.provider.setup.step3.summary.language": "Lugha",
  "ui.provider.setup.step3.summary.language_default": "Kiingereza",
  "ui.provider.setup.step3.summary.voice": "Sauti",
  "ui.provider.setup.step3.summary.care_team": "Timu ya huduma",
  "ui.provider.setup.step3.summary.not_set": "Haijawekwa",
  "ui.provider.setup.step3.summary.captured": "Imenaswa",
  "ui.provider.setup.step3.summary.not_captured": "Haijanaswa",
  "ui.provider.setup.step3.summary.none_added": "Hakuna aliyeongezwa",
  "ui.provider.setup.step3.pin_label": "PIN ya wafanyakazi (hiari)",
  "ui.provider.setup.step3.pin_body":
    "Weka PIN ya tarakimu 4 kulinda mipangilio ya mhudumu.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Mipangilio",
  "ui.provider.settings.done": "Tayari",
  "ui.provider.settings.close_aria": "Funga mipangilio",

  "ui.provider.patient_edit.title": "Hariri {name}",
  "ui.provider.patient_edit.title_default": "Hariri mgonjwa",
  "ui.provider.patient_edit.close_aria": "Funga kihariri cha mgonjwa",
  "ui.provider.patient_pill.aria": "Hariri mgonjwa: {name}",
  "ui.provider.nav.staff_menu": "Mipangilio",
  "ui.provider.staff_sheet.title": "Wafanyakazi",
  "ui.provider.staff_sheet.close_aria": "Funga menyu ya wafanyakazi",
  "ui.provider.staff_sheet.patients_description": "Badilisha, ongeza au hariri wagonjwa",
  "ui.provider.staff_sheet.settings_description": "Timu ya utunzaji, ufikivu, nje ya mtandao",
  "ui.provider.staff_sheet.end_session_description": "Toka katika hali ya wafanyakazi",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Tupa maandalizi ya sauti ya {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "Maendeleo ({current} / {total} misemo) yatapotea. Sampuli ya sauti iliyorekodiwa imehifadhiwa — unaweza kuanza tena maandalizi baadaye.",
  "ui.provider.settings.voice_cache.cancel": "Ghairi",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Ghairi na uhifadhi maandalizi ya sauti",
  "ui.provider.settings.voice_cache.discard_confirm": "Tupa",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Thibitisha kutupa maandalizi ya sauti",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Tupa maandalizi ya sauti ya {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "Imepangwa — sauti ya {label} itaandaliwa ifuatayo (misemo {total}{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Inaandaa sauti ya {label}... {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Imesimamishwa — sauti ya {label}... {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Endelea",
  "ui.provider.settings.voice_cache.resume_aria":
    "Endelea kuandaa sauti ya {label}",
  "ui.provider.settings.voice_cache.pause": "Simamisha",
  "ui.provider.settings.voice_cache.pause_aria":
    "Simamisha kuandaa sauti ya {label}",
  "ui.provider.settings.voice_cache.done":
    "Nakala ya sauti hai — misemo yote {total} tayari kwa sauti ya {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "Misemo {count}{plural} imeshindwa kwa {label}",
  "ui.provider.settings.voice_cache.retry": "Jaribu tena",
  "ui.provider.settings.voice_cache.retry_aria":
    "Jaribu tena misemo iliyoshindwa ya hifadhi ya sauti",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Kuhusu",
  "ui.provider.settings.about.subtitle":
    "Msaidizi wa mawasiliano AAC kwa wagonjwa hospitalini.",
  "ui.provider.settings.about.attribution_1":
    "Kipimo cha maumivu: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Malengo ya huduma: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Hifadhi SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Weka upya",
  "ui.provider.settings.reset.action_label":
    "Weka programu upya kwa mgonjwa mpya",
  "ui.provider.settings.reset.confirm_title": "Una uhakika?",
  "ui.provider.settings.reset.confirm_body":
    "Hii itafuta data zote za mgonjwa, sampuli za sauti, historia ya mazungumzo, na mipangilio ya mhudumu. Hii haiwezi kutendwa upya.",
  "ui.provider.settings.reset.confirm_destructive": "Weka upya kila kitu",
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
  "ui.provider.settings.accessibility.heading": "Ufikiaji",
  "ui.provider.settings.accessibility.toggle_label":
    "Hali ya Kuingiza kwa Msaada",
  "ui.provider.settings.accessibility.toggle_description":
    "Inakuza pete za kuzingatia, inaongeza muda wa kugusa, na kuimarisha maoni kwa wagonjwa wanaotumia trackball, joystick, kielekezi cha AssistiveTouch, au swichi.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Kielekezi cha nje kimegunduliwa.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Fikiria kuwezesha Hali ya Kuingiza kwa Msaada kwa mgonjwa huyu.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Wagonjwa",
  "ui.provider.settings.patients.active_remove_hint":
    "Badili kwa mgonjwa mwingine kabla ya kuondoa huyu.",
  "ui.provider.settings.patients.remove_button": "Ondoa",
  "ui.provider.settings.patients.add_patient": "+ Ongeza Mgonjwa",
  "ui.provider.settings.patients.remove_dialog.title":
    "Ondoa {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Hii itafuta sampuli yake ya sauti, historia ya mazungumzo, na sauti iliyohifadhiwa kwa nakala ya sauti. Nakala za sauti za timu ya huduma zimehifadhiwa kwa wagonjwa wengine. Hii haiwezi kutendwa upya.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Ondoa",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Timu ya Huduma",
  "ui.provider.settings.care_team.empty":
    "Bado hakuna wahudumu walioongezwa.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Taarifa za Mgonjwa",
  "ui.provider.settings.patient_info.name_label": "Jina",
  "ui.provider.settings.patient_info.bed_label": "Kitanda / Chumba",
  "ui.provider.settings.patient_info.language_label": "Lugha",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Lugha ya mgonjwa",
  "ui.provider.settings.lang.caregiver_section":
    "Lugha ya timu ya huduma",
  "ui.provider.settings.lang.caregiver_helper":
    "Lugha ambayo timu yako ya huduma inaielewa. Kawaida huwekwa mara moja kwa kila kifaa.",
  "ui.provider.settings.lang.change": "Badili lugha",

  "ui.provider.settings.lang.picker_title": "Chagua lugha",
  "ui.provider.settings.lang.patient_dialog.title":
    "Badili lugha ya mgonjwa kuwa {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Nakala yako ya sauti inabaki tayari — misemo unayogusa itaendelea kusikika sawa. Tutaandaa sauti kwa sauti {providerCount} za timu (~dakika {estimatedMinutes}). Unaweza kuendelea kutumia programu wakati huu.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Nakala za sauti za timu ya huduma hazipatikani kwa {lang} — sauti ya mfumo itatumika badala yake. Rekodi zilizopo zimehifadhiwa ikiwa utabadili lugha inayotumika baadaye.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Misemo unayogusa itaendelea kusikika sawa. Hakuna sauti za timu zilizosanidiwa, kwa hivyo hakuna kitakachohitaji kuzalishwa upya.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Badili lugha ya timu ya huduma kuwa {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Nakala za sauti za timu yako zinabaki tayari. Tutaandaa sauti za mgonjwa katika lugha mpya (~dakika {estimatedMinutes}). Unaweza kuendelea kutumia programu wakati huu.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Nakala ya sauti ya mgonjwa haipatikani kwa {lang} — sauti ya mfumo itatumika badala yake. Sampuli ya sauti ya mgonjwa iliyorekodiwa imehifadhiwa ikiwa utabadili lugha inayotumika baadaye.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Hakuna nakala ya sauti ya mgonjwa iliyosanidiwa, kwa hivyo hakuna kitakachohitaji kuzalishwa upya.",
  "ui.provider.settings.patient_info.voice_label": "Sauti",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Sauti mbadala",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Sauti ya mfumo inayotumika wakati nakala ya sauti inapakia. Gusa kusikiliza.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Uchunguzi wa programu",
  "ui.provider.settings.offline.status_description":
    "Hali ya modeli za AI ambazo programu inatumia kwenye kifaa kwa uzalishaji wa sauti, mapendekezo, na utambuzi wa usemi.",
  "ui.provider.settings.offline.downloading":
    "Inapakua modeli...",
  "ui.provider.settings.offline.download_progress_aria":
    "Maendeleo ya kupakua modeli",
  "ui.provider.settings.offline.all_ready":
    "Modeli zote tayari",
  "ui.provider.settings.offline.redownload_button":
    "Pakua tena modeli",
  "ui.provider.settings.offline.already_up_to_date":
    "Tayari zimesasishwa",
  "ui.provider.settings.offline.checking": "Inakagua...",
  "ui.provider.settings.offline.verified": "✓ Modeli zimethibitishwa",
  "ui.provider.settings.offline.check_button":
    "Kagua modeli zilizopo",
  "ui.provider.settings.offline.redownloading":
    "Inapakua tena...",
  "ui.provider.settings.offline.force_redownload_button":
    "Lazimisha kupakua tena modeli zote",
  "ui.provider.settings.offline.model_status_ready": "tayari",
  "ui.provider.settings.offline.model_status_downloading":
    "inapakua...",
  "ui.provider.settings.offline.model_status_needs_retry":
    "inahitaji kujaribu tena",
  "ui.provider.settings.offline.last_verified_prefix":
    "Mara ya mwisho kuthibitishwa: ",
  "ui.provider.settings.offline.storage_prefix": "Hifadhi: ",
  "ui.provider.settings.offline.storage_of": " ya ",
  "ui.provider.settings.offline.storage_used": " imetumika",
  "ui.provider.settings.offline.storage_low": " — inakaribia kuisha",
  "ui.provider.settings.offline.clear_audio_cache":
    "Futa hifadhi ya sauti",
  "ui.provider.settings.offline.clearing": "Inafuta...",
  "ui.provider.settings.offline.rebuilding":
    "Inajenga upya: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Pakua tena modeli zote za AI?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Hii itapakua takriban GB 1.7. Usanisi wa sauti utaendelea kufanya kazi wakati wa usasishaji.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Pakua tena",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Badili Mgonjwa",
  "ui.provider.switch.add_patient": "+ Ongeza Mgonjwa",
  "ui.provider.patients.title": "Wagonjwa",
  "ui.provider.patients.actions_aria": "Vitendo kwa {name}",
  "ui.provider.patients.action_edit": "Hariri",
  "ui.provider.patients.action_remove": "Ondoa",
  "ui.provider.switch.voice_captured": "Sauti imenaswa",
  "ui.provider.switch.no_voice": "Hakuna sauti",
  "ui.provider.switch.last_active_just_now": "Sasa hivi",
  "ui.provider.switch.last_active_minutes":
    "Alitumika dakika {n} zilizopita",
  "ui.provider.switch.last_active_hours": "Alitumika saa {n} zilizopita",
  "ui.provider.switch.last_active_days": "Alitumika siku {n} zilizopita",
  "ui.provider.switch.currently_active": "Anatumika sasa",
  "ui.provider.switch.switched_announcement":
    "Umebadili kwa {name}. Jumbe {count} za mazungumzo.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Kipindi cha wafanyakazi kinaisha",
  "ui.provider.staff_session.warning_body":
    "Ufikiaji wako wa wafanyakazi utafungwa baada ya sekunde {n}.",
  "ui.provider.staff_session.extend": "Ongeza kipindi",
  "ui.provider.staff_session.end_now": "Maliza sasa",
  "ui.provider.nav.end_staff_session": "Maliza kipindi cha wafanyakazi",
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
  "ui.voice_quality.title": "Ubora wa sauti",
  "ui.voice_quality.label.good": "Nzuri",
  "ui.voice_quality.label.ok": "Sawa",
  "ui.voice_quality.label.poor": "Inahitaji uboreshaji",
  "ui.voice_quality.tip.snr": "Jaribu kurekodi mahali tulivu zaidi.",
  "ui.voice_quality.tip.clipping": "Jiondoe kidogo kutoka kwa kipaza sauti.",
  "ui.voice_quality.tip.coverage": "Jaribu kusoma kwa muda mrefu kidogo.",
  "ui.voice_quality.tip.voiced_fraction": "Jaribu kuendelea kuongea kwa muda wote wa kurekodi.",
  "ui.voice_quality.tip.pitch_variation": "Soma kwa njia ya asili zaidi — acha sauti yako ipande na kushuka.",
  "ui.voice_quality.tip.loudness": "Jaribu kudumisha sauti ya kiwango sawa.",
  "ui.voice_quality.tip.tilt_boomy": "Jaribu kujiondoa zaidi kutoka kwa kipaza sauti.",
  "ui.voice_quality.tip.tilt_tinny": "Kipaza sauti hiki kinasikika nyembamba — jaribu kingine ikiwa unacho.",
};

export default sw;
