/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (PR #98) but NOT yet clinically approved.
 * Before use with patients, this file requires:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar Vietnamese-speaking clinician)
 *
 * Language: Vietnamese
 * Locale: vi
 * Generated: 2026-04-23
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const vi: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Có",
  "quick.no": "Không",
  "quick.thank_you": "Cảm ơn",
  "quick.please_wait": "Xin chờ",
  "quick.dont_understand": "Tôi không hiểu",
  "quick.repeat": "Xin nhắc lại",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Tôi cần nước",
  "needs.comfort.hungry": "Tôi đói",
  "needs.comfort.cold": "Tôi lạnh",
  "needs.comfort.hot": "Tôi nóng",
  "needs.comfort.bed": "Chỉnh giường giúp tôi",
  "needs.comfort.bathroom": "Tôi cần đi vệ sinh",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Tôi cần uống thuốc",
  "needs.medical.suction": "Tôi cần hút đờm",
  "needs.medical.nauseous": "Tôi buồn nôn",
  "needs.medical.breathe": "Tôi khó thở",
  "needs.medical.nurse": "Tôi cần y tá",
  "needs.medical.doctor": "Tôi cần bác sĩ",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Tôi muốn gặp gia đình",
  "needs.people.stay": "Có ai ở lại với tôi được không?",
  "needs.people.call": "Tôi muốn gọi điện cho ai đó",
  "needs.people.interpreter": "Tôi cần phiên dịch",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Tôi mệt",
  "feelings.physical.uncomfortable": "Tôi không thoải mái",
  "feelings.physical.weak": "Tôi yếu",
  "feelings.physical.better": "Tôi khá hơn",
  "feelings.physical.dizzy": "Tôi chóng mặt",
  "feelings.physical.itchy": "Tôi bị ngứa",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Tôi sợ",
  "feelings.emotional.lonely": "Tôi cô đơn",
  "feelings.emotional.frustrated": "Tôi bực bội",
  "feelings.emotional.confused": "Tôi bối rối",
  "feelings.emotional.safe": "Tôi thấy an toàn",
  "feelings.emotional.grateful": "Tôi biết ơn",
  "feelings.emotional.worried": "Tôi lo lắng",
  "feelings.emotional.hopeful": "Tôi có hy vọng",
  "feelings.emotional.bored": "Tôi buồn chán",
  "feelings.emotional.embarrassed": "Tôi ngượng",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Mấy giờ rồi?",
  "questions.day": "Hôm nay là ngày mấy?",
  "questions.whats_happening": "Chuyện gì đang xảy ra với tôi?",
  "questions.go_home": "Khi nào tôi được về nhà?",
  "questions.next_medication": "Khi nào uống thuốc tiếp?",
  "questions.explain_treatment":
    "Bác sĩ có thể giải thích về điều trị của tôi không?",
  "questions.nurse_today": "Hôm nay ai là y tá của tôi?",
  "questions.eat_drink": "Tôi có được ăn uống không?",
  "questions.see_family": "Khi nào tôi được gặp gia đình?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Không đau",
  "pain.face.2": "Đau một chút",
  "pain.face.4": "Đau hơn một chút",
  "pain.face.6": "Đau nhiều hơn",
  "pain.face.8": "Đau rất nhiều",
  "pain.face.10": "Đau nhất",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Đau nhức",
  "pain.descriptor.burning": "Đau rát",
  "pain.descriptor.sharp": "Đau nhói",
  "pain.descriptor.throbbing": "Đau nhói theo nhịp",
  "pain.descriptor.cramping": "Đau quặn",
  "pain.descriptor.constant": "Đau liên tục",
  "pain.descriptor.comes_and_goes": "Đau lúc có lúc không",
  "pain.descriptor.numb": "Tê",
  "pain.descriptor.pressure": "Đau tức",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Đầu",
  "pain.region.face": "Mặt",
  "pain.region.neck": "Cổ",
  "pain.region.chest": "Ngực",
  "pain.region.left_shoulder": "Vai trái",
  "pain.region.right_shoulder": "Vai phải",
  "pain.region.left_arm": "Tay trái",
  "pain.region.right_arm": "Tay phải",
  "pain.region.stomach": "Bụng",
  "pain.region.upper_back": "Lưng trên",
  "pain.region.lower_back": "Lưng dưới",
  "pain.region.left_leg": "Chân trái",
  "pain.region.right_leg": "Chân phải",

  // ── Pain: Composed sentence template ───────────────────────────
  "pain.sentence":
    "Tôi bị đau {descriptor} ở {region}, mức {severity} trên 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Mức độ",
  "pain.step.location": "Vị trí",
  "pain.step.descriptor": "Mô tả",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Mục tiêu của tôi",
  "wishes.worries.label": "Lo lắng của tôi",
  "wishes.strength.label": "Sức mạnh của tôi",
  "wishes.joy.label": "Niềm vui của tôi",
  "wishes.tradeoffs.label": "Về điều trị",
  "wishes.family.label": "Gia đình tôi",
  "wishes.hopes.label": "Hy vọng của tôi",

  // Questions
  "wishes.goals.question":
    "Mục tiêu quan trọng nhất của bạn là gì?",
  "wishes.worries.question": "Bạn lo lắng nhất về điều gì?",
  "wishes.strength.question": "Điều gì cho bạn sức mạnh?",
  "wishes.joy.question":
    "Điều gì mang lại niềm vui và ý nghĩa cho cuộc sống của bạn?",
  "wishes.tradeoffs.question":
    "Bạn sẵn sàng chịu đựng bao nhiêu để có thêm thời gian?",
  "wishes.family.question":
    "Những người thân nhất của bạn biết bao nhiêu về mong muốn của bạn?",
  "wishes.hopes.question": "Hy vọng của bạn là gì?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems compose naturally with response lists in Vietnamese
  "wishes.goals.stem": "Điều quan trọng nhất với tôi",
  "wishes.worries.stem": "Tôi lo lắng về",
  "wishes.strength.stem": "Điều cho tôi sức mạnh",
  "wishes.joy.stem": "Điều mang lại niềm vui cho tôi",
  "wishes.tradeoffs.stem": "Về điều trị của tôi",
  "wishes.family.stem": "Về gia đình tôi",
  "wishes.hopes.stem": "Tôi hy vọng",

  // Responses — goals
  "wishes.goals.r.family": "Được ở bên gia đình",
  "wishes.goals.r.comfort": "Được thoải mái và không đau",
  "wishes.goals.r.longevity": "Sống lâu nhất có thể",
  "wishes.goals.r.home": "Được về nhà",
  "wishes.goals.r.independence": "Có thể tự lo cho mình",
  "wishes.goals.r.peace": "Được bình an",

  // Responses — worries
  "wishes.worries.r.suffering": "Phải chịu đau đớn",
  "wishes.worries.r.alone": "Ở một mình",
  "wishes.worries.r.burden": "Trở thành gánh nặng cho gia đình",
  "wishes.worries.r.activities":
    "Không thể làm những điều tôi thích",
  "wishes.worries.r.leaving": "Để gia đình lại phía sau",
  "wishes.worries.r.unknown": "Không biết điều gì sẽ xảy ra",

  // Responses — strength
  "wishes.strength.r.family": "Gia đình tôi",
  "wishes.strength.r.faith": "Niềm tin của tôi",
  "wishes.strength.r.friends": "Bạn bè tôi",
  "wishes.strength.r.wishes_heard":
    "Biết rằng mong muốn của tôi được lắng nghe",
  "wishes.strength.r.hope": "Hy vọng tôi sẽ khỏe lại",
  "wishes.strength.r.carers": "Những người chăm sóc tôi",

  // Responses — joy
  "wishes.joy.r.family": "Dành thời gian với gia đình",
  "wishes.joy.r.outdoors": "Ở ngoài trời",
  "wishes.joy.r.hobbies": "Sở thích của tôi",
  "wishes.joy.r.helping": "Giúp đỡ người khác",
  "wishes.joy.r.spiritual": "Đời sống tâm linh",
  "wishes.joy.r.routines": "Những thói quen hàng ngày đơn giản",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything":
    "Tôi muốn mọi phương pháp điều trị có thể",
  "wishes.tradeoffs.r.good_chance":
    "Tôi muốn điều trị nếu có cơ hội tốt",
  "wishes.tradeoffs.r.try_stop":
    "Tôi muốn thử nhưng dừng nếu không hiệu quả",
  "wishes.tradeoffs.r.comfortable":
    "Tôi muốn tập trung vào sự thoải mái",
  "wishes.tradeoffs.r.think": "Tôi cần thêm thời gian suy nghĩ",
  "wishes.tradeoffs.r.family_first":
    "Tôi cần nói chuyện với gia đình trước",

  // Responses — family
  "wishes.family.r.know_well":
    "Họ biết rõ mong muốn của tôi",
  "wishes.family.r.know_some":
    "Họ biết một số mong muốn của tôi",
  "wishes.family.r.not_talked":
    "Chúng tôi chưa nói về chuyện này",
  "wishes.family.r.need_help":
    "Tôi cần giúp đỡ để nói với họ",
  "wishes.family.r.team_explain":
    "Tôi muốn đội ngũ y tế giúp giải thích",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Khỏe lại",
  "wishes.hopes.r.go_home": "Được về nhà",
  "wishes.hopes.r.comfortable": "Được thoải mái",
  "wishes.hopes.r.family_ok": "Gia đình sẽ ổn",
  "wishes.hopes.r.more_time": "Có thêm thời gian",
  "wishes.hopes.r.peace": "Được bình an",

  // Wish sentence composition templates
  // TODO(translator): Verify "là" works for all stem + list combinations in Vietnamese
  "wishes.compose": "{stem} là {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Tôi sẽ tìm người giúp.",
  "provider.responses.interpreter": "Tôi sẽ tìm phiên dịch.",
  "provider.responses.family":
    "Tôi sẽ gọi cho gia đình bạn.",
  "provider.responses.get_that": "Tôi sẽ lấy cho bạn.",
  "provider.responses.doctor_know": "Tôi sẽ báo bác sĩ.",
  "provider.responses.medication": "Tôi sẽ lấy thuốc cho bạn.",
  "provider.responses.family_coming":
    "Gia đình bạn đang trên đường đến.",
  "provider.responses.doctor_soon": "Bác sĩ sẽ đến sớm.",
  "provider.responses.doing_well": "Bạn đang hồi phục tốt.",
  "provider.responses.rest": "Hãy nghỉ ngơi nhé.",

  "provider.questions.feeling": "Bạn cảm thấy thế nào?",
  "provider.questions.need": "Bạn cần gì không?",
  "provider.questions.where_hurts":
    "Bạn có thể chỉ chỗ đau không?",
  "provider.questions.rate_pain":
    "Đánh giá mức đau của bạn, từ 0 đến 10.",
  "provider.questions.sleep": "Bạn ngủ có ngon không?",
  "provider.questions.comfortable": "Bạn có thoải mái không?",

  "provider.directions.procedure":
    "Thủ thuật của bạn được lên lịch hôm nay.",
  "provider.directions.stay_in_bed": "Bạn cần nằm trên giường.",
  "provider.directions.vitals":
    "Tôi sẽ kiểm tra dấu hiệu sinh tồn.",
  "provider.directions.medication_time": "Đến giờ uống thuốc.",
  "provider.directions.breathe": "Hãy thử hít thở sâu.",
  "provider.directions.call_button":
    "Bấm nút gọi nếu bạn cần gì.",

  "provider.goals_of_care.matters_most":
    "Tôi muốn nói về điều quan trọng nhất với bạn.",
  "provider.goals_of_care.goals":
    "Mục tiêu quan trọng nhất của bạn hiện tại là gì?",
  "provider.goals_of_care.worries":
    "Bạn lo lắng nhất về điều gì?",
  "provider.goals_of_care.strength":
    "Điều gì cho bạn sức mạnh?",
  "provider.goals_of_care.joy":
    "Điều gì mang lại niềm vui và ý nghĩa cho cuộc sống của bạn?",
  "provider.goals_of_care.wishes":
    "Những người thân nhất biết bao nhiêu về mong muốn của bạn?",
  "provider.goals_of_care.hopes": "Hy vọng của bạn là gì?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Tôi ngủ ngon",
  "time.morning.didnt_sleep": "Tôi ngủ không ngon",
  "time.morning.breakfast": "Tôi cần ăn sáng",
  "time.morning.doctor_coming": "Khi nào bác sĩ đến?",

  "time.afternoon.tired": "Tôi mệt",
  "time.afternoon.lunch": "Tôi ăn trưa được không?",
  "time.afternoon.see_family": "Khi nào tôi gặp được gia đình?",
  "time.afternoon.rest": "Tôi cần nghỉ",

  "time.evening.cant_sleep": "Tôi không ngủ được",
  "time.evening.medication": "Tôi cần uống thuốc",
  "time.evening.call_family":
    "Tôi gọi điện cho gia đình được không?",
  "time.evening.pain": "Tôi đau",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate sequentially.
  // Vietnamese word order is generally SVO, so many fragments may compose OK,
  // but review each chain for natural phrasing.
  "suggest.start.i_am": "Tôi",
  "suggest.start.i_feel": "Tôi cảm thấy",
  "suggest.start.i_want": "Tôi muốn",
  "suggest.start.i_need": "Tôi cần",
  "suggest.start.please": "Xin",
  "suggest.start.when": "Khi nào",
  "suggest.start.can_you": "Bạn có thể",
  "suggest.start.tell_me": "Cho tôi biết",

  "suggest.i_am.in_pain": "đau",
  "suggest.i_am.cold": "lạnh",
  "suggest.i_am.hot": "nóng",
  "suggest.i_am.hungry": "đói",
  "suggest.i_am.thirsty": "khát",
  "suggest.i_am.tired": "mệt",
  "suggest.i_am.uncomfortable": "không thoải mái",
  "suggest.i_am.okay": "ổn",
  "suggest.i_am.not_okay": "không ổn",
  "suggest.i_am.ready": "sẵn sàng",

  "suggest.i_feel.scared": "sợ",
  "suggest.i_feel.sick": "ốm",
  "suggest.i_feel.dizzy": "chóng mặt",
  "suggest.i_feel.weak": "yếu",
  "suggest.i_feel.better": "khá hơn",
  "suggest.i_feel.worse": "tệ hơn",
  "suggest.i_feel.nauseous": "buồn nôn",
  "suggest.i_feel.lonely": "cô đơn",
  "suggest.i_feel.confused": "bối rối",
  "suggest.i_feel.safe": "an toàn",

  "suggest.i_feel_scared.procedure": "về thủ thuật",
  "suggest.i_feel_scared.happening": "về những gì đang xảy ra",
  "suggest.i_feel_scared.alone": "ở một mình",
  "suggest.i_feel_scared.need_someone": "và tôi cần có người bên",

  "suggest.i_feel_sick.stomach": "ở bụng",
  "suggest.i_feel_sick.dizzy": "và chóng mặt",
  "suggest.i_feel_sick.help": "và cần giúp đỡ",

  "suggest.i_want.water": "nước",
  "suggest.i_want.family": "gặp gia đình",
  "suggest.i_want.go_home": "về nhà",
  "suggest.i_want.sleep": "ngủ",
  "suggest.i_want.medication": "thuốc",
  "suggest.i_want.blanket": "chăn",
  "suggest.i_want.talk": "nói chuyện với ai đó",
  "suggest.i_want.nurse": "gặp y tá",

  "suggest.i_want_to_go.home": "về nhà",
  "suggest.i_want_to_go.sleep": "ngủ",
  "suggest.i_want_to_go.bathroom": "vệ sinh",

  "suggest.i_want_my.family": "gia đình",
  "suggest.i_want_my.medication": "thuốc",
  "suggest.i_want_my.phone": "điện thoại",
  "suggest.i_want_my.glasses": "kính",
  "suggest.i_want_my.blanket": "chăn",

  "suggest.i_need.help": "giúp đỡ",
  "suggest.i_need.water": "nước",
  "suggest.i_need.bathroom": "đi vệ sinh",
  "suggest.i_need.medication": "thuốc",
  "suggest.i_need.nurse": "y tá",
  "suggest.i_need.doctor": "bác sĩ",
  "suggest.i_need.rest": "nghỉ ngơi",
  "suggest.i_need.blanket": "chăn",
  "suggest.i_need.suction": "hút đờm",

  "suggest.i_need_the.nurse": "y tá",
  "suggest.i_need_the.doctor": "bác sĩ",
  "suggest.i_need_the.bathroom": "nhà vệ sinh",
  "suggest.i_need_the.light_off": "tắt đèn",
  "suggest.i_need_the.light_on": "bật đèn",

  "suggest.i_need_my.medication": "thuốc",
  "suggest.i_need_my.family": "gia đình",
  "suggest.i_need_my.glasses": "kính",
  "suggest.i_need_my.phone": "điện thoại",

  "suggest.please.help_me": "giúp tôi",
  "suggest.please.call_family": "gọi gia đình tôi",
  "suggest.please.light_off": "tắt đèn",
  "suggest.please.adjust_bed": "chỉnh giường",
  "suggest.please.give_me": "cho tôi",
  "suggest.please.explain": "giải thích",
  "suggest.please.come_back": "quay lại sớm",
  "suggest.please.stay": "ở lại với tôi",
  "suggest.please.dont_leave": "đừng đi",

  "suggest.please_help_me.pain": "Tôi đau",
  "suggest.please_help_me.breathe": "Tôi khó thở",
  "suggest.please_help_me.sick": "Tôi không khỏe",
  "suggest.please_help_me.scared": "Tôi sợ",

  "suggest.please_give_me.water": "nước",
  "suggest.please_give_me.medication": "thuốc",
  "suggest.please_give_me.blanket": "chăn",
  "suggest.please_give_me.pain_relief": "thuốc giảm đau",

  "suggest.when.go_home": "tôi được về nhà?",
  "suggest.when.family": "gia đình tôi đến?",
  "suggest.when.medication": "uống thuốc tiếp?",
  "suggest.when.doctor": "bác sĩ đến?",
  "suggest.when.eat": "tôi được ăn?",
  "suggest.when.over": "xong?",

  "suggest.can_you.help": "giúp tôi không?",
  "suggest.can_you.call_family": "gọi gia đình tôi không?",
  "suggest.can_you.get_nurse": "gọi y tá không?",
  "suggest.can_you.explain": "giải thích chuyện gì đang xảy ra không?",
  "suggest.can_you.light_off": "tắt đèn không?",
  "suggest.can_you.adjust_bed": "chỉnh giường không?",
  "suggest.can_you.stay": "ở lại với tôi không?",

  "suggest.tell_me.happening": "chuyện gì đang xảy ra",
  "suggest.tell_me.time": "mấy giờ rồi",
  "suggest.tell_me.go_home": "khi nào tôi được về nhà",
  "suggest.tell_me.day": "hôm nay là ngày mấy",
  "suggest.tell_me.treatment": "về điều trị của tôi",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "xin giúp tôi",
  "suggest.i_am_in_pain.worse": "và đang nặng hơn",
  "suggest.i_am_in_pain.medication": "và cần thuốc",
  "suggest.i_am_in_pain.back": "ở lưng",
  "suggest.i_am_in_pain.chest": "ở ngực",
  "suggest.i_am_in_pain.stomach": "ở bụng",

  "suggest.i_need_help.up": "ngồi dậy",
  "suggest.i_need_help.breathing": "thở",
  "suggest.i_need_help.pain": "giảm đau",
  "suggest.i_need_help.now": "ngay bây giờ",
  "suggest.i_need_help.please": "xin",

  "suggest.i_feel_better.than_before": "hơn trước",
  "suggest.i_feel_better.now": "bây giờ",
  "suggest.i_feel_better.thanks": "cảm ơn",

  "suggest.i_feel_worse.than_before": "hơn trước",
  "suggest.i_feel_worse.need_doctor": "Tôi cần bác sĩ",
  "suggest.i_feel_worse.help": "xin giúp tôi",
  "suggest.i_feel_worse.medication": "Tôi cần thuốc",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Tôi cảm thấy",
  "suggest.ctx.feeling.i_am": "Tôi",
  "suggest.ctx.feeling.better": "Khá hơn trước",
  "suggest.ctx.feeling.not_great": "Không tốt lắm",
  "suggest.ctx.feeling.pain": "Tôi đau",
  "suggest.ctx.feeling.okay": "Tôi ổn",
  "suggest.ctx.feeling.help": "Bạn giúp tôi được không?",

  "suggest.ctx.need.i_need": "Tôi cần",
  "suggest.ctx.need.i_want": "Tôi muốn",
  "suggest.ctx.need.fine": "Tôi ổn rồi",
  "suggest.ctx.need.yes": "Có, xin cảm ơn",
  "suggest.ctx.need.no": "Không, cảm ơn",
  "suggest.ctx.need.stay": "Bạn ở lại được không?",

  "suggest.ctx.where_hurts.head": "Đầu tôi",
  "suggest.ctx.where_hurts.chest": "Ngực tôi",
  "suggest.ctx.where_hurts.stomach": "Bụng tôi",
  "suggest.ctx.where_hurts.back": "Lưng tôi",
  "suggest.ctx.where_hurts.left_arm": "Tay trái tôi",
  "suggest.ctx.where_hurts.right_leg": "Chân phải tôi",
  "suggest.ctx.where_hurts.everywhere": "Khắp nơi",

  "suggest.ctx.pain.very_bad": "Rất đau",
  "suggest.ctx.pain.worse": "Đang nặng hơn",
  "suggest.ctx.pain.same": "Vẫn như cũ",
  "suggest.ctx.pain.little_better": "Đỡ hơn một chút",
  "suggest.ctx.pain.need_relief": "Tôi cần thuốc giảm đau",

  "suggest.ctx.comfort.comfortable": "Tôi thoải mái",
  "suggest.ctx.comfort.not_comfortable": "Tôi không thoải mái",
  "suggest.ctx.comfort.cant_sleep": "Tôi không ngủ được",
  "suggest.ctx.comfort.cold": "Tôi lạnh",
  "suggest.ctx.comfort.hot": "Tôi nóng",
  "suggest.ctx.comfort.adjust_bed": "Chỉnh giường giúp tôi được không?",

  "suggest.ctx.night.cant_sleep": "Tôi không ngủ được",
  "suggest.ctx.night.i_need": "Tôi cần",
  "suggest.ctx.night.pain": "Tôi đau",
  "suggest.ctx.night.i_feel": "Tôi cảm thấy",
  "suggest.ctx.night.can_you": "Bạn có thể",
  "suggest.ctx.night.please": "Xin",
  "suggest.ctx.night.i_am": "Tôi",
  "suggest.ctx.night.when": "Khi nào",

  "suggest.ctx.morning.i_am": "Tôi",
  "suggest.ctx.morning.i_need": "Tôi cần",
  "suggest.ctx.morning.i_feel": "Tôi cảm thấy",
  "suggest.ctx.morning.doctor": "Khi nào bác sĩ đến?",
  "suggest.ctx.morning.i_want": "Tôi muốn",
  "suggest.ctx.morning.can_you": "Bạn có thể",
  "suggest.ctx.morning.please": "Xin",
  "suggest.ctx.morning.tell_me": "Cho tôi biết",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Nhanh",
  "cat.needs": "Tôi cần",
  "cat.feelings": "Cảm xúc",
  "cat.pain": "Đau",
  "cat.questions": "Hỏi",
  "sub.comfort": "Thoải mái",
  "sub.medical": "Y tế",
  "sub.people": "Người thân",
  "sub.physical": "Thể chất",
  "sub.emotional": "Cảm xúc",

  // Provider category labels
  "provider.cat.responses": "Trả lời",
  "provider.cat.questions": "Câu hỏi",
  "provider.cat.directions": "Hướng dẫn",
  "provider.cat.goals_of_care": "Mục tiêu chăm sóc",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — cuộc trò chuyện của {name}",
  "ui.patient.app.name_fallback": "Bệnh nhân",
  "ui.patient.header.name_fallback": "Bệnh nhân",
  "ui.patient.header.bed_prefix": "Giường ",
  "ui.dual.nav.wishes": "Mong muốn",
  "ui.dual.nav.listen": "Nghe",
  "ui.provider.nav.staff": "Nhân viên",
  "ui.provider.nav.switch_patient": "Đổi bệnh nhân",
  "ui.provider.nav.settings": "Cài đặt",
  "ui.provider.nav.theme.auto": "Tự động",
  "ui.provider.nav.theme.light": "Sáng",
  "ui.provider.nav.theme.dark": "Tối",
  "ui.patient.tabbar.say_more": "Nói thêm",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Bạn đau bao nhiêu?",
  "ui.dual.pain.heading.location": "Đau ở đâu?",
  "ui.dual.pain.heading.descriptor": "Cơn đau như thế nào?",
  "ui.patient.pain.step_of": "Bước {n} / {total}",
  "ui.patient.pain.back_to": "Quay lại {label}",
  "ui.patient.pain.level_aria": "Mức đau {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Mong muốn của {name}",
  "ui.patient.wishes.my_wishes": "Mong muốn của tôi",
  "ui.patient.wishes.step_of": "Bước {n} / {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Chưa chia sẻ mong muốn nào.",
  "ui.patient.wishes.share_all_again":
    "Chia sẻ lại tất cả mong muốn",
  "ui.patient.wishes.close": "Đóng",
  "ui.patient.wishes.share": "Chia sẻ",
  "ui.patient.wishes.skip": "Bỏ qua",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder":
    "Chạm vào từ bên dưới hoặc gõ...",
  "ui.patient.builder.message_aria": "Tin nhắn của bạn",
  "ui.patient.builder.undo": "Hoàn tác từ cuối",
  "ui.patient.builder.clear": "Xóa tin nhắn",
  "ui.patient.builder.refresh_ai": "Làm mới gợi ý AI",
  "ui.patient.builder.ai_thinking": "AI đang suy nghĩ...",
  "ui.patient.builder.no_ai_suggestions":
    "Không có gợi ý AI. Chạm làm mới để thử lại.",
  "ui.patient.builder.ready":
    "Tin nhắn đã sẵn sàng. Chạm Nói để gửi.",
  "ui.patient.builder.speak": "Nói",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Nhắc lại: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Đội ngũ y tế",
  "ui.provider.fallback_name": "Nhân viên y tế",
  "ui.provider.speaking_to":
    "Đang nói với {name} với tư cách {prov}",
  "ui.provider.patient_fallback": "bệnh nhân",
  "ui.provider.close_panel": "Đóng bảng",
  "ui.provider.select_provider": "Chọn {name}",
  "ui.provider.show_category": "Hiển thị {key}",
  "ui.provider.speak_phrase": "Nói: {phrase}",
  "ui.provider.speaking_as_aria": "Speaking as",
  "ui.provider.section_aria": "Phrase category",
  "ui.provider.phrases_aria": "{section} phrases",
  "ui.provider.listen.capture_aria": "Voice capture",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Nghe",
  "ui.provider.listen.stop_aria": "Dừng nghe",
  "ui.provider.listen.start_aria": "Chạm để bắt đầu nghe",
  "ui.provider.listen.listening": "Đang nghe...",
  "ui.provider.listen.transcribing": "Đang chép...",
  "ui.provider.listen.listening_placeholder":
    "Đang lắng nghe giọng nói...",
  "ui.provider.listen.transcribing_placeholder":
    "Đang chép lại giọng nói...",
  "ui.provider.listen.type_placeholder":
    "Hoặc gõ những gì đã nói...",
  "ui.provider.listen.transcript_aria": "Bản ghi",
  "ui.provider.listen.add_as":
    "Thêm vào cuộc trò chuyện với tư cách {prov}",
  "ui.provider.listen.privacy_notice":
    "Trên thiết bị · Whisper · không có âm thanh rời khỏi thiết bị",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Đang nói: {text}",
  "ui.dual.speaking.patient_voice": "Giọng nói của bạn",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Nhập mã PIN",
  "ui.provider.pin_gate.subtitle": "Chỉ dành cho nhân viên",
  "ui.provider.pin_gate.incorrect": "Mã PIN sai",
  "ui.provider.pin_gate.delete_aria": "Xóa",
  "ui.provider.pin_gate.digit_aria": "Số {n}",
  "ui.provider.pin_gate.cancel": "Hủy",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Bạn sẽ đọc to một câu.",
  "ui.provider.voice_capture.coaching_breath":
    "Hít thở sâu vài lần.",
  "ui.provider.voice_capture.coaching_ready": "Sẵn sàng.",
  "ui.provider.voice_capture.breathe_in": "Hít vào…",
  "ui.provider.voice_capture.breathe_out": "Thở ra…",
  "ui.provider.voice_capture.creating":
    "Đang tạo giọng nói nhân bản...",
  "ui.provider.voice_capture.creating_from_sample":
    "Đang tạo giọng nói nhân bản từ mẫu...",
  "ui.provider.voice_capture.loading_model":
    "Đang tải mô hình giọng nói...",
  "ui.provider.voice_capture.clone_failed": "Nhân bản thất bại",
  "ui.provider.voice_capture.captured": "Đã thu giọng nói",
  "ui.provider.voice_capture.stop": "Dừng",
  "ui.provider.voice_capture.play": "Phát",
  "ui.provider.voice_capture.discard": "Bỏ bản ghi",
  "ui.provider.voice_capture.use_recording": "Dùng bản ghi này",
  "ui.provider.voice_capture.upload_file": "Tải lên tệp",
  "ui.provider.voice_capture.record": "Thu âm",
  "ui.provider.voice_capture.stop_early": "Dừng sớm",
  "ui.provider.voice_capture.remove": "Xóa",
  "ui.provider.voice_capture.retry": "Thử lại",
  "ui.provider.voice_capture.done": "Xong!",
  "ui.provider.voice_capture.cancel": "Hủy",
  "ui.provider.voice_capture.seconds_recorded": "Đã thu {n}s",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Hủy đếm ngược thu âm",
  "ui.provider.voice_capture.stop_early_aria":
    "Dừng thu âm sớm",
  "ui.provider.voice_capture.audio_level_aria": "Mức âm thanh",
  "ui.provider.voice_capture.recording_progress_aria":
    "Tiến trình thu âm",
  "ui.provider.voice_capture.stop_preview_aria":
    "Dừng phát xem trước",
  "ui.provider.voice_capture.play_preview_aria":
    "Phát xem trước bản ghi",
  "ui.provider.voice_capture.discard_aria":
    "Bỏ bản ghi này và bắt đầu lại",
  "ui.provider.voice_capture.stop_playback_aria":
    "Dừng phát mẫu đã thu",
  "ui.provider.voice_capture.play_sample_aria":
    "Phát mẫu giọng nói đã thu",
  "ui.provider.voice_capture.remove_aria": "Xóa mẫu giọng nói",
  "ui.provider.voice_capture.retry_aria":
    "Thử lại trích xuất nhân bản giọng nói",
  "ui.provider.voice_capture.upload_aria":
    "Tải lên mẫu giọng nói từ tệp",
  "ui.provider.voice_capture.record_aria":
    "Thu mẫu giọng nói từ micro",
  "ui.provider.voice_capture.err_network":
    "Không thể kết nối mô hình giọng nói. Kiểm tra kết nối và chạm Thử lại.",
  "ui.provider.voice_capture.err_timeout":
    "Xử lý giọng nói quá lâu. Chạm Thử lại để thử lại.",
  "ui.provider.voice_capture.err_mic_denied":
    "Quyền truy cập micro bị chặn. Bật trong cài đặt trình duyệt hoặc tải lên tệp.",
  "ui.provider.voice_capture.err_generic":
    "Không thể hoàn tất chuẩn bị giọng nói. Chạm Thử lại để thử lại.",
  "ui.provider.voice_capture.err_too_short":
    "Bản ghi quá ngắn. Hãy nói trong suốt thời gian đếm ngược, sau đó chạm Thử lại.",
  "ui.provider.voice_capture.err_too_noisy":
    "Tiếng ồn xung quanh quá lớn để tạo bản sao giọng nói rõ ràng. Di chuyển đến nơi yên tĩnh hơn và chạm Thử lại.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Quyền truy cập micro bị từ chối. Hãy thử tải lên tệp.",
  "ui.provider.voice_capture.err_playback":
    "Không thể phát âm thanh.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Nâng cao",
  "ui.provider.fallback_voice.enhanced_aria":
    "Giọng nói thần kinh nâng cao",
  "ui.provider.fallback_voice.on_device_badge": "Trên thiết bị",
  "ui.provider.fallback_voice.playing": "Đang phát...",
  "ui.provider.fallback_voice.unavailable":
    "Giọng nói hệ thống không khả dụng trên thiết bị này.",
  "ui.provider.fallback_voice.loading":
    "Đang tải giọng nói khả dụng...",
  "ui.provider.fallback_voice.hide_others":
    "Ẩn các giọng nói khác",
  "ui.provider.fallback_voice.more_voices":
    "Thêm giọng nói ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Bệnh nhân",
  "ui.provider.setup.steps.voice": "Giọng nói",
  "ui.provider.setup.steps.care_team": "Đội ngũ",
  "ui.provider.setup.steps.confirm": "Xác nhận",

  "ui.provider.setup.skip": "Bỏ qua →",
  "ui.provider.setup.skip_aria": "Bỏ qua thiết lập",
  "ui.provider.setup.skip_dialog.title": "Bỏ qua thiết lập?",
  "ui.provider.setup.skip_dialog.body": "Bắt đầu sử dụng OwnVoice ngay bây giờ. Bạn có thể hoàn tất cài đặt sau bằng cách chạm vào tên bệnh nhân ở đầu trang.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Sẽ không thêm bệnh nhân nào.",
  "ui.provider.setup.skip_dialog.confirm": "Bỏ qua thiết lập",
  "ui.provider.setup.skip_dialog.cancel": "Tiếp tục",

  "ui.provider.setup.back": "Quay lại",
  "ui.provider.setup.continue": "Tiếp tục",
  "ui.provider.setup.start": "Khởi động OwnVoice",

  "ui.provider.setup.step0.heading": "Chào mừng đến OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Hãy thiết lập bảng giao tiếp. Mọi thứ lưu trên thiết bị này.",
  "ui.provider.setup.step0.name_label": "Tên bệnh nhân",
  "ui.provider.setup.step0.name_placeholder":
    "Tên hoặc tên thường gọi",
  "ui.provider.setup.step0.bed_label": "Giường / Phòng",
  "ui.provider.setup.step0.bed_placeholder": "VD: 4B-12",
  "ui.provider.setup.step0.language_label": "Ngôn ngữ",

  "ui.provider.setup.step1.heading": "Mẫu giọng nói",
  "ui.provider.setup.step1.body1":
    "Thu mẫu giọng nói để OwnVoice nói bằng giọng của bệnh nhân. Bước này không bắt buộc.",
  "ui.provider.setup.step1.body2":
    "Nhân bản giọng nói hoàn toàn trên thiết bị. Không có âm thanh rời khỏi máy tính bảng.",
  "ui.provider.setup.step1.patient_label": "Bệnh nhân",
  "ui.provider.setup.step1.backup_voice_heading":
    "Giọng nói dự phòng",
  "ui.provider.setup.step1.backup_voice_body1":
    "Chọn giọng nói hệ thống để dùng khi giọng nhân bản đang tải, hoặc nếu chưa thu mẫu. Chạm vào giọng nói để nghe thử.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Tính năng này dùng công nghệ đọc văn bản có sẵn trên thiết bị.",

  "ui.provider.setup.step2.heading": "Đội ngũ y tế",
  "ui.provider.setup.step2.body":
    "Thêm nhân viên y tế sẽ chăm sóc bệnh nhân này.",
  "ui.provider.setup.step2.icon_label": "Biểu tượng",
  "ui.provider.setup.step2.name_label": "Tên",
  "ui.provider.setup.step2.name_placeholder":
    "BS. Nguyễn, ĐD. Trần...",
  "ui.provider.setup.step2.add": "Thêm",

  "ui.provider.setup.step3.heading": "Sẵn sàng",
  "ui.provider.setup.step3.body":
    "Xem lại thiết lập. Bạn có thể thay đổi sau trong Cài đặt.",
  "ui.provider.setup.step3.summary.patient": "Bệnh nhân",
  "ui.provider.setup.step3.summary.bed": "Giường / Phòng",
  "ui.provider.setup.step3.summary.language": "Ngôn ngữ",
  "ui.provider.setup.step3.summary.language_default": "Tiếng Anh",
  "ui.provider.setup.step3.summary.voice": "Giọng nói",
  "ui.provider.setup.step3.summary.care_team": "Đội ngũ y tế",
  "ui.provider.setup.step3.summary.not_set": "Chưa đặt",
  "ui.provider.setup.step3.summary.captured": "Đã thu",
  "ui.provider.setup.step3.summary.not_captured": "Chưa thu",
  "ui.provider.setup.step3.summary.none_added": "Chưa thêm",
  "ui.provider.setup.step3.pin_label":
    "Mã PIN nhân viên (không bắt buộc)",
  "ui.provider.setup.step3.pin_body":
    "Đặt mã PIN 4 chữ số để bảo vệ cài đặt nhân viên.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Cài đặt",
  "ui.provider.settings.done": "Xong",
  "ui.provider.settings.close_aria": "Đóng cài đặt",

  "ui.provider.patient_edit.title": "Chỉnh sửa {name}",
  "ui.provider.patient_edit.title_default": "Chỉnh sửa bệnh nhân",
  "ui.provider.patient_edit.close_aria": "Đóng trình chỉnh sửa bệnh nhân",
  "ui.provider.patient_pill.aria": "Chỉnh sửa bệnh nhân: {name}",
  "ui.provider.nav.staff_menu": "Cài đặt",
  "ui.provider.staff_sheet.title": "Nhân viên",
  "ui.provider.staff_sheet.close_aria": "Đóng menu nhân viên",
  "ui.provider.staff_sheet.patients_description": "Chuyển, thêm hoặc chỉnh sửa bệnh nhân",
  "ui.provider.staff_sheet.settings_description": "Đội ngũ chăm sóc, khả năng tiếp cận, ngoại tuyến",
  "ui.provider.staff_sheet.end_session_description": "Thoát chế độ nhân viên",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Bỏ chuẩn bị giọng nói của {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "Tiến trình ({current} / {total} cụm từ) sẽ mất. Mẫu giọng nói đã thu được giữ lại — bạn có thể bắt đầu lại sau.",
  "ui.provider.settings.voice_cache.cancel": "Hủy",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Hủy và giữ chuẩn bị giọng nói",
  "ui.provider.settings.voice_cache.discard_confirm": "Bỏ",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Xác nhận bỏ chuẩn bị giọng nói",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Bỏ chuẩn bị giọng nói của {label}",
  // TODO(translator): {plural} is an English suffix marker — renders empty in Vietnamese
  "ui.provider.settings.voice_cache.queued":
    "Đang chờ — giọng nói của {label} sẽ chuẩn bị tiếp ({total} cụm từ{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Đang chuẩn bị giọng nói của {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Đã tạm dừng — giọng nói của {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Tiếp tục",
  "ui.provider.settings.voice_cache.resume_aria":
    "Tiếp tục chuẩn bị giọng nói của {label}",
  "ui.provider.settings.voice_cache.pause": "Tạm dừng",
  "ui.provider.settings.voice_cache.pause_aria":
    "Tạm dừng chuẩn bị giọng nói của {label}",
  "ui.provider.settings.voice_cache.done":
    "Giọng nhân bản hoạt động — tất cả {total} cụm từ sẵn sàng với giọng của {label}",
  // TODO(translator): {plural} is an English suffix marker — renders empty in Vietnamese
  "ui.provider.settings.voice_cache.failed":
    "{count} cụm từ{plural} thất bại cho {label}",
  "ui.provider.settings.voice_cache.retry": "Thử lại",
  "ui.provider.settings.voice_cache.retry_aria":
    "Thử lại các cụm từ giọng nói thất bại",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Giới thiệu",
  "ui.provider.settings.about.subtitle":
    "Công cụ hỗ trợ giao tiếp AAC cho bệnh nhân nội trú.",
  "ui.provider.settings.about.attribution_1":
    "Thang đau: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Mục tiêu chăm sóc: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Bộ nhớ đệm SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Đặt lại",
  "ui.provider.settings.reset.action_label":
    "Đặt lại ứng dụng cho bệnh nhân mới",
  "ui.provider.settings.reset.confirm_title": "Bạn có chắc không?",
  "ui.provider.settings.reset.confirm_body":
    "Thao tác này sẽ xóa tất cả dữ liệu bệnh nhân, mẫu giọng nói, lịch sử trò chuyện và cài đặt nhân viên. Không thể hoàn tác.",
  "ui.provider.settings.reset.confirm_destructive":
    "Đặt lại tất cả",
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
  "ui.provider.settings.accessibility.heading": "Hỗ trợ tiếp cận",
  "ui.provider.settings.accessibility.toggle_label":
    "Chế độ nhập hỗ trợ",
  "ui.provider.settings.accessibility.toggle_description":
    "Tăng viền tập trung, kéo dài thời gian chạm và tăng phản hồi di chuột cho bệnh nhân dùng trackball, joystick, con trỏ AssistiveTouch hoặc công tắc.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Phát hiện thiết bị trỏ bên ngoài.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Cân nhắc bật Chế độ nhập hỗ trợ cho bệnh nhân này.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Bệnh nhân",
  "ui.provider.settings.patients.active_remove_hint":
    "Chuyển sang bệnh nhân khác trước khi xóa bệnh nhân này.",
  "ui.provider.settings.patients.remove_button": "Xóa",
  "ui.provider.settings.patients.add_patient":
    "+ Thêm bệnh nhân",
  "ui.provider.settings.patients.remove_dialog.title":
    "Xóa {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Thao tác này sẽ xóa mẫu giọng nói, lịch sử trò chuyện và âm thanh đệm của giọng nhân bản. Giọng nhân bản của đội ngũ y tế được giữ cho bệnh nhân khác. Không thể hoàn tác.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Xóa",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Đội ngũ y tế",
  "ui.provider.settings.care_team.empty":
    "Chưa thêm nhân viên y tế nào.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Thông tin bệnh nhân",
  "ui.provider.settings.patient_info.name_label": "Tên",
  "ui.provider.settings.patient_info.bed_label": "Giường / Phòng",
  "ui.provider.settings.patient_info.language_label": "Ngôn ngữ",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section":
    "Ngôn ngữ bệnh nhân",
  "ui.provider.settings.lang.caregiver_section":
    "Ngôn ngữ đội ngũ y tế",
  "ui.provider.settings.lang.caregiver_helper":
    "Ngôn ngữ mà đội ngũ y tế hiểu. Thường chỉ đặt một lần cho mỗi thiết bị.",
  "ui.provider.settings.lang.change": "Đổi ngôn ngữ",

  "ui.provider.settings.lang.picker_title": "Chọn ngôn ngữ",
  "ui.provider.settings.lang.patient_dialog.title":
    "Đổi ngôn ngữ bệnh nhân sang {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Giọng nhân bản vẫn sẵn sàng — các cụm từ bạn chạm vẫn phát giống nhau. Chúng tôi sẽ chuẩn bị âm thanh cho {providerCount} giọng đội ngũ (~{estimatedMinutes} phút). Bạn có thể tiếp tục dùng ứng dụng trong lúc đó.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Giọng nhân bản của đội ngũ y tế không khả dụng trong {lang} — sẽ dùng giọng hệ thống. Bản ghi hiện có được giữ lại nếu bạn chuyển sang ngôn ngữ được hỗ trợ sau.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Các cụm từ bạn chạm vẫn phát giống nhau. Chưa có giọng đội ngũ y tế, nên không cần tạo lại.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Đổi ngôn ngữ đội ngũ y tế sang {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Giọng nhân bản của đội ngũ vẫn sẵn sàng. Chúng tôi sẽ chuẩn bị âm thanh giọng bệnh nhân bằng ngôn ngữ mới (~{estimatedMinutes} phút). Bạn có thể tiếp tục dùng ứng dụng trong lúc đó.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Giọng nhân bản bệnh nhân không khả dụng trong {lang} — sẽ dùng giọng hệ thống. Mẫu giọng nói đã thu được giữ lại nếu bạn chuyển sang ngôn ngữ được hỗ trợ sau.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Chưa có giọng nhân bản bệnh nhân, nên không cần tạo lại.",
  "ui.provider.settings.patient_info.voice_label": "Giọng nói",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Giọng nói dự phòng",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Giọng hệ thống dùng khi giọng nhân bản đang tải. Chạm để nghe thử.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Chẩn đoán ứng dụng",
  "ui.provider.settings.offline.status_description":
    "Trạng thái các mô hình AI mà ứng dụng dùng trên thiết bị cho tạo giọng nói, gợi ý và nhận dạng giọng nói.",
  "ui.provider.settings.offline.downloading":
    "Đang tải mô hình…",
  "ui.provider.settings.offline.download_progress_aria":
    "Tiến trình tải mô hình",
  "ui.provider.settings.offline.all_ready":
    "Tất cả mô hình sẵn sàng",
  "ui.provider.settings.offline.redownload_button":
    "Tải lại mô hình",
  "ui.provider.settings.offline.already_up_to_date":
    "Đã cập nhật",
  "ui.provider.settings.offline.checking": "Đang kiểm tra…",
  "ui.provider.settings.offline.verified": "✓ Mô hình đã xác minh",
  "ui.provider.settings.offline.check_button":
    "Kiểm tra mô hình hiện có",
  "ui.provider.settings.offline.redownloading":
    "Đang tải lại…",
  "ui.provider.settings.offline.force_redownload_button":
    "Buộc tải lại tất cả mô hình",
  "ui.provider.settings.offline.model_status_ready": "sẵn sàng",
  "ui.provider.settings.offline.model_status_downloading":
    "đang tải…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "cần thử lại",
  "ui.provider.settings.offline.last_verified_prefix":
    "Xác minh lần cuối: ",
  "ui.provider.settings.offline.storage_prefix": "Lưu trữ: ",
  "ui.provider.settings.offline.storage_of": " / ",
  "ui.provider.settings.offline.storage_used": " đã dùng",
  "ui.provider.settings.offline.storage_low": " — sắp hết",
  "ui.provider.settings.offline.clear_audio_cache":
    "Xóa bộ nhớ đệm âm thanh",
  "ui.provider.settings.offline.clearing": "Đang xóa…",
  "ui.provider.settings.offline.rebuilding":
    "Đang xây dựng lại: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Tải lại tất cả mô hình AI?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Thao tác này sẽ tải lại khoảng 1.7 GB. Tổng hợp giọng nói vẫn hoạt động trong lúc cập nhật.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Tải lại",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Đổi bệnh nhân",
  "ui.provider.switch.add_patient": "+ Thêm bệnh nhân",
  "ui.provider.patients.title": "Bệnh nhân",
  "ui.provider.patients.actions_aria": "Hành động cho {name}",
  "ui.provider.patients.action_edit": "Chỉnh sửa",
  "ui.provider.patients.action_remove": "Xóa",
  "ui.provider.switch.voice_captured": "Đã thu giọng nói",
  "ui.provider.switch.no_voice": "Chưa có giọng nói",
  "ui.provider.switch.last_active_just_now": "Vừa xong",
  "ui.provider.switch.last_active_minutes":
    "Hoạt động {n} phút trước",
  "ui.provider.switch.last_active_hours":
    "Hoạt động {n} giờ trước",
  "ui.provider.switch.last_active_days":
    "Hoạt động {n} ngày trước",
  "ui.provider.switch.currently_active": "Đang hoạt động",
  "ui.provider.switch.switched_announcement":
    "Đã chuyển sang {name}. {count} tin nhắn trò chuyện.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Phiên nhân viên sắp hết",
  "ui.provider.staff_session.warning_body":
    "Quyền truy cập nhân viên sẽ khóa trong {n} giây.",
  "ui.provider.staff_session.extend": "Gia hạn phiên",
  "ui.provider.staff_session.end_now": "Kết thúc ngay",
  "ui.provider.nav.end_staff_session": "Kết thúc phiên nhân viên",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",
};

export default vi;
