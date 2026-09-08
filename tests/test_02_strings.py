"""String integrity: no artifacts from the pandas/Excel import, clean encodings.

Complements the JSON schema (test_01) by covering every string value
recursively, not only the fields named in the schema. Catches mojibake, NaT
leakage and whitespace drift in arbitrary sub-entities (Agents, Locations,
Works)."""


NAT_ARTIFACTS = {"NaT", "nan", "None", "NaN", "null"}

MOJIBAKE_PATTERNS = [
    "Ã¤", "Ã¶", "Ã¼", "Ã\x9f",   # ae/oe/ue/ß double UTF-8
    "â€™", "â€œ", "â€",           # smart quotes
    "Ã©", "Ã¨", "Ã¢",             # French umlauts double-encoded
]


def test_no_nat_artifacts(records, helpers):
    offenders = []
    for rec in records:
        for s in helpers.iter_strings(rec):
            if s.strip() in NAT_ARTIFACTS:
                offenders.append((rec.get("@id"), s))
    assert not offenders, f"NaT/None-Artefakte: {offenders[:5]}"


def test_no_leading_trailing_whitespace(records, helpers):
    """Working values are stripped; explicitly recorded source literals are exact."""
    raw_keys = {"m3gim-ontology:recordedType", "m3gim-ontology:recordedValue",
                "m3gim-ontology:recordedRole", "rico:generalDescription",
                "m3gim-ontology:sourceValue", "m3gim-ontology:detailField",
                "m3gim-ontology:detailValue"}
    def working_strings(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key not in raw_keys:
                    yield from working_strings(child)
        elif isinstance(value, list):
            for child in value:
                yield from working_strings(child)
        elif isinstance(value, str):
            yield value
    offenders = []
    for rec in records:
        for s in working_strings(rec):
            # Leading/trailing newlines are real (multi-line titles), only
            # flag genuine edge spaces.
            if s != s.strip() and not s.startswith("\n") and not s.endswith("\n"):
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
