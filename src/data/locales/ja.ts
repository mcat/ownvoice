/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Japanese (standard)
 * Locale: ja
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const ja: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "はい",
  "quick.no": "いいえ",
  "quick.thank_you": "ありがとうございます",
  "quick.please_wait": "お待ちください",
  "quick.dont_understand": "わかりません",
  "quick.repeat": "もう一度言ってください",
  "quick.retract": "そういうつもりではありませんでした",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "お水がほしいです",
  "needs.comfort.hungry": "おなかがすいています",
  "needs.comfort.cold": "寒いです",
  "needs.comfort.hot": "暑いです",
  "needs.comfort.bed": "ベッドを調整してください",
  "needs.comfort.bathroom": "トイレに行きたいです",
  "needs.comfort.hearing_aid": "補聴器がほしいです",
  "needs.comfort.glasses": "眼鏡がほしいです",
  "needs.comfort.ice": "氷のかけらがほしいです",
  "needs.comfort.pillow": "枕を直してください",
  "needs.comfort.turn": "体の向きを変えてください",
  "needs.comfort.sit_up": "起き上がるのを手伝ってください",
  "needs.comfort.quiet": "静かにしてください",
  "needs.comfort.lights_on": "電気をつけてください",
  "needs.comfort.lights_off": "電気を消してください",
  "needs.comfort.lights_dimmed": "電気を暗くしてください",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "お薬がほしいです",
  "needs.medical.suction": "吸引をしてほしいです",
  "needs.medical.breathe": "うまく息ができません",
  "needs.medical.nurse": "看護師さんを呼んでください",
  "needs.medical.doctor": "医師を呼んでください",
  "needs.medical.call_light": "今すぐ助けてください",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "家族に会いたいです",
  "needs.people.stay": "誰かそばにいてくれますか？",
  "needs.people.call": "誰かに電話したいです",
  "needs.people.interpreter": "通訳が必要です",
  "needs.people.respiratory_therapist": "呼吸療法士を呼んでください",
  "needs.people.speech_therapist": "言語聴覚士を呼んでください",

  // ── Patient needs: Hygiene ─────────────────────────────────────
  "needs.hygiene.back": "背中を拭いてください",
  "needs.hygiene.face": "顔を拭いてください",
  "needs.hygiene.feet": "足を洗ってください",
  "needs.hygiene.hair": "髪を洗ってください",
  "needs.hygiene.hands": "手を拭いてください",
  "needs.hygiene.mouth": "口腔ケアをしてください",
  "needs.hygiene.nose": "鼻を拭いてください",
  "needs.hygiene.teeth": "歯を磨いてください",
  "needs.hygiene.wound": "ガーゼを交換してください",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "疲れています",
  "feelings.physical.uncomfortable": "つらいです",
  "feelings.physical.weak": "体がだるいです",
  "feelings.physical.better": "気分がよくなりました",
  "feelings.physical.dizzy": "めまいがします",
  "feelings.physical.itchy": "かゆいです",
  "feelings.physical.wet": "濡れています",
  "feelings.physical.gagging": "えずいています",
  "feelings.physical.short_of_breath": "息切れがします",
  "feelings.physical.nauseated": "吐き気がします",
  "feelings.physical.worse": "気分が悪くなりました",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "怖いです",
  "feelings.emotional.lonely": "さみしいです",
  "feelings.emotional.frustrated": "もどかしいです",
  "feelings.emotional.confused": "混乱しています",
  "feelings.emotional.safe": "安心しています",
  "feelings.emotional.grateful": "感謝しています",
  "feelings.emotional.worried": "心配しています",
  "feelings.emotional.hopeful": "希望を持っています",
  "feelings.emotional.bored": "退屈しています",
  "feelings.emotional.embarrassed": "恥ずかしいです",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "今何時ですか？",
  "questions.day": "今日は何曜日ですか？",
  "questions.whats_happening": "わたしに何が起きていますか？",
  "questions.go_home": "いつ退院できますか？",
  "questions.next_medication": "次のお薬はいつですか？",
  "questions.explain_treatment": "治療の説明をしてもらえますか？",
  "questions.nurse_today": "今日の担当看護師は誰ですか？",
  "questions.eat_drink": "食べたり飲んだりできますか？",
  "questions.see_family": "いつ家族に会えますか？",
  "questions.extubation": "管はいつ抜けますか？",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "痛みなし",
  "pain.face.2": "少し痛い",
  "pain.face.4": "もう少し痛い",
  "pain.face.6": "さらに痛い",
  "pain.face.8": "とても痛い",
  "pain.face.10": "最も痛い",

  // ── Pain: Descriptors ──────────────────────────────────────────
  // NOTE: These must work as prenominal modifiers before 痛み in pain.sentence
  "pain.descriptor.aching": "鈍い",
  "pain.descriptor.burning": "焼けるような",
  "pain.descriptor.sharp": "鋭い",
  "pain.descriptor.throbbing": "ズキズキする",
  "pain.descriptor.cramping": "締め付けるような",
  "pain.descriptor.constant": "持続的な",
  "pain.descriptor.comes_and_goes": "断続的な",
  "pain.descriptor.numb": "しびれるような",
  "pain.descriptor.pressure": "圧迫するような",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "頭",
  "pain.region.face": "顔",
  "pain.region.neck": "首",
  "pain.region.chest": "胸",
  "pain.region.left_shoulder": "左肩",
  "pain.region.right_shoulder": "右肩",
  "pain.region.left_arm": "左腕",
  "pain.region.right_arm": "右腕",
  "pain.region.stomach": "おなか",
  "pain.region.upper_back": "背中の上の方",
  "pain.region.lower_back": "腰",
  "pain.region.left_leg": "左脚",
  "pain.region.right_leg": "右脚",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  // Japanese SOV: region + に + descriptor + 痛みがあります + severity
  "pain.sentence":
    "{region}に{descriptor}痛みがあります。10段階中{severity}です",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "強さ",
  "pain.step.location": "場所",
  "pain.step.descriptor": "特徴",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "わたしの目標",
  "wishes.worries.label": "わたしの心配事",
  "wishes.strength.label": "わたしの支え",
  "wishes.joy.label": "わたしの喜び",
  "wishes.tradeoffs.label": "治療について",
  "wishes.family.label": "わたしの家族",
  "wishes.hopes.label": "わたしの願い",

  // Questions
  "wishes.goals.question": "一番大切な目標は何ですか？",
  "wishes.worries.question": "一番心配なことは何ですか？",
  "wishes.strength.question": "あなたに力を与えてくれるものは何ですか？",
  "wishes.joy.question": "あなたの人生に喜びや意味を与えてくれるものは何ですか？",
  "wishes.tradeoffs.question":
    "もっと時間を得るために、どこまで治療を受けたいですか？",
  "wishes.family.question":
    "あなたに一番近い人たちは、あなたの望みをどのくらい知っていますか？",
  "wishes.hopes.question": "あなたの願いは何ですか？",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  // Format: "{stem}は{list}です。" — stems must end with a noun phrase
  "wishes.goals.stem": "わたしにとって一番大切なこと",
  "wishes.worries.stem": "わたしが心配していること",
  "wishes.strength.stem": "わたしに力をくれるもの",
  "wishes.joy.stem": "わたしに喜びをくれるもの",
  "wishes.tradeoffs.stem": "治療について思うこと",
  "wishes.family.stem": "わたしの家族のこと",
  "wishes.hopes.stem": "わたしの願い",

  // Responses — goals
  "wishes.goals.r.family": "家族と一緒にいること",
  "wishes.goals.r.comfort": "楽に過ごすこと、痛みがないこと",
  "wishes.goals.r.longevity": "できるだけ長く生きること",
  "wishes.goals.r.home": "家に帰ること",
  "wishes.goals.r.independence": "自分のことを自分でできること",
  "wishes.goals.r.peace": "穏やかでいること",

  // Responses — worries
  "wishes.worries.r.suffering": "苦しむこと、痛みがあること",
  "wishes.worries.r.alone": "ひとりになること",
  "wishes.worries.r.burden": "家族の負担になること",
  "wishes.worries.r.activities": "好きなことができなくなること",
  "wishes.worries.r.leaving": "家族を残していくこと",
  "wishes.worries.r.unknown": "これから何が起こるかわからないこと",

  // Responses — strength
  "wishes.strength.r.family": "家族",
  "wishes.strength.r.faith": "信仰",
  "wishes.strength.r.friends": "友人",
  "wishes.strength.r.wishes_heard": "わたしの望みが伝わっていること",
  "wishes.strength.r.hope": "良くなるという希望",
  "wishes.strength.r.carers": "わたしを看てくれている人たち",

  // Responses — joy
  "wishes.joy.r.family": "家族と過ごす時間",
  "wishes.joy.r.outdoors": "外にいること",
  "wishes.joy.r.hobbies": "趣味や好きなこと",
  "wishes.joy.r.helping": "人の役に立つこと",
  "wishes.joy.r.spiritual": "信仰や精神的な営み",
  "wishes.joy.r.routines": "日々のささやかな習慣",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "できる限りすべての治療を受けたいです",
  "wishes.tradeoffs.r.good_chance":
    "効果が期待できるなら治療を受けたいです",
  "wishes.tradeoffs.r.try_stop":
    "試してみて、効果がなければやめたいです",
  "wishes.tradeoffs.r.comfortable": "楽に過ごすことを大切にしたいです",
  "wishes.tradeoffs.r.think": "もう少し考える時間が必要です",
  "wishes.tradeoffs.r.family_first":
    "まず家族と相談したいです",

  // Responses — family
  "wishes.family.r.know_well": "よく知っています",
  "wishes.family.r.know_some": "ある程度知っています",
  "wishes.family.r.not_talked": "まだ話していません",
  "wishes.family.r.need_help": "伝えるのに助けが必要です",
  "wishes.family.r.team_explain":
    "医療チームから説明してほしいです",

  // Responses — hopes
  "wishes.hopes.r.get_better": "良くなること",
  "wishes.hopes.r.go_home": "家に帰ること",
  "wishes.hopes.r.comfortable": "楽に過ごすこと",
  "wishes.hopes.r.family_ok": "家族が元気でいること",
  "wishes.hopes.r.more_time": "もっと時間があること",
  "wishes.hopes.r.peace": "穏やかでいること",

  // Wish sentence composition templates
  // TODO(translator): Verify "は…です" works for all stem + list combinations
  "wishes.compose": "{stem}は{list}です。",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "助けを呼んでまいります。",
  "provider.responses.interpreter": "通訳を手配します。",
  "provider.responses.family": "ご家族に連絡いたします。",
  "provider.responses.get_that": "お持ちいたします。",
  "provider.responses.doctor_know": "医師に伝えます。",
  "provider.responses.medication": "お薬をお持ちします。",
  "provider.responses.family_coming": "ご家族が向かっています。",
  "provider.responses.doctor_soon": "医師がまもなく参ります。",
  "provider.responses.doing_well": "順調ですよ。",
  "provider.responses.rest": "少し休みましょう。",

  "provider.questions.feeling": "お加減はいかがですか？",
  "provider.questions.need": "何か必要なものはありますか？",
  "provider.questions.where_hurts":
    "どこが痛いか教えていただけますか？",
  "provider.questions.rate_pain": "痛みを0から10で教えてください。",
  "provider.questions.sleep": "よく眠れましたか？",
  "provider.questions.comfortable": "楽にしていますか？",

  "provider.directions.procedure": "本日、処置が予定されています。",
  "provider.directions.stay_in_bed": "ベッドで安静にしてください。",
  "provider.directions.vitals": "バイタルを確認しますね。",
  "provider.directions.medication_time": "お薬の時間です。",
  "provider.directions.breathe": "ゆっくり深呼吸してみてください。",
  "provider.directions.call_button":
    "何かあればナースコールを押してください。",

  "provider.goals_of_care.matters_most":
    "あなたにとって大切なことについてお話ししたいのですが。",
  "provider.goals_of_care.goals":
    "今、一番大切な目標は何ですか？",
  "provider.goals_of_care.worries":
    "一番心配なことは何ですか？",
  "provider.goals_of_care.strength": "あなたに力を与えてくれるものは何ですか？",
  "provider.goals_of_care.joy":
    "あなたの人生に喜びや意味を与えてくれるものは何ですか？",
  "provider.goals_of_care.wishes":
    "ご家族はあなたの望みをどのくらいご存じですか？",
  "provider.goals_of_care.hopes": "あなたの願いは何ですか？",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "よく眠れました",
  "time.morning.didnt_sleep": "あまり眠れませんでした",
  "time.morning.breakfast": "朝ごはんがほしいです",
  "time.morning.doctor_coming": "先生はいつ来ますか？",

  "time.afternoon.tired": "疲れています",
  "time.afternoon.lunch": "お昼ごはんはもらえますか？",
  "time.afternoon.see_family": "いつ家族に会えますか？",
  "time.afternoon.rest": "休みたいです",

  "time.evening.cant_sleep": "眠れません",
  "time.evening.medication": "お薬がほしいです",
  "time.evening.call_family": "家族に電話できますか？",
  "time.evening.pain": "痛いです",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Japanese grammar does not compose by simple concatenation the way
  // English does. Child fragments are written as complete predicates
  // where possible. Review each path for naturalness.
  "suggest.start.i_am": "わたしは",
  "suggest.start.i_feel": "わたしは",
  "suggest.start.i_want": "わたしは",
  "suggest.start.i_need": "わたしは",
  "suggest.start.please": "お願いです",
  "suggest.start.when": "いつ",
  "suggest.start.can_you": "お願いがあります",
  "suggest.start.tell_me": "教えてください",

  "suggest.i_am.in_pain": "痛いです",
  "suggest.i_am.cold": "寒いです",
  "suggest.i_am.hot": "暑いです",
  "suggest.i_am.hungry": "おなかがすいています",
  "suggest.i_am.thirsty": "のどが渇いています",
  "suggest.i_am.tired": "疲れています",
  "suggest.i_am.uncomfortable": "つらいです",
  "suggest.i_am.okay": "大丈夫です",
  "suggest.i_am.not_okay": "大丈夫ではありません",
  "suggest.i_am.ready": "準備ができています",

  "suggest.i_feel.scared": "怖いです",
  "suggest.i_feel.sick": "気分が悪いです",
  "suggest.i_feel.dizzy": "めまいがします",
  "suggest.i_feel.weak": "体がだるいです",
  "suggest.i_feel.better": "気分がよくなりました",
  "suggest.i_feel.worse": "気分が悪くなりました",
  "suggest.i_feel.nauseous": "吐き気がします",
  "suggest.i_feel.lonely": "さみしいです",
  "suggest.i_feel.confused": "混乱しています",
  "suggest.i_feel.safe": "安心しています",

  "suggest.i_feel_scared.procedure": "処置が怖いです",
  "suggest.i_feel_scared.happening": "今起きていることが怖いです",
  "suggest.i_feel_scared.alone": "ひとりが怖いです",
  "suggest.i_feel_scared.need_someone": "誰かそばにいてほしいです",

  "suggest.i_feel_sick.stomach": "おなかが気持ち悪いです",
  "suggest.i_feel_sick.dizzy": "めまいもします",
  "suggest.i_feel_sick.help": "助けが必要です",

  "suggest.i_want.water": "お水がほしいです",
  "suggest.i_want.family": "家族に会いたいです",
  "suggest.i_want.go_home": "家に帰りたいです",
  "suggest.i_want.sleep": "眠りたいです",
  "suggest.i_want.medication": "お薬がほしいです",
  "suggest.i_want.blanket": "毛布がほしいです",
  "suggest.i_want.talk": "誰かと話したいです",
  "suggest.i_want.nurse": "看護師さんに来てほしいです",

  "suggest.i_want_to_go.home": "家に帰りたいです",
  "suggest.i_want_to_go.sleep": "眠りたいです",
  "suggest.i_want_to_go.bathroom": "トイレに行きたいです",

  "suggest.i_want_my.family": "家族",
  "suggest.i_want_my.medication": "お薬",
  "suggest.i_want_my.phone": "携帯電話",
  "suggest.i_want_my.glasses": "メガネ",
  "suggest.i_want_my.blanket": "毛布",

  "suggest.i_need.help": "助けが必要です",
  "suggest.i_need.water": "お水がほしいです",
  "suggest.i_need.bathroom": "トイレに行きたいです",
  "suggest.i_need.medication": "お薬が必要です",
  "suggest.i_need.nurse": "看護師さんを呼んでください",
  "suggest.i_need.doctor": "医師を呼んでください",
  "suggest.i_need.rest": "休みたいです",
  "suggest.i_need.blanket": "毛布がほしいです",
  "suggest.i_need.suction": "吸引をしてほしいです",

  "suggest.i_need_the.nurse": "看護師さん",
  "suggest.i_need_the.doctor": "医師",
  "suggest.i_need_the.bathroom": "トイレ",
  "suggest.i_need_the.light_off": "電気を消して",
  "suggest.i_need_the.light_on": "電気をつけて",

  "suggest.i_need_my.medication": "お薬",
  "suggest.i_need_my.family": "家族",
  "suggest.i_need_my.glasses": "メガネ",
  "suggest.i_need_my.phone": "携帯電話",

  "suggest.please.help_me": "助けてください",
  "suggest.please.call_family": "家族に電話してください",
  "suggest.please.light_off": "電気を消してください",
  "suggest.please.adjust_bed": "ベッドを調整してください",
  "suggest.please.give_me": "ください",
  "suggest.please.explain": "説明してください",
  "suggest.please.come_back": "また来てください",
  "suggest.please.stay": "そばにいてください",
  "suggest.please.dont_leave": "行かないでください",

  "suggest.please_help_me.pain": "痛いです",
  "suggest.please_help_me.breathe": "息ができません",
  "suggest.please_help_me.sick": "気分が悪いです",
  "suggest.please_help_me.scared": "怖いです",

  "suggest.please_give_me.water": "お水",
  "suggest.please_give_me.medication": "お薬",
  "suggest.please_give_me.blanket": "毛布",
  "suggest.please_give_me.pain_relief": "痛み止め",

  "suggest.when.go_home": "退院できますか？",
  "suggest.when.family": "家族は来ますか？",
  "suggest.when.medication": "次のお薬はいつですか？",
  "suggest.when.doctor": "先生は来ますか？",
  "suggest.when.eat": "食事できますか？",
  "suggest.when.over": "終わりますか？",

  "suggest.can_you.help": "助けてもらえますか？",
  "suggest.can_you.call_family": "家族に電話してもらえますか？",
  "suggest.can_you.get_nurse": "看護師さんを呼んでもらえますか？",
  "suggest.can_you.explain": "何が起きているか説明してもらえますか？",
  "suggest.can_you.light_off": "電気を消してもらえますか？",
  "suggest.can_you.adjust_bed": "ベッドを調整してもらえますか？",
  "suggest.can_you.stay": "そばにいてもらえますか？",

  "suggest.tell_me.happening": "何が起きていますか",
  "suggest.tell_me.time": "今何時ですか",
  "suggest.tell_me.go_home": "いつ退院できますか",
  "suggest.tell_me.day": "今日は何曜日ですか",
  "suggest.tell_me.treatment": "治療について",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "助けてください",
  "suggest.i_am_in_pain.worse": "悪化しています",
  "suggest.i_am_in_pain.medication": "お薬が必要です",
  "suggest.i_am_in_pain.back": "腰が痛いです",
  "suggest.i_am_in_pain.chest": "胸が痛いです",
  "suggest.i_am_in_pain.stomach": "おなかが痛いです",

  "suggest.i_need_help.up": "起き上がりたいです",
  "suggest.i_need_help.breathing": "呼吸が苦しいです",
  "suggest.i_need_help.pain": "痛みがあります",
  "suggest.i_need_help.now": "今すぐ",
  "suggest.i_need_help.please": "お願いします",

  "suggest.i_feel_better.than_before": "前よりも",
  "suggest.i_feel_better.now": "今は",
  "suggest.i_feel_better.thanks": "ありがとうございます",

  "suggest.i_feel_worse.than_before": "前よりも",
  "suggest.i_feel_worse.need_doctor": "医師を呼んでください",
  "suggest.i_feel_worse.help": "助けてください",
  "suggest.i_feel_worse.medication": "お薬が必要です",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "わたしは",
  "suggest.ctx.feeling.i_am": "わたしは",
  "suggest.ctx.feeling.better": "前より良くなりました",
  "suggest.ctx.feeling.not_great": "あまりよくありません",
  "suggest.ctx.feeling.pain": "痛いです",
  "suggest.ctx.feeling.okay": "大丈夫です",
  "suggest.ctx.feeling.help": "助けてもらえますか？",

  "suggest.ctx.need.i_need": "わたしは",
  "suggest.ctx.need.i_want": "わたしは",
  "suggest.ctx.need.fine": "今は大丈夫です",
  "suggest.ctx.need.yes": "はい、お願いします",
  "suggest.ctx.need.no": "いいえ、結構です",
  "suggest.ctx.need.stay": "そばにいてもらえますか？",

  "suggest.ctx.where_hurts.head": "頭です",
  "suggest.ctx.where_hurts.chest": "胸です",
  "suggest.ctx.where_hurts.stomach": "おなかです",
  "suggest.ctx.where_hurts.back": "背中です",
  "suggest.ctx.where_hurts.left_arm": "左腕です",
  "suggest.ctx.where_hurts.right_leg": "右脚です",
  "suggest.ctx.where_hurts.everywhere": "全身です",

  "suggest.ctx.pain.very_bad": "とてもひどいです",
  "suggest.ctx.pain.worse": "悪化しています",
  "suggest.ctx.pain.same": "変わりません",
  "suggest.ctx.pain.little_better": "少しよくなりました",
  "suggest.ctx.pain.need_relief": "痛み止めが必要です",

  "suggest.ctx.comfort.comfortable": "楽にしています",
  "suggest.ctx.comfort.not_comfortable": "つらいです",
  "suggest.ctx.comfort.cant_sleep": "眠れません",
  "suggest.ctx.comfort.cold": "寒いです",
  "suggest.ctx.comfort.hot": "暑いです",
  "suggest.ctx.comfort.adjust_bed": "ベッドを調整してもらえますか？",

  "suggest.ctx.night.cant_sleep": "眠れません",
  "suggest.ctx.night.i_need": "わたしは",
  "suggest.ctx.night.pain": "痛いです",
  "suggest.ctx.night.i_feel": "わたしは",
  "suggest.ctx.night.can_you": "お願いがあります",
  "suggest.ctx.night.please": "お願いです",
  "suggest.ctx.night.i_am": "わたしは",
  "suggest.ctx.night.when": "いつ",

  "suggest.ctx.morning.i_am": "わたしは",
  "suggest.ctx.morning.i_need": "わたしは",
  "suggest.ctx.morning.i_feel": "わたしは",
  "suggest.ctx.morning.doctor": "先生はいつ来ますか？",
  "suggest.ctx.morning.i_want": "わたしは",
  "suggest.ctx.morning.can_you": "お願いがあります",
  "suggest.ctx.morning.please": "お願いです",
  "suggest.ctx.morning.tell_me": "教えてください",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "すぐ言う",
  "cat.needs": "してほしい",
  "cat.feelings": "気持ち",
  "cat.pain": "痛み",
  "cat.questions": "質問",
  "sub.comfort": "快適さ",
  "sub.medical": "医療",
  "sub.people": "人",
  "sub.hygiene": "清潔",
  "sub.physical": "からだ",
  "sub.emotional": "きもち",

  // Provider category labels
  "provider.cat.responses": "応答",
  "provider.cat.questions": "質問",
  "provider.cat.directions": "指示",
  "provider.cat.goals_of_care": "ケアの目標",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — {name}との会話",
  "ui.patient.app.name_fallback": "患者",
  "ui.patient.header.name_fallback": "患者",
  "ui.patient.header.bed_prefix": "ベッド ",
  "ui.dual.nav.wishes": "わたしの望み",
  "ui.provider.nav.staff": "スタッフ",
  "ui.provider.nav.switch_patient": "患者を切り替える",
  "ui.provider.nav.settings": "設定",
  "ui.provider.nav.theme.auto": "自動",
  "ui.provider.nav.theme.light": "ライト",
  "ui.provider.nav.theme.dark": "ダーク",
  "ui.patient.tabbar.say_more": "もっと伝える",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "痛みはどのくらいですか？",
  "ui.dual.pain.heading.location": "どこが痛いですか？",
  "ui.dual.pain.heading.descriptor": "痛みはどんな感じですか？",
  "ui.patient.pain.step_of": "ステップ {n}/{total}",
  "ui.patient.pain.back_to": "{label}に戻る",
  "ui.patient.pain.level_aria": "痛みレベル {n}、{label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "{name}さんの望み",
  "ui.patient.wishes.my_wishes": "わたしの望み",
  "ui.patient.wishes.step_of": "ステップ {n}/{total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "まだ望みは共有されていません。",
  "ui.patient.wishes.share_all_again": "すべての望みをもう一度共有する",
  "ui.patient.wishes.close": "閉じる",
  "ui.patient.wishes.speak": "話す",
  "ui.patient.wishes.back": "戻る",
  "ui.patient.wishes.skip": "スキップ",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "下の言葉をタップするか、入力してください...",
  "ui.patient.builder.message_aria": "あなたのメッセージ",
  "ui.patient.builder.undo": "最後の語を取り消す",
  "ui.patient.builder.clear": "メッセージを消去",
  "ui.patient.builder.ready":
    "メッセージの準備ができました。「話す」をタップして送信してください。",
  "ui.patient.builder.speak": "話す",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "もう一度: {text}",
  "ui.dual.thread.aria_label": "Conversation",
  "ui.dual.thread.scroll_up_aria": "会話を上にスクロール",
  "ui.dual.thread.scroll_down_aria": "会話を下にスクロール",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "ケアチーム",
  "ui.provider.fallback_name": "スタッフ",
  "ui.provider.speaking_to": "{prov}として{name}さんに話しています",
  "ui.provider.patient_fallback": "患者",
  "ui.provider.close_panel": "パネルを閉じる",
  "ui.provider.select_provider": "{name}を選択",
  "ui.provider.show_category": "{key}を表示",
  "ui.provider.speak_phrase": "発話: {phrase}",
  "ui.provider.speaking_as_aria": "Speaking as",
  "ui.provider.section_aria": "Phrase category",
  "ui.provider.phrases_aria": "{section} phrases",
  "ui.provider.setup.progress_aria": "Setup progress",
  "ui.provider.settings.aria_label": "Settings",
  "ui.provider.settings.reset.aria_label": "Reset actions",
  "ui.provider.patients.list_aria": "Patients",
  "ui.provider.fallback_voice.recommended_aria": "Recommended voices",
  "ui.provider.fallback_voice.other_aria": "Other voices",
  "ui.provider.fallback_voice.all_aria": "Available voices",
  "ui.provider.pin_gate.keypad_aria": "PIN keypad",


  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "発話中: {text}",
  "ui.dual.speaking.patient_voice": "あなたの声",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "PINを入力",
  "ui.provider.pin_gate.subtitle": "スタッフ専用",
  "ui.provider.pin_gate.incorrect": "PINが正しくありません",
  "ui.provider.pin_gate.delete_aria": "削除",
  "ui.provider.pin_gate.digit_aria": "数字 {n}",
  "ui.provider.pin_gate.cancel": "キャンセル",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "これから文章を声に出して読んでいただきます。",
  "ui.provider.voice_capture.coaching_breath":
    "深呼吸を何回かしてください。",
  "ui.provider.voice_capture.coaching_ready": "準備ができました。",
  "ui.provider.voice_capture.breathe_in": "息を吸って…",
  "ui.provider.voice_capture.breathe_out": "息を吐いて…",
  "ui.provider.voice_capture.creating": "ボイスクローンを作成中...",
  "ui.provider.voice_capture.creating_from_sample":
    "サンプルからボイスクローンを作成中...",
  "ui.provider.voice_capture.loading_model":
    "音声モデルを読み込み中...",
  "ui.provider.voice_capture.clone_failed": "クローン作成に失敗しました",
  "ui.provider.voice_capture.captured": "音声を取得しました",
  "ui.provider.voice_capture.stop": "停止",
  "ui.provider.voice_capture.play": "再生",
  "ui.provider.voice_capture.discard": "録音を破棄",
  "ui.provider.voice_capture.use_recording": "この録音を使用する",
  "ui.provider.voice_capture.upload_file": "ファイルをアップロード",
  "ui.provider.voice_capture.record": "録音",
  "ui.provider.voice_capture.stop_early": "早めに停止",
  "ui.provider.voice_capture.remove": "削除",
  "ui.provider.voice_capture.retry": "再試行",
  "ui.provider.voice_capture.done": "完了しました！",
  "ui.provider.voice_capture.cancel": "キャンセル",
  "ui.provider.voice_capture.seconds_recorded": "{n}秒録音済み",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "録音カウントダウンをキャンセル",
  "ui.provider.voice_capture.stop_early_aria":
    "録音を早めに停止",
  "ui.provider.voice_capture.audio_level_aria": "オーディオレベル",
  "ui.provider.voice_capture.recording_progress_aria":
    "録音の進行状況",
  "ui.provider.voice_capture.stop_preview_aria":
    "プレビュー再生を停止",
  "ui.provider.voice_capture.play_preview_aria":
    "録音のプレビューを再生",
  "ui.provider.voice_capture.discard_aria":
    "この録音を破棄してやり直す",
  "ui.provider.voice_capture.stop_playback_aria":
    "録音サンプルの再生を停止",
  "ui.provider.voice_capture.play_sample_aria":
    "録音した音声サンプルを再生",
  "ui.provider.voice_capture.remove_aria": "音声サンプルを削除",
  "ui.provider.voice_capture.retry_aria":
    "ボイスクローン抽出を再試行",
  "ui.provider.voice_capture.upload_aria":
    "ファイルから音声サンプルをアップロード",
  "ui.provider.voice_capture.record_aria":
    "マイクから音声サンプルを録音",
  "ui.provider.voice_capture.err_network":
    "音声モデルに接続できませんでした。接続を確認して、再試行をタップしてください。",
  "ui.provider.voice_capture.err_timeout":
    "音声処理に時間がかかりすぎました。再試行をタップしてください。",
  "ui.provider.voice_capture.err_mic_denied":
    "マイクへのアクセスがブロックされています。ブラウザの設定で有効にするか、ファイルをアップロードしてください。",
  "ui.provider.voice_capture.err_generic":
    "音声の準備を完了できませんでした。再試行をタップしてください。",
  "ui.provider.voice_capture.err_too_short":
    "録音が短すぎました。カウントダウンの間ずっと話してから、再試行をタップしてください。",
  "ui.provider.voice_capture.err_too_noisy":
    "周囲の騒音が大きすぎて音声を正しく複製できませんでした。静かな場所に移動して再試行をタップしてください。",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "マイクへのアクセスが拒否されました。ファイルをアップロードしてみてください。",
  "ui.provider.voice_capture.err_playback":
    "音声を再生できませんでした。",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "高品質",
  "ui.provider.fallback_voice.enhanced_aria": "高品質ニューラル音声",
  "ui.provider.fallback_voice.on_device_badge": "オンデバイス",
  "ui.provider.fallback_voice.playing": "再生中...",
  "ui.provider.fallback_voice.unavailable":
    "このデバイスではシステム音声を利用できません。",
  "ui.provider.fallback_voice.loading":
    "利用可能な音声を読み込み中...",
  "ui.provider.fallback_voice.hide_others": "他の音声を非表示",
  "ui.provider.fallback_voice.more_voices": "その他の音声 ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "患者",
  "ui.provider.setup.steps.voice": "音声",
  "ui.provider.setup.steps.care_team": "ケアチーム",
  "ui.provider.setup.steps.confirm": "確認",

  "ui.provider.setup.skip": "スキップ →",
  "ui.provider.setup.skip_aria": "セットアップをスキップ",
  "ui.provider.setup.skip_dialog.title": "セットアップをスキップしますか？",
  "ui.provider.setup.skip_dialog.body": "今すぐ OwnVoice を使い始めてください。後でヘッダーの患者名をタップしてセットアップを完了できます。",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "患者は追加されません。",
  "ui.provider.setup.skip_dialog.confirm": "セットアップをスキップ",
  "ui.provider.setup.skip_dialog.cancel": "続ける",

  "ui.provider.setup.back": "戻る",
  "ui.provider.setup.continue": "続ける",
  "ui.provider.setup.start": "OwnVoiceを開始",

  "ui.provider.setup.step0.heading": "OwnVoiceへようこそ",
  "ui.provider.setup.step0.subhead":
    "コミュニケーションボードを設定しましょう。すべてのデータはこのデバイスに保存されます。",
  "ui.provider.setup.step0.name_label": "患者名",
  "ui.provider.setup.step0.name_placeholder": "名前（呼び名でも可）",
  "ui.provider.setup.step0.bed_label": "ベッド / 病室",
  "ui.provider.setup.step0.bed_placeholder": "例: 4B-12",
  "ui.provider.setup.step0.language_label": "言語",

  "ui.provider.setup.step1.heading": "音声サンプル",
  "ui.provider.setup.step1.body1":
    "音声サンプルを取得すると、OwnVoiceが患者さんご本人の声で話せるようになります。このステップは任意です。",
  "ui.provider.setup.step1.body2":
    "ボイスクローンはすべてデバイス上で処理されます。音声データがこのタブレットの外に出ることはありません。",
  "ui.provider.setup.step1.patient_label": "患者",
  "ui.provider.setup.step1.backup_voice_heading": "バックアップ音声",
  "ui.provider.setup.step1.backup_voice_body1":
    "ボイスクローンの読み込み中、またはサンプルが録音されていない場合に使うシステム音声を選んでください。タップするとプレビューが再生されます。",
  "ui.provider.setup.step1.backup_voice_body2":
    "デバイスに内蔵されたテキスト読み上げ機能を使用します。",

  "ui.provider.setup.step2.heading": "ケアチーム",
  "ui.provider.setup.step2.body":
    "この患者を担当するスタッフを追加してください。",
  "ui.provider.setup.step2.icon_label": "アイコン",
  "ui.provider.setup.step2.name_label": "名前",
  "ui.provider.setup.step2.name_placeholder": "田中先生、看護師 鈴木...",
  "ui.provider.setup.step2.add": "追加",

  "ui.provider.setup.step3.heading": "準備完了",
  "ui.provider.setup.step3.body":
    "設定を確認してください。あとから設定で変更できます。",
  "ui.provider.setup.step3.summary.patient": "患者",
  "ui.provider.setup.step3.summary.bed": "ベッド / 病室",
  "ui.provider.setup.step3.summary.language": "言語",
  "ui.provider.setup.step3.summary.language_default": "英語",
  "ui.provider.setup.step3.summary.voice": "音声",
  "ui.provider.setup.step3.summary.care_team": "ケアチーム",
  "ui.provider.setup.step3.summary.not_set": "未設定",
  "ui.provider.setup.step3.summary.captured": "取得済み",
  "ui.provider.setup.step3.summary.not_captured": "未取得",
  "ui.provider.setup.step3.summary.none_added": "未追加",
  "ui.provider.setup.step3.pin_label": "スタッフPIN（任意）",
  "ui.provider.setup.step3.pin_body":
    "スタッフ設定を保護する4桁のPINを設定してください。",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "設定",
  "ui.provider.settings.done": "完了",
  "ui.provider.settings.close_aria": "設定を閉じる",

  "ui.provider.patient_edit.title": "{name} を編集",
  "ui.provider.patient_edit.title_default": "患者を編集",
  "ui.provider.patient_edit.close_aria": "患者エディタを閉じる",
  "ui.provider.patient_pill.aria": "患者を編集: {name}",
  "ui.provider.nav.staff_menu": "設定",
  "ui.provider.staff_sheet.title": "スタッフ",
  "ui.provider.staff_sheet.close_aria": "スタッフメニューを閉じる",
  "ui.provider.staff_sheet.patients_description": "患者の切替、追加、編集",
  "ui.provider.staff_sheet.settings_description": "ケアチーム、アクセシビリティ、オフライン",
  "ui.provider.staff_sheet.end_session_description": "スタッフモードを終了",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "{label}の音声準備を破棄しますか？",
  "ui.provider.settings.voice_cache.discard_body":
    "進行状況（{current} / {total}フレーズ）が失われます。録音した音声サンプルは保持されます。あとから準備を再開できます。",
  "ui.provider.settings.voice_cache.cancel": "キャンセル",
  "ui.provider.settings.voice_cache.cancel_aria":
    "キャンセルして音声準備を保持",
  "ui.provider.settings.voice_cache.discard_confirm": "破棄",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "音声準備の破棄を確認",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "{label}の音声準備を破棄",
  // TODO(translator): {plural} token is an English suffix — renders as empty in Japanese
  "ui.provider.settings.voice_cache.queued":
    "待機中 — {label}の音声を次に準備します（{total}フレーズ{plural}）",
  "ui.provider.settings.voice_cache.preparing":
    "{label}の音声を準備中… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "一時停止 — {label}の音声… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "再開",
  "ui.provider.settings.voice_cache.resume_aria":
    "{label}の音声準備を再開",
  "ui.provider.settings.voice_cache.pause": "一時停止",
  "ui.provider.settings.voice_cache.pause_aria":
    "{label}の音声準備を一時停止",
  "ui.provider.settings.voice_cache.done":
    "ボイスクローンが有効 — {label}の声で全{total}フレーズ準備完了",
  // TODO(translator): {plural} token is an English suffix — renders as empty in Japanese
  "ui.provider.settings.voice_cache.failed":
    "{label}で{count}フレーズ{plural}が失敗しました",
  "ui.provider.settings.voice_cache.retry": "再試行",
  "ui.provider.settings.voice_cache.retry_aria":
    "失敗した音声キャッシュフレーズを再試行",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "このアプリについて",
  "ui.provider.settings.about.subtitle":
    "入院患者向けAACコミュニケーション支援アプリ。",
  "ui.provider.settings.about.attribution_1":
    "痛みスケール: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "ケアの目標: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SWキャッシュ:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "リセット",
  "ui.provider.settings.reset.action_label":
    "新しい患者のためにアプリをリセット",
  "ui.provider.settings.reset.confirm_title": "本当によろしいですか？",
  "ui.provider.settings.reset.confirm_body":
    "患者データ、音声サンプル、会話履歴、スタッフ設定がすべて消去されます。この操作は取り消せません。",
  "ui.provider.settings.reset.confirm_destructive": "すべてリセット",
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
  "ui.provider.settings.accessibility.heading": "アクセシビリティ",
  "ui.provider.settings.accessibility.toggle_label":
    "支援入力モード",
  "ui.provider.settings.accessibility.toggle_description":
    "フォーカスリングの強調、タップの反応時間延長、ホバーフィードバックの強化を行います。トラックボール、ジョイスティック、AssistiveTouchカーソル、スイッチをご利用の患者向けです。",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "外部ポインターを検出しました。",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "この患者に支援入力モードの有効化をご検討ください。",
  "ui.provider.settings.accessibility.keep_screen_awake_label": "画面をスリープさせない",
  "ui.provider.settings.accessibility.keep_screen_awake_description": "OwnVoice を開いている間、iPad の画面が暗くなったりロックされたりするのを防ぎます。バッテリー駆動のみのステーションでは無効にしてください。",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "患者",
  "ui.provider.settings.patients.active_remove_hint":
    "この患者を削除する前に、別の患者に切り替えてください。",
  "ui.provider.settings.patients.remove_button": "削除",
  "ui.provider.settings.patients.add_patient": "+ 患者を追加",
  "ui.provider.settings.patients.remove_dialog.title":
    "{name}を削除しますか？",
  "ui.provider.settings.patients.remove_dialog.body":
    "この患者の音声サンプル、会話履歴、ボイスクローンのキャッシュ音声が削除されます。ケアチームのボイスクローンは他の患者用に保持されます。この操作は取り消せません。",
  "ui.provider.settings.patients.remove_dialog.confirm": "削除",
  "ui.provider.settings.patients.active_discharge_hint":
    "この患者を退院させる前に、別の患者に切り替えてください。",
  "ui.provider.settings.patients.discharge_dialog.title": "{name}を退院させますか？",
  "ui.provider.settings.patients.discharge_dialog.body":
    "この患者のすべての会話、音声キャッシュ、アクティビティログのエントリが削除されます。この操作は取り消せません。",
  "ui.provider.settings.patients.discharge_dialog.confirm": "退院",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "ケアチーム",
  "ui.provider.settings.care_team.empty":
    "まだスタッフが追加されていません。",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "患者情報",
  "ui.provider.settings.patient_info.name_label": "名前",
  "ui.provider.settings.patient_info.bed_label": "ベッド / 病室",
  "ui.provider.settings.patient_info.language_label": "言語",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "患者の言語",
  "ui.provider.settings.lang.caregiver_section":
    "ケアチームの言語",
  "ui.provider.settings.lang.caregiver_helper":
    "ケアチームが理解する言語です。通常、デバイスごとに1回設定します。",
  "ui.provider.settings.lang.change": "言語を変更",

  "ui.provider.settings.lang.picker_title": "言語を選択",
  "ui.provider.settings.lang.patient_dialog.title":
    "患者の言語を{lang}に変更しますか？",
  "ui.provider.settings.lang.patient_dialog.body":
    "ボイスクローンはそのまま使えます。タップするフレーズの音声は変わりません。{providerCount}人のケアチームの音声を準備します（約{estimatedMinutes}分）。準備中もアプリを使い続けられます。",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "ケアチームのボイスクローンは{lang}では利用できません。代わりにシステム音声が使われます。対応言語に戻した場合に備え、既存の録音は保持されます。",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "タップするフレーズの音声は変わりません。ケアチームの音声が設定されていないため、再生成の必要はありません。",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "ケアチームの言語を{lang}に変更しますか？",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "ケアチームのボイスクローンはそのまま使えます。新しい言語で患者の音声を準備します（約{estimatedMinutes}分）。準備中もアプリを使い続けられます。",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "患者のボイスクローンは{lang}では利用できません。代わりにシステム音声が使われます。対応言語に戻した場合に備え、録音された患者の音声サンプルは保持されます。",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "患者のボイスクローンが設定されていないため、再生成の必要はありません。",
  "ui.provider.settings.patient_info.voice_label": "音声",
  "ui.provider.settings.patient_info.backup_voice_label":
    "バックアップ音声",
  "ui.provider.settings.patient_info.backup_voice_body":
    "ボイスクローンの読み込み中に使用するシステム音声です。タップするとプレビューが再生されます。",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.activity_log.heading": "アクティビティログ",
  "ui.provider.settings.activity_log.description":
    "このデバイスで記録された発話、エクスポート、システムイベント。",
  "ui.provider.settings.offline.heading": "アプリ診断",
  "ui.provider.settings.offline.status_description":
    "音声生成、提案、音声認識のためにデバイス上で使用するAIモデルの状態です。",
  "ui.provider.settings.offline.downloading":
    "モデルをダウンロード中…",
  "ui.provider.settings.offline.download_progress_aria":
    "モデルのダウンロード進行状況",
  "ui.provider.settings.offline.all_ready":
    "すべてのモデルが準備完了",
  "ui.provider.settings.offline.redownload_button":
    "モデルを再ダウンロード",
  "ui.provider.settings.offline.already_up_to_date":
    "すでに最新です",
  "ui.provider.settings.offline.checking": "確認中…",
  "ui.provider.settings.offline.verified": "✓ モデル検証済み",
  "ui.provider.settings.offline.check_button":
    "既存モデルを確認",
  "ui.provider.settings.offline.redownloading":
    "再ダウンロード中…",
  "ui.provider.settings.offline.force_redownload_button":
    "すべてのモデルを強制再ダウンロード",
  "ui.provider.settings.offline.model_status_ready": "準備完了",
  "ui.provider.settings.offline.model_status_downloading":
    "ダウンロード中…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "再試行が必要",
  "ui.provider.settings.offline.last_verified_prefix":
    "最終検証: ",
  "ui.provider.settings.offline.storage_prefix": "ストレージ: ",
  "ui.provider.settings.offline.storage_of": " / ",
  "ui.provider.settings.offline.storage_used": " 使用中",
  "ui.provider.settings.offline.storage_low": " — 残りわずか",
  "ui.provider.settings.offline.clear_audio_cache":
    "音声キャッシュを消去",
  "ui.provider.settings.offline.clearing": "消去中…",
  "ui.provider.settings.offline.rebuilding":
    "再構築中: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "すべてのAIモデルを再ダウンロードしますか？",
  "ui.provider.settings.offline.redownload_dialog.body":
    "約1.7 GBをダウンロードし直します。更新中も音声合成は引き続き使えます。",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "再ダウンロード",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "患者を切り替える",
  "ui.provider.switch.add_patient": "+ 患者を追加",
  "ui.provider.patients.title": "患者",
  "ui.provider.patients.actions_aria": "{name} のアクション",
  "ui.provider.patients.action_edit": "編集",
  "ui.provider.patients.action_remove": "削除",
  "ui.provider.patients.action_discharge": "退院",
  "ui.provider.switch.voice_captured": "音声取得済み",
  "ui.provider.switch.no_voice": "音声なし",
  "ui.provider.switch.last_active_just_now": "今さっき",
  "ui.provider.switch.last_active_minutes":
    "{n}分前にアクティブ",
  "ui.provider.switch.last_active_hours": "{n}時間前にアクティブ",
  "ui.provider.switch.last_active_days": "{n}日前にアクティブ",
  "ui.provider.switch.currently_active": "現在アクティブ",
  "ui.provider.switch.switched_announcement":
    "{name}に切り替えました。会話メッセージ{count}件。",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "スタッフセッションが終了します",
  "ui.provider.staff_session.warning_body":
    "スタッフアクセスが{n}秒後にロックされます。",
  "ui.provider.staff_session.extend": "セッションを延長",
  "ui.provider.staff_session.end_now": "今すぐ終了",
  "ui.provider.nav.end_staff_session": "スタッフセッションを終了",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",

  // ── Model readiness (TODO: translate) ──
  "ui.readiness.voice_capture.precapture_hint": "Voice will start as soon as it's ready",
  "ui.readiness.voice_capture.saving": "Preparing your voice…",
  "ui.readiness.voice_capture.saving_with_countdown": "Preparing your voice — {countdown} remaining",
  "ui.readiness.voice_capture.saving_almost": "Almost ready…",
  "ui.readiness.voice_capture.ready": "Voice ready",
  "ui.readiness.voice_capture.failed_message": "Couldn't prepare your voice",
  "ui.readiness.voice_capture.failed_action": "Try again",
  "ui.patient.header.voice_status.not_ready": "Using a temporary voice",
  "ui.patient.header.voice_status.almost": "Almost ready — using a temporary voice",
  "ui.patient.header.voice_status.failed_message": "Couldn't prepare your voice",
  "ui.patient.header.voice_status.failed_action": "Try again",

  // ── Voice quality score (enrollment feedback) ──
  "ui.voice_quality.title": "声の品質",
  "ui.voice_quality.label.good": "良好",
  "ui.voice_quality.label.ok": "問題なし",
  "ui.voice_quality.label.poor": "改善の余地あり",
  "ui.voice_quality.tip.snr": "もっと静かな場所で録音してみてください。",
  "ui.voice_quality.tip.clipping": "マイクから少し離れてください。",
  "ui.voice_quality.tip.coverage": "もう少し長く読んでみてください。",
  "ui.voice_quality.tip.voiced_fraction": "録音中はずっと話し続けるようにしてください。",
  "ui.voice_quality.tip.pitch_variation": "もっと自然に読んでください — 声の高低を意識して。",
  "ui.voice_quality.tip.loudness": "声の大きさを一定に保ってください。",
  "ui.voice_quality.tip.tilt_boomy": "マイクから少し離れてみてください。",
  "ui.voice_quality.tip.tilt_tinny": "このマイクは音が細く聞こえます — 他にあれば試してみてください。",
  "ui.provider.settings.voice_clone_status.extraction_failed": "音声クローンを利用できません — バックアップ音声を使用中{fallback}",
  "ui.provider.settings.voice_clone_status.retry_extraction_aria": "音声クローンの抽出を再試行",
  "ui.provider.settings.voice_clone_status.quality_suffix": "品質: {label}",
};

export default ja;
