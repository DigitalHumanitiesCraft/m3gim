"""String-Integrität: Keine Artefakte aus pandas/Excel-Import, saubere Encodings.

Ergaenzend zum JSON-Schema (test_01): deckt alle String-Werte rekursiv ab,
nicht nur die im Schema benannten Felder. Faengt Mojibake, NaT-Durchschlag
und Whitespace-Drift in beliebigen Sub-Entities (Agents, Locations, Works)."""


NAT_ARTIFACTS = {"NaT", "nan", "None", "NaN", "null"}

MOJIBAKE_PATTERNS = [
    "Ã¤", "Ã¶", "Ã¼", "Ã\x9f",   # ae/oe/ue/ß doppelt UTF-8
    "â€™", "â€œ", "â€",           # smart quotes
    "Ã©", "Ã¨", "Ã¢",             # franz. Umlaute doppelt kodiert
]


def test_no_nat_artifacts(records, helpers):
    offenders = []
    for rec in records:
        for s in helpers.iter_strings(rec):
            if s.strip() in NAT_ARTIFACTS:
                offenders.append((rec.get("@id"), s))
    assert not offenders, f"NaT/None-Artefakte: {offenders[:5]}"


def test_no_leading_trailing_whitespace(records, helpers):
    """Alle String-Werte sind gestrippt. Zeilenumbrüche in Mehrzeilen-Feldern sind ok."""
    offenders = []
    for rec in records:
        for s in helpers.iter_strings(rec):
            # Ignoriere Zeilenumbrüche am Anfang/Ende (mehrzeilige Titel sind real)
            if s != s.strip() and not s.startswith("\n") and not s.endswith("\n"):
                # nur flaggen wenn echte Leerzeichen am Rand
                if s.startswith(" ") or s.endswith(" "):
                    offenders.append((rec.get("@id"), repr(s[:50])))
    assert not offenders, f"Ungetrippte Strings: {offenders[:5]}"


def test_umlauts_preserved(records, helpers):
    offenders = []
    for rec in records:
        for s in helpers.iter_strings(rec):
            for bad in MOJIBAKE_PATTERNS:
                if bad in s:
                    offenders.append((rec.get("@id"), bad, s[:80]))
                    break
    assert not offenders, f"Mojibake gefunden: {offenders[:5]}"


def test_title_non_empty_when_present(records):
    offenders = []
    for rec in records:
        if "rico:title" in rec:
            t = rec["rico:title"]
            if not isinstance(t, str) or len(t.strip()) == 0:
                offenders.append(rec.get("@id"))
    assert not offenders, f"Leere Titel: {offenders[:5]}"


def test_datum_no_excel_time_artifact(records):
    offenders = []
    for rec in records:
        d = rec.get("rico:date", "")
        if d and "00:00:00" in d:
            offenders.append((rec.get("@id"), d))
    assert not offenders, f"Excel-Zeitartefakt: {offenders[:5]}"
