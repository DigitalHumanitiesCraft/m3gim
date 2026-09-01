"""Read sites of the evaluation scripts against the generated dataset.

The silent defect this file guards against: a modelling decision retires a
property, a reading script keeps it, gets nothing back and reports nothing. This
surfaced with E-96, when the evaluation of the stage roles silently returned
empty lists.

The first test holds every vocabulary term a reading script reads from the graph
as a string literal against the terms the dataset actually carries. The other
two secure the performance count and the Verknuepfungen check of the data audit.

The tests for the pre-condensed derivatives fell away with their retirement;
their subject no longer exists.
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

# Scripts that evaluate the generated graph. build-views.py is no longer among
# them, it only copies and reads no term.
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
    """Loads a scripts/ module; the hyphen in the filename forbids a plain import."""
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
# Regression guard: no script reads a retired term
# ---------------------------------------------------------------------------


_DOCSTRING_OWNERS = (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)


def _terms_in_string_literals(path: Path) -> set:
    """Vocabulary terms from the evaluated string literals of a Python file.

    Via the AST rather than the raw text, so comments and docstrings do not
    count, since that is exactly where a retirement gets documented, while it is
    read only via a string literal in the executed code.
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
    """Every read vocabulary term occurs in the dataset.

    The silent defect: a modelling decision retires a property, the reading
    script keeps it, gets nothing back and reports nothing.
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
# audit-data.py: performance count and Verknuepfungen check
# ---------------------------------------------------------------------------


def test_audit_counts_performance_links(capsys, xlsx_verknuepfungen, graph):
    """Audit 2 counts the record-side performance references, not zero."""
    audit_data.audit_verknuepfungen(xlsx_verknuepfungen, graph)
    out = capsys.readouterr().out
    match = re.search(r"Performances[^:\n]*:\s*(\d+)", out)
    assert match, f"Keine Performance-Zeile im Auditbericht:\n{out[-800:]}"
    assert int(match.group(1)) >= 100, (
        f"Audit meldet {match.group(1)} Auffuehrungsverweise — Zaehlung greift ins Leere."
    )


def test_audit_link_check_follows_performance():
    """A record that carries only a performance counts as linked."""
    assert audit_data.has_links({"m3gim-ontology:hasPerformance": [{"@id": "m3gim-data:perf_x_1"}]})
    assert not audit_data.has_links({"m3gim-ontology:hasPerformanceRole": [{"name": "Fricka"}]})
    assert not audit_data.has_links({})
