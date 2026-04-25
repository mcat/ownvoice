/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in LOCALES (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Russian
 * Locale: ru
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const ru: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Да",
  "quick.no": "Нет",
  "quick.thank_you": "Спасибо",
  "quick.please_wait": "Подождите, пожалуйста",
  "quick.dont_understand": "Я не понимаю",
  "quick.repeat": "Повторите, пожалуйста",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Мне нужна вода",
  "needs.comfort.hungry": "Я хочу есть",
  "needs.comfort.cold": "Мне холодно",
  "needs.comfort.hot": "Мне жарко",
  "needs.comfort.bed": "Отрегулируйте мою кровать",
  "needs.comfort.bathroom": "Мне нужно в туалет",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Мне нужно лекарство",
  "needs.medical.suction": "Мне нужна аспирация",
  "needs.medical.nauseous": "Меня тошнит",
  "needs.medical.breathe": "Мне трудно дышать",
  "needs.medical.nurse": "Мне нужна медсестра",
  "needs.medical.doctor": "Мне нужен врач",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Я хочу видеть семью",
  "needs.people.stay": "Кто-нибудь может остаться со мной?",
  "needs.people.call": "Я хочу позвонить кому-нибудь",
  "needs.people.interpreter": "Мне нужен переводчик",

  // ── Patient feelings: Physical ─────────────────────────────────
  // NOTE(translator): Using impersonal or infinitive forms where possible
  // to avoid masculine/feminine agreement (устал/устала).
  "feelings.physical.tired": "Я чувствую усталость",
  "feelings.physical.uncomfortable": "Мне некомфортно",
  "feelings.physical.weak": "Я чувствую слабость",
  "feelings.physical.better": "Мне лучше",
  "feelings.physical.dizzy": "У меня кружится голова",
  "feelings.physical.itchy": "У меня зуд",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Мне страшно",
  "feelings.emotional.lonely": "Я чувствую одиночество",
  "feelings.emotional.frustrated": "Я чувствую раздражение",
  "feelings.emotional.confused": "Я в замешательстве",
  "feelings.emotional.safe": "Я чувствую себя в безопасности",
  "feelings.emotional.grateful": "Я благодарю",
  "feelings.emotional.worried": "Я беспокоюсь",
  "feelings.emotional.hopeful": "Я надеюсь на лучшее",
  "feelings.emotional.bored": "Мне скучно",
  "feelings.emotional.embarrassed": "Мне неловко",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Который час?",
  "questions.day": "Какой сегодня день?",
  "questions.whats_happening": "Что со мной происходит?",
  "questions.go_home": "Когда меня выпишут?",
  "questions.next_medication": "Когда следующий приём лекарства?",
  "questions.explain_treatment": "Можете объяснить моё лечение?",
  "questions.nurse_today": "Кто моя медсестра сегодня?",
  "questions.eat_drink": "Мне можно есть или пить?",
  "questions.see_family": "Когда я смогу увидеть семью?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Нет боли",
  "pain.face.2": "Немного больно",
  "pain.face.4": "Больно чуть сильнее",
  "pain.face.6": "Больно ещё сильнее",
  "pain.face.8": "Очень больно",
  "pain.face.10": "Невыносимая боль",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Ноющая",
  "pain.descriptor.burning": "Жгучая",
  "pain.descriptor.sharp": "Острая",
  "pain.descriptor.throbbing": "Пульсирующая",
  "pain.descriptor.cramping": "Спазматическая",
  "pain.descriptor.constant": "Постоянная",
  "pain.descriptor.comes_and_goes": "Периодическая",
  "pain.descriptor.numb": "С онемением",
  "pain.descriptor.pressure": "Давящая",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Голова",
  "pain.region.face": "Лицо",
  "pain.region.neck": "Шея",
  "pain.region.chest": "Грудь",
  "pain.region.left_shoulder": "Левое плечо",
  "pain.region.right_shoulder": "Правое плечо",
  "pain.region.left_arm": "Левая рука",
  "pain.region.right_arm": "Правая рука",
  "pain.region.stomach": "Живот",
  "pain.region.upper_back": "Верхняя часть спины",
  "pain.region.lower_back": "Поясница",
  "pain.region.left_leg": "Левая нога",
  "pain.region.right_leg": "Правая нога",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  // TODO(translator): Verify "{descriptor} боль" agreement (fem. adjective + fem. noun)
  "pain.sentence":
    "У меня {descriptor} боль в области: {region}, уровень {severity} из 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Интенсивность",
  "pain.step.location": "Расположение",
  "pain.step.descriptor": "Описание",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Мои цели",
  "wishes.worries.label": "Мои тревоги",
  "wishes.strength.label": "Мои источники сил",
  "wishes.joy.label": "Что приносит мне радость",
  "wishes.tradeoffs.label": "О лечении",
  "wishes.family.label": "Моя семья",
  "wishes.hopes.label": "Мои надежды",

  // Questions
  "wishes.goals.question": "Какие ваши самые важные цели?",
  "wishes.worries.question": "Что вас больше всего тревожит?",
  "wishes.strength.question": "Что даёт вам силы?",
  "wishes.joy.question": "Что приносит вам радость и смысл в жизни?",
  "wishes.tradeoffs.question":
    "Как много вы готовы перенести ради продления жизни?",
  "wishes.family.question":
    "Насколько ваши близкие знают о ваших пожеланиях?",
  "wishes.hopes.question": "На что вы надеетесь?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "Для меня важнее всего",
  "wishes.worries.stem": "Меня беспокоит",
  "wishes.strength.stem": "Мне даёт силы",
  "wishes.joy.stem": "Мне приносит радость",
  "wishes.tradeoffs.stem": "О моём лечении",
  "wishes.family.stem": "О моей семье",
  "wishes.hopes.stem": "Я надеюсь",

  // Responses — goals
  "wishes.goals.r.family": "Быть рядом с семьёй",
  "wishes.goals.r.comfort": "Чувствовать себя комфортно и без боли",
  "wishes.goals.r.longevity": "Прожить как можно дольше",
  "wishes.goals.r.home": "Вернуться домой",
  "wishes.goals.r.independence": "Быть самостоятельным",
  "wishes.goals.r.peace": "Обрести покой",

  // Responses — worries
  "wishes.worries.r.suffering": "Страдание или боль",
  "wishes.worries.r.alone": "Остаться в одиночестве",
  "wishes.worries.r.burden": "Быть обузой для семьи",
  "wishes.worries.r.activities": "Утратить возможность заниматься любимым делом",
  "wishes.worries.r.leaving": "Оставить семью",
  "wishes.worries.r.unknown": "Неизвестность",

  // Responses — strength
  "wishes.strength.r.family": "Моя семья",
  "wishes.strength.r.faith": "Моя вера",
  "wishes.strength.r.friends": "Мои друзья",
  "wishes.strength.r.wishes_heard": "Знание, что мои пожелания услышаны",
  "wishes.strength.r.hope": "Надежда на выздоровление",
  "wishes.strength.r.carers": "Те, кто обо мне заботится",

  // Responses — joy
  "wishes.joy.r.family": "Время с семьёй",
  "wishes.joy.r.outdoors": "Быть на свежем воздухе",
  "wishes.joy.r.hobbies": "Мои увлечения и интересы",
  "wishes.joy.r.helping": "Помощь другим",
  "wishes.joy.r.spiritual": "Моя духовная практика",
  "wishes.joy.r.routines": "Простые повседневные дела",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Я хочу все возможные методы лечения",
  "wishes.tradeoffs.r.good_chance":
    "Я хочу лечение, если есть хорошие шансы",
  "wishes.tradeoffs.r.try_stop":
    "Хочу попробовать, но прекратить, если не помогает",
  "wishes.tradeoffs.r.comfortable": "Я хочу сосредоточиться на комфорте",
  "wishes.tradeoffs.r.think": "Мне нужно больше времени подумать",
  "wishes.tradeoffs.r.family_first":
    "Мне нужно сначала поговорить с семьёй",

  // Responses — family
  "wishes.family.r.know_well": "Они хорошо знают мои пожелания",
  "wishes.family.r.know_some": "Они знают некоторые мои пожелания",
  "wishes.family.r.not_talked": "Мы ещё не обсуждали это",
  "wishes.family.r.need_help": "Мне нужна помощь, чтобы им рассказать",
  "wishes.family.r.team_explain":
    "Я хочу, чтобы моя медицинская команда помогла объяснить",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Выздороветь",
  "wishes.hopes.r.go_home": "Вернуться домой",
  "wishes.hopes.r.comfortable": "Чувствовать себя комфортно",
  "wishes.hopes.r.family_ok": "Чтобы моя семья была в порядке",
  "wishes.hopes.r.more_time": "Иметь больше времени",
  "wishes.hopes.r.peace": "Обрести покой",

  // Wish sentence composition templates
  // TODO(translator): Verify em-dash connector works for all stem + list combinations
  "wishes.compose": "{stem} — {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Я позову кого-нибудь на помощь.",
  "provider.responses.interpreter": "Я позову переводчика.",
  "provider.responses.family": "Я позвоню вашей семье.",
  "provider.responses.get_that": "Я вам это принесу.",
  "provider.responses.doctor_know": "Я сообщу врачу.",
  "provider.responses.medication": "Я принесу ваше лекарство.",
  "provider.responses.family_coming": "Ваша семья уже в пути.",
  "provider.responses.doctor_soon": "Врач скоро будет.",
  "provider.responses.doing_well": "У вас всё хорошо.",
  "provider.responses.rest": "Постарайтесь отдохнуть.",

  "provider.questions.feeling": "Как вы себя чувствуете?",
  "provider.questions.need": "Вам что-нибудь нужно?",
  "provider.questions.where_hurts":
    "Можете показать, где болит?",
  "provider.questions.rate_pain": "Оцените боль от 0 до 10.",
  "provider.questions.sleep": "Вы хорошо спали?",
  "provider.questions.comfortable": "Вам удобно?",

  "provider.directions.procedure":
    "Ваша процедура запланирована на сегодня.",
  "provider.directions.stay_in_bed": "Вам нужно оставаться в постели.",
  "provider.directions.vitals": "Я проверю ваши показатели.",
  "provider.directions.medication_time": "Пора принять лекарство.",
  "provider.directions.breathe": "Постарайтесь дышать глубоко.",
  "provider.directions.call_button":
    "Нажмите кнопку вызова, если что-нибудь понадобится.",

  "provider.goals_of_care.matters_most":
    "Я хотел бы поговорить о том, что для вас важнее всего.",
  "provider.goals_of_care.goals":
    "Какие ваши самые важные цели сейчас?",
  "provider.goals_of_care.worries":
    "Что вас больше всего тревожит?",
  "provider.goals_of_care.strength": "Что даёт вам силы?",
  "provider.goals_of_care.joy":
    "Что приносит вам радость и смысл в жизни?",
  "provider.goals_of_care.wishes":
    "Насколько ваши близкие знают о ваших пожеланиях?",
  "provider.goals_of_care.hopes": "На что вы надеетесь?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Я хорошо спал",
  "time.morning.didnt_sleep": "Я плохо спал",
  "time.morning.breakfast": "Мне нужен завтрак",
  "time.morning.doctor_coming": "Когда придёт врач?",

  "time.afternoon.tired": "Я чувствую усталость",
  "time.afternoon.lunch": "Можно мне обед?",
  "time.afternoon.see_family": "Когда я смогу увидеть семью?",
  "time.afternoon.rest": "Мне нужно отдохнуть",

  "time.evening.cant_sleep": "Я не могу заснуть",
  "time.evening.medication": "Мне нужно лекарство",
  "time.evening.call_family": "Можно мне позвонить семье?",
  "time.evening.pain": "У меня боль",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Russian case system may not compose cleanly — review each path.
  "suggest.start.i_am": "Я",
  "suggest.start.i_feel": "Я чувствую",
  "suggest.start.i_want": "Я хочу",
  "suggest.start.i_need": "Мне нужно",
  "suggest.start.please": "Пожалуйста",
  "suggest.start.when": "Когда",
  "suggest.start.can_you": "Можете ли вы",
  "suggest.start.tell_me": "Скажите мне",

  "suggest.i_am.in_pain": "испытываю боль",
  "suggest.i_am.cold": "мёрзну",
  "suggest.i_am.hot": "перегреваюсь",
  "suggest.i_am.hungry": "хочу есть",
  "suggest.i_am.thirsty": "хочу пить",
  "suggest.i_am.tired": "устаю",
  "suggest.i_am.uncomfortable": "чувствую дискомфорт",
  "suggest.i_am.okay": "в порядке",
  "suggest.i_am.not_okay": "не в порядке",
  "suggest.i_am.ready": "готов",

  "suggest.i_feel.scared": "страх",
  "suggest.i_feel.sick": "недомогание",
  "suggest.i_feel.dizzy": "головокружение",
  "suggest.i_feel.weak": "слабость",
  "suggest.i_feel.better": "себя лучше",
  "suggest.i_feel.worse": "себя хуже",
  "suggest.i_feel.nauseous": "тошноту",
  "suggest.i_feel.lonely": "одиночество",
  "suggest.i_feel.confused": "замешательство",
  "suggest.i_feel.safe": "себя в безопасности",

  "suggest.i_feel_scared.procedure": "из-за процедуры",
  "suggest.i_feel_scared.happening": "из-за происходящего",
  "suggest.i_feel_scared.alone": "оставаться в одиночестве",
  "suggest.i_feel_scared.need_someone": "и мне нужен кто-то",

  "suggest.i_feel_sick.stomach": "в животе",
  "suggest.i_feel_sick.dizzy": "и кружится голова",
  "suggest.i_feel_sick.help": "и нужна помощь",

  "suggest.i_want.water": "воды",
  "suggest.i_want.family": "видеть семью",
  "suggest.i_want.go_home": "домой",
  "suggest.i_want.sleep": "спать",
  "suggest.i_want.medication": "лекарство",
  "suggest.i_want.blanket": "одеяло",
  "suggest.i_want.talk": "поговорить с кем-нибудь",
  "suggest.i_want.nurse": "медсестру",

  "suggest.i_want_to_go.home": "домой",
  "suggest.i_want_to_go.sleep": "спать",
  "suggest.i_want_to_go.bathroom": "в туалет",

  "suggest.i_want_my.family": "семью",
  "suggest.i_want_my.medication": "лекарство",
  "suggest.i_want_my.phone": "телефон",
  "suggest.i_want_my.glasses": "очки",
  "suggest.i_want_my.blanket": "одеяло",

  "suggest.i_need.help": "помощь",
  "suggest.i_need.water": "воду",
  "suggest.i_need.bathroom": "в туалет",
  "suggest.i_need.medication": "лекарство",
  "suggest.i_need.nurse": "медсестру",
  "suggest.i_need.doctor": "врача",
  "suggest.i_need.rest": "отдохнуть",
  "suggest.i_need.blanket": "одеяло",
  "suggest.i_need.suction": "аспирацию",

  "suggest.i_need_the.nurse": "медсестру",
  "suggest.i_need_the.doctor": "врача",
  "suggest.i_need_the.bathroom": "туалет",
  "suggest.i_need_the.light_off": "выключить свет",
  "suggest.i_need_the.light_on": "включить свет",

  "suggest.i_need_my.medication": "лекарство",
  "suggest.i_need_my.family": "семью",
  "suggest.i_need_my.glasses": "очки",
  "suggest.i_need_my.phone": "телефон",

  "suggest.please.help_me": "помогите мне",
  "suggest.please.call_family": "позвоните моей семье",
  "suggest.please.light_off": "выключите свет",
  "suggest.please.adjust_bed": "отрегулируйте кровать",
  "suggest.please.give_me": "дайте мне",
  "suggest.please.explain": "объясните",
  "suggest.please.come_back": "вернитесь скорее",
  "suggest.please.stay": "останьтесь со мной",
  "suggest.please.dont_leave": "не уходите",

  "suggest.please_help_me.pain": "У меня боль",
  "suggest.please_help_me.breathe": "Я не могу дышать",
  "suggest.please_help_me.sick": "Мне плохо",
  "suggest.please_help_me.scared": "Мне страшно",

  "suggest.please_give_me.water": "воды",
  "suggest.please_give_me.medication": "моё лекарство",
  "suggest.please_give_me.blanket": "одеяло",
  "suggest.please_give_me.pain_relief": "что-нибудь от боли",

  "suggest.when.go_home": "меня выпишут?",
  "suggest.when.family": "придёт моя семья?",
  "suggest.when.medication": "следующий приём лекарства?",
  "suggest.when.doctor": "придёт врач?",
  "suggest.when.eat": "мне можно есть?",
  "suggest.when.over": "это закончится?",

  "suggest.can_you.help": "помочь мне?",
  "suggest.can_you.call_family": "позвонить моей семье?",
  "suggest.can_you.get_nurse": "позвать медсестру?",
  "suggest.can_you.explain": "объяснить, что происходит?",
  "suggest.can_you.light_off": "выключить свет?",
  "suggest.can_you.adjust_bed": "отрегулировать кровать?",
  "suggest.can_you.stay": "остаться со мной?",

  "suggest.tell_me.happening": "что происходит",
  "suggest.tell_me.time": "который час",
  "suggest.tell_me.go_home": "когда меня выпишут",
  "suggest.tell_me.day": "какой сегодня день",
  "suggest.tell_me.treatment": "о моём лечении",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "пожалуйста, помогите",
  "suggest.i_am_in_pain.worse": "и становится хуже",
  "suggest.i_am_in_pain.medication": "и нужно лекарство",
  "suggest.i_am_in_pain.back": "в спине",
  "suggest.i_am_in_pain.chest": "в груди",
  "suggest.i_am_in_pain.stomach": "в животе",

  "suggest.i_need_help.up": "встать",
  "suggest.i_need_help.breathing": "дышать",
  "suggest.i_need_help.pain": "с болью",
  "suggest.i_need_help.now": "прямо сейчас",
  "suggest.i_need_help.please": "пожалуйста",

  "suggest.i_feel_better.than_before": "чем раньше",
  "suggest.i_feel_better.now": "сейчас",
  "suggest.i_feel_better.thanks": "спасибо",

  "suggest.i_feel_worse.than_before": "чем раньше",
  "suggest.i_feel_worse.need_doctor": "Мне нужен врач",
  "suggest.i_feel_worse.help": "пожалуйста, помогите",
  "suggest.i_feel_worse.medication": "Мне нужно лекарство",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Я чувствую",
  "suggest.ctx.feeling.i_am": "Я",
  "suggest.ctx.feeling.better": "Лучше, чем раньше",
  "suggest.ctx.feeling.not_great": "Не очень хорошо",
  "suggest.ctx.feeling.pain": "У меня боль",
  "suggest.ctx.feeling.okay": "Я в порядке",
  "suggest.ctx.feeling.help": "Можете мне помочь?",

  "suggest.ctx.need.i_need": "Мне нужно",
  "suggest.ctx.need.i_want": "Я хочу",
  "suggest.ctx.need.fine": "Сейчас всё в порядке",
  "suggest.ctx.need.yes": "Да, пожалуйста",
  "suggest.ctx.need.no": "Нет, спасибо",
  "suggest.ctx.need.stay": "Можете остаться?",

  "suggest.ctx.where_hurts.head": "Голова",
  "suggest.ctx.where_hurts.chest": "Грудь",
  "suggest.ctx.where_hurts.stomach": "Живот",
  "suggest.ctx.where_hurts.back": "Спина",
  "suggest.ctx.where_hurts.left_arm": "Левая рука",
  "suggest.ctx.where_hurts.right_leg": "Правая нога",
  "suggest.ctx.where_hurts.everywhere": "Везде",

  "suggest.ctx.pain.very_bad": "Очень сильная",
  "suggest.ctx.pain.worse": "Становится хуже",
  "suggest.ctx.pain.same": "Примерно так же",
  "suggest.ctx.pain.little_better": "Немного лучше",
  "suggest.ctx.pain.need_relief": "Мне нужно что-то от боли",

  "suggest.ctx.comfort.comfortable": "Мне удобно",
  "suggest.ctx.comfort.not_comfortable": "Мне неудобно",
  "suggest.ctx.comfort.cant_sleep": "Я не могу заснуть",
  "suggest.ctx.comfort.cold": "Мне холодно",
  "suggest.ctx.comfort.hot": "Мне жарко",
  "suggest.ctx.comfort.adjust_bed": "Можете отрегулировать кровать?",

  "suggest.ctx.night.cant_sleep": "Я не могу заснуть",
  "suggest.ctx.night.i_need": "Мне нужно",
  "suggest.ctx.night.pain": "У меня боль",
  "suggest.ctx.night.i_feel": "Я чувствую",
  "suggest.ctx.night.can_you": "Можете ли вы",
  "suggest.ctx.night.please": "Пожалуйста",
  "suggest.ctx.night.i_am": "Я",
  "suggest.ctx.night.when": "Когда",

  "suggest.ctx.morning.i_am": "Я",
  "suggest.ctx.morning.i_need": "Мне нужно",
  "suggest.ctx.morning.i_feel": "Я чувствую",
  "suggest.ctx.morning.doctor": "Когда придёт врач?",
  "suggest.ctx.morning.i_want": "Я хочу",
  "suggest.ctx.morning.can_you": "Можете ли вы",
  "suggest.ctx.morning.please": "Пожалуйста",
  "suggest.ctx.morning.tell_me": "Скажите мне",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Быстрое",
  "cat.needs": "Мне нужно",
  "cat.feelings": "Я чувствую",
  "cat.pain": "Боль",
  "cat.questions": "Вопросы",
  "sub.comfort": "Комфорт",
  "sub.medical": "Медицинское",
  "sub.people": "Люди",
  "sub.physical": "Физическое",
  "sub.emotional": "Эмоциональное",

  // Provider category labels
  "provider.cat.responses": "Ответы",
  "provider.cat.questions": "Вопросы",
  "provider.cat.directions": "Указания",
  "provider.cat.goals_of_care": "Цели лечения",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — разговор: {name}",
  "ui.patient.app.name_fallback": "Пациент",
  "ui.patient.header.name_fallback": "Пациент",
  "ui.patient.header.bed_prefix": "Кровать ",
  "ui.dual.nav.wishes": "Пожелания",
  "ui.dual.nav.listen": "Слушать",
  "ui.provider.nav.staff": "Персонал",
  "ui.provider.nav.switch_patient": "Сменить пациента",
  "ui.provider.nav.settings": "Настройки",
  "ui.provider.nav.theme.auto": "Авто",
  "ui.provider.nav.theme.light": "Светлая",
  "ui.provider.nav.theme.dark": "Тёмная",
  "ui.patient.tabbar.say_more": "Сказать ещё",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Насколько сильная боль?",
  "ui.dual.pain.heading.location": "Где у вас болит?",
  "ui.dual.pain.heading.descriptor": "Какая у вас боль?",
  "ui.patient.pain.step_of": "Шаг {n} из {total}",
  "ui.patient.pain.back_to": "Вернуться к: {label}",
  "ui.patient.pain.level_aria": "Уровень боли {n}, {label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Пожелания: {name}",
  "ui.patient.wishes.my_wishes": "Мои пожелания",
  "ui.patient.wishes.step_of": "Шаг {n} из {total}",
  "ui.patient.wishes.none_shared": "Пожелания не были озвучены.",
  "ui.patient.wishes.share_all_again": "Озвучить все пожелания снова",
  "ui.patient.wishes.close": "Закрыть",
  "ui.patient.wishes.share": "Озвучить",
  "ui.patient.wishes.skip": "Пропустить",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Нажимайте слова ниже или печатайте...",
  "ui.patient.builder.message_aria": "Ваше сообщение",
  "ui.patient.builder.undo": "Отменить последнее слово",
  "ui.patient.builder.clear": "Очистить сообщение",
  "ui.patient.builder.refresh_ai": "Обновить предложения ИИ",
  "ui.patient.builder.ai_thinking": "ИИ думает...",
  "ui.patient.builder.no_ai_suggestions":
    "Нет предложений ИИ. Нажмите обновить, чтобы попробовать снова.",
  "ui.patient.builder.ready":
    "Сообщение готово. Нажмите «Произнести», чтобы отправить.",
  "ui.patient.builder.speak": "Произнести",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Повторить: {text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Медицинская команда",
  "ui.provider.fallback_name": "Специалист",
  "ui.provider.speaking_to": "Обращение к {name} от лица {prov}",
  "ui.provider.patient_fallback": "пациент",
  "ui.provider.close_panel": "Закрыть панель",
  "ui.provider.select_provider": "Выбрать: {name}",
  "ui.provider.show_category": "Показать {key}",
  "ui.provider.speak_phrase": "Произнести: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Слушать",
  "ui.provider.listen.stop_aria": "Прекратить прослушивание",
  "ui.provider.listen.start_aria": "Нажмите, чтобы начать слушать",
  "ui.provider.listen.listening": "Слушаю...",
  "ui.provider.listen.transcribing": "Транскрибирую...",
  "ui.provider.listen.listening_placeholder": "Слушаю речь...",
  "ui.provider.listen.transcribing_placeholder": "Транскрибирую речь...",
  "ui.provider.listen.type_placeholder": "Или введите сказанное...",
  "ui.provider.listen.transcript_aria": "Транскрипция",
  "ui.provider.listen.add_as": "Добавить в разговор от лица {prov}",
  "ui.provider.listen.privacy_notice":
    "На устройстве · Whisper · звук не покидает это устройство",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Говорит: {text}",
  "ui.dual.speaking.patient_voice": "Ваш голос",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Введите PIN",
  "ui.provider.pin_gate.subtitle": "Только для персонала",
  "ui.provider.pin_gate.incorrect": "Неверный PIN",
  "ui.provider.pin_gate.delete_aria": "Удалить",
  "ui.provider.pin_gate.digit_aria": "Цифра {n}",
  "ui.provider.pin_gate.cancel": "Отмена",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Сейчас вы прочитаете предложение вслух.",
  "ui.provider.voice_capture.coaching_breath":
    "Сделайте несколько глубоких вдохов.",
  "ui.provider.voice_capture.coaching_ready": "Готово.",
  "ui.provider.voice_capture.breathe_in": "Вдох…",
  "ui.provider.voice_capture.breathe_out": "Выдох…",
  "ui.provider.voice_capture.creating": "Создание клона голоса...",
  "ui.provider.voice_capture.creating_from_sample":
    "Создание клона голоса из образца...",
  "ui.provider.voice_capture.loading_model":
    "Загрузка голосовой модели...",
  "ui.provider.voice_capture.clone_failed": "Клонирование не удалось",
  "ui.provider.voice_capture.captured": "Голос записан",
  "ui.provider.voice_capture.stop": "Стоп",
  "ui.provider.voice_capture.play": "Воспроизвести",
  "ui.provider.voice_capture.discard": "Удалить запись",
  "ui.provider.voice_capture.use_recording": "Использовать эту запись",
  "ui.provider.voice_capture.upload_file": "Загрузить файл",
  "ui.provider.voice_capture.record": "Записать",
  "ui.provider.voice_capture.stop_early": "Остановить раньше",
  "ui.provider.voice_capture.remove": "Удалить",
  "ui.provider.voice_capture.retry": "Повторить",
  "ui.provider.voice_capture.done": "Готово!",
  "ui.provider.voice_capture.cancel": "Отмена",
  "ui.provider.voice_capture.seconds_recorded": "{n} с записано",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Отменить обратный отсчёт записи",
  "ui.provider.voice_capture.stop_early_aria":
    "Остановить запись раньше времени",
  "ui.provider.voice_capture.audio_level_aria": "Уровень звука",
  "ui.provider.voice_capture.recording_progress_aria":
    "Ход записи",
  "ui.provider.voice_capture.stop_preview_aria":
    "Остановить предпрослушивание",
  "ui.provider.voice_capture.play_preview_aria":
    "Воспроизвести предпрослушивание записи",
  "ui.provider.voice_capture.discard_aria":
    "Удалить эту запись и начать заново",
  "ui.provider.voice_capture.stop_playback_aria":
    "Остановить воспроизведение записанного образца",
  "ui.provider.voice_capture.play_sample_aria":
    "Воспроизвести записанный образец голоса",
  "ui.provider.voice_capture.remove_aria": "Удалить образец голоса",
  "ui.provider.voice_capture.retry_aria":
    "Повторить извлечение клона голоса",
  "ui.provider.voice_capture.upload_aria":
    "Загрузить образец голоса из файла",
  "ui.provider.voice_capture.record_aria":
    "Записать образец голоса с микрофона",
  "ui.provider.voice_capture.err_network":
    "Не удалось подключиться к голосовой модели. Проверьте соединение и нажмите «Повторить».",
  "ui.provider.voice_capture.err_timeout":
    "Обработка голоса заняла слишком много времени. Нажмите «Повторить», чтобы попробовать снова.",
  "ui.provider.voice_capture.err_mic_denied":
    "Доступ к микрофону заблокирован. Разрешите его в настройках браузера или загрузите файл.",
  "ui.provider.voice_capture.err_generic":
    "Не удалось завершить подготовку голоса. Нажмите «Повторить», чтобы попробовать снова.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Доступ к микрофону запрещён. Попробуйте загрузить файл.",
  "ui.provider.voice_capture.err_playback":
    "Не удалось воспроизвести аудио.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Улучшенный",
  "ui.provider.fallback_voice.enhanced_aria": "Улучшенный нейронный голос",
  "ui.provider.fallback_voice.on_device_badge": "На устройстве",
  "ui.provider.fallback_voice.playing": "Воспроизведение...",
  "ui.provider.fallback_voice.unavailable":
    "Системные голоса недоступны на этом устройстве.",
  "ui.provider.fallback_voice.loading":
    "Загрузка доступных голосов...",
  "ui.provider.fallback_voice.hide_others": "Скрыть другие голоса",
  "ui.provider.fallback_voice.more_voices": "Ещё голоса ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Пациент",
  "ui.provider.setup.steps.voice": "Голос",
  "ui.provider.setup.steps.care_team": "Команда",
  "ui.provider.setup.steps.confirm": "Подтверждение",

  "ui.provider.setup.skip": "Пропустить →",
  "ui.provider.setup.skip_aria": "Пропустить настройку",
  "ui.provider.setup.skip_dialog.title": "Пропустить настройку?",
  "ui.provider.setup.skip_dialog.body":
    "Вы сможете завершить это позже в Настройках.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Пациент не будет добавлен.",
  "ui.provider.setup.skip_dialog.confirm": "Пропустить настройку",
  "ui.provider.setup.skip_dialog.cancel": "Продолжить",

  "ui.provider.setup.back": "Назад",
  "ui.provider.setup.continue": "Далее",
  "ui.provider.setup.start": "Запустить OwnVoice",

  "ui.provider.setup.step0.heading": "Добро пожаловать в OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Настроим вашу коммуникационную панель. Все данные остаются на этом устройстве.",
  "ui.provider.setup.step0.name_label": "Имя пациента",
  "ui.provider.setup.step0.name_placeholder":
    "Имя или предпочтительное обращение",
  "ui.provider.setup.step0.bed_label": "Кровать / Палата",
  "ui.provider.setup.step0.bed_placeholder": "напр. 4Б-12",
  "ui.provider.setup.step0.language_label": "Язык",

  "ui.provider.setup.step1.heading": "Образец голоса",
  "ui.provider.setup.step1.body1":
    "Запишите образец голоса, чтобы OwnVoice мог говорить голосом пациента. Этот шаг необязателен.",
  "ui.provider.setup.step1.body2":
    "Клонирование голоса выполняется полностью на устройстве. Аудио не покидает этот планшет.",
  "ui.provider.setup.step1.patient_label": "Пациент",
  "ui.provider.setup.step1.backup_voice_heading": "Резервный голос",
  "ui.provider.setup.step1.backup_voice_body1":
    "Выберите системный голос для использования, пока клон голоса загружается, или если образец не был записан. Нажмите на голос для прослушивания.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Используется встроенный синтез речи вашего устройства.",

  "ui.provider.setup.step2.heading": "Медицинская команда",
  "ui.provider.setup.step2.body":
    "Добавьте специалистов, которые будут ухаживать за этим пациентом.",
  "ui.provider.setup.step2.icon_label": "Значок",
  "ui.provider.setup.step2.name_label": "Имя",
  "ui.provider.setup.step2.name_placeholder":
    "Д-р Иванов, медсестра Анна...",
  "ui.provider.setup.step2.add": "Добавить",

  "ui.provider.setup.step3.heading": "Всё готово",
  "ui.provider.setup.step3.body":
    "Проверьте настройки. Вы сможете изменить что-либо позже в Настройках.",
  "ui.provider.setup.step3.summary.patient": "Пациент",
  "ui.provider.setup.step3.summary.bed": "Кровать / Палата",
  "ui.provider.setup.step3.summary.language": "Язык",
  "ui.provider.setup.step3.summary.language_default": "Английский",
  "ui.provider.setup.step3.summary.voice": "Голос",
  "ui.provider.setup.step3.summary.care_team": "Медицинская команда",
  "ui.provider.setup.step3.summary.not_set": "Не задано",
  "ui.provider.setup.step3.summary.captured": "Записан",
  "ui.provider.setup.step3.summary.not_captured": "Не записан",
  "ui.provider.setup.step3.summary.none_added": "Никто не добавлен",
  "ui.provider.setup.step3.pin_label": "PIN персонала (необязательно)",
  "ui.provider.setup.step3.pin_body":
    "Задайте 4-значный PIN для защиты настроек специалистов.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Настройки",
  "ui.provider.settings.done": "Готово",
  "ui.provider.settings.close_aria": "Закрыть настройки",

  "ui.provider.patient_edit.title": "Редактировать {name}",
  "ui.provider.patient_edit.title_default": "Редактировать пациента",
  "ui.provider.patient_edit.close_aria": "Закрыть редактор пациента",
  "ui.provider.patient_pill.aria": "Редактировать пациента: {name}",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Отменить подготовку голоса для {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "Прогресс ({current} / {total} фраз) будет утрачен. Записанный образец голоса сохраняется — вы сможете перезапустить подготовку позже.",
  "ui.provider.settings.voice_cache.cancel": "Отмена",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Отменить и сохранить подготовку голоса",
  "ui.provider.settings.voice_cache.discard_confirm": "Удалить",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Подтвердить удаление подготовки голоса",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Отменить подготовку голоса для {label}",
  // TODO(translator): {plural} token is an English suffix — Russian has 3 plural forms; token may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "В очереди — голос {label} будет подготовлен следующим ({total} фраз{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Подготовка голоса {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Пауза — голос {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Продолжить",
  "ui.provider.settings.voice_cache.resume_aria":
    "Продолжить подготовку голоса {label}",
  "ui.provider.settings.voice_cache.pause": "Пауза",
  "ui.provider.settings.voice_cache.pause_aria":
    "Приостановить подготовку голоса {label}",
  "ui.provider.settings.voice_cache.done":
    "Клон голоса активен — все {total} фраз готовы голосом {label}",
  // TODO(translator): {plural} token is an English suffix — Russian has 3 plural forms; token may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} фраз{plural} не удалось для {label}",
  "ui.provider.settings.voice_cache.retry": "Повторить",
  "ui.provider.settings.voice_cache.retry_aria":
    "Повторить неудавшиеся фразы голосового кэша",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "О приложении",
  "ui.provider.settings.about.subtitle":
    "Средство коммуникации AAC для госпитализированных пациентов.",
  "ui.provider.settings.about.attribution_1":
    "Шкала боли: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Цели лечения: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Кэш SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Сброс",
  "ui.provider.settings.reset.action_label":
    "Сбросить приложение для нового пациента",
  "ui.provider.settings.reset.confirm_title": "Вы уверены?",
  "ui.provider.settings.reset.confirm_body":
    "Будут удалены все данные пациента, образцы голоса, история разговоров и настройки специалистов. Это действие нельзя отменить.",
  "ui.provider.settings.reset.confirm_destructive": "Сбросить всё",

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "Специальные возможности",
  "ui.provider.settings.accessibility.toggle_label":
    "Режим вспомогательного ввода",
  "ui.provider.settings.accessibility.toggle_description":
    "Увеличивает рамки фокуса, удлиняет задержку нажатия и усиливает визуальную обратную связь для пациентов, использующих трекбол, джойстик, курсор AssistiveTouch или переключатель.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Обнаружен внешний указатель.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Рассмотрите возможность включения режима вспомогательного ввода для этого пациента.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Пациенты",
  "ui.provider.settings.patients.active_remove_hint":
    "Переключитесь на другого пациента, прежде чем удалять этого.",
  "ui.provider.settings.patients.remove_button": "Удалить",
  "ui.provider.settings.patients.add_patient": "+ Добавить пациента",
  "ui.provider.settings.patients.remove_dialog.title":
    "Удалить {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Будут удалены образец голоса, история разговоров и кэшированное аудио клона голоса. Клоны голосов медицинской команды сохраняются для других пациентов. Это действие нельзя отменить.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Удалить",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Медицинская команда",
  "ui.provider.settings.care_team.empty":
    "Специалисты ещё не добавлены.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Информация о пациенте",
  "ui.provider.settings.patient_info.name_label": "Имя",
  "ui.provider.settings.patient_info.bed_label": "Кровать / Палата",
  "ui.provider.settings.patient_info.language_label": "Язык",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Язык пациента",
  "ui.provider.settings.lang.caregiver_section":
    "Язык медицинской команды",
  "ui.provider.settings.lang.caregiver_helper":
    "Язык, понятный вашей медицинской команде. Обычно настраивается один раз для устройства.",
  "ui.provider.settings.lang.change": "Сменить язык",

  "ui.provider.settings.lang.picker_title": "Выбрать язык",
  "ui.provider.settings.lang.patient_dialog.title":
    "Сменить язык пациента на {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Клон голоса остаётся готовым — фразы будут звучать так же. Мы подготовим аудио для {providerCount} голосов команды (~{estimatedMinutes} мин). Вы можете продолжать пользоваться приложением.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Клоны голосов медицинской команды недоступны на {lang} — будет использоваться системный голос. Существующие записи сохраняются на случай перехода на поддерживаемый язык.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Фразы будут звучать так же. Голоса команды не настроены, поэтому перегенерация не потребуется.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Сменить язык медицинской команды на {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Клоны голосов вашей команды остаются готовыми. Мы подготовим аудио голоса пациента на новом языке (~{estimatedMinutes} мин). Вы можете продолжать пользоваться приложением.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Клон голоса пациента недоступен на {lang} — будет использоваться системный голос. Записанный образец голоса пациента сохраняется на случай перехода на поддерживаемый язык.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Клон голоса пациента не настроен, поэтому перегенерация не потребуется.",
  "ui.provider.settings.patient_info.voice_label": "Голос",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Резервный голос",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Системный голос, пока загружается клон. Нажмите для прослушивания.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Готовность к работе без сети",
  "ui.provider.settings.offline.status_description":
    "Статус моделей ИИ, используемых на устройстве для генерации речи, предложений и распознавания речи.",
  "ui.provider.settings.offline.downloading":
    "Загрузка моделей…",
  "ui.provider.settings.offline.download_progress_aria":
    "Ход загрузки моделей",
  "ui.provider.settings.offline.all_ready":
    "Все модели готовы",
  "ui.provider.settings.offline.redownload_button":
    "Загрузить модели заново",
  "ui.provider.settings.offline.already_up_to_date":
    "Уже актуально",
  "ui.provider.settings.offline.checking": "Проверка…",
  "ui.provider.settings.offline.verified": "✓ Модели проверены",
  "ui.provider.settings.offline.check_button":
    "Проверить существующие модели",
  "ui.provider.settings.offline.redownloading":
    "Повторная загрузка…",
  "ui.provider.settings.offline.force_redownload_button":
    "Принудительно загрузить все модели заново",
  "ui.provider.settings.offline.model_status_ready": "готово",
  "ui.provider.settings.offline.model_status_downloading":
    "загрузка…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "требуется повтор",
  "ui.provider.settings.offline.last_verified_prefix":
    "Последняя проверка: ",
  "ui.provider.settings.offline.storage_prefix": "Хранилище: ",
  "ui.provider.settings.offline.storage_of": " из ",
  "ui.provider.settings.offline.storage_used": " использовано",
  "ui.provider.settings.offline.storage_low": " — мало места",
  "ui.provider.settings.offline.clear_audio_cache":
    "Очистить аудиокэш",
  "ui.provider.settings.offline.clearing": "Очистка…",
  "ui.provider.settings.offline.rebuilding":
    "Перестроение: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Загрузить все модели ИИ заново?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Будет загружено около 1,7 ГБ. Синтез речи продолжит работать во время обновления.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Загрузить заново",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Сменить пациента",
  "ui.provider.switch.add_patient": "+ Добавить пациента",
  "ui.provider.patients.title": "Пациенты",
  "ui.provider.patients.actions_aria": "Действия для {name}",
  "ui.provider.patients.action_edit": "Редактировать",
  "ui.provider.patients.action_remove": "Удалить",
  "ui.provider.switch.voice_captured": "Голос записан",
  "ui.provider.switch.no_voice": "Нет голоса",
  "ui.provider.switch.last_active_just_now": "Только что",
  "ui.provider.switch.last_active_minutes":
    "Активен {n} мин назад",
  "ui.provider.switch.last_active_hours": "Активен {n} ч назад",
  "ui.provider.switch.last_active_days": "Активен {n} д назад",
  "ui.provider.switch.currently_active": "Сейчас активен",
  "ui.provider.switch.switched_announcement":
    "Переключено на {name}. Сообщений в разговоре: {count}.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Сеанс персонала завершается",
  "ui.provider.staff_session.warning_body":
    "Доступ для персонала будет заблокирован через {n} секунд.",
  "ui.provider.staff_session.extend": "Продлить сеанс",
  "ui.provider.staff_session.end_now": "Завершить сейчас",
  "ui.provider.nav.end_staff_session": "Завершить сеанс персонала",
};

export default ru;
