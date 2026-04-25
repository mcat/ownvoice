/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (PR #98) but NOT yet vetted.
 * Do NOT treat as production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Mandarin Chinese (Simplified)
 * Locale: zh
 * Generated: 2026-04-23
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const zh: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "是",
  "quick.no": "不",
  "quick.thank_you": "谢谢",
  "quick.please_wait": "请等一下",
  "quick.dont_understand": "我不明白",
  "quick.repeat": "请再说一遍",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "我需要水",
  "needs.comfort.hungry": "我饿了",
  "needs.comfort.cold": "我冷",
  "needs.comfort.hot": "我热",
  "needs.comfort.bed": "调整我的床",
  "needs.comfort.bathroom": "我需要上厕所",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "我需要吃药",
  "needs.medical.suction": "我需要吸痰",
  "needs.medical.nauseous": "我觉得恶心",
  "needs.medical.breathe": "我呼吸困难",
  "needs.medical.nurse": "我需要护士",
  "needs.medical.doctor": "我需要医生",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "我想见家人",
  "needs.people.stay": "能有人陪着我吗？",
  "needs.people.call": "我想打电话",
  "needs.people.interpreter": "我需要翻译",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "我累了",
  "feelings.physical.uncomfortable": "我不舒服",
  "feelings.physical.weak": "我觉得虚弱",
  "feelings.physical.better": "我感觉好些了",
  "feelings.physical.dizzy": "我头晕",
  "feelings.physical.itchy": "我觉得痒",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "我害怕",
  "feelings.emotional.lonely": "我觉得孤单",
  "feelings.emotional.frustrated": "我很沮丧",
  "feelings.emotional.confused": "我很困惑",
  "feelings.emotional.safe": "我觉得安全",
  "feelings.emotional.grateful": "我很感激",
  "feelings.emotional.worried": "我很担心",
  "feelings.emotional.hopeful": "我有希望",
  "feelings.emotional.bored": "我很无聊",
  "feelings.emotional.embarrassed": "我很尴尬",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "现在几点了？",
  "questions.day": "今天是几号？",
  "questions.whats_happening": "我怎么了？",
  "questions.go_home": "我什么时候能回家？",
  "questions.next_medication": "下次什么时候吃药？",
  "questions.explain_treatment": "能解释一下我的治疗方案吗？",
  "questions.nurse_today": "今天谁是我的护士？",
  "questions.eat_drink": "我可以吃东西或喝水吗？",
  "questions.see_family": "我什么时候能见家人？",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "不痛",
  "pain.face.2": "有点痛",
  "pain.face.4": "更痛一些",
  "pain.face.6": "痛得更厉害",
  "pain.face.8": "很痛",
  "pain.face.10": "最痛",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "酸痛",
  "pain.descriptor.burning": "灼痛",
  "pain.descriptor.sharp": "锐痛",
  "pain.descriptor.throbbing": "搏动性疼痛",
  "pain.descriptor.cramping": "痉挛性疼痛",
  "pain.descriptor.constant": "持续性疼痛",
  "pain.descriptor.comes_and_goes": "时有时无",
  "pain.descriptor.numb": "麻木",
  "pain.descriptor.pressure": "压迫感",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "头部",
  "pain.region.face": "面部",
  "pain.region.neck": "颈部",
  "pain.region.chest": "胸部",
  "pain.region.left_shoulder": "左肩",
  "pain.region.right_shoulder": "右肩",
  "pain.region.left_arm": "左臂",
  "pain.region.right_arm": "右臂",
  "pain.region.stomach": "腹部",
  "pain.region.upper_back": "上背部",
  "pain.region.lower_back": "下背部",
  "pain.region.left_leg": "左腿",
  "pain.region.right_leg": "右腿",

  // ── Pain: Composed sentence template ───────────────────────────
  "pain.sentence": "我的{region}有{descriptor}的疼痛，等级{severity}/10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "程度",
  "pain.step.location": "位置",
  "pain.step.descriptor": "描述",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "我的目标",
  "wishes.worries.label": "我的担忧",
  "wishes.strength.label": "我的力量",
  "wishes.joy.label": "我的快乐",
  "wishes.tradeoffs.label": "关于治疗",
  "wishes.family.label": "我的家人",
  "wishes.hopes.label": "我的希望",

  // Questions
  "wishes.goals.question": "您最重要的目标是什么？",
  "wishes.worries.question": "您最大的担忧是什么？",
  "wishes.strength.question": "什么给您力量？",
  "wishes.joy.question": "什么给您的生活带来快乐和意义？",
  "wishes.tradeoffs.question": "为了更多时间，您愿意承受多少？",
  "wishes.family.question": "您身边的人对您的心愿了解多少？",
  "wishes.hopes.question": "您的希望是什么？",

  // Stems (for composeSentence)
  // TODO(translator): Verify sentence composition works with Chinese grammar
  "wishes.goals.stem": "对我来说最重要的",
  "wishes.worries.stem": "我担心的",
  "wishes.strength.stem": "给我力量的",
  "wishes.joy.stem": "给我快乐的",
  "wishes.tradeoffs.stem": "关于我的治疗",
  "wishes.family.stem": "关于我的家人",
  "wishes.hopes.stem": "我希望",

  // Responses — goals
  "wishes.goals.r.family": "和家人在一起",
  "wishes.goals.r.comfort": "舒适、没有疼痛",
  "wishes.goals.r.longevity": "尽可能活得长",
  "wishes.goals.r.home": "回家",
  "wishes.goals.r.independence": "能够自己做事",
  "wishes.goals.r.peace": "内心平静",

  // Responses — worries
  "wishes.worries.r.suffering": "受苦或疼痛",
  "wishes.worries.r.alone": "独自一人",
  "wishes.worries.r.burden": "成为家人的负担",
  "wishes.worries.r.activities": "不能做我喜欢的事",
  "wishes.worries.r.leaving": "离开家人",
  "wishes.worries.r.unknown": "不知道会发生什么",

  // Responses — strength
  "wishes.strength.r.family": "我的家人",
  "wishes.strength.r.faith": "我的信仰",
  "wishes.strength.r.friends": "我的朋友",
  "wishes.strength.r.wishes_heard": "知道我的心愿被听到",
  "wishes.strength.r.hope": "会好起来的希望",
  "wishes.strength.r.carers": "照顾我的人",

  // Responses — joy
  "wishes.joy.r.family": "和家人在一起",
  "wishes.joy.r.outdoors": "在户外",
  "wishes.joy.r.hobbies": "我的爱好和兴趣",
  "wishes.joy.r.helping": "帮助别人",
  "wishes.joy.r.spiritual": "我的精神修行",
  "wishes.joy.r.routines": "简单的日常生活",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "我想接受所有可能的治疗",
  "wishes.tradeoffs.r.good_chance": "如果有较大的成功机会我愿意治疗",
  "wishes.tradeoffs.r.try_stop": "我愿意尝试，但如果没有帮助就停止",
  "wishes.tradeoffs.r.comfortable": "我想专注于舒适",
  "wishes.tradeoffs.r.think": "我需要更多时间考虑",
  "wishes.tradeoffs.r.family_first": "我需要先和家人商量",

  // Responses — family
  "wishes.family.r.know_well": "他们很了解我的心愿",
  "wishes.family.r.know_some": "他们了解一些我的心愿",
  "wishes.family.r.not_talked": "我们还没有谈过这个",
  "wishes.family.r.need_help": "我需要帮助告诉他们",
  "wishes.family.r.team_explain": "我想让医疗团队帮忙解释",

  // Responses — hopes
  "wishes.hopes.r.get_better": "好起来",
  "wishes.hopes.r.go_home": "回家",
  "wishes.hopes.r.comfortable": "舒适",
  "wishes.hopes.r.family_ok": "家人平安",
  "wishes.hopes.r.more_time": "有更多时间",
  "wishes.hopes.r.peace": "内心平静",

  // Wish sentence composition templates
  // TODO(translator): Chinese colon form "{stem}是{list}" — verify this reads naturally for all topic/response combos
  "wishes.compose": "{stem}是{list}。",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "我会找人来帮忙。",
  "provider.responses.interpreter": "我会找翻译。",
  "provider.responses.family": "我会联系您的家人。",
  "provider.responses.get_that": "我会帮您拿来。",
  "provider.responses.doctor_know": "我会告诉医生。",
  "provider.responses.medication": "我会去拿您的药。",
  "provider.responses.family_coming": "您的家人正在来的路上。",
  "provider.responses.doctor_soon": "医生很快就来。",
  "provider.responses.doing_well": "您恢复得很好。",
  "provider.responses.rest": "现在请休息吧。",

  "provider.questions.feeling": "您感觉怎么样？",
  "provider.questions.need": "您有什么需要吗？",
  "provider.questions.where_hurts": "能告诉我哪里痛吗？",
  "provider.questions.rate_pain": "请给疼痛评分，0到10。",
  "provider.questions.sleep": "您睡得好吗？",
  "provider.questions.comfortable": "您舒服吗？",

  "provider.directions.procedure": "您今天有手术安排。",
  "provider.directions.stay_in_bed": "您需要卧床休息。",
  "provider.directions.vitals": "我来检查您的生命体征。",
  "provider.directions.medication_time": "该吃药了。",
  "provider.directions.breathe": "请尝试深呼吸。",
  "provider.directions.call_button": "如果需要什么请按呼叫按钮。",

  "provider.goals_of_care.matters_most":
    "我想和您谈谈对您来说最重要的事情。",
  "provider.goals_of_care.goals": "您现在最重要的目标是什么？",
  "provider.goals_of_care.worries": "您最大的担忧是什么？",
  "provider.goals_of_care.strength": "什么给您力量？",
  "provider.goals_of_care.joy": "什么给您的生活带来快乐和意义？",
  "provider.goals_of_care.wishes": "您的亲人对您的心愿了解多少？",
  "provider.goals_of_care.hopes": "您的希望是什么？",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "我睡得很好",
  "time.morning.didnt_sleep": "我没睡好",
  "time.morning.breakfast": "我需要早餐",
  "time.morning.doctor_coming": "医生什么时候来？",

  "time.afternoon.tired": "我累了",
  "time.afternoon.lunch": "可以吃午饭吗？",
  "time.afternoon.see_family": "我什么时候能见家人？",
  "time.afternoon.rest": "我需要休息",

  "time.evening.cant_sleep": "我睡不着",
  "time.evening.medication": "我需要吃药",
  "time.evening.call_family": "我能给家人打电话吗？",
  "time.evening.pain": "我疼",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate sequentially.
  // Chinese word order may not compose correctly for all paths — review each chain.
  "suggest.start.i_am": "我",
  "suggest.start.i_feel": "我觉得",
  "suggest.start.i_want": "我想要",
  "suggest.start.i_need": "我需要",
  "suggest.start.please": "请",
  "suggest.start.when": "什么时候",
  "suggest.start.can_you": "你能",
  "suggest.start.tell_me": "告诉我",

  "suggest.i_am.in_pain": "疼",
  "suggest.i_am.cold": "冷",
  "suggest.i_am.hot": "热",
  "suggest.i_am.hungry": "饿",
  "suggest.i_am.thirsty": "渴",
  "suggest.i_am.tired": "累了",
  "suggest.i_am.uncomfortable": "不舒服",
  "suggest.i_am.okay": "还好",
  "suggest.i_am.not_okay": "不好",
  "suggest.i_am.ready": "准备好了",

  "suggest.i_feel.scared": "害怕",
  "suggest.i_feel.sick": "不舒服",
  "suggest.i_feel.dizzy": "头晕",
  "suggest.i_feel.weak": "虚弱",
  "suggest.i_feel.better": "好些了",
  "suggest.i_feel.worse": "更差了",
  "suggest.i_feel.nauseous": "恶心",
  "suggest.i_feel.lonely": "孤单",
  "suggest.i_feel.confused": "困惑",
  "suggest.i_feel.safe": "安全",

  "suggest.i_feel_scared.procedure": "因为手术",
  "suggest.i_feel_scared.happening": "因为现在的情况",
  "suggest.i_feel_scared.alone": "怕一个人",
  "suggest.i_feel_scared.need_someone": "需要有人陪",

  "suggest.i_feel_sick.stomach": "胃不舒服",
  "suggest.i_feel_sick.dizzy": "还头晕",
  "suggest.i_feel_sick.help": "需要帮助",

  "suggest.i_want.water": "水",
  "suggest.i_want.family": "见家人",
  "suggest.i_want.go_home": "回家",
  "suggest.i_want.sleep": "睡觉",
  "suggest.i_want.medication": "我的药",
  "suggest.i_want.blanket": "毯子",
  "suggest.i_want.talk": "和人说说话",
  "suggest.i_want.nurse": "找护士",

  "suggest.i_want_to_go.home": "回家",
  "suggest.i_want_to_go.sleep": "睡觉",
  "suggest.i_want_to_go.bathroom": "上厕所",

  "suggest.i_want_my.family": "家人",
  "suggest.i_want_my.medication": "药",
  "suggest.i_want_my.phone": "手机",
  "suggest.i_want_my.glasses": "眼镜",
  "suggest.i_want_my.blanket": "毯子",

  "suggest.i_need.help": "帮助",
  "suggest.i_need.water": "水",
  "suggest.i_need.bathroom": "上厕所",
  "suggest.i_need.medication": "我的药",
  "suggest.i_need.nurse": "护士",
  "suggest.i_need.doctor": "医生",
  "suggest.i_need.rest": "休息",
  "suggest.i_need.blanket": "毯子",
  "suggest.i_need.suction": "吸痰",

  "suggest.i_need_the.nurse": "护士",
  "suggest.i_need_the.doctor": "医生",
  "suggest.i_need_the.bathroom": "厕所",
  "suggest.i_need_the.light_off": "关灯",
  "suggest.i_need_the.light_on": "开灯",

  "suggest.i_need_my.medication": "药",
  "suggest.i_need_my.family": "家人",
  "suggest.i_need_my.glasses": "眼镜",
  "suggest.i_need_my.phone": "手机",

  "suggest.please.help_me": "帮帮我",
  "suggest.please.call_family": "联系我的家人",
  "suggest.please.light_off": "关灯",
  "suggest.please.adjust_bed": "调整我的床",
  "suggest.please.give_me": "给我",
  "suggest.please.explain": "解释一下",
  "suggest.please.come_back": "快点回来",
  "suggest.please.stay": "陪着我",
  "suggest.please.dont_leave": "不要走",

  "suggest.please_help_me.pain": "我很痛",
  "suggest.please_help_me.breathe": "我喘不上气",
  "suggest.please_help_me.sick": "我不舒服",
  "suggest.please_help_me.scared": "我害怕",

  "suggest.please_give_me.water": "水",
  "suggest.please_give_me.medication": "我的药",
  "suggest.please_give_me.blanket": "毯子",
  "suggest.please_give_me.pain_relief": "止痛药",

  "suggest.when.go_home": "可以回家？",
  "suggest.when.family": "家人来？",
  "suggest.when.medication": "下次吃药？",
  "suggest.when.doctor": "医生来？",
  "suggest.when.eat": "可以吃东西？",
  "suggest.when.over": "能结束？",

  "suggest.can_you.help": "帮帮我？",
  "suggest.can_you.call_family": "联系我家人？",
  "suggest.can_you.get_nurse": "叫护士来？",
  "suggest.can_you.explain": "解释一下情况？",
  "suggest.can_you.light_off": "关灯？",
  "suggest.can_you.adjust_bed": "调一下我的床？",
  "suggest.can_you.stay": "陪着我？",

  "suggest.tell_me.happening": "发生了什么",
  "suggest.tell_me.time": "现在几点",
  "suggest.tell_me.go_home": "什么时候能回家",
  "suggest.tell_me.day": "今天几号",
  "suggest.tell_me.treatment": "关于我的治疗",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "请帮帮我",
  "suggest.i_am_in_pain.worse": "而且越来越痛",
  "suggest.i_am_in_pain.medication": "需要止痛药",
  "suggest.i_am_in_pain.back": "在背部",
  "suggest.i_am_in_pain.chest": "在胸口",
  "suggest.i_am_in_pain.stomach": "在肚子",

  "suggest.i_need_help.up": "起来",
  "suggest.i_need_help.breathing": "呼吸",
  "suggest.i_need_help.pain": "缓解疼痛",
  "suggest.i_need_help.now": "马上",
  "suggest.i_need_help.please": "拜托",

  "suggest.i_feel_better.than_before": "比之前好",
  "suggest.i_feel_better.now": "现在",
  "suggest.i_feel_better.thanks": "谢谢",

  "suggest.i_feel_worse.than_before": "比之前差",
  "suggest.i_feel_worse.need_doctor": "我需要医生",
  "suggest.i_feel_worse.help": "请帮帮我",
  "suggest.i_feel_worse.medication": "我需要吃药",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "我觉得",
  "suggest.ctx.feeling.i_am": "我",
  "suggest.ctx.feeling.better": "比之前好",
  "suggest.ctx.feeling.not_great": "不太好",
  "suggest.ctx.feeling.pain": "我疼",
  "suggest.ctx.feeling.okay": "还行",
  "suggest.ctx.feeling.help": "能帮帮我吗？",

  "suggest.ctx.need.i_need": "我需要",
  "suggest.ctx.need.i_want": "我想要",
  "suggest.ctx.need.fine": "我现在还好",
  "suggest.ctx.need.yes": "好的，谢谢",
  "suggest.ctx.need.no": "不用，谢谢",
  "suggest.ctx.need.stay": "能陪着我吗？",

  "suggest.ctx.where_hurts.head": "头",
  "suggest.ctx.where_hurts.chest": "胸口",
  "suggest.ctx.where_hurts.stomach": "肚子",
  "suggest.ctx.where_hurts.back": "背",
  "suggest.ctx.where_hurts.left_arm": "左胳膊",
  "suggest.ctx.where_hurts.right_leg": "右腿",
  "suggest.ctx.where_hurts.everywhere": "全身都痛",

  "suggest.ctx.pain.very_bad": "非常痛",
  "suggest.ctx.pain.worse": "越来越痛",
  "suggest.ctx.pain.same": "差不多",
  "suggest.ctx.pain.little_better": "好一点了",
  "suggest.ctx.pain.need_relief": "我需要止痛药",

  "suggest.ctx.comfort.comfortable": "我很舒服",
  "suggest.ctx.comfort.not_comfortable": "我不舒服",
  "suggest.ctx.comfort.cant_sleep": "我睡不着",
  "suggest.ctx.comfort.cold": "我冷",
  "suggest.ctx.comfort.hot": "我热",
  "suggest.ctx.comfort.adjust_bed": "能调一下床吗？",

  "suggest.ctx.night.cant_sleep": "我睡不着",
  "suggest.ctx.night.i_need": "我需要",
  "suggest.ctx.night.pain": "我疼",
  "suggest.ctx.night.i_feel": "我觉得",
  "suggest.ctx.night.can_you": "你能",
  "suggest.ctx.night.please": "请",
  "suggest.ctx.night.i_am": "我",
  "suggest.ctx.night.when": "什么时候",

  "suggest.ctx.morning.i_am": "我",
  "suggest.ctx.morning.i_need": "我需要",
  "suggest.ctx.morning.i_feel": "我觉得",
  "suggest.ctx.morning.doctor": "医生什么时候来？",
  "suggest.ctx.morning.i_want": "我想要",
  "suggest.ctx.morning.can_you": "你能",
  "suggest.ctx.morning.please": "请",
  "suggest.ctx.morning.tell_me": "告诉我",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "快捷",
  "cat.needs": "我需要",
  "cat.feelings": "我的感受",
  "cat.pain": "疼痛",
  "cat.questions": "提问",
  "sub.comfort": "舒适",
  "sub.medical": "医疗",
  "sub.people": "人员",
  "sub.physical": "身体",
  "sub.emotional": "情感",

  // Provider category labels
  "provider.cat.responses": "回应",
  "provider.cat.questions": "提问",
  "provider.cat.directions": "指示",
  "provider.cat.goals_of_care": "护理目标",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — {name}的对话",
  "ui.patient.app.name_fallback": "患者",
  "ui.patient.header.name_fallback": "患者",
  "ui.patient.header.bed_prefix": "床位 ",
  "ui.dual.nav.wishes": "心愿",
  "ui.dual.nav.listen": "聆听",
  "ui.provider.nav.staff": "工作人员",
  "ui.provider.nav.switch_patient": "切换患者",
  "ui.provider.nav.settings": "设置",
  "ui.provider.nav.theme.auto": "自动",
  "ui.provider.nav.theme.light": "浅色",
  "ui.provider.nav.theme.dark": "深色",
  "ui.patient.tabbar.say_more": "说更多",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "您有多痛？",
  "ui.dual.pain.heading.location": "哪里痛？",
  "ui.dual.pain.heading.descriptor": "疼痛是什么感觉？",
  "ui.patient.pain.step_of": "第{n}步，共{total}步",
  "ui.patient.pain.back_to": "返回{label}",
  "ui.patient.pain.level_aria": "疼痛等级{n}，{label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "{name}的心愿",
  "ui.patient.wishes.my_wishes": "我的心愿",
  "ui.patient.wishes.step_of": "第{n}步，共{total}步",
  "ui.patient.wishes.none_shared": "没有分享心愿。",
  "ui.patient.wishes.share_all_again": "再次分享所有心愿",
  "ui.patient.wishes.close": "关闭",
  "ui.patient.wishes.share": "分享",
  "ui.patient.wishes.skip": "跳过",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "点击下方词语或输入...",
  "ui.patient.builder.message_aria": "您的消息",
  "ui.patient.builder.undo": "撤销上一个词",
  "ui.patient.builder.clear": "清除消息",
  "ui.patient.builder.refresh_ai": "刷新AI建议",
  "ui.patient.builder.ai_thinking": "AI正在思考...",
  "ui.patient.builder.no_ai_suggestions":
    "没有AI建议。点击刷新重试。",
  "ui.patient.builder.ready": "消息已准备好。点击说话发送。",
  "ui.patient.builder.speak": "说话",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "重复：{text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "医疗团队",
  "ui.provider.fallback_name": "医护人员",
  "ui.provider.speaking_to": "以{prov}身份对{name}说话",
  "ui.provider.patient_fallback": "患者",
  "ui.provider.close_panel": "关闭面板",
  "ui.provider.select_provider": "选择{name}",
  "ui.provider.show_category": "显示{key}",
  "ui.provider.speak_phrase": "说：{phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "聆听",
  "ui.provider.listen.stop_aria": "停止聆听",
  "ui.provider.listen.start_aria": "点击开始聆听",
  "ui.provider.listen.listening": "聆听中...",
  "ui.provider.listen.transcribing": "转录中...",
  "ui.provider.listen.listening_placeholder": "正在收听语音...",
  "ui.provider.listen.transcribing_placeholder": "正在转录语音...",
  "ui.provider.listen.type_placeholder": "或输入对方说的话...",
  "ui.provider.listen.transcript_aria": "转录文本",
  "ui.provider.listen.add_as": "以{prov}身份添加到对话",
  "ui.provider.listen.privacy_notice":
    "设备端处理 · Whisper · 音频不会离开本设备",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "正在说：{text}",
  "ui.dual.speaking.patient_voice": "您的声音",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "输入PIN码",
  "ui.provider.pin_gate.subtitle": "仅限工作人员",
  "ui.provider.pin_gate.incorrect": "PIN码错误",
  "ui.provider.pin_gate.delete_aria": "删除",
  "ui.provider.pin_gate.digit_aria": "数字{n}",
  "ui.provider.pin_gate.cancel": "取消",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro": "您将朗读一个句子。",
  "ui.provider.voice_capture.coaching_breath": "请做几次深呼吸。",
  "ui.provider.voice_capture.coaching_ready": "准备好了。",
  "ui.provider.voice_capture.breathe_in": "吸气…",
  "ui.provider.voice_capture.breathe_out": "呼气…",
  "ui.provider.voice_capture.creating": "正在创建语音克隆...",
  "ui.provider.voice_capture.creating_from_sample":
    "正在从样本创建语音克隆...",
  "ui.provider.voice_capture.loading_model": "语音模型加载中...",
  "ui.provider.voice_capture.clone_failed": "克隆失败",
  "ui.provider.voice_capture.captured": "声音已采集",
  "ui.provider.voice_capture.stop": "停止",
  "ui.provider.voice_capture.play": "播放",
  "ui.provider.voice_capture.discard": "丢弃录音",
  "ui.provider.voice_capture.use_recording": "使用此录音",
  "ui.provider.voice_capture.upload_file": "上传文件",
  "ui.provider.voice_capture.record": "录音",
  "ui.provider.voice_capture.stop_early": "提前停止",
  "ui.provider.voice_capture.remove": "移除",
  "ui.provider.voice_capture.retry": "重试",
  "ui.provider.voice_capture.done": "完成！",
  "ui.provider.voice_capture.cancel": "取消",
  "ui.provider.voice_capture.seconds_recorded": "已录{n}秒",
  "ui.provider.voice_capture.cancel_countdown_aria": "取消录音倒计时",
  "ui.provider.voice_capture.stop_early_aria": "提前停止录音",
  "ui.provider.voice_capture.audio_level_aria": "音量级别",
  "ui.provider.voice_capture.recording_progress_aria": "录音进度",
  "ui.provider.voice_capture.stop_preview_aria": "停止预览播放",
  "ui.provider.voice_capture.play_preview_aria": "播放录音预览",
  "ui.provider.voice_capture.discard_aria": "丢弃此录音并重新开始",
  "ui.provider.voice_capture.stop_playback_aria":
    "停止播放已录制的样本",
  "ui.provider.voice_capture.play_sample_aria": "播放已录制的语音样本",
  "ui.provider.voice_capture.remove_aria": "移除语音样本",
  "ui.provider.voice_capture.retry_aria": "重试语音克隆提取",
  "ui.provider.voice_capture.upload_aria": "从文件上传语音样本",
  "ui.provider.voice_capture.record_aria": "用麦克风录制语音样本",
  "ui.provider.voice_capture.err_network":
    "无法连接语音模型。请检查网络连接，然后点击重试。",
  "ui.provider.voice_capture.err_timeout":
    "语音处理时间过长。点击重试再试一次。",
  "ui.provider.voice_capture.err_mic_denied":
    "麦克风权限被拒绝。请在浏览器设置中启用，或上传文件。",
  "ui.provider.voice_capture.err_generic":
    "无法完成语音准备。点击重试再试一次。",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "麦克风权限被拒绝。请尝试上传文件。",
  "ui.provider.voice_capture.err_playback": "无法播放音频。",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "增强版",
  "ui.provider.fallback_voice.enhanced_aria": "增强神经网络语音",
  "ui.provider.fallback_voice.on_device_badge": "设备端",
  "ui.provider.fallback_voice.playing": "播放中...",
  "ui.provider.fallback_voice.unavailable":
    "此设备不支持系统语音。",
  "ui.provider.fallback_voice.loading": "正在加载可用语音...",
  "ui.provider.fallback_voice.hide_others": "隐藏其他语音",
  "ui.provider.fallback_voice.more_voices": "更多语音（{n}）",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "患者",
  "ui.provider.setup.steps.voice": "声音",
  "ui.provider.setup.steps.care_team": "团队",
  "ui.provider.setup.steps.confirm": "确认",

  "ui.provider.setup.skip": "跳过 →",
  "ui.provider.setup.skip_aria": "跳过设置",
  "ui.provider.setup.skip_dialog.title": "跳过设置？",
  "ui.provider.setup.skip_dialog.body": "您可以稍后在设置中完成。",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "不会添加任何患者。",
  "ui.provider.setup.skip_dialog.confirm": "跳过设置",
  "ui.provider.setup.skip_dialog.cancel": "继续",

  "ui.provider.setup.back": "返回",
  "ui.provider.setup.continue": "继续",
  "ui.provider.setup.start": "启动OwnVoice",

  "ui.provider.setup.step0.heading": "欢迎使用OwnVoice",
  "ui.provider.setup.step0.subhead":
    "让我们设置您的沟通面板。所有信息都保存在此设备上。",
  "ui.provider.setup.step0.name_label": "患者姓名",
  "ui.provider.setup.step0.name_placeholder": "名字或常用名",
  "ui.provider.setup.step0.bed_label": "床位 / 房间",
  "ui.provider.setup.step0.bed_placeholder": "如 4B-12",
  "ui.provider.setup.step0.language_label": "语言",

  "ui.provider.setup.step1.heading": "语音样本",
  "ui.provider.setup.step1.body1":
    "采集一段语音样本，让OwnVoice用患者自己的声音说话。此步骤可选。",
  "ui.provider.setup.step1.body2":
    "语音克隆完全在设备上进行。音频不会离开此平板电脑。",
  "ui.provider.setup.step1.patient_label": "患者",
  "ui.provider.setup.step1.backup_voice_heading": "备用声音",
  "ui.provider.setup.step1.backup_voice_body1":
    "选择一个系统声音，在语音克隆加载时或没有录音时使用。点击可试听。",
  "ui.provider.setup.step1.backup_voice_body2":
    "此功能使用设备内置的文字转语音。",

  "ui.provider.setup.step2.heading": "医疗团队",
  "ui.provider.setup.step2.body":
    "添加将要照顾此患者的医护人员。",
  "ui.provider.setup.step2.icon_label": "图标",
  "ui.provider.setup.step2.name_label": "姓名",
  "ui.provider.setup.step2.name_placeholder": "张医生、李护士...",
  "ui.provider.setup.step2.add": "添加",

  "ui.provider.setup.step3.heading": "准备就绪",
  "ui.provider.setup.step3.body":
    "检查您的设置。稍后可在设置中更改。",
  "ui.provider.setup.step3.summary.patient": "患者",
  "ui.provider.setup.step3.summary.bed": "床位 / 房间",
  "ui.provider.setup.step3.summary.language": "语言",
  "ui.provider.setup.step3.summary.language_default": "英语",
  "ui.provider.setup.step3.summary.voice": "声音",
  "ui.provider.setup.step3.summary.care_team": "医疗团队",
  "ui.provider.setup.step3.summary.not_set": "未设置",
  "ui.provider.setup.step3.summary.captured": "已采集",
  "ui.provider.setup.step3.summary.not_captured": "未采集",
  "ui.provider.setup.step3.summary.none_added": "未添加",
  "ui.provider.setup.step3.pin_label": "工作人员PIN码（可选）",
  "ui.provider.setup.step3.pin_body":
    "设置一个4位PIN码来保护医护人员设置。",
  "ui.provider.setup.step3.pin_placeholder": "如 1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "设置",
  "ui.provider.settings.done": "完成",
  "ui.provider.settings.close_aria": "关闭设置",

  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "丢弃{label}的语音准备？",
  "ui.provider.settings.voice_cache.discard_body":
    "进度（{current} / {total}条短语）将丢失。已录制的语音样本会保留——您可以稍后重新准备。",
  "ui.provider.settings.voice_cache.cancel": "取消",
  "ui.provider.settings.voice_cache.cancel_aria":
    "取消并保留语音准备",
  "ui.provider.settings.voice_cache.discard_confirm": "丢弃",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "确认丢弃语音准备",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "丢弃{label}的语音准备",
  // TODO(translator): {plural} is an English suffix marker — renders empty in Chinese
  "ui.provider.settings.voice_cache.queued":
    "排队中——{label}的声音即将准备（{total}条短语{plural}）",
  "ui.provider.settings.voice_cache.preparing":
    "正在准备{label}的声音… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "已暂停——{label}的声音… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "继续",
  "ui.provider.settings.voice_cache.resume_aria":
    "继续准备{label}的声音",
  "ui.provider.settings.voice_cache.pause": "暂停",
  "ui.provider.settings.voice_cache.pause_aria":
    "暂停准备{label}的声音",
  "ui.provider.settings.voice_cache.done":
    "语音克隆已激活——{label}的声音已准备好全部{total}条短语",
  // TODO(translator): {plural} is an English suffix marker — renders empty in Chinese
  "ui.provider.settings.voice_cache.failed":
    "{label}有{count}条短语{plural}失败",
  "ui.provider.settings.voice_cache.retry": "重试",
  "ui.provider.settings.voice_cache.retry_aria":
    "重试失败的语音缓存短语",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "关于",
  "ui.provider.settings.about.subtitle":
    "住院患者AAC沟通辅助工具。",
  "ui.provider.settings.about.attribution_1":
    "疼痛量表：Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "护理目标：SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW缓存：",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "重置",
  "ui.provider.settings.reset.action_label": "为新患者重置应用",
  "ui.provider.settings.reset.confirm_title": "您确定吗？",
  "ui.provider.settings.reset.confirm_body":
    "这将清除所有患者数据、语音样本、对话记录和医护人员设置。此操作无法撤销。",
  "ui.provider.settings.reset.confirm_destructive": "重置全部",

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "无障碍",
  "ui.provider.settings.accessibility.toggle_label": "辅助输入模式",
  "ui.provider.settings.accessibility.toggle_description":
    "增强焦点圈、延长点击间隔、加强悬停反馈，适用于使用轨迹球、操纵杆、辅助触控光标或开关的患者。",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "检测到外部指针设备。",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "建议为此患者启用辅助输入模式。",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "患者",
  "ui.provider.settings.patients.active_remove_hint":
    "请先切换到其他患者再移除此患者。",
  "ui.provider.settings.patients.remove_button": "移除",
  "ui.provider.settings.patients.add_patient": "+ 添加患者",
  "ui.provider.settings.patients.remove_dialog.title":
    "移除{name}？",
  "ui.provider.settings.patients.remove_dialog.body":
    "这将删除其语音样本、对话记录和语音克隆的缓存音频。医疗团队的语音克隆会为其他患者保留。此操作无法撤销。",
  "ui.provider.settings.patients.remove_dialog.confirm": "移除",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "医疗团队",
  "ui.provider.settings.care_team.empty": "尚未添加医护人员。",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading": "患者信息",
  "ui.provider.settings.patient_info.name_label": "姓名",
  "ui.provider.settings.patient_info.bed_label": "床位 / 房间",
  "ui.provider.settings.patient_info.language_label": "语言",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "患者语言",
  "ui.provider.settings.lang.caregiver_section": "医疗团队语言",
  "ui.provider.settings.lang.caregiver_helper":
    "医疗团队使用的语言。通常每台设备只需设置一次。",
  "ui.provider.settings.lang.change": "更改语言",

  "ui.provider.settings.lang.patient_dialog.title":
    "将患者语言更改为{lang}？",
  "ui.provider.settings.lang.patient_dialog.body":
    "您的语音克隆仍然可用——点击的短语听起来不变。我们将为{providerCount}个医疗团队语音准备音频（约{estimatedMinutes}分钟）。准备期间您可以继续使用应用。",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "医疗团队语音克隆在{lang}中不可用——将使用系统声音。现有录音会保留，以便日后切换到支持的语言。",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "点击的短语听起来不变。没有配置医疗团队语音，无需重新生成。",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "将医疗团队语言更改为{lang}？",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "医疗团队语音克隆仍然可用。我们将以新语言准备患者语音音频（约{estimatedMinutes}分钟）。准备期间您可以继续使用应用。",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "患者语音克隆在{lang}中不可用——将使用系统声音。已录制的患者语音样本会保留，以便日后切换到支持的语言。",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "没有配置患者语音克隆，无需重新生成。",
  "ui.provider.settings.patient_info.voice_label": "声音",
  "ui.provider.settings.patient_info.backup_voice_label": "备用声音",
  "ui.provider.settings.patient_info.backup_voice_body":
    "语音克隆加载时使用的系统声音。点击可试听。",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "离线准备",
  "ui.provider.settings.offline.status_description":
    "应用在设备端使用的AI模型状态，用于语音生成、建议和语音识别。",
  "ui.provider.settings.offline.downloading": "正在下载模型…",
  "ui.provider.settings.offline.download_progress_aria":
    "模型下载进度",
  "ui.provider.settings.offline.all_ready": "所有模型就绪",
  "ui.provider.settings.offline.redownload_button": "重新下载模型",
  "ui.provider.settings.offline.already_up_to_date": "已是最新",
  "ui.provider.settings.offline.checking": "检查中…",
  "ui.provider.settings.offline.verified": "✓ 模型已验证",
  "ui.provider.settings.offline.check_button": "检查现有模型",
  "ui.provider.settings.offline.redownloading": "正在重新下载…",
  "ui.provider.settings.offline.force_redownload_button":
    "强制重新下载所有模型",
  "ui.provider.settings.offline.model_status_ready": "就绪",
  "ui.provider.settings.offline.model_status_downloading":
    "下载中…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "需要重试",
  "ui.provider.settings.offline.last_verified_prefix": "上次验证：",
  "ui.provider.settings.offline.storage_prefix": "存储空间：",
  "ui.provider.settings.offline.storage_of": "，共",
  "ui.provider.settings.offline.storage_used": "已用",
  "ui.provider.settings.offline.storage_low": "——空间不足",
  "ui.provider.settings.offline.clear_audio_cache": "清除音频缓存",
  "ui.provider.settings.offline.clearing": "正在清除…",
  "ui.provider.settings.offline.rebuilding":
    "重建中：{current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "重新下载所有AI模型？",
  "ui.provider.settings.offline.redownload_dialog.body":
    "将重新下载约1.7 GB的数据。语音合成在更新期间继续可用。",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "重新下载",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "切换患者",
  "ui.provider.switch.add_patient": "+ 添加患者",
  "ui.provider.switch.voice_captured": "声音已采集",
  "ui.provider.switch.no_voice": "无声音",
  "ui.provider.switch.last_active_just_now": "刚刚",
  "ui.provider.switch.last_active_minutes":
    "{n}分钟前活跃",
  "ui.provider.switch.last_active_hours": "{n}小时前活跃",
  "ui.provider.switch.last_active_days": "{n}天前活跃",
  "ui.provider.switch.currently_active": "当前活跃",
  "ui.provider.switch.switched_announcement":
    "已切换到{name}。{count}条对话消息。",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "工作人员会话即将结束",
  "ui.provider.staff_session.warning_body":
    "您的工作人员权限将在{n}秒后锁定。",
  "ui.provider.staff_session.extend": "延长会话",
  "ui.provider.staff_session.end_now": "立即结束",
  "ui.provider.nav.end_staff_session": "结束工作人员会话",
};

export default zh;
