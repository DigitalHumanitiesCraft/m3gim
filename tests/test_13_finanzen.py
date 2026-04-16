"""Finanzschicht-Invarianten (data.md Abschnitt 11).

DetailAnnotation-Instanzen mit m3gim:detailField in {ausgaben, einnahmen, summe}
haben monetaryAmount (xsd:decimal) wenn parsbar, und einen Waehrungscode aus
dem belegten Set. Fehlende Werte sind ok (erwaehnt-Rolle, Freitext).
"""

from _helpers import ensure_list

FINANCE_FIELDS = {"ausgaben", "einnahmen", "summe"}

# Im aktuellen Datenbestand belegt (data.md Abschnitt 11).
# RM=Reichsmark, DM=Deutsche Mark, ATS/S=Oesterr. Schilling, CHF, FRF (Fr),
# ESC (portugiesischer Escudo, 'Esc'), USD.
ALLOWED_CURRENCIES = {
    "RM", "DM", "ATS", "S", "CHF", "FRF", "Fr", "ESC", "Esc", "USD",
}


def iter_finance_details(records):
    for r in records:
        for det in ensure_list(r.get("m3gim:hasDetail")):
            if not isinstance(det, dict):
                continue
            if det.get("m3gim:detailField") in FINANCE_FIELDS:
                yield r["@id"], det


def test_finance_detail_has_structure(records):
    """Jede Finanz-DetailAnnotation hat @type und detailField."""
    for rid, det in iter_finance_details(records):
        assert det.get("@type") == "m3gim:DetailAnnotation", (
            f"{rid}: Finanz-Detail ohne korrekten @type"
        )
        assert det.get("m3gim:detailField") in FINANCE_FIELDS, (
            f"{rid}: Finanz-Detail mit ungueltigem Feld"
        )


def test_finance_amount_is_decimal_when_present(records):
    """monetaryAmount, wenn vorhanden, ist als xsd:decimal typisiert und
    numerisch parsbar."""
    for rid, det in iter_finance_details(records):
        amount = det.get("m3gim:monetaryAmount")
        if amount is None:
            continue
        assert isinstance(amount, dict), f"{rid}: monetaryAmount ist kein Typed-Literal"
        assert amount.get("@type") == "xsd:decimal", (
            f"{rid}: monetaryAmount hat falschen xsd-Typ: {amount}"
        )
        try:
            float(amount.get("@value"))
        except (TypeError, ValueError):
            assert False, f"{rid}: monetaryAmount nicht numerisch: {amount}"


def test_finance_currency_in_known_set(records):
    """Waehrungscode, wenn vorhanden, gehoert zum belegten Vokabular.
    Unbekannte Codes flaggen als Warnung (neue Waehrung im Datenbestand)."""
    unknown = []
    for rid, det in iter_finance_details(records):
        currency = det.get("m3gim:currency")
        if currency and currency not in ALLOWED_CURRENCIES:
            unknown.append((rid, currency))
    assert not unknown, (
        f"Unbekannte Waehrungscodes (data.md § 11 erweitern oder Eintrag korrigieren): "
        f"{unknown[:5]}"
    )
