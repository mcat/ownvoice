/**
 * ⚠ DRAFT — MACHINE TRANSLATION PENDING CLINICAL REVIEW ⚠
 *
 * Registered in the LOCALES map (DRAFT) and active in the app.
 * Do NOT consider production-ready until:
 *   1. Native-speaker translator review
 *   2. Clinical review (ICU / AAC-familiar clinician)
 *
 * Language: Greek (Modern, Dimotiki)
 * Locale: el
 * Generated: 2026-04-24
 * Source: Machine translation from en.ts, seeded for human refinement
 *
 * Register: εσείς (formal plural) for care-team → patient address;
 *   first-person εγώ for patient speech.
 * Pain template: descriptors are masc. nom. sg. adjectives agreeing with πόνος;
 *   regions are nominative labels; template uses dashes to sidestep preposition
 *   + gender agreement with each body-part noun.
 * Wishes template: uses colon (:) instead of copula to avoid inflection issues.
 * {placeholder} tokens preserved verbatim; repositioned for Greek word order.
 */
import type { LocaleStrings } from "./en";

const el: LocaleStrings = {
  // ── Patient quick phrases ──────────────────────────────────────
  "quick.yes": "Ναι",
  "quick.no": "Όχι",
  "quick.thank_you": "Ευχαριστώ",
  "quick.please_wait": "Παρακαλώ περιμένετε",
  "quick.dont_understand": "Δεν καταλαβαίνω",
  "quick.repeat": "Παρακαλώ επαναλάβετε",
  "quick.retract": "Δεν το είπα σωστά",

  // ── Patient needs: Comfort ─────────────────────────────────────
  "needs.comfort.water": "Χρειάζομαι νερό",
  "needs.comfort.hungry": "Πεινάω",
  "needs.comfort.cold": "Κρυώνω",
  "needs.comfort.hot": "Ζεσταίνομαι",
  "needs.comfort.bed": "Ρυθμίστε το κρεβάτι μου",
  "needs.comfort.bathroom": "Χρειάζομαι την τουαλέτα",
  "needs.comfort.hearing_aid": "Χρειάζομαι το ακουστικό μου",
  "needs.comfort.glasses": "Χρειάζομαι τα γυαλιά μου",
  "needs.comfort.ice": "Χρειάζομαι παγάκια",
  "needs.comfort.pillow": "Ρυθμίστε το μαξιλάρι μου",
  "needs.comfort.turn": "Παρακαλώ γυρίστε με",
  "needs.comfort.sit_up": "Βοηθήστε με να ανακαθίσω",
  "needs.comfort.quiet": "Παρακαλώ κάντε ησυχία",

  // ── Patient needs: Medical ─────────────────────────────────────
  "needs.medical.medication": "Χρειάζομαι το φάρμακό μου",
  "needs.medical.suction": "Χρειάζομαι αναρρόφηση",
  "needs.medical.nauseous": "Έχω ναυτία",
  "needs.medical.breathe": "Δεν μπορώ να αναπνεύσω καλά",
  "needs.medical.nurse": "Χρειάζομαι τη νοσοκόμα",
  "needs.medical.doctor": "Χρειάζομαι τον γιατρό",
  "needs.medical.call_light": "Χρειάζομαι βοήθεια αμέσως",

  // ── Patient needs: People ──────────────────────────────────────
  "needs.people.family": "Θέλω την οικογένειά μου",
  "needs.people.stay": "Μπορεί κάποιος να μείνει μαζί μου;",
  "needs.people.call": "Θέλω να τηλεφωνήσω σε κάποιον",
  "needs.people.interpreter": "Χρειάζομαι διερμηνέα",
  "needs.people.respiratory_therapist": "Χρειάζομαι τον αναπνευστικό θεραπευτή",
  "needs.people.speech_therapist": "Χρειάζομαι τον λογοθεραπευτή",

  // ── Patient needs: Hygiene ─────────────────────────────────────
  "needs.hygiene.back": "Πλύνετε την πλάτη μου",
  "needs.hygiene.face": "Πλύνετε το πρόσωπό μου",
  "needs.hygiene.feet": "Πλύνετε τα πόδια μου",
  "needs.hygiene.hair": "Πλύνετε τα μαλλιά μου",
  "needs.hygiene.hands": "Πλύνετε τα χέρια μου",
  "needs.hygiene.mouth": "Στοματική φροντίδα",
  "needs.hygiene.nose": "Σκουπίστε τη μύτη μου",
  "needs.hygiene.teeth": "Βουρτσίστε τα δόντια μου",
  "needs.hygiene.wound": "Αλλάξτε τον επίδεσμό μου",

  // ── Patient feelings: Physical ─────────────────────────────────
  "feelings.physical.tired": "Είμαι κουρασμένος",
  "feelings.physical.uncomfortable": "Νιώθω άβολα",
  "feelings.physical.weak": "Νιώθω αδύναμος",
  "feelings.physical.better": "Νιώθω καλύτερα",
  "feelings.physical.dizzy": "Έχω ζαλάδα",
  "feelings.physical.itchy": "Με τρώει — έχω φαγούρα",
  "feelings.physical.wet": "Είμαι βρεγμένος",
  "feelings.physical.gagging": "Πνίγομαι",
  "feelings.physical.short_of_breath": "Λαχανιάζω",
  "feelings.physical.nauseated": "Έχω ναυτία",
  "feelings.physical.worse": "Νιώθω χειρότερα",

  // ── Patient feelings: Emotional ────────────────────────────────
  "feelings.emotional.scared": "Φοβάμαι",
  "feelings.emotional.lonely": "Νιώθω μόνος",
  "feelings.emotional.frustrated": "Είμαι απογοητευμένος",
  "feelings.emotional.confused": "Είμαι μπερδεμένος",
  "feelings.emotional.safe": "Νιώθω ασφαλής",
  "feelings.emotional.grateful": "Είμαι ευγνώμων",
  "feelings.emotional.worried": "Ανησυχώ",
  "feelings.emotional.hopeful": "Έχω ελπίδα",
  "feelings.emotional.bored": "Βαριέμαι",
  "feelings.emotional.embarrassed": "Ντρέπομαι",

  // ── Patient questions ──────────────────────────────────────────
  "questions.time": "Τι ώρα είναι;",
  "questions.day": "Τι μέρα είναι;",
  "questions.whats_happening": "Τι μου συμβαίνει;",
  "questions.go_home": "Πότε μπορώ να πάω σπίτι;",
  "questions.next_medication": "Πότε είναι το επόμενο φάρμακό μου;",
  "questions.explain_treatment": "Μπορείτε να μου εξηγήσετε τη θεραπεία μου;",
  "questions.nurse_today": "Ποια είναι η νοσοκόμα μου σήμερα;",
  "questions.eat_drink": "Μπορώ να φάω ή να πιω;",
  "questions.see_family": "Πότε μπορώ να δω την οικογένειά μου;",
  "questions.extubation": "Πότε θα μου βγάλουν τον σωλήνα;",

  // ── Pain: Emoji-FPS labels (Li et al., JMIR 2023) ─────────────
  "pain.face.0": "Χωρίς πόνο",
  "pain.face.2": "Πονάει λίγο",
  "pain.face.4": "Πονάει λίγο περισσότερο",
  "pain.face.6": "Πονάει ακόμα περισσότερο",
  "pain.face.8": "Πονάει πάρα πολύ",
  "pain.face.10": "Ο χειρότερος πόνος",

  // ── Pain: Descriptors ──────────────────────────────────────────
  // Masc. nom. sg. adjectives agreeing with πόνος (masculine)
  "pain.descriptor.aching": "Βαθύς",
  "pain.descriptor.burning": "Καυστικός",
  "pain.descriptor.sharp": "Οξύς",
  "pain.descriptor.throbbing": "Σφυγμώδης",
  "pain.descriptor.cramping": "Σπασμωδικός",
  "pain.descriptor.constant": "Συνεχής",
  "pain.descriptor.comes_and_goes": "Πηγαινοέρχεται",
  "pain.descriptor.numb": "Μουδιασμένος",
  "pain.descriptor.pressure": "Πίεση",

  // ── Pain: Body regions ─────────────────────────────────────────
  "pain.region.head": "Κεφάλι",
  "pain.region.face": "Πρόσωπο",
  "pain.region.neck": "Αυχένας",
  "pain.region.chest": "Θώρακας",
  "pain.region.left_shoulder": "Αριστερός ώμος",
  "pain.region.right_shoulder": "Δεξιός ώμος",
  "pain.region.left_arm": "Αριστερό χέρι",
  "pain.region.right_arm": "Δεξί χέρι",
  "pain.region.stomach": "Στομάχι",
  "pain.region.upper_back": "Πάνω πλάτη",
  "pain.region.lower_back": "Κάτω πλάτη",
  "pain.region.left_leg": "Αριστερό πόδι",
  "pain.region.right_leg": "Δεξί πόδι",

  // ── Pain: Composed sentence template ───────────────────────────
  // {descriptor}, {region}, {severity} are substituted at runtime.
  // Uses dash to sidestep preposition + gender agreement with body-part nouns.
  "pain.sentence":
    "Έχω {descriptor} πόνο — {region} — επίπεδο {severity} στα 10",

  // ── Pain flow step labels ──────────────────────────────────────
  "pain.step.severity": "Ένταση",
  "pain.step.location": "Θέση",
  "pain.step.descriptor": "Περιγραφή",

  // ── SICG Wishes (Ariadne Labs, CC-BY-NC-SA 4.0) ───────────────
  // Labels
  "wishes.goals.label": "Οι στόχοι μου",
  "wishes.worries.label": "Οι ανησυχίες μου",
  "wishes.strength.label": "Η δύναμή μου",
  "wishes.joy.label": "Τι μου δίνει χαρά",
  "wishes.tradeoffs.label": "Σχετικά με τη θεραπεία",
  "wishes.family.label": "Η οικογένειά μου",
  "wishes.hopes.label": "Οι ελπίδες μου",

  // Questions (εσείς — formal)
  "wishes.goals.question": "Ποιοι είναι οι πιο σημαντικοί στόχοι σας;",
  "wishes.worries.question": "Ποιες είναι οι μεγαλύτερες ανησυχίες σας;",
  "wishes.strength.question": "Τι σας δίνει δύναμη;",
  "wishes.joy.question": "Τι σας δίνει χαρά και νόημα στη ζωή σας;",
  "wishes.tradeoffs.question":
    "Πόσα είστε διατεθειμένος να υπομείνετε για περισσότερο χρόνο;",
  "wishes.family.question":
    "Πόσα γνωρίζουν οι πιο κοντινοί σας άνθρωποι για τις επιθυμίες σας;",
  "wishes.hopes.question": "Ποιες είναι οι ελπίδες σας;",

  // Stems (for composeSentence)
  // Uses colon structure to avoid copula inflection issues
  "wishes.goals.stem": "Αυτό που μου έχει μεγαλύτερη σημασία",
  "wishes.worries.stem": "Ανησυχώ για",
  "wishes.strength.stem": "Αυτό που μου δίνει δύναμη",
  "wishes.joy.stem": "Αυτό που μου δίνει χαρά",
  "wishes.tradeoffs.stem": "Σχετικά με τη θεραπεία μου",
  "wishes.family.stem": "Σχετικά με την οικογένειά μου",
  "wishes.hopes.stem": "Ελπίζω",

  // Responses — goals
  "wishes.goals.r.family": "Να είμαι με την οικογένειά μου",
  "wishes.goals.r.comfort": "Να είμαι άνετα και χωρίς πόνο",
  "wishes.goals.r.longevity": "Να ζήσω όσο περισσότερο γίνεται",
  "wishes.goals.r.home": "Να πάω σπίτι",
  "wishes.goals.r.independence": "Να μπορώ να κάνω πράγματα μόνος μου",
  "wishes.goals.r.peace": "Να είμαι ήρεμος",

  // Responses — worries
  "wishes.worries.r.suffering": "Να υποφέρω ή να πονάω",
  "wishes.worries.r.alone": "Να μείνω μόνος",
  "wishes.worries.r.burden": "Να είμαι βάρος για την οικογένειά μου",
  "wishes.worries.r.activities": "Να μη μπορώ να κάνω αυτά που μου αρέσουν",
  "wishes.worries.r.leaving": "Να αφήσω την οικογένειά μου πίσω",
  "wishes.worries.r.unknown": "Να μη ξέρω τι θα γίνει",

  // Responses — strength
  "wishes.strength.r.family": "Η οικογένειά μου",
  "wishes.strength.r.faith": "Η πίστη μου",
  "wishes.strength.r.friends": "Οι φίλοι μου",
  "wishes.strength.r.wishes_heard": "Το ότι ακούγονται οι επιθυμίες μου",
  "wishes.strength.r.hope": "Η ελπίδα ότι θα γίνω καλά",
  "wishes.strength.r.carers": "Οι άνθρωποι που με φροντίζουν",

  // Responses — joy
  "wishes.joy.r.family": "Να περνάω χρόνο με την οικογένειά μου",
  "wishes.joy.r.outdoors": "Να είμαι στη φύση",
  "wishes.joy.r.hobbies": "Τα χόμπι και τα ενδιαφέροντά μου",
  "wishes.joy.r.helping": "Να βοηθάω τους άλλους",
  "wishes.joy.r.spiritual": "Η πνευματική μου πρακτική",
  "wishes.joy.r.routines": "Οι απλές καθημερινές συνήθειες",

  // Responses — tradeoffs
  "wishes.tradeoffs.r.everything": "Θέλω κάθε δυνατή θεραπεία",
  "wishes.tradeoffs.r.good_chance":
    "Θέλω θεραπεία αν έχει καλές πιθανότητες",
  "wishes.tradeoffs.r.try_stop":
    "Θέλω να δοκιμάσω αλλά να σταματήσω αν δεν βοηθάει",
  "wishes.tradeoffs.r.comfortable": "Θέλω να επικεντρωθώ στην ανακούφιση",
  "wishes.tradeoffs.r.think": "Χρειάζομαι περισσότερο χρόνο να το σκεφτώ",
  "wishes.tradeoffs.r.family_first":
    "Χρειάζεται να μιλήσω πρώτα με την οικογένειά μου",

  // Responses — family
  "wishes.family.r.know_well": "Γνωρίζουν καλά τις επιθυμίες μου",
  "wishes.family.r.know_some": "Γνωρίζουν κάποιες από τις επιθυμίες μου",
  "wishes.family.r.not_talked": "Δεν έχουμε μιλήσει ακόμα γι' αυτό",
  "wishes.family.r.need_help": "Χρειάζομαι βοήθεια για να τους το πω",
  "wishes.family.r.team_explain":
    "Θέλω η ομάδα φροντίδας μου να τους εξηγήσει",

  // Responses — hopes
  "wishes.hopes.r.get_better": "Να γίνω καλά",
  "wishes.hopes.r.go_home": "Να πάω σπίτι",
  "wishes.hopes.r.comfortable": "Να είμαι άνετα",
  "wishes.hopes.r.family_ok": "Η οικογένειά μου να είναι καλά",
  "wishes.hopes.r.more_time": "Να έχω περισσότερο χρόνο",
  "wishes.hopes.r.peace": "Να είμαι ήρεμος",

  // Wish sentence composition templates
  // Uses colon to avoid copula agreement issues across all stems
  "wishes.compose": "{stem}: {list}.",

  // ── Provider phrases ───────────────────────────────────────────
  "provider.responses.help": "Θα φέρω κάποιον να βοηθήσει.",
  "provider.responses.interpreter": "Θα φέρω διερμηνέα.",
  "provider.responses.family": "Θα καλέσω την οικογένειά σας.",
  "provider.responses.get_that": "Θα σας το φέρω.",
  "provider.responses.doctor_know": "Θα ενημερώσω τον γιατρό.",
  "provider.responses.medication": "Θα φέρω το φάρμακό σας.",
  "provider.responses.family_coming": "Η οικογένειά σας έρχεται.",
  "provider.responses.doctor_soon": "Ο γιατρός θα έρθει σύντομα.",
  "provider.responses.doing_well": "Πάτε πολύ καλά.",
  "provider.responses.rest": "Προσπαθήστε να ξεκουραστείτε τώρα.",

  "provider.questions.feeling": "Πώς νιώθετε;",
  "provider.questions.need": "Χρειάζεστε κάτι;",
  "provider.questions.where_hurts": "Μπορείτε να μου δείξετε πού πονάτε;",
  "provider.questions.rate_pain": "Βαθμολογήστε τον πόνο σας, 0 έως 10.",
  "provider.questions.sleep": "Κοιμηθήκατε καλά;",
  "provider.questions.comfortable": "Είστε άνετα;",

  "provider.directions.procedure":
    "Η επέμβασή σας είναι προγραμματισμένη για σήμερα.",
  "provider.directions.stay_in_bed": "Πρέπει να μείνετε στο κρεβάτι.",
  "provider.directions.vitals": "Θα ελέγξω τα ζωτικά σας σημεία.",
  "provider.directions.medication_time": "Ώρα για το φάρμακό σας.",
  "provider.directions.breathe": "Προσπαθήστε να πάρετε βαθιές αναπνοές.",
  "provider.directions.call_button":
    "Πατήστε το κουμπί κλήσης αν χρειαστείτε κάτι.",

  "provider.goals_of_care.matters_most":
    "Θα ήθελα να μιλήσουμε για αυτό που έχει τη μεγαλύτερη σημασία για εσάς.",
  "provider.goals_of_care.goals":
    "Ποιοι είναι οι πιο σημαντικοί στόχοι σας αυτή τη στιγμή;",
  "provider.goals_of_care.worries":
    "Ποιες είναι οι μεγαλύτερες ανησυχίες σας;",
  "provider.goals_of_care.strength": "Τι σας δίνει δύναμη;",
  "provider.goals_of_care.joy":
    "Τι σας δίνει χαρά και νόημα στη ζωή σας;",
  "provider.goals_of_care.wishes":
    "Πόσα γνωρίζουν οι αγαπημένοι σας για τις επιθυμίες σας;",
  "provider.goals_of_care.hopes": "Ποιες είναι οι ελπίδες σας;",

  // ── Time-of-day suggestions ────────────────────────────────────
  "time.morning.slept_well": "Κοιμήθηκα καλά",
  "time.morning.didnt_sleep": "Δεν κοιμήθηκα καλά",
  "time.morning.breakfast": "Χρειάζομαι πρωινό",
  "time.morning.doctor_coming": "Πότε έρχεται ο γιατρός;",

  "time.afternoon.tired": "Είμαι κουρασμένος",
  "time.afternoon.lunch": "Μπορώ να φάω μεσημεριανό;",
  "time.afternoon.see_family": "Πότε μπορώ να δω την οικογένειά μου;",
  "time.afternoon.rest": "Χρειάζομαι ξεκούραση",

  "time.evening.cant_sleep": "Δεν μπορώ να κοιμηθώ",
  "time.evening.medication": "Χρειάζομαι το φάρμακό μου",
  "time.evening.call_family": "Μπορώ να τηλεφωνήσω στην οικογένειά μου;",
  "time.evening.pain": "Πονάω",

  // ── Sentence builder suggestions ───────────────────────────────
  // TODO(translator): Builder fragments concatenate in sequence.
  // Greek verb/adjective agreement may not compose cleanly — review each path.
  "suggest.start.i_am": "Είμαι",
  "suggest.start.i_feel": "Νιώθω",
  "suggest.start.i_want": "Θέλω",
  "suggest.start.i_need": "Χρειάζομαι",
  "suggest.start.please": "Παρακαλώ",
  "suggest.start.when": "Πότε",
  "suggest.start.can_you": "Μπορείτε",
  "suggest.start.tell_me": "Πείτε μου",

  "suggest.i_am.in_pain": "πονάω",
  "suggest.i_am.cold": "κρυώνω",
  "suggest.i_am.hot": "ζεσταίνομαι",
  "suggest.i_am.hungry": "πεινασμένος",
  "suggest.i_am.thirsty": "διψασμένος",
  "suggest.i_am.tired": "κουρασμένος",
  "suggest.i_am.uncomfortable": "άβολα",
  "suggest.i_am.okay": "εντάξει",
  "suggest.i_am.not_okay": "δεν είμαι καλά",
  "suggest.i_am.ready": "έτοιμος",

  "suggest.i_feel.scared": "φοβισμένος",
  "suggest.i_feel.sick": "άρρωστος",
  "suggest.i_feel.dizzy": "ζαλισμένος",
  "suggest.i_feel.weak": "αδύναμος",
  "suggest.i_feel.better": "καλύτερα",
  "suggest.i_feel.worse": "χειρότερα",
  "suggest.i_feel.nauseous": "ναυτία",
  "suggest.i_feel.lonely": "μόνος",
  "suggest.i_feel.confused": "μπερδεμένος",
  "suggest.i_feel.safe": "ασφαλής",

  "suggest.i_feel_scared.procedure": "για την επέμβαση",
  "suggest.i_feel_scared.happening": "για αυτό που συμβαίνει",
  "suggest.i_feel_scared.alone": "να μείνω μόνος",
  "suggest.i_feel_scared.need_someone": "και χρειάζομαι κάποιον",

  "suggest.i_feel_sick.stomach": "στο στομάχι",
  "suggest.i_feel_sick.dizzy": "και ζαλίζομαι",
  "suggest.i_feel_sick.help": "και χρειάζομαι βοήθεια",

  "suggest.i_want.water": "νερό",
  "suggest.i_want.family": "την οικογένειά μου",
  "suggest.i_want.go_home": "να πάω σπίτι",
  "suggest.i_want.sleep": "να κοιμηθώ",
  "suggest.i_want.medication": "το φάρμακό μου",
  "suggest.i_want.blanket": "μια κουβέρτα",
  "suggest.i_want.talk": "να μιλήσω σε κάποιον",
  "suggest.i_want.nurse": "τη νοσοκόμα",

  "suggest.i_want_to_go.home": "σπίτι",
  "suggest.i_want_to_go.sleep": "να κοιμηθώ",
  "suggest.i_want_to_go.bathroom": "στην τουαλέτα",

  "suggest.i_want_my.family": "οικογένεια",
  "suggest.i_want_my.medication": "φάρμακο",
  "suggest.i_want_my.phone": "τηλέφωνο",
  "suggest.i_want_my.glasses": "γυαλιά",
  "suggest.i_want_my.blanket": "κουβέρτα",

  "suggest.i_need.help": "βοήθεια",
  "suggest.i_need.water": "νερό",
  "suggest.i_need.bathroom": "την τουαλέτα",
  "suggest.i_need.medication": "το φάρμακό μου",
  "suggest.i_need.nurse": "τη νοσοκόμα",
  "suggest.i_need.doctor": "τον γιατρό",
  "suggest.i_need.rest": "να ξεκουραστώ",
  "suggest.i_need.blanket": "μια κουβέρτα",
  "suggest.i_need.suction": "αναρρόφηση",

  "suggest.i_need_the.nurse": "νοσοκόμα",
  "suggest.i_need_the.doctor": "γιατρό",
  "suggest.i_need_the.bathroom": "τουαλέτα",
  "suggest.i_need_the.light_off": "κλείστε το φως",
  "suggest.i_need_the.light_on": "ανοίξτε το φως",

  "suggest.i_need_my.medication": "φάρμακο",
  "suggest.i_need_my.family": "οικογένεια",
  "suggest.i_need_my.glasses": "γυαλιά",
  "suggest.i_need_my.phone": "τηλέφωνο",

  "suggest.please.help_me": "βοηθήστε με",
  "suggest.please.call_family": "καλέστε την οικογένειά μου",
  "suggest.please.light_off": "κλείστε το φως",
  "suggest.please.adjust_bed": "ρυθμίστε το κρεβάτι μου",
  "suggest.please.give_me": "δώστε μου",
  "suggest.please.explain": "εξηγήστε",
  "suggest.please.come_back": "ελάτε ξανά σύντομα",
  "suggest.please.stay": "μείνετε μαζί μου",
  "suggest.please.dont_leave": "μη φύγετε",

  "suggest.please_help_me.pain": "Πονάω",
  "suggest.please_help_me.breathe": "Δεν μπορώ να αναπνεύσω",
  "suggest.please_help_me.sick": "Νιώθω άρρωστος",
  "suggest.please_help_me.scared": "Φοβάμαι",

  "suggest.please_give_me.water": "νερό",
  "suggest.please_give_me.medication": "το φάρμακό μου",
  "suggest.please_give_me.blanket": "μια κουβέρτα",
  "suggest.please_give_me.pain_relief": "κάτι για τον πόνο",

  "suggest.when.go_home": "μπορώ να πάω σπίτι;",
  "suggest.when.family": "έρχεται η οικογένειά μου;",
  "suggest.when.medication": "είναι το επόμενο φάρμακό μου;",
  "suggest.when.doctor": "έρχεται ο γιατρός;",
  "suggest.when.eat": "μπορώ να φάω;",
  "suggest.when.over": "θα τελειώσει αυτό;",

  "suggest.can_you.help": "να με βοηθήσετε;",
  "suggest.can_you.call_family": "να καλέσετε την οικογένειά μου;",
  "suggest.can_you.get_nurse": "να φωνάξετε τη νοσοκόμα;",
  "suggest.can_you.explain": "να μου εξηγήσετε τι γίνεται;",
  "suggest.can_you.light_off": "να κλείσετε το φως;",
  "suggest.can_you.adjust_bed": "να ρυθμίσετε το κρεβάτι μου;",
  "suggest.can_you.stay": "να μείνετε μαζί μου;",

  "suggest.tell_me.happening": "τι συμβαίνει",
  "suggest.tell_me.time": "τι ώρα είναι",
  "suggest.tell_me.go_home": "πότε μπορώ να πάω σπίτι",
  "suggest.tell_me.day": "τι μέρα είναι",
  "suggest.tell_me.treatment": "για τη θεραπεία μου",

  // ── Deeper sentence builder paths (3rd level) ──────────────────
  // After "I am in pain"
  "suggest.i_am_in_pain.help": "παρακαλώ βοηθήστε με",
  "suggest.i_am_in_pain.worse": "και χειροτερεύει",
  "suggest.i_am_in_pain.medication": "και χρειάζομαι φάρμακο",
  "suggest.i_am_in_pain.back": "στην πλάτη",
  "suggest.i_am_in_pain.chest": "στο στήθος",
  "suggest.i_am_in_pain.stomach": "στο στομάχι",

  // After "I need help"
  "suggest.i_need_help.up": "να σηκωθώ",
  "suggest.i_need_help.breathing": "να αναπνεύσω",
  "suggest.i_need_help.pain": "με τον πόνο",
  "suggest.i_need_help.now": "τώρα αμέσως",
  "suggest.i_need_help.please": "παρακαλώ",

  // After "I feel better"
  "suggest.i_feel_better.than_before": "από πριν",
  "suggest.i_feel_better.now": "τώρα",
  "suggest.i_feel_better.thanks": "ευχαριστώ",

  // After "I feel worse"
  "suggest.i_feel_worse.than_before": "από πριν",
  "suggest.i_feel_worse.need_doctor": "Χρειάζομαι τον γιατρό",
  "suggest.i_feel_worse.help": "παρακαλώ βοηθήστε",
  "suggest.i_feel_worse.medication": "Χρειάζομαι φάρμακο",

  // ── Context-aware suggestion overrides ─────────────────────────
  // When provider asks "How are you feeling?"
  "suggest.ctx.feeling.i_feel": "Νιώθω",
  "suggest.ctx.feeling.i_am": "Είμαι",
  "suggest.ctx.feeling.better": "Καλύτερα από πριν",
  "suggest.ctx.feeling.not_great": "Δεν είμαι καλά",
  "suggest.ctx.feeling.pain": "Πονάω",
  "suggest.ctx.feeling.okay": "Είμαι εντάξει",
  "suggest.ctx.feeling.help": "Μπορείτε να με βοηθήσετε;",

  // When provider asks "Is there anything you need?"
  "suggest.ctx.need.i_need": "Χρειάζομαι",
  "suggest.ctx.need.i_want": "Θέλω",
  "suggest.ctx.need.fine": "Είμαι εντάξει προς το παρόν",
  "suggest.ctx.need.yes": "Ναι, παρακαλώ",
  "suggest.ctx.need.no": "Όχι, ευχαριστώ",
  "suggest.ctx.need.stay": "Μπορείτε να μείνετε;",

  // When provider asks "Where does it hurt?"
  "suggest.ctx.where_hurts.head": "Το κεφάλι μου",
  "suggest.ctx.where_hurts.chest": "Το στήθος μου",
  "suggest.ctx.where_hurts.stomach": "Το στομάχι μου",
  "suggest.ctx.where_hurts.back": "Η πλάτη μου",
  "suggest.ctx.where_hurts.left_arm": "Το αριστερό μου χέρι",
  "suggest.ctx.where_hurts.right_leg": "Το δεξί μου πόδι",
  "suggest.ctx.where_hurts.everywhere": "Παντού",

  // When provider asks about pain level
  "suggest.ctx.pain.very_bad": "Είναι πολύ δυνατός",
  "suggest.ctx.pain.worse": "Χειροτερεύει",
  "suggest.ctx.pain.same": "Παραμένει ίδιος",
  "suggest.ctx.pain.little_better": "Είναι λίγο καλύτερα",
  "suggest.ctx.pain.need_relief": "Χρειάζομαι κάτι για τον πόνο",

  // When provider asks about comfort/sleep
  "suggest.ctx.comfort.comfortable": "Είμαι άνετα",
  "suggest.ctx.comfort.not_comfortable": "Δεν είμαι άνετα",
  "suggest.ctx.comfort.cant_sleep": "Δεν μπορώ να κοιμηθώ",
  "suggest.ctx.comfort.cold": "Κρυώνω",
  "suggest.ctx.comfort.hot": "Ζεσταίνομαι",
  "suggest.ctx.comfort.adjust_bed": "Μπορείτε να ρυθμίσετε το κρεβάτι μου;",

  // Nighttime starters
  "suggest.ctx.night.cant_sleep": "Δεν μπορώ να κοιμηθώ",
  "suggest.ctx.night.i_need": "Χρειάζομαι",
  "suggest.ctx.night.pain": "Πονάω",
  "suggest.ctx.night.i_feel": "Νιώθω",
  "suggest.ctx.night.can_you": "Μπορείτε",
  "suggest.ctx.night.please": "Παρακαλώ",
  "suggest.ctx.night.i_am": "Είμαι",
  "suggest.ctx.night.when": "Πότε",

  // Morning starters
  "suggest.ctx.morning.i_am": "Είμαι",
  "suggest.ctx.morning.i_need": "Χρειάζομαι",
  "suggest.ctx.morning.i_feel": "Νιώθω",
  "suggest.ctx.morning.doctor": "Πότε έρχεται ο γιατρός;",
  "suggest.ctx.morning.i_want": "Θέλω",
  "suggest.ctx.morning.can_you": "Μπορείτε",
  "suggest.ctx.morning.please": "Παρακαλώ",
  "suggest.ctx.morning.tell_me": "Πείτε μου",

  // ── Category labels ────────────────────────────────────────────
  "cat.quick": "Γρήγορα",
  "cat.needs": "Χρειάζομαι",
  "cat.feelings": "Νιώθω",
  "cat.pain": "Πόνος",
  "cat.questions": "Ρωτάω",
  "sub.comfort": "Άνεση",
  "sub.medical": "Ιατρικά",
  "sub.people": "Άνθρωποι",
  "sub.hygiene": "Υγιεινή",
  "sub.physical": "Σωματικά",
  "sub.emotional": "Συναισθηματικά",

  // Provider category labels
  "provider.cat.responses": "Απαντήσεις",
  "provider.cat.questions": "Ερωτήσεις",
  "provider.cat.directions": "Οδηγίες",
  "provider.cat.goals_of_care": "Στόχοι φροντίδας",

  // ── UI chrome: App + Layout ────────────────────────────────────
  "ui.patient.app.aria_label": "OwnVoice — συνομιλία {name}",
  "ui.patient.app.name_fallback": "Ασθενής",
  "ui.patient.header.name_fallback": "Ασθενής",
  "ui.patient.header.bed_prefix": "Κρεβάτι ",
  "ui.dual.nav.wishes": "Επιθυμίες",
  "ui.dual.nav.listen": "Ακρόαση",
  "ui.provider.nav.staff": "Προσωπικό",
  "ui.provider.nav.switch_patient": "Αλλαγή ασθενούς",
  "ui.provider.nav.settings": "Ρυθμίσεις",
  "ui.provider.nav.theme.auto": "Αυτόματο",
  "ui.provider.nav.theme.light": "Φωτεινό",
  "ui.provider.nav.theme.dark": "Σκοτεινό",
  "ui.patient.tabbar.say_more": "Πες περισσότερα",
  "ui.patient.subcategory.aria_label": "Subcategory in {cat}",
  "ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
  "ui.patient.toolbar.aria_label": "Patient toolbar",

  // ── UI chrome: PainFlow ────────────────────────────────────────
  "ui.dual.pain.heading.severity": "Πόσο πονάτε;",
  "ui.dual.pain.heading.location": "Πού πονάτε;",
  "ui.dual.pain.heading.descriptor": "Πώς νιώθετε τον πόνο;",
  "ui.patient.pain.step_of": "Βήμα {n} από {total}",
  "ui.patient.pain.back_to": "Πίσω στο {label}",
  "ui.patient.pain.level_aria": "Επίπεδο πόνου {n}, {label}",
  "ui.patient.pain.breadcrumb_aria": "Pain wizard steps",

  // ── UI chrome: MyWishes ────────────────────────────────────────
  "ui.patient.wishes.completion_title": "Επιθυμίες — {name}",
  "ui.patient.wishes.my_wishes": "Οι επιθυμίες μου",
  "ui.patient.wishes.step_of": "Βήμα {n} από {total}",
  "ui.patient.wishes.progress_aria": "Wishes wizard progress",
  "ui.patient.wishes.none_shared": "Δεν μοιράστηκαν επιθυμίες.",
  "ui.patient.wishes.share_all_again": "Μοιράσου ξανά όλες τις επιθυμίες",
  "ui.patient.wishes.close": "Κλείσιμο",
  "ui.patient.wishes.speak": "Μίλα",
  "ui.patient.wishes.back": "Πίσω",
  "ui.patient.wishes.skip": "Παράλειψη",

  // ── UI chrome: SentenceBuilder ─────────────────────────────────
  "ui.patient.builder.placeholder": "Πατήστε λέξεις παρακάτω ή πληκτρολογήστε...",
  "ui.patient.builder.message_aria": "Το μήνυμά σας",
  "ui.patient.builder.undo": "Αναίρεση τελευταίας λέξης",
  "ui.patient.builder.clear": "Καθαρισμός μηνύματος",
  "ui.patient.builder.refresh_ai": "Ανανέωση προτάσεων AI",
  "ui.patient.builder.ai_thinking": "Το AI σκέφτεται...",
  "ui.patient.builder.no_ai_suggestions":
    "Χωρίς προτάσεις AI. Πατήστε ανανέωση για νέα δοκιμή.",
  "ui.patient.builder.ready":
    "Το μήνυμά σας είναι έτοιμο. Πατήστε Μίλα για αποστολή.",
  "ui.patient.builder.speak": "Μίλα",

  // ── UI chrome: Thread ──────────────────────────────────────────
  "ui.dual.thread.repeat_aria": "Επανάληψη: {text}",
  "ui.dual.thread.aria_label": "Conversation",
  "ui.dual.thread.scroll_up_aria": "Κύλιση συζήτησης προς τα πάνω",
  "ui.dual.thread.scroll_down_aria": "Κύλιση συζήτησης προς τα κάτω",

  // ── UI chrome: ProviderPanel ───────────────────────────────────
  "ui.provider.care_team.title": "Ομάδα φροντίδας",
  "ui.provider.fallback_name": "Πάροχος",
  "ui.provider.speaking_to": "Μιλάτε στον/στην {name} ως {prov}",
  "ui.provider.patient_fallback": "ασθενής",
  "ui.provider.close_panel": "Κλείσιμο πάνελ",
  "ui.provider.select_provider": "Επιλογή {name}",
  "ui.provider.show_category": "Εμφάνιση {key}",
  "ui.provider.speak_phrase": "Εκφώνηση: {phrase}",
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
  "ui.provider.listen.title": "Ακρόαση",
  "ui.provider.listen.stop_aria": "Διακοπή ακρόασης",
  "ui.provider.listen.start_aria": "Πατήστε για να ξεκινήσετε την ακρόαση",
  "ui.provider.listen.listening": "Ακούει...",
  "ui.provider.listen.transcribing": "Μεταγράφει...",
  "ui.provider.listen.listening_placeholder": "Ακούει ομιλία...",
  "ui.provider.listen.transcribing_placeholder": "Μεταγράφει ομιλία...",
  "ui.provider.listen.type_placeholder": "Ή πληκτρολογήστε αυτό που ειπώθηκε...",
  "ui.provider.listen.transcript_aria": "Μεταγραφή",
  "ui.provider.listen.audio_level_aria": "Επίπεδο ήχου μικροφώνου",
  "ui.provider.listen.add_as": "Προσθήκη στη συνομιλία ως {prov}",
  "ui.provider.listen.privacy_notice":
    "Στη συσκευή · Whisper · κανένα ηχητικό δεν φεύγει από τη συσκευή",

  // ── UI chrome: Speaking overlay ────────────────────────────────
  "ui.dual.speaking.aria_label": "Μιλάει: {text}",
  "ui.dual.speaking.patient_voice": "Η φωνή σας",

  // ── UI chrome: PinGate ─────────────────────────────────────────
  "ui.provider.pin_gate.title": "Εισαγωγή PIN",
  "ui.provider.pin_gate.subtitle": "Μόνο για το προσωπικό",
  "ui.provider.pin_gate.incorrect": "Λάθος PIN",
  "ui.provider.pin_gate.delete_aria": "Διαγραφή",
  "ui.provider.pin_gate.digit_aria": "Ψηφίο {n}",
  "ui.provider.pin_gate.cancel": "Ακύρωση",

  // ── UI chrome: VoiceCapture ────────────────────────────────────
  "ui.provider.voice_capture.coaching_intro":
    "Θα διαβάσετε μια πρόταση δυνατά.",
  "ui.provider.voice_capture.coaching_breath":
    "Πάρτε μερικές βαθιές αναπνοές.",
  "ui.provider.voice_capture.coaching_ready": "Έτοιμο.",
  "ui.provider.voice_capture.breathe_in": "Εισπνεύστε…",
  "ui.provider.voice_capture.breathe_out": "Εκπνεύστε…",
  "ui.provider.voice_capture.creating": "Δημιουργία κλώνου φωνής...",
  "ui.provider.voice_capture.creating_from_sample":
    "Δημιουργία κλώνου φωνής από δείγμα...",
  "ui.provider.voice_capture.loading_model":
    "Φόρτωση μοντέλου φωνής...",
  "ui.provider.voice_capture.clone_failed": "Η κλωνοποίηση απέτυχε",
  "ui.provider.voice_capture.captured": "Φωνή καταγράφηκε",
  "ui.provider.voice_capture.stop": "Διακοπή",
  "ui.provider.voice_capture.play": "Αναπαραγωγή",
  "ui.provider.voice_capture.discard": "Απόρριψη εγγραφής",
  "ui.provider.voice_capture.use_recording": "Χρήση αυτής της εγγραφής",
  "ui.provider.voice_capture.upload_file": "Ανέβασμα αρχείου",
  "ui.provider.voice_capture.record": "Εγγραφή",
  "ui.provider.voice_capture.stop_early": "Πρόωρη διακοπή",
  "ui.provider.voice_capture.remove": "Αφαίρεση",
  "ui.provider.voice_capture.retry": "Επανάληψη",
  "ui.provider.voice_capture.done": "Ολοκληρώθηκε!",
  "ui.provider.voice_capture.cancel": "Ακύρωση",
  "ui.provider.voice_capture.seconds_recorded": "{n} δευτ. εγγραφής",
  "ui.provider.voice_capture.cancel_countdown_aria":
    "Ακύρωση αντίστροφης μέτρησης εγγραφής",
  "ui.provider.voice_capture.stop_early_aria":
    "Πρόωρη διακοπή εγγραφής",
  "ui.provider.voice_capture.audio_level_aria": "Επίπεδο ήχου",
  "ui.provider.voice_capture.recording_progress_aria":
    "Πρόοδος εγγραφής",
  "ui.provider.voice_capture.stop_preview_aria":
    "Διακοπή προεπισκόπησης αναπαραγωγής",
  "ui.provider.voice_capture.play_preview_aria":
    "Αναπαραγωγή προεπισκόπησης εγγραφής",
  "ui.provider.voice_capture.discard_aria":
    "Απόρριψη αυτής της εγγραφής και νέα εκκίνηση",
  "ui.provider.voice_capture.stop_playback_aria":
    "Διακοπή αναπαραγωγής ηχογραφημένου δείγματος",
  "ui.provider.voice_capture.play_sample_aria":
    "Αναπαραγωγή ηχογραφημένου δείγματος φωνής",
  "ui.provider.voice_capture.remove_aria": "Αφαίρεση δείγματος φωνής",
  "ui.provider.voice_capture.retry_aria":
    "Επανάληψη εξαγωγής κλώνου φωνής",
  "ui.provider.voice_capture.upload_aria":
    "Ανέβασμα δείγματος φωνής από αρχείο",
  "ui.provider.voice_capture.record_aria":
    "Εγγραφή δείγματος φωνής από μικρόφωνο",
  "ui.provider.voice_capture.err_network":
    "Δεν ήταν δυνατή η σύνδεση με το μοντέλο φωνής. Ελέγξτε τη σύνδεσή σας και πατήστε Επανάληψη.",
  "ui.provider.voice_capture.err_timeout":
    "Η επεξεργασία φωνής κράτησε πολύ. Πατήστε Επανάληψη για νέα δοκιμή.",
  "ui.provider.voice_capture.err_mic_denied":
    "Η πρόσβαση στο μικρόφωνο είναι αποκλεισμένη. Ενεργοποιήστε το στις ρυθμίσεις του προγράμματος περιήγησης ή ανεβάστε αρχείο.",
  "ui.provider.voice_capture.err_generic":
    "Δεν καταφέραμε να ολοκληρώσουμε την προετοιμασία της φωνής σας. Πατήστε Επανάληψη για νέα δοκιμή.",
  "ui.provider.voice_capture.err_too_short":
    "Η εγγραφή ήταν πολύ σύντομη. Μιλήστε καθ' όλη τη διάρκεια της αντίστροφης μέτρησης και πατήστε Επανάληψη.",
  "ui.provider.voice_capture.err_too_noisy":
    "Ο θόρυβος του περιβάλλοντος ήταν πολύ δυνατός για καθαρή κλωνοποίηση φωνής. Μετακινηθείτε σε πιο ήσυχο σημείο και πατήστε Επανάληψη.",
  "ui.provider.voice_capture.err_mic_denied_raw":
    "Η πρόσβαση στο μικρόφωνο απορρίφθηκε. Δοκιμάστε να ανεβάσετε αρχείο.",
  "ui.provider.voice_capture.err_playback":
    "Δεν ήταν δυνατή η αναπαραγωγή ήχου.",

  // ── UI chrome: FallbackVoicePicker ─────────────────────────────
  "ui.provider.fallback_voice.enhanced_badge": "Βελτιωμένη",
  "ui.provider.fallback_voice.enhanced_aria": "Βελτιωμένη νευρωνική φωνή",
  "ui.provider.fallback_voice.on_device_badge": "Στη συσκευή",
  "ui.provider.fallback_voice.playing": "Αναπαράγεται...",
  "ui.provider.fallback_voice.unavailable":
    "Οι φωνές συστήματος δεν είναι διαθέσιμες σε αυτή τη συσκευή.",
  "ui.provider.fallback_voice.loading":
    "Φόρτωση διαθέσιμων φωνών...",
  "ui.provider.fallback_voice.hide_others": "Απόκρυψη άλλων φωνών",
  "ui.provider.fallback_voice.more_voices": "Περισσότερες φωνές ({n})",

  // ── UI chrome: Setup wizard ───────────────────────────────────
  // Step labels (progress bar)
  "ui.provider.setup.steps.patient": "Ασθενής",
  "ui.provider.setup.steps.voice": "Φωνή",
  "ui.provider.setup.steps.care_team": "Ομάδα",
  "ui.provider.setup.steps.confirm": "Επιβεβαίωση",

  // Skip button + confirm dialog
  "ui.provider.setup.skip": "Παράλειψη →",
  "ui.provider.setup.skip_aria": "Παράλειψη ρύθμισης",
  "ui.provider.setup.skip_dialog.title": "Παράλειψη ρύθμισης;",
  "ui.provider.setup.skip_dialog.body": "Ξεκινήστε να χρησιμοποιείτε το OwnVoice τώρα. Μπορείτε να ολοκληρώσετε τη ρύθμιση αργότερα πατώντας το όνομα του ασθενούς στην κεφαλίδα.",
  "ui.provider.setup.skip_dialog.body_add_patient":
    "Δεν θα προστεθεί κανένας ασθενής.",
  "ui.provider.setup.skip_dialog.confirm": "Παράλειψη ρύθμισης",
  "ui.provider.setup.skip_dialog.cancel": "Συνέχεια",

  // Navigation
  "ui.provider.setup.back": "Πίσω",
  "ui.provider.setup.continue": "Συνέχεια",
  "ui.provider.setup.start": "Εκκίνηση OwnVoice",

  // Step 0: Patient info
  "ui.provider.setup.step0.heading": "Καλώς ήρθατε στο OwnVoice",
  "ui.provider.setup.step0.subhead":
    "Ας ρυθμίσουμε τον πίνακα επικοινωνίας σας. Τα πάντα μένουν σε αυτή τη συσκευή.",
  "ui.provider.setup.step0.name_label": "Όνομα ασθενούς",
  "ui.provider.setup.step0.name_placeholder": "Μικρό όνομα ή προτιμώμενο",
  "ui.provider.setup.step0.bed_label": "Κρεβάτι / Δωμάτιο",
  "ui.provider.setup.step0.bed_placeholder": "π.χ. 4Β-12",
  "ui.provider.setup.step0.language_label": "Γλώσσα",

  // Step 1: Voice sample
  "ui.provider.setup.step1.heading": "Δείγμα φωνής",
  "ui.provider.setup.step1.body1":
    "Καταγράψτε ένα δείγμα φωνής ώστε το OwnVoice να μιλάει με τη φωνή του ασθενούς. Αυτό το βήμα είναι προαιρετικό.",
  "ui.provider.setup.step1.body2":
    "Η κλωνοποίηση φωνής εκτελείται εξ ολοκλήρου στη συσκευή. Κανένα ηχητικό δεν φεύγει από αυτό το tablet.",
  "ui.provider.setup.step1.patient_label": "Ασθενής",
  "ui.provider.setup.step1.backup_voice_heading": "Εφεδρική φωνή",
  "ui.provider.setup.step1.backup_voice_body1":
    "Επιλέξτε μια φωνή συστήματος για χρήση ενώ φορτώνει ο κλώνος φωνής, ή αν δεν έχει εγγραφεί δείγμα. Πατήστε μια φωνή για ακρόαση.",
  "ui.provider.setup.step1.backup_voice_body2":
    "Χρησιμοποιεί την ενσωματωμένη σύνθεση ομιλίας της συσκευής σας.",

  // Step 2: Care team
  "ui.provider.setup.step2.heading": "Ομάδα φροντίδας",
  "ui.provider.setup.step2.body":
    "Προσθέστε τους παρόχους που θα φροντίζουν αυτόν τον ασθενή.",
  "ui.provider.setup.step2.icon_label": "Εικονίδιο",
  "ui.provider.setup.step2.name_label": "Όνομα",
  "ui.provider.setup.step2.name_placeholder":
    "Δρ. Παπαδόπουλος, Νοσ. Μαρία...",
  "ui.provider.setup.step2.add": "Προσθήκη",

  // Step 3: Confirm
  "ui.provider.setup.step3.heading": "Έτοιμο",
  "ui.provider.setup.step3.body":
    "Ελέγξτε τις ρυθμίσεις σας. Μπορείτε να αλλάξετε τα πάντα αργότερα στις Ρυθμίσεις.",
  "ui.provider.setup.step3.summary.patient": "Ασθενής",
  "ui.provider.setup.step3.summary.bed": "Κρεβάτι / Δωμάτιο",
  "ui.provider.setup.step3.summary.language": "Γλώσσα",
  "ui.provider.setup.step3.summary.language_default": "Αγγλικά",
  "ui.provider.setup.step3.summary.voice": "Φωνή",
  "ui.provider.setup.step3.summary.care_team": "Ομάδα φροντίδας",
  "ui.provider.setup.step3.summary.not_set": "Δεν ορίστηκε",
  "ui.provider.setup.step3.summary.captured": "Καταγράφηκε",
  "ui.provider.setup.step3.summary.not_captured": "Δεν καταγράφηκε",
  "ui.provider.setup.step3.summary.none_added": "Κανένας δεν προστέθηκε",
  "ui.provider.setup.step3.pin_label": "PIN προσωπικού (προαιρετικό)",
  "ui.provider.setup.step3.pin_body":
    "Ορίστε ένα 4ψήφιο PIN για προστασία των ρυθμίσεων παρόχου.",
  "ui.provider.setup.step3.pin_placeholder": "1234",

  // ── UI chrome: Settings panel ─────────────────────────────────
  "ui.provider.settings.title": "Ρυθμίσεις",
  "ui.provider.settings.done": "Τέλος",
  "ui.provider.settings.close_aria": "Κλείσιμο ρυθμίσεων",

  "ui.provider.patient_edit.title": "Επεξεργασία {name}",
  "ui.provider.patient_edit.title_default": "Επεξεργασία ασθενούς",
  "ui.provider.patient_edit.close_aria": "Κλείσιμο επεξεργασίας ασθενούς",
  "ui.provider.patient_pill.aria": "Επεξεργασία ασθενούς: {name}",
  "ui.provider.nav.staff_menu": "Ρυθμίσεις",
  "ui.provider.staff_sheet.title": "Προσωπικό",
  "ui.provider.staff_sheet.close_aria": "Κλείσιμο μενού προσωπικού",
  "ui.provider.staff_sheet.patients_description": "Αλλαγή, προσθήκη ή επεξεργασία ασθενών",
  "ui.provider.staff_sheet.settings_description": "Ομάδα φροντίδας, προσβασιμότητα, εκτός σύνδεσης",
  "ui.provider.staff_sheet.end_session_description": "Έξοδος από τη λειτουργία προσωπικού",
  // ── UI chrome: VoiceCacheProgress ─────────────────────────────
  "ui.provider.settings.voice_cache.discard_title":
    "Απόρριψη προετοιμασίας φωνής {label};",
  "ui.provider.settings.voice_cache.discard_body":
    "Η πρόοδος ({current} / {total} φράσεις) θα χαθεί. Το ηχογραφημένο δείγμα φωνής διατηρείται — μπορείτε να ξεκινήσετε ξανά αργότερα.",
  "ui.provider.settings.voice_cache.cancel": "Ακύρωση",
  "ui.provider.settings.voice_cache.cancel_aria":
    "Ακύρωση και διατήρηση προετοιμασίας φωνής",
  "ui.provider.settings.voice_cache.discard_confirm": "Απόρριψη",
  "ui.provider.settings.voice_cache.discard_confirm_aria":
    "Επιβεβαίωση απόρριψης προετοιμασίας φωνής",
  "ui.provider.settings.voice_cache.discard_trigger_aria":
    "Απόρριψη προετοιμασίας φωνής {label}",
  // TODO(translator): {plural} token is an English suffix — renders empty in Greek
  "ui.provider.settings.voice_cache.queued":
    "Σε ουρά — η φωνή {label} θα προετοιμαστεί στη συνέχεια ({total} φράσεις{plural})",
  "ui.provider.settings.voice_cache.preparing":
    "Προετοιμασία φωνής {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.paused":
    "Σε παύση — φωνή {label}… {current} / {total}",
  "ui.provider.settings.voice_cache.resume": "Συνέχεια",
  "ui.provider.settings.voice_cache.resume_aria":
    "Συνέχεια προετοιμασίας φωνής {label}",
  "ui.provider.settings.voice_cache.pause": "Παύση",
  "ui.provider.settings.voice_cache.pause_aria":
    "Παύση προετοιμασίας φωνής {label}",
  "ui.provider.settings.voice_cache.done":
    "Κλώνος φωνής ενεργός — όλες οι {total} φράσεις έτοιμες στη φωνή {label}",
  // TODO(translator): {plural} token is an English suffix — renders empty in Greek
  "ui.provider.settings.voice_cache.failed":
    "{count} φράσεις{plural} απέτυχαν για {label}",
  "ui.provider.settings.voice_cache.retry": "Επανάληψη",
  "ui.provider.settings.voice_cache.retry_aria":
    "Επανάληψη αποτυχημένων φράσεων κρυφής μνήμης φωνής",

  // ── UI chrome: Settings — About section ───────────────────────
  "ui.provider.settings.about.heading": "Σχετικά",
  "ui.provider.settings.about.subtitle":
    "Βοήθημα επικοινωνίας AAC για νοσηλευόμενους ασθενείς.",
  "ui.provider.settings.about.attribution_1":
    "Κλίμακα πόνου: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0",
  "ui.provider.settings.about.attribution_2":
    "Στόχοι φροντίδας: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0",
  "ui.provider.settings.about.sw_cache_prefix": "Κρυφή μνήμη SW:",

  // ── UI chrome: Settings — Reset section ───────────────────────
  "ui.provider.settings.reset.heading": "Επαναφορά",
  "ui.provider.settings.reset.action_label":
    "Επαναφορά εφαρμογής για νέο ασθενή",
  "ui.provider.settings.reset.confirm_title": "Είστε σίγουρος;",
  "ui.provider.settings.reset.confirm_body":
    "Αυτό θα διαγράψει όλα τα δεδομένα ασθενούς, τα δείγματα φωνής, το ιστορικό συνομιλίας και τις ρυθμίσεις παρόχου. Δεν μπορεί να αναιρεθεί.",
  "ui.provider.settings.reset.confirm_destructive": "Επαναφορά όλων",
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
  "ui.provider.settings.accessibility.heading": "Προσβασιμότητα",
  "ui.provider.settings.accessibility.toggle_label":
    "Λειτουργία υποβοηθούμενης εισόδου",
  "ui.provider.settings.accessibility.toggle_description":
    "Ενισχύει τα πλαίσια εστίασης, αυξάνει τον χρόνο πατήματος και βελτιώνει την ανατροφοδότηση για ασθενείς που χρησιμοποιούν trackball, joystick, δρομέα AssistiveTouch ή διακόπτη.",
  "ui.provider.settings.accessibility.pointer_hint_strong":
    "Εντοπίστηκε εξωτερικός δείκτης.",
  "ui.provider.settings.accessibility.pointer_hint_body":
    "Σκεφτείτε να ενεργοποιήσετε τη Λειτουργία υποβοηθούμενης εισόδου για αυτόν τον ασθενή.",

  // ── UI chrome: Settings — Patients section ────────────────────
  "ui.provider.settings.patients.title": "Ασθενείς",
  "ui.provider.settings.patients.active_remove_hint":
    "Αλλάξτε σε άλλον ασθενή πριν αφαιρέσετε αυτόν.",
  "ui.provider.settings.patients.remove_button": "Αφαίρεση",
  "ui.provider.settings.patients.add_patient": "+ Προσθήκη ασθενούς",
  "ui.provider.settings.patients.remove_dialog.title":
    "Αφαίρεση: {name};",
  "ui.provider.settings.patients.remove_dialog.body":
    "Θα διαγραφεί το δείγμα φωνής, το ιστορικό συνομιλίας και ο αποθηκευμένος ήχος κλώνου φωνής. Οι κλώνοι φωνής της ομάδας φροντίδας διατηρούνται για άλλους ασθενείς. Δεν μπορεί να αναιρεθεί.",
  "ui.provider.settings.patients.remove_dialog.confirm": "Αφαίρεση",
  "ui.provider.settings.patients.active_discharge_hint":
    "Αλλάξτε σε άλλον ασθενή πριν δώσετε εξιτήριο σε αυτόν.",
  "ui.provider.settings.patients.discharge_dialog.title": "Εξιτήριο για {name};",
  "ui.provider.settings.patients.discharge_dialog.body":
    "Θα διαγραφούν όλες οι συνομιλίες, η προσωρινή μνήμη ήχου και οι καταχωρίσεις του αρχείου δραστηριότητας. Δεν μπορεί να αναιρεθεί.",
  "ui.provider.settings.patients.discharge_dialog.confirm": "Εξιτήριο",

  // ── UI chrome: Settings — Care Team section ───────────────────
  "ui.provider.settings.care_team.heading": "Ομάδα φροντίδας",
  "ui.provider.settings.care_team.empty":
    "Δεν έχουν προστεθεί πάροχοι ακόμα.",

  // ── UI chrome: Settings — Patient Information section ─────────
  "ui.provider.settings.patient_info.heading": "Πληροφορίες ασθενούς",
  "ui.provider.settings.patient_info.name_label": "Όνομα",
  "ui.provider.settings.patient_info.bed_label": "Κρεβάτι / Δωμάτιο",
  "ui.provider.settings.patient_info.language_label": "Γλώσσα",

  // ── UI chrome: Settings — Language pickers ────────────────────
  "ui.provider.settings.lang.patient_section": "Γλώσσα ασθενούς",
  "ui.provider.settings.lang.caregiver_section": "Γλώσσα ομάδας φροντίδας",
  "ui.provider.settings.lang.caregiver_helper":
    "Η γλώσσα που κατανοεί η ομάδα φροντίδας σας. Συνήθως ρυθμίζεται μία φορά ανά συσκευή.",
  "ui.provider.settings.lang.change": "Αλλαγή γλώσσας",

  "ui.provider.settings.lang.picker_title": "Επιλογή γλώσσας",
  "ui.provider.settings.lang.patient_dialog.title":
    "Αλλαγή γλώσσας ασθενούς σε {lang};",
  "ui.provider.settings.lang.patient_dialog.body":
    "Ο κλώνος φωνής σας παραμένει έτοιμος — οι φράσεις που πατάτε θα ακούγονται το ίδιο. Θα προετοιμάσουμε ήχο για {providerCount} φωνές ομάδας (~{estimatedMinutes} λεπτά). Μπορείτε να συνεχίσετε να χρησιμοποιείτε την εφαρμογή.",
  "ui.provider.settings.lang.patient_dialog.body_unsupported":
    "Οι κλώνοι φωνής ομάδας φροντίδας δεν είναι διαθέσιμοι στα {lang} — θα χρησιμοποιηθεί η φωνή συστήματος. Οι υπάρχουσες εγγραφές διατηρούνται σε περίπτωση αλλαγής σε υποστηριζόμενη γλώσσα.",
  "ui.provider.settings.lang.patient_dialog.body_no_providers":
    "Οι φράσεις που πατάτε θα ακούγονται το ίδιο. Δεν έχουν ρυθμιστεί φωνές ομάδας, οπότε δεν χρειάζεται αναδημιουργία.",

  "ui.provider.settings.lang.caregiver_dialog.title":
    "Αλλαγή γλώσσας ομάδας φροντίδας σε {lang};",
  "ui.provider.settings.lang.caregiver_dialog.body":
    "Οι κλώνοι φωνής ομάδας σας παραμένουν έτοιμοι. Θα προετοιμάσουμε ήχο φωνής ασθενούς στη νέα γλώσσα (~{estimatedMinutes} λεπτά). Μπορείτε να συνεχίσετε να χρησιμοποιείτε την εφαρμογή.",
  "ui.provider.settings.lang.caregiver_dialog.body_unsupported":
    "Ο κλώνος φωνής ασθενούς δεν είναι διαθέσιμος στα {lang} — θα χρησιμοποιηθεί η φωνή συστήματος. Το ηχογραφημένο δείγμα φωνής ασθενούς διατηρείται σε περίπτωση αλλαγής σε υποστηριζόμενη γλώσσα.",
  "ui.provider.settings.lang.caregiver_dialog.body_no_voice":
    "Δεν έχει ρυθμιστεί κλώνος φωνής ασθενούς, οπότε δεν χρειάζεται αναδημιουργία.",
  "ui.provider.settings.patient_info.voice_label": "Φωνή",
  "ui.provider.settings.patient_info.backup_voice_label": "Εφεδρική φωνή",
  "ui.provider.settings.patient_info.backup_voice_body":
    "Φωνή συστήματος κατά τη φόρτωση κλώνου φωνής. Πατήστε για ακρόαση.",

  // ── UI chrome: Settings — Offline Readiness section ───────────
  "ui.provider.settings.activity_log.heading": "Αρχείο δραστηριότητας",
  "ui.provider.settings.activity_log.description":
    "Ομιλία, εξαγωγές και συμβάντα συστήματος που καταγράφονται σε αυτή τη συσκευή.",
  "ui.provider.settings.offline.heading": "Διαγνωστικά εφαρμογής",
  "ui.provider.settings.offline.status_description":
    "Κατάσταση των μοντέλων AI που χρησιμοποιεί η εφαρμογή στη συσκευή για δημιουργία φωνής, προτάσεις και αναγνώριση ομιλίας.",
  "ui.provider.settings.offline.downloading": "Λήψη μοντέλων…",
  "ui.provider.settings.offline.download_progress_aria":
    "Πρόοδος λήψης μοντέλων",
  "ui.provider.settings.offline.all_ready": "Όλα τα μοντέλα έτοιμα",
  "ui.provider.settings.offline.redownload_button": "Επαναλήψη μοντέλων",
  "ui.provider.settings.offline.already_up_to_date": "Ήδη ενημερωμένο",
  "ui.provider.settings.offline.checking": "Έλεγχος…",
  "ui.provider.settings.offline.verified": "✓ Μοντέλα επαληθεύτηκαν",
  "ui.provider.settings.offline.check_button":
    "Έλεγχος υπαρχόντων μοντέλων",
  "ui.provider.settings.offline.redownloading": "Επαναλαμβάνεται η λήψη…",
  "ui.provider.settings.offline.force_redownload_button":
    "Αναγκαστική εκ νέου λήψη όλων των μοντέλων",
  "ui.provider.settings.offline.model_status_ready": "έτοιμο",
  "ui.provider.settings.offline.model_status_downloading": "λήψη σε εξέλιξη…",
  "ui.provider.settings.offline.model_status_needs_retry":
    "χρειάζεται επανάληψη",
  "ui.provider.settings.offline.last_verified_prefix": "Τελευταία επαλήθευση: ",
  "ui.provider.settings.offline.storage_prefix": "Αποθήκευση: ",
  "ui.provider.settings.offline.storage_of": " από ",
  "ui.provider.settings.offline.storage_used": " χρησιμοποιούνται",
  "ui.provider.settings.offline.storage_low": " — χαμηλός χώρος",
  "ui.provider.settings.offline.clear_audio_cache":
    "Εκκαθάριση κρυφής μνήμης ήχου",
  "ui.provider.settings.offline.clearing": "Εκκαθάριση…",
  "ui.provider.settings.offline.rebuilding":
    "Ανακατασκευή: {current} / {total}",
  "ui.provider.settings.offline.redownload_dialog.title":
    "Εκ νέου λήψη όλων των μοντέλων AI;",
  "ui.provider.settings.offline.redownload_dialog.body":
    "Θα ληφθούν περίπου 1,7 GB. Η σύνθεση φωνής συνεχίζει να λειτουργεί κατά την ανανέωση.",
  "ui.provider.settings.offline.redownload_dialog.confirm": "Εκ νέου λήψη",

  // ── UI chrome: SwitchSheet ────────────────────────────────────
  "ui.provider.switch.title": "Αλλαγή ασθενούς",
  "ui.provider.switch.add_patient": "+ Προσθήκη ασθενούς",
  "ui.provider.patients.title": "Ασθενείς",
  "ui.provider.patients.actions_aria": "Ενέργειες για {name}",
  "ui.provider.patients.action_edit": "Επεξεργασία",
  "ui.provider.patients.action_remove": "Αφαίρεση",
  "ui.provider.patients.action_discharge": "Εξιτήριο",
  "ui.provider.switch.voice_captured": "Φωνή καταγράφηκε",
  "ui.provider.switch.no_voice": "Χωρίς φωνή",
  "ui.provider.switch.last_active_just_now": "Μόλις τώρα",
  "ui.provider.switch.last_active_minutes":
    "Τελευταία δραστηριότητα πριν {n} λ.",
  "ui.provider.switch.last_active_hours":
    "Τελευταία δραστηριότητα πριν {n} ώ.",
  "ui.provider.switch.last_active_days":
    "Τελευταία δραστηριότητα πριν {n} η.",
  "ui.provider.switch.currently_active": "Ενεργός τώρα",
  "ui.provider.switch.switched_announcement":
    "Αλλαγή σε {name}. {count} μηνύματα συνομιλίας.",

  // ── UI chrome: Staff session warning toast ────────────────────
  "ui.provider.staff_session.warning_title":
    "Η συνεδρία προσωπικού τελειώνει",
  "ui.provider.staff_session.warning_body":
    "Η πρόσβαση προσωπικού θα κλειδωθεί σε {n} δευτερόλεπτα.",
  "ui.provider.staff_session.extend": "Παράταση συνεδρίας",
  "ui.provider.staff_session.end_now": "Τερματισμός τώρα",
  "ui.provider.nav.end_staff_session": "Τερματισμός συνεδρίας προσωπικού",
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
  "ui.voice_quality.title": "Ποιότητα φωνής",
  "ui.voice_quality.label.good": "Καλή",
  "ui.voice_quality.label.ok": "Εντάξει",
  "ui.voice_quality.label.poor": "Χρειάζεται βελτίωση",
  "ui.voice_quality.tip.snr": "Δοκιμάστε να ηχογραφήσετε σε πιο ήσυχο μέρος.",
  "ui.voice_quality.tip.clipping": "Απομακρυνθείτε λίγο από το μικρόφωνο.",
  "ui.voice_quality.tip.coverage": "Δοκιμάστε να διαβάσετε λίγο περισσότερο.",
  "ui.voice_quality.tip.voiced_fraction": "Προσπαθήστε να μιλάτε σε όλη τη διάρκεια της ηχογράφησης.",
  "ui.voice_quality.tip.pitch_variation": "Διαβάστε πιο φυσικά — αφήστε τη φωνή σας να ανεβαίνει και να κατεβαίνει.",
  "ui.voice_quality.tip.loudness": "Διατηρήστε σταθερή την ένταση της φωνής σας.",
  "ui.voice_quality.tip.tilt_boomy": "Δοκιμάστε να απομακρυνθείτε λίγο από το μικρόφωνο.",
  "ui.voice_quality.tip.tilt_tinny": "Το μικρόφωνο ακούγεται λεπτό — δοκιμάστε άλλο, αν έχετε.",
};

export default el;
