/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Arabic (MSA / Modern Standard Arabic)
 * Locale: ar
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const ar: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "نعم",
  "quick.no": "لا",
  "quick.thank_you": "شكراً",
  "quick.please_wait": "انتظر من فضلك",
  "quick.dont_understand": "لا أفهم",
  "quick.repeat": "أعد ذلك من فضلك",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "أحتاج ماءً",
  "needs.comfort.hungry": "أنا جائع",
  "needs.comfort.cold": "أشعر بالبرد",
  "needs.comfort.hot": "أشعر بالحر",
  "needs.comfort.bed": "اضبط سريري",
  "needs.comfort.bathroom": "أحتاج دورة المياه",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "أحتاج دوائي",
  "needs.medical.suction": "أحتاج شفطاً",
  "needs.medical.nauseous": "أشعر بالغثيان",
  "needs.medical.breathe": "لا أستطيع التنفس جيداً",
  "needs.medical.nurse": "أحتاج الممرض",
  "needs.medical.doctor": "أحتاج الطبيب",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "أريد عائلتي",
  "needs.people.stay": "هل يمكن لأحد البقاء معي؟",
  "needs.people.call": "أريد الاتصال بشخص ما",
  "needs.people.interpreter": "أحتاج مترجماً",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "أنا متعب",
  "feelings.physical.uncomfortable": "أشعر بعدم الراحة",
  "feelings.physical.weak": "أشعر بالضعف",
  "feelings.physical.better": "أشعر بتحسن",
  "feelings.physical.dizzy": "أشعر بالدوار",
  "feelings.physical.itchy": "أشعر بالحكة",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "أنا خائف",
  "feelings.emotional.lonely": "أشعر بالوحدة",
  "feelings.emotional.frustrated": "أشعر بالإحباط",
  "feelings.emotional.confused": "أنا مرتبك",
  "feelings.emotional.safe": "أشعر بالأمان",
  "feelings.emotional.grateful": "أنا ممتن",
  "feelings.emotional.worried": "أنا قلق",
  "feelings.emotional.hopeful": "عندي أمل",
  "feelings.emotional.bored": "أشعر بالملل",
  "feelings.emotional.embarrassed": "أشعر بالحرج",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "كم الساعة؟",
  "questions.day": "ما هو اليوم؟",
  "questions.whats_happening": "ماذا يحدث لي؟",
  "questions.go_home": "متى أستطيع العودة للمنزل؟",
  "questions.next_medication": "متى موعد دوائي القادم؟",
  "questions.explain_treatment": "هل يمكنك شرح علاجي؟",
  "questions.nurse_today": "من هو ممرضي اليوم؟",
  "questions.eat_drink": "هل يمكنني الأكل أو الشرب؟",
  "questions.see_family": "متى أستطيع رؤية عائلتي؟",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "لا ألم",
  "pain.face.2": "ألم خفيف",
  "pain.face.4": "ألم أكثر قليلاً",
  "pain.face.6": "ألم أشد",
  "pain.face.8": "ألم شديد جداً",
  "pain.face.10": "أسوأ ألم",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "موجع",
  "pain.descriptor.burning": "حارق",
  "pain.descriptor.sharp": "حاد",
  "pain.descriptor.throbbing": "نابض",
  "pain.descriptor.cramping": "تشنجي",
  "pain.descriptor.constant": "مستمر",
  "pain.descriptor.comes_and_goes": "متقطع",
  "pain.descriptor.numb": "خدر",
  "pain.descriptor.pressure": "ضغط",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "الرأس",
  "pain.region.face": "الوجه",
  "pain.region.neck": "الرقبة",
  "pain.region.chest": "الصدر",
  "pain.region.left_shoulder": "الكتف الأيسر",
  "pain.region.right_shoulder": "الكتف الأيمن",
  "pain.region.left_arm": "الذراع الأيسر",
  "pain.region.right_arm": "الذراع الأيمن",
  "pain.region.stomach": "المعدة",
  "pain.region.upper_back": "أعلى الظهر",
  "pain.region.lower_back": "أسفل الظهر",
  "pain.region.left_leg": "الساق اليسرى",
  "pain.region.right_leg": "الساق اليمنى",

  // ── Pain: Composed sentence template ───────────────────────────
  "pain.sentence":
    "لديّ ألم {descriptor} في {region}، شدته {severity} من 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "الشدة",
  "pain.step.location": "الموقع",
  "pain.step.descriptor": "الوصف",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "أهدافي",
  "wishes.worries.label": "مخاوفي",
  "wishes.strength.label": "مصدر قوتي",
  "wishes.joy.label": "ما يُسعدني",
  "wishes.tradeoffs.label": "بشأن العلاج",
  "wishes.family.label": "عائلتي",
  "wishes.hopes.label": "آمالي",

  // Questions
  "wishes.goals.question": "ما هي أهم أهدافك؟",
  "wishes.worries.question": "ما هي أكبر مخاوفك؟",
  "wishes.strength.question": "ما الذي يمنحك القوة؟",
  "wishes.joy.question": "ما الذي يمنح حياتك الفرح والمعنى؟",
  "wishes.tradeoffs.question":
    "ما مدى استعدادك لتحمّل المزيد من أجل وقت أطول؟",
  "wishes.family.question":
    "ما مدى معرفة أقرب الناس إليك برغباتك؟",
  "wishes.hopes.question": "ما هي آمالك؟",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "أهم ما يعنيني",
  "wishes.worries.stem": "أنا قلق بشأن",
  "wishes.strength.stem": "ما يمنحني القوة",
  "wishes.joy.stem": "ما يمنحني الفرح",
  "wishes.tradeoffs.stem": "بشأن علاجي",
  "wishes.family.stem": "بشأن عائلتي",
  "wishes.hopes.stem": "آمل",

  // Responses — goals
  "wishes.goals.r.family": "أن أكون مع عائلتي",
  "wishes.goals.r.comfort": "أن أكون مرتاحاً وبلا ألم",
  "wishes.goals.r.longevity": "أن أعيش أطول فترة ممكنة",
  "wishes.goals.r.home": "العودة إلى المنزل",
  "wishes.goals.r.independence": "أن أستطيع فعل الأشياء بنفسي",
  "wishes.goals.r.peace": "أن أكون في سلام",

  // Responses — worries
  "wishes.worries.r.suffering": "المعاناة أو الألم",
  "wishes.worries.r.alone": "أن أكون وحيداً",
  "wishes.worries.r.burden": "أن أكون عبئاً على عائلتي",
  "wishes.worries.r.activities": "ألّا أستطيع فعل ما أستمتع به",
  "wishes.worries.r.leaving": "أن أترك عائلتي",
  "wishes.worries.r.unknown": "عدم معرفة ما سيحدث",

  // Responses — strength
  "wishes.strength.r.family": "عائلتي",
  "wishes.strength.r.faith": "إيماني",
  "wishes.strength.r.friends": "أصدقائي",
  "wishes.strength.r.wishes_heard": "معرفة أن رغباتي مسموعة",
  "wishes.strength.r.hope": "الأمل في أن أتحسن",
  "wishes.strength.r.carers": "الذين يعتنون بي",

  // Responses — joy
  "wishes.joy.r.family": "قضاء الوقت مع عائلتي",
  "wishes.joy.r.outdoors": "التواجد في الهواء الطلق",
  "wishes.joy.r.hobbies": "هواياتي واهتماماتي",
  "wishes.joy.r.helping": "مساعدة الآخرين",
  "wishes.joy.r.spiritual": "ممارستي الروحانية",
  "wishes.joy.r.routines": "الروتين اليومي البسيط",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "أريد كل علاج ممكن",
  "wishes.tradeoffs.r.good_chance":
    "أريد العلاج إن كانت فرصته جيدة",
  "wishes.tradeoffs.r.try_stop":
    "أريد المحاولة لكن التوقف إن لم يُجدِ نفعاً",
  "wishes.tradeoffs.r.comfortable": "أريد التركيز على راحتي",
  "wishes.tradeoffs.r.think": "أحتاج مزيداً من الوقت للتفكير",
  "wishes.tradeoffs.r.family_first":
    "أحتاج التحدث مع عائلتي أولاً",

  // Responses — family
  "wishes.family.r.know_well": "يعرفون رغباتي جيداً",
  "wishes.family.r.know_some": "يعرفون بعض رغباتي",
  "wishes.family.r.not_talked": "لم نتحدث عن هذا بعد",
  "wishes.family.r.need_help": "أحتاج مساعدة لإخبارهم",
  "wishes.family.r.team_explain":
    "أريد من فريق الرعاية أن يشرح لهم",

  // Responses — hopes
  "wishes.hopes.r.get_better": "أن أتعافى",
  "wishes.hopes.r.go_home": "أن أعود إلى المنزل",
  "wishes.hopes.r.comfortable": "أن أكون مرتاحاً",
  "wishes.hopes.r.family_ok": "أن تكون عائلتي بخير",
  "wishes.hopes.r.more_time": "أن يكون لديّ مزيد من الوقت",
  "wishes.hopes.r.peace": "أن أكون في سلام",

  // Wish sentence composition templates
  // TODO(translator): Verify "هو" works for all stem + list combinations
  "wishes.compose": "{stem} هو {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "سأحضر من يساعدك.",
  "provider.responses.interpreter": "سأحضر مترجماً.",
  "provider.responses.family": "سأتصل بعائلتك.",
  "provider.responses.get_that": "سأحضر ذلك لك.",
  "provider.responses.doctor_know": "سأُبلغ الطبيب.",
  "provider.responses.medication": "سأحضر دواءك.",
  "provider.responses.family_coming": "عائلتك في الطريق.",
  "provider.responses.doctor_soon": "الطبيب سيأتي قريباً.",
  "provider.responses.doing_well": "حالتك جيدة.",
  "provider.responses.rest": "حاول أن ترتاح الآن.",

  "provider.questions.feeling": "كيف تشعر؟",
  "provider.questions.need": "هل تحتاج شيئاً؟",
  "provider.questions.where_hurts":
    "هل يمكنك أن تُريني أين يؤلمك؟",
  "provider.questions.rate_pain": "قيّم ألمك من 0 إلى 10.",
  "provider.questions.sleep": "هل نمت جيداً؟",
  "provider.questions.comfortable": "هل أنت مرتاح؟",

  "provider.directions.procedure":
    "إجراؤك مقرر اليوم.",
  "provider.directions.stay_in_bed": "يجب أن تبقى في السرير.",
  "provider.directions.vitals": "سأفحص علاماتك الحيوية.",
  "provider.directions.medication_time": "حان وقت دوائك.",
  "provider.directions.breathe": "حاول أن تأخذ أنفاساً عميقة.",
  "provider.directions.call_button":
    "اضغط زر الاستدعاء إن احتجت شيئاً.",

  "provider.goals_of_care.matters_most":
    "أودّ التحدث عمّا يهمك أكثر.",
  "provider.goals_of_care.goals":
    "ما هي أهم أهدافك حالياً؟",
  "provider.goals_of_care.worries":
    "ما هي أكبر مخاوفك؟",
  "provider.goals_of_care.strength": "ما الذي يمنحك القوة؟",
  "provider.goals_of_care.joy":
    "ما الذي يمنح حياتك الفرح والمعنى؟",
  "provider.goals_of_care.wishes":
    "ما مدى معرفة أحبائك برغباتك؟",
  "provider.goals_of_care.hopes": "ما هي آمالك؟",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "نمت جيداً",
  "time.morning.didnt_sleep": "لم أنم جيداً",
  "time.morning.breakfast": "أحتاج الإفطار",
  "time.morning.doctor_coming": "متى يأتي الطبيب؟",

  "time.afternoon.tired": "أنا متعب",
  "time.afternoon.lunch": "هل يمكنني تناول الغداء؟",
  "time.afternoon.see_family": "متى أستطيع رؤية عائلتي؟",
  "time.afternoon.rest": "أحتاج أن أرتاح",

  "time.evening.cant_sleep": "لا أستطيع النوم",
  "time.evening.medication": "أحتاج دوائي",
  "time.evening.call_family": "هل يمكنني الاتصال بعائلتي؟",
  "time.evening.pain": "أشعر بالألم",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Arabic morphology may not compose cleanly — review each path.
  "suggest.start.i_am": "أنا",
  "suggest.start.i_feel": "أشعر",
  "suggest.start.i_want": "أريد",
  "suggest.start.i_need": "أحتاج",
  "suggest.start.please": "من فضلك",
  "suggest.start.when": "متى",
  "suggest.start.can_you": "هل يمكنك",
  "suggest.start.tell_me": "أخبرني",

  "suggest.i_am.in_pain": "أتألم",
  "suggest.i_am.cold": "أشعر بالبرد",
  "suggest.i_am.hot": "أشعر بالحر",
  "suggest.i_am.hungry": "جائع",
  "suggest.i_am.thirsty": "عطشان",
  "suggest.i_am.tired": "متعب",
  "suggest.i_am.uncomfortable": "غير مرتاح",
  "suggest.i_am.okay": "بخير",
  "suggest.i_am.not_okay": "لست بخير",
  "suggest.i_am.ready": "مستعد",

  "suggest.i_feel.scared": "بالخوف",
  "suggest.i_feel.sick": "بالمرض",
  "suggest.i_feel.dizzy": "بالدوار",
  "suggest.i_feel.weak": "بالضعف",
  "suggest.i_feel.better": "بتحسن",
  "suggest.i_feel.worse": "بأنني أسوأ",
  "suggest.i_feel.nauseous": "بالغثيان",
  "suggest.i_feel.lonely": "بالوحدة",
  "suggest.i_feel.confused": "بالارتباك",
  "suggest.i_feel.safe": "بالأمان",

  "suggest.i_feel_scared.procedure": "من الإجراء",
  "suggest.i_feel_scared.happening": "مما يحدث",
  "suggest.i_feel_scared.alone": "من أن أكون وحدي",
  "suggest.i_feel_scared.need_someone": "وأحتاج أحداً",

  "suggest.i_feel_sick.stomach": "في معدتي",
  "suggest.i_feel_sick.dizzy": "ودوار",
  "suggest.i_feel_sick.help": "وأحتاج مساعدة",

  "suggest.i_want.water": "ماءً",
  "suggest.i_want.family": "عائلتي",
  "suggest.i_want.go_home": "العودة للمنزل",
  "suggest.i_want.sleep": "النوم",
  "suggest.i_want.medication": "دوائي",
  "suggest.i_want.blanket": "بطانية",
  "suggest.i_want.talk": "التحدث مع أحد",
  "suggest.i_want.nurse": "الممرض",

  "suggest.i_want_to_go.home": "المنزل",
  "suggest.i_want_to_go.sleep": "النوم",
  "suggest.i_want_to_go.bathroom": "دورة المياه",

  "suggest.i_want_my.family": "عائلتي",
  "suggest.i_want_my.medication": "دوائي",
  "suggest.i_want_my.phone": "هاتفي",
  "suggest.i_want_my.glasses": "نظارتي",
  "suggest.i_want_my.blanket": "بطانيتي",

  "suggest.i_need.help": "مساعدة",
  "suggest.i_need.water": "ماءً",
  "suggest.i_need.bathroom": "دورة المياه",
  "suggest.i_need.medication": "دوائي",
  "suggest.i_need.nurse": "الممرض",
  "suggest.i_need.doctor": "الطبيب",
  "suggest.i_need.rest": "الراحة",
  "suggest.i_need.blanket": "بطانية",
  "suggest.i_need.suction": "شفطاً",

  "suggest.i_need_the.nurse": "الممرض",
  "suggest.i_need_the.doctor": "الطبيب",
  "suggest.i_need_the.bathroom": "دورة المياه",
  "suggest.i_need_the.light_off": "إطفاء الضوء",
  "suggest.i_need_the.light_on": "إضاءة الضوء",

  "suggest.i_need_my.medication": "دوائي",
  "suggest.i_need_my.family": "عائلتي",
  "suggest.i_need_my.glasses": "نظارتي",
  "suggest.i_need_my.phone": "هاتفي",

  "suggest.please.help_me": "ساعدني",
  "suggest.please.call_family": "اتصل بعائلتي",
  "suggest.please.light_off": "أطفئ الضوء",
  "suggest.please.adjust_bed": "اضبط سريري",
  "suggest.please.give_me": "أعطني",
  "suggest.please.explain": "اشرح لي",
  "suggest.please.come_back": "عُد قريباً",
  "suggest.please.stay": "ابقَ معي",
  "suggest.please.dont_leave": "لا تذهب",

  "suggest.please_help_me.pain": "أشعر بالألم",
  "suggest.please_help_me.breathe": "لا أستطيع التنفس",
  "suggest.please_help_me.sick": "أشعر بالمرض",
  "suggest.please_help_me.scared": "أنا خائف",

  "suggest.please_give_me.water": "ماءً",
  "suggest.please_give_me.medication": "دوائي",
  "suggest.please_give_me.blanket": "بطانية",
  "suggest.please_give_me.pain_relief": "شيئاً للألم",

  "suggest.when.go_home": "أستطيع العودة للمنزل؟",
  "suggest.when.family": "تأتي عائلتي؟",
  "suggest.when.medication": "موعد دوائي القادم؟",
  "suggest.when.doctor": "يأتي الطبيب؟",
  "suggest.when.eat": "أستطيع الأكل؟",
  "suggest.when.over": "ينتهي هذا؟",

  "suggest.can_you.help": "مساعدتي؟",
  "suggest.can_you.call_family": "الاتصال بعائلتي؟",
  "suggest.can_you.get_nurse": "استدعاء الممرض؟",
  "suggest.can_you.explain": "شرح ما يحدث؟",
  "suggest.can_you.light_off": "إطفاء الضوء؟",
  "suggest.can_you.adjust_bed": "ضبط سريري؟",
  "suggest.can_you.stay": "البقاء معي؟",

  "suggest.tell_me.happening": "ما الذي يحدث",
  "suggest.tell_me.time": "كم الساعة",
  "suggest.tell_me.go_home": "متى أستطيع العودة للمنزل",
  "suggest.tell_me.day": "ما هو اليوم",
  "suggest.tell_me.treatment": "عن علاجي",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "ساعدني من فضلك",
  "suggest.i_am_in_pain.worse": "ويزداد سوءاً",
  "suggest.i_am_in_pain.medication": "وأحتاج دواءً",
  "suggest.i_am_in_pain.back": "في ظهري",
  "suggest.i_am_in_pain.chest": "في صدري",
  "suggest.i_am_in_pain.stomach": "في معدتي",

  "suggest.i_need_help.up": "للقيام",
  "suggest.i_need_help.breathing": "في التنفس",
  "suggest.i_need_help.pain": "مع الألم",
  "suggest.i_need_help.now": "الآن",
  "suggest.i_need_help.please": "من فضلك",

  "suggest.i_feel_better.than_before": "من قبل",
  "suggest.i_feel_better.now": "الآن",
  "suggest.i_feel_better.thanks": "شكراً",

  "suggest.i_feel_worse.than_before": "من قبل",
  "suggest.i_feel_worse.need_doctor": "أحتاج الطبيب",
  "suggest.i_feel_worse.help": "ساعدني من فضلك",
  "suggest.i_feel_worse.medication": "أحتاج دواءً",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "أشعر",
  "suggest.ctx.feeling.i_am": "أنا",
  "suggest.ctx.feeling.better": "أفضل من قبل",
  "suggest.ctx.feeling.not_great": "لست بحال جيدة",
  "suggest.ctx.feeling.pain": "أشعر بالألم",
  "suggest.ctx.feeling.okay": "أنا بخير",
  "suggest.ctx.feeling.help": "هل يمكنك مساعدتي؟",

  "suggest.ctx.need.i_need": "أحتاج",
  "suggest.ctx.need.i_want": "أريد",
  "suggest.ctx.need.fine": "أنا بخير حالياً",
  "suggest.ctx.need.yes": "نعم، من فضلك",
  "suggest.ctx.need.no": "لا، شكراً",
  "suggest.ctx.need.stay": "هل يمكنك البقاء؟",

  "suggest.ctx.where_hurts.head": "رأسي",
  "suggest.ctx.where_hurts.chest": "صدري",
  "suggest.ctx.where_hurts.stomach": "معدتي",
  "suggest.ctx.where_hurts.back": "ظهري",
  "suggest.ctx.where_hurts.left_arm": "ذراعي الأيسر",
  "suggest.ctx.where_hurts.right_leg": "ساقي اليمنى",
  "suggest.ctx.where_hurts.everywhere": "في كل مكان",

  "suggest.ctx.pain.very_bad": "شديد جداً",
  "suggest.ctx.pain.worse": "يزداد سوءاً",
  "suggest.ctx.pain.same": "كما هو تقريباً",
  "suggest.ctx.pain.little_better": "أفضل قليلاً",
  "suggest.ctx.pain.need_relief": "أحتاج شيئاً للألم",

  "suggest.ctx.comfort.comfortable": "أنا مرتاح",
  "suggest.ctx.comfort.not_comfortable": "لست مرتاحاً",
  "suggest.ctx.comfort.cant_sleep": "لا أستطيع النوم",
  "suggest.ctx.comfort.cold": "أشعر بالبرد",
  "suggest.ctx.comfort.hot": "أشعر بالحر",
  "suggest.ctx.comfort.adjust_bed": "هل يمكنك ضبط سريري؟",

  "suggest.ctx.night.cant_sleep": "لا أستطيع النوم",
  "suggest.ctx.night.i_need": "أحتاج",
  "suggest.ctx.night.pain": "أشعر بالألم",
  "suggest.ctx.night.i_feel": "أشعر",
  "suggest.ctx.night.can_you": "هل يمكنك",
  "suggest.ctx.night.please": "من فضلك",
  "suggest.ctx.night.i_am": "أنا",
  "suggest.ctx.night.when": "متى",

  "suggest.ctx.morning.i_am": "أنا",
  "suggest.ctx.morning.i_need": "أحتاج",
  "suggest.ctx.morning.i_feel": "أشعر",
  "suggest.ctx.morning.doctor": "متى يأتي الطبيب؟",
  "suggest.ctx.morning.i_want": "أريد",
  "suggest.ctx.morning.can_you": "هل يمكنك",
  "suggest.ctx.morning.please": "من فضلك",
  "suggest.ctx.morning.tell_me": "أخبرني",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "سريع",
  "cat.needs": "أحتاج",
  "cat.feelings": "أشعر",
  "cat.pain": "ألم",
  "cat.questions": "أسئلة",
  "sub.comfort": "الراحة",
  "sub.medical": "طبي",
  "sub.people": "أشخاص",
  "sub.physical": "جسدي",
  "sub.emotional": "نفسي",

  // Provider category labels
  "provider.cat.responses": "الردود",
  "provider.cat.questions": "الأسئلة",
  "provider.cat.directions": "التوجيهات",
  "provider.cat.goals_of_care": "أهداف الرعاية",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — محادثة {name}",
  "ui.patient.app.name_fallback": "المريض",
  "ui.patient.header.name_fallback": "المريض",
  "ui.patient.header.bed_prefix": "سرير ",
  "ui.dual.nav.wishes": "رغبات",
  "ui.provider.nav.listen": "استماع",
  "ui.provider.nav.staff": "الطاقم",
  "ui.provider.nav.switch_patient": "تبديل المريض",
  "ui.provider.nav.settings": "الإعدادات",
  "ui.provider.nav.theme.auto": "تلقائي",
  "ui.provider.nav.theme.light": "فاتح",
  "ui.provider.nav.theme.dark": "داكن",
  "ui.patient.tabbar.say_more": "قل المزيد",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "ما مدى شدة ألمك؟",
  "ui.dual.pain.heading.location": "أين تشعر بالألم؟",
  "ui.dual.pain.heading.descriptor": "كيف يبدو الألم؟",
  "ui.patient.pain.step_of": "خطوة {n} من {total}",
  "ui.patient.pain.back_to": "العودة إلى {label}",
  "ui.patient.pain.level_aria": "مستوى الألم {n}، {label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "رغبات {name}",
  "ui.patient.wishes.my_wishes": "رغباتي",
  "ui.patient.wishes.step_of": "خطوة {n} من {total}",
  "ui.patient.wishes.none_shared": "لم تتم مشاركة أي رغبات.",
  "ui.patient.wishes.share_all_again": "مشاركة جميع الرغبات مرة أخرى",
  "ui.patient.wishes.close": "إغلاق",
  "ui.patient.wishes.share": "مشاركة",
  "ui.patient.wishes.skip": "تخطي",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "اضغط على الكلمات أدناه أو اكتب...",
  "ui.patient.builder.message_aria": "رسالتك",
  "ui.patient.builder.undo": "تراجع عن آخر كلمة",
  "ui.patient.builder.clear": "مسح الرسالة",
  "ui.patient.builder.refresh_ai": "تحديث اقتراحات الذكاء الاصطناعي",
  "ui.patient.builder.ai_thinking": "الذكاء الاصطناعي يفكر...",
  "ui.patient.builder.no_ai_suggestions":
    "لا توجد اقتراحات. اضغط تحديث للمحاولة مرة أخرى.",
  "ui.patient.builder.ready":
    "رسالتك جاهزة. اضغط تحدث للإرسال.",
  "ui.patient.builder.speak": "تحدث",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "إعادة: {text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "فريق الرعاية",
  "ui.provider.fallback_name": "مقدم الرعاية",
  "ui.provider.speaking_to": "التحدث إلى {name} بصفتك {prov}",
  "ui.provider.patient_fallback": "المريض",
  "ui.provider.close_panel": "إغلاق اللوحة",
  "ui.provider.select_provider": "اختيار {name}",
  "ui.provider.show_category": "عرض {key}",
  "ui.provider.speak_phrase": "قل: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "استماع",
  "ui.provider.listen.stop_aria": "إيقاف الاستماع",
  "ui.provider.listen.start_aria": "اضغط لبدء الاستماع",
  "ui.provider.listen.listening": "جارٍ الاستماع...",
  "ui.provider.listen.transcribing": "جارٍ التفريغ...",
  "ui.provider.listen.listening_placeholder": "الاستماع للكلام...",
  "ui.provider.listen.transcribing_placeholder": "تفريغ الكلام...",
  "ui.provider.listen.type_placeholder": "أو اكتب ما قيل...",
  "ui.provider.listen.transcript_aria": "النص المفرّغ",
  "ui.provider.listen.add_as": "إضافة إلى المحادثة بصفتك {prov}",
  "ui.provider.listen.privacy_notice":
    "على الجهاز · Whisper · لا يُرسَل أي صوت خارج هذا الجهاز",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "يتحدث: {text}",
  "ui.dual.speaking.patient_voice": "صوتك",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "أدخل رمز الدخول",
  "ui.provider.pin_gate.subtitle": "للطاقم الطبي فقط",
  "ui.provider.pin_gate.incorrect": "رمز دخول خاطئ",
  "ui.provider.pin_gate.delete_aria": "حذف",
  "ui.provider.pin_gate.digit_aria": "الرقم {n}",
  "ui.provider.pin_gate.cancel": "إلغاء",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "ستقرأ جملة بصوت عالٍ.",
  "ui.provider.voice_capture.coaching_breath":
    "خذ بضعة أنفاس عميقة.",
  "ui.provider.voice_capture.coaching_ready": "جاهز.",
  "ui.provider.voice_capture.breathe_in": "شهيق…",
  "ui.provider.voice_capture.breathe_out": "زفير…",
  "ui.provider.voice_capture.creating": "جارٍ إنشاء نسخة الصوت...",
  "ui.provider.voice_capture.creating_from_sample":
    "جارٍ إنشاء نسخة الصوت من العينة...",
  "ui.provider.voice_capture.loading_model":
    "جارٍ تحميل نموذج الصوت...",
  "ui.provider.voice_capture.clone_failed": "فشل الاستنساخ",
  "ui.provider.voice_capture.captured": "تم التقاط الصوت",
  "ui.provider.voice_capture.stop": "إيقاف",
  "ui.provider.voice_capture.play": "تشغيل",
  "ui.provider.voice_capture.discard": "تجاهل التسجيل",
  "ui.provider.voice_capture.use_recording": "استخدم هذا التسجيل",
  "ui.provider.voice_capture.upload_file": "رفع ملف",
  "ui.provider.voice_capture.record": "تسجيل",
  "ui.provider.voice_capture.stop_early": "إيقاف مبكر",
  "ui.provider.voice_capture.remove": "إزالة",
  "ui.provider.voice_capture.retry": "إعادة المحاولة",
  "ui.provider.voice_capture.done": "تم!",
  "ui.provider.voice_capture.cancel": "إلغاء",
  "ui.provider.voice_capture.seconds_recorded": "{n} ثانية مسجلة",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "إلغاء العد التنازلي للتسجيل",
  "ui.provider.voice_capture.stop_early_aria":
    "إيقاف التسجيل مبكراً",
  "ui.provider.voice_capture.audio_level_aria": "مستوى الصوت",
  "ui.provider.voice_capture.recording_progress_aria":
    "تقدم التسجيل",
  "ui.provider.voice_capture.stop_preview_aria":
    "إيقاف المعاينة",
  "ui.provider.voice_capture.play_preview_aria":
    "تشغيل معاينة التسجيل",
  "ui.provider.voice_capture.discard_aria":
    "تجاهل هذا التسجيل والبدء من جديد",
  "ui.provider.voice_capture.stop_playback_aria":
    "إيقاف تشغيل العينة المسجلة",
  "ui.provider.voice_capture.play_sample_aria":
    "تشغيل عينة الصوت المسجلة",
  "ui.provider.voice_capture.remove_aria": "إزالة عينة الصوت",
  "ui.provider.voice_capture.retry_aria":
    "إعادة محاولة استخراج نسخة الصوت",
  "ui.provider.voice_capture.upload_aria":
    "رفع عينة صوت من ملف",
  "ui.provider.voice_capture.record_aria":
    "تسجيل عينة صوت من الميكروفون",
  "ui.provider.voice_capture.err_network":
    "تعذر الوصول إلى نموذج الصوت. تحقق من اتصالك ثم اضغط إعادة المحاولة.",
  "ui.provider.voice_capture.err_timeout":
    "استغرقت معالجة الصوت وقتاً طويلاً. اضغط إعادة المحاولة للمحاولة مرة أخرى.",
  "ui.provider.voice_capture.err_mic_denied":
    "الوصول إلى الميكروفون محظور. فعّله من إعدادات المتصفح أو ارفع ملفاً بدلاً من ذلك.",
  "ui.provider.voice_capture.err_generic":
    "لم نتمكن من إعداد صوتك. اضغط إعادة المحاولة للمحاولة مرة أخرى.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "تم رفض الوصول إلى الميكروفون. حاول رفع ملف بدلاً من ذلك.",
  "ui.provider.voice_capture.err_playback":
    "تعذر تشغيل الصوت.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "محسّن",
  "ui.provider.fallback_voice.enhanced_aria": "صوت عصبي محسّن",
  "ui.provider.fallback_voice.on_device_badge": "على الجهاز",
  "ui.provider.fallback_voice.playing": "جارٍ التشغيل...",
  "ui.provider.fallback_voice.unavailable":
    "أصوات النظام غير متوفرة على هذا الجهاز.",
  "ui.provider.fallback_voice.loading":
    "جارٍ تحميل الأصوات المتاحة...",
  "ui.provider.fallback_voice.hide_others": "إخفاء الأصوات الأخرى",
  "ui.provider.fallback_voice.more_voices": "أصوات إضافية ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "المريض",
  "ui.provider.setup.steps.voice": "الصوت",
  "ui.provider.setup.steps.care_team": "الفريق",
  "ui.provider.setup.steps.confirm": "تأكيد",

  "ui.provider.setup.skip": "تخطي →",
  "ui.provider.setup.skip_aria": "تخطي الإعداد",
  "ui.provider.setup.skip_dialog.title": "تخطي الإعداد؟",
  "ui.provider.setup.skip_dialog.body":
    "يمكنك إكمال ذلك لاحقاً من الإعدادات.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "لن يُضاف أي مريض.",
  "ui.provider.setup.skip_dialog.confirm": "تخطي الإعداد",
  "ui.provider.setup.skip_dialog.cancel": "متابعة",

  "ui.provider.setup.back": "رجوع",
  "ui.provider.setup.continue": "متابعة",
  "ui.provider.setup.start": "ابدأ OwnVoice",

  "ui.provider.setup.step0.heading": "مرحباً بك في OwnVoice",
  "ui.provider.setup.step0.subhead":
    "لنُعدّ لوحة التواصل الخاصة بك. كل شيء يبقى على هذا الجهاز.",
  "ui.provider.setup.step0.name_label": "اسم المريض",
  "ui.provider.setup.step0.name_placeholder":
    "الاسم الأول أو الاسم المفضل",
  "ui.provider.setup.step0.bed_label": "السرير / الغرفة",
  "ui.provider.setup.step0.bed_placeholder": "e.g. 4B-12",
  "ui.provider.setup.step0.language_label": "اللغة",

  "ui.provider.setup.step1.heading": "عينة صوتية",
  "ui.provider.setup.step1.body1":
    "التقط عينة صوتية ليتحدث OwnVoice بصوت المريض. هذه الخطوة اختيارية.",
  "ui.provider.setup.step1.body2":
    "استنساخ الصوت يعمل بالكامل على الجهاز. لا يُرسَل أي صوت خارج هذا الجهاز اللوحي.",
  "ui.provider.setup.step1.patient_label": "المريض",
  "ui.provider.setup.step1.backup_voice_heading": "صوت احتياطي",
  "ui.provider.setup.step1.backup_voice_body1":
    "اختر صوت نظام لاستخدامه أثناء تحميل نسخة الصوت، أو إن لم تُسجَّل عينة. اضغط على صوت لسماع معاينة.",
  "ui.provider.setup.step1.backup_voice_body2":
    "يستخدم هذا تحويل النص إلى كلام المدمج في جهازك.",

  "ui.provider.setup.step2.heading": "فريق الرعاية",
  "ui.provider.setup.step2.body":
    "أضف مقدمي الرعاية الذين سيعتنون بهذا المريض.",
  "ui.provider.setup.step2.icon_label": "الأيقونة",
  "ui.provider.setup.step2.name_label": "الاسم",
  "ui.provider.setup.step2.name_placeholder":
    "د. أحمد، الممرض سارة...",
  "ui.provider.setup.step2.add": "إضافة",

  "ui.provider.setup.step3.heading": "جاهز للبدء",
  "ui.provider.setup.step3.body":
    "راجع إعداداتك. يمكنك تغيير أي شيء لاحقاً من الإعدادات.",
  "ui.provider.setup.step3.summary.patient": "المريض",
  "ui.provider.setup.step3.summary.bed": "السرير / الغرفة",
  "ui.provider.setup.step3.summary.language": "اللغة",
  "ui.provider.setup.step3.summary.language_default": "الإنجليزية",
  "ui.provider.setup.step3.summary.voice": "الصوت",
  "ui.provider.setup.step3.summary.care_team": "فريق الرعاية",
  "ui.provider.setup.step3.summary.not_set": "لم يُحدَّد",
  "ui.provider.setup.step3.summary.captured": "تم الالتقاط",
  "ui.provider.setup.step3.summary.not_captured": "لم يُلتقَط",
  "ui.provider.setup.step3.summary.none_added": "لم يُضَف أحد",
  "ui.provider.setup.step3.pin_label": "رمز دخول الطاقم (اختياري)",
  "ui.provider.setup.step3.pin_body":
    "حدّد رمز دخول من 4 أرقام لحماية إعدادات مقدم الرعاية.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "الإعدادات",
  "ui.provider.settings.done": "تم",
  "ui.provider.settings.close_aria": "إغلاق الإعدادات",

  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "تجاهل إعداد صوت {label}؟",
  "ui.provider.settings.voice_cache.discard_body":
    "سيُفقد التقدم ({current} / {total} عبارة). عينة الصوت المسجلة محفوظة — يمكنك إعادة بدء الإعداد لاحقاً.",
  "ui.provider.settings.voice_cache.cancel": "إلغاء",
  "ui.provider.settings.voice_cache.cancel_aria":
    "إلغاء والاحتفاظ بإعداد الصوت",
  "ui.provider.settings.voice_cache.discard_confirm": "تجاهل",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "تأكيد تجاهل إعداد الصوت",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "تجاهل إعداد صوت {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "في الانتظار — سيُعَد صوت {label} تالياً ({total} عبارة{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "جارٍ إعداد صوت {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "متوقف مؤقتاً — صوت {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "استئناف",
  "ui.provider.settings.voice_cache.resume_aria":
    "استئناف إعداد صوت {label}",
  "ui.provider.settings.voice_cache.pause": "إيقاف مؤقت",
  "ui.provider.settings.voice_cache.pause_aria":
    "إيقاف إعداد صوت {label} مؤقتاً",
  "ui.provider.settings.voice_cache.done":
    "نسخة الصوت نشطة — جميع العبارات البالغ عددها {total} جاهزة بصوت {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "فشلت {count} عبارة{plural} لـ {label}",
  "ui.provider.settings.voice_cache.retry": "إعادة المحاولة",
  "ui.provider.settings.voice_cache.retry_aria":
    "إعادة محاولة العبارات الفاشلة في ذاكرة الصوت",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "حول التطبيق",
  "ui.provider.settings.about.subtitle":
    "أداة تواصل معزز وبديل (AAC) للمرضى المنوّمين.",
  "ui.provider.settings.about.attribution_1":
    "مقياس الألم: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "أهداف الرعاية: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "ذاكرة SW التخزينية:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "إعادة الضبط",
  "ui.provider.settings.reset.action_label":
    "إعادة ضبط التطبيق لمريض جديد",
  "ui.provider.settings.reset.confirm_title": "هل أنت متأكد؟",
  "ui.provider.settings.reset.confirm_body":
    "سيُحذف جميع بيانات المريض وعينات الصوت وسجل المحادثات وإعدادات مقدم الرعاية. لا يمكن التراجع عن ذلك.",
  "ui.provider.settings.reset.confirm_destructive": "إعادة ضبط الكل",

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "إمكانية الوصول",
  "ui.provider.settings.accessibility.toggle_label":
    "وضع الإدخال المساعد",
  "ui.provider.settings.accessibility.toggle_description":
    "يُكبّر حلقات التركيز، ويُطيل فترة تأخير اللمس، ويُعزز التغذية الراجعة للمرضى الذين يستخدمون كرة التتبع أو عصا التحكم أو مؤشر AssistiveTouch أو مفتاح التبديل.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "تم اكتشاف مؤشر خارجي.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "ضع في الاعتبار تفعيل وضع الإدخال المساعد لهذا المريض.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "المرضى",
  "ui.provider.settings.patients.active_remove_hint":
    "انتقل إلى مريض آخر قبل إزالة هذا المريض.",
  "ui.provider.settings.patients.remove_button": "إزالة",
  "ui.provider.settings.patients.add_patient": "+ إضافة مريض",
  "ui.provider.settings.patients.remove_dialog.title":
    "إزالة {name}؟",
  "ui.provider.settings.patients.remove_dialog.body":
    "سيُحذف عينة الصوت وسجل المحادثات والصوت المخزّن لنسخة الصوت. نُسخ أصوات فريق الرعاية محفوظة للمرضى الآخرين. لا يمكن التراجع عن ذلك.",
  "ui.provider.settings.patients.remove_dialog.confirm": "إزالة",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "فريق الرعاية",
  "ui.provider.settings.care_team.empty":
    "لم يُضَف مقدمو رعاية بعد.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "معلومات المريض",
  "ui.provider.settings.patient_info.name_label": "الاسم",
  "ui.provider.settings.patient_info.bed_label": "السرير / الغرفة",
  "ui.provider.settings.patient_info.language_label": "اللغة",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "لغة المريض",
  "ui.provider.settings.lang.caregiver_section":
    "لغة فريق الرعاية",
  "ui.provider.settings.lang.caregiver_helper":
    "اللغة التي يفهمها فريق الرعاية. تُضبط عادةً مرة واحدة لكل جهاز.",
  "ui.provider.settings.lang.change": "تغيير اللغة",

  "ui.provider.settings.lang.patient_dialog.title":
    "تغيير لغة المريض إلى {lang}؟",
  "ui.provider.settings.lang.patient_dialog.body":
    "نسخة صوتك جاهزة — العبارات التي تضغطها ستظل تبدو كما هي. سنُعد صوتاً لـ {providerCount} من أصوات الفريق (~{estimatedMinutes} دقيقة). يمكنك متابعة استخدام التطبيق أثناء ذلك.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "نُسخ أصوات فريق الرعاية غير متاحة بـ {lang} — سيُستخدم صوت النظام بدلاً من ذلك. التسجيلات الحالية محفوظة في حال التبديل إلى لغة مدعومة لاحقاً.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "العبارات التي تضغطها ستظل تبدو كما هي. لم تُضبط أصوات فريق، لذا لا شيء يحتاج إعادة إنشاء.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "تغيير لغة فريق الرعاية إلى {lang}؟",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "نُسخ أصوات فريقك جاهزة. سنُعد صوت المريض باللغة الجديدة (~{estimatedMinutes} دقيقة). يمكنك متابعة استخدام التطبيق أثناء ذلك.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "نسخة صوت المريض غير متاحة بـ {lang} — سيُستخدم صوت النظام بدلاً من ذلك. عينة صوت المريض المسجلة محفوظة في حال التبديل إلى لغة مدعومة لاحقاً.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "لم تُضبط نسخة صوت للمريض، لذا لا شيء يحتاج إعادة إنشاء.",
  "ui.provider.settings.patient_info.voice_label": "الصوت",
  "ui.provider.settings.patient_info.backup_voice_label":
    "صوت احتياطي",
  "ui.provider.settings.patient_info.backup_voice_body":
    "صوت النظام المستخدم أثناء تحميل نسخة الصوت. اضغط للمعاينة.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "الجاهزية بدون اتصال",
  "ui.provider.settings.offline.status_description":
    "حالة نماذج الذكاء الاصطناعي التي يستخدمها التطبيق على الجهاز لتوليد الصوت والاقتراحات والتعرف على الكلام.",
  "ui.provider.settings.offline.downloading":
    "جارٍ تنزيل النماذج…",
  "ui.provider.settings.offline.download_progress_aria":
    "تقدم تنزيل النماذج",
  "ui.provider.settings.offline.all_ready":
    "جميع النماذج جاهزة",
  "ui.provider.settings.offline.redownload_button":
    "إعادة تنزيل النماذج",
  "ui.provider.settings.offline.already_up_to_date":
    "محدّث بالفعل",
  "ui.provider.settings.offline.checking": "جارٍ التحقق…",
  "ui.provider.settings.offline.verified": "✓ تم التحقق من النماذج",
  "ui.provider.settings.offline.check_button":
    "التحقق من النماذج الموجودة",
  "ui.provider.settings.offline.redownloading":
    "جارٍ إعادة التنزيل…",
  "ui.provider.settings.offline.force_redownload_button":
    "فرض إعادة تنزيل جميع النماذج",
  "ui.provider.settings.offline.model_status_ready": "جاهز",
  "ui.provider.settings.offline.model_status_downloading":
    "جارٍ التنزيل…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "يحتاج إعادة محاولة",
  "ui.provider.settings.offline.last_verified_prefix":
    "آخر تحقق: ",
  "ui.provider.settings.offline.storage_prefix": "التخزين: ",
  "ui.provider.settings.offline.storage_of": " من ",
  "ui.provider.settings.offline.storage_used": " مستخدم",
  "ui.provider.settings.offline.storage_low": " — المساحة منخفضة",
  "ui.provider.settings.offline.clear_audio_cache":
    "مسح ذاكرة الصوت التخزينية",
  "ui.provider.settings.offline.clearing": "جارٍ المسح…",
  "ui.provider.settings.offline.rebuilding":
    "جارٍ إعادة البناء: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "إعادة تنزيل جميع نماذج الذكاء الاصطناعي؟",
  "ui.provider.settings.offline.redownload_dialog.body":
    "سيُعاد تنزيل ما يقارب 1.7 غيغابايت. يستمر توليد الصوت في العمل أثناء التحديث.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "إعادة التنزيل",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "تبديل المريض",
  "ui.provider.switch.add_patient": "+ إضافة مريض",
  "ui.provider.switch.voice_captured": "تم التقاط الصوت",
  "ui.provider.switch.no_voice": "بدون صوت",
  "ui.provider.switch.last_active_just_now": "الآن",
  "ui.provider.switch.last_active_minutes":
    "آخر نشاط منذ {n} دقيقة",
  "ui.provider.switch.last_active_hours": "آخر نشاط منذ {n} ساعة",
  "ui.provider.switch.last_active_days": "آخر نشاط منذ {n} يوم",
  "ui.provider.switch.currently_active": "نشط حالياً",
  "ui.provider.switch.switched_announcement":
    "تم التبديل إلى {name}. {count} رسالة محادثة.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "جلسة الطاقم على وشك الانتهاء",
  "ui.provider.staff_session.warning_body":
    "سيُقفل وصول الطاقم خلال {n} ثانية.",
  "ui.provider.staff_session.extend": "تمديد الجلسة",
  "ui.provider.staff_session.end_now": "إنهاء الآن",
  "ui.provider.nav.end_staff_session": "إنهاء جلسة الطاقم",
};

export default ar;
