/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Portuguese (Brazilian-leaning neutral)
 * Locale: pt
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const pt: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Sim",
  "quick.no": "Não",
  // TODO(translator): "Obrigado" is masculine; feminine form is "Obrigada"
  "quick.thank_you": "Obrigado",
  "quick.please_wait": "Por favor, espere",
  "quick.dont_understand": "Não entendo",
  "quick.repeat": "Por favor, repita",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Preciso de água",
  "needs.comfort.hungry": "Estou com fome",
  "needs.comfort.cold": "Estou com frio",
  "needs.comfort.hot": "Estou com calor",
  "needs.comfort.bed": "Ajustem minha cama",
  "needs.comfort.bathroom": "Preciso ir ao banheiro",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Preciso do meu medicamento",
  "needs.medical.suction": "Preciso de aspiração",
  "needs.medical.nauseous": "Estou com náusea",
  "needs.medical.breathe": "Não consigo respirar bem",
  "needs.medical.nurse": "Preciso da enfermeira",
  "needs.medical.doctor": "Preciso do médico",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Quero minha família",
  "needs.people.stay": "Alguém pode ficar comigo?",
  "needs.people.call": "Quero ligar para alguém",
  "needs.people.interpreter": "Preciso de um intérprete",

  // ── Patient feelings: Physical ─────────────────────────────────
  // TODO(translator): Adjectives default to masculine; feminine forms end in -a
  "feelings.physical.tired": "Estou cansado",
  "feelings.physical.uncomfortable": "Estou desconfortável",
  "feelings.physical.weak": "Estou fraco",
  "feelings.physical.better": "Estou melhor",
  "feelings.physical.dizzy": "Estou tonto",
  "feelings.physical.itchy": "Estou com coceira",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Estou com medo",
  "feelings.emotional.lonely": "Estou sozinho",
  "feelings.emotional.frustrated": "Estou frustrado",
  "feelings.emotional.confused": "Estou confuso",
  "feelings.emotional.safe": "Me sinto seguro",
  "feelings.emotional.grateful": "Sou grato",
  "feelings.emotional.worried": "Estou preocupado",
  "feelings.emotional.hopeful": "Tenho esperança",
  "feelings.emotional.bored": "Estou entediado",
  "feelings.emotional.embarrassed": "Estou envergonhado",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Que horas são?",
  "questions.day": "Que dia é hoje?",
  "questions.whats_happening": "O que está acontecendo comigo?",
  "questions.go_home": "Quando posso ir para casa?",
  "questions.next_medication": "Quando é meu próximo medicamento?",
  "questions.explain_treatment": "Pode explicar meu tratamento?",
  "questions.nurse_today": "Quem é minha enfermeira hoje?",
  "questions.eat_drink": "Posso comer ou beber?",
  "questions.see_family": "Quando posso ver minha família?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Sem dor",
  "pain.face.2": "Dói um pouco",
  "pain.face.4": "Dói um pouco mais",
  "pain.face.6": "Dói ainda mais",
  "pain.face.8": "Dói muito",
  "pain.face.10": "Dói demais",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Dolorida",
  "pain.descriptor.burning": "Queimação",
  "pain.descriptor.sharp": "Pontada",
  "pain.descriptor.throbbing": "Latejante",
  "pain.descriptor.cramping": "Cólica",
  "pain.descriptor.constant": "Constante",
  "pain.descriptor.comes_and_goes": "Vai e volta",
  "pain.descriptor.numb": "Dormência",
  "pain.descriptor.pressure": "Pressão",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Cabeça",
  "pain.region.face": "Rosto",
  "pain.region.neck": "Pescoço",
  "pain.region.chest": "Peito",
  "pain.region.left_shoulder": "Ombro esquerdo",
  "pain.region.right_shoulder": "Ombro direito",
  "pain.region.left_arm": "Braço esquerdo",
  "pain.region.right_arm": "Braço direito",
  "pain.region.stomach": "Estômago",
  "pain.region.upper_back": "Costas (parte superior)",
  "pain.region.lower_back": "Costas (parte inferior)",
  "pain.region.left_leg": "Perna esquerda",
  "pain.region.right_leg": "Perna direita",

  // ── Pain: Composed sentence template ───────────────────────────
  // TODO(translator): No possessive before {region} to avoid gender mismatch
  // (e.g. "em meu peito" vs "em minha cabeça"). "em {region}" is neutral.
  "pain.sentence":
    "Tenho dor {descriptor} em {region}, nível {severity} de 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Intensidade",
  "pain.step.location": "Localização",
  "pain.step.descriptor": "Descrição",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Meus objetivos",
  "wishes.worries.label": "Minhas preocupações",
  "wishes.strength.label": "Minha força",
  "wishes.joy.label": "O que me traz alegria",
  "wishes.tradeoffs.label": "Sobre o tratamento",
  "wishes.family.label": "Minha família",
  "wishes.hopes.label": "Minhas esperanças",

  // Questions
  "wishes.goals.question": "Quais são seus objetivos mais importantes?",
  "wishes.worries.question": "Quais são suas maiores preocupações?",
  "wishes.strength.question": "O que lhe dá força?",
  "wishes.joy.question": "O que traz alegria e sentido à sua vida?",
  "wishes.tradeoffs.question":
    "Até que ponto você está disposto a enfrentar por mais tempo?",
  "wishes.family.question":
    "As pessoas mais próximas de você sabem dos seus desejos?",
  "wishes.hopes.question": "Quais são suas esperanças?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "O que mais importa para mim",
  "wishes.worries.stem": "Estou preocupado com",
  "wishes.strength.stem": "O que me dá força",
  "wishes.joy.stem": "O que me traz alegria",
  "wishes.tradeoffs.stem": "Sobre meu tratamento",
  "wishes.family.stem": "Sobre minha família",
  "wishes.hopes.stem": "Eu espero",

  // Responses — goals
  "wishes.goals.r.family": "Estar com minha família",
  "wishes.goals.r.comfort": "Estar confortável e sem dor",
  "wishes.goals.r.longevity": "Viver o maior tempo possível",
  "wishes.goals.r.home": "Ir para casa",
  "wishes.goals.r.independence": "Poder fazer as coisas por mim mesmo",
  "wishes.goals.r.peace": "Estar em paz",

  // Responses — worries
  "wishes.worries.r.suffering": "Sofrer ou sentir dor",
  "wishes.worries.r.alone": "Ficar sozinho",
  "wishes.worries.r.burden": "Ser um peso para minha família",
  "wishes.worries.r.activities": "Não poder fazer o que gosto",
  "wishes.worries.r.leaving": "Deixar minha família para trás",
  "wishes.worries.r.unknown": "Não saber o que vai acontecer",

  // Responses — strength
  "wishes.strength.r.family": "Minha família",
  "wishes.strength.r.faith": "Minha fé",
  "wishes.strength.r.friends": "Meus amigos",
  "wishes.strength.r.wishes_heard": "Saber que meus desejos são ouvidos",
  "wishes.strength.r.hope": "Esperança de que vou melhorar",
  "wishes.strength.r.carers": "As pessoas que cuidam de mim",

  // Responses — joy
  "wishes.joy.r.family": "Passar tempo com minha família",
  "wishes.joy.r.outdoors": "Estar ao ar livre",
  "wishes.joy.r.hobbies": "Meus hobbies e interesses",
  "wishes.joy.r.helping": "Ajudar os outros",
  "wishes.joy.r.spiritual": "Minha prática espiritual",
  "wishes.joy.r.routines": "Rotinas simples do dia a dia",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Quero todo tratamento possível",
  "wishes.tradeoffs.r.good_chance":
    "Quero tratamento se tiver boa chance",
  "wishes.tradeoffs.r.try_stop":
    "Quero tentar, mas parar se não estiver ajudando",
  "wishes.tradeoffs.r.comfortable": "Quero focar em estar confortável",
  "wishes.tradeoffs.r.think": "Preciso de mais tempo para pensar",
  "wishes.tradeoffs.r.family_first":
    "Preciso falar com minha família primeiro",

  // Responses — family
  "wishes.family.r.know_well": "Eles conhecem bem meus desejos",
  "wishes.family.r.know_some": "Eles conhecem alguns dos meus desejos",
  "wishes.family.r.not_talked": "Ainda não conversamos sobre isso",
  "wishes.family.r.need_help": "Preciso de ajuda para contar a eles",
  "wishes.family.r.team_explain":
    "Quero que minha equipe de cuidados explique",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Melhorar",
  "wishes.hopes.r.go_home": "Ir para casa",
  "wishes.hopes.r.comfortable": "Estar confortável",
  "wishes.hopes.r.family_ok": "Que minha família fique bem",
  "wishes.hopes.r.more_time": "Ter mais tempo",
  "wishes.hopes.r.peace": "Estar em paz",

  // Wish sentence composition templates
  // TODO(translator): Verify "é" works for all stem + list combinations
  "wishes.compose": "{stem} é {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Vou chamar alguém para ajudar.",
  "provider.responses.interpreter": "Vou chamar um intérprete.",
  "provider.responses.family": "Vou ligar para sua família.",
  "provider.responses.get_that": "Vou buscar isso para você.",
  "provider.responses.doctor_know": "Vou avisar o médico.",
  "provider.responses.medication": "Vou buscar seu medicamento.",
  "provider.responses.family_coming": "Sua família está a caminho.",
  "provider.responses.doctor_soon": "O médico virá em breve.",
  "provider.responses.doing_well": "Você está indo bem.",
  "provider.responses.rest": "Tente descansar agora.",

  "provider.questions.feeling": "Como você está se sentindo?",
  "provider.questions.need": "Precisa de alguma coisa?",
  "provider.questions.where_hurts":
    "Pode me mostrar onde dói?",
  "provider.questions.rate_pain": "Avalie sua dor de 0 a 10.",
  "provider.questions.sleep": "Dormiu bem?",
  "provider.questions.comfortable": "Está confortável?",

  "provider.directions.procedure":
    "Seu procedimento está marcado para hoje.",
  "provider.directions.stay_in_bed": "Você precisa ficar na cama.",
  "provider.directions.vitals": "Vou verificar seus sinais vitais.",
  "provider.directions.medication_time": "Hora do seu medicamento.",
  "provider.directions.breathe": "Tente respirar fundo.",
  "provider.directions.call_button":
    "Aperte o botão de chamada se precisar de algo.",

  "provider.goals_of_care.matters_most":
    "Gostaria de conversar sobre o que é mais importante para você.",
  "provider.goals_of_care.goals":
    "Quais são seus objetivos mais importantes agora?",
  "provider.goals_of_care.worries":
    "Quais são suas maiores preocupações?",
  "provider.goals_of_care.strength": "O que lhe dá força?",
  "provider.goals_of_care.joy":
    "O que traz alegria e sentido à sua vida?",
  "provider.goals_of_care.wishes":
    "Seus entes queridos sabem dos seus desejos?",
  "provider.goals_of_care.hopes": "Quais são suas esperanças?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Dormi bem",
  "time.morning.didnt_sleep": "Não dormi bem",
  "time.morning.breakfast": "Preciso do café da manhã",
  "time.morning.doctor_coming": "Quando o médico vem?",

  "time.afternoon.tired": "Estou cansado",
  "time.afternoon.lunch": "Posso almoçar?",
  "time.afternoon.see_family": "Quando posso ver minha família?",
  "time.afternoon.rest": "Preciso descansar",

  "time.evening.cant_sleep": "Não consigo dormir",
  "time.evening.medication": "Preciso do meu medicamento",
  "time.evening.call_family": "Posso ligar para minha família?",
  "time.evening.pain": "Estou com dor",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Portuguese verb conjugation may not compose cleanly — review each path.
  "suggest.start.i_am": "Estou",
  "suggest.start.i_feel": "Me sinto",
  "suggest.start.i_want": "Quero",
  "suggest.start.i_need": "Preciso",
  "suggest.start.please": "Por favor",
  "suggest.start.when": "Quando",
  "suggest.start.can_you": "Você pode",
  "suggest.start.tell_me": "Me diga",

  "suggest.i_am.in_pain": "com dor",
  "suggest.i_am.cold": "com frio",
  "suggest.i_am.hot": "com calor",
  "suggest.i_am.hungry": "com fome",
  "suggest.i_am.thirsty": "com sede",
  "suggest.i_am.tired": "cansado",
  "suggest.i_am.uncomfortable": "desconfortável",
  "suggest.i_am.okay": "bem",
  "suggest.i_am.not_okay": "mal",
  "suggest.i_am.ready": "pronto",

  "suggest.i_feel.scared": "com medo",
  "suggest.i_feel.sick": "mal",
  "suggest.i_feel.dizzy": "tonto",
  "suggest.i_feel.weak": "fraco",
  "suggest.i_feel.better": "melhor",
  "suggest.i_feel.worse": "pior",
  "suggest.i_feel.nauseous": "com náusea",
  "suggest.i_feel.lonely": "sozinho",
  "suggest.i_feel.confused": "confuso",
  "suggest.i_feel.safe": "seguro",

  "suggest.i_feel_scared.procedure": "com o procedimento",
  "suggest.i_feel_scared.happening": "com o que está acontecendo",
  "suggest.i_feel_scared.alone": "de ficar sozinho",
  "suggest.i_feel_scared.need_someone": "e preciso de alguém",

  "suggest.i_feel_sick.stomach": "do estômago",
  "suggest.i_feel_sick.dizzy": "e tonto",
  "suggest.i_feel_sick.help": "e preciso de ajuda",

  "suggest.i_want.water": "água",
  "suggest.i_want.family": "minha família",
  "suggest.i_want.go_home": "ir para casa",
  "suggest.i_want.sleep": "dormir",
  "suggest.i_want.medication": "meu medicamento",
  "suggest.i_want.blanket": "um cobertor",
  "suggest.i_want.talk": "falar com alguém",
  "suggest.i_want.nurse": "a enfermeira",

  "suggest.i_want_to_go.home": "para casa",
  "suggest.i_want_to_go.sleep": "dormir",
  "suggest.i_want_to_go.bathroom": "ao banheiro",

  "suggest.i_want_my.family": "família",
  "suggest.i_want_my.medication": "medicamento",
  "suggest.i_want_my.phone": "celular",
  "suggest.i_want_my.glasses": "óculos",
  "suggest.i_want_my.blanket": "cobertor",

  "suggest.i_need.help": "de ajuda",
  "suggest.i_need.water": "de água",
  "suggest.i_need.bathroom": "ir ao banheiro",
  "suggest.i_need.medication": "do meu medicamento",
  "suggest.i_need.nurse": "da enfermeira",
  "suggest.i_need.doctor": "do médico",
  "suggest.i_need.rest": "descansar",
  "suggest.i_need.blanket": "de um cobertor",
  "suggest.i_need.suction": "de aspiração",

  "suggest.i_need_the.nurse": "enfermeira",
  "suggest.i_need_the.doctor": "médico",
  "suggest.i_need_the.bathroom": "banheiro",
  "suggest.i_need_the.light_off": "apagar a luz",
  "suggest.i_need_the.light_on": "acender a luz",

  "suggest.i_need_my.medication": "medicamento",
  "suggest.i_need_my.family": "família",
  "suggest.i_need_my.glasses": "óculos",
  "suggest.i_need_my.phone": "celular",

  "suggest.please.help_me": "me ajude",
  "suggest.please.call_family": "ligue para minha família",
  "suggest.please.light_off": "apague a luz",
  "suggest.please.adjust_bed": "ajuste minha cama",
  "suggest.please.give_me": "me dê",
  "suggest.please.explain": "explique",
  "suggest.please.come_back": "volte logo",
  "suggest.please.stay": "fique comigo",
  "suggest.please.dont_leave": "não vá embora",

  "suggest.please_help_me.pain": "Estou com dor",
  "suggest.please_help_me.breathe": "Não consigo respirar",
  "suggest.please_help_me.sick": "Estou me sentindo mal",
  "suggest.please_help_me.scared": "Estou com medo",

  "suggest.please_give_me.water": "água",
  "suggest.please_give_me.medication": "meu medicamento",
  "suggest.please_give_me.blanket": "um cobertor",
  "suggest.please_give_me.pain_relief": "algo para a dor",

  "suggest.when.go_home": "posso ir para casa?",
  "suggest.when.family": "minha família vem?",
  "suggest.when.medication": "é meu próximo medicamento?",
  "suggest.when.doctor": "o médico vem?",
  "suggest.when.eat": "posso comer?",
  "suggest.when.over": "isso vai acabar?",

  "suggest.can_you.help": "me ajudar?",
  "suggest.can_you.call_family": "ligar para minha família?",
  "suggest.can_you.get_nurse": "chamar a enfermeira?",
  "suggest.can_you.explain": "explicar o que está acontecendo?",
  "suggest.can_you.light_off": "apagar a luz?",
  "suggest.can_you.adjust_bed": "ajustar minha cama?",
  "suggest.can_you.stay": "ficar comigo?",

  "suggest.tell_me.happening": "o que está acontecendo",
  "suggest.tell_me.time": "que horas são",
  "suggest.tell_me.go_home": "quando posso ir para casa",
  "suggest.tell_me.day": "que dia é hoje",
  "suggest.tell_me.treatment": "sobre meu tratamento",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "por favor me ajude",
  "suggest.i_am_in_pain.worse": "e está piorando",
  "suggest.i_am_in_pain.medication": "e preciso de medicamento",
  "suggest.i_am_in_pain.back": "nas costas",
  "suggest.i_am_in_pain.chest": "no peito",
  "suggest.i_am_in_pain.stomach": "no estômago",

  "suggest.i_need_help.up": "para levantar",
  "suggest.i_need_help.breathing": "para respirar",
  "suggest.i_need_help.pain": "com a dor",
  "suggest.i_need_help.now": "agora",
  "suggest.i_need_help.please": "por favor",

  "suggest.i_feel_better.than_before": "do que antes",
  "suggest.i_feel_better.now": "agora",
  "suggest.i_feel_better.thanks": "obrigado",

  "suggest.i_feel_worse.than_before": "do que antes",
  "suggest.i_feel_worse.need_doctor": "Preciso do médico",
  "suggest.i_feel_worse.help": "por favor me ajude",
  "suggest.i_feel_worse.medication": "Preciso de medicamento",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Me sinto",
  "suggest.ctx.feeling.i_am": "Estou",
  "suggest.ctx.feeling.better": "Melhor do que antes",
  "suggest.ctx.feeling.not_great": "Não muito bem",
  "suggest.ctx.feeling.pain": "Estou com dor",
  "suggest.ctx.feeling.okay": "Estou bem",
  "suggest.ctx.feeling.help": "Pode me ajudar?",

  "suggest.ctx.need.i_need": "Preciso",
  "suggest.ctx.need.i_want": "Quero",
  "suggest.ctx.need.fine": "Estou bem por agora",
  "suggest.ctx.need.yes": "Sim, por favor",
  "suggest.ctx.need.no": "Não, obrigado",
  "suggest.ctx.need.stay": "Pode ficar?",

  "suggest.ctx.where_hurts.head": "Minha cabeça",
  "suggest.ctx.where_hurts.chest": "Meu peito",
  "suggest.ctx.where_hurts.stomach": "Meu estômago",
  "suggest.ctx.where_hurts.back": "Minhas costas",
  "suggest.ctx.where_hurts.left_arm": "Meu braço esquerdo",
  "suggest.ctx.where_hurts.right_leg": "Minha perna direita",
  "suggest.ctx.where_hurts.everywhere": "Tudo",

  "suggest.ctx.pain.very_bad": "Está muito forte",
  "suggest.ctx.pain.worse": "Está piorando",
  "suggest.ctx.pain.same": "Está igual",
  "suggest.ctx.pain.little_better": "Está um pouco melhor",
  "suggest.ctx.pain.need_relief": "Preciso de algo para a dor",

  "suggest.ctx.comfort.comfortable": "Estou confortável",
  "suggest.ctx.comfort.not_comfortable": "Não estou confortável",
  "suggest.ctx.comfort.cant_sleep": "Não consigo dormir",
  "suggest.ctx.comfort.cold": "Estou com frio",
  "suggest.ctx.comfort.hot": "Estou com calor",
  "suggest.ctx.comfort.adjust_bed": "Pode ajustar minha cama?",

  "suggest.ctx.night.cant_sleep": "Não consigo dormir",
  "suggest.ctx.night.i_need": "Preciso",
  "suggest.ctx.night.pain": "Estou com dor",
  "suggest.ctx.night.i_feel": "Me sinto",
  "suggest.ctx.night.can_you": "Você pode",
  "suggest.ctx.night.please": "Por favor",
  "suggest.ctx.night.i_am": "Estou",
  "suggest.ctx.night.when": "Quando",

  "suggest.ctx.morning.i_am": "Estou",
  "suggest.ctx.morning.i_need": "Preciso",
  "suggest.ctx.morning.i_feel": "Me sinto",
  "suggest.ctx.morning.doctor": "Quando o médico vem?",
  "suggest.ctx.morning.i_want": "Quero",
  "suggest.ctx.morning.can_you": "Você pode",
  "suggest.ctx.morning.please": "Por favor",
  "suggest.ctx.morning.tell_me": "Me diga",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Rápido",
  "cat.needs": "Preciso",
  "cat.feelings": "Sinto",
  "cat.pain": "Dor",
  "cat.questions": "Perguntar",
  "sub.comfort": "Conforto",
  "sub.medical": "Médico",
  "sub.people": "Pessoas",
  "sub.physical": "Físico",
  "sub.emotional": "Emocional",

  // Provider category labels
  "provider.cat.responses": "Respostas",
  "provider.cat.questions": "Perguntas",
  "provider.cat.directions": "Orientações",
  "provider.cat.goals_of_care": "Metas de cuidado",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — conversa de {name}",
  "ui.patient.app.name_fallback": "Paciente",
  "ui.patient.header.name_fallback": "Paciente",
  "ui.patient.header.bed_prefix": "Leito ",
  "ui.dual.nav.wishes": "Desejos",
  "ui.dual.nav.listen": "Ouvir",
  "ui.provider.nav.staff": "Equipe",
  "ui.provider.nav.switch_patient": "Trocar paciente",
  "ui.provider.nav.settings": "Configurações",
  "ui.provider.nav.theme.auto": "Automático",
  "ui.provider.nav.theme.light": "Claro",
  "ui.provider.nav.theme.dark": "Escuro",
  "ui.patient.tabbar.say_more": "Dizer mais",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Quanta dor você tem?",
  "ui.dual.pain.heading.location": "Onde é a sua dor?",
  "ui.dual.pain.heading.descriptor": "Como é a dor?",
  "ui.patient.pain.step_of": "Passo {n} de {total}",
  "ui.patient.pain.back_to": "Voltar para {label}",
  "ui.patient.pain.level_aria": "Nível de dor {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Desejos de {name}",
  "ui.patient.wishes.my_wishes": "Meus desejos",
  "ui.patient.wishes.step_of": "Passo {n} de {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Nenhum desejo foi compartilhado.",
  "ui.patient.wishes.share_all_again": "Compartilhar todos os desejos novamente",
  "ui.patient.wishes.close": "Fechar",
  "ui.patient.wishes.share": "Compartilhar",
  "ui.patient.wishes.skip": "Pular",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Toque nas palavras abaixo ou digite...",
  "ui.patient.builder.message_aria": "Sua mensagem",
  "ui.patient.builder.undo": "Desfazer última palavra",
  "ui.patient.builder.clear": "Limpar mensagem",
  "ui.patient.builder.refresh_ai": "Atualizar sugestões de IA",
  "ui.patient.builder.ai_thinking": "A IA está pensando...",
  "ui.patient.builder.no_ai_suggestions":
    "Sem sugestões de IA. Toque em atualizar para tentar novamente.",
  "ui.patient.builder.ready":
    "Sua mensagem está pronta. Toque em Falar para enviar.",
  "ui.patient.builder.speak": "Falar",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Repetir: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Equipe de cuidados",
  "ui.provider.fallback_name": "Profissional",
  "ui.provider.speaking_to": "Falando com {name} como {prov}",
  "ui.provider.patient_fallback": "paciente",
  "ui.provider.close_panel": "Fechar painel",
  "ui.provider.select_provider": "Selecionar {name}",
  "ui.provider.show_category": "Mostrar {key}",
  "ui.provider.speak_phrase": "Falar: {phrase}",
  "ui.provider.speaking_as_aria": "Speaking as",
  "ui.provider.section_aria": "Phrase category",
  "ui.provider.phrases_aria": "{section} phrases",
  "ui.provider.listen.capture_aria": "Voice capture",
  "ui.provider.setup.progress_aria": "Setup progress",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Ouvir",
  "ui.provider.listen.stop_aria": "Parar de ouvir",
  "ui.provider.listen.start_aria": "Toque para começar a ouvir",
  "ui.provider.listen.listening": "Ouvindo...",
  "ui.provider.listen.transcribing": "Transcrevendo...",
  "ui.provider.listen.listening_placeholder": "Ouvindo a fala...",
  "ui.provider.listen.transcribing_placeholder": "Transcrevendo a fala...",
  "ui.provider.listen.type_placeholder": "Ou digite o que foi dito...",
  "ui.provider.listen.transcript_aria": "Transcrição",
  "ui.provider.listen.add_as": "Adicionar à conversa como {prov}",
  "ui.provider.listen.privacy_notice":
    "No dispositivo · Whisper · nenhum áudio sai deste dispositivo",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Falando: {text}",
  "ui.dual.speaking.patient_voice": "Sua voz",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Digite o PIN",
  "ui.provider.pin_gate.subtitle": "Acesso apenas para a equipe",
  "ui.provider.pin_gate.incorrect": "PIN incorreto",
  "ui.provider.pin_gate.delete_aria": "Apagar",
  "ui.provider.pin_gate.digit_aria": "Dígito {n}",
  "ui.provider.pin_gate.cancel": "Cancelar",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Você vai ler uma frase em voz alta.",
  "ui.provider.voice_capture.coaching_breath":
    "Respire fundo algumas vezes.",
  "ui.provider.voice_capture.coaching_ready": "Pronto.",
  "ui.provider.voice_capture.breathe_in": "Inspire…",
  "ui.provider.voice_capture.breathe_out": "Expire…",
  "ui.provider.voice_capture.creating": "Criando clone de voz...",
  "ui.provider.voice_capture.creating_from_sample":
    "Criando clone de voz a partir da amostra...",
  "ui.provider.voice_capture.loading_model":
    "Carregando modelo de voz...",
  "ui.provider.voice_capture.clone_failed": "Clonagem falhou",
  "ui.provider.voice_capture.captured": "Voz capturada",
  "ui.provider.voice_capture.stop": "Parar",
  "ui.provider.voice_capture.play": "Reproduzir",
  "ui.provider.voice_capture.discard": "Descartar gravação",
  "ui.provider.voice_capture.use_recording": "Usar esta gravação",
  "ui.provider.voice_capture.upload_file": "Enviar arquivo",
  "ui.provider.voice_capture.record": "Gravar",
  "ui.provider.voice_capture.stop_early": "Parar antes",
  "ui.provider.voice_capture.remove": "Remover",
  "ui.provider.voice_capture.retry": "Tentar novamente",
  "ui.provider.voice_capture.done": "Pronto!",
  "ui.provider.voice_capture.cancel": "Cancelar",
  "ui.provider.voice_capture.seconds_recorded": "{n}s gravados",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Cancelar contagem regressiva da gravação",
  "ui.provider.voice_capture.stop_early_aria":
    "Parar gravação antes do tempo",
  "ui.provider.voice_capture.audio_level_aria": "Nível de áudio",
  "ui.provider.voice_capture.recording_progress_aria":
    "Progresso da gravação",
  "ui.provider.voice_capture.stop_preview_aria":
    "Parar pré-visualização da reprodução",
  "ui.provider.voice_capture.play_preview_aria":
    "Reproduzir pré-visualização da gravação",
  "ui.provider.voice_capture.discard_aria":
    "Descartar esta gravação e recomeçar",
  "ui.provider.voice_capture.stop_playback_aria":
    "Parar reprodução da amostra gravada",
  "ui.provider.voice_capture.play_sample_aria":
    "Reproduzir amostra de voz gravada",
  "ui.provider.voice_capture.remove_aria": "Remover amostra de voz",
  "ui.provider.voice_capture.retry_aria":
    "Tentar novamente a extração do clone de voz",
  "ui.provider.voice_capture.upload_aria":
    "Enviar amostra de voz a partir de arquivo",
  "ui.provider.voice_capture.record_aria":
    "Gravar amostra de voz pelo microfone",
  "ui.provider.voice_capture.err_network":
    "Não foi possível conectar ao modelo de voz. Verifique sua conexão e toque em Tentar novamente.",
  "ui.provider.voice_capture.err_timeout":
    "O processamento de voz demorou demais. Toque em Tentar novamente.",
  "ui.provider.voice_capture.err_mic_denied":
    "O acesso ao microfone está bloqueado. Ative nas configurações do navegador ou envie um arquivo.",
  "ui.provider.voice_capture.err_generic":
    "Não foi possível concluir a preparação da sua voz. Toque em Tentar novamente.",
  "ui.provider.voice_capture.err_too_short":
    "A gravação foi curta demais. Fale durante toda a contagem regressiva e depois toque em Tentar novamente.",
  "ui.provider.voice_capture.err_too_noisy":
    "O ruído de fundo estava alto demais para um clone de voz limpo. Vá para um local mais silencioso e toque em Tentar novamente.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Acesso ao microfone negado. Tente enviar um arquivo.",
  "ui.provider.voice_capture.err_playback":
    "Não foi possível reproduzir o áudio.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Aprimorada",
  "ui.provider.fallback_voice.enhanced_aria": "Voz neural aprimorada",
  "ui.provider.fallback_voice.on_device_badge": "No dispositivo",
  "ui.provider.fallback_voice.playing": "Reproduzindo...",
  "ui.provider.fallback_voice.unavailable":
    "As vozes do sistema não estão disponíveis neste dispositivo.",
  "ui.provider.fallback_voice.loading":
    "Carregando vozes disponíveis...",
  "ui.provider.fallback_voice.hide_others": "Ocultar outras vozes",
  "ui.provider.fallback_voice.more_voices": "Mais vozes ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Paciente",
  "ui.provider.setup.steps.voice": "Voz",
  "ui.provider.setup.steps.care_team": "Equipe",
  "ui.provider.setup.steps.confirm": "Confirmar",

  "ui.provider.setup.skip": "Pular →",
  "ui.provider.setup.skip_aria": "Pular configuração",
  "ui.provider.setup.skip_dialog.title": "Pular configuração?",
  "ui.provider.setup.skip_dialog.body": "Comece a usar o OwnVoice agora. Você pode concluir a configuração depois tocando no nome do paciente no cabeçalho.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Nenhum paciente será adicionado.",
  "ui.provider.setup.skip_dialog.confirm": "Pular configuração",
  "ui.provider.setup.skip_dialog.cancel": "Continuar",

  "ui.provider.setup.back": "Voltar",
  "ui.provider.setup.continue": "Continuar",
  "ui.provider.setup.start": "Iniciar OwnVoice",

  "ui.provider.setup.step0.heading": "Bem-vindo ao OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Vamos configurar seu painel de comunicação. Tudo fica neste dispositivo.",
  "ui.provider.setup.step0.name_label": "Nome do paciente",
  "ui.provider.setup.step0.name_placeholder":
    "Primeiro nome ou nome preferido",
  "ui.provider.setup.step0.bed_label": "Leito / Quarto",
  "ui.provider.setup.step0.bed_placeholder": "ex. 4B-12",
  "ui.provider.setup.step0.language_label": "Idioma",

  "ui.provider.setup.step1.heading": "Amostra de voz",
  "ui.provider.setup.step1.body1":
    "Capture uma amostra de voz para que o OwnVoice fale com a voz do paciente. Esta etapa é opcional.",
  "ui.provider.setup.step1.body2":
    "A clonagem de voz roda inteiramente no dispositivo. Nenhum áudio sai deste tablet.",
  "ui.provider.setup.step1.patient_label": "Paciente",
  "ui.provider.setup.step1.backup_voice_heading": "Voz de reserva",
  "ui.provider.setup.step1.backup_voice_body1":
    "Escolha uma voz do sistema para usar enquanto o clone de voz carrega, ou se nenhuma amostra foi gravada. Toque em uma voz para ouvir uma prévia.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Isso usa a síntese de voz integrada do seu dispositivo.",

  "ui.provider.setup.step2.heading": "Equipe de cuidados",
  "ui.provider.setup.step2.body":
    "Adicione os profissionais que cuidarão deste paciente.",
  "ui.provider.setup.step2.icon_label": "Ícone",
  "ui.provider.setup.step2.name_label": "Nome",
  "ui.provider.setup.step2.name_placeholder":
    "Dr. Silva, Enf. Ana...",
  "ui.provider.setup.step2.add": "Adicionar",

  "ui.provider.setup.step3.heading": "Pronto para começar",
  "ui.provider.setup.step3.body":
    "Revise sua configuração. Você pode alterar qualquer coisa depois em Configurações.",
  "ui.provider.setup.step3.summary.patient": "Paciente",
  "ui.provider.setup.step3.summary.bed": "Leito / Quarto",
  "ui.provider.setup.step3.summary.language": "Idioma",
  "ui.provider.setup.step3.summary.language_default": "Português",
  "ui.provider.setup.step3.summary.voice": "Voz",
  "ui.provider.setup.step3.summary.care_team": "Equipe de cuidados",
  "ui.provider.setup.step3.summary.not_set": "Não definido",
  "ui.provider.setup.step3.summary.captured": "Capturada",
  "ui.provider.setup.step3.summary.not_captured": "Não capturada",
  "ui.provider.setup.step3.summary.none_added": "Nenhum adicionado",
  "ui.provider.setup.step3.pin_label": "PIN da equipe (opcional)",
  "ui.provider.setup.step3.pin_body":
    "Defina um PIN de 4 dígitos para proteger as configurações do profissional.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Configurações",
  "ui.provider.settings.done": "Pronto",
  "ui.provider.settings.close_aria": "Fechar configurações",

  "ui.provider.patient_edit.title": "Editar {name}",
  "ui.provider.patient_edit.title_default": "Editar paciente",
  "ui.provider.patient_edit.close_aria": "Fechar editor de paciente",
  "ui.provider.patient_pill.aria": "Editar paciente: {name}",
  "ui.provider.nav.staff_menu": "Configurações",
  "ui.provider.staff_sheet.title": "Equipe",
  "ui.provider.staff_sheet.close_aria": "Fechar menu da equipe",
  "ui.provider.staff_sheet.patients_description": "Trocar, adicionar ou editar pacientes",
  "ui.provider.staff_sheet.settings_description": "Equipe de cuidados, acessibilidade, offline",
  "ui.provider.staff_sheet.end_session_description": "Sair do modo equipe",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Descartar a preparação de voz de {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "O progresso ({current} / {total} frases) será perdido. A amostra de voz gravada é mantida — você pode reiniciar a preparação depois.",
  "ui.provider.settings.voice_cache.cancel": "Cancelar",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Cancelar e manter a preparação de voz",
  "ui.provider.settings.voice_cache.discard_confirm": "Descartar",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Confirmar descarte da preparação de voz",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Descartar preparação de voz de {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "Na fila — a voz de {label} será preparada a seguir ({total} frase{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Preparando a voz de {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Pausado — voz de {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Retomar",
  "ui.provider.settings.voice_cache.resume_aria":
    "Retomar preparação de voz de {label}",
  "ui.provider.settings.voice_cache.pause": "Pausar",
  "ui.provider.settings.voice_cache.pause_aria":
    "Pausar preparação de voz de {label}",
  "ui.provider.settings.voice_cache.done":
    "Clone de voz ativo — todas as {total} frases prontas na voz de {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} frase{plural} falharam para {label}",
  "ui.provider.settings.voice_cache.retry": "Tentar novamente",
  "ui.provider.settings.voice_cache.retry_aria":
    "Tentar novamente as frases com falha no cache de voz",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Sobre",
  "ui.provider.settings.about.subtitle":
    "Recurso de comunicação AAC para pacientes internados.",
  "ui.provider.settings.about.attribution_1":
    "Escala de dor: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Metas de cuidado: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Cache SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Redefinir",
  "ui.provider.settings.reset.action_label":
    "Redefinir app para novo paciente",
  "ui.provider.settings.reset.confirm_title": "Tem certeza?",
  "ui.provider.settings.reset.confirm_body":
    "Isso apagará todos os dados do paciente, amostras de voz, histórico de conversa e configurações do profissional. Isso não pode ser desfeito.",
  "ui.provider.settings.reset.confirm_destructive": "Redefinir tudo",
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
  "ui.provider.settings.accessibility.heading": "Acessibilidade",
  "ui.provider.settings.accessibility.toggle_label":
    "Modo de entrada assistiva",
  "ui.provider.settings.accessibility.toggle_description":
    "Amplia os anéis de foco, aumenta o tempo de toque e reforça o feedback para pacientes que usam trackball, joystick, cursor AssistiveTouch ou switch.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Ponteiro externo detectado.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Considere ativar o Modo de entrada assistiva para este paciente.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Pacientes",
  "ui.provider.settings.patients.active_remove_hint":
    "Troque para outro paciente antes de remover este.",
  "ui.provider.settings.patients.remove_button": "Remover",
  "ui.provider.settings.patients.add_patient": "+ Adicionar paciente",
  "ui.provider.settings.patients.remove_dialog.title":
    "Remover {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Isso excluirá a amostra de voz, o histórico de conversa e o áudio em cache do clone de voz. Os clones de voz da equipe de cuidados são mantidos para outros pacientes. Isso não pode ser desfeito.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Remover",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Equipe de cuidados",
  "ui.provider.settings.care_team.empty":
    "Nenhum profissional adicionado ainda.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Informações do paciente",
  "ui.provider.settings.patient_info.name_label": "Nome",
  "ui.provider.settings.patient_info.bed_label": "Leito / Quarto",
  "ui.provider.settings.patient_info.language_label": "Idioma",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Idioma do paciente",
  "ui.provider.settings.lang.caregiver_section":
    "Idioma da equipe de cuidados",
  "ui.provider.settings.lang.caregiver_helper":
    "O idioma que sua equipe de cuidados entende. Geralmente configurado uma vez por dispositivo.",
  "ui.provider.settings.lang.change": "Alterar idioma",

  "ui.provider.settings.lang.picker_title": "Escolher idioma",
  "ui.provider.settings.lang.patient_dialog.title":
    "Alterar idioma do paciente para {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Seu clone de voz continua pronto — as frases que você tocar ainda vão soar igual. Vamos preparar áudio para {providerCount} vozes da equipe (~{estimatedMinutes} min). Você pode continuar usando o app enquanto isso.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Os clones de voz da equipe de cuidados não estão disponíveis em {lang} — a voz do sistema será usada. As gravações existentes são mantidas caso você troque para um idioma compatível depois.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "As frases que você tocar ainda vão soar igual. Não há vozes da equipe configuradas, então nada precisa ser regenerado.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Alterar idioma da equipe de cuidados para {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Os clones de voz da sua equipe continuam prontos. Vamos preparar áudio da voz do paciente no novo idioma (~{estimatedMinutes} min). Você pode continuar usando o app enquanto isso.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "O clone de voz do paciente não está disponível em {lang} — a voz do sistema será usada. A amostra de voz gravada do paciente é mantida caso você troque para um idioma compatível depois.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Nenhum clone de voz do paciente está configurado, então nada precisa ser regenerado.",
  "ui.provider.settings.patient_info.voice_label": "Voz",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Voz de reserva",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Voz do sistema usada enquanto o clone de voz carrega. Toque para ouvir.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Diagnóstico do app",
  "ui.provider.settings.offline.status_description":
    "Status dos modelos de IA que o app usa no dispositivo para geração de voz, sugestões e reconhecimento de fala.",
  "ui.provider.settings.offline.downloading":
    "Baixando modelos…",
  "ui.provider.settings.offline.download_progress_aria":
    "Progresso do download dos modelos",
  "ui.provider.settings.offline.all_ready":
    "Todos os modelos prontos",
  "ui.provider.settings.offline.redownload_button":
    "Baixar modelos novamente",
  "ui.provider.settings.offline.already_up_to_date":
    "Já está atualizado",
  "ui.provider.settings.offline.checking": "Verificando…",
  "ui.provider.settings.offline.verified": "✓ Modelos verificados",
  "ui.provider.settings.offline.check_button":
    "Verificar modelos existentes",
  "ui.provider.settings.offline.redownloading":
    "Baixando novamente…",
  "ui.provider.settings.offline.force_redownload_button":
    "Forçar novo download de todos os modelos",
  "ui.provider.settings.offline.model_status_ready": "pronto",
  "ui.provider.settings.offline.model_status_downloading":
    "baixando…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "precisa tentar novamente",
  "ui.provider.settings.offline.last_verified_prefix":
    "Última verificação: ",
  "ui.provider.settings.offline.storage_prefix": "Armazenamento: ",
  "ui.provider.settings.offline.storage_of": " de ",
  "ui.provider.settings.offline.storage_used": " usado",
  "ui.provider.settings.offline.storage_low": " — ficando baixo",
  "ui.provider.settings.offline.clear_audio_cache":
    "Limpar cache de áudio",
  "ui.provider.settings.offline.clearing": "Limpando…",
  "ui.provider.settings.offline.rebuilding":
    "Reconstruindo: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Baixar novamente todos os modelos de IA?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Isso fará o download de aproximadamente 1,7 GB. A síntese de voz continua funcionando durante a atualização.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Baixar novamente",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Trocar paciente",
  "ui.provider.switch.add_patient": "+ Adicionar paciente",
  "ui.provider.patients.title": "Pacientes",
  "ui.provider.patients.actions_aria": "Ações para {name}",
  "ui.provider.patients.action_edit": "Editar",
  "ui.provider.patients.action_remove": "Remover",
  "ui.provider.switch.voice_captured": "Voz capturada",
  "ui.provider.switch.no_voice": "Sem voz",
  "ui.provider.switch.last_active_just_now": "Agora mesmo",
  "ui.provider.switch.last_active_minutes":
    "Ativo há {n} min",
  "ui.provider.switch.last_active_hours": "Ativo há {n}h",
  "ui.provider.switch.last_active_days": "Ativo há {n}d",
  "ui.provider.switch.currently_active": "Ativo no momento",
  "ui.provider.switch.switched_announcement":
    "Trocou para {name}. {count} mensagens na conversa.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Sessão da equipe encerrando",
  "ui.provider.staff_session.warning_body":
    "Seu acesso de equipe será bloqueado em {n} segundos.",
  "ui.provider.staff_session.extend": "Estender sessão",
  "ui.provider.staff_session.end_now": "Encerrar agora",
  "ui.provider.nav.end_staff_session": "Encerrar sessão da equipe",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",
};

export default pt;
