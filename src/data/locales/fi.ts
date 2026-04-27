/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Finnish
 * Locale: fi
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const fi: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Kyllä",
  "quick.no": "Ei",
  "quick.thank_you": "Kiitos",
  "quick.please_wait": "Odota hetki",
  "quick.dont_understand": "En ymmärrä",
  "quick.repeat": "Voitko toistaa",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Tarvitsen vettä",
  "needs.comfort.hungry": "Minulla on nälkä",
  "needs.comfort.cold": "Minulla on kylmä",
  "needs.comfort.hot": "Minulla on kuuma",
  "needs.comfort.bed": "Säädä sänkyäni",
  "needs.comfort.bathroom": "Tarvitsen WC:n",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Tarvitsen lääkkeeni",
  "needs.medical.suction": "Tarvitsen imua",
  "needs.medical.nauseous": "Minua oksettaa",
  "needs.medical.breathe": "En saa hyvin henkeä",
  "needs.medical.nurse": "Tarvitsen hoitajan",
  "needs.medical.doctor": "Tarvitsen lääkärin",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Haluan perheeni luokseni",
  "needs.people.stay": "Voiko joku jäädä luokseni?",
  "needs.people.call": "Haluan soittaa jollekulle",
  "needs.people.interpreter": "Tarvitsen tulkin",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Olen väsynyt",
  "feelings.physical.uncomfortable": "Minulla on epämukava olo",
  "feelings.physical.weak": "Tunnen oloni heikoksi",
  "feelings.physical.better": "Tunnen oloni paremmaksi",
  "feelings.physical.dizzy": "Minua huimaa",
  "feelings.physical.itchy": "Minua kutittaa",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Minua pelottaa",
  "feelings.emotional.lonely": "Tunnen oloni yksinäiseksi",
  "feelings.emotional.frustrated": "Olen turhautunut",
  "feelings.emotional.confused": "Olen hämmentynyt",
  "feelings.emotional.safe": "Tunnen oloni turvalliseksi",
  "feelings.emotional.grateful": "Olen kiitollinen",
  "feelings.emotional.worried": "Olen huolissani",
  "feelings.emotional.hopeful": "Tunnen toivoa",
  "feelings.emotional.bored": "Minua tylsistyttää",
  "feelings.emotional.embarrassed": "Minua nolottaa",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Paljonko kello on?",
  "questions.day": "Mikä päivä tänään on?",
  "questions.whats_happening": "Mitä minulle tapahtuu?",
  "questions.go_home": "Milloin pääsen kotiin?",
  "questions.next_medication": "Milloin saan seuraavan lääkkeen?",
  "questions.explain_treatment": "Voitko selittää hoitoni?",
  "questions.nurse_today": "Kuka on hoitajani tänään?",
  "questions.eat_drink": "Saanko syödä tai juoda?",
  "questions.see_family": "Milloin voin nähdä perheeni?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Ei kipua",
  "pain.face.2": "Vähän kipua",
  "pain.face.4": "Hieman enemmän kipua",
  "pain.face.6": "Vielä enemmän kipua",
  "pain.face.8": "Paljon kipua",
  "pain.face.10": "Pahin mahdollinen kipu",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Särky",
  "pain.descriptor.burning": "Polttava",
  "pain.descriptor.sharp": "Pistävä",
  "pain.descriptor.throbbing": "Sykkivä",
  "pain.descriptor.cramping": "Kouristava",
  "pain.descriptor.constant": "Jatkuva",
  "pain.descriptor.comes_and_goes": "Ajoittainen",
  "pain.descriptor.numb": "Puutunut",
  "pain.descriptor.pressure": "Painava",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Pää",
  "pain.region.face": "Kasvot",
  "pain.region.neck": "Niska",
  "pain.region.chest": "Rintakehä",
  "pain.region.left_shoulder": "Vasen olkapää",
  "pain.region.right_shoulder": "Oikea olkapää",
  "pain.region.left_arm": "Vasen käsivarsi",
  "pain.region.right_arm": "Oikea käsivarsi",
  "pain.region.stomach": "Vatsa",
  "pain.region.upper_back": "Yläselkä",
  "pain.region.lower_back": "Alaselkä",
  "pain.region.left_leg": "Vasen jalka",
  "pain.region.right_leg": "Oikea jalka",

  // ── Pain: Composed sentence template ───────────────────────────
  // Label format keeps placeholders in nominative — natural Finnish
  // would require partitive on {descriptor} and inessive on {region}.
  "pain.sentence":
    "Minulla on kipua. Kuvaus: {descriptor}. Paikka: {region}. Voimakkuus: {severity}/10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Voimakkuus",
  "pain.step.location": "Sijainti",
  "pain.step.descriptor": "Kuvaus",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Tavoitteeni",
  "wishes.worries.label": "Huoleni",
  "wishes.strength.label": "Voimavarani",
  "wishes.joy.label": "Mikä tuo minulle iloa",
  "wishes.tradeoffs.label": "Hoidostani",
  "wishes.family.label": "Perheeni",
  "wishes.hopes.label": "Toiveeni",

  // Questions
  "wishes.goals.question": "Mitkä ovat tärkeimmät tavoitteesi?",
  "wishes.worries.question": "Mitkä ovat suurimmat huolesi?",
  "wishes.strength.question": "Mikä antaa sinulle voimaa?",
  "wishes.joy.question": "Mikä tuo sinulle iloa ja merkitystä elämään?",
  "wishes.tradeoffs.question":
    "Kuinka paljon olet valmis käymään läpi saadaksesi lisää aikaa?",
  "wishes.family.question":
    "Kuinka paljon läheisesi tietävät toiveistasi?",
  "wishes.hopes.question": "Mitkä ovat toiveesi?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists
  "wishes.goals.stem": "Minulle tärkeintä",
  "wishes.worries.stem": "Olen huolissani asiasta",
  "wishes.strength.stem": "Minulle voimaa antaa",
  "wishes.joy.stem": "Minulle iloa tuo",
  "wishes.tradeoffs.stem": "Hoidostani",
  "wishes.family.stem": "Perheestäni",
  "wishes.hopes.stem": "Toivon",

  // Responses — goals
  "wishes.goals.r.family": "Olla perheeni kanssa",
  "wishes.goals.r.comfort": "Olla mukavasti ja ilman kipua",
  "wishes.goals.r.longevity": "Elää mahdollisimman pitkään",
  "wishes.goals.r.home": "Päästä kotiin",
  "wishes.goals.r.independence": "Pystyä tekemään asioita itse",
  "wishes.goals.r.peace": "Olla rauhassa",

  // Responses — worries
  "wishes.worries.r.suffering": "Kärsiminen tai kipu",
  "wishes.worries.r.alone": "Yksin jääminen",
  "wishes.worries.r.burden": "Taakkana oleminen perheelleni",
  "wishes.worries.r.activities": "Etten voi tehdä asioita, joista nautin",
  "wishes.worries.r.leaving": "Perheeni jättäminen",
  "wishes.worries.r.unknown": "Tietämättömyys tulevasta",

  // Responses — strength
  "wishes.strength.r.family": "Perheeni",
  "wishes.strength.r.faith": "Uskoni",
  "wishes.strength.r.friends": "Ystäväni",
  "wishes.strength.r.wishes_heard": "Tieto siitä, että toiveeni kuullaan",
  "wishes.strength.r.hope": "Toivo paranemisesta",
  "wishes.strength.r.carers": "Ihmiset, jotka hoitavat minua",

  // Responses — joy
  "wishes.joy.r.family": "Perheen kanssa vietetty aika",
  "wishes.joy.r.outdoors": "Ulkona oleminen",
  "wishes.joy.r.hobbies": "Harrastukseni ja kiinnostukseni",
  "wishes.joy.r.helping": "Muiden auttaminen",
  "wishes.joy.r.spiritual": "Hengellinen elämäni",
  "wishes.joy.r.routines": "Yksinkertaiset päivittäiset rutiinit",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Haluan kaiken mahdollisen hoidon",
  "wishes.tradeoffs.r.good_chance":
    "Haluan hoitoa, jos sillä on hyvät mahdollisuudet",
  "wishes.tradeoffs.r.try_stop":
    "Haluan kokeilla, mutta lopettaa jos se ei auta",
  "wishes.tradeoffs.r.comfortable": "Haluan keskittyä mukavuuteen",
  "wishes.tradeoffs.r.think": "Tarvitsen enemmän aikaa miettiä",
  "wishes.tradeoffs.r.family_first":
    "Minun täytyy puhua perheeni kanssa ensin",

  // Responses — family
  "wishes.family.r.know_well": "He tietävät toiveeni hyvin",
  "wishes.family.r.know_some": "He tietävät osan toiveistani",
  "wishes.family.r.not_talked": "Emme ole vielä puhuneet tästä",
  "wishes.family.r.need_help": "Tarvitsen apua kertoakseni heille",
  "wishes.family.r.team_explain":
    "Haluan hoitotiimini auttavan selittämisessä",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Parantua",
  "wishes.hopes.r.go_home": "Päästä kotiin",
  "wishes.hopes.r.comfortable": "Olla mukavasti",
  "wishes.hopes.r.family_ok": "Perheeni pärjää",
  "wishes.hopes.r.more_time": "Saada lisää aikaa",
  "wishes.hopes.r.peace": "Olla rauhassa",

  // Wish sentence composition templates
  // Colon format avoids Finnish copula agreement issues with varied stems
  "wishes.compose": "{stem}: {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Haen jonkun auttamaan.",
  "provider.responses.interpreter": "Haen tulkin.",
  "provider.responses.family": "Soitan perheellesi.",
  "provider.responses.get_that": "Haen sen sinulle.",
  "provider.responses.doctor_know": "Kerron lääkärille.",
  "provider.responses.medication": "Haen lääkkeesi.",
  "provider.responses.family_coming": "Perheesi on tulossa.",
  "provider.responses.doctor_soon": "Lääkäri tulee pian.",
  "provider.responses.doing_well": "Sinulla menee hyvin.",
  "provider.responses.rest": "Yritä levätä nyt.",

  "provider.questions.feeling": "Miltä sinusta tuntuu?",
  "provider.questions.need": "Tarvitsetko jotain?",
  "provider.questions.where_hurts": "Voitko näyttää missä koskee?",
  "provider.questions.rate_pain": "Arvioi kipusi asteikolla 0–10.",
  "provider.questions.sleep": "Nukuitko hyvin?",
  "provider.questions.comfortable": "Onko sinulla mukava olla?",

  "provider.directions.procedure": "Toimenpiteesi on tänään.",
  "provider.directions.stay_in_bed": "Sinun pitää pysyä sängyssä.",
  "provider.directions.vitals": "Tarkistan nyt elintoimintosi.",
  "provider.directions.medication_time": "On lääkkeen aika.",
  "provider.directions.breathe": "Yritä hengittää syvään.",
  "provider.directions.call_button":
    "Paina kutsupainiketta, jos tarvitset jotain.",

  "provider.goals_of_care.matters_most":
    "Haluaisin puhua siitä, mikä on sinulle tärkeintä.",
  "provider.goals_of_care.goals":
    "Mitkä ovat tärkeimmät tavoitteesi juuri nyt?",
  "provider.goals_of_care.worries": "Mitkä ovat suurimmat huolesi?",
  "provider.goals_of_care.strength": "Mikä antaa sinulle voimaa?",
  "provider.goals_of_care.joy":
    "Mikä tuo sinulle iloa ja merkitystä elämään?",
  "provider.goals_of_care.wishes":
    "Kuinka paljon läheisesi tietävät toiveistasi?",
  "provider.goals_of_care.hopes": "Mitkä ovat toiveesi?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Nukuin hyvin",
  "time.morning.didnt_sleep": "En nukkunut hyvin",
  "time.morning.breakfast": "Tarvitsen aamiaisen",
  "time.morning.doctor_coming": "Milloin lääkäri tulee?",

  "time.afternoon.tired": "Olen väsynyt",
  "time.afternoon.lunch": "Saanko lounasta?",
  "time.afternoon.see_family": "Milloin voin nähdä perheeni?",
  "time.afternoon.rest": "Tarvitsen lepoa",

  "time.evening.cant_sleep": "En saa unta",
  "time.evening.medication": "Tarvitsen lääkkeeni",
  "time.evening.call_family": "Voinko soittaa perheelleni?",
  "time.evening.pain": "Minulla on kipua",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Finnish agglutination may not compose cleanly — review each path.
  "suggest.start.i_am": "Olen",
  "suggest.start.i_feel": "Tunnen oloni",
  "suggest.start.i_want": "Haluan",
  "suggest.start.i_need": "Tarvitsen",
  "suggest.start.please": "Ole hyvä ja",
  "suggest.start.when": "Milloin",
  "suggest.start.can_you": "Voitko",
  "suggest.start.tell_me": "Kerro minulle",

  "suggest.i_am.in_pain": "kipuinen",
  "suggest.i_am.cold": "kylmissäni",
  "suggest.i_am.hot": "kuuma",
  "suggest.i_am.hungry": "nälkäinen",
  "suggest.i_am.thirsty": "janoinen",
  "suggest.i_am.tired": "väsynyt",
  "suggest.i_am.uncomfortable": "epämukava",
  "suggest.i_am.okay": "kunnossa",
  "suggest.i_am.not_okay": "en kunnossa",
  "suggest.i_am.ready": "valmis",

  "suggest.i_feel.scared": "pelokkaaksi",
  "suggest.i_feel.sick": "sairaaksi",
  "suggest.i_feel.dizzy": "huimaavaksi",
  "suggest.i_feel.weak": "heikoksi",
  "suggest.i_feel.better": "paremmaksi",
  "suggest.i_feel.worse": "huonommaksi",
  "suggest.i_feel.nauseous": "pahoinvoivaksi",
  "suggest.i_feel.lonely": "yksinäiseksi",
  "suggest.i_feel.confused": "hämmentyneeksi",
  "suggest.i_feel.safe": "turvalliseksi",

  "suggest.i_feel_scared.procedure": "toimenpidettä",
  "suggest.i_feel_scared.happening": "sitä mikä tapahtuu",
  "suggest.i_feel_scared.alone": "yksinäisyyttä",
  "suggest.i_feel_scared.need_someone": "ja tarvitsen jonkun",

  "suggest.i_feel_sick.stomach": "vatsaani",
  "suggest.i_feel_sick.dizzy": "ja huimaa",
  "suggest.i_feel_sick.help": "ja tarvitsen apua",

  "suggest.i_want.water": "vettä",
  "suggest.i_want.family": "perheeni luokseni",
  "suggest.i_want.go_home": "kotiin",
  "suggest.i_want.sleep": "nukkua",
  "suggest.i_want.medication": "lääkkeeni",
  "suggest.i_want.blanket": "peiton",
  "suggest.i_want.talk": "puhua jollekulle",
  "suggest.i_want.nurse": "hoitajan",

  "suggest.i_want_to_go.home": "kotiin",
  "suggest.i_want_to_go.sleep": "nukkumaan",
  "suggest.i_want_to_go.bathroom": "WC:hen",

  "suggest.i_want_my.family": "perheeni",
  "suggest.i_want_my.medication": "lääkkeeni",
  "suggest.i_want_my.phone": "puhelimeni",
  "suggest.i_want_my.glasses": "silmälasini",
  "suggest.i_want_my.blanket": "peittoni",

  "suggest.i_need.help": "apua",
  "suggest.i_need.water": "vettä",
  "suggest.i_need.bathroom": "WC:n",
  "suggest.i_need.medication": "lääkkeeni",
  "suggest.i_need.nurse": "hoitajan",
  "suggest.i_need.doctor": "lääkärin",
  "suggest.i_need.rest": "lepoa",
  "suggest.i_need.blanket": "peiton",
  "suggest.i_need.suction": "imua",

  "suggest.i_need_the.nurse": "hoitajan",
  "suggest.i_need_the.doctor": "lääkärin",
  "suggest.i_need_the.bathroom": "WC:n",
  "suggest.i_need_the.light_off": "valot pois",
  "suggest.i_need_the.light_on": "valot päälle",

  "suggest.i_need_my.medication": "lääkkeeni",
  "suggest.i_need_my.family": "perheeni",
  "suggest.i_need_my.glasses": "silmälasini",
  "suggest.i_need_my.phone": "puhelimeni",

  "suggest.please.help_me": "auta minua",
  "suggest.please.call_family": "soita perheelleni",
  "suggest.please.light_off": "sammuta valo",
  "suggest.please.adjust_bed": "säädä sänkyäni",
  "suggest.please.give_me": "anna minulle",
  "suggest.please.explain": "selitä",
  "suggest.please.come_back": "tule pian takaisin",
  "suggest.please.stay": "pysy luonani",
  "suggest.please.dont_leave": "älä lähde",

  "suggest.please_help_me.pain": "Minulla on kipua",
  "suggest.please_help_me.breathe": "En saa henkeä",
  "suggest.please_help_me.sick": "Minua oksettaa",
  "suggest.please_help_me.scared": "Minua pelottaa",

  "suggest.please_give_me.water": "vettä",
  "suggest.please_give_me.medication": "lääkkeeni",
  "suggest.please_give_me.blanket": "peitto",
  "suggest.please_give_me.pain_relief": "jotain kipuun",

  "suggest.when.go_home": "pääsen kotiin?",
  "suggest.when.family": "perheeni tulee?",
  "suggest.when.medication": "saan seuraavan lääkkeen?",
  "suggest.when.doctor": "lääkäri tulee?",
  "suggest.when.eat": "saan syödä?",
  "suggest.when.over": "tämä loppuu?",

  "suggest.can_you.help": "auttaa minua?",
  "suggest.can_you.call_family": "soittaa perheelleni?",
  "suggest.can_you.get_nurse": "kutsua hoitajan?",
  "suggest.can_you.explain": "selittää mitä tapahtuu?",
  "suggest.can_you.light_off": "sammuttaa valon?",
  "suggest.can_you.adjust_bed": "säätää sänkyäni?",
  "suggest.can_you.stay": "pysyä luonani?",

  "suggest.tell_me.happening": "mitä tapahtuu",
  "suggest.tell_me.time": "paljonko kello on",
  "suggest.tell_me.go_home": "milloin pääsen kotiin",
  "suggest.tell_me.day": "mikä päivä on",
  "suggest.tell_me.treatment": "hoidostani",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  "suggest.i_am_in_pain.help": "auta minua",
  "suggest.i_am_in_pain.worse": "ja se pahenee",
  "suggest.i_am_in_pain.medication": "ja tarvitsen lääkettä",
  "suggest.i_am_in_pain.back": "selässäni",
  "suggest.i_am_in_pain.chest": "rinnassani",
  "suggest.i_am_in_pain.stomach": "vatsassani",

  "suggest.i_need_help.up": "noustakseni ylös",
  "suggest.i_need_help.breathing": "hengittämisessä",
  "suggest.i_need_help.pain": "kivun kanssa",
  "suggest.i_need_help.now": "heti",
  "suggest.i_need_help.please": "ole hyvä",

  "suggest.i_feel_better.than_before": "kuin aiemmin",
  "suggest.i_feel_better.now": "nyt",
  "suggest.i_feel_better.thanks": "kiitos",

  "suggest.i_feel_worse.than_before": "kuin aiemmin",
  "suggest.i_feel_worse.need_doctor": "Tarvitsen lääkärin",
  "suggest.i_feel_worse.help": "auta minua",
  "suggest.i_feel_worse.medication": "Tarvitsen lääkettä",

  // ── Context-aware suggestion overrides ─────────────────────────
  "suggest.ctx.feeling.i_feel": "Tunnen oloni",
  "suggest.ctx.feeling.i_am": "Olen",
  "suggest.ctx.feeling.better": "Paremmin kuin aiemmin",
  "suggest.ctx.feeling.not_great": "Ei kovin hyvin",
  "suggest.ctx.feeling.pain": "Minulla on kipua",
  "suggest.ctx.feeling.okay": "Olen kunnossa",
  "suggest.ctx.feeling.help": "Voitko auttaa?",

  "suggest.ctx.need.i_need": "Tarvitsen",
  "suggest.ctx.need.i_want": "Haluan",
  "suggest.ctx.need.fine": "Ei tarvetta juuri nyt",
  "suggest.ctx.need.yes": "Kyllä kiitos",
  "suggest.ctx.need.no": "Ei kiitos",
  "suggest.ctx.need.stay": "Voitko jäädä?",

  "suggest.ctx.where_hurts.head": "Päätäni",
  "suggest.ctx.where_hurts.chest": "Rintaani",
  "suggest.ctx.where_hurts.stomach": "Vatsaani",
  "suggest.ctx.where_hurts.back": "Selkääni",
  "suggest.ctx.where_hurts.left_arm": "Vasenta kättäni",
  "suggest.ctx.where_hurts.right_leg": "Oikeaa jalkaani",
  "suggest.ctx.where_hurts.everywhere": "Kaikkialta",

  "suggest.ctx.pain.very_bad": "Se on todella kovaa",
  "suggest.ctx.pain.worse": "Se pahenee",
  "suggest.ctx.pain.same": "Suunnilleen sama",
  "suggest.ctx.pain.little_better": "Vähän parempi",
  "suggest.ctx.pain.need_relief": "Tarvitsen jotain kipuun",

  "suggest.ctx.comfort.comfortable": "Minulla on mukava olla",
  "suggest.ctx.comfort.not_comfortable": "Minulla ei ole mukava olla",
  "suggest.ctx.comfort.cant_sleep": "En saa unta",
  "suggest.ctx.comfort.cold": "Minulla on kylmä",
  "suggest.ctx.comfort.hot": "Minulla on kuuma",
  "suggest.ctx.comfort.adjust_bed": "Voitko säätää sänkyäni?",

  "suggest.ctx.night.cant_sleep": "En saa unta",
  "suggest.ctx.night.i_need": "Tarvitsen",
  "suggest.ctx.night.pain": "Minulla on kipua",
  "suggest.ctx.night.i_feel": "Tunnen oloni",
  "suggest.ctx.night.can_you": "Voitko",
  "suggest.ctx.night.please": "Ole hyvä ja",
  "suggest.ctx.night.i_am": "Olen",
  "suggest.ctx.night.when": "Milloin",

  "suggest.ctx.morning.i_am": "Olen",
  "suggest.ctx.morning.i_need": "Tarvitsen",
  "suggest.ctx.morning.i_feel": "Tunnen oloni",
  "suggest.ctx.morning.doctor": "Milloin lääkäri tulee?",
  "suggest.ctx.morning.i_want": "Haluan",
  "suggest.ctx.morning.can_you": "Voitko",
  "suggest.ctx.morning.please": "Ole hyvä ja",
  "suggest.ctx.morning.tell_me": "Kerro minulle",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Pikavalinnat",
  "cat.needs": "Tarvitsen",
  "cat.feelings": "Tunnen",
  "cat.pain": "Kipu",
  "cat.questions": "Kysymykset",
  "sub.comfort": "Mukavuus",
  "sub.medical": "Hoito",
  "sub.people": "Ihmiset",
  "sub.physical": "Fyysinen",
  "sub.emotional": "Tunne",

  // Provider category labels
  "provider.cat.responses": "Vastaukset",
  "provider.cat.questions": "Kysymykset",
  "provider.cat.directions": "Ohjeet",
  "provider.cat.goals_of_care": "Hoidon tavoitteet",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — keskustelu, {name}",
  "ui.patient.app.name_fallback": "Potilas",
  "ui.patient.header.name_fallback": "Potilas",
  "ui.patient.header.bed_prefix": "Vuode ",
  "ui.dual.nav.wishes": "Toiveet",
  "ui.dual.nav.listen": "Kuuntele",
  "ui.provider.nav.staff": "Henkilökunta",
  "ui.provider.nav.switch_patient": "Vaihda potilasta",
  "ui.provider.nav.settings": "Asetukset",
  "ui.provider.nav.theme.auto": "Automaattinen",
  "ui.provider.nav.theme.light": "Vaalea",
  "ui.provider.nav.theme.dark": "Tumma",
  "ui.patient.tabbar.say_more": "Sano lisää",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Kuinka kovaa kipua sinulla on?",
  "ui.dual.pain.heading.location": "Missä kipu on?",
  "ui.dual.pain.heading.descriptor": "Miltä kipu tuntuu?",
  "ui.patient.pain.step_of": "Vaihe {n}/{total}",
  "ui.patient.pain.back_to": "Takaisin: {label}",
  "ui.patient.pain.level_aria": "Kiputaso {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Toiveet: {name}",
  "ui.patient.wishes.my_wishes": "Toiveeni",
  "ui.patient.wishes.step_of": "Vaihe {n}/{total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Toiveita ei jaettu.",
  "ui.patient.wishes.share_all_again": "Jaa kaikki toiveet uudelleen",
  "ui.patient.wishes.close": "Sulje",
  "ui.patient.wishes.share": "Jaa",
  "ui.patient.wishes.skip": "Ohita",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Napauta sanoja alta tai kirjoita...",
  "ui.patient.builder.message_aria": "Viestisi",
  "ui.patient.builder.undo": "Kumoa viimeisin sana",
  "ui.patient.builder.clear": "Tyhjennä viesti",
  "ui.patient.builder.refresh_ai": "Päivitä tekoälyn ehdotukset",
  "ui.patient.builder.ai_thinking": "Tekoäly miettii...",
  "ui.patient.builder.no_ai_suggestions":
    "Ei tekoälyn ehdotuksia. Napauta Päivitä yrittääksesi uudelleen.",
  "ui.patient.builder.ready":
    "Viestisi on valmis. Napauta Puhu lähettääksesi.",
  "ui.patient.builder.speak": "Puhu",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Toista: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Hoitotiimi",
  "ui.provider.fallback_name": "Hoitaja",
  "ui.provider.speaking_to": "Puhutaan potilaalle {name}, hoitajana {prov}",
  "ui.provider.patient_fallback": "potilas",
  "ui.provider.close_panel": "Sulje paneeli",
  "ui.provider.select_provider": "Valitse {name}",
  "ui.provider.show_category": "Näytä {key}",
  "ui.provider.speak_phrase": "Sano: {phrase}",

  // ── UI chrome: ListenPanel ─────────────────────────────────────
  "ui.provider.listen.title": "Kuuntele",
  "ui.provider.listen.stop_aria": "Lopeta kuuntelu",
  "ui.provider.listen.start_aria": "Aloita kuuntelu napauttamalla",
  "ui.provider.listen.listening": "Kuunnellaan...",
  "ui.provider.listen.transcribing": "Puretaan tekstiksi...",
  "ui.provider.listen.listening_placeholder": "Kuunnellaan puhetta...",
  "ui.provider.listen.transcribing_placeholder":
    "Puretaan puhetta tekstiksi...",
  "ui.provider.listen.type_placeholder": "Tai kirjoita mitä sanottiin...",
  "ui.provider.listen.transcript_aria": "Teksti",
  "ui.provider.listen.add_as": "Lisää keskusteluun hoitajana {prov}",
  "ui.provider.listen.privacy_notice":
    "Laitteella · Whisper · ääni ei poistu tästä laitteesta",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Puhutaan: {text}",
  "ui.dual.speaking.patient_voice": "Sinun äänesi",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Syötä PIN",
  "ui.provider.pin_gate.subtitle": "Vain henkilökunnalle",
  "ui.provider.pin_gate.incorrect": "Väärä PIN",
  "ui.provider.pin_gate.delete_aria": "Poista",
  "ui.provider.pin_gate.digit_aria": "Numero {n}",
  "ui.provider.pin_gate.cancel": "Peruuta",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Luet kohta lauseen ääneen.",
  "ui.provider.voice_capture.coaching_breath":
    "Hengitä muutaman kerran syvään.",
  "ui.provider.voice_capture.coaching_ready": "Valmis.",
  "ui.provider.voice_capture.breathe_in": "Hengitä sisään…",
  "ui.provider.voice_capture.breathe_out": "Hengitä ulos…",
  "ui.provider.voice_capture.creating": "Luodaan äänikloonia...",
  "ui.provider.voice_capture.creating_from_sample":
    "Luodaan äänikloonia näytteestä...",
  "ui.provider.voice_capture.loading_model":
    "Äänimallia ladataan...",
  "ui.provider.voice_capture.clone_failed": "Kloonaus epäonnistui",
  "ui.provider.voice_capture.captured": "Ääni tallennettu",
  "ui.provider.voice_capture.stop": "Pysäytä",
  "ui.provider.voice_capture.play": "Toista",
  "ui.provider.voice_capture.discard": "Hylkää nauhoitus",
  "ui.provider.voice_capture.use_recording": "Käytä tätä nauhoitusta",
  "ui.provider.voice_capture.upload_file": "Lataa tiedosto",
  "ui.provider.voice_capture.record": "Nauhoita",
  "ui.provider.voice_capture.stop_early": "Lopeta aikaisin",
  "ui.provider.voice_capture.remove": "Poista",
  "ui.provider.voice_capture.retry": "Yritä uudelleen",
  "ui.provider.voice_capture.done": "Valmis!",
  "ui.provider.voice_capture.cancel": "Peruuta",
  "ui.provider.voice_capture.seconds_recorded": "{n} s nauhoitettu",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Peruuta nauhoituksen ajastin",
  "ui.provider.voice_capture.stop_early_aria":
    "Lopeta nauhoitus ennenaikaisesti",
  "ui.provider.voice_capture.audio_level_aria": "Äänitaso",
  "ui.provider.voice_capture.recording_progress_aria":
    "Nauhoituksen edistyminen",
  "ui.provider.voice_capture.stop_preview_aria":
    "Pysäytä esikatselun toisto",
  "ui.provider.voice_capture.play_preview_aria":
    "Toista nauhoituksen esikatselu",
  "ui.provider.voice_capture.discard_aria":
    "Hylkää nauhoitus ja aloita alusta",
  "ui.provider.voice_capture.stop_playback_aria":
    "Pysäytä näytteen toisto",
  "ui.provider.voice_capture.play_sample_aria":
    "Toista tallennettu ääninäyte",
  "ui.provider.voice_capture.remove_aria": "Poista ääninäyte",
  "ui.provider.voice_capture.retry_aria":
    "Yritä äänen kloonauksen purkamista uudelleen",
  "ui.provider.voice_capture.upload_aria":
    "Lataa ääninäyte tiedostosta",
  "ui.provider.voice_capture.record_aria":
    "Nauhoita ääninäyte mikrofonilla",
  "ui.provider.voice_capture.err_network":
    "Äänimalliin ei saatu yhteyttä. Tarkista yhteys ja napauta Yritä uudelleen.",
  "ui.provider.voice_capture.err_timeout":
    "Äänen käsittely kesti liian kauan. Napauta Yritä uudelleen.",
  "ui.provider.voice_capture.err_mic_denied":
    "Mikrofonin käyttö on estetty. Ota se käyttöön selaimen asetuksista tai lataa tiedosto.",
  "ui.provider.voice_capture.err_generic":
    "Äänen valmistelu epäonnistui. Napauta Yritä uudelleen.",
  "ui.provider.voice_capture.err_too_short":
    "Nauhoitus oli liian lyhyt. Puhu koko lähtölaskennan ajan ja napauta sitten Yritä uudelleen.",
  "ui.provider.voice_capture.err_too_noisy":
    "Taustamelu oli liian kovaa äänen kloonaamiseen. Siirry hiljaisempaan paikkaan ja napauta Yritä uudelleen.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Mikrofonin käyttö estetty. Kokeile ladata tiedosto.",
  "ui.provider.voice_capture.err_playback":
    "Ääntä ei voitu toistaa.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Parannettu",
  "ui.provider.fallback_voice.enhanced_aria": "Parannettu neuroääni",
  "ui.provider.fallback_voice.on_device_badge": "Laitteella",
  "ui.provider.fallback_voice.playing": "Toistetaan...",
  "ui.provider.fallback_voice.unavailable":
    "Järjestelmän äänet eivät ole käytettävissä tällä laitteella.",
  "ui.provider.fallback_voice.loading":
    "Ladataan käytettävissä olevia ääniä...",
  "ui.provider.fallback_voice.hide_others": "Piilota muut äänet",
  "ui.provider.fallback_voice.more_voices": "Lisää ääniä ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  "ui.provider.setup.steps.patient": "Potilas",
  "ui.provider.setup.steps.voice": "Ääni",
  "ui.provider.setup.steps.care_team": "Hoitotiimi",
  "ui.provider.setup.steps.confirm": "Vahvista",

  "ui.provider.setup.skip": "Ohita →",
  "ui.provider.setup.skip_aria": "Ohita asennus",
  "ui.provider.setup.skip_dialog.title": "Ohita asennus?",
  "ui.provider.setup.skip_dialog.body": "Aloita OwnVoicen käyttö nyt. Voit viimeistellä asetukset myöhemmin napauttamalla potilaan nimeä yläosassa.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Potilasta ei lisätä.",
  "ui.provider.setup.skip_dialog.confirm": "Ohita asennus",
  "ui.provider.setup.skip_dialog.cancel": "Jatka",

  "ui.provider.setup.back": "Takaisin",
  "ui.provider.setup.continue": "Jatka",
  "ui.provider.setup.start": "Käynnistä OwnVoice",

  "ui.provider.setup.step0.heading": "Tervetuloa OwnVoiceen",
  "ui.provider.setup.step0.subhead":
    "Tehdään viestintätaulusi valmiiksi. Kaikki pysyy tällä laitteella.",
  "ui.provider.setup.step0.name_label": "Potilaan nimi",
  "ui.provider.setup.step0.name_placeholder": "Etunimi tai kutsumanimi",
  "ui.provider.setup.step0.bed_label": "Vuode / Huone",
  "ui.provider.setup.step0.bed_placeholder": "esim. 4B-12",
  "ui.provider.setup.step0.language_label": "Kieli",

  "ui.provider.setup.step1.heading": "Ääninäyte",
  "ui.provider.setup.step1.body1":
    "Tallenna ääninäyte, jotta OwnVoice puhuu potilaan omalla äänellä. Tämä vaihe on vapaaehtoinen.",
  "ui.provider.setup.step1.body2":
    "Äänen kloonaus tapahtuu kokonaan laitteella. Ääntä ei lähetetä minnekään.",
  "ui.provider.setup.step1.patient_label": "Potilas",
  "ui.provider.setup.step1.backup_voice_heading": "Varaääni",
  "ui.provider.setup.step1.backup_voice_body1":
    "Valitse järjestelmäääni, jota käytetään äänikloonia ladattaessa tai jos näytettä ei ole nauhoitettu. Napauta ääntä kuullaksesi esikatselun.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Tämä käyttää laitteesi sisäänrakennettua puhesynteesiä.",

  "ui.provider.setup.step2.heading": "Hoitotiimi",
  "ui.provider.setup.step2.body":
    "Lisää potilasta hoitavat henkilöt.",
  "ui.provider.setup.step2.icon_label": "Kuvake",
  "ui.provider.setup.step2.name_label": "Nimi",
  "ui.provider.setup.step2.name_placeholder":
    "Tri Virtanen, hoitaja Liisa...",
  "ui.provider.setup.step2.add": "Lisää",

  "ui.provider.setup.step3.heading": "Valmis aloittamaan",
  "ui.provider.setup.step3.body":
    "Tarkista asetukset. Voit muuttaa mitä tahansa myöhemmin Asetuksissa.",
  "ui.provider.setup.step3.summary.patient": "Potilas",
  "ui.provider.setup.step3.summary.bed": "Vuode / Huone",
  "ui.provider.setup.step3.summary.language": "Kieli",
  "ui.provider.setup.step3.summary.language_default": "Suomi",
  "ui.provider.setup.step3.summary.voice": "Ääni",
  "ui.provider.setup.step3.summary.care_team": "Hoitotiimi",
  "ui.provider.setup.step3.summary.not_set": "Ei asetettu",
  "ui.provider.setup.step3.summary.captured": "Tallennettu",
  "ui.provider.setup.step3.summary.not_captured": "Ei tallennettu",
  "ui.provider.setup.step3.summary.none_added": "Ei lisätty ketään",
  "ui.provider.setup.step3.pin_label": "Henkilökunnan PIN (valinnainen)",
  "ui.provider.setup.step3.pin_body":
    "Aseta 4-numeroinen PIN hoitajan asetusten suojaamiseksi.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Asetukset",
  "ui.provider.settings.done": "Valmis",
  "ui.provider.settings.close_aria": "Sulje asetukset",

  "ui.provider.patient_edit.title": "Muokkaa {name}",
  "ui.provider.patient_edit.title_default": "Muokkaa potilasta",
  "ui.provider.patient_edit.close_aria": "Sulje potilaan muokkaus",
  "ui.provider.patient_pill.aria": "Muokkaa potilasta: {name}",
  "ui.provider.nav.staff_menu": "Asetukset",
  "ui.provider.staff_sheet.title": "Henkilökunta",
  "ui.provider.staff_sheet.close_aria": "Sulje henkilökunnan valikko",
  "ui.provider.staff_sheet.patients_description": "Vaihda, lisää tai muokkaa potilaita",
  "ui.provider.staff_sheet.settings_description": "Hoitotiimi, esteettömyys, offline",
  "ui.provider.staff_sheet.end_session_description": "Poistu henkilökunta-tilasta",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Hylätäänkö äänen valmistelu: {label}?",
  "ui.provider.settings.voice_cache.discard_body":
    "Edistyminen ({current}/{total} lausetta) menetetään. Nauhoitettu ääninäyte säilyy — voit aloittaa valmistelun myöhemmin uudelleen.",
  "ui.provider.settings.voice_cache.cancel": "Peruuta",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Peruuta ja säilytä äänen valmistelu",
  "ui.provider.settings.voice_cache.discard_confirm": "Hylkää",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Vahvista äänen valmistelun hylkääminen",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Hylkää äänen valmistelu: {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.queued":
    "Jonossa — ääni valmistellaan seuraavaksi: {label} ({total} lausetta{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Valmistellaan ääntä: {label}… {current}/{total}",
  "ui.provider.settings.voice_cache.paused":
    "Keskeytetty — ääni: {label}… {current}/{total}",
  "ui.provider.settings.voice_cache.resume": "Jatka",
  "ui.provider.settings.voice_cache.resume_aria":
    "Jatka äänen valmistelua: {label}",
  "ui.provider.settings.voice_cache.pause": "Keskeytä",
  "ui.provider.settings.voice_cache.pause_aria":
    "Keskeytä äänen valmistelu: {label}",
  "ui.provider.settings.voice_cache.done":
    "Äänikloonaus käytössä — kaikki {total} lausetta valmiina äänellä {label}",
  // TODO(translator): {plural} token is an English suffix — may render as empty string
  "ui.provider.settings.voice_cache.failed":
    "{count} lausetta{plural} epäonnistui: {label}",
  "ui.provider.settings.voice_cache.retry": "Yritä uudelleen",
  "ui.provider.settings.voice_cache.retry_aria":
    "Yritä epäonnistuneita äänivälimuistilauseita uudelleen",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Tietoja",
  "ui.provider.settings.about.subtitle":
    "AAC-viestintäapuväline sairaalapotilaille.",
  "ui.provider.settings.about.attribution_1":
    "Kipuasteikko: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Hoidon tavoitteet: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW-välimuisti:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Nollaus",
  "ui.provider.settings.reset.action_label":
    "Nollaa sovellus uutta potilasta varten",
  "ui.provider.settings.reset.confirm_title": "Oletko varma?",
  "ui.provider.settings.reset.confirm_body":
    "Tämä poistaa kaikki potilastiedot, ääninäytteet, keskusteluhistorian ja hoitajan asetukset. Tätä ei voi kumota.",
  "ui.provider.settings.reset.confirm_destructive": "Nollaa kaikki",
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
  "ui.provider.settings.accessibility.heading": "Esteettömyys",
  "ui.provider.settings.accessibility.toggle_label":
    "Avustettu syöttötila",
  "ui.provider.settings.accessibility.toggle_description":
    "Vahvistaa kohdistusrenkaat, pidentää napautuksen viivettä ja parantaa korostusta potilaille, jotka käyttävät ohjainpalloa, joystickiä, AssistiveTouch-kursoria tai kytkintä.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Ulkoinen osoitin havaittu.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Harkitse avustetun syöttötilan ottamista käyttöön tälle potilaalle.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Potilaat",
  "ui.provider.settings.patients.active_remove_hint":
    "Vaihda toiseen potilaaseen ennen tämän poistamista.",
  "ui.provider.settings.patients.remove_button": "Poista",
  "ui.provider.settings.patients.add_patient": "+ Lisää potilas",
  "ui.provider.settings.patients.remove_dialog.title":
    "Poistetaanko {name}?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Tämä poistaa ääninäytteen, keskusteluhistorian ja välimuistissa olevan äänen äänikloonia varten. Hoitotiimin ääniklooni säilyy muita potilaita varten. Tätä ei voi kumota.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Poista",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Hoitotiimi",
  "ui.provider.settings.care_team.empty":
    "Hoitajia ei ole vielä lisätty.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading": "Potilastiedot",
  "ui.provider.settings.patient_info.name_label": "Nimi",
  "ui.provider.settings.patient_info.bed_label": "Vuode / Huone",
  "ui.provider.settings.patient_info.language_label": "Kieli",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Potilaan kieli",
  "ui.provider.settings.lang.caregiver_section": "Hoitotiimin kieli",
  "ui.provider.settings.lang.caregiver_helper":
    "Kieli, jota hoitotiimisi ymmärtää. Asetetaan yleensä kerran laitetta kohden.",
  "ui.provider.settings.lang.change": "Vaihda kieli",

  "ui.provider.settings.lang.picker_title": "Valitse kieli",
  "ui.provider.settings.lang.patient_dialog.title":
    "Vaihdetaanko potilaan kieleksi {lang}?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Äänikloonisi pysyy valmiina — napauttamasi lauseet kuulostavat edelleen samalta. Valmistelemme äänen {providerCount} hoitotiimin äänelle (~{estimatedMinutes} min). Voit jatkaa sovelluksen käyttöä sillä välin.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Hoitotiimin äänikloonit eivät ole saatavilla kielellä {lang} — käytetään järjestelmän ääntä. Olemassa olevat nauhoitukset säilyvät, jos vaihdat myöhemmin tuettuun kieleen.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Napauttamasi lauseet kuulostavat edelleen samalta. Hoitotiimin ääniä ei ole määritetty, joten mitään ei tarvitse luoda uudelleen.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Vaihdetaanko hoitotiimin kieleksi {lang}?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Hoitotiimin ääniklooni pysyy valmiina. Valmistelemme potilaan äänen uudella kielellä (~{estimatedMinutes} min). Voit jatkaa sovelluksen käyttöä sillä välin.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Potilaan äänikloonaus ei ole saatavilla kielellä {lang} — käytetään järjestelmän ääntä. Nauhoitettu ääninäyte säilyy, jos vaihdat myöhemmin tuettuun kieleen.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Potilaan äänikloonia ei ole määritetty, joten mitään ei tarvitse luoda uudelleen.",
  "ui.provider.settings.patient_info.voice_label": "Ääni",
  "ui.provider.settings.patient_info.backup_voice_label": "Varaääni",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Järjestelmäääni, jota käytetään äänikloonia ladattaessa. Napauta kuullaksesi.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Sovellusdiagnostiikka",
  "ui.provider.settings.offline.status_description":
    "Tekoälymallien tila — sovellus käyttää niitä laitteella äänen luontiin, ehdotuksiin ja puheentunnistukseen.",
  "ui.provider.settings.offline.downloading": "Ladataan malleja…",
  "ui.provider.settings.offline.download_progress_aria":
    "Mallien latauksen edistyminen",
  "ui.provider.settings.offline.all_ready": "Kaikki mallit valmiina",
  "ui.provider.settings.offline.redownload_button": "Lataa mallit uudelleen",
  "ui.provider.settings.offline.already_up_to_date": "Jo ajan tasalla",
  "ui.provider.settings.offline.checking": "Tarkistetaan…",
  "ui.provider.settings.offline.verified": "✓ Mallit varmistettu",
  "ui.provider.settings.offline.check_button": "Tarkista olemassa olevat mallit",
  "ui.provider.settings.offline.redownloading": "Ladataan uudelleen…",
  "ui.provider.settings.offline.force_redownload_button":
    "Pakota kaikkien mallien uudelleenlataus",
  "ui.provider.settings.offline.model_status_ready": "valmis",
  "ui.provider.settings.offline.model_status_downloading": "ladataan…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "vaatii uudelleenyrityksen",
  "ui.provider.settings.offline.last_verified_prefix":
    "Viimeksi varmistettu: ",
  "ui.provider.settings.offline.storage_prefix": "Tallennustila: ",
  "ui.provider.settings.offline.storage_of": "/",
  "ui.provider.settings.offline.storage_used": " käytetty",
  "ui.provider.settings.offline.storage_low": " — vähissä",
  "ui.provider.settings.offline.clear_audio_cache":
    "Tyhjennä äänivälimuisti",
  "ui.provider.settings.offline.clearing": "Tyhjennetään…",
  "ui.provider.settings.offline.rebuilding":
    "Rakennetaan uudelleen: {current}/{total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Ladataanko kaikki tekoälymallit uudelleen?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Tämä lataa noin 1,7 Gt. Äänisynteesi toimii latauksen aikana.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Lataa uudelleen",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Vaihda potilasta",
  "ui.provider.switch.add_patient": "+ Lisää potilas",
  "ui.provider.patients.title": "Potilaat",
  "ui.provider.patients.actions_aria": "Toiminnot: {name}",
  "ui.provider.patients.action_edit": "Muokkaa",
  "ui.provider.patients.action_remove": "Poista",
  "ui.provider.switch.voice_captured": "Ääni tallennettu",
  "ui.provider.switch.no_voice": "Ei ääntä",
  "ui.provider.switch.last_active_just_now": "Juuri äsken",
  "ui.provider.switch.last_active_minutes":
    "Aktiivinen {n} min sitten",
  "ui.provider.switch.last_active_hours": "Aktiivinen {n} t sitten",
  "ui.provider.switch.last_active_days": "Aktiivinen {n} pv sitten",
  "ui.provider.switch.currently_active": "Nyt aktiivinen",
  "ui.provider.switch.switched_announcement":
    "Vaihdettu potilaaseen {name}. {count} viestiä keskustelussa.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Henkilökunnan istunto päättymässä",
  "ui.provider.staff_session.warning_body":
    "Henkilökunnan pääsy lukittuu {n} sekunnin kuluttua.",
  "ui.provider.staff_session.extend": "Jatka istuntoa",
  "ui.provider.staff_session.end_now": "Lopeta nyt",
  "ui.provider.nav.end_staff_session": "Lopeta henkilökunnan istunto",
  "ui.provider.nav.lock_now": "Lock",
  "ui.provider.nav.lock_now_aria": "Lock staff session now",
};

export default fi;
