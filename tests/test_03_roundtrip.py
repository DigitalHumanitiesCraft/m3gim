"""XLSX-Rohdaten ↔ JSON-LD Roundtrip.

Validiert, dass jede gültige XLSX-Zeile im Output ankommt und Kerninhalte
erhalten bleiben."""

import pandas as pd
import pytest


def _signatur_from_xlsx(df):
    """Liefert alle gültigen Signaturen aus der Objekte-XLSX."""
    sigs = set()
    for val in df["archivsignatur"].dropna():
        s = str(val).strip()
        if s and s.lower() != "beispiel":
            sigs.add(s)
    return sigs


def test_record_count_reasonable(records, xlsx_objekte):
    """Records-Zahl muss mindestens die Zahl der XLSX-Signaturen erreichen.

    Jede gueltige Signatur erzeugt mindestens einen Record; Folio-Konvolute
    erhoehen den Count zusaetzlich. Unterschreitung signalisiert stillen
    Datenverlust in der Pipeline.
    """
    xlsx_valid = _signatur_from_xlsx(xlsx_objekte)
    assert len(records) >= len(xlsx_valid), (
        f"Record-Verlust: {len(records)} Records fuer {len(xlsx_valid)} "
        f"XLSX-Signaturen (Folios sollten den Count erhoehen, nicht senken)"
    )


def test_every_xlsx_signatur_in_graph(records, xlsx_objekte):
    xlsx_sigs = _signatur_from_xlsx(xlsx_objekte)
    graph_sigs = set()
    for r in records:
        ident = r.get("rico:identifier", "")
        # Folio-Records haben "SIG folio" — nur Basis-Signatur extrahieren
        base = ident.split()[0] if ident else ""
        if base:
            graph_sigs.add(base)
    missing = xlsx_sigs - graph_sigs
    assert not missing, f"Signaturen fehlen im Graph: {sorted(missing)[:10]}"


def test_bearbeitungsstand_normalized(records):
    valid = {"abgeschlossen", "begonnen", "zurueckgestellt"}
    offenders = []
    for r in records:
        bs = r.get("m3gim:bearbeitungsstand")
        if bs is not None and bs not in valid:
            offenders.append((r["@id"], bs))
    assert not offenders, f"Ungültige bearbeitungsstand-Werte: {offenders}"


def test_dokumenttyp_has_valid_prefix(records):
    """Alle rico:hasDocumentaryFormType-@id beginnen mit m3gim-dft:."""
    offenders = []
    for r in records:
        dft = r.get("rico:hasDocumentaryFormType")
        if dft is None:
            continue
        if isinstance(dft, dict):
            aid = dft.get("@id", "")
            if not aid.startswith("m3gim-dft:"):
                offenders.append((r["@id"], aid))
    assert not offenders, f"Fremdes dokumenttyp-Prefix: {offenders[:5]}"


@pytest.mark.parametrize("signatur,expected_substring", [
    ("UAKUG/NIM/PL_01", "Liederabend"),
    ("UAKUG/NIM/PL_02", "Mozart-Woche"),
    ("UAKUG/NIM/PL_04", "SINFONISCHES ORCHESTER"),
])
def test_known_objekte_have_expected_title(records, signatur, expected_substring):
    """Gezielte Einzelfall-Roundtrips — diese Datensätze stehen fest.
    Sichert ab, dass die Pipeline Titel unveraendert durchreicht und Signaturen
    korrekt matcht (inkl. Slash-Behandlung bei Plakaten UAKUG/NIM/PL_XX)."""
    matching = [r for r in records if r.get("rico:identifier", "").startswith(signatur)]
    assert matching, f"Kein Record mit Signatur {signatur}"
    title = matching[0].get("rico:title", "")
    assert expected_substring.lower() in title.lower(), (
        f"{signatur}: erwartet '{expected_substring}' in Titel, ist '{title[:80]}'"
    )
