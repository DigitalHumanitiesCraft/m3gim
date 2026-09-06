"""Der Erschliessungsreport als die eine Adresse des Erschliessungsteams.

``scripts/report-cataloguing.py`` (E-248) fuehrt die Arbeitsliste. Zwei
Befundklassen erreichten sie zunaechst nicht: die als bearbeitet gefuehrten
Objekte ohne Verknuepfung, die nur in der Fehlermeldung von
``tests/test_61_orphan_links.py`` standen, und die ERROR-Befunde der
Validierung, die nur im Validierungsreport stehen. Dieser Test haelt beide
Wege offen: den Abschnitt, der die Waisen selbst fuehrt, und den Zeiger auf
den Nachbarreport mit seinem Abschnittsnamen.

Invariante, kein Datenspiegel: er behauptet nichts ueber die Sauberkeit der
Quelle, sondern nur, dass der Report zeigt, was die Regeln finden.
"""

import importlib.util
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
REPORT_SCRIPT = REPO_ROOT / "scripts" / "report-cataloguing.py"

# Untergrenze der Waisen am Datenstand vom 2026-09-05 (gemessen: 26). Sie
# haelt den Test davon ab, mit einer stillgelegten Regel trivial zu bestehen.
# Schliesst die Erfassung die Faelle, wird die Zahl bewusst gesenkt.
MIN_WAISEN = 20

# Zeile der Waisentabelle: "| Signatur | Stand | Titel | Quellzeile |".
TABLE_ROW = re.compile(r"^\| (?P<signatur>[^|]+?) \| (?P<stand>[^|]+?) \| ")


def _report_module():
    if "report_cataloguing" in sys.modules:
        return sys.modules["report_cataloguing"]
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    spec = importlib.util.spec_from_file_location(
        "report_cataloguing", REPORT_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules["report_cataloguing"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def report():
    return _report_module()


@pytest.fixture(scope="module")
def rendered(report, graph) -> str:
    """Der vollstaendige Report auf dem ausgelieferten Datensatz.

    Erzeugt, nicht von der Platte gelesen: die Datei ist nicht versioniert und
    kann aus einem aelteren Lauf stammen.
    """
    records = [
        n for n in graph
        if isinstance(n, dict) and n.get("@type") == "rico:Record"
        and not str(n.get("@id", "")).endswith("_Folio")
    ]
    return report.build_report(records)


def _section(text: str, heading: str) -> str:
    body = text.split(f"\n## {heading}\n", 1)
    assert len(body) == 2, f"Abschnitt '{heading}' fehlt im Report"
    return body[1].split("\n## ", 1)[0]


def test_orphan_section_lists_exactly_the_rule_findings(report, rendered, graph):
    """Der Abschnitt fuehrt genau die Objekte, die die geteilte Regel findet."""
    erwartet = report.worked_on_without_link(graph)
    assert len(erwartet) >= MIN_WAISEN, (
        f"Nur {len(erwartet)} Waisen gefunden, erwartet mindestens "
        f"{MIN_WAISEN}. Entweder hat die Erfassung die Faelle geschlossen "
        "(dann MIN_WAISEN senken) oder die Regel greift nicht mehr."
    )

    section = _section(rendered, "Bearbeitet, aber ohne Verknüpfung")
    zeilen = [m for line in section.splitlines()
              if (m := TABLE_ROW.match(line)) and m["signatur"] != "Signatur"]

    assert [m["signatur"] for m in zeilen] == [f["signatur"] for f in erwartet]
    assert str(len(erwartet)) in section, "Die Gesamtzahl fehlt im Fliesstext"
    # Der Bearbeitungsstand steht mit in der Tabelle, er ist der Grund des
    # Befunds und entscheidet, ob nachzutragen oder zurueckzustellen ist.
    assert {f["stand"] for f in erwartet} <= {m["stand"] for m in zeilen}


def test_orphan_rule_is_the_one_the_datenspiegel_uses():
    """test_61 rechnet nicht selbst, sondern fragt den Report."""
    source = (REPO_ROOT / "tests" / "test_61_orphan_links.py").read_text(
        encoding="utf-8")
    assert "worked_on_without_link" in source
    assert "report-cataloguing.py" in source or "report_cataloguing" in source


def test_validation_findings_reach_the_report(report, rendered):
    """Die ERROR-Befunde der Validierung sind im Report adressiert."""
    section = _section(rendered, "Quellfehler der Validierung")
    pfad = report.rel_to_repo(report.VALIDATION_REPORT)

    if not report.VALIDATION_REPORT.exists():
        assert pfad in section and "validate.py" in section
        return

    assert pfad in section, "Der Zeiger auf den Validierungsreport fehlt"
    val = report.validation_error_classes()
    if not val["klassen"]:
        # Entweder wirklich fehlerfrei oder Formdrift; beides steht im Text.
        assert "keine Fehler" in section or "nicht liest" in section
        return
    assert report.VALIDATION_ERROR_SECTION in section, (
        "Der Zeiger nennt den Abschnitt des Nachbarreports nicht")
    assert str(val["gesamt"]) in section
    for row in val["klassen"]:
        assert f"| {row['code']} | {row['tabelle']} |" in section, (
            f"Fehlerklasse {row['code']}/{row['tabelle']} fehlt")


def test_report_is_deterministic(report, rendered, graph):
    """Zwei Laeufe auf demselben Datensatz liefern denselben Text.

    Nur die Laufzeitzeile darf sich unterscheiden; ein wandernder Report
    liesse das Erschliessungsteam Diffs lesen, die keine Befunde sind.
    """
    records = [
        n for n in graph
        if isinstance(n, dict) and n.get("@type") == "rico:Record"
        and not str(n.get("@id", "")).endswith("_Folio")
    ]
    zweiter = report.build_report(records)

    def ohne_laufzeit(text: str) -> list:
        return [ln for ln in text.splitlines()
                if not ln.startswith("_Laufzeit des Reports:")]

    assert ohne_laufzeit(rendered) == ohne_laufzeit(zweiter)


def test_env_overrides_reach_the_report_paths(report):
    """Report und Validierungsreport liegen unter M3GIM_REPORTS_DIR."""
    from _common import REPORTS_DIR  # noqa: WPS433

    assert report.OUTPUT.parent == REPORTS_DIR
    assert report.VALIDATION_REPORT.parent == REPORTS_DIR
