"""Lesestellen der Auswertungsskripte gegen den erzeugten Datensatz.

Der stille Defekt, gegen den diese Datei steht: eine Modellentscheidung loest
eine Property ab, ein lesendes Skript behaelt sie, bekommt nichts zurueck und
meldet nichts. Aufgefallen ist das mit E-96, als die Auswertung der
Buehnenrollen still leere Listen lieferte.

Der erste Test haelt jeden Vokabular-Term, den ein auswertendes Skript als
String-Literal aus dem Graph liest, gegen die Terme, die der Datensatz
tatsaechlich fuehrt. Die beiden uebrigen sichern die Auffuehrungszaehlung und
die Verknuepfungspruefung des Datenaudits.

Die Tests zu den vorverdichteten Derivaten sind mit deren Stilllegung
entfallen; ihr Gegenstand existiert nicht mehr.
"""

from __future__ import annotations

import ast
import importlib.util
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
SCRIPTS = REPO_ROOT / "scripts"

# Skripte, die den erzeugten Graphen auswerten. build-views.py steht nicht
# mehr darin, es kopiert nur noch und liest keinen Term.
GRAPH_READING_SCRIPTS = (
    SCRIPTS / "audit-data.py",
    SCRIPTS / "report-quality.py",
    SCRIPTS / "scout-coverage.py",
)

# Prefixed terms of the modelling vocabularies the two scripts read from the
# graph. Aliases from @context (name, role, komponist) carry no prefix and are
# out of reach for a purely lexical scan.
TERM_PATTERN = re.compile(r"(?:m3gim(?:-[a-z]+)?|rico|ric-rst):[A-Za-z_][A-Za-z0-9_]*")


def _load_script(module_name: str, filename: str):
    """Laedt ein scripts/-Modul; der Bindestrich im Dateinamen verbietet den Import."""
    if str(SCRIPTS) not in sys.path:
        sys.path.insert(0, str(SCRIPTS))
    spec = importlib.util.spec_from_file_location(module_name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


audit_data = _load_script("audit_data", "audit-data.py")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def stage_role_labels(graph) -> set:
    return {
        n["rico:name"]
        for n in graph
        if n.get("@type") == "m3gim-ontology:StageRole" and n.get("rico:name")
    }


# ---------------------------------------------------------------------------
# Regressionswaechter: kein Skript liest einen abgeloesten Term
# ---------------------------------------------------------------------------


_DOCSTRING_OWNERS = (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)


def _terms_in_string_literals(path: Path) -> set:
    """Vokabular-Terme aus den ausgewerteten String-Literalen einer Python-Datei.

    Ueber den AST statt ueber den Rohtext, damit Kommentare und Docstrings nicht
    mitzaehlen: dort wird eine Abloesung gerade dokumentiert, gelesen wird sie
    nur ueber ein String-Literal im ausgefuehrten Code.
    """
    tree = ast.parse(path.read_text(encoding="utf-8"))
    docstrings = set()
    for node in ast.walk(tree):
        if not isinstance(node, _DOCSTRING_OWNERS):
            continue
        body = getattr(node, "body", None)
        if not body:
            continue
        first = body[0]
        if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) \
                and isinstance(first.value.value, str):
            docstrings.add(id(first.value))

    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) \
                and id(node) not in docstrings:
            found.update(TERM_PATTERN.findall(node.value))
    return found


def _terms_in_dataset(jsonld: dict) -> set:
    found = set()

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                found.update(TERM_PATTERN.findall(key))
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)
        elif isinstance(node, str):
            found.update(TERM_PATTERN.findall(node))

    walk(jsonld)
    return found


def test_view_scripts_read_only_terms_the_dataset_carries(jsonld):
    """Jeder gelesene Vokabular-Term kommt im Datensatz vor.

    Der stille Defekt: eine Modellentscheidung loest eine Property ab, das
    lesende Skript behaelt sie, bekommt nichts zurueck und meldet nichts.
    """
    present = _terms_in_dataset(jsonld)
    offenders = {}
    for script in GRAPH_READING_SCRIPTS:
        used = _terms_in_string_literals(script)
        assert len(used) >= 5, f"{script.name}: Term-Scan greift nicht ({used})"
        missing = sorted(used - present)
        if missing:
            offenders[script.name] = missing
    assert not offenders, (
        f"Skripte lesen im Datensatz nicht vorhandene Terme: {offenders}. "
        "Entweder ist eine Property abgeloest worden (dann Lesestelle nachziehen) "
        "oder die Pipeline emittiert sie nicht mehr."
    )


# ---------------------------------------------------------------------------
# audit-data.py: Auffuehrungszaehlung und Verknuepfungspruefung
# ---------------------------------------------------------------------------


def test_audit_counts_performance_links(capsys, xlsx_verknuepfungen, graph):
    """Audit 2 zaehlt die record-seitigen Auffuehrungsverweise, nicht null."""
    audit_data.audit_verknuepfungen(xlsx_verknuepfungen, graph)
    out = capsys.readouterr().out
    match = re.search(r"Performances[^:\n]*:\s*(\d+)", out)
    assert match, f"Keine Performance-Zeile im Auditbericht:\n{out[-800:]}"
    assert int(match.group(1)) >= 100, (
        f"Audit meldet {match.group(1)} Auffuehrungsverweise — Zaehlung greift ins Leere."
    )


def test_audit_link_check_follows_performance():
    """Ein Record, der nur eine Auffuehrung traegt, gilt als verknuepft."""
    assert audit_data.has_links({"m3gim-ontology:hasPerformance": [{"@id": "m3gim-data:perf_x_1"}]})
    assert not audit_data.has_links({"m3gim-ontology:hasPerformanceRole": [{"name": "Fricka"}]})
    assert not audit_data.has_links({})
