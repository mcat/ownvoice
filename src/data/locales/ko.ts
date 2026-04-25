/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Korean (Seoul standard)
 * Locale: ko
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const ko: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "네",
  "quick.no": "아니요",
  "quick.thank_you": "감사합니다",
  "quick.please_wait": "잠시 기다려 주십시오",
  "quick.dont_understand": "이해하지 못하겠습니다",
  "quick.repeat": "다시 말씀해 주십시오",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "물이 필요합니다",
  "needs.comfort.hungry": "배가 고픕니다",
  "needs.comfort.cold": "춥습니다",
  "needs.comfort.hot": "덥습니다",
  "needs.comfort.bed": "침대를 조절해 주십시오",
  "needs.comfort.bathroom": "화장실이 필요합니다",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "약이 필요합니다",
  "needs.medical.suction": "흡인이 필요합니다",
  "needs.medical.nauseous": "속이 메스꺼습니다",
  "needs.medical.breathe": "숨쉬기가 힘듭니다",
  "needs.medical.nurse": "간호사가 필요합니다",
  "needs.medical.doctor": "의사 선생님이 필요합니다",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "가족을 만나고 싶습니다",
  "needs.people.stay": "누군가 함께 있어 주실 수 있습니까?",
  "needs.people.call": "전화를 하고 싶습니다",
  "needs.people.interpreter": "통역사가 필요합니다",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "피곤합니다",
  "feelings.physical.uncomfortable": "불편합니다",
  "feelings.physical.weak": "힘이 없습니다",
  "feelings.physical.better": "좀 나아졌습니다",
  "feelings.physical.dizzy": "어지럽습니다",
  "feelings.physical.itchy": "가렵습니다",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "무섭습니다",
  "feelings.emotional.lonely": "외롭습니다",
  "feelings.emotional.frustrated": "답답합니다",
  "feelings.emotional.confused": "혼란스럽습니다",
  "feelings.emotional.safe": "안심이 됩니다",
  "feelings.emotional.grateful": "감사합니다",
  "feelings.emotional.worried": "걱정됩니다",
  "feelings.emotional.hopeful": "희망이 있습니다",
  "feelings.emotional.bored": "지루합니다",
  "feelings.emotional.embarrassed": "부끄럽습니다",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "지금 몇 시입니까?",
  "questions.day": "오늘 무슨 요일입니까?",
  "questions.whats_happening": "저에게 무슨 일이 일어나고 있습니까?",
  "questions.go_home": "언제 퇴원할 수 있습니까?",
  "questions.next_medication": "다음 약은 언제입니까?",
  "questions.explain_treatment": "치료에 대해 설명해 주실 수 있습니까?",
  "questions.nurse_today": "오늘 담당 간호사는 누구입니까?",
  "questions.eat_drink": "음식이나 음료를 먹어도 됩니까?",
  "questions.see_family": "가족을 언제 만날 수 있습니까?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "통증 없음",
  "pain.face.2": "조금 아픔",
  "pain.face.4": "좀 더 아픔",
  "pain.face.6": "더 많이 아픔",
  "pain.face.8": "매우 아픔",
  "pain.face.10": "최고로 아픔",

  // ── Pain: Descriptors ──────────────────────────────────────────
  // NOTE: These are in pre-noun modifier (관형어) form so they compose
  // naturally with "통증" in the pain.sentence template.
  "pain.descriptor.aching": "쑤시는",
  "pain.descriptor.burning": "화끈거리는",
  "pain.descriptor.sharp": "찌르는",
  "pain.descriptor.throbbing": "욱신거리는",
  "pain.descriptor.cramping": "쥐어짜는",
  "pain.descriptor.constant": "지속적인",
  "pain.descriptor.comes_and_goes": "간헐적인",
  "pain.descriptor.numb": "저린",
  "pain.descriptor.pressure": "누르는",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "머리",
  "pain.region.face": "얼굴",
  "pain.region.neck": "목",
  "pain.region.chest": "가슴",
  "pain.region.left_shoulder": "왼쪽 어깨",
  "pain.region.right_shoulder": "오른쪽 어깨",
  "pain.region.left_arm": "왼팔",
  "pain.region.right_arm": "오른팔",
  "pain.region.stomach": "배",
  "pain.region.upper_back": "윗등",
  "pain.region.lower_back": "허리",
  "pain.region.left_leg": "왼쪽 다리",
  "pain.region.right_leg": "오른쪽 다리",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  // Korean SOV word order: region + 에 (locative) + descriptor + 통증.
  "pain.sentence":
    "제 {region}에 {descriptor} 통증이 있습니다. 10점 만점에 {severity}점입니다",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "강도",
  "pain.step.location": "위치",
  "pain.step.descriptor": "설명",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "나의 목표",
  "wishes.worries.label": "나의 걱정",
  "wishes.strength.label": "나의 힘",
  "wishes.joy.label": "나에게 기쁨을 주는 것",
  "wishes.tradeoffs.label": "치료에 대하여",
  "wishes.family.label": "나의 가족",
  "wishes.hopes.label": "나의 희망",

  // Questions
  "wishes.goals.question": "가장 중요한 목표는 무엇입니까?",
  "wishes.worries.question": "가장 큰 걱정은 무엇입니까?",
  "wishes.strength.question": "무엇이 힘을 줍니까?",
  "wishes.joy.question": "삶에 기쁨과 의미를 주는 것은 무엇입니까?",
  "wishes.tradeoffs.question":
    "더 많은 시간을 위해 얼마나 견디실 수 있습니까?",
  "wishes.family.question":
    "가까운 분들이 환자분의 바람에 대해 얼마나 알고 있습니까?",
  "wishes.hopes.question": "희망은 무엇입니까?",

  // Stems (for composeSentence)
  // Used with colon in wishes.compose: "{stem}: {list}"
  "wishes.goals.stem": "저에게 가장 중요한 것",
  "wishes.worries.stem": "제가 걱정하는 것",
  "wishes.strength.stem": "저에게 힘이 되는 것",
  "wishes.joy.stem": "저에게 기쁨을 주는 것",
  "wishes.tradeoffs.stem": "치료에 대한 저의 생각",
  "wishes.family.stem": "저의 가족에 대하여",
  "wishes.hopes.stem": "제가 바라는 것",

  // Responses — goals
  "wishes.goals.r.family": "가족과 함께하는 것",
  "wishes.goals.r.comfort": "편안하고 통증 없이 지내는 것",
  "wishes.goals.r.longevity": "가능한 한 오래 사는 것",
  "wishes.goals.r.home": "퇴원하는 것",
  "wishes.goals.r.independence": "스스로 할 수 있는 것",
  "wishes.goals.r.peace": "평안한 것",

  // Responses — worries
  "wishes.worries.r.suffering": "고통받거나 아픈 것",
  "wishes.worries.r.alone": "혼자 있는 것",
  "wishes.worries.r.burden": "가족에게 짐이 되는 것",
  "wishes.worries.r.activities": "좋아하는 일을 못하는 것",
  "wishes.worries.r.leaving": "가족을 두고 떠나는 것",
  "wishes.worries.r.unknown": "앞으로 어떻게 될지 모르는 것",

  // Responses — strength
  "wishes.strength.r.family": "저의 가족",
  "wishes.strength.r.faith": "저의 신앙",
  "wishes.strength.r.friends": "저의 친구들",
  "wishes.strength.r.wishes_heard": "제 바람이 전달된다는 것",
  "wishes.strength.r.hope": "나아질 거라는 희망",
  "wishes.strength.r.carers": "저를 돌봐 주시는 분들",

  // Responses — joy
  "wishes.joy.r.family": "가족과 시간 보내기",
  "wishes.joy.r.outdoors": "바깥에 나가기",
  "wishes.joy.r.hobbies": "취미와 관심사",
  "wishes.joy.r.helping": "다른 사람을 돕기",
  "wishes.joy.r.spiritual": "종교 생활",
  "wishes.joy.r.routines": "소박한 일상",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "가능한 모든 치료를 원합니다",
  "wishes.tradeoffs.r.good_chance":
    "가능성이 높은 치료를 원합니다",
  "wishes.tradeoffs.r.try_stop":
    "시도하되 효과가 없으면 중단하고 싶습니다",
  "wishes.tradeoffs.r.comfortable": "편안함에 집중하고 싶습니다",
  "wishes.tradeoffs.r.think": "더 생각할 시간이 필요합니다",
  "wishes.tradeoffs.r.family_first":
    "가족과 먼저 상의해야 합니다",

  // Responses — family
  "wishes.family.r.know_well": "제 바람을 잘 알고 있습니다",
  "wishes.family.r.know_some": "어느 정도 알고 있습니다",
  "wishes.family.r.not_talked": "아직 이야기하지 않았습니다",
  "wishes.family.r.need_help": "전달하는 데 도움이 필요합니다",
  "wishes.family.r.team_explain":
    "의료진이 설명해 주셨으면 합니다",

  // Responses — hopes
  "wishes.hopes.r.get_better": "나아지는 것",
  "wishes.hopes.r.go_home": "퇴원하는 것",
  "wishes.hopes.r.comfortable": "편안한 것",
  "wishes.hopes.r.family_ok": "가족이 잘 지내는 것",
  "wishes.hopes.r.more_time": "더 많은 시간을 갖는 것",
  "wishes.hopes.r.peace": "평안한 것",

  // Wish sentence composition templates
  // Korean uses colon instead of copula to avoid particle allomorph issues with {list}
  "wishes.compose": "{stem}: {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "도와줄 사람을 데려오겠습니다.",
  "provider.responses.interpreter": "통역사를 불러오겠습니다.",
  "provider.responses.family": "가족분께 연락하겠습니다.",
  "provider.responses.get_that": "가져다 드리겠습니다.",
  "provider.responses.doctor_know": "의사 선생님께 전달하겠습니다.",
  "provider.responses.medication": "약을 가져오겠습니다.",
  "provider.responses.family_coming": "가족분이 오고 계십니다.",
  "provider.responses.doctor_soon": "의사 선생님이 곧 오십니다.",
  "provider.responses.doing_well": "잘 하고 계십니다.",
  "provider.responses.rest": "지금 쉬어 보세요.",

  "provider.questions.feeling": "기분이 어떠십니까?",
  "provider.questions.need": "필요한 것이 있으십니까?",
  "provider.questions.where_hurts":
    "어디가 아프신지 가리켜 주시겠습니까?",
  "provider.questions.rate_pain": "통증을 0에서 10으로 평가해 주십시오.",
  "provider.questions.sleep": "잘 주무셨습니까?",
  "provider.questions.comfortable": "편안하십니까?",

  "provider.directions.procedure":
    "오늘 시술이 예정되어 있습니다.",
  "provider.directions.stay_in_bed": "침대에 계셔야 합니다.",
  "provider.directions.vitals": "활력 징후를 확인하겠습니다.",
  "provider.directions.medication_time": "약 드실 시간입니다.",
  "provider.directions.breathe": "천천히 깊게 숨을 쉬어 보세요.",
  "provider.directions.call_button":
    "필요한 것이 있으시면 호출 버튼을 누르십시오.",

  "provider.goals_of_care.matters_most":
    "환자분께 가장 중요한 것에 대해 이야기하고 싶습니다.",
  "provider.goals_of_care.goals":
    "지금 가장 중요한 목표는 무엇입니까?",
  "provider.goals_of_care.worries":
    "가장 큰 걱정은 무엇입니까?",
  "provider.goals_of_care.strength": "무엇이 힘이 되십니까?",
  "provider.goals_of_care.joy":
    "삶에 기쁨과 의미를 주는 것은 무엇입니까?",
  "provider.goals_of_care.wishes":
    "가까운 분들이 환자분의 바람에 대해 얼마나 알고 있습니까?",
  "provider.goals_of_care.hopes": "희망은 무엇입니까?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "잘 잤습니다",
  "time.morning.didnt_sleep": "잠을 잘 못 잤습니다",
  "time.morning.breakfast": "아침 식사가 필요합니다",
  "time.morning.doctor_coming": "의사 선생님은 언제 오십니까?",

  "time.afternoon.tired": "피곤합니다",
  "time.afternoon.lunch": "점심을 먹을 수 있습니까?",
  "time.afternoon.see_family": "가족을 언제 만날 수 있습니까?",
  "time.afternoon.rest": "쉬어야 합니다",

  "time.evening.cant_sleep": "잠이 오지 않습니다",
  "time.evening.medication": "약이 필요합니다",
  "time.evening.call_family": "가족에게 전화할 수 있습니까?",
  "time.evening.pain": "아픕니다",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Korean is SOV — builder fragments concatenate in sequence.
  // Korean verb conjugation and particles may not compose cleanly across all paths.
  // Review each path for grammaticality once the builder UX is finalized.
  "suggest.start.i_am": "저는",
  "suggest.start.i_feel": "저는",
  "suggest.start.i_want": "저는",
  "suggest.start.i_need": "저는",
  "suggest.start.please": "부디",
  "suggest.start.when": "언제",
  "suggest.start.can_you": "혹시",
  "suggest.start.tell_me": "알려주세요",

  "suggest.i_am.in_pain": "아픕니다",
  "suggest.i_am.cold": "춥습니다",
  "suggest.i_am.hot": "덥습니다",
  "suggest.i_am.hungry": "배고픕니다",
  "suggest.i_am.thirsty": "목이 마릅니다",
  "suggest.i_am.tired": "피곤합니다",
  "suggest.i_am.uncomfortable": "불편합니다",
  "suggest.i_am.okay": "괜찮습니다",
  "suggest.i_am.not_okay": "괜찮지 않습니다",
  "suggest.i_am.ready": "준비되었습니다",

  "suggest.i_feel.scared": "무섭습니다",
  "suggest.i_feel.sick": "아픕니다",
  "suggest.i_feel.dizzy": "어지럽습니다",
  "suggest.i_feel.weak": "힘이 없습니다",
  "suggest.i_feel.better": "나아졌습니다",
  "suggest.i_feel.worse": "더 안 좋아졌습니다",
  "suggest.i_feel.nauseous": "속이 메스꺼습니다",
  "suggest.i_feel.lonely": "외롭습니다",
  "suggest.i_feel.confused": "혼란스럽습니다",
  "suggest.i_feel.safe": "안심이 됩니다",

  "suggest.i_feel_scared.procedure": "시술이 걱정됩니다",
  "suggest.i_feel_scared.happening": "무슨 일인지 걱정됩니다",
  "suggest.i_feel_scared.alone": "혼자 있는 게 무섭습니다",
  "suggest.i_feel_scared.need_someone": "누군가 필요합니다",

  "suggest.i_feel_sick.stomach": "속이 안 좋습니다",
  "suggest.i_feel_sick.dizzy": "어지럽기도 합니다",
  "suggest.i_feel_sick.help": "도움이 필요합니다",

  "suggest.i_want.water": "물",
  "suggest.i_want.family": "가족을 만나고 싶습니다",
  "suggest.i_want.go_home": "퇴원하고 싶습니다",
  "suggest.i_want.sleep": "자고 싶습니다",
  "suggest.i_want.medication": "약",
  "suggest.i_want.blanket": "담요",
  "suggest.i_want.talk": "누군가와 이야기하고 싶습니다",
  "suggest.i_want.nurse": "간호사",

  "suggest.i_want_to_go.home": "집에",
  "suggest.i_want_to_go.sleep": "자러",
  "suggest.i_want_to_go.bathroom": "화장실에",

  "suggest.i_want_my.family": "가족",
  "suggest.i_want_my.medication": "약",
  "suggest.i_want_my.phone": "전화기",
  "suggest.i_want_my.glasses": "안경",
  "suggest.i_want_my.blanket": "담요",

  "suggest.i_need.help": "도움이 필요합니다",
  "suggest.i_need.water": "물이 필요합니다",
  "suggest.i_need.bathroom": "화장실이 필요합니다",
  "suggest.i_need.medication": "약이 필요합니다",
  "suggest.i_need.nurse": "간호사가 필요합니다",
  "suggest.i_need.doctor": "의사 선생님이 필요합니다",
  "suggest.i_need.rest": "쉬어야 합니다",
  "suggest.i_need.blanket": "담요가 필요합니다",
  "suggest.i_need.suction": "흡인이 필요합니다",

  "suggest.i_need_the.nurse": "간호사",
  "suggest.i_need_the.doctor": "의사 선생님",
  "suggest.i_need_the.bathroom": "화장실",
  "suggest.i_need_the.light_off": "불 꺼 주세요",
  "suggest.i_need_the.light_on": "불 켜 주세요",

  "suggest.i_need_my.medication": "약",
  "suggest.i_need_my.family": "가족",
  "suggest.i_need_my.glasses": "안경",
  "suggest.i_need_my.phone": "전화기",

  "suggest.please.help_me": "도와주세요",
  "suggest.please.call_family": "가족에게 전화해 주세요",
  "suggest.please.light_off": "불을 꺼 주세요",
  "suggest.please.adjust_bed": "침대를 조절해 주세요",
  "suggest.please.give_me": "주세요",
  "suggest.please.explain": "설명해 주세요",
  "suggest.please.come_back": "다시 와 주세요",
  "suggest.please.stay": "함께 있어 주세요",
  "suggest.please.dont_leave": "가지 마세요",

  "suggest.please_help_me.pain": "아픕니다",
  "suggest.please_help_me.breathe": "숨을 쉴 수 없습니다",
  "suggest.please_help_me.sick": "아픕니다",
  "suggest.please_help_me.scared": "무섭습니다",

  "suggest.please_give_me.water": "물",
  "suggest.please_give_me.medication": "약",
  "suggest.please_give_me.blanket": "담요",
  "suggest.please_give_me.pain_relief": "진통제",

  "suggest.when.go_home": "퇴원할 수 있습니까?",
  "suggest.when.family": "가족이 옵니까?",
  "suggest.when.medication": "다음 약은 언제입니까?",
  "suggest.when.doctor": "의사 선생님이 오십니까?",
  "suggest.when.eat": "식사할 수 있습니까?",
  "suggest.when.over": "이것이 끝납니까?",

  "suggest.can_you.help": "도와주실 수 있습니까?",
  "suggest.can_you.call_family": "가족에게 전화해 주실 수 있습니까?",
  "suggest.can_you.get_nurse": "간호사를 불러 주실 수 있습니까?",
  "suggest.can_you.explain": "무슨 일인지 설명해 주실 수 있습니까?",
  "suggest.can_you.light_off": "불을 꺼 주실 수 있습니까?",
  "suggest.can_you.adjust_bed": "침대를 조절해 주실 수 있습니까?",
  "suggest.can_you.stay": "함께 있어 주실 수 있습니까?",

  "suggest.tell_me.happening": "무슨 일이 일어나고 있는지",
  "suggest.tell_me.time": "지금 몇 시인지",
  "suggest.tell_me.go_home": "언제 퇴원할 수 있는지",
  "suggest.tell_me.day": "오늘 무슨 요일인지",
  "suggest.tell_me.treatment": "치료에 대해서",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "도와주세요",
  "suggest.i_am_in_pain.worse": "점점 심해지고 있습니다",
  "suggest.i_am_in_pain.medication": "약이 필요합니다",
  "suggest.i_am_in_pain.back": "허리가",
  "suggest.i_am_in_pain.chest": "가슴이",
  "suggest.i_am_in_pain.stomach": "배가",

  // After "I need help"
  "suggest.i_need_help.up": "일어나는 데",
  "suggest.i_need_help.breathing": "숨쉬는 데",
  "suggest.i_need_help.pain": "통증 때문에",
  "suggest.i_need_help.now": "지금 바로",
  "suggest.i_need_help.please": "부탁드립니다",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "전보다",
  "suggest.i_feel_better.now": "지금은",
  "suggest.i_feel_better.thanks": "감사합니다",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "전보다",
  "suggest.i_feel_worse.need_doctor": "의사 선생님이 필요합니다",
  "suggest.i_feel_worse.help": "도와주세요",
  "suggest.i_feel_worse.medication": "약이 필요합니다",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "저는",
  "suggest.ctx.feeling.i_am": "저는",
  "suggest.ctx.feeling.better": "전보다 나아졌습니다",
  "suggest.ctx.feeling.not_great": "좋지 않습니다",
  "suggest.ctx.feeling.pain": "아픕니다",
  "suggest.ctx.feeling.okay": "괜찮습니다",
  "suggest.ctx.feeling.help": "도와주실 수 있습니까?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "필요합니다",
  "suggest.ctx.need.i_want": "원합니다",
  "suggest.ctx.need.fine": "지금은 괜찮습니다",
  "suggest.ctx.need.yes": "네, 부탁드립니다",
  "suggest.ctx.need.no": "아니요, 괜찮습니다",
  "suggest.ctx.need.stay": "함께 있어 주실 수 있습니까?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "머리",
  "suggest.ctx.where_hurts.chest": "가슴",
  "suggest.ctx.where_hurts.stomach": "배",
  "suggest.ctx.where_hurts.back": "허리",
  "suggest.ctx.where_hurts.left_arm": "왼팔",
  "suggest.ctx.where_hurts.right_leg": "오른쪽 다리",
  "suggest.ctx.where_hurts.everywhere": "전신",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "매우 심합니다",
  "suggest.ctx.pain.worse": "점점 심해지고 있습니다",
  "suggest.ctx.pain.same": "비슷합니다",
  "suggest.ctx.pain.little_better": "조금 나아졌습니다",
  "suggest.ctx.pain.need_relief": "진통제가 필요합니다",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "편안합니다",
  "suggest.ctx.comfort.not_comfortable": "불편합니다",
  "suggest.ctx.comfort.cant_sleep": "잠이 오지 않습니다",
  "suggest.ctx.comfort.cold": "춥습니다",
  "suggest.ctx.comfort.hot": "덥습니다",
  "suggest.ctx.comfort.adjust_bed": "침대를 조절해 주실 수 있습니까?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "잠이 오지 않습니다",
  "suggest.ctx.night.i_need": "필요합니다",
  "suggest.ctx.night.pain": "아픕니다",
  "suggest.ctx.night.i_feel": "저는",
  "suggest.ctx.night.can_you": "혹시",
  "suggest.ctx.night.please": "부디",
  "suggest.ctx.night.i_am": "저는",
  "suggest.ctx.night.when": "언제",

  // Morning starters
  "suggest.ctx.morning.i_am": "저는",
  "suggest.ctx.morning.i_need": "필요합니다",
  "suggest.ctx.morning.i_feel": "저는",
  "suggest.ctx.morning.doctor": "의사 선생님은 언제 오십니까?",
  "suggest.ctx.morning.i_want": "원합니다",
  "suggest.ctx.morning.can_you": "혹시",
  "suggest.ctx.morning.please": "부디",
  "suggest.ctx.morning.tell_me": "알려주세요",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "빠른 응답",
  "cat.needs": "필요합니다",
  "cat.feelings": "느낍니다",
  "cat.pain": "통증",
  "cat.questions": "질문",
  "sub.comfort": "편안함",
  "sub.medical": "의료",
  "sub.people": "사람",
  "sub.physical": "신체",
  "sub.emotional": "감정",

  // Provider category labels
  "provider.cat.responses": "응답",
  "provider.cat.questions": "질문",
  "provider.cat.directions": "지시",
  "provider.cat.goals_of_care": "돌봄 목표",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — {name} 대화",
  "ui.patient.app.name_fallback": "환자",
  "ui.patient.header.name_fallback": "환자",
  "ui.patient.header.bed_prefix": "침상 ",
  "ui.dual.nav.wishes": "바람",
  "ui.dual.nav.listen": "듣기",
  "ui.provider.nav.staff": "직원",
  "ui.provider.nav.switch_patient": "환자 전환",
  "ui.provider.nav.settings": "설정",
  "ui.provider.nav.theme.auto": "자동",
  "ui.provider.nav.theme.light": "밝게",
  "ui.provider.nav.theme.dark": "어둡게",
  "ui.patient.tabbar.say_more": "더 말하기",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "얼마나 아프십니까?",
  "ui.dual.pain.heading.location": "어디가 아프십니까?",
  "ui.dual.pain.heading.descriptor": "어떤 통증입니까?",
  "ui.patient.pain.step_of": "{total}단계 중 {n}단계",
  "ui.patient.pain.back_to": "{label}(으)로 돌아가기",
  "ui.patient.pain.level_aria": "통증 수준 {n}, {label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "{name}의 바람",
  "ui.patient.wishes.my_wishes": "나의 바람",
  "ui.patient.wishes.step_of": "{total}단계 중 {n}단계",
  "ui.patient.wishes.none_shared": "공유된 바람이 없습니다.",
  "ui.patient.wishes.share_all_again": "모든 바람 다시 공유하기",
  "ui.patient.wishes.close": "닫기",
  "ui.patient.wishes.share": "공유",
  "ui.patient.wishes.skip": "건너뛰기",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "아래 단어를 탭하거나 입력하세요...",
  "ui.patient.builder.message_aria": "내 메시지",
  "ui.patient.builder.undo": "마지막 단어 취소",
  "ui.patient.builder.clear": "메시지 지우기",
  "ui.patient.builder.refresh_ai": "AI 추천 새로고침",
  "ui.patient.builder.ai_thinking": "AI가 생각 중입니다...",
  "ui.patient.builder.no_ai_suggestions":
    "AI 추천이 없습니다. 새로고침을 탭하여 다시 시도하세요.",
  "ui.patient.builder.ready":
    "메시지가 준비되었습니다. 말하기를 탭하여 전송하세요.",
  "ui.patient.builder.speak": "말하기",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "반복: {text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "의료진",
  "ui.provider.fallback_name": "의료진",
  "ui.provider.speaking_to": "{prov}(으)로서 {name}에게 말하는 중",
  "ui.provider.patient_fallback": "환자",
  "ui.provider.close_panel": "패널 닫기",
  "ui.provider.select_provider": "{name} 선택",
  "ui.provider.show_category": "{key} 표시",
  "ui.provider.speak_phrase": "말하기: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "듣기",
  "ui.provider.listen.stop_aria": "듣기 중지",
  "ui.provider.listen.start_aria": "탭하여 듣기 시작",
  "ui.provider.listen.listening": "듣는 중...",
  "ui.provider.listen.transcribing": "변환 중...",
  "ui.provider.listen.listening_placeholder": "음성을 듣고 있습니다...",
  "ui.provider.listen.transcribing_placeholder": "음성을 변환하고 있습니다...",
  "ui.provider.listen.type_placeholder": "또는 들은 내용을 입력하세요...",
  "ui.provider.listen.transcript_aria": "음성 기록",
  "ui.provider.listen.add_as": "{prov}(으)로 대화에 추가",
  "ui.provider.listen.privacy_notice":
    "기기 내 처리 · Whisper · 음성이 기기 밖으로 나가지 않습니다",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "말하는 중: {text}",
  "ui.dual.speaking.patient_voice": "내 목소리",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "PIN 입력",
  "ui.provider.pin_gate.subtitle": "직원 전용",
  "ui.provider.pin_gate.incorrect": "PIN이 올바르지 않습니다",
  "ui.provider.pin_gate.delete_aria": "삭제",
  "ui.provider.pin_gate.digit_aria": "숫자 {n}",
  "ui.provider.pin_gate.cancel": "취소",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "문장을 소리 내어 읽게 됩니다.",
  "ui.provider.voice_capture.coaching_breath":
    "깊게 몇 번 호흡해 주세요.",
  "ui.provider.voice_capture.coaching_ready": "준비되었습니다.",
  "ui.provider.voice_capture.breathe_in": "들이쉬세요…",
  "ui.provider.voice_capture.breathe_out": "내쉬세요…",
  "ui.provider.voice_capture.creating": "음성 클론 생성 중...",
  "ui.provider.voice_capture.creating_from_sample":
    "샘플에서 음성 클론 생성 중...",
  "ui.provider.voice_capture.loading_model":
    "음성 모델 로딩 중...",
  "ui.provider.voice_capture.clone_failed": "클론 생성 실패",
  "ui.provider.voice_capture.captured": "음성 캡처 완료",
  "ui.provider.voice_capture.stop": "중지",
  "ui.provider.voice_capture.play": "재생",
  "ui.provider.voice_capture.discard": "녹음 삭제",
  "ui.provider.voice_capture.use_recording": "이 녹음 사용",
  "ui.provider.voice_capture.upload_file": "파일 업로드",
  "ui.provider.voice_capture.record": "녹음",
  "ui.provider.voice_capture.stop_early": "조기 중지",
  "ui.provider.voice_capture.remove": "제거",
  "ui.provider.voice_capture.retry": "재시도",
  "ui.provider.voice_capture.done": "완료!",
  "ui.provider.voice_capture.cancel": "취소",
  "ui.provider.voice_capture.seconds_recorded": "{n}초 녹음됨",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "녹음 카운트다운 취소",
  "ui.provider.voice_capture.stop_early_aria":
    "녹음 조기 중지",
  "ui.provider.voice_capture.audio_level_aria": "오디오 레벨",
  "ui.provider.voice_capture.recording_progress_aria":
    "녹음 진행률",
  "ui.provider.voice_capture.stop_preview_aria":
    "미리 듣기 재생 중지",
  "ui.provider.voice_capture.play_preview_aria":
    "녹음 미리 듣기 재생",
  "ui.provider.voice_capture.discard_aria":
    "이 녹음을 삭제하고 다시 시작",
  "ui.provider.voice_capture.stop_playback_aria":
    "녹음된 샘플 재생 중지",
  "ui.provider.voice_capture.play_sample_aria":
    "녹음된 음성 샘플 재생",
  "ui.provider.voice_capture.remove_aria": "음성 샘플 제거",
  "ui.provider.voice_capture.retry_aria":
    "음성 클론 추출 재시도",
  "ui.provider.voice_capture.upload_aria":
    "파일에서 음성 샘플 업로드",
  "ui.provider.voice_capture.record_aria":
    "마이크로 음성 샘플 녹음",
  "ui.provider.voice_capture.err_network":
    "음성 모델에 연결할 수 없습니다. 연결을 확인하고 재시도를 탭하세요.",
  "ui.provider.voice_capture.err_timeout":
    "음성 처리에 시간이 너무 오래 걸렸습니다. 재시도를 탭하세요.",
  "ui.provider.voice_capture.err_mic_denied":
    "마이크 접근이 차단되어 있습니다. 브라우저 설정에서 활성화하거나 파일을 업로드하세요.",
  "ui.provider.voice_capture.err_generic":
    "음성 준비를 완료할 수 없었습니다. 재시도를 탭하세요.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "마이크 접근이 거부되었습니다. 파일 업로드를 시도해 보세요.",
  "ui.provider.voice_capture.err_playback":
    "오디오를 재생할 수 없습니다.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "향상됨",
  "ui.provider.fallback_voice.enhanced_aria": "향상된 신경망 음성",
  "ui.provider.fallback_voice.on_device_badge": "기기 내",
  "ui.provider.fallback_voice.playing": "재생 중...",
  "ui.provider.fallback_voice.unavailable":
    "이 기기에서 시스템 음성을 사용할 수 없습니다.",
  "ui.provider.fallback_voice.loading":
    "사용 가능한 음성 로딩 중...",
  "ui.provider.fallback_voice.hide_others": "다른 음성 숨기기",
  "ui.provider.fallback_voice.more_voices": "더 많은 음성 ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  // Step labels (progress bar)
  "ui.provider.setup.steps.patient": "환자",
  "ui.provider.setup.steps.voice": "음성",
  "ui.provider.setup.steps.care_team": "의료진",
  "ui.provider.setup.steps.confirm": "확인",

  // Skip button + confirm dialog
  "ui.provider.setup.skip": "건너뛰기 →",
  "ui.provider.setup.skip_aria": "설정 건너뛰기",
  "ui.provider.setup.skip_dialog.title": "설정을 건너뛰시겠습니까?",
  "ui.provider.setup.skip_dialog.body":
    "나중에 설정에서 완료할 수 있습니다.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "환자가 추가되지 않습니다.",
  "ui.provider.setup.skip_dialog.confirm": "설정 건너뛰기",
  "ui.provider.setup.skip_dialog.cancel": "계속하기",

  // Navigation
  "ui.provider.setup.back": "뒤로",
  "ui.provider.setup.continue": "계속",
  "ui.provider.setup.start": "OwnVoice 시작",

  // Step 0: Patient info
  "ui.provider.setup.step0.heading": "OwnVoice에 오신 것을 환영합니다",
  "ui.provider.setup.step0.subhead":
    "의사소통 보드를 설정하겠습니다. 모든 데이터는 이 기기에만 저장됩니다.",
  "ui.provider.setup.step0.name_label": "환자 이름",
  "ui.provider.setup.step0.name_placeholder": "이름 또는 선호하는 호칭",
  "ui.provider.setup.step0.bed_label": "침상 / 병실",
  "ui.provider.setup.step0.bed_placeholder": "예: 4B-12",
  "ui.provider.setup.step0.language_label": "언어",

  // Step 1: Voice sample
  "ui.provider.setup.step1.heading": "음성 샘플",
  "ui.provider.setup.step1.body1":
    "OwnVoice가 환자의 목소리로 말할 수 있도록 음성 샘플을 캡처합니다. 이 단계는 선택 사항입니다.",
  "ui.provider.setup.step1.body2":
    "음성 클론은 전적으로 기기 내에서 실행됩니다. 음성이 이 태블릿 밖으로 나가지 않습니다.",
  "ui.provider.setup.step1.patient_label": "환자",
  "ui.provider.setup.step1.backup_voice_heading": "보조 음성",
  "ui.provider.setup.step1.backup_voice_body1":
    "음성 클론이 로딩되는 동안 또는 샘플이 녹음되지 않은 경우 사용할 시스템 음성을 선택하세요. 음성을 탭하면 미리 들을 수 있습니다.",
  "ui.provider.setup.step1.backup_voice_body2":
    "기기에 내장된 음성 합성을 사용합니다.",

  // Step 2: Care team
  "ui.provider.setup.step2.heading": "의료진",
  "ui.provider.setup.step2.body":
    "이 환자를 돌볼 의료진을 추가하세요.",
  "ui.provider.setup.step2.icon_label": "아이콘",
  "ui.provider.setup.step2.name_label": "이름",
  "ui.provider.setup.step2.name_placeholder":
    "김 의사, 박 간호사...",
  "ui.provider.setup.step2.add": "추가",

  // Step 3: Confirm
  "ui.provider.setup.step3.heading": "준비 완료",
  "ui.provider.setup.step3.body":
    "설정을 확인하세요. 나중에 설정에서 변경할 수 있습니다.",
  "ui.provider.setup.step3.summary.patient": "환자",
  "ui.provider.setup.step3.summary.bed": "침상 / 병실",
  "ui.provider.setup.step3.summary.language": "언어",
  "ui.provider.setup.step3.summary.language_default": "한국어",
  "ui.provider.setup.step3.summary.voice": "음성",
  "ui.provider.setup.step3.summary.care_team": "의료진",
  "ui.provider.setup.step3.summary.not_set": "설정되지 않음",
  "ui.provider.setup.step3.summary.captured": "캡처 완료",
  "ui.provider.setup.step3.summary.not_captured": "캡처되지 않음",
  "ui.provider.setup.step3.summary.none_added": "추가된 항목 없음",
  "ui.provider.setup.step3.pin_label": "직원 PIN (선택 사항)",
  "ui.provider.setup.step3.pin_body":
    "의료진 설정을 보호하기 위해 4자리 PIN을 설정하세요.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "설정",
  "ui.provider.settings.done": "완료",
  "ui.provider.settings.close_aria": "설정 닫기",

  "ui.provider.patient_edit.title": "{name} 편집",
  "ui.provider.patient_edit.title_default": "환자 편집",
  "ui.provider.patient_edit.close_aria": "환자 편집기 닫기",
  "ui.provider.patient_pill.aria": "환자 편집: {name}",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "{label}의 음성 준비를 삭제하시겠습니까?",
  "ui.provider.settings.voice_cache.discard_body":
    "진행 상황({current} / {total}개 문구)이 사라집니다. 녹음된 음성 샘플은 유지되며 나중에 준비를 다시 시작할 수 있습니다.",
  "ui.provider.settings.voice_cache.cancel": "취소",
  "ui.provider.settings.voice_cache.cancel_aria":
    "취소하고 음성 준비 유지",
  "ui.provider.settings.voice_cache.discard_confirm": "삭제",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "음성 준비 삭제 확인",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "{label}의 음성 준비 삭제",
  // TODO(translator): Korean has no plural morphology — {plural} renders as English suffix
  "ui.provider.settings.voice_cache.queued":
    "대기 중 — {label}의 음성이 다음에 준비됩니다 ({total}개 문구{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "{label}의 음성 준비 중… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "일시 정지 — {label}의 음성… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "재개",
  "ui.provider.settings.voice_cache.resume_aria":
    "{label}의 음성 준비 재개",
  "ui.provider.settings.voice_cache.pause": "일시 정지",
  "ui.provider.settings.voice_cache.pause_aria":
    "{label}의 음성 준비 일시 정지",
  "ui.provider.settings.voice_cache.done":
    "음성 클론 활성화 — {label}의 목소리로 {total}개 문구 모두 준비 완료",
  // TODO(translator): Korean has no plural morphology — {plural} renders as English suffix
  "ui.provider.settings.voice_cache.failed":
    "{label}에 대해 {count}개 문구{plural} 실패",
  "ui.provider.settings.voice_cache.retry": "재시도",
  "ui.provider.settings.voice_cache.retry_aria":
    "실패한 음성 캐시 문구 재시도",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "정보",
  "ui.provider.settings.about.subtitle":
    "입원 환자용 AAC 의사소통 보조 도구.",
  "ui.provider.settings.about.attribution_1":
    "통증 척도: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "돌봄 목표: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW 캐시:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "초기화",
  "ui.provider.settings.reset.action_label":
    "새 환자를 위해 앱 초기화",
  "ui.provider.settings.reset.confirm_title": "정말 초기화하시겠습니까?",
  "ui.provider.settings.reset.confirm_body":
    "모든 환자 데이터, 음성 샘플, 대화 기록 및 의료진 설정이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.",
  "ui.provider.settings.reset.confirm_destructive": "모두 초기화",

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "접근성",
  "ui.provider.settings.accessibility.toggle_label":
    "보조 입력 모드",
  "ui.provider.settings.accessibility.toggle_description":
    "트랙볼, 조이스틱, AssistiveTouch 커서 또는 스위치를 사용하는 환자를 위해 포커스 링을 강화하고, 탭 디바운스를 연장하며, 호버 피드백을 강화합니다.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "외부 포인터가 감지되었습니다.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "이 환자에 대해 보조 입력 모드를 활성화하는 것을 고려하세요.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "환자",
  "ui.provider.settings.patients.active_remove_hint":
    "이 환자를 제거하기 전에 다른 환자로 전환하세요.",
  "ui.provider.settings.patients.remove_button": "제거",
  "ui.provider.settings.patients.add_patient": "+ 환자 추가",
  "ui.provider.settings.patients.remove_dialog.title":
    "{name}을(를) 제거하시겠습니까?",
  "ui.provider.settings.patients.remove_dialog.body":
    "해당 환자의 음성 샘플, 대화 기록 및 음성 클론 캐시 오디오가 삭제됩니다. 의료진 음성 클론은 다른 환자를 위해 유지됩니다. 이 작업은 되돌릴 수 없습니다.",
  "ui.provider.settings.patients.remove_dialog.confirm": "제거",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "의료진",
  "ui.provider.settings.care_team.empty":
    "아직 추가된 의료진이 없습니다.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading": "환자 정보",
  "ui.provider.settings.patient_info.name_label": "이름",
  "ui.provider.settings.patient_info.bed_label": "침상 / 병실",
  "ui.provider.settings.patient_info.language_label": "언어",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "환자 언어",
  "ui.provider.settings.lang.caregiver_section": "의료진 언어",
  "ui.provider.settings.lang.caregiver_helper":
    "의료진이 이해하는 언어입니다. 일반적으로 기기당 한 번 설정합니다.",
  "ui.provider.settings.lang.change": "언어 변경",

  "ui.provider.settings.lang.picker_title": "언어 선택",
  "ui.provider.settings.lang.patient_dialog.title":
    "환자 언어를 {lang}(으)로 변경하시겠습니까?",
  "ui.provider.settings.lang.patient_dialog.body":
    "음성 클론은 유지됩니다 — 탭하는 문구의 소리는 동일합니다. {providerCount}명의 의료진 음성에 대한 오디오를 준비합니다 (~{estimatedMinutes}분). 이 작업 중에도 앱을 계속 사용할 수 있습니다.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "{lang}에서 의료진 음성 클론을 사용할 수 없습니다 — 시스템 음성이 대신 사용됩니다. 지원되는 언어로 전환할 경우를 대비하여 기존 녹음은 유지됩니다.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "탭하는 문구의 소리는 동일합니다. 구성된 의료진 음성이 없으므로 다시 생성할 항목이 없습니다.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "의료진 언어를 {lang}(으)로 변경하시겠습니까?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "의료진 음성 클론은 유지됩니다. 새 언어로 환자 음성 오디오를 준비합니다 (~{estimatedMinutes}분). 이 작업 중에도 앱을 계속 사용할 수 있습니다.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "{lang}에서 환자 음성 클론을 사용할 수 없습니다 — 시스템 음성이 대신 사용됩니다. 지원되는 언어로 전환할 경우를 대비하여 녹음된 환자 음성 샘플은 유지됩니다.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "구성된 환자 음성 클론이 없으므로 다시 생성할 항목이 없습니다.",
  "ui.provider.settings.patient_info.voice_label": "음성",
  "ui.provider.settings.patient_info.backup_voice_label":
    "보조 음성",
  "ui.provider.settings.patient_info.backup_voice_body":
    "음성 클론이 로딩되는 동안 사용되는 시스템 음성입니다. 탭하여 미리 들으세요.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "오프라인 준비",
  "ui.provider.settings.offline.status_description":
    "앱이 기기 내에서 음성 생성, 추천 및 음성 인식에 사용하는 AI 모델 상태입니다.",
  "ui.provider.settings.offline.downloading":
    "모델 다운로드 중…",
  "ui.provider.settings.offline.download_progress_aria":
    "모델 다운로드 진행률",
  "ui.provider.settings.offline.all_ready":
    "모든 모델 준비 완료",
  "ui.provider.settings.offline.redownload_button":
    "모델 다시 다운로드",
  "ui.provider.settings.offline.already_up_to_date":
    "이미 최신 상태입니다",
  "ui.provider.settings.offline.checking": "확인 중…",
  "ui.provider.settings.offline.verified": "✓ 모델 검증 완료",
  "ui.provider.settings.offline.check_button":
    "기존 모델 확인",
  "ui.provider.settings.offline.redownloading":
    "다시 다운로드 중…",
  "ui.provider.settings.offline.force_redownload_button":
    "모든 모델 강제 다시 다운로드",
  "ui.provider.settings.offline.model_status_ready": "준비 완료",
  "ui.provider.settings.offline.model_status_downloading":
    "다운로드 중…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "재시도 필요",
  "ui.provider.settings.offline.last_verified_prefix":
    "마지막 검증: ",
  "ui.provider.settings.offline.storage_prefix": "저장소: ",
  "ui.provider.settings.offline.storage_of": " / ",
  "ui.provider.settings.offline.storage_used": " 사용됨",
  "ui.provider.settings.offline.storage_low": " — 부족합니다",
  "ui.provider.settings.offline.clear_audio_cache":
    "오디오 캐시 지우기",
  "ui.provider.settings.offline.clearing": "지우는 중…",
  "ui.provider.settings.offline.rebuilding":
    "재구축 중: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "모든 AI 모델을 다시 다운로드하시겠습니까?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "약 1.7 GB를 다시 가져옵니다. 새로고침 중에도 음성 합성은 계속 작동합니다.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "다시 다운로드",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "환자 전환",
  "ui.provider.switch.add_patient": "+ 환자 추가",
  "ui.provider.patients.title": "환자",
  "ui.provider.patients.actions_aria": "{name} 작업",
  "ui.provider.patients.action_edit": "편집",
  "ui.provider.patients.action_remove": "제거",
  "ui.provider.switch.voice_captured": "음성 캡처 완료",
  "ui.provider.switch.no_voice": "음성 없음",
  "ui.provider.switch.last_active_just_now": "방금",
  "ui.provider.switch.last_active_minutes":
    "{n}분 전 활동",
  "ui.provider.switch.last_active_hours": "{n}시간 전 활동",
  "ui.provider.switch.last_active_days": "{n}일 전 활동",
  "ui.provider.switch.currently_active": "현재 활성",
  "ui.provider.switch.switched_announcement":
    "{name}(으)로 전환했습니다. 대화 메시지 {count}개.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title": "직원 세션 종료 예정",
  "ui.provider.staff_session.warning_body":
    "{n}초 후에 직원 접근이 잠깁니다.",
  "ui.provider.staff_session.extend": "세션 연장",
  "ui.provider.staff_session.end_now": "지금 종료",
  "ui.provider.nav.end_staff_session": "직원 세션 종료",
};

export default ko;
