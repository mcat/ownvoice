/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: French (France + Québec neutral)
 * Locale: fr
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const fr: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Oui",
  "quick.no": "Non",
  "quick.thank_you": "Merci",
  "quick.please_wait": "Veuillez patienter",
  "quick.dont_understand": "Je ne comprends pas",
  "quick.repeat": "Veuillez répéter",
  "quick.retract": "Ce n'est pas ce que je voulais dire",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "J'ai besoin d'eau",
  "needs.comfort.hungry": "J'ai faim",
  "needs.comfort.cold": "J'ai froid",
  "needs.comfort.hot": "J'ai chaud",
  "needs.comfort.bed": "Ajustez mon lit",
  "needs.comfort.bathroom": "J'ai besoin d'aller aux toilettes",
  "needs.comfort.hearing_aid": "J'ai besoin de mon appareil auditif",
  "needs.comfort.glasses": "J'ai besoin de mes lunettes",
  "needs.comfort.ice": "J'ai besoin de glaçons",
  "needs.comfort.pillow": "Ajustez mon oreiller",
  "needs.comfort.turn": "Tournez-moi, s'il vous plaît",
  "needs.comfort.sit_up": "Aidez-moi à m'asseoir",
  "needs.comfort.quiet": "Faites moins de bruit, s'il vous plaît",
  "needs.comfort.lights_on": "Allumez la lumière",
  "needs.comfort.lights_off": "Éteignez la lumière",
  "needs.comfort.lights_dimmed": "Tamisez la lumière",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "J'ai besoin de mon médicament",
  "needs.medical.suction": "J'ai besoin d'une aspiration",
  "needs.medical.breathe": "J'ai du mal à respirer",
  "needs.medical.nurse": "J'ai besoin de l'infirmière",
  "needs.medical.doctor": "J'ai besoin du médecin",
  "needs.medical.call_light": "J'ai besoin d'aide tout de suite",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Je veux ma famille",
  "needs.people.stay": "Est-ce que quelqu'un peut rester avec moi ?",
  "needs.people.call": "Je veux appeler quelqu'un",
  "needs.people.interpreter": "J'ai besoin d'un interprète",
  "needs.people.respiratory_therapist": "J'ai besoin du kinésithérapeute respiratoire",
  "needs.people.speech_therapist": "J'ai besoin de l'orthophoniste",

  // ── Patient needs: Hygiene ─────────────────────────────────────
  "needs.hygiene.back": "Lavez-moi le dos",
  "needs.hygiene.face": "Lavez-moi le visage",
  "needs.hygiene.feet": "Lavez-moi les pieds",
  "needs.hygiene.hair": "Lavez-moi les cheveux",
  "needs.hygiene.hands": "Lavez-moi les mains",
  "needs.hygiene.mouth": "Faites-moi des soins de bouche",
  "needs.hygiene.nose": "Mouchez-moi le nez",
  "needs.hygiene.teeth": "Brossez-moi les dents",
  "needs.hygiene.wound": "Changez mon pansement",

  // ── Patient feelings: Physical ─────────────────────────────────
  // TODO(translator): Masculine default — review for female patients (avoid parenthetical forms; TTS will mangle them)
  "feelings.physical.tired": "Je suis fatigué",
  "feelings.physical.uncomfortable": "Je suis mal installé",
  "feelings.physical.weak": "Je me sens faible",
  "feelings.physical.better": "Je me sens mieux",
  "feelings.physical.dizzy": "J'ai des vertiges",
  "feelings.physical.itchy": "J'ai des démangeaisons",
  "feelings.physical.wet": "Je suis mouillé",
  "feelings.physical.gagging": "J'ai des haut-le-cœur",
  "feelings.physical.short_of_breath": "Je suis essoufflé",
  "feelings.physical.nauseated": "J'ai la nausée",
  "feelings.physical.worse": "Je me sens moins bien",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "J'ai peur",
  "feelings.emotional.lonely": "Je me sens seul",
  "feelings.emotional.frustrated": "Je suis frustré",
  "feelings.emotional.confused": "Je suis confus",
  "feelings.emotional.safe": "Je me sens en sécurité",
  "feelings.emotional.grateful": "Je suis reconnaissant",
  "feelings.emotional.worried": "Je suis inquiet",
  "feelings.emotional.hopeful": "J'ai de l'espoir",
  "feelings.emotional.bored": "Je m'ennuie",
  "feelings.emotional.embarrassed": "Je suis gêné",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Quelle heure est-il ?",
  "questions.day": "Quel jour sommes-nous ?",
  "questions.whats_happening": "Que m'arrive-t-il ?",
  "questions.go_home": "Quand pourrai-je rentrer chez moi ?",
  "questions.next_medication": "Quand est mon prochain médicament ?",
  "questions.explain_treatment": "Pouvez-vous m'expliquer mon traitement ?",
  "questions.nurse_today": "Qui est mon infirmière aujourd'hui ?",
  "questions.eat_drink": "Puis-je manger ou boire ?",
  "questions.see_family": "Quand pourrai-je voir ma famille ?",
  "questions.extubation": "Quand va-t-on retirer mon tube ?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Pas de douleur",
  "pain.face.2": "Un peu mal",
  "pain.face.4": "Un peu plus mal",
  "pain.face.6": "Encore plus mal",
  "pain.face.8": "Très mal",
  "pain.face.10": "Douleur maximale",

  // ── Pain: Descriptors ──────────────────────────────────────────
  // TODO(translator): Descriptors are feminine to agree with "douleur" in pain.sentence
  "pain.descriptor.aching": "Sourde",
  "pain.descriptor.burning": "Brûlante",
  "pain.descriptor.sharp": "Vive",
  "pain.descriptor.throbbing": "Pulsatile",
  "pain.descriptor.cramping": "Crampe",
  "pain.descriptor.constant": "Constante",
  "pain.descriptor.comes_and_goes": "Intermittente",
  "pain.descriptor.numb": "Engourdissement",
  "pain.descriptor.pressure": "Pression",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Tête",
  "pain.region.face": "Visage",
  "pain.region.neck": "Cou",
  "pain.region.chest": "Poitrine",
  "pain.region.left_shoulder": "Épaule gauche",
  "pain.region.right_shoulder": "Épaule droite",
  "pain.region.left_arm": "Bras gauche",
  "pain.region.right_arm": "Bras droit",
  "pain.region.stomach": "Ventre",
  "pain.region.upper_back": "Haut du dos",
  "pain.region.lower_back": "Bas du dos",
  "pain.region.left_leg": "Jambe gauche",
  "pain.region.right_leg": "Jambe droite",

  // ── Pain: Composed sentence template ───────────────────────────
  // TODO(translator): "douleur {descriptor}" requires feminine descriptors above
  "pain.sentence":
    "J'ai une douleur {descriptor} au niveau de {region}, niveau {severity} sur 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Intensité",
  "pain.step.location": "Localisation",
  "pain.step.descriptor": "Description",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Mes objectifs",
  "wishes.worries.label": "Mes inquiétudes",
  "wishes.strength.label": "Ma force",
  "wishes.joy.label": "Ce qui me rend heureux",
  "wishes.tradeoffs.label": "Mon traitement",
  "wishes.family.label": "Ma famille",
  "wishes.hopes.label": "Mes espoirs",

  // Questions
  "wishes.goals.question": "Quels sont vos objectifs les plus importants ?",
  "wishes.worries.question": "Quelles sont vos plus grandes inquiétudes ?",
  "wishes.strength.question": "Qu'est-ce qui vous donne de la force ?",
  "wishes.joy.question":
    "Qu'est-ce qui donne de la joie et du sens à votre vie ?",
  "wishes.tradeoffs.question":
    "Jusqu'où êtes-vous prêt à aller pour gagner du temps ?",
  "wishes.family.question":
    "Vos proches connaissent-ils vos souhaits ?",
  "wishes.hopes.question": "Quels sont vos espoirs ?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "Ce qui compte le plus pour moi",
  "wishes.worries.stem": "Ce qui m'inquiète",
  "wishes.strength.stem": "Ce qui me donne de la force",
  "wishes.joy.stem": "Ce qui me rend heureux",
  "wishes.tradeoffs.stem": "À propos de mon traitement",
  "wishes.family.stem": "À propos de ma famille",
  "wishes.hopes.stem": "J'espère",

  // Responses — goals
  "wishes.goals.r.family": "Être avec ma famille",
  "wishes.goals.r.comfort": "Être confortable et sans douleur",
  "wishes.goals.r.longevity": "Vivre le plus longtemps possible",
  "wishes.goals.r.home": "Rentrer chez moi",
  "wishes.goals.r.independence": "Pouvoir faire les choses par moi-même",
  "wishes.goals.r.peace": "Être en paix",

  // Responses — worries
  "wishes.worries.r.suffering": "Souffrir ou avoir mal",
  "wishes.worries.r.alone": "Être seul",
  "wishes.worries.r.burden": "Être un fardeau pour ma famille",
  "wishes.worries.r.activities": "Ne plus pouvoir faire ce que j'aime",
  "wishes.worries.r.leaving": "Laisser ma famille derrière moi",
  "wishes.worries.r.unknown": "Ne pas savoir ce qui va se passer",

  // Responses — strength
  "wishes.strength.r.family": "Ma famille",
  "wishes.strength.r.faith": "Ma foi",
  "wishes.strength.r.friends": "Mes amis",
  "wishes.strength.r.wishes_heard": "Savoir que mes souhaits sont entendus",
  "wishes.strength.r.hope": "L'espoir de guérir",
  "wishes.strength.r.carers": "Les personnes qui prennent soin de moi",

  // Responses — joy
  "wishes.joy.r.family": "Passer du temps avec ma famille",
  "wishes.joy.r.outdoors": "Être dehors",
  "wishes.joy.r.hobbies": "Mes loisirs et centres d'intérêt",
  "wishes.joy.r.helping": "Aider les autres",
  "wishes.joy.r.spiritual": "Ma pratique spirituelle",
  "wishes.joy.r.routines": "Les petites habitudes du quotidien",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Je veux tous les traitements possibles",
  "wishes.tradeoffs.r.good_chance":
    "Je veux un traitement s'il a de bonnes chances",
  "wishes.tradeoffs.r.try_stop":
    "Je veux essayer mais arrêter si ça ne fonctionne pas",
  "wishes.tradeoffs.r.comfortable": "Je veux me concentrer sur mon confort",
  "wishes.tradeoffs.r.think": "J'ai besoin de plus de temps pour y réfléchir",
  "wishes.tradeoffs.r.family_first":
    "J'ai besoin d'en parler à ma famille d'abord",

  // Responses — family
  "wishes.family.r.know_well": "Ils connaissent bien mes souhaits",
  "wishes.family.r.know_some": "Ils connaissent certains de mes souhaits",
  "wishes.family.r.not_talked": "Nous n'en avons pas encore parlé",
  "wishes.family.r.need_help": "J'ai besoin d'aide pour leur dire",
  "wishes.family.r.team_explain":
    "Je veux que mon équipe soignante leur explique",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Guérir",
  "wishes.hopes.r.go_home": "Rentrer chez moi",
  "wishes.hopes.r.comfortable": "Être confortable",
  "wishes.hopes.r.family_ok": "Que ma famille aille bien",
  "wishes.hopes.r.more_time": "Avoir plus de temps",
  "wishes.hopes.r.peace": "Être en paix",

  // Wish sentence composition templates
  // TODO(translator): Verify "est" works for all stem + list combinations
  "wishes.compose": "{stem}, c'est {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Je vais chercher quelqu'un pour vous aider.",
  "provider.responses.interpreter": "Je vais chercher un interprète.",
  "provider.responses.family": "Je vais appeler votre famille.",
  "provider.responses.get_that": "Je vais vous l'apporter.",
  "provider.responses.doctor_know": "Je vais prévenir le médecin.",
  "provider.responses.medication": "Je vais chercher votre médicament.",
  "provider.responses.family_coming": "Votre famille est en route.",
  "provider.responses.doctor_soon": "Le médecin arrive bientôt.",
  "provider.responses.doing_well": "Vous allez bien.",
  "provider.responses.rest": "Essayez de vous reposer.",

  "provider.questions.feeling": "Comment vous sentez-vous ?",
  "provider.questions.need": "Avez-vous besoin de quelque chose ?",
  "provider.questions.where_hurts":
    "Pouvez-vous me montrer où vous avez mal ?",
  "provider.questions.rate_pain": "Évaluez votre douleur de 0 à 10.",
  "provider.questions.sleep": "Avez-vous bien dormi ?",
  "provider.questions.comfortable": "Êtes-vous confortable ?",

  "provider.directions.procedure":
    "Votre intervention est prévue aujourd'hui.",
  "provider.directions.stay_in_bed": "Vous devez rester au lit.",
  "provider.directions.vitals": "Je vais vérifier vos signes vitaux.",
  "provider.directions.medication_time": "C'est l'heure de votre médicament.",
  "provider.directions.breathe": "Essayez de respirer profondément.",
  "provider.directions.call_button":
    "Appuyez sur le bouton d'appel si vous avez besoin de quelque chose.",

  "provider.goals_of_care.matters_most":
    "J'aimerais parler de ce qui compte le plus pour vous.",
  "provider.goals_of_care.goals":
    "Quels sont vos objectifs les plus importants en ce moment ?",
  "provider.goals_of_care.worries":
    "Quelles sont vos plus grandes inquiétudes ?",
  "provider.goals_of_care.strength": "Qu'est-ce qui vous donne de la force ?",
  "provider.goals_of_care.joy":
    "Qu'est-ce qui donne de la joie et du sens à votre vie ?",
  "provider.goals_of_care.wishes":
    "Vos proches connaissent-ils vos souhaits ?",
  "provider.goals_of_care.hopes": "Quels sont vos espoirs ?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "J'ai bien dormi",
  "time.morning.didnt_sleep": "J'ai mal dormi",
  "time.morning.breakfast": "J'ai besoin de déjeuner",
  "time.morning.doctor_coming": "Quand vient le médecin ?",

  "time.afternoon.tired": "Je suis fatigué",
  "time.afternoon.lunch": "Puis-je avoir mon repas ?",
  "time.afternoon.see_family": "Quand pourrai-je voir ma famille ?",
  "time.afternoon.rest": "J'ai besoin de me reposer",

  "time.evening.cant_sleep": "Je n'arrive pas à dormir",
  "time.evening.medication": "J'ai besoin de mon médicament",
  "time.evening.call_family": "Puis-je appeler ma famille ?",
  "time.evening.pain": "J'ai mal",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // French grammar (elision, partitive articles) may not compose cleanly — review each path.
  // Known issue: "Je suis" + "j'ai froid/j'ai faim/j'ai mal" produces ungrammatical output.
  // Translator must decide: use adjective-only fragments (but "froid" = cold-hearted), or restructure the starter.
  "suggest.start.i_am": "Je suis",
  "suggest.start.i_feel": "Je me sens",
  "suggest.start.i_want": "Je veux",
  "suggest.start.i_need": "J'ai besoin de",
  "suggest.start.please": "S'il vous plaît",
  "suggest.start.when": "Quand",
  "suggest.start.can_you": "Pouvez-vous",
  "suggest.start.tell_me": "Dites-moi",

  "suggest.i_am.in_pain": "j'ai mal",
  "suggest.i_am.cold": "j'ai froid",
  "suggest.i_am.hot": "j'ai chaud",
  "suggest.i_am.hungry": "j'ai faim",
  "suggest.i_am.thirsty": "j'ai soif",
  "suggest.i_am.tired": "fatigué",
  "suggest.i_am.uncomfortable": "mal installé",
  "suggest.i_am.okay": "bien",
  "suggest.i_am.not_okay": "pas bien",
  "suggest.i_am.ready": "prêt",

  "suggest.i_feel.scared": "effrayé",
  "suggest.i_feel.sick": "malade",
  "suggest.i_feel.dizzy": "étourdi",
  "suggest.i_feel.weak": "faible",
  "suggest.i_feel.better": "mieux",
  "suggest.i_feel.worse": "moins bien",
  "suggest.i_feel.nauseous": "nauséeux",
  "suggest.i_feel.lonely": "seul",
  "suggest.i_feel.confused": "confus",
  "suggest.i_feel.safe": "en sécurité",

  "suggest.i_feel_scared.procedure": "à cause de l'intervention",
  "suggest.i_feel_scared.happening": "à cause de ce qui se passe",
  "suggest.i_feel_scared.alone": "d'être seul",
  "suggest.i_feel_scared.need_someone": "et j'ai besoin de quelqu'un",

  "suggest.i_feel_sick.stomach": "au ventre",
  "suggest.i_feel_sick.dizzy": "et étourdi",
  "suggest.i_feel_sick.help": "et j'ai besoin d'aide",

  "suggest.i_want.water": "de l'eau",
  "suggest.i_want.family": "ma famille",
  "suggest.i_want.go_home": "rentrer chez moi",
  "suggest.i_want.sleep": "dormir",
  "suggest.i_want.medication": "mon médicament",
  "suggest.i_want.blanket": "une couverture",
  "suggest.i_want.talk": "parler à quelqu'un",
  "suggest.i_want.nurse": "l'infirmière",

  "suggest.i_want_to_go.home": "chez moi",
  "suggest.i_want_to_go.sleep": "dormir",
  "suggest.i_want_to_go.bathroom": "aux toilettes",

  "suggest.i_want_my.family": "famille",
  "suggest.i_want_my.medication": "médicament",
  "suggest.i_want_my.phone": "téléphone",
  "suggest.i_want_my.glasses": "lunettes",
  "suggest.i_want_my.blanket": "couverture",

  "suggest.i_need.help": "aide",
  "suggest.i_need.water": "eau",
  "suggest.i_need.bathroom": "les toilettes",
  "suggest.i_need.medication": "mon médicament",
  "suggest.i_need.nurse": "l'infirmière",
  "suggest.i_need.doctor": "le médecin",
  "suggest.i_need.rest": "me reposer",
  "suggest.i_need.blanket": "une couverture",
  "suggest.i_need.suction": "une aspiration",

  "suggest.i_need_the.nurse": "infirmière",
  "suggest.i_need_the.doctor": "médecin",
  "suggest.i_need_the.bathroom": "toilettes",
  "suggest.i_need_the.light_off": "éteindre la lumière",
  "suggest.i_need_the.light_on": "allumer la lumière",

  "suggest.i_need_my.medication": "médicament",
  "suggest.i_need_my.family": "famille",
  "suggest.i_need_my.glasses": "lunettes",
  "suggest.i_need_my.phone": "téléphone",

  "suggest.please.help_me": "aidez-moi",
  "suggest.please.call_family": "appelez ma famille",
  "suggest.please.light_off": "éteignez la lumière",
  "suggest.please.adjust_bed": "ajustez mon lit",
  "suggest.please.give_me": "donnez-moi",
  "suggest.please.explain": "expliquez",
  "suggest.please.come_back": "revenez bientôt",
  "suggest.please.stay": "restez avec moi",
  "suggest.please.dont_leave": "ne partez pas",

  "suggest.please_help_me.pain": "J'ai mal",
  "suggest.please_help_me.breathe": "Je ne peux pas respirer",
  "suggest.please_help_me.sick": "Je me sens mal",
  "suggest.please_help_me.scared": "J'ai peur",

  "suggest.please_give_me.water": "de l'eau",
  "suggest.please_give_me.medication": "mon médicament",
  "suggest.please_give_me.blanket": "une couverture",
  "suggest.please_give_me.pain_relief": "quelque chose contre la douleur",

  "suggest.when.go_home": "pourrai-je rentrer chez moi ?",
  "suggest.when.family": "ma famille vient-elle ?",
  "suggest.when.medication": "est mon prochain médicament ?",
  "suggest.when.doctor": "vient le médecin ?",
  "suggest.when.eat": "pourrai-je manger ?",
  "suggest.when.over": "est-ce que ce sera fini ?",

  "suggest.can_you.help": "m'aider ?",
  "suggest.can_you.call_family": "appeler ma famille ?",
  "suggest.can_you.get_nurse": "appeler l'infirmière ?",
  "suggest.can_you.explain": "m'expliquer ce qui se passe ?",
  "suggest.can_you.light_off": "éteindre la lumière ?",
  "suggest.can_you.adjust_bed": "ajuster mon lit ?",
  "suggest.can_you.stay": "rester avec moi ?",

  "suggest.tell_me.happening": "ce qui se passe",
  "suggest.tell_me.time": "quelle heure il est",
  "suggest.tell_me.go_home": "quand je pourrai rentrer",
  "suggest.tell_me.day": "quel jour on est",
  "suggest.tell_me.treatment": "mon traitement",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "aidez-moi s'il vous plaît",
  "suggest.i_am_in_pain.worse": "et ça empire",
  "suggest.i_am_in_pain.medication": "et j'ai besoin d'un médicament",
  "suggest.i_am_in_pain.back": "dans le dos",
  "suggest.i_am_in_pain.chest": "dans la poitrine",
  "suggest.i_am_in_pain.stomach": "au ventre",

  "suggest.i_need_help.up": "pour me lever",
  "suggest.i_need_help.breathing": "pour respirer",
  "suggest.i_need_help.pain": "avec la douleur",
  "suggest.i_need_help.now": "tout de suite",
  "suggest.i_need_help.please": "s'il vous plaît",

  "suggest.i_feel_better.than_before": "qu'avant",
  "suggest.i_feel_better.now": "maintenant",
  "suggest.i_feel_better.thanks": "merci",

  "suggest.i_feel_worse.than_before": "qu'avant",
  "suggest.i_feel_worse.need_doctor": "J'ai besoin du médecin",
  "suggest.i_feel_worse.help": "aidez-moi s'il vous plaît",
  "suggest.i_feel_worse.medication": "J'ai besoin d'un médicament",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Je me sens",
  "suggest.ctx.feeling.i_am": "Je suis",
  "suggest.ctx.feeling.better": "Mieux qu'avant",
  "suggest.ctx.feeling.not_great": "Pas très bien",
  "suggest.ctx.feeling.pain": "J'ai mal",
  "suggest.ctx.feeling.okay": "Ça va",
  "suggest.ctx.feeling.help": "Pouvez-vous m'aider ?",

  "suggest.ctx.need.i_need": "J'ai besoin de",
  "suggest.ctx.need.i_want": "Je veux",
  "suggest.ctx.need.fine": "Ça va pour le moment",
  "suggest.ctx.need.yes": "Oui, s'il vous plaît",
  "suggest.ctx.need.no": "Non merci",
  "suggest.ctx.need.stay": "Pouvez-vous rester ?",

  "suggest.ctx.where_hurts.head": "La tête",
  "suggest.ctx.where_hurts.chest": "La poitrine",
  "suggest.ctx.where_hurts.stomach": "Le ventre",
  "suggest.ctx.where_hurts.back": "Le dos",
  "suggest.ctx.where_hurts.left_arm": "Le bras gauche",
  "suggest.ctx.where_hurts.right_leg": "La jambe droite",
  "suggest.ctx.where_hurts.everywhere": "Partout",

  "suggest.ctx.pain.very_bad": "C'est très fort",
  "suggest.ctx.pain.worse": "Ça empire",
  "suggest.ctx.pain.same": "C'est à peu près pareil",
  "suggest.ctx.pain.little_better": "C'est un peu mieux",
  "suggest.ctx.pain.need_relief": "J'ai besoin de quelque chose contre la douleur",

  "suggest.ctx.comfort.comfortable": "Je suis confortable",
  "suggest.ctx.comfort.not_comfortable": "Je ne suis pas confortable",
  "suggest.ctx.comfort.cant_sleep": "Je n'arrive pas à dormir",
  "suggest.ctx.comfort.cold": "J'ai froid",
  "suggest.ctx.comfort.hot": "J'ai chaud",
  "suggest.ctx.comfort.adjust_bed": "Pouvez-vous ajuster mon lit ?",

  "suggest.ctx.night.cant_sleep": "Je n'arrive pas à dormir",
  "suggest.ctx.night.i_need": "J'ai besoin de",
  "suggest.ctx.night.pain": "J'ai mal",
  "suggest.ctx.night.i_feel": "Je me sens",
  "suggest.ctx.night.can_you": "Pouvez-vous",
  "suggest.ctx.night.please": "S'il vous plaît",
  "suggest.ctx.night.i_am": "Je suis",
  "suggest.ctx.night.when": "Quand",

  "suggest.ctx.morning.i_am": "Je suis",
  "suggest.ctx.morning.i_need": "J'ai besoin de",
  "suggest.ctx.morning.i_feel": "Je me sens",
  "suggest.ctx.morning.doctor": "Quand vient le médecin ?",
  "suggest.ctx.morning.i_want": "Je veux",
  "suggest.ctx.morning.can_you": "Pouvez-vous",
  "suggest.ctx.morning.please": "S'il vous plaît",
  "suggest.ctx.morning.tell_me": "Dites-moi",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Rapide",
  "cat.needs": "Besoin",
  "cat.feelings": "Ressenti",
  "cat.pain": "Douleur",
  "cat.questions": "Questions",
  "sub.comfort": "Confort",
  "sub.medical": "Médical",
  "sub.people": "Proches",
  "sub.hygiene": "Hygiène",
  "sub.physical": "Physique",
  "sub.emotional": "Émotionnel",

  // Provider category labels
  "provider.cat.responses": "Réponses",
  "provider.cat.questions": "Questions",
  "provider.cat.directions": "Consignes",
  "provider.cat.goals_of_care": "Objectifs de soins",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — conversation de {name}",
  "ui.patient.app.name_fallback": "Patient",
  "ui.patient.header.name_fallback": "Patient",
  "ui.patient.header.bed_prefix": "Lit ",
  "ui.dual.nav.wishes": "Souhaits",
  "ui.dual.nav.listen": "Écouter",
  "ui.provider.nav.staff": "Personnel",
  "ui.provider.nav.switch_patient": "Changer de patient",
  "ui.provider.nav.settings": "Paramètres",
  "ui.provider.nav.theme.auto": "Auto",
  "ui.provider.nav.theme.light": "Clair",
  "ui.provider.nav.theme.dark": "Sombre",
  "ui.patient.tabbar.say_more": "En dire plus",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Quelle est l'intensité de votre douleur ?",
  "ui.dual.pain.heading.location": "Où avez-vous mal ?",
  "ui.dual.pain.heading.descriptor": "Comment décririez-vous la douleur ?",
  "ui.patient.pain.step_of": "Étape {n} sur {total}",
  "ui.patient.pain.back_to": "Retour à {label}",
  "ui.patient.pain.level_aria": "Niveau de douleur {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Souhaits de {name}",
  "ui.patient.wishes.my_wishes": "Mes souhaits",
  "ui.patient.wishes.step_of": "Étape {n} sur {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Aucun souhait n'a été partagé.",
  "ui.patient.wishes.share_all_again": "Partager tous les souhaits à nouveau",
  "ui.patient.wishes.close": "Fermer",
  "ui.patient.wishes.speak": "Parler",
  "ui.patient.wishes.back": "Retour",
  "ui.patient.wishes.skip": "Passer",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Touchez les mots ci-dessous ou tapez...",
  "ui.patient.builder.message_aria": "Votre message",
  "ui.patient.builder.undo": "Annuler le dernier mot",
  "ui.patient.builder.clear": "Effacer le message",
  "ui.patient.builder.refresh_ai": "Actualiser les suggestions IA",
  "ui.patient.builder.ai_thinking": "L'IA réfléchit...",
  "ui.patient.builder.no_ai_suggestions":
    "Aucune suggestion IA. Touchez actualiser pour réessayer.",
  "ui.patient.builder.ready":
    "Votre message est prêt. Touchez Parler pour l'envoyer.",
  "ui.patient.builder.speak": "Parler",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Répéter : {text}",
  "ui.dual.thread.aria_label": "Conversation",
  "ui.dual.thread.scroll_up_aria": "Faire défiler la conversation vers le haut",
  "ui.dual.thread.scroll_down_aria": "Faire défiler la conversation vers le bas",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Équipe soignante",
  "ui.provider.fallback_name": "Soignant",
  "ui.provider.speaking_to": "Parle à {name} en tant que {prov}",
  "ui.provider.patient_fallback": "patient",
  "ui.provider.close_panel": "Fermer le panneau",
  "ui.provider.select_provider": "Sélectionner {name}",
  "ui.provider.show_category": "Afficher {key}",
  "ui.provider.speak_phrase": "Dire : {phrase}",
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
  "ui.provider.listen.title": "Écouter",
  "ui.provider.listen.stop_aria": "Arrêter l'écoute",
  "ui.provider.listen.start_aria": "Touchez pour commencer l'écoute",
  "ui.provider.listen.listening": "Écoute en cours...",
  "ui.provider.listen.transcribing": "Transcription en cours...",
  "ui.provider.listen.listening_placeholder": "Écoute de la parole...",
  "ui.provider.listen.transcribing_placeholder": "Transcription de la parole...",
  "ui.provider.listen.type_placeholder": "Ou tapez ce qui a été dit...",
  "ui.provider.listen.transcript_aria": "Transcription",
  "ui.provider.listen.audio_level_aria": "Niveau audio du microphone",
  "ui.provider.listen.add_as": "Ajouter à la conversation en tant que {prov}",
  "ui.provider.listen.privacy_notice":
    "Sur l'appareil · Whisper · aucun audio ne quitte cet appareil",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "En train de parler : {text}",
  "ui.dual.speaking.patient_voice": "Votre voix",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Entrez le NIP",
  "ui.provider.pin_gate.subtitle": "Accès réservé au personnel",
  "ui.provider.pin_gate.incorrect": "NIP incorrect",
  "ui.provider.pin_gate.delete_aria": "Supprimer",
  "ui.provider.pin_gate.digit_aria": "Chiffre {n}",
  "ui.provider.pin_gate.cancel": "Annuler",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Vous allez lire une phrase à voix haute.",
  "ui.provider.voice_capture.coaching_breath":
    "Prenez quelques grandes respirations.",
  "ui.provider.voice_capture.coaching_ready": "Prêt.",
  "ui.provider.voice_capture.breathe_in": "Inspirez…",
  "ui.provider.voice_capture.breathe_out": "Expirez…",
  "ui.provider.voice_capture.creating": "Création du clone vocal...",
  "ui.provider.voice_capture.creating_from_sample":
    "Création du clone vocal à partir de l'échantillon...",
  "ui.provider.voice_capture.loading_model":
    "Chargement du modèle vocal...",
  "ui.provider.voice_capture.clone_failed": "Échec du clonage",
  "ui.provider.voice_capture.captured": "Voix capturée",
  "ui.provider.voice_capture.stop": "Arrêter",
  "ui.provider.voice_capture.play": "Lecture",
  "ui.provider.voice_capture.discard": "Supprimer l'enregistrement",
  "ui.provider.voice_capture.use_recording": "Utiliser cet enregistrement",
  "ui.provider.voice_capture.upload_file": "Importer un fichier",
  "ui.provider.voice_capture.record": "Enregistrer",
  "ui.provider.voice_capture.stop_early": "Arrêter maintenant",
  "ui.provider.voice_capture.remove": "Supprimer",
  "ui.provider.voice_capture.retry": "Réessayer",
  "ui.provider.voice_capture.done": "Terminé !",
  "ui.provider.voice_capture.cancel": "Annuler",
  "ui.provider.voice_capture.seconds_recorded": "{n}s enregistrées",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Annuler le compte à rebours de l'enregistrement",
  "ui.provider.voice_capture.stop_early_aria":
    "Arrêter l'enregistrement plus tôt",
  "ui.provider.voice_capture.audio_level_aria": "Niveau audio",
  "ui.provider.voice_capture.recording_progress_aria":
    "Progression de l'enregistrement",
  "ui.provider.voice_capture.stop_preview_aria":
    "Arrêter l'aperçu de lecture",
  "ui.provider.voice_capture.play_preview_aria":
    "Lire l'aperçu de l'enregistrement",
  "ui.provider.voice_capture.discard_aria":
    "Supprimer cet enregistrement et recommencer",
  "ui.provider.voice_capture.stop_playback_aria":
    "Arrêter la lecture de l'échantillon enregistré",
  "ui.provider.voice_capture.play_sample_aria":
    "Lire l'échantillon vocal enregistré",
  "ui.provider.voice_capture.remove_aria": "Supprimer l'échantillon vocal",
  "ui.provider.voice_capture.retry_aria":
    "Réessayer l'extraction du clone vocal",
  "ui.provider.voice_capture.upload_aria":
    "Importer un échantillon vocal depuis un fichier",
  "ui.provider.voice_capture.record_aria":
    "Enregistrer un échantillon vocal depuis le microphone",
  "ui.provider.voice_capture.err_network":
    "Impossible de joindre le modèle vocal. Vérifiez votre connexion, puis touchez Réessayer.",
  "ui.provider.voice_capture.err_timeout":
    "Le traitement vocal a pris trop de temps. Touchez Réessayer pour recommencer.",
  "ui.provider.voice_capture.err_mic_denied":
    "L'accès au microphone est bloqué. Activez-le dans les paramètres du navigateur ou importez un fichier.",
  "ui.provider.voice_capture.err_generic":
    "Nous n'avons pas pu terminer la préparation de votre voix. Touchez Réessayer pour recommencer.",
  "ui.provider.voice_capture.err_too_short":
    "L'enregistrement était trop court. Parlez pendant tout le compte à rebours, puis touchez Réessayer.",
  "ui.provider.voice_capture.err_too_noisy":
    "Le bruit ambiant était trop fort pour un clone vocal propre. Déplacez-vous dans un endroit plus calme et touchez Réessayer.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Accès au microphone refusé. Essayez d'importer un fichier.",
  "ui.provider.voice_capture.err_playback":
    "Impossible de lire l'audio.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Améliorée",
  "ui.provider.fallback_voice.enhanced_aria": "Voix neuronale améliorée",
  "ui.provider.fallback_voice.on_device_badge": "Sur l'appareil",
  "ui.provider.fallback_voice.playing": "Lecture en cours...",
  "ui.provider.fallback_voice.unavailable":
    "Les voix système ne sont pas disponibles sur cet appareil.",
  "ui.provider.fallback_voice.loading":
    "Chargement des voix disponibles...",
  "ui.provider.fallback_voice.hide_others": "Masquer les autres voix",
  "ui.provider.fallback_voice.more_voices": "Plus de voix ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Patient",
  "ui.provider.setup.steps.voice": "Voix",
  "ui.provider.setup.steps.care_team": "Équipe",
  "ui.provider.setup.steps.confirm": "Confirmer",

  "ui.provider.setup.skip": "Passer →",
  "ui.provider.setup.skip_aria": "Passer la configuration",
  "ui.provider.setup.skip_dialog.title": "Passer la configuration ?",
  "ui.provider.setup.skip_dialog.body": "Commencez à utiliser OwnVoice maintenant. Vous pouvez terminer la configuration plus tard en touchant le nom du patient dans l'en-tête.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Aucun patient ne sera ajouté.",
  "ui.provider.setup.skip_dialog.confirm": "Passer la configuration",
  "ui.provider.setup.skip_dialog.cancel": "Continuer",

  "ui.provider.setup.back": "Retour",
  "ui.provider.setup.continue": "Continuer",
  "ui.provider.setup.start": "Démarrer OwnVoice",

  "ui.provider.setup.step0.heading": "Bienvenue dans OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Configurons votre tableau de communication. Tout reste sur cet appareil.",
  "ui.provider.setup.step0.name_label": "Nom du patient",
  "ui.provider.setup.step0.name_placeholder":
    "Prénom ou nom préféré",
  "ui.provider.setup.step0.bed_label": "Lit / Chambre",
  "ui.provider.setup.step0.bed_placeholder": "ex. 4B-12",
  "ui.provider.setup.step0.language_label": "Langue",

  "ui.provider.setup.step1.heading": "Échantillon vocal",
  "ui.provider.setup.step1.body1":
    "Capturez un échantillon vocal pour qu'OwnVoice parle avec la voix du patient. Cette étape est facultative.",
  "ui.provider.setup.step1.body2":
    "Le clonage vocal s'exécute entièrement sur l'appareil. Aucun audio ne quitte cette tablette.",
  "ui.provider.setup.step1.patient_label": "Patient",
  "ui.provider.setup.step1.backup_voice_heading": "Voix de secours",
  "ui.provider.setup.step1.backup_voice_body1":
    "Choisissez une voix système à utiliser pendant le chargement du clone vocal, ou si aucun échantillon n'a été enregistré. Touchez une voix pour écouter un aperçu.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Ceci utilise la synthèse vocale intégrée de votre appareil.",

  "ui.provider.setup.step2.heading": "Équipe soignante",
  "ui.provider.setup.step2.body":
    "Ajoutez les soignants qui prendront en charge ce patient.",
  "ui.provider.setup.step2.icon_label": "Icône",
  "ui.provider.setup.step2.name_label": "Nom",
  "ui.provider.setup.step2.name_placeholder":
    "Dr Dupont, Infirmière Marie...",
  "ui.provider.setup.step2.add": "Ajouter",

  "ui.provider.setup.step3.heading": "Prêt à commencer",
  "ui.provider.setup.step3.body":
    "Vérifiez votre configuration. Vous pouvez modifier n'importe quoi plus tard dans les Paramètres.",
  "ui.provider.setup.step3.summary.patient": "Patient",
  "ui.provider.setup.step3.summary.bed": "Lit / Chambre",
  "ui.provider.setup.step3.summary.language": "Langue",
  "ui.provider.setup.step3.summary.language_default": "Français",
  "ui.provider.setup.step3.summary.voice": "Voix",
  "ui.provider.setup.step3.summary.care_team": "Équipe soignante",
  "ui.provider.setup.step3.summary.not_set": "Non défini",
  "ui.provider.setup.step3.summary.captured": "Capturée",
  "ui.provider.setup.step3.summary.not_captured": "Non capturée",
  "ui.provider.setup.step3.summary.none_added": "Aucun ajouté",
  "ui.provider.setup.step3.pin_label": "NIP du personnel (facultatif)",
  "ui.provider.setup.step3.pin_body":
    "Définissez un NIP à 4 chiffres pour protéger les paramètres du personnel soignant.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Paramètres",
  "ui.provider.settings.done": "Terminé",
  "ui.provider.settings.close_aria": "Fermer les paramètres",

  "ui.provider.patient_edit.title": "Modifier {name}",
  "ui.provider.patient_edit.title_default": "Modifier le patient",
  "ui.provider.patient_edit.close_aria": "Fermer l'éditeur de patient",
  "ui.provider.patient_pill.aria": "Modifier le patient : {name}",
  "ui.provider.nav.staff_menu": "Paramètres",
  "ui.provider.staff_sheet.title": "Personnel",
  "ui.provider.staff_sheet.close_aria": "Fermer le menu personnel",
  "ui.provider.staff_sheet.patients_description": "Changer, ajouter ou modifier des patients",
  "ui.provider.staff_sheet.settings_description": "Équipe soignante, accessibilité, hors ligne",
  "ui.provider.staff_sheet.end_session_description": "Quitter le mode personnel",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Supprimer la préparation vocale de {label} ?",
  "ui.provider.settings.voice_cache.discard_body":
    "La progression ({current} / {total} phrases) sera perdue. L'échantillon vocal enregistré est conservé — vous pourrez relancer la préparation plus tard.",
  "ui.provider.settings.voice_cache.cancel": "Annuler",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Annuler et conserver la préparation vocale",
  "ui.provider.settings.voice_cache.discard_confirm": "Supprimer",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Confirmer la suppression de la préparation vocale",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Supprimer la préparation vocale de {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "En file d'attente — la voix de {label} sera préparée ensuite ({total} phrase{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Préparation de la voix de {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "En pause — voix de {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Reprendre",
  "ui.provider.settings.voice_cache.resume_aria":
    "Reprendre la préparation vocale de {label}",
  "ui.provider.settings.voice_cache.pause": "Pause",
  "ui.provider.settings.voice_cache.pause_aria":
    "Mettre en pause la préparation vocale de {label}",
  "ui.provider.settings.voice_cache.done":
    "Clone vocal actif — les {total} phrases sont prêtes dans la voix de {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} phrase{plural} en échec pour {label}",
  "ui.provider.settings.voice_cache.retry": "Réessayer",
  "ui.provider.settings.voice_cache.retry_aria":
    "Réessayer les phrases en échec du cache vocal",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "À propos",
  "ui.provider.settings.about.subtitle":
    "Aide à la communication AAC pour patients hospitalisés.",
  "ui.provider.settings.about.attribution_1":
    "Échelle de douleur : Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Objectifs de soins : SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Cache SW :",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Réinitialiser",
  "ui.provider.settings.reset.action_label":
    "Réinitialiser l'application pour un nouveau patient",
  "ui.provider.settings.reset.confirm_title": "Êtes-vous sûr ?",
  "ui.provider.settings.reset.confirm_body":
    "Ceci effacera toutes les données du patient, les échantillons vocaux, l'historique des conversations et les paramètres du personnel soignant. Cette action est irréversible.",
  "ui.provider.settings.reset.confirm_destructive": "Tout réinitialiser",
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
  "ui.provider.settings.accessibility.heading": "Accessibilité",
  "ui.provider.settings.accessibility.toggle_label":
    "Mode de saisie assistée",
  "ui.provider.settings.accessibility.toggle_description":
    "Amplifie les contours de focus, rallonge le délai de toucher et renforce le retour visuel pour les patients utilisant un trackball, joystick, curseur AssistiveTouch ou contacteur.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Pointeur externe détecté.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Envisagez d'activer le Mode de saisie assistée pour ce patient.",
  "ui.provider.settings.accessibility.keep_screen_awake_label": "Garder l'écran allumé",
  "ui.provider.settings.accessibility.keep_screen_awake_description": "Empêche l'iPad de s'assombrir ou de se verrouiller pendant qu'OwnVoice est ouvert. Désactivez pour les postes alimentés uniquement par batterie.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Patients",
  "ui.provider.settings.patients.active_remove_hint":
    "Passez à un autre patient avant de supprimer celui-ci.",
  "ui.provider.settings.patients.remove_button": "Supprimer",
  "ui.provider.settings.patients.add_patient": "+ Ajouter un patient",
  "ui.provider.settings.patients.remove_dialog.title":
    "Supprimer {name} ?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Ceci supprimera son échantillon vocal, son historique de conversation et l'audio en cache pour son clone vocal. Les clones vocaux de l'équipe soignante sont conservés pour les autres patients. Cette action est irréversible.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Supprimer",
  "ui.provider.settings.patients.active_discharge_hint":
    "Passez à un autre patient avant de faire sortir celui-ci.",
  "ui.provider.settings.patients.discharge_dialog.title": "Faire sortir {name} ?",
  "ui.provider.settings.patients.discharge_dialog.body":
    "Ceci supprime toutes ses conversations, le cache audio et les entrées du journal d'activité. Cette action est irréversible.",
  "ui.provider.settings.patients.discharge_dialog.confirm": "Faire sortir",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Équipe soignante",
  "ui.provider.settings.care_team.empty":
    "Aucun soignant ajouté pour le moment.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Informations du patient",
  "ui.provider.settings.patient_info.name_label": "Nom",
  "ui.provider.settings.patient_info.bed_label": "Lit / Chambre",
  "ui.provider.settings.patient_info.language_label": "Langue",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Langue du patient",
  "ui.provider.settings.lang.caregiver_section":
    "Langue de l'équipe soignante",
  "ui.provider.settings.lang.caregiver_helper":
    "La langue que votre équipe soignante comprend. Généralement définie une fois par appareil.",
  "ui.provider.settings.lang.change": "Changer la langue",

  "ui.provider.settings.lang.picker_title": "Choisir la langue",
  "ui.provider.settings.lang.patient_dialog.title":
    "Changer la langue du patient en {lang} ?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Votre clone vocal reste prêt — les phrases que vous touchez garderont le même son. Nous préparerons l'audio pour {providerCount} voix de l'équipe (~{estimatedMinutes} min). Vous pouvez continuer à utiliser l'application pendant ce temps.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Les clones vocaux de l'équipe soignante ne sont pas disponibles en {lang} — la voix système sera utilisée. Les enregistrements existants sont conservés au cas où vous passeriez à une langue prise en charge plus tard.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Les phrases que vous touchez garderont le même son. Aucune voix d'équipe n'est configurée, donc rien ne sera à régénérer.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Changer la langue de l'équipe soignante en {lang} ?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Les clones vocaux de votre équipe restent prêts. Nous préparerons l'audio de la voix du patient dans la nouvelle langue (~{estimatedMinutes} min). Vous pouvez continuer à utiliser l'application pendant ce temps.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Le clone vocal du patient n'est pas disponible en {lang} — la voix système sera utilisée. L'échantillon vocal enregistré du patient est conservé au cas où vous passeriez à une langue prise en charge plus tard.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Aucun clone vocal du patient n'est configuré, donc rien ne sera à régénérer.",
  "ui.provider.settings.patient_info.voice_label": "Voix",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Voix de secours",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Voix système utilisée pendant le chargement du clone vocal. Touchez pour écouter.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.activity_log.heading": "Journal d'activité",
  "ui.provider.settings.activity_log.description":
    "Évènements de parole, d'exportation et système enregistrés sur cet appareil.",
  "ui.provider.settings.offline.heading": "Diagnostic de l'application",
  "ui.provider.settings.offline.status_description":
    "État des modèles d'IA que l'application utilise sur l'appareil pour la génération vocale, les suggestions et la reconnaissance de la parole.",
  "ui.provider.settings.offline.downloading":
    "Téléchargement des modèles…",
  "ui.provider.settings.offline.download_progress_aria":
    "Progression du téléchargement des modèles",
  "ui.provider.settings.offline.all_ready":
    "Tous les modèles sont prêts",
  "ui.provider.settings.offline.redownload_button":
    "Retélécharger les modèles",
  "ui.provider.settings.offline.already_up_to_date":
    "Déjà à jour",
  "ui.provider.settings.offline.checking": "Vérification…",
  "ui.provider.settings.offline.verified": "✓ Modèles vérifiés",
  "ui.provider.settings.offline.check_button":
    "Vérifier les modèles existants",
  "ui.provider.settings.offline.redownloading":
    "Retéléchargement…",
  "ui.provider.settings.offline.force_redownload_button":
    "Forcer le retéléchargement de tous les modèles",
  "ui.provider.settings.offline.model_status_ready": "prêt",
  "ui.provider.settings.offline.model_status_downloading":
    "téléchargement…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "nouvel essai nécessaire",
  "ui.provider.settings.offline.last_verified_prefix":
    "Dernière vérification : ",
  "ui.provider.settings.offline.storage_prefix": "Stockage : ",
  "ui.provider.settings.offline.storage_of": " sur ",
  "ui.provider.settings.offline.storage_used": " utilisé",
  "ui.provider.settings.offline.storage_low": " — espace faible",
  "ui.provider.settings.offline.clear_audio_cache":
    "Vider le cache audio",
  "ui.provider.settings.offline.clearing": "Nettoyage…",
  "ui.provider.settings.offline.rebuilding":
    "Reconstruction : {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Retélécharger tous les modèles d'IA ?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Ceci retéléchargera environ 1,7 Go. La synthèse vocale continue de fonctionner pendant l'actualisation.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Retélécharger",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Changer de patient",
  "ui.provider.switch.add_patient": "+ Ajouter un patient",
  "ui.provider.patients.title": "Patients",
  "ui.provider.patients.actions_aria": "Actions pour {name}",
  "ui.provider.patients.action_edit": "Modifier",
  "ui.provider.patients.action_remove": "Supprimer",
  "ui.provider.patients.action_discharge": "Faire sortir",
  "ui.provider.switch.voice_captured": "Voix capturée",
  "ui.provider.switch.no_voice": "Pas de voix",
  "ui.provider.switch.last_active_just_now": "À l'instant",
  "ui.provider.switch.last_active_minutes":
    "Actif il y a {n} min",
  "ui.provider.switch.last_active_hours": "Actif il y a {n}h",
  "ui.provider.switch.last_active_days": "Actif il y a {n}j",
  "ui.provider.switch.currently_active": "Actuellement actif",
  "ui.provider.switch.switched_announcement":
    "Changement vers {name}. {count} messages de conversation.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "La session du personnel se termine",
  "ui.provider.staff_session.warning_body":
    "Votre accès personnel sera verrouillé dans {n} secondes.",
  "ui.provider.staff_session.extend": "Prolonger la session",
  "ui.provider.staff_session.end_now": "Terminer maintenant",
  "ui.provider.nav.end_staff_session": "Terminer la session du personnel",
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
  "ui.voice_quality.title": "Qualité vocale",
  "ui.voice_quality.label.good": "Bonne",
  "ui.voice_quality.label.ok": "Correcte",
  "ui.voice_quality.label.poor": "À améliorer",
  "ui.voice_quality.tip.snr": "Essayez d'enregistrer dans un endroit plus calme.",
  "ui.voice_quality.tip.clipping": "Éloignez-vous un peu du microphone.",
  "ui.voice_quality.tip.coverage": "Essayez de lire un peu plus longtemps.",
  "ui.voice_quality.tip.voiced_fraction": "Essayez de parler pendant toute la durée de l'enregistrement.",
  "ui.voice_quality.tip.pitch_variation": "Lisez plus naturellement — laissez votre voix monter et descendre.",
  "ui.voice_quality.tip.loudness": "Essayez de garder un volume constant.",
  "ui.voice_quality.tip.tilt_boomy": "Éloignez-vous un peu plus du microphone.",
  "ui.voice_quality.tip.tilt_tinny": "Ce micro semble manquer de basses — essayez-en un autre si possible.",
  "ui.provider.settings.voice_clone_status.extraction_failed": "Clone vocal indisponible — utilisation de la voix de secours{fallback}",
  "ui.provider.settings.voice_clone_status.retry_extraction_aria": "Réessayer l'extraction du clone vocal",
  "ui.provider.settings.voice_clone_status.quality_suffix": "qualité : {label}",
};

export default fr;
