#!/usr/bin/env python3
"""One-shot script to convert needs.hygiene.mouth from a bare noun phrase
into an imperative-request matching each locale's existing hygiene style.

The English entry changed from "Mouth care" to "I need mouth care".
Non-en locales were anomalies — every other hygiene entry in each
locale is already an imperative request directed at staff
(e.g. fr "Lavez-moi le visage"), but the mouth entry was a bare noun
phrase ("Soins de bouche"). This commit aligns the mouth entry with
each locale's own pattern.
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LOCALES_DIR = REPO / "src/data/locales"

# Per-locale: (old_value, new_value). Each new value matches the locale's
# existing imperative-request style for the other hygiene entries.
TRANSLATIONS = {
    "ar": ("العناية بالفم", "اعتنوا بفمي"),
    "da": ("Mundpleje", "Plej min mund"),
    "de": ("Mundpflege", "Bitte pflegen Sie meinen Mund"),
    "el": ("Στοματική φροντίδα", "Φροντίστε το στόμα μου"),
    "es": ("Aseo bucal", "Háganme aseo bucal"),
    "fi": ("Suunhoito", "Hoida suuni"),
    "fr": ("Soins de bouche", "Faites-moi des soins de bouche"),
    "he": ("טיפול פה", "תטפלו לי בפה"),
    "hi": ("मुँह की सफ़ाई", "मेरे मुँह की सफ़ाई कीजिए"),
    "it": ("Igiene orale", "Fatemi l'igiene orale"),
    "ja": ("口腔ケア", "口腔ケアをしてください"),
    "ko": ("구강 관리", "구강 관리를 해 주십시오"),
    "ms": ("Penjagaan mulut", "Tolong jaga mulut saya"),
    "nl": ("Mondverzorging", "Verzorg mijn mond"),
    "no": ("Munnstell", "Stell munnen min"),
    "pl": ("Pielęgnacja jamy ustnej", "Proszę zadbać o moją jamę ustną"),
    "pt": ("Higiene bucal", "Façam minha higiene bucal"),
    "ru": ("Уход за полостью рта", "Помогите мне с уходом за ртом"),
    "sw": ("Usafi wa kinywa", "Nisafisheni kinywa"),
    "tl": ("Linis ng bibig", "Linisan ang bibig ko"),
    "tr": ("Ağız bakımı", "Ağız bakımımı yapın"),
    "vi": ("Vệ sinh răng miệng", "Vệ sinh miệng giúp tôi"),
    "zh": ("口腔护理", "帮我做口腔护理"),
}

KEY = "needs.hygiene.mouth"


def patch(path: Path, old: str, new: str) -> bool:
    text = path.read_text(encoding="utf-8")
    pattern = (
        r'("' + re.escape(KEY) + r'": ")' + re.escape(old) + r'(")'
    )
    new_text, n = re.subn(pattern, r"\g<1>" + new.replace("\\", r"\\") + r"\g<2>", text, count=1)
    if n == 1:
        path.write_text(new_text, encoding="utf-8")
        return True
    print(f"warn: {path.name}: failed to replace (expected {old!r})", file=sys.stderr)
    return False


def main() -> int:
    changed = 0
    for code, (old, new) in TRANSLATIONS.items():
        path = LOCALES_DIR / f"{code}.ts"
        if not path.exists():
            print(f"skip: {path.name} not found", file=sys.stderr)
            continue
        if patch(path, old, new):
            changed += 1
            print(f"updated {path.name}: {old!r} -> {new!r}")
    print(f"\nTotal files updated: {changed} / {len(TRANSLATIONS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
