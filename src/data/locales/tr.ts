/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) but NOT clinically validated.
 * Do NOT use in patient-facing settings until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Turkish (standard İstanbul Turkish)
 * Locale: tr
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 */
import type { LocaleStrings } from "./en";

const tr: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Evet",
  "quick.no": "Hayır",
  "quick.thank_you": "Teşekkür ederim",
  "quick.please_wait": "Lütfen bekleyin",
  "quick.dont_understand": "Anlamıyorum",
  "quick.repeat": "Lütfen tekrar edin",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Suya ihtiyacım var",
  "needs.comfort.hungry": "Açım",
  "needs.comfort.cold": "Üşüyorum",
  "needs.comfort.hot": "Sıcaklıyorum",
  "needs.comfort.bed": "Yatağımı ayarlayın",
  "needs.comfort.bathroom": "Tuvalete ihtiyacım var",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "İlacıma ihtiyacım var",
  "needs.medical.suction": "Aspirasyon yapılmasına ihtiyacım var",
  "needs.medical.nauseous": "Midem bulanıyor",
  "needs.medical.breathe": "İyi nefes alamıyorum",
  "needs.medical.nurse": "Hemşireye ihtiyacım var",
  "needs.medical.doctor": "Doktora ihtiyacım var",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Ailemi istiyorum",
  "needs.people.stay": "Birisi yanımda kalabilir mi?",
  "needs.people.call": "Birini aramak istiyorum",
  "needs.people.interpreter": "Tercümana ihtiyacım var",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Yorgunum",
  "feelings.physical.uncomfortable": "Rahatsızım",
  "feelings.physical.weak": "Kendimi güçsüz hissediyorum",
  "feelings.physical.better": "Kendimi daha iyi hissediyorum",
  "feelings.physical.dizzy": "Başım dönüyor",
  "feelings.physical.itchy": "Kaşıntım var",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Korkuyorum",
  "feelings.emotional.lonely": "Kendimi yalnız hissediyorum",
  "feelings.emotional.frustrated": "Çok bunalıyorum",
  "feelings.emotional.confused": "Kafam karışık",
  "feelings.emotional.safe": "Kendimi güvende hissediyorum",
  "feelings.emotional.grateful": "Minnettarım",
  "feelings.emotional.worried": "Endişeleniyorum",
  "feelings.emotional.hopeful": "Umutluyum",
  "feelings.emotional.bored": "Canım sıkılıyor",
  "feelings.emotional.embarrassed": "Utanıyorum",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Saat kaç?",
  "questions.day": "Bugün günlerden ne?",
  "questions.whats_happening": "Bana ne oluyor?",
  "questions.go_home": "Ne zaman eve gidebilirim?",
  "questions.next_medication": "Bir sonraki ilacım ne zaman?",
  "questions.explain_treatment": "Tedavimi açıklar mısınız?",
  "questions.nurse_today": "Bugün hemşirem kim?",
  "questions.eat_drink": "Yiyip içebilir miyim?",
  "questions.see_family": "Ailemi ne zaman görebilirim?",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Ağrı yok",
  "pain.face.2": "Biraz ağrıyor",
  "pain.face.4": "Biraz daha ağrıyor",
  "pain.face.6": "Daha çok ağrıyor",
  "pain.face.8": "Çok ağrıyor",
  "pain.face.10": "En şiddetli ağrı",

  // ── Pain: Descriptors ──────────────────────────────────────────
  "pain.descriptor.aching": "Sızlayan",
  "pain.descriptor.burning": "Yanıcı",
  "pain.descriptor.sharp": "Keskin",
  "pain.descriptor.throbbing": "Zonklayan",
  "pain.descriptor.cramping": "Kramp şeklinde",
  "pain.descriptor.constant": "Sürekli",
  "pain.descriptor.comes_and_goes": "Gelip gidiyor",
  "pain.descriptor.numb": "Uyuşuk",
  "pain.descriptor.pressure": "Baskı hissi",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Baş",
  "pain.region.face": "Yüz",
  "pain.region.neck": "Boyun",
  "pain.region.chest": "Göğüs",
  "pain.region.left_shoulder": "Sol Omuz",
  "pain.region.right_shoulder": "Sağ Omuz",
  "pain.region.left_arm": "Sol Kol",
  "pain.region.right_arm": "Sağ Kol",
  "pain.region.stomach": "Karın",
  "pain.region.upper_back": "Üst Sırt",
  "pain.region.lower_back": "Bel",
  "pain.region.left_leg": "Sol Bacak",
  "pain.region.right_leg": "Sağ Bacak",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  // Turkish is agglutinative; placeholders are kept bare with word-order phrasing.
  "pain.sentence":
    "{region} bölgesinde {descriptor} ağrım var, 10 üzerinden {severity}",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Şiddet",
  "pain.step.location": "Konum",
  "pain.step.descriptor": "Tanımlama",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Hedeflerim",
  "wishes.worries.label": "Endişelerim",
  "wishes.strength.label": "Gücüm",
  "wishes.joy.label": "Bana Neşe Veren",
  "wishes.tradeoffs.label": "Tedavim Hakkında",
  "wishes.family.label": "Ailem",
  "wishes.hopes.label": "Umutlarım",

  // Questions (siz-form: provider → patient)
  "wishes.goals.question": "En önemli hedefleriniz nelerdir?",
  "wishes.worries.question": "En büyük endişeleriniz nelerdir?",
  "wishes.strength.question": "Size güç veren nedir?",
  "wishes.joy.question": "Hayatınıza neşe ve anlam katan nedir?",
  "wishes.tradeoffs.question":
    "Daha fazla zaman için ne kadar zorluk göze alabilirsiniz?",
  "wishes.family.question":
    "Size en yakın kişiler dilekleriniz hakkında ne kadar bilgi sahibi?",
  "wishes.hopes.question": "Umutlarınız nelerdir?",

  // Stems (for composeSentence)
  // TODO(translator): Verify stems work naturally when composed with response lists via "wishes.compose"
  "wishes.goals.stem": "Benim için en önemli olan",
  "wishes.worries.stem": "Endişelendiğim şey",
  "wishes.strength.stem": "Bana güç veren",
  "wishes.joy.stem": "Bana neşe veren",
  "wishes.tradeoffs.stem": "Tedavim hakkında",
  "wishes.family.stem": "Ailem hakkında",
  "wishes.hopes.stem": "Umudum",

  // Responses — goals
  "wishes.goals.r.family": "Ailemle birlikte olmak",
  "wishes.goals.r.comfort": "Rahat olmak ve ağrısız yaşamak",
  "wishes.goals.r.longevity": "Mümkün olduğunca uzun yaşamak",
  "wishes.goals.r.home": "Eve gitmek",
  "wishes.goals.r.independence": "Kendi işlerimi kendim yapabilmek",
  "wishes.goals.r.peace": "Huzurlu olmak",

  // Responses — worries
  "wishes.worries.r.suffering": "Acı çekmek veya ağrı içinde olmak",
  "wishes.worries.r.alone": "Yalnız kalmak",
  "wishes.worries.r.burden": "Aileme yük olmak",
  "wishes.worries.r.activities": "Sevdiğim şeyleri yapamamak",
  "wishes.worries.r.leaving": "Ailemi geride bırakmak",
  "wishes.worries.r.unknown": "Neler olacağını bilmemek",

  // Responses — strength
  "wishes.strength.r.family": "Ailem",
  "wishes.strength.r.faith": "İnancım",
  "wishes.strength.r.friends": "Arkadaşlarım",
  "wishes.strength.r.wishes_heard": "Dileklerimin duyulduğunu bilmek",
  "wishes.strength.r.hope": "İyileşeceğime dair umut",
  "wishes.strength.r.carers": "Bana bakım veren insanlar",

  // Responses — joy
  "wishes.joy.r.family": "Ailemle vakit geçirmek",
  "wishes.joy.r.outdoors": "Açık havada olmak",
  "wishes.joy.r.hobbies": "Hobilerim ve ilgi alanlarım",
  "wishes.joy.r.helping": "Başkalarına yardım etmek",
  "wishes.joy.r.spiritual": "Manevi ibadetlerim",
  "wishes.joy.r.routines": "Basit günlük alışkanlıklarım",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Mümkün olan her tedaviyi istiyorum",
  "wishes.tradeoffs.r.good_chance":
    "İyi bir şansı varsa tedavi istiyorum",
  "wishes.tradeoffs.r.try_stop":
    "Denemek istiyorum ama işe yaramıyorsa durulsun",
  "wishes.tradeoffs.r.comfortable": "Rahat olmaya odaklanmak istiyorum",
  "wishes.tradeoffs.r.think": "Düşünmek için daha fazla zamana ihtiyacım var",
  "wishes.tradeoffs.r.family_first": "Önce ailemle konuşmam gerekiyor",

  // Responses — family
  "wishes.family.r.know_well": "Dileklerimi iyi biliyorlar",
  "wishes.family.r.know_some": "Dileklerimin bir kısmını biliyorlar",
  "wishes.family.r.not_talked": "Henüz bu konuyu konuşmadık",
  "wishes.family.r.need_help": "Onlara söylemek için yardıma ihtiyacım var",
  "wishes.family.r.team_explain":
    "Bakım ekibimin açıklamasına yardım etmesini istiyorum",

  // Responses — hopes
  "wishes.hopes.r.get_better": "İyileşmek",
  "wishes.hopes.r.go_home": "Eve gitmek",
  "wishes.hopes.r.comfortable": "Rahat olmak",
  "wishes.hopes.r.family_ok": "Ailemin iyi olması",
  "wishes.hopes.r.more_time": "Daha fazla zamanım olması",
  "wishes.hopes.r.peace": "Huzur bulmak",

  // Wish sentence composition templates
  // TODO(translator): Colon form avoids Turkish copula-suffix issue with bare {stem} + {list}
  "wishes.compose": "{stem}: {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Yardım edecek birini çağıracağım.",
  "provider.responses.interpreter": "Bir tercüman çağıracağım.",
  "provider.responses.family": "Ailenizi arayacağım.",
  "provider.responses.get_that": "Onu sizin için getireceğim.",
  "provider.responses.doctor_know": "Doktora haber vereceğim.",
  "provider.responses.medication": "İlacınızı getireceğim.",
  "provider.responses.family_coming": "Aileniz yolda.",
  "provider.responses.doctor_soon": "Doktor birazdan gelecek.",
  "provider.responses.doing_well": "İyi gidiyorsunuz.",
  "provider.responses.rest": "Şimdi dinlenmeye çalışın.",

  "provider.questions.feeling": "Kendinizi nasıl hissediyorsunuz?",
  "provider.questions.need": "İhtiyacınız olan bir şey var mı?",
  "provider.questions.where_hurts": "Nerenizin ağrıdığını gösterebilir misiniz?",
  "provider.questions.rate_pain": "Ağrınızı 0'dan 10'a kadar derecelendirin.",
  "provider.questions.sleep": "İyi uyudunuz mu?",
  "provider.questions.comfortable": "Rahat mısınız?",

  "provider.directions.procedure": "İşleminiz bugün planlandı.",
  "provider.directions.stay_in_bed": "Yatakta kalmanız gerekiyor.",
  "provider.directions.vitals": "Yaşam bulgularınızı kontrol edeceğim.",
  "provider.directions.medication_time": "İlaç zamanı.",
  "provider.directions.breathe": "Derin nefes almaya çalışın.",
  "provider.directions.call_button":
    "Bir şeye ihtiyacınız olursa çağrı düğmesine basın.",

  "provider.goals_of_care.matters_most":
    "Sizin için en önemli olan şeyler hakkında konuşmak istiyorum.",
  "provider.goals_of_care.goals":
    "Şu anda en önemli hedefleriniz nelerdir?",
  "provider.goals_of_care.worries":
    "En büyük endişeleriniz nelerdir?",
  "provider.goals_of_care.strength": "Size güç veren nedir?",
  "provider.goals_of_care.joy":
    "Hayatınıza neşe ve anlam katan nedir?",
  "provider.goals_of_care.wishes":
    "Sevdikleriniz dilekleriniz hakkında ne kadar bilgi sahibi?",
  "provider.goals_of_care.hopes": "Umutlarınız nelerdir?",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "İyi uyudum",
  "time.morning.didnt_sleep": "İyi uyuyamadım",
  "time.morning.breakfast": "Kahvaltıya ihtiyacım var",
  "time.morning.doctor_coming": "Doktor ne zaman gelecek?",

  "time.afternoon.tired": "Yorgunum",
  "time.afternoon.lunch": "Öğle yemeği yiyebilir miyim?",
  "time.afternoon.see_family": "Ailemi ne zaman görebilirim?",
  "time.afternoon.rest": "Dinlenmem gerekiyor",

  "time.evening.cant_sleep": "Uyuyamıyorum",
  "time.evening.medication": "İlacıma ihtiyacım var",
  "time.evening.call_family": "Ailemi arayabilir miyim?",
  "time.evening.pain": "Ağrım var",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Turkish SOV word order and agglutination may not compose cleanly — review each path.
  "suggest.start.i_am": "Ben",
  "suggest.start.i_feel": "Kendimi",
  "suggest.start.i_want": "İstiyorum",
  "suggest.start.i_need": "İhtiyacım var",
  "suggest.start.please": "Lütfen",
  "suggest.start.when": "Ne zaman",
  "suggest.start.can_you": "Yapabilir misiniz",
  "suggest.start.tell_me": "Bana söyleyin",

  "suggest.i_am.in_pain": "ağrım var",
  "suggest.i_am.cold": "üşüyorum",
  "suggest.i_am.hot": "sıcaklıyorum",
  "suggest.i_am.hungry": "açım",
  "suggest.i_am.thirsty": "susadım",
  "suggest.i_am.tired": "yorgunum",
  "suggest.i_am.uncomfortable": "rahatsızım",
  "suggest.i_am.okay": "iyiyim",
  "suggest.i_am.not_okay": "iyi değilim",
  "suggest.i_am.ready": "hazırım",

  "suggest.i_feel.scared": "korkuyorum",
  "suggest.i_feel.sick": "hasta hissediyorum",
  "suggest.i_feel.dizzy": "başım dönüyor",
  "suggest.i_feel.weak": "güçsüz hissediyorum",
  "suggest.i_feel.better": "daha iyi hissediyorum",
  "suggest.i_feel.worse": "daha kötü hissediyorum",
  "suggest.i_feel.nauseous": "midem bulanıyor",
  "suggest.i_feel.lonely": "yalnız hissediyorum",
  "suggest.i_feel.confused": "kafam karışık",
  "suggest.i_feel.safe": "güvende hissediyorum",

  "suggest.i_feel_scared.procedure": "işlem yüzünden",
  "suggest.i_feel_scared.happening": "olan şeyler yüzünden",
  "suggest.i_feel_scared.alone": "yalnız kalmaktan",
  "suggest.i_feel_scared.need_someone": "ve birine ihtiyacım var",

  "suggest.i_feel_sick.stomach": "mide bulantısı",
  "suggest.i_feel_sick.dizzy": "ve başım dönüyor",
  "suggest.i_feel_sick.help": "ve yardıma ihtiyacım var",

  "suggest.i_want.water": "su",
  "suggest.i_want.family": "ailemi görmek",
  "suggest.i_want.go_home": "eve gitmek",
  "suggest.i_want.sleep": "uyumak",
  "suggest.i_want.medication": "ilacımı",
  "suggest.i_want.blanket": "battaniye",
  "suggest.i_want.talk": "biriyle konuşmak",
  "suggest.i_want.nurse": "hemşireyi",

  "suggest.i_want_to_go.home": "eve",
  "suggest.i_want_to_go.sleep": "uyumaya",
  "suggest.i_want_to_go.bathroom": "tuvalete",

  "suggest.i_want_my.family": "ailem",
  "suggest.i_want_my.medication": "ilacım",
  "suggest.i_want_my.phone": "telefonum",
  "suggest.i_want_my.glasses": "gözlüğüm",
  "suggest.i_want_my.blanket": "battaniyem",

  "suggest.i_need.help": "yardım",
  "suggest.i_need.water": "su",
  "suggest.i_need.bathroom": "tuvalet",
  "suggest.i_need.medication": "ilacım",
  "suggest.i_need.nurse": "hemşire",
  "suggest.i_need.doctor": "doktor",
  "suggest.i_need.rest": "dinlenmek",
  "suggest.i_need.blanket": "battaniye",
  "suggest.i_need.suction": "aspirasyon",

  "suggest.i_need_the.nurse": "hemşire",
  "suggest.i_need_the.doctor": "doktor",
  "suggest.i_need_the.bathroom": "tuvalet",
  "suggest.i_need_the.light_off": "ışık kapalı",
  "suggest.i_need_the.light_on": "ışık açık",

  "suggest.i_need_my.medication": "ilacım",
  "suggest.i_need_my.family": "ailem",
  "suggest.i_need_my.glasses": "gözlüğüm",
  "suggest.i_need_my.phone": "telefonum",

  "suggest.please.help_me": "bana yardım edin",
  "suggest.please.call_family": "ailemi arayın",
  "suggest.please.light_off": "ışığı kapatın",
  "suggest.please.adjust_bed": "yatağımı ayarlayın",
  "suggest.please.give_me": "bana verin",
  "suggest.please.explain": "açıklayın",
  "suggest.please.come_back": "yakında gelin",
  "suggest.please.stay": "yanımda kalın",
  "suggest.please.dont_leave": "gitmeyin",

  "suggest.please_help_me.pain": "Ağrım var",
  "suggest.please_help_me.breathe": "Nefes alamıyorum",
  "suggest.please_help_me.sick": "Kendimi hasta hissediyorum",
  "suggest.please_help_me.scared": "Korkuyorum",

  "suggest.please_give_me.water": "su",
  "suggest.please_give_me.medication": "ilacımı",
  "suggest.please_give_me.blanket": "battaniye",
  "suggest.please_give_me.pain_relief": "ağrı kesici",

  "suggest.when.go_home": "eve gidebilirim?",
  "suggest.when.family": "ailem gelecek?",
  "suggest.when.medication": "bir sonraki ilacım?",
  "suggest.when.doctor": "doktor gelecek?",
  "suggest.when.eat": "yiyebilirim?",
  "suggest.when.over": "bu bitecek?",

  "suggest.can_you.help": "bana yardım edebilir misiniz?",
  "suggest.can_you.call_family": "ailemi arayabilir misiniz?",
  "suggest.can_you.get_nurse": "hemşireyi çağırabilir misiniz?",
  "suggest.can_you.explain": "neler olduğunu açıklayabilir misiniz?",
  "suggest.can_you.light_off": "ışığı kapatabilir misiniz?",
  "suggest.can_you.adjust_bed": "yatağımı ayarlayabilir misiniz?",
  "suggest.can_you.stay": "yanımda kalabilir misiniz?",

  "suggest.tell_me.happening": "neler oluyor",
  "suggest.tell_me.time": "saat kaç",
  "suggest.tell_me.go_home": "ne zaman eve gidebilirim",
  "suggest.tell_me.day": "bugün günlerden ne",
  "suggest.tell_me.treatment": "tedavim hakkında",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "lütfen yardım edin",
  "suggest.i_am_in_pain.worse": "ve giderek artıyor",
  "suggest.i_am_in_pain.medication": "ve ilaca ihtiyacım var",
  "suggest.i_am_in_pain.back": "sırtımda",
  "suggest.i_am_in_pain.chest": "göğsümde",
  "suggest.i_am_in_pain.stomach": "karnımda",

  // After "I need help"
  "suggest.i_need_help.up": "kalkmak için",
  "suggest.i_need_help.breathing": "nefes almak için",
  "suggest.i_need_help.pain": "ağrı için",
  "suggest.i_need_help.now": "hemen şimdi",
  "suggest.i_need_help.please": "lütfen",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "öncekinden",
  "suggest.i_feel_better.now": "şimdi",
  "suggest.i_feel_better.thanks": "teşekkürler",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "öncekinden",
  "suggest.i_feel_worse.need_doctor": "Doktora ihtiyacım var",
  "suggest.i_feel_worse.help": "lütfen yardım edin",
  "suggest.i_feel_worse.medication": "İlaca ihtiyacım var",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "Kendimi",
  "suggest.ctx.feeling.i_am": "Ben",
  "suggest.ctx.feeling.better": "Öncekinden daha iyi",
  "suggest.ctx.feeling.not_great": "Pek iyi değil",
  "suggest.ctx.feeling.pain": "Ağrım var",
  "suggest.ctx.feeling.okay": "İyiyim",
  "suggest.ctx.feeling.help": "Bana yardım edebilir misiniz?",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "İhtiyacım var",
  "suggest.ctx.need.i_want": "İstiyorum",
  "suggest.ctx.need.fine": "Şu an iyiyim",
  "suggest.ctx.need.yes": "Evet, lütfen",
  "suggest.ctx.need.no": "Hayır, teşekkürler",
  "suggest.ctx.need.stay": "Kalabilir misiniz?",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "Başım",
  "suggest.ctx.where_hurts.chest": "Göğsüm",
  "suggest.ctx.where_hurts.stomach": "Karnım",
  "suggest.ctx.where_hurts.back": "Sırtım",
  "suggest.ctx.where_hurts.left_arm": "Sol kolum",
  "suggest.ctx.where_hurts.right_leg": "Sağ bacağım",
  "suggest.ctx.where_hurts.everywhere": "Her yerim",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "Çok şiddetli",
  "suggest.ctx.pain.worse": "Giderek artıyor",
  "suggest.ctx.pain.same": "Aynı seviyede",
  "suggest.ctx.pain.little_better": "Biraz daha iyi",
  "suggest.ctx.pain.need_relief": "Ağrı kesiciye ihtiyacım var",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "Rahatım",
  "suggest.ctx.comfort.not_comfortable": "Rahat değilim",
  "suggest.ctx.comfort.cant_sleep": "Uyuyamıyorum",
  "suggest.ctx.comfort.cold": "Üşüyorum",
  "suggest.ctx.comfort.hot": "Sıcaklıyorum",
  "suggest.ctx.comfort.adjust_bed": "Yatağımı ayarlayabilir misiniz?",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "Uyuyamıyorum",
  "suggest.ctx.night.i_need": "İhtiyacım var",
  "suggest.ctx.night.pain": "Ağrım var",
  "suggest.ctx.night.i_feel": "Kendimi",
  "suggest.ctx.night.can_you": "Yapabilir misiniz",
  "suggest.ctx.night.please": "Lütfen",
  "suggest.ctx.night.i_am": "Ben",
  "suggest.ctx.night.when": "Ne zaman",

  // Morning starters
  "suggest.ctx.morning.i_am": "Ben",
  "suggest.ctx.morning.i_need": "İhtiyacım var",
  "suggest.ctx.morning.i_feel": "Kendimi",
  "suggest.ctx.morning.doctor": "Doktor ne zaman gelecek?",
  "suggest.ctx.morning.i_want": "İstiyorum",
  "suggest.ctx.morning.can_you": "Yapabilir misiniz",
  "suggest.ctx.morning.please": "Lütfen",
  "suggest.ctx.morning.tell_me": "Bana söyleyin",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Hızlı",
  "cat.needs": "İhtiyaç",
  "cat.feelings": "Duygu",
  "cat.pain": "Ağrı",
  "cat.questions": "Soru",
  "sub.comfort": "Konfor",
  "sub.medical": "Tıbbi",
  "sub.people": "Kişiler",
  "sub.physical": "Fiziksel",
  "sub.emotional": "Duygusal",

  // Provider category labels
  "provider.cat.responses": "Yanıtlar",
  "provider.cat.questions": "Sorular",
  "provider.cat.directions": "Yönergeler",
  "provider.cat.goals_of_care": "Bakım Hedefleri",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — {name} görüşmesi",
  "ui.patient.app.name_fallback": "Hasta",
  "ui.patient.header.name_fallback": "Hasta",
  "ui.patient.header.bed_prefix": "Yatak ",
  "ui.dual.nav.wishes": "Dilekler",
  "ui.dual.nav.listen": "Dinle",
  "ui.provider.nav.staff": "Personel",
  "ui.provider.nav.switch_patient": "Hasta Değiştir",
  "ui.provider.nav.settings": "Ayarlar",
  "ui.provider.nav.theme.auto": "Otomatik",
  "ui.provider.nav.theme.light": "Açık",
  "ui.provider.nav.theme.dark": "Koyu",
  "ui.patient.tabbar.say_more": "Daha Fazla Söyle",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Ne kadar ağrınız var?",
  "ui.dual.pain.heading.location": "Ağrınız nerede?",
  "ui.dual.pain.heading.descriptor": "Ağrı nasıl hissettiriyor?",
  "ui.patient.pain.step_of": "Adım {n} / {total}",
  "ui.patient.pain.back_to": "{label} adımına geri dön",
  "ui.patient.pain.level_aria": "Ağrı düzeyi {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "{name} — Dilekler",
  "ui.patient.wishes.my_wishes": "Dileklerim",
  "ui.patient.wishes.step_of": "Adım {n} / {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Hiç dilek paylaşılmadı.",
  "ui.patient.wishes.share_all_again": "Tüm dilekleri tekrar paylaş",
  "ui.patient.wishes.close": "Kapat",
  "ui.patient.wishes.share": "Paylaş",
  "ui.patient.wishes.skip": "Atla",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Aşağıdaki kelimelere dokunun veya yazın...",
  "ui.patient.builder.message_aria": "Mesajınız",
  "ui.patient.builder.undo": "Son kelimeyi geri al",
  "ui.patient.builder.clear": "Mesajı sil",
  "ui.patient.builder.refresh_ai": "Yapay zeka önerilerini yenile",
  "ui.patient.builder.ai_thinking": "Yapay zeka düşünüyor...",
  "ui.patient.builder.no_ai_suggestions":
    "Yapay zeka önerisi yok. Tekrar denemek için yenile düğmesine dokunun.",
  "ui.patient.builder.ready":
    "Mesajınız hazır. Göndermek için Konuş düğmesine dokunun.",
  "ui.patient.builder.speak": "Konuş",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Tekrarla: {text}",
  "ui.dual.thread.aria_label": "Conversation",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Bakım Ekibi",
  "ui.provider.fallback_name": "Sağlık Personeli",
  "ui.provider.speaking_to": "{prov} olarak {name} ile konuşuluyor",
  "ui.provider.patient_fallback": "hasta",
  "ui.provider.close_panel": "Paneli kapat",
  "ui.provider.select_provider": "{name} seç",
  "ui.provider.show_category": "{key} göster",
  "ui.provider.speak_phrase": "Söyle: {phrase}",
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
  "ui.provider.listen.title": "Dinle",
  "ui.provider.listen.stop_aria": "Dinlemeyi durdur",
  "ui.provider.listen.start_aria": "Dinlemeye başlamak için dokunun",
  "ui.provider.listen.listening": "Dinleniyor...",
  "ui.provider.listen.transcribing": "Yazıya dökülüyor...",
  "ui.provider.listen.listening_placeholder": "Konuşma dinleniyor...",
  "ui.provider.listen.transcribing_placeholder": "Konuşma yazıya dökülüyor...",
  "ui.provider.listen.type_placeholder": "Veya söyleneni yazın...",
  "ui.provider.listen.transcript_aria": "Transkript",
  "ui.provider.listen.audio_level_aria": "Mikrofon ses seviyesi",
  "ui.provider.listen.add_as": "{prov} olarak görüşmeye ekle",
  "ui.provider.listen.privacy_notice":
    "Cihaz üzerinde · Whisper · ses bu cihazdan çıkmaz",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Konuşuluyor: {text}",
  "ui.dual.speaking.patient_voice": "Sesiniz",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "PIN Girin",
  "ui.provider.pin_gate.subtitle": "Yalnızca personel erişimi",
  "ui.provider.pin_gate.incorrect": "Yanlış PIN",
  "ui.provider.pin_gate.delete_aria": "Sil",
  "ui.provider.pin_gate.digit_aria": "Rakam {n}",
  "ui.provider.pin_gate.cancel": "İptal",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Bir cümleyi sesli olarak okuyacaksınız.",
  "ui.provider.voice_capture.coaching_breath":
    "Birkaç derin nefes alın.",
  "ui.provider.voice_capture.coaching_ready": "Hazır.",
  "ui.provider.voice_capture.breathe_in": "Nefes alın…",
  "ui.provider.voice_capture.breathe_out": "Nefes verin…",
  "ui.provider.voice_capture.creating": "Ses klonu oluşturuluyor...",
  "ui.provider.voice_capture.creating_from_sample":
    "Örnekten ses klonu oluşturuluyor...",
  "ui.provider.voice_capture.loading_model":
    "Ses modeli yükleniyor...",
  "ui.provider.voice_capture.clone_failed": "Klonlama başarısız",
  "ui.provider.voice_capture.captured": "Ses kaydedildi",
  "ui.provider.voice_capture.stop": "Durdur",
  "ui.provider.voice_capture.play": "Oynat",
  "ui.provider.voice_capture.discard": "Kaydı sil",
  "ui.provider.voice_capture.use_recording": "Bu kaydı kullan",
  "ui.provider.voice_capture.upload_file": "Dosya yükle",
  "ui.provider.voice_capture.record": "Kaydet",
  "ui.provider.voice_capture.stop_early": "Erken durdur",
  "ui.provider.voice_capture.remove": "Kaldır",
  "ui.provider.voice_capture.retry": "Tekrar Dene",
  "ui.provider.voice_capture.done": "Tamam!",
  "ui.provider.voice_capture.cancel": "İptal",
  "ui.provider.voice_capture.seconds_recorded": "{n}sn kaydedildi",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Kayıt geri sayımını iptal et",
  "ui.provider.voice_capture.stop_early_aria":
    "Kaydı erken durdur",
  "ui.provider.voice_capture.audio_level_aria": "Ses düzeyi",
  "ui.provider.voice_capture.recording_progress_aria":
    "Kayıt ilerlemesi",
  "ui.provider.voice_capture.stop_preview_aria":
    "Önizleme oynatmayı durdur",
  "ui.provider.voice_capture.play_preview_aria":
    "Kayıt önizlemesini oynat",
  "ui.provider.voice_capture.discard_aria":
    "Bu kaydı sil ve baştan başla",
  "ui.provider.voice_capture.stop_playback_aria":
    "Kaydedilmiş örneğin oynatmasını durdur",
  "ui.provider.voice_capture.play_sample_aria":
    "Kaydedilmiş ses örneğini oynat",
  "ui.provider.voice_capture.remove_aria": "Ses örneğini kaldır",
  "ui.provider.voice_capture.retry_aria":
    "Ses klonu çıkarmayı tekrar dene",
  "ui.provider.voice_capture.upload_aria":
    "Dosyadan ses örneği yükle",
  "ui.provider.voice_capture.record_aria":
    "Mikrofondan ses örneği kaydet",
  "ui.provider.voice_capture.err_network":
    "Ses modeline ulaşılamadı. Bağlantınızı kontrol edip Tekrar Dene düğmesine dokunun.",
  "ui.provider.voice_capture.err_timeout":
    "Ses işleme çok uzun sürdü. Tekrar denemek için Tekrar Dene düğmesine dokunun.",
  "ui.provider.voice_capture.err_mic_denied":
    "Mikrofon erişimi engellendi. Tarayıcı ayarlarından etkinleştirin veya dosya yükleyin.",
  "ui.provider.voice_capture.err_generic":
    "Sesinizi hazırlamayı tamamlayamadık. Tekrar denemek için Tekrar Dene düğmesine dokunun.",
  "ui.provider.voice_capture.err_too_short":
    "Kayıt çok kısaydı. Geri sayım boyunca konuşun, ardından Tekrar Dene düğmesine dokunun.",
  "ui.provider.voice_capture.err_too_noisy":
    "Arka plan gürültüsü temiz bir ses klonu için çok yüksekti. Daha sessiz bir yere geçin ve Tekrar Dene düğmesine dokunun.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Mikrofon erişimi reddedildi. Dosya yüklemeyi deneyin.",
  "ui.provider.voice_capture.err_playback":
    "Ses oynatılamadı.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Gelişmiş",
  "ui.provider.fallback_voice.enhanced_aria": "Gelişmiş yapay zeka sesi",
  "ui.provider.fallback_voice.on_device_badge": "Cihaz üzerinde",
  "ui.provider.fallback_voice.playing": "Oynatılıyor...",
  "ui.provider.fallback_voice.unavailable":
    "Sistem sesleri bu cihazda kullanılamıyor.",
  "ui.provider.fallback_voice.loading":
    "Kullanılabilir sesler yükleniyor...",
  "ui.provider.fallback_voice.hide_others": "Diğer sesleri gizle",
  "ui.provider.fallback_voice.more_voices": "Daha fazla ses ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  // Step labels (progress bar)
  "ui.provider.setup.steps.patient": "Hasta",
  "ui.provider.setup.steps.voice": "Ses",
  "ui.provider.setup.steps.care_team": "Ekip",
  "ui.provider.setup.steps.confirm": "Onay",

  // Skip button + confirm dialog
  "ui.provider.setup.skip": "Atla →",
  "ui.provider.setup.skip_aria": "Kurulumu atla",
  "ui.provider.setup.skip_dialog.title": "Kurulum atlansın mı?",
  "ui.provider.setup.skip_dialog.body": "OwnVoice'u şimdi kullanmaya başlayın. Kurulumu daha sonra üst kısımdaki hasta adına dokunarak tamamlayabilirsiniz.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Hiçbir hasta eklenmeyecek.",
  "ui.provider.setup.skip_dialog.confirm": "Kurulumu atla",
  "ui.provider.setup.skip_dialog.cancel": "Devam et",

  // Navigation
  "ui.provider.setup.back": "Geri",
  "ui.provider.setup.continue": "Devam",
  "ui.provider.setup.start": "OwnVoice'u Başlat",

  // Step 0: Patient info
  "ui.provider.setup.step0.heading": "OwnVoice'a Hoş Geldiniz",
  "ui.provider.setup.step0.subhead":
    "İletişim panonuzu kuralım. Her şey bu cihazda kalır.",
  "ui.provider.setup.step0.name_label": "Hasta adı",
  "ui.provider.setup.step0.name_placeholder": "Ad veya tercih edilen isim",
  "ui.provider.setup.step0.bed_label": "Yatak / Oda",
  "ui.provider.setup.step0.bed_placeholder": "ör. 4B-12",
  "ui.provider.setup.step0.language_label": "Dil",

  // Step 1: Voice sample
  "ui.provider.setup.step1.heading": "Ses örneği",
  "ui.provider.setup.step1.body1":
    "OwnVoice'un hastanın kendi sesiyle konuşabilmesi için bir ses örneği alın. Bu adım isteğe bağlıdır.",
  "ui.provider.setup.step1.body2":
    "Ses klonlama tamamen cihaz üzerinde çalışır. Bu tabletten hiçbir ses dışarı çıkmaz.",
  "ui.provider.setup.step1.patient_label": "Hasta",
  "ui.provider.setup.step1.backup_voice_heading": "Yedek ses",
  "ui.provider.setup.step1.backup_voice_body1":
    "Ses klonu yüklenirken veya örnek kaydedilmediyse kullanılacak bir sistem sesi seçin. Önizleme için bir sese dokunun.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Bu, cihazınızın yerleşik metin-konuşma özelliğini kullanır.",

  // Step 2: Care team
  "ui.provider.setup.step2.heading": "Bakım ekibi",
  "ui.provider.setup.step2.body":
    "Bu hastaya bakacak sağlık personelini ekleyin.",
  "ui.provider.setup.step2.icon_label": "Simge",
  "ui.provider.setup.step2.name_label": "Ad",
  "ui.provider.setup.step2.name_placeholder":
    "Dr. Yılmaz, Hemşire Ayşe...",
  "ui.provider.setup.step2.add": "Ekle",

  // Step 3: Confirm
  "ui.provider.setup.step3.heading": "Hazır",
  "ui.provider.setup.step3.body":
    "Kurulumunuzu gözden geçirin. Daha sonra Ayarlar bölümünden değiştirebilirsiniz.",
  "ui.provider.setup.step3.summary.patient": "Hasta",
  "ui.provider.setup.step3.summary.bed": "Yatak / Oda",
  "ui.provider.setup.step3.summary.language": "Dil",
  "ui.provider.setup.step3.summary.language_default": "İngilizce",
  "ui.provider.setup.step3.summary.voice": "Ses",
  "ui.provider.setup.step3.summary.care_team": "Bakım ekibi",
  "ui.provider.setup.step3.summary.not_set": "Ayarlanmadı",
  "ui.provider.setup.step3.summary.captured": "Kaydedildi",
  "ui.provider.setup.step3.summary.not_captured": "Kaydedilmedi",
  "ui.provider.setup.step3.summary.none_added": "Hiç eklenmedi",
  "ui.provider.setup.step3.pin_label": "Personel PIN (isteğe bağlı)",
  "ui.provider.setup.step3.pin_body":
    "Sağlık personeli ayarlarını korumak için 4 haneli bir PIN belirleyin.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Ayarlar",
  "ui.provider.settings.done": "Tamam",
  "ui.provider.settings.close_aria": "Ayarları kapat",

  "ui.provider.patient_edit.title": "{name} düzenle",
  "ui.provider.patient_edit.title_default": "Hastayı düzenle",
  "ui.provider.patient_edit.close_aria": "Hasta düzenleyiciyi kapat",
  "ui.provider.patient_pill.aria": "Hastayı düzenle: {name}",
  "ui.provider.nav.staff_menu": "Ayarlar",
  "ui.provider.staff_sheet.title": "Personel",
  "ui.provider.staff_sheet.close_aria": "Personel menüsünü kapat",
  "ui.provider.staff_sheet.patients_description": "Hasta değiştir, ekle veya düzenle",
  "ui.provider.staff_sheet.settings_description": "Bakım ekibi, erişilebilirlik, çevrimdışı",
  "ui.provider.staff_sheet.end_session_description": "Personel modundan çık",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "{label} ses hazırlığı iptal edilsin mi?",
  "ui.provider.settings.voice_cache.discard_body":
    "İlerleme kaybolacak ({current} / {total} cümle). Kaydedilmiş ses örneği saklanır — hazırlığı daha sonra yeniden başlatabilirsiniz.",
  "ui.provider.settings.voice_cache.cancel": "İptal",
  "ui.provider.settings.voice_cache.cancel_aria":
    "İptal et ve ses hazırlığını koru",
  "ui.provider.settings.voice_cache.discard_confirm": "İptal Et",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Ses hazırlığını iptal etmeyi onayla",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "{label} ses hazırlığını iptal et",
  // TODO(translator): {plural} token is an English suffix — Turkish doesn't pluralize after numerals, so empty is correct
  "ui.provider.settings.voice_cache.queued":
    "Sırada — {label} sesi sırada hazırlanacak ({total} cümle{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "{label} sesi hazırlanıyor… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Duraklatıldı — {label} sesi… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Devam Et",
  "ui.provider.settings.voice_cache.resume_aria":
    "{label} ses hazırlığını sürdür",
  "ui.provider.settings.voice_cache.pause": "Duraklat",
  "ui.provider.settings.voice_cache.pause_aria":
    "{label} ses hazırlığını duraklat",
  "ui.provider.settings.voice_cache.done":
    "Ses klonu etkin — {label} sesiyle tüm {total} cümle hazır",
  // TODO(translator): {plural} token is an English suffix — Turkish doesn't pluralize after numerals, so empty is correct
  "ui.provider.settings.voice_cache.failed":
    "{label} için {count} cümle{plural} başarısız oldu",
  "ui.provider.settings.voice_cache.retry": "Tekrar Dene",
  "ui.provider.settings.voice_cache.retry_aria":
    "Başarısız ses önbelleği cümlelerini tekrar dene",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Hakkında",
  "ui.provider.settings.about.subtitle":
    "Yatan hasta AAC iletişim yardımcısı.",
  "ui.provider.settings.about.attribution_1":
    "Ağrı ölçeği: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Bakım hedefleri: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "SW önbellek:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Sıfırla",
  "ui.provider.settings.reset.action_label":
    "Yeni hasta için uygulamayı sıfırla",
  "ui.provider.settings.reset.confirm_title": "Emin misiniz?",
  "ui.provider.settings.reset.confirm_body":
    "Bu işlem tüm hasta verilerini, ses örneklerini, görüşme geçmişini ve personel ayarlarını silecektir. Bu geri alınamaz.",
  "ui.provider.settings.reset.confirm_destructive": "Her şeyi sıfırla",
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
  "ui.provider.settings.accessibility.heading": "Erişilebilirlik",
  "ui.provider.settings.accessibility.toggle_label":
    "Yardımcı Giriş Modu",
  "ui.provider.settings.accessibility.toggle_description":
    "Odak halkalarını büyütür, dokunma gecikmesini uzatır ve trackball, joystick, AssistiveTouch imleci veya anahtar kullanan hastalar için geri bildirimi güçlendirir.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Harici işaretçi algılandı.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Bu hasta için Yardımcı Giriş Modunu etkinleştirmeyi düşünün.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Hastalar",
  "ui.provider.settings.patients.active_remove_hint":
    "Bu hastayı kaldırmadan önce başka bir hastaya geçin.",
  "ui.provider.settings.patients.remove_button": "Kaldır",
  "ui.provider.settings.patients.add_patient": "+ Hasta Ekle",
  "ui.provider.settings.patients.remove_dialog.title":
    "{name} kaldırılsın mı?",
  "ui.provider.settings.patients.remove_dialog.body":
    "Bu işlem ses örneğini, görüşme geçmişini ve ses klonu için önbelleğe alınmış sesi silecektir. Bakım ekibi ses klonları diğer hastalar için korunur. Bu geri alınamaz.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Kaldır",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Bakım Ekibi",
  "ui.provider.settings.care_team.empty":
    "Henüz personel eklenmedi.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading":
    "Hasta Bilgileri",
  "ui.provider.settings.patient_info.name_label": "Ad",
  "ui.provider.settings.patient_info.bed_label": "Yatak / Oda",
  "ui.provider.settings.patient_info.language_label": "Dil",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Hasta dili",
  "ui.provider.settings.lang.caregiver_section":
    "Bakım ekibi dili",
  "ui.provider.settings.lang.caregiver_helper":
    "Bakım ekibinizin anladığı dil. Genellikle cihaz başına bir kez ayarlanır.",
  "ui.provider.settings.lang.change": "Dili değiştir",

  "ui.provider.settings.lang.picker_title": "Dil seçin",
  "ui.provider.settings.lang.patient_dialog.title":
    "Hasta dili {lang} olarak değiştirilsin mi?",
  "ui.provider.settings.lang.patient_dialog.body":
    "Ses klonunuz hazır kalır — dokunduğunuz cümleler aynı şekilde duyulacaktır. {providerCount} bakım ekibi sesi için ses hazırlayacağız (~{estimatedMinutes} dk). Bu sırada uygulamayı kullanmaya devam edebilirsiniz.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Bakım ekibi ses klonları {lang} dilinde kullanılamıyor — bunun yerine sistem sesi kullanılacaktır. Desteklenen bir dile geçmeniz durumunda mevcut kayıtlar saklanır.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Dokunduğunuz cümleler aynı şekilde duyulacaktır. Yapılandırılmış bakım ekibi sesi olmadığından yeniden oluşturma gerekmez.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Bakım ekibi dili {lang} olarak değiştirilsin mi?",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Bakım ekibi ses klonlarınız hazır kalır. Yeni dilde hasta sesi için ses hazırlayacağız (~{estimatedMinutes} dk). Bu sırada uygulamayı kullanmaya devam edebilirsiniz.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Hasta ses klonu {lang} dilinde kullanılamıyor — bunun yerine sistem sesi kullanılacaktır. Desteklenen bir dile geçmeniz durumunda kaydedilmiş hasta ses örneği saklanır.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Hasta ses klonu yapılandırılmadığından yeniden oluşturma gerekmez.",
  "ui.provider.settings.patient_info.voice_label": "Ses",
  "ui.provider.settings.patient_info.backup_voice_label":
    "Yedek ses",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Ses klonu yüklenirken kullanılan sistem sesi. Önizleme için dokunun.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.offline.heading": "Uygulama Tanılama",
  "ui.provider.settings.offline.status_description":
    "Uygulamanın cihaz üzerinde ses üretimi, öneriler ve konuşma tanıma için kullandığı yapay zeka modellerinin durumu.",
  "ui.provider.settings.offline.downloading":
    "Modeller indiriliyor…",
  "ui.provider.settings.offline.download_progress_aria":
    "Model indirme ilerlemesi",
  "ui.provider.settings.offline.all_ready":
    "Tüm modeller hazır",
  "ui.provider.settings.offline.redownload_button":
    "Modelleri yeniden indir",
  "ui.provider.settings.offline.already_up_to_date":
    "Zaten güncel",
  "ui.provider.settings.offline.checking": "Kontrol ediliyor…",
  "ui.provider.settings.offline.verified": "✓ Modeller doğrulandı",
  "ui.provider.settings.offline.check_button":
    "Mevcut modelleri kontrol et",
  "ui.provider.settings.offline.redownloading":
    "Yeniden indiriliyor…",
  "ui.provider.settings.offline.force_redownload_button":
    "Tüm modelleri zorla yeniden indir",
  "ui.provider.settings.offline.model_status_ready": "hazır",
  "ui.provider.settings.offline.model_status_downloading":
    "indiriliyor…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "yeniden denenmeli",
  "ui.provider.settings.offline.last_verified_prefix":
    "Son doğrulama: ",
  "ui.provider.settings.offline.storage_prefix": "Depolama: ",
  "ui.provider.settings.offline.storage_of": " / ",
  "ui.provider.settings.offline.storage_used": " kullanıldı",
  "ui.provider.settings.offline.storage_low": " — az kaldı",
  "ui.provider.settings.offline.clear_audio_cache":
    "Ses önbelleğini temizle",
  "ui.provider.settings.offline.clearing": "Temizleniyor…",
  "ui.provider.settings.offline.rebuilding":
    "Yeniden oluşturuluyor: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Tüm yapay zeka modelleri yeniden indirilsin mi?",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Bu yaklaşık 1,7 GB indirecektir. Ses sentezi yenileme sırasında çalışmaya devam eder.",
  "ui.provider.settings.offline.redownload_dialog.confirm":
    "Yeniden indir",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Hasta Değiştir",
  "ui.provider.switch.add_patient": "+ Hasta Ekle",
  "ui.provider.patients.title": "Hastalar",
  "ui.provider.patients.actions_aria": "{name} için işlemler",
  "ui.provider.patients.action_edit": "Düzenle",
  "ui.provider.patients.action_remove": "Kaldır",
  "ui.provider.switch.voice_captured": "Ses kaydedildi",
  "ui.provider.switch.no_voice": "Ses yok",
  "ui.provider.switch.last_active_just_now": "Az önce",
  "ui.provider.switch.last_active_minutes": "{n} dk önce etkin",
  "ui.provider.switch.last_active_hours": "{n} sa önce etkin",
  "ui.provider.switch.last_active_days": "{n} gün önce etkin",
  "ui.provider.switch.currently_active": "Şu an etkin",
  "ui.provider.switch.switched_announcement":
    "{name} hastasına geçildi. {count} görüşme mesajı.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title": "Personel oturumu bitiyor",
  "ui.provider.staff_session.warning_body":
    "Personel erişiminiz {n} saniye sonra kilitlenecek.",
  "ui.provider.staff_session.extend": "Oturumu uzat",
  "ui.provider.staff_session.end_now": "Şimdi bitir",
  "ui.provider.nav.end_staff_session": "Personel oturumunu bitir",
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
  "ui.readiness.voice_capture.saving": "Saving your voice…",
  "ui.readiness.voice_capture.saving_with_countdown": "Saving your voice — {countdown} remaining",
  "ui.readiness.voice_capture.saving_almost": "Almost ready…",
  "ui.readiness.voice_capture.ready": "Voice ready",
  "ui.readiness.voice_capture.failed_message": "Couldn't prepare your voice",
  "ui.readiness.voice_capture.failed_action": "Try again",
  "ui.patient.header.voice_status.not_ready": "Using a temporary voice",
  "ui.patient.header.voice_status.almost": "Almost ready — using a temporary voice",
  "ui.patient.header.voice_status.failed_message": "Couldn't prepare your voice",
  "ui.patient.header.voice_status.failed_action": "Try again",

  // ── Voice quality score (enrollment feedback) ──
  "ui.voice_quality.title": "Ses kalitesi",
  "ui.voice_quality.label.good": "İyi",
  "ui.voice_quality.label.ok": "Tamam",
  "ui.voice_quality.label.poor": "İyileştirilmesi gerek",
  "ui.voice_quality.tip.snr": "Daha sessiz bir yerde kaydetmeyi deneyin.",
  "ui.voice_quality.tip.clipping": "Mikrofondan biraz uzaklaşın.",
  "ui.voice_quality.tip.coverage": "Biraz daha uzun süre okumayı deneyin.",
  "ui.voice_quality.tip.voiced_fraction": "Kayıt boyunca konuşmaya çalışın.",
  "ui.voice_quality.tip.pitch_variation": "Daha doğal okuyun — sesinizin yükselip alçalmasına izin verin.",
  "ui.voice_quality.tip.loudness": "Ses seviyenizi sabit tutmaya çalışın.",
  "ui.voice_quality.tip.tilt_boomy": "Mikrofondan biraz daha uzaklaşmayı deneyin.",
  "ui.voice_quality.tip.tilt_tinny": "Bu mikrofonun sesi ince geliyor — varsa başka bir tane deneyin.",
};

export default tr;
