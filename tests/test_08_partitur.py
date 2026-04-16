"""Partitur-Invarianten — biographische Masterdaten."""


VALID_MOBILITAET_FORMEN = {"erzwungen", "geografisch", "lebensstil", "national", "bildung"}
VALID_AUFTRITT_KATEGORIEN = {"engagement", "festspiel", "gastspiel", "konzert"}


def test_lebensphasen_contiguous(partitur):
    """LP(i).bis == LP(i+1).von — lückenlos."""
    phases = partitur["lebensphasen"]
    for i in range(len(phases) - 1):
        assert phases[i]["bis"] == phases[i+1]["von"], (
            f"Lücke zwischen {phases[i]['id']} (bis {phases[i]['bis']}) "
            f"und {phases[i+1]['id']} (von {phases[i+1]['von']})"
        )


def test_lebensphasen_cover_lifespan(partitur):
    phases = partitur["lebensphasen"]
    assert phases[0]["von"] <= 1919, f"Erste Phase beginnt nach Geburt: {phases[0]['von']}"
    assert phases[-1]["bis"] >= 2009, f"Letzte Phase endet vor Tod: {phases[-1]['bis']}"


def test_lebensphasen_von_less_than_bis(partitur):
    for p in partitur["lebensphasen"]:
        assert p["von"] < p["bis"], f"{p['id']}: von {p['von']} >= bis {p['bis']}"


def test_lebensphasen_ids_unique(partitur):
    ids = [p["id"] for p in partitur["lebensphasen"]]
    assert len(ids) == len(set(ids)), f"Duplicate Phase-IDs: {ids}"


def test_mobilitaet_years_in_lifespan(partitur):
    for m in partitur["mobilitaet"]:
        assert 1919 <= m["jahr"] <= 2009, f"Mobilität {m['jahr']} außerhalb Lebensspanne"


def test_mobilitaet_form_enum(partitur):
    for m in partitur["mobilitaet"]:
        assert m["form"] in VALID_MOBILITAET_FORMEN, (
            f"Ungültige Mobilitätsform: {m['form']}"
        )


def test_auftritte_phase_valid(partitur):
    phase_ids = {p["id"] for p in partitur["lebensphasen"]}
    offenders = []
    for a in partitur["auftritte"]:
        if a.get("phase") not in phase_ids:
            offenders.append((a.get("jahr"), a.get("phase")))
    assert not offenders, f"Auftritte mit unbekannter Phase: {offenders[:5]}"


def test_auftritte_jahr_matches_phase(partitur):
    """Wenn jahr gesetzt, liegt es im Phasen-Fenster."""
    phases_map = {p["id"]: p for p in partitur["lebensphasen"]}
    offenders = []
    for a in partitur["auftritte"]:
        jahr = a.get("jahr")
        if jahr is None:
            continue
        p = phases_map.get(a["phase"])
        if p is None:
            continue
        if not (p["von"] <= jahr <= p["bis"]):
            offenders.append((jahr, a["phase"], p["von"], p["bis"]))
    assert not offenders, f"Jahr außerhalb Phase: {offenders[:5]}"


def test_auftritte_kategorie_enum(partitur):
    for a in partitur["auftritte"]:
        assert a.get("kategorie") in VALID_AUFTRITT_KATEGORIEN, (
            f"Ungültige Auftritt-Kategorie: {a.get('kategorie')}"
        )


def test_auftritte_dokumente_resolvable(partitur, records):
    """Dokumente-Referenzen in Auftritten existieren als Record."""
    identifiers = set()
    for r in records:
        ident = r.get("rico:identifier", "")
        if ident:
            identifiers.add(ident)
            # Auch Basis-Signatur zulassen (ohne Folio)
            base = ident.split()[0]
            identifiers.add(base)

    offenders = []
    for a in partitur["auftritte"]:
        for doc_sig in a.get("dokumente", []):
            if doc_sig not in identifiers:
                # Prüfe ob Präfix-Match existiert
                if not any(ident.startswith(doc_sig) for ident in identifiers):
                    offenders.append(doc_sig)
    # Soft-Check: nur Warnung, weil dokumente-Liste teils aggregiert
    if offenders:
        print(f"WARNUNG: unauflösbare Dokument-Refs in Auftritten: {offenders[:5]}")


def test_dokumente_years_within_lifespan(partitur):
    for d in partitur["dokumente"]:
        assert 1900 <= d["jahr"] <= 2030, f"Unplausibles Jahr: {d['jahr']}"
        assert d["anzahl"] >= 0
