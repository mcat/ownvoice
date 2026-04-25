/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * NOT YET registered in LOCALES — add import + map entry in phraseRegistry.ts (DRAFT).
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Italian (standard)
 * Locale: it
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const it: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Sì",
  "quick.no": "No",
  "quick.thank_you": "Grazie",
  "quick.please_wait": "Per favore attenda",
  "quick.dont_understand": "Non capisco",
  "quick.repeat": "Per favore ripeta",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Ho bisogno di acqua",
  "needs.comfort.hungry": "Ho fame",
  "needs.comfort.cold": "Ho freddo",
  "needs.comfort.hot": "Ho caldo",
  "needs.comfort.bed": "Regolate il mio letto",
  "needs.comfort.bathroom": "Ho bisogno del bagno",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Ho bisogno del mio farmaco",
  "needs.medical.suction": "Ho bisogno di aspirazione",
  "needs.medical.nauseous": "Ho la nausea",
  "needs.medical.breathe": "Non riesco a respirare bene",
  "needs.medical.nurse": "Ho bisogno dell'infermiere",
  "needs.medical.doctor": "Ho bisogno del medico",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Voglio la mia famiglia",
  "needs.people.stay": "Qualcuno può restare con me?",
  "needs.people.call": "Voglio chiamare qualcuno",
  "needs.people.interpreter": "Ho bisogno di un interprete",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Sono stanco",
  "feelings.physical.uncomfortable": "Sono a disagio",
  "feelings.physical.weak": "Mi sento debole",
  "feelings.physical.better": "Mi sento meglio",
  "feelings.physical.dizzy": "Mi gira la testa",
  "feelings.physical.itchy": "Ho prurito",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Ho paura",
  "feelings.emotional.lonely": "Mi sento solo",
  "feelings.emotional.frustrated": "Sono frustrato",
  "feelings.emotional.confused": "Sono confuso",
  "feelings.emotional.safe": "Mi sento al sicuro",
  "feelings.emotional.grateful": "Sono grato",
  "feelings.emotional.worried": "Sono preoccupato",
  "feelings.emotional.hopeful": "Ho speranza",
  "feelings.emotional.bored": "Mi annoio",
  "feelings.emotional.embarrassed": "Mi vergogno",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Che ora è?",
  "questions.day": "Che giorno è?",
  "questions.whats_happening": "Che cosa mi sta succedendo?",
  "questions.go_home": "Quando posso andare a casa?",
  "questions.next_medication": "Quando è il prossimo farmaco?",
  "questions.explain_treatment": "Può spiegarmi il trattamento?",
  "questions.nurse_today": "Chi è il mio infermiere oggi?",
  "questions.eat_drink": "Posso mangiare o bere?",
  "questions.see_family": "Quando posso vedere la mia famiglia?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Nessun dolore",
  "pain.face.2": "Fa un po' male",
  "pain.face.4": "Fa un po' più male",
  "pain.face.6": "Fa ancora più male",
  "pain.face.8": "Fa molto male",
  "pain.face.10": "Fa malissimo",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Sordo",
  "pain.descriptor.burning": "Bruciante",
  "pain.descriptor.sharp": "Acuto",
  "pain.descriptor.throbbing": "Pulsante",
  "pain.descriptor.cramping": "Crampiforme",
  "pain.descriptor.constant": "Costante",
  "pain.descriptor.comes_and_goes": "Va e viene",
  "pain.descriptor.numb": "Intorpidito",
  "pain.descriptor.pressure": "Gravativo",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Testa",
  "pain.region.face": "Viso",
  "pain.region.neck": "Collo",
  "pain.region.chest": "Petto",
  "pain.region.left_shoulder": "Spalla sinistra",
  "pain.region.right_shoulder": "Spalla destra",
  "pain.region.left_arm": "Braccio sinistro",
  "pain.region.right_arm": "Braccio destro",
  "pain.region.stomach": "Stomaco",
  "pain.region.upper_back": "Parte alta della schiena",
  "pain.region.lower_back": "Parte bassa della schiena",
  "pain.region.left_leg": "Gamba sinistra",
  "pain.region.right_leg": "Gamba destra",

  // ── Pain: Composed sentence template ───────────────────────────
  // "a livello di" is gender-agnostic — avoids article agreement with {region}
  "pain.sentence":
    "Ho un dolore {descriptor} a livello di {region}, intensità {severity} su 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Intensità",
  "pain.step.location": "Posizione",
  "pain.step.descriptor": "Descrizione",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "I miei obiettivi",
  "wishes.worries.label": "Le mie preoccupazioni",
  "wishes.strength.label": "La mia forza",
  "wishes.joy.label": "Ciò che mi dà gioia",
  "wishes.tradeoffs.label": "Il mio trattamento",
  "wishes.family.label": "La mia famiglia",
  "wishes.hopes.label": "Le mie speranze",

  // Questions (care-team → patient: Lei form)
  "wishes.goals.question": "Quali sono i Suoi obiettivi più importanti?",
  "wishes.worries.question": "Quali sono le Sue preoccupazioni maggiori?",
  "wishes.strength.question": "Che cosa Le dà forza?",
  "wishes.joy.question": "Che cosa Le dà gioia e senso nella vita?",
  "wishes.tradeoffs.question":
    "Quanto è disposto ad affrontare per avere più tempo?",
  "wishes.family.question":
    "Quanto sanno le persone a Lei più vicine dei Suoi desideri?",
  "wishes.hopes.question": "Quali sono le Sue speranze?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "Ciò che conta di più per me",
  "wishes.worries.stem": "Ciò che mi preoccupa",
  "wishes.strength.stem": "Ciò che mi dà forza",
  "wishes.joy.stem": "Ciò che mi dà gioia",
  "wishes.tradeoffs.stem": "Riguardo al mio trattamento",
  "wishes.family.stem": "Riguardo alla mia famiglia",
  "wishes.hopes.stem": "Io spero",

  // Responses — goals
  "wishes.goals.r.family": "Stare con la mia famiglia",
  "wishes.goals.r.comfort": "Stare bene e senza dolore",
  "wishes.goals.r.longevity": "Vivere il più a lungo possibile",
  "wishes.goals.r.home": "Andare a casa",
  "wishes.goals.r.independence": "Poter fare le cose da solo",
  "wishes.goals.r.peace": "Essere in pace",

  // Responses — worries
  "wishes.worries.r.suffering": "Soffrire o provare dolore",
  "wishes.worries.r.alone": "Restare solo",
  "wishes.worries.r.burden": "Essere un peso per la mia famiglia",
  "wishes.worries.r.activities": "Non poter fare le cose che mi piacciono",
  "wishes.worries.r.leaving": "Lasciare la mia famiglia",
  "wishes.worries.r.unknown": "Non sapere cosa accadrà",

  // Responses — strength
  "wishes.strength.r.family": "La mia famiglia",
  "wishes.strength.r.faith": "La mia fede",
  "wishes.strength.r.friends": "I miei amici",
  "wishes.strength.r.wishes_heard": "Sapere che i miei desideri sono ascoltati",
  "wishes.strength.r.hope": "La speranza di migliorare",
  "wishes.strength.r.carers": "Le persone che si prendono cura di me",

  // Responses — joy
  "wishes.joy.r.family": "Passare tempo con la mia famiglia",
  "wishes.joy.r.outdoors": "Stare all'aria aperta",
  "wishes.joy.r.hobbies": "I miei hobby e interessi",
  "wishes.joy.r.helping": "Aiutare gli altri",
  "wishes.joy.r.spiritual": "La mia pratica spirituale",
  "wishes.joy.r.routines": "Le semplici abitudini quotidiane",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Voglio ogni trattamento possibile",
  "wishes.tradeoffs.r.good_chance":
    "Voglio il trattamento se ha buone probabilità",
  "wishes.tradeoffs.r.try_stop":
    "Voglio provare ma fermarmi se non funziona",
  "wishes.tradeoffs.r.comfortable": "Voglio concentrarmi sullo stare bene",
  "wishes.tradeoffs.r.think": "Ho bisogno di più tempo per pensarci",
  "wishes.tradeoffs.r.family_first":
    "Devo parlarne prima con la mia famiglia",

  // Responses — family
  "wishes.family.r.know_well": "Conoscono bene i miei desideri",
  "wishes.family.r.know_some": "Conoscono alcuni dei miei desideri",
  "wishes.family.r.not_talked": "Non ne abbiamo ancora parlato",
  "wishes.family.r.need_help": "Ho bisogno di aiuto per dirglielo",
  "wishes.family.r.team_explain":
    "Vorrei che il mio team di cura lo spiegasse a loro",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Guarire",
  "wishes.hopes.r.go_home": "Andare a casa",
  "wishes.hopes.r.comfortable": "Stare bene",
  "wishes.hopes.r.family_ok": "Che la mia famiglia stia bene",
  "wishes.hopes.r.more_time": "Avere più tempo",
  "wishes.hopes.r.peace": "Essere in pace",

  // Wish sentence composition templates
  // TODO(translator): Verify "è" works for all stem + list combinations
  "wishes.compose": "{stem} è {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Chiamerò qualcuno per aiutarLa.",
  "provider.responses.interpreter": "Chiamerò un interprete.",
  "provider.responses.family": "Chiamerò la Sua famiglia.",
  "provider.responses.get_that": "Glielo porterò subito.",
  "provider.responses.doctor_know": "Avviserò il medico.",
  "provider.responses.medication": "Le porterò il farmaco.",
  "provider.responses.family_coming": "La Sua famiglia sta arrivando.",
  "provider.responses.doctor_soon": "Il medico arriverà presto.",
  "provider.responses.doing_well": "Sta andando bene.",
  "provider.responses.rest": "Cerchi di riposare ora.",

  "provider.questions.feeling": "Come si sente?",
  "provider.questions.need": "Ha bisogno di qualcosa?",
  "provider.questions.where_hurts":
    "Può indicarmi dove Le fa male?",
  "provider.questions.rate_pain": "Valuti il Suo dolore da 0 a 10.",
  "provider.questions.sleep": "Ha dormito bene?",
  "provider.questions.comfortable": "Si sente a Suo agio?",

  "provider.directions.procedure":
    "Il Suo intervento è programmato per oggi.",
  "provider.directions.stay_in_bed": "Deve restare a letto.",
  "provider.directions.vitals": "Controllo i Suoi parametri vitali.",
  "provider.directions.medication_time": "È l'ora del farmaco.",
  "provider.directions.breathe": "Cerchi di fare respiri profondi.",
  "provider.directions.call_button":
    "Prema il pulsante di chiamata se ha bisogno di qualcosa.",

  "provider.goals_of_care.matters_most":
    "Vorrei parlare di ciò che è più importante per Lei.",
  "provider.goals_of_care.goals":
    "Quali sono i Suoi obiettivi più importanti in questo momento?",
  "provider.goals_of_care.worries":
    "Quali sono le Sue preoccupazioni maggiori?",
  "provider.goals_of_care.strength": "Che cosa Le dà forza?",
  "provider.goals_of_care.joy":
    "Che cosa Le dà gioia e senso nella vita?",
  "provider.goals_of_care.wishes":
    "Quanto sanno i Suoi cari dei Suoi desideri?",
  "provider.goals_of_care.hopes": "Quali sono le Sue speranze?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Ho dormito bene",
  "time.morning.didnt_sleep": "Non ho dormito bene",
  "time.morning.breakfast": "Ho bisogno della colazione",
  "time.morning.doctor_coming": "Quando arriva il medico?",

  "time.afternoon.tired": "Sono stanco",
  "time.afternoon.lunch": "Posso pranzare?",
  "time.afternoon.see_family": "Quando posso vedere la mia famiglia?",
  "time.afternoon.rest": "Ho bisogno di riposare",

  "time.evening.cant_sleep": "Non riesco a dormire",
  "time.evening.medication": "Ho bisogno del mio farmaco",
  "time.evening.call_family": "Posso chiamare la mia famiglia?",
  "time.evening.pain": "Ho dolore",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Italian verb conjugation may not compose cleanly — review each path.
  "suggest.start.i_am": "Sono",
  "suggest.start.i_feel": "Mi sento",
  "suggest.start.i_want": "Voglio",
  "suggest.start.i_need": "Ho bisogno di",
  "suggest.start.please": "Per favore",
  "suggest.start.when": "Quando",
  "suggest.start.can_you": "Può",
  "suggest.start.tell_me": "Mi dica",

  "suggest.i_am.in_pain": "con dolore",
  "suggest.i_am.cold": "infreddolito",
  "suggest.i_am.hot": "accaldato",
  "suggest.i_am.hungry": "affamato",
  "suggest.i_am.thirsty": "assetato",
  "suggest.i_am.tired": "stanco",
  "suggest.i_am.uncomfortable": "a disagio",
  "suggest.i_am.okay": "bene",
  "suggest.i_am.not_okay": "male",
  "suggest.i_am.ready": "pronto",

  "suggest.i_feel.scared": "spaventato",
  "suggest.i_feel.sick": "malato",
  "suggest.i_feel.dizzy": "stordito",
  "suggest.i_feel.weak": "debole",
  "suggest.i_feel.better": "meglio",
  "suggest.i_feel.worse": "peggio",
  "suggest.i_feel.nauseous": "nauseato",
  "suggest.i_feel.lonely": "solo",
  "suggest.i_feel.confused": "confuso",
  "suggest.i_feel.safe": "al sicuro",

  "suggest.i_feel_scared.procedure": "per l'intervento",
  "suggest.i_feel_scared.happening": "per quello che sta succedendo",
  "suggest.i_feel_scared.alone": "di restare solo",
  "suggest.i_feel_scared.need_someone": "e ho bisogno di qualcuno",

  "suggest.i_feel_sick.stomach": "allo stomaco",
  "suggest.i_feel_sick.dizzy": "e stordito",
  "suggest.i_feel_sick.help": "e ho bisogno di aiuto",

  "suggest.i_want.water": "acqua",
  "suggest.i_want.family": "la mia famiglia",
  "suggest.i_want.go_home": "andare a casa",
  "suggest.i_want.sleep": "dormire",
  "suggest.i_want.medication": "il mio farmaco",
  "suggest.i_want.blanket": "una coperta",
  "suggest.i_want.talk": "parlare con qualcuno",
  "suggest.i_want.nurse": "l'infermiere",

  "suggest.i_want_to_go.home": "a casa",
  "suggest.i_want_to_go.sleep": "a dormire",
  "suggest.i_want_to_go.bathroom": "in bagno",

  "suggest.i_want_my.family": "famiglia",
  "suggest.i_want_my.medication": "farmaco",
  "suggest.i_want_my.phone": "telefono",
  "suggest.i_want_my.glasses": "occhiali",
  "suggest.i_want_my.blanket": "coperta",

  "suggest.i_need.help": "aiuto",
  "suggest.i_need.water": "acqua",
  "suggest.i_need.bathroom": "il bagno",
  "suggest.i_need.medication": "il mio farmaco",
  "suggest.i_need.nurse": "l'infermiere",
  "suggest.i_need.doctor": "il medico",
  "suggest.i_need.rest": "riposare",
  "suggest.i_need.blanket": "una coperta",
  "suggest.i_need.suction": "aspirazione",

  "suggest.i_need_the.nurse": "infermiere",
  "suggest.i_need_the.doctor": "medico",
  "suggest.i_need_the.bathroom": "bagno",
  "suggest.i_need_the.light_off": "luce spenta",
  "suggest.i_need_the.light_on": "luce accesa",

  "suggest.i_need_my.medication": "farmaco",
  "suggest.i_need_my.family": "famiglia",
  "suggest.i_need_my.glasses": "occhiali",
  "suggest.i_need_my.phone": "telefono",

  "suggest.please.help_me": "mi aiuti",
  "suggest.please.call_family": "chiami la mia famiglia",
  "suggest.please.light_off": "spenga la luce",
  "suggest.please.adjust_bed": "regoli il mio letto",
  "suggest.please.give_me": "mi dia",
  "suggest.please.explain": "mi spieghi",
  "suggest.please.come_back": "torni presto",
  "suggest.please.stay": "resti con me",
  "suggest.please.dont_leave": "non se ne vada",

  "suggest.please_help_me.pain": "Ho dolore",
  "suggest.please_help_me.breathe": "Non riesco a respirare",
  "suggest.please_help_me.sick": "Mi sento male",
  "suggest.please_help_me.scared": "Ho paura",

  "suggest.please_give_me.water": "acqua",
  "suggest.please_give_me.medication": "il mio farmaco",
  "suggest.please_give_me.blanket": "una coperta",
  "suggest.please_give_me.pain_relief": "qualcosa per il dolore",

  "suggest.when.go_home": "posso andare a casa?",
  "suggest.when.family": "arriva la mia famiglia?",
  "suggest.when.medication": "è il prossimo farmaco?",
  "suggest.when.doctor": "arriva il medico?",
  "suggest.when.eat": "posso mangiare?",
  "suggest.when.over": "finirà?",

  "suggest.can_you.help": "aiutarmi?",
  "suggest.can_you.call_family": "chiamare la mia famiglia?",
  "suggest.can_you.get_nurse": "chiamare l'infermiere?",
  "suggest.can_you.explain": "spiegarmi cosa sta succedendo?",
  "suggest.can_you.light_off": "spegnere la luce?",
  "suggest.can_you.adjust_bed": "regolare il mio letto?",
  "suggest.can_you.stay": "restare con me?",

  "suggest.tell_me.happening": "cosa sta succedendo",
  "suggest.tell_me.time": "che ora è",
  "suggest.tell_me.go_home": "quando posso andare a casa",
  "suggest.tell_me.day": "che giorno è",
  "suggest.tell_me.treatment": "del mio trattamento",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "per favore mi aiuti",
  "suggest.i_am_in_pain.worse": "e sta peggiorando",
  "suggest.i_am_in_pain.medication": "e ho bisogno di un farmaco",
  "suggest.i_am_in_pain.back": "alla schiena",
  "suggest.i_am_in_pain.chest": "al petto",
  "suggest.i_am_in_pain.stomach": "allo stomaco",

  "suggest.i_need_help.up": "ad alzarmi",
  "suggest.i_need_help.breathing": "a respirare",
  "suggest.i_need_help.pain": "con il dolore",
  "suggest.i_need_help.now": "subito",
  "suggest.i_need_help.please": "per favore",

  "suggest.i_feel_better.than_before": "di prima",
  "suggest.i_feel_better.now": "adesso",
  "suggest.i_feel_better.thanks": "grazie",

  "suggest.i_feel_worse.than_before": "di prima",
  "suggest.i_feel_worse.need_doctor": "Ho bisogno del medico",
  "suggest.i_feel_worse.help": "per favore mi aiuti",
  "suggest.i_feel_worse.medication": "Ho bisogno di un farmaco",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Mi sento",
  "suggest.ctx.feeling.i_am": "Sono",
  "suggest.ctx.feeling.better": "Meglio di prima",
  "suggest.ctx.feeling.not_great": "Non molto bene",
  "suggest.ctx.feeling.pain": "Ho dolore",
  "suggest.ctx.feeling.okay": "Sto bene",
  "suggest.ctx.feeling.help": "Può aiutarmi?",

  "suggest.ctx.need.i_need": "Ho bisogno di",
  "suggest.ctx.need.i_want": "Voglio",
  "suggest.ctx.need.fine": "Sto bene per ora",
  "suggest.ctx.need.yes": "Sì, per favore",
  "suggest.ctx.need.no": "No, grazie",
  "suggest.ctx.need.stay": "Può restare?",

  "suggest.ctx.where_hurts.head": "La testa",
  "suggest.ctx.where_hurts.chest": "Il petto",
  "suggest.ctx.where_hurts.stomach": "Lo stomaco",
  "suggest.ctx.where_hurts.back": "La schiena",
  "suggest.ctx.where_hurts.left_arm": "Il braccio sinistro",
  "suggest.ctx.where_hurts.right_leg": "La gamba destra",
  "suggest.ctx.where_hurts.everywhere": "Dappertutto",

  "suggest.ctx.pain.very_bad": "È molto forte",
  "suggest.ctx.pain.worse": "Sta peggiorando",
  "suggest.ctx.pain.same": "È uguale",
  "suggest.ctx.pain.little_better": "È un po' meglio",
  "suggest.ctx.pain.need_relief": "Ho bisogno di qualcosa per il dolore",

  "suggest.ctx.comfort.comfortable": "Sto bene",
  "suggest.ctx.comfort.not_comfortable": "Non sto bene",
  "suggest.ctx.comfort.cant_sleep": "Non riesco a dormire",
  "suggest.ctx.comfort.cold": "Ho freddo",
  "suggest.ctx.comfort.hot": "Ho caldo",
  "suggest.ctx.comfort.adjust_bed": "Può regolare il mio letto?",

  "suggest.ctx.night.cant_sleep": "Non riesco a dormire",
  "suggest.ctx.night.i_need": "Ho bisogno di",
  "suggest.ctx.night.pain": "Ho dolore",
  "suggest.ctx.night.i_feel": "Mi sento",
  "suggest.ctx.night.can_you": "Può",
  "suggest.ctx.night.please": "Per favore",
  "suggest.ctx.night.i_am": "Sono",
  "suggest.ctx.night.when": "Quando",

  "suggest.ctx.morning.i_am": "Sono",
  "suggest.ctx.morning.i_need": "Ho bisogno di",
  "suggest.ctx.morning.i_feel": "Mi sento",
  "suggest.ctx.morning.doctor": "Quando arriva il medico?",
  "suggest.ctx.morning.i_want": "Voglio",
  "suggest.ctx.morning.can_you": "Può",
  "suggest.ctx.morning.please": "Per favore",
  "suggest.ctx.morning.tell_me": "Mi dica",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Rapido",
  "cat.needs": "Ho bisogno",
  "cat.feelings": "Mi sento",
  "cat.pain": "Dolore",
  "cat.questions": "Domande",
  "sub.comfort": "Comfort",
  "sub.medical": "Medico",
  "sub.people": "Persone",
  "sub.physical": "Fisico",
  "sub.emotional": "Emotivo",

  // Provider category labels
  "provider.cat.responses": "Risposte",
  "provider.cat.questions": "Domande",
  "provider.cat.directions": "Indicazioni",
  "provider.cat.goals_of_care": "Obiettivi di cura",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — conversazione di {name}",
  "ui.patient.app.name_fallback": "Paziente",
  "ui.patient.header.name_fallback": "Paziente",
  "ui.patient.header.bed_prefix": "Letto ",
  "ui.dual.nav.wishes": "Desideri",
  "ui.dual.nav.listen": "Ascolta",
  "ui.provider.nav.staff": "Personale",
  "ui.provider.nav.switch_patient": "Cambia paziente",
  "ui.provider.nav.settings": "Impostazioni",
  "ui.provider.nav.theme.auto": "Automatico",
  "ui.provider.nav.theme.light": "Chiaro",
  "ui.provider.nav.theme.dark": "Scuro",
  "ui.patient.tabbar.say_more": "Altro",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Quanto dolore ha?",
  "ui.dual.pain.heading.location": "Dove fa male?",
  "ui.dual.pain.heading.descriptor": "Come è il dolore?",
  "ui.patient.pain.step_of": "Passo {n} di {total}",
  "ui.patient.pain.back_to": "Torna a {label}",
  "ui.patient.pain.level_aria": "Livello di dolore {n}, {label}",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Desideri di {name}",
  "ui.patient.wishes.my_wishes": "I miei desideri",
  "ui.patient.wishes.step_of": "Passo {n} di {total}",
  "ui.patient.wishes.none_shared": "Nessun desiderio condiviso.",
  "ui.patient.wishes.share_all_again": "Condividi tutti i desideri di nuovo",
  "ui.patient.wishes.close": "Chiudi",
  "ui.patient.wishes.share": "Condividi",
  "ui.patient.wishes.skip": "Salta",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Tocca le parole sotto o scrivi...",
  "ui.patient.builder.message_aria": "Il tuo messaggio",
  "ui.patient.builder.undo": "Annulla ultima parola",
  "ui.patient.builder.clear": "Cancella messaggio",
  "ui.patient.builder.refresh_ai": "Aggiorna suggerimenti IA",
  "ui.patient.builder.ai_thinking": "L'IA sta pensando...",
  "ui.patient.builder.no_ai_suggestions":
    "Nessun suggerimento IA. Tocca aggiorna per riprovare.",
  "ui.patient.builder.ready":
    "Il messaggio è pronto. Tocca Parla per inviare.",
  "ui.patient.builder.speak": "Parla",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Ripeti: {text}",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Team di cura",
  "ui.provider.fallback_name": "Operatore",
  "ui.provider.speaking_to": "Parlando con {name} come {prov}",
  "ui.provider.patient_fallback": "paziente",
  "ui.provider.close_panel": "Chiudi pannello",
  "ui.provider.select_provider": "Seleziona {name}",
  "ui.provider.show_category": "Mostra {key}",
  "ui.provider.speak_phrase": "Pronuncia: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Ascolta",
  "ui.provider.listen.stop_aria": "Interrompi ascolto",
  "ui.provider.listen.start_aria": "Tocca per iniziare ad ascoltare",
  "ui.provider.listen.listening": "In ascolto...",
  "ui.provider.listen.transcribing": "Trascrivendo...",
  "ui.provider.listen.listening_placeholder": "In ascolto del parlato...",
  "ui.provider.listen.transcribing_placeholder": "Trascrizione del parlato...",
  "ui.provider.listen.type_placeholder": "Oppure scrivi ciò che è stato detto...",
  "ui.provider.listen.transcript_aria": "Trascrizione",
  "ui.provider.listen.add_as": "Aggiungi alla conversazione come {prov}",
  "ui.provider.listen.privacy_notice":
    "Sul dispositivo · Whisper · nessun audio esce da questo dispositivo",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Sta parlando: {text}",
  "ui.dual.speaking.patient_voice": "La tua voce",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Inserisci PIN",
  "ui.provider.pin_gate.subtitle": "Solo accesso personale sanitario",
  "ui.provider.pin_gate.incorrect": "PIN errato",
  "ui.provider.pin_gate.delete_aria": "Cancella",
  "ui.provider.pin_gate.digit_aria": "Cifra {n}",
  "ui.provider.pin_gate.cancel": "Annulla",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Leggerà una frase ad alta voce.",
  "ui.provider.voice_capture.coaching_breath":
    "Faccia qualche respiro profondo.",
  "ui.provider.voice_capture.coaching_ready": "Pronto.",
  "ui.provider.voice_capture.breathe_in": "Inspiri…",
  "ui.provider.voice_capture.breathe_out": "Espiri…",
  "ui.provider.voice_capture.creating": "Creazione del clone vocale...",
  "ui.provider.voice_capture.creating_from_sample":
    "Creazione del clone vocale dal campione...",
  "ui.provider.voice_capture.loading_model":
    "Caricamento del modello vocale...",
  "ui.provider.voice_capture.clone_failed": "Clonazione non riuscita",
  "ui.provider.voice_capture.captured": "Voce acquisita",
  "ui.provider.voice_capture.stop": "Interrompi",
  "ui.provider.voice_capture.play": "Riproduci",
  "ui.provider.voice_capture.discard": "Scarta registrazione",
  "ui.provider.voice_capture.use_recording": "Usa questa registrazione",
  "ui.provider.voice_capture.upload_file": "Carica file",
  "ui.provider.voice_capture.record": "Registra",
  "ui.provider.voice_capture.stop_early": "Interrompi prima",
  "ui.provider.voice_capture.remove": "Rimuovi",
  "ui.provider.voice_capture.retry": "Riprova",
  "ui.provider.voice_capture.done": "Fatto!",
  "ui.provider.voice_capture.cancel": "Annulla",
  "ui.provider.voice_capture.seconds_recorded": "{n}s registrati",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Annulla conto alla rovescia della registrazione",
  "ui.provider.voice_capture.stop_early_aria":
    "Interrompi registrazione in anticipo",
  "ui.provider.voice_capture.audio_level_aria": "Livello audio",
  "ui.provider.voice_capture.recording_progress_aria":
    "Avanzamento registrazione",
  "ui.provider.voice_capture.stop_preview_aria":
    "Interrompi anteprima riproduzione",
  "ui.provider.voice_capture.play_preview_aria":
    "Riproduci anteprima registrazione",
  "ui.provider.voice_capture.discard_aria":
    "Scarta questa registrazione e ricomincia",
  "ui.provider.voice_capture.stop_playback_aria":
    "Interrompi riproduzione del campione registrato",
  "ui.provider.voice_capture.play_sample_aria":
    "Riproduci campione vocale registrato",
  "ui.provider.voice_capture.remove_aria": "Rimuovi campione vocale",
  "ui.provider.voice_capture.retry_aria":
    "Riprova estrazione clone vocale",
  "ui.provider.voice_capture.upload_aria":
    "Carica campione vocale da file",
  "ui.provider.voice_capture.record_aria":
    "Registra campione vocale dal microfono",
  "ui.provider.voice_capture.err_network":
    "Impossibile raggiungere il modello vocale. Verifichi la connessione e tocchi Riprova.",
  "ui.provider.voice_capture.err_timeout":
    "L'elaborazione vocale ha impiegato troppo tempo. Tocchi Riprova per riprovare.",
  "ui.provider.voice_capture.err_mic_denied":
    "L'accesso al microfono è bloccato. Lo abiliti nelle impostazioni del browser oppure carichi un file.",
  "ui.provider.voice_capture.err_generic":
    "Non è stato possibile completare la preparazione della voce. Tocchi Riprova per riprovare.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Accesso al microfono negato. Provi a caricare un file.",
  "ui.provider.voice_capture.err_playback":
    "Impossibile riprodurre l'audio.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Avanzata",
  "ui.provider.fallback_voice.enhanced_aria": "Voce neurale avanzata",
  "ui.provider.fallback_voice.on_device_badge": "Sul dispositivo",
  "ui.provider.fallback_voice.playing": "In riproduzione...",
  "ui.provider.fallback_voice.unavailable":
    "Le voci di sistema non sono disponibili su questo dispositivo.",
  "ui.provider.fallback_voice.loading":
    "Caricamento voci disponibili...",
  "ui.provider.fallback_voice.hide_others": "Nascondi altre voci",
  "ui.provider.fallback_voice.more_voices": "Altre voci ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Paziente",
  "ui.provider.setup.steps.voice": "Voce",
  "ui.provider.setup.steps.care_team": "Team",
  "ui.provider.setup.steps.confirm": "Conferma",

  "ui.provider.setup.skip": "Salta →",
  "ui.provider.setup.skip_aria": "Salta configurazione",
  "ui.provider.setup.skip_dialog.title": "Saltare la configurazione?",
  "ui.provider.setup.skip_dialog.body": "Inizia a usare OwnVoice ora. Puoi completare la configurazione più tardi toccando il nome del paziente nell'intestazione.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Nessun paziente verrà aggiunto.",
  "ui.provider.setup.skip_dialog.confirm": "Salta configurazione",
  "ui.provider.setup.skip_dialog.cancel": "Continua",

  "ui.provider.setup.back": "Indietro",
  "ui.provider.setup.continue": "Continua",
  "ui.provider.setup.start": "Avvia OwnVoice",

  "ui.provider.setup.step0.heading": "Benvenuto in OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Configuriamo la Sua scheda di comunicazione. Tutto resta su questo dispositivo.",
  "ui.provider.setup.step0.name_label": "Nome del paziente",
  "ui.provider.setup.step0.name_placeholder":
    "Nome o nome preferito",
  "ui.provider.setup.step0.bed_label": "Letto / Stanza",
  "ui.provider.setup.step0.bed_placeholder": "es. 4B-12",
  "ui.provider.setup.step0.language_label": "Lingua",

  "ui.provider.setup.step1.heading": "Campione vocale",
  "ui.provider.setup.step1.body1":
    "Acquisisca un campione vocale affinché OwnVoice parli con la voce del paziente. Questo passaggio è facoltativo.",
  "ui.provider.setup.step1.body2":
    "La clonazione vocale avviene interamente sul dispositivo. Nessun audio lascia questo tablet.",
  "ui.provider.setup.step1.patient_label": "Paziente",
  "ui.provider.setup.step1.backup_voice_heading": "Voce di riserva",
  "ui.provider.setup.step1.backup_voice_body1":
    "Scelga una voce di sistema da usare durante il caricamento del clone vocale, o se non è stato registrato un campione. Tocchi una voce per ascoltare l'anteprima.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Utilizza la sintesi vocale integrata nel dispositivo.",

  "ui.provider.setup.step2.heading": "Team di cura",
  "ui.provider.setup.step2.body":
    "Aggiunga gli operatori sanitari che assisteranno questo paziente.",
  "ui.provider.setup.step2.icon_label": "Icona",
  "ui.provider.setup.step2.name_label": "Nome",
  "ui.provider.setup.step2.name_placeholder":
    "Dott. Rossi, Inf. Bianchi...",
  "ui.provider.setup.step2.add": "Aggiungi",

  "ui.provider.setup.step3.heading": "Tutto pronto",
  "ui.provider.setup.step3.body":
    "Verifichi la configurazione. Può modificare qualsiasi cosa in seguito nelle Impostazioni.",
  "ui.provider.setup.step3.summary.patient": "Paziente",
  "ui.provider.setup.step3.summary.bed": "Letto / Stanza",
  "ui.provider.setup.step3.summary.language": "Lingua",
  "ui.provider.setup.step3.summary.language_default": "Italiano",
  "ui.provider.setup.step3.summary.voice": "Voce",
  "ui.provider.setup.step3.summary.care_team": "Team di cura",
  "ui.provider.setup.step3.summary.not_set": "Non impostato",
  "ui.provider.setup.step3.summary.captured": "Acquisita",
  "ui.provider.setup.step3.summary.not_captured": "Non acquisita",
  "ui.provider.setup.step3.summary.none_added": "Nessuno aggiunto",
  "ui.provider.setup.step3.pin_label": "PIN personale (facoltativo)",
  "ui.provider.setup.step3.pin_body":
    "Imposti un PIN a 4 cifre per proteggere le impostazioni del personale.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Impostazioni",
  "ui.provider.settings.done": "Fatto",
  "ui.provider.settings.close_aria": "Chiudi impostazioni",

  "ui.provider.patient_edit.title": "Modifica {name}",
  "ui.provider.patient_edit.title_default": "Modifica paziente",
  "ui.provider.patient_edit.close_aria": "Chiudi editor paziente",
  "ui.provider.patient_pill.aria": "Modifica paziente: {name}",
  "ui.provider.nav.staff_menu": "Impostazioni",
  "ui.provider.staff_sheet.title": "Personale",
  "ui.provider.staff_sheet.close_aria": "Chiudi menu personale",
  "ui.provider.staff_sheet.patients_description": "Cambia, aggiungi o modifica pazienti",
  "ui.provider.staff_sheet.settings_description": "Equipe di cura, accessibilità, offline",
  "ui.provider.staff_sheet.end_session_description": "Esci dalla modalità personale",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Scartare la preparazione vocale di {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "L'avanzamento ({current} / {total} frasi) andrà perso. Il campione vocale registrato viene conservato — può riavviare la preparazione in seguito.",
  "ui.provider.settings.voice_cache.cancel": "Annulla",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Annulla e conserva la preparazione vocale",
  "ui.provider.settings.voice_cache.discard_confirm": "Scarta",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Conferma scarto preparazione vocale",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Scarta preparazione vocale di {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "In coda — la voce di {label} verrà preparata ({total} fras{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Preparazione voce di {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "In pausa — voce di {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Riprendi",
  "ui.provider.settings.voice_cache.resume_aria":
    "Riprendi preparazione voce di {label}",
  "ui.provider.settings.voice_cache.pause": "Pausa",
  "ui.provider.settings.voice_cache.pause_aria":
    "Metti in pausa preparazione voce di {label}",
  "ui.provider.settings.voice_cache.done":
    "Clone vocale attivo — tutte le {total} frasi pronte nella voce di {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} fras{plural} non riuscite per {label}",
  "ui.provider.settings.voice_cache.retry": "Riprova",
  "ui.provider.settings.voice_cache.retry_aria":
    "Riprova frasi non riuscite nella cache vocale",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Informazioni",
  "ui.provider.settings.about.subtitle":
    "Ausilio alla comunicazione AAC per pazienti ospedalizzati.",
  "ui.provider.settings.about.attribution_1":
    "Scala del dolore: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Obiettivi di cura: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Cache SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Ripristino",
  "ui.provider.settings.reset.action_label":
    "Ripristina app per nuovo paziente",
  "ui.provider.settings.reset.confirm_title": "Conferma?",
  "ui.provider.settings.reset.confirm_body":
    "Verranno cancellati tutti i dati del paziente, i campioni vocali, la cronologia delle conversazioni e le impostazioni del personale. L'operazione non può essere annullata.",
  "ui.provider.settings.reset.confirm_destructive": "Ripristina tutto",
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

  // ── UI chrome: Settings — Accessibility section ───────────────
  "ui.provider.settings.accessibility.heading": "Accessibilità",
  "ui.provider.settings.accessibility.toggle_label":
    "Modalità input assistito",
  "ui.provider.settings.accessibility.toggle_description":
    "Amplifica gli anelli di messa a fuoco, allunga il tempo di tocco e rafforza il feedback per pazienti che usano trackball, joystick, cursore AssistiveTouch o sensore.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Puntatore esterno rilevato.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Valuti l'attivazione della Modalità input assistito per questo paziente.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Pazienti",
  "ui.provider.settings.patients.active_remove_hint":
    "Passi a un altro paziente prima di rimuovere questo.",
  "ui.provider.settings.patients.remove_button": "Rimuovi",
  "ui.provider.settings.patients.add_patient": "+ Aggiungi paziente",
  "ui.provider.settings.patients.remove_dialog.title":
    "Rimuovere {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Verranno eliminati il campione vocale, la cronologia delle conversazioni e l'audio in cache per il clone vocale. I cloni vocali del team di cura vengono conservati per gli altri pazienti. L'operazione non può essere annullata.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Rimuovi",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Team di cura",
  "ui.provider.settings.care_team.empty":
    "Nessun operatore aggiunto finora.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Informazioni sul paziente",
  "ui.provider.settings.patient_info.name_label": "Nome",
  "ui.provider.settings.patient_info.bed_label": "Letto / Stanza",
  "ui.provider.settings.patient_info.language_label": "Lingua",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Lingua del paziente",
  "ui.provider.settings.lang.caregiver_section":
    "Lingua del team di cura",
  "ui.provider.settings.lang.caregiver_helper":
    "La lingua compresa dal team di cura. Di solito si imposta una sola volta per dispositivo.",
  "ui.provider.settings.lang.change": "Cambia lingua",

  "ui.provider.settings.lang.picker_title": "Scegli lingua",
  "ui.provider.settings.lang.patient_dialog.title":
    "Cambiare la lingua del paziente in {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Il clone vocale resta pronto — le frasi che tocca suoneranno sempre uguali. Prepareremo l'audio per {providerCount} voci del team (~{estimatedMinutes} min). Può continuare a usare l'app nel frattempo.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "I cloni vocali del team di cura non sono disponibili in {lang} — verrà usata la voce di sistema. Le registrazioni esistenti sono conservate nel caso si passi a una lingua supportata in seguito.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Le frasi che tocca suoneranno sempre uguali. Non ci sono voci del team configurate, quindi non serve rigenerare nulla.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Cambiare la lingua del team di cura in {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "I cloni vocali del team restano pronti. Prepareremo l'audio della voce del paziente nella nuova lingua (~{estimatedMinutes} min). Può continuare a usare l'app nel frattempo.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Il clone vocale del paziente non è disponibile in {lang} — verrà usata la voce di sistema. Il campione vocale registrato del paziente è conservato nel caso si passi a una lingua supportata in seguito.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Nessun clone vocale del paziente è configurato, quindi non serve rigenerare nulla.",
  "ui.provider.settings.patient_info.voice_label": "Voce",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Voce di riserva",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Voce di sistema usata durante il caricamento del clone vocale. Tocchi per ascoltare.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Preparazione offline",
  "ui.provider.settings.offline.status_description":
    "Stato dei modelli IA che l'app utilizza sul dispositivo per la generazione vocale, i suggerimenti e il riconoscimento del parlato.",
  "ui.provider.settings.offline.downloading":
    "Download dei modelli…",
  "ui.provider.settings.offline.download_progress_aria":
    "Avanzamento download modelli",
  "ui.provider.settings.offline.all_ready":
    "Tutti i modelli pronti",
  "ui.provider.settings.offline.redownload_button":
    "Riscarica modelli",
  "ui.provider.settings.offline.already_up_to_date":
    "Già aggiornato",
  "ui.provider.settings.offline.checking": "Verifica…",
  "ui.provider.settings.offline.verified": "✓ Modelli verificati",
  "ui.provider.settings.offline.check_button":
    "Verifica modelli esistenti",
  "ui.provider.settings.offline.redownloading":
    "Riscaricamento…",
  "ui.provider.settings.offline.force_redownload_button":
    "Forza riscaricamento di tutti i modelli",
  "ui.provider.settings.offline.model_status_ready": "pronto",
  "ui.provider.settings.offline.model_status_downloading":
    "download…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "riprova necessaria",
  "ui.provider.settings.offline.last_verified_prefix":
    "Ultima verifica: ",
  "ui.provider.settings.offline.storage_prefix": "Spazio: ",
  "ui.provider.settings.offline.storage_of": " di ",
  "ui.provider.settings.offline.storage_used": " usato",
  "ui.provider.settings.offline.storage_low": " — in esaurimento",
  "ui.provider.settings.offline.clear_audio_cache":
    "Svuota cache audio",
  "ui.provider.settings.offline.clearing": "Svuotamento…",
  "ui.provider.settings.offline.rebuilding":
    "Ricostruzione: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Riscaricare tutti i modelli IA?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Verranno scaricati circa 1,7 GB. La sintesi vocale continua a funzionare durante l'aggiornamento.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Riscarica",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Cambia paziente",
  "ui.provider.switch.add_patient": "+ Aggiungi paziente",
  "ui.provider.patients.title": "Pazienti",
  "ui.provider.patients.actions_aria": "Azioni per {name}",
  "ui.provider.patients.action_edit": "Modifica",
  "ui.provider.patients.action_remove": "Rimuovi",
  "ui.provider.switch.voice_captured": "Voce acquisita",
  "ui.provider.switch.no_voice": "Nessuna voce",
  "ui.provider.switch.last_active_just_now": "Adesso",
  "ui.provider.switch.last_active_minutes":
    "Attivo {n} min fa",
  "ui.provider.switch.last_active_hours": "Attivo {n}h fa",
  "ui.provider.switch.last_active_days": "Attivo {n}g fa",
  "ui.provider.switch.currently_active": "Attivo ora",
  "ui.provider.switch.switched_announcement":
    "Passato a {name}. {count} messaggi nella conversazione.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Sessione personale in scadenza",
  "ui.provider.staff_session.warning_body":
    "L'accesso personale verrà bloccato fra {n} secondi.",
  "ui.provider.staff_session.extend": "Estendi sessione",
  "ui.provider.staff_session.end_now": "Termina ora",
  "ui.provider.nav.end_staff_session": "Termina sessione personale",
};

export default it;
