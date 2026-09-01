"""XLSX raw data <-> JSON-LD roundtrip.

Validates that every valid XLSX row reaches the output and that core content
is preserved."""

import pytest


def _signatur_from_xlsx(df):
    """Return all valid signatures from the object XLSX."""
    sigs = set()
    for val in df["archivsignatur"].dropna():
        s = str(val).strip()
        if s and s.lower() != "beispiel":
            sigs.add(s)
    return sigs


def test_record_count_reasonable(records, xlsx_objekte):
    """Record count must reach at least the number of XLSX signatures.

    Every valid signature produces at least one record; Folio-Konvolute raise
    the count further. Falling short signals silent data loss in the pipeline.
    """
    xlsx_valid = _signatur_from_xlsx(xlsx_objekte)
    assert len(records) >= len(xlsx_valid), (
        f"Record-Verlust: {len(records)} Records fuer {len(xlsx_valid)} "
        f"XLSX-Signaturen (Folios sollten den Count erhoehen, nicht senken)"
    )


@pytest.mark.xfail(
    reason="Quellfehler (Partner-Uebergabeliste): Objektzeile UAKUG/NIM_138 traegt ausser der Signatur keine "
           "einzige Angabe, weshalb die Pipeline keinen Record dazu bildet. "
           "Quellfehler, siehe knowledge/data/reports/reconciliation-register.md",
    strict=True,
)
def test_every_xlsx_signatur_in_graph(records, xlsx_objekte):
    xlsx_sigs = _signatur_from_xlsx(xlsx_objekte)
    graph_sigs = set()
    for r in records:
        ident = r.get("rico:identifier", "")
        # Folio records carry "SIG folio", extract only the base signature.
        base = ident.split()[0] if ident else ""
        if base:
            graph_sigs.add(base)
    missing = xlsx_sigs - graph_sigs
    assert not missing, f"Signaturen fehlen im Graph: {sorted(missing)[:10]}"


def test_bearbeitungsstand_normalized(records):
    valid = {"abgeschlossen", "begonnen", "zurueckgestellt"}
    offenders = []
    for r in records:
        bs = r.get("m3gim-ontology:processingStatus")
        if bs is not None and bs not in valid:
            offenders.append((r["@id"], bs))
    assert not offenders, f"Ungültige bearbeitungsstand-Werte: {offenders}"


def test_dokumenttyp_has_valid_prefix(records):
    """All rico:hasDocumentaryFormType @id values start with m3gim-vocab:."""
    offenders = []
    for r in records:
        dft = r.get("rico:hasDocumentaryFormType")
        if dft is None:
            continue
        if isinstance(dft, dict):
            aid = dft.get("@id", "")
            if not aid.startswith("m3gim-vocab:"):
                offenders.append((r["@id"], aid))
    assert not offenders, f"Fremdes dokumenttyp-Prefix: {offenders[:5]}"


@pytest.mark.parametrize("signatur,expected_substring", [
    ("UAKUG/NIM/PL_01", "Liederabend"),
    ("UAKUG/NIM/PL_02", "Mozart-Woche"),
    ("UAKUG/NIM/PL_04", "SINFONISCHES ORCHESTER"),
])
def test_known_objekte_have_expected_title(records, signatur, expected_substring):
    """Targeted single-case roundtrips, these records are fixed.

    Ensures the pipeline passes titles through unchanged and matches
    signatures correctly (including slash handling for posters UAKUG/NIM/PL_XX).
    """
    matching = [r for r in records if r.get("rico:identifier", "").startswith(signatur)]
    assert matching, f"Kein Record mit Signatur {signatur}"
    title = matching[0].get("rico:title", "")
    assert expected_substring.lower() in title.lower(), (
        f"{signatur}: erwartet '{expected_substring}' in Titel, ist '{title[:80]}'"
    )
