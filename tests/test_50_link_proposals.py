"""Vorschlaege fuer die Erschliessung, gegen die Titel des unverknuepften Bestands.

Fast die Haelfte der unverknuepften Dokumente nennt im Titel bereits einen Ort,
ein Werk, eine Institution oder ein Jahr, das in einem der vier Indizes steht.
`scripts/propose-links.py` liest diese Titel und legt Vorschlaege vor; in die
Daten geht nur, was das Erschliessungsteam bestaetigt.

Die stillen Defekte, gegen die diese Datei steht, sind alle vom selben Typ, ein
Vorschlag sieht plausibel aus und ist falsch:

  * Teiltreffer im Wortinneren ("Wien" in "Wiener Neustadt", "Graz" in "Grazie").
  * Ein Name, der auf zwei Indexeintraege zugleich passt, wird zu einem
    davon aufgeloest, statt als mehrdeutig ausgewiesen zu werden.
  * Ein Personenname wird an einem einzelnen Nachnamen erkannt.
  * Ein Vorschlag traegt eine Rolle, die niemand erfasst hat.

Lauf: pytest tests/test_50_link_proposals.py
"""

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent


@pytest.fixture(scope="module")
def mod():
    path = REPO_ROOT / "scripts" / "propose-links.py"
    spec = importlib.util.spec_from_file_location("propose_links", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def orte(mod):
    return mod.build_index([
        {"m3gim_id": "O1", "name": "Wien"},
        {"m3gim_id": "O2", "name": "Wiener Neustadt"},
        {"m3gim_id": "O3", "name": "Graz"},
        {"m3gim_id": "O4", "name": "Bayreuth"},
        {"m3gim_id": "O5", "name": "München"},
    ], kind="ort")


@pytest.fixture(scope="module")
def personen(mod):
    return mod.build_index([
        {"m3gim_id": "P1", "name": "Malaniuk, Ira"},
        {"m3gim_id": "P2", "name": "Wagner, Wieland"},
        {"m3gim_id": "P3", "name": "Wagner, Richard"},
    ], kind="person")


# ---------------------------------------------------------------------------
# Wortgrenzen
# ---------------------------------------------------------------------------

def test_a_place_inside_a_longer_word_is_not_a_hit(mod, orte):
    """"Wien" in "Wiener Neustadt" ist kein Treffer auf Wien."""
    hits = mod.find_mentions("Gastspiel in Wiener Neustadt", orte)
    names = {h.name for h in hits}
    assert "Wien" not in names, (
        "Teiltreffer im Wortinneren: der Vorschlag verortet ein Dokument in "
        f"einer Stadt, die im Titel nicht steht. Treffer: {names}"
    )
    assert "Wiener Neustadt" in names


def test_a_place_at_a_word_boundary_is_a_hit(mod, orte):
    hits = mod.find_mentions("Programm der Bayreuther Festspiele 1953", orte)
    assert {h.name for h in hits} == {"Bayreuth"}


def test_a_derived_adjective_still_names_the_place(mod, orte):
    """"Bayreuther Festspiele" belegt Bayreuth; der Bestand schreibt so."""
    hits = mod.find_mentions("Programm der Bayreuther Festspiele", orte)
    assert {h.name for h in hits} == {"Bayreuth"}
    assert [h.surface for h in hits] == ["Bayreuther"], (
        "Die Belegstelle muss die geschriebene Form zeigen, sonst kann das "
        "Team den Vorschlag nicht im Titel wiederfinden."
    )


def test_an_unlisted_ending_is_no_derivation(mod, orte):
    """"Grazie" ist kein Beleg fuer Graz; die Endungsliste bleibt geschlossen."""
    hits = mod.find_mentions("Con grazie e con brio", orte)
    assert hits == [], f"Scheinbeleg aus einer freien Endung: {hits}"


def test_punctuation_counts_as_a_boundary(mod, orte):
    hits = mod.find_mentions('Brief aus "Graz", 1957', orte)
    assert {h.name for h in hits} == {"Graz"}


# ---------------------------------------------------------------------------
# Mehrdeutigkeit
# ---------------------------------------------------------------------------

def test_an_ambiguous_span_is_reported_not_resolved(mod, personen):
    """Ein blosses "Wagner" passt auf zwei Eintraege und wird nicht aufgeloest."""
    hits = mod.find_mentions("Brief von Wagner", personen)
    assert hits == [], (
        "Ein Nachname allein reicht fuer keinen Personenvorschlag; sonst "
        f"steht ein geratener Vorname in den Daten. Treffer: {hits}"
    )


def test_a_full_person_name_resolves(mod, personen):
    hits = mod.find_mentions("Brief von Wieland Wagner an Ira Malaniuk", personen)
    assert {h.name for h in hits} == {"Wagner, Wieland", "Malaniuk, Ira"}


def test_the_index_form_of_a_person_name_resolves(mod, personen):
    hits = mod.find_mentions("Korrespondenz Malaniuk, Ira", personen)
    assert {h.name for h in hits} == {"Malaniuk, Ira"}


# ---------------------------------------------------------------------------
# Jahre
# ---------------------------------------------------------------------------

def test_a_year_in_range_is_extracted(mod):
    assert mod.extract_years("Festspiele 1953, zweiter Abend") == ["1953"]


def test_a_number_that_is_no_plausible_year_stays_out(mod):
    assert mod.extract_years("Signatur 1234 und Blatt 2026") == []


# ---------------------------------------------------------------------------
# Form des Vorschlags
# ---------------------------------------------------------------------------

def test_a_proposal_carries_no_invented_role(mod, orte):
    """Die Rollenspalte bleibt leer; die Rolle erfasst das Team."""
    rows = mod.proposals_for(
        {"archivsignatur": "UAKUG/NIM_001", "folio": "1", "titel": "Abend in Graz"},
        {"ort": orte},
    )
    assert rows, "Kein Vorschlag fuer einen Titel, der einen Indexort nennt."
    assert all(r["rolle"] == "" for r in rows), (
        "Ein Vorschlag traegt eine geratene Rolle: " + str(rows)
    )


def test_a_proposal_names_its_evidence(mod, orte):
    rows = mod.proposals_for(
        {"archivsignatur": "UAKUG/NIM_001", "folio": "1", "titel": "Abend in Graz"},
        {"ort": orte},
    )
    assert all(r["anmerkung"] and "Graz" in r["anmerkung"] for r in rows), (
        "Ohne die Belegstelle im Titel kann das Team den Vorschlag nicht "
        "pruefen: " + str(rows)
    )


def test_the_evidence_is_a_real_slice_of_the_title(mod, orte):
    """Die Belegstelle steht so im Titel; ohne das ist sie nicht pruefbar.

    Die Faltung fuer den Vergleich aendert Laengen (Umlaut, scharfes s). Ohne
    Rueckrechnung zeigte die Belegstelle einen verschobenen Ausschnitt.
    """
    title = "Größer Saal, München und Wien, Süddeutschland"
    for hit in mod.find_mentions(title, orte):
        assert hit.surface in title, (
            f"Belegstelle {hit.surface!r} steht nicht im Titel {title!r}"
        )


def test_the_proposal_columns_match_the_link_workbook(mod, orte):
    """Eine bestaetigte Zeile ist ohne Umbau in die Verknuepfungstabelle einsetzbar."""
    rows = mod.proposals_for(
        {"archivsignatur": "UAKUG/NIM_001", "folio": "1", "titel": "Abend in Graz"},
        {"ort": orte},
    )
    expected = ["archivsignatur", "folio", "datenpunkt_id", "typ", "name",
                "rolle", "anmerkung"]
    for r in rows:
        assert list(r.keys())[:len(expected)] == expected, (
            f"Spalten weichen von der Verknuepfungstabelle ab: {list(r.keys())}"
        )
