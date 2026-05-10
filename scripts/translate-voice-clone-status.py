#!/usr/bin/env python3
"""One-shot script to translate the three new voice_clone_status keys
across all 23 non-en locale files. Run once after PR #215; left here
as a record of the translations and so the diff is reviewable.

Style anchors: matches each locale's existing voice_capture / voice_cache
terminology (e.g. de's "Stimmklon", fr's "clone vocal").
"""

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LOCALES_DIR = REPO / "src/data/locales"

# Per-locale translations. {fallback} interpolates as " · {name}" or empty;
# {label} interpolates the localized good/ok/poor word.
TRANSLATIONS = {
    "ar": {
        "extraction_failed": "استنساخ الصوت غير متاح — استخدام صوت احتياطي{fallback}",
        "retry_extraction_aria": "إعادة محاولة استخراج استنساخ الصوت",
        "quality_suffix": "الجودة: {label}",
    },
    "da": {
        "extraction_failed": "Stemmeklon ikke tilgængelig — bruger backup{fallback}",
        "retry_extraction_aria": "Prøv igen at udtrække stemmeklon",
        "quality_suffix": "kvalitet: {label}",
    },
    "de": {
        "extraction_failed": "Stimmklon nicht verfügbar – Ersatzstimme wird verwendet{fallback}",
        "retry_extraction_aria": "Stimmklon-Extraktion erneut versuchen",
        "quality_suffix": "Qualität: {label}",
    },
    "el": {
        "extraction_failed": "Ο κλώνος φωνής δεν είναι διαθέσιμος — γίνεται χρήση εφεδρικής φωνής{fallback}",
        "retry_extraction_aria": "Επανάληψη εξαγωγής κλώνου φωνής",
        "quality_suffix": "ποιότητα: {label}",
    },
    "es": {
        "extraction_failed": "Clon de voz no disponible — usando voz de respaldo{fallback}",
        "retry_extraction_aria": "Reintentar la extracción del clon de voz",
        "quality_suffix": "calidad: {label}",
    },
    "fi": {
        "extraction_failed": "Äänikloonia ei ole saatavilla — käytetään varaääntä{fallback}",
        "retry_extraction_aria": "Yritä äänikloonin purkamista uudelleen",
        "quality_suffix": "laatu: {label}",
    },
    "fr": {
        "extraction_failed": "Clone vocal indisponible — utilisation de la voix de secours{fallback}",
        "retry_extraction_aria": "Réessayer l'extraction du clone vocal",
        "quality_suffix": "qualité : {label}",
    },
    "he": {
        "extraction_failed": "שיבוט הקול אינו זמין — משתמש בקול גיבוי{fallback}",
        "retry_extraction_aria": "ניסיון נוסף לחילוץ שיבוט הקול",
        "quality_suffix": "איכות: {label}",
    },
    "hi": {
        "extraction_failed": "वॉइस क्लोन उपलब्ध नहीं — बैकअप आवाज़ का उपयोग{fallback}",
        "retry_extraction_aria": "वॉइस क्लोन निकालना पुनः प्रयास करें",
        "quality_suffix": "गुणवत्ता: {label}",
    },
    "it": {
        "extraction_failed": "Clone vocale non disponibile — uso della voce di riserva{fallback}",
        "retry_extraction_aria": "Riprova l'estrazione del clone vocale",
        "quality_suffix": "qualità: {label}",
    },
    "ja": {
        "extraction_failed": "音声クローンを利用できません — バックアップ音声を使用中{fallback}",
        "retry_extraction_aria": "音声クローンの抽出を再試行",
        "quality_suffix": "品質: {label}",
    },
    "ko": {
        "extraction_failed": "음성 클론을 사용할 수 없음 — 백업 음성 사용 중{fallback}",
        "retry_extraction_aria": "음성 클론 추출 다시 시도",
        "quality_suffix": "품질: {label}",
    },
    "ms": {
        "extraction_failed": "Klon suara tidak tersedia — menggunakan suara sandaran{fallback}",
        "retry_extraction_aria": "Cuba semula pengekstrakan klon suara",
        "quality_suffix": "kualiti: {label}",
    },
    "nl": {
        "extraction_failed": "Stemkloon niet beschikbaar — back-upstem wordt gebruikt{fallback}",
        "retry_extraction_aria": "Stemkloon-extractie opnieuw proberen",
        "quality_suffix": "kwaliteit: {label}",
    },
    "no": {
        "extraction_failed": "Stemmeklon ikke tilgjengelig — bruker reservestemme{fallback}",
        "retry_extraction_aria": "Prøv stemmeklon-uttrekking på nytt",
        "quality_suffix": "kvalitet: {label}",
    },
    "pl": {
        "extraction_failed": "Klon głosu niedostępny — używanie głosu zapasowego{fallback}",
        "retry_extraction_aria": "Ponów ekstrakcję klonu głosu",
        "quality_suffix": "jakość: {label}",
    },
    "pt": {
        "extraction_failed": "Clone de voz indisponível — usando voz de reserva{fallback}",
        "retry_extraction_aria": "Tentar novamente a extração do clone de voz",
        "quality_suffix": "qualidade: {label}",
    },
    "ru": {
        "extraction_failed": "Клон голоса недоступен — используется резервный голос{fallback}",
        "retry_extraction_aria": "Повторить извлечение клона голоса",
        "quality_suffix": "качество: {label}",
    },
    "sw": {
        "extraction_failed": "Klon ya sauti haipatikani — kutumia sauti mbadala{fallback}",
        "retry_extraction_aria": "Jaribu tena kuchimbua klon ya sauti",
        "quality_suffix": "ubora: {label}",
    },
    "tl": {
        "extraction_failed": "Hindi available ang voice clone — ginagamit ang backup{fallback}",
        "retry_extraction_aria": "Subukang muli ang voice clone extraction",
        "quality_suffix": "kalidad: {label}",
    },
    "tr": {
        "extraction_failed": "Ses klonu kullanılamıyor — yedek ses kullanılıyor{fallback}",
        "retry_extraction_aria": "Ses klonu çıkarmayı yeniden dene",
        "quality_suffix": "kalite: {label}",
    },
    "vi": {
        "extraction_failed": "Bản sao giọng nói không khả dụng — đang sử dụng giọng dự phòng{fallback}",
        "retry_extraction_aria": "Thử lại trích xuất bản sao giọng nói",
        "quality_suffix": "chất lượng: {label}",
    },
    "zh": {
        "extraction_failed": "语音克隆不可用 — 正在使用备用语音{fallback}",
        "retry_extraction_aria": "重试提取语音克隆",
        "quality_suffix": "质量：{label}",
    },
}

ENGLISH_FALLBACKS = {
    "extraction_failed": "Voice clone unavailable — using backup{fallback}",
    "retry_extraction_aria": "Retry extracting voice clone",
    "quality_suffix": "quality: {label}",
}

KEY_PREFIX = "ui.provider.settings.voice_clone_status."


def patch_locale(path: Path, translations: dict[str, str]) -> bool:
    text = path.read_text(encoding="utf-8")
    changed = False
    for short_key, translated in translations.items():
        full_key = KEY_PREFIX + short_key
        english = ENGLISH_FALLBACKS[short_key]
        # Match the exact English line we inserted earlier. Use a regex that
        # tolerates the indentation and key/value formatting: 2-space indent,
        # quoted key, colon-space, quoted English value, trailing comma.
        # Quote the English with re.escape because it contains regex chars
        # like { } and dashes.
        pattern = (
            r'(  "' + re.escape(full_key) + r'": ")' + re.escape(english) + r'(",)'
        )
        replacement = r"\g<1>" + translated.replace("\\", r"\\") + r"\g<2>"
        new_text, n = re.subn(pattern, replacement, text, count=1)
        if n == 1:
            text = new_text
            changed = True
        else:
            print(
                f"warn: {path.name}: failed to replace {short_key!r} "
                f"(English fallback may already be translated, or formatting drifted)",
                file=sys.stderr,
            )
    if changed:
        path.write_text(text, encoding="utf-8")
    return changed


def main() -> int:
    changed_count = 0
    for code, translations in TRANSLATIONS.items():
        path = LOCALES_DIR / f"{code}.ts"
        if not path.exists():
            print(f"skip: {path.name} not found", file=sys.stderr)
            continue
        if patch_locale(path, translations):
            changed_count += 1
            print(f"updated {path.name}")
    print(f"\nTotal files updated: {changed_count} / {len(TRANSLATIONS)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
