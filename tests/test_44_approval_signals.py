"""Signalvokabular der Approval-Pruefung: normalisiert und fachlich vollstaendig.

Die Pruefung vergleicht Wikidata-Descriptions gegen eine Liste von Typsignalen.
Beide Seiten muessen im selben String-Raum liegen, sonst faellt eine korrekte
Zuordnung als MISMATCH durch. Der konkrete Anlass: die Umlautentschaerfung
bildet "saenger" auf "sanger" ab, waehrend die Signalliste nur die beiden
Schreibweisen mit Umlaut und mit ae fuehrte. Damit traf das haeufigste
Berufssignal dieses Projekts nie, und die belegte Korrektur des Baritons
Eberhard Waechter wurde zurueckgewiesen.

Der Test laeuft ohne Netzzugriff, er prueft die Signaltabelle und die
Urteilsfunktion gegen festgehaltene Beschreibungen.
"""

import importlib.util
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).parent.parent


@pytest.fixture(scope="module")
def verify_module():
    """Laedt das Skript ueber seinen Pfad, der Dateiname ist kein Modulname."""
    path = REPO_ROOT / "scripts" / "verify-manual-approvals.py"
    spec = importlib.util.spec_from_file_location("verify_manual_approvals", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_signals_live_in_the_normalised_string_space(verify_module):
    """Jedes Signal ueberlebt die Normalisierung unveraendert."""
    normalize = verify_module._normalize
    offenders = {
        etype: [s for s in signals if normalize(s) != s]
        for etype, signals in verify_module.TYPE_SIGNALS.items()
    }
    offenders = {k: v for k, v in offenders.items() if v}
    assert not offenders, (
        f"Signale ausserhalb des normalisierten Raums, sie koennen nie treffen: {offenders}"
    )


def test_singer_description_is_recognised(verify_module):
    """Die haeufigste Berufsangabe des Bestands trifft ein Personensignal."""
    desc = verify_module._normalize("oesterreichischer Saenger und Operndirektor")
    assert any(sig in desc for sig in verify_module.TYPE_SIGNALS["person"])


@pytest.mark.parametrize(
    "etype,description",
    [
        ("person", "deutscher Bassist und Opernsänger"),
        ("person", "Schweizer Bühnenbildner und Theoretiker"),
        ("org", "Opernhaus in Graz"),
        ("org", "US-amerikanisches Musiklabel"),
        ("org", "skandinavische Fluggesellschaft"),
        ("work", "Oratorium von Felix Mendelssohn Bartholdy"),
        ("work", "Passion von Johann Sebastian Bach"),
        ("work", "Messe von Wolfgang Amadeus Mozart"),
    ],
)
def test_domain_descriptions_hit_a_signal(verify_module, etype, description):
    """Fachlich einschlaegige Beschreibungen des Bestands werden erkannt."""
    desc = verify_module._normalize(description)
    assert any(sig in desc for sig in verify_module.TYPE_SIGNALS[etype]), (
        f"Kein Signal fuer {etype!r} in {description!r}"
    )


def test_unrelated_description_stays_unmatched(verify_module):
    """Ein sachfremder Treffer loest kein Typsignal aus, die Pruefung bleibt scharf."""
    desc = verify_module._normalize("U-Boot-Kommandant im Zweiten Weltkrieg")
    assert not any(sig in desc for sig in verify_module.TYPE_SIGNALS["person"])
