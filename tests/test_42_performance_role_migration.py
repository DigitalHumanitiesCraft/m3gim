"""E-96-Nachzug in Ansichtserzeugung und Datenaudit.

``scripts/build-views.py`` und ``scripts/audit-data.py`` lasen die mit E-96
abgeloeste Property ``m3gim:hasPerformanceRole``. Sie kommt im erzeugten
Datensatz kein einziges Mal vor, weshalb die Lesestellen still leere Listen
lieferten, ohne einen Fehler zu melden: Auftritts-Partien, Gattungserkennung
und Rollenzaehlung im Kosmos blieben leer.

Das heutige Modell fuehrt Auffuehrungsknoten ``m3gim:Performance``, die ueber
``m3gim:hasStageRole`` auf ``m3gim:StageRole`` zeigen; der Record verweist
ueber ``m3gim:hasPerformance`` auf die Auffuehrung (data.md § 4/§ 7).

Zwei Absicherungen:

1. Die betroffenen Auswertungen tragen wieder Daten, mit Mindestvorkommen
   statt "leere Liste ist ok".
2. Eine erneute Abloesung dieser Art faellt auf: jeder Vokabular-Term, den die
   beiden Skripte als String-Literal aus dem Graph lesen, muss im Datensatz
   vorkommen.
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

VIEW_SCRIPTS = (SCRIPTS / "build-views.py", SCRIPTS / "audit-data.py")

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


build_views = _load_script("build_views", "build-views.py")
audit_data = _load_script("audit_data", "audit-data.py")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def auftritte(graph):
    return build_views.extract_auftritte(graph)


@pytest.fixture(scope="module")
def kosmos(graph):
    return build_views.build_kosmos(graph)


@pytest.fixture(scope="module")
def stage_role_labels(graph) -> set:
    return {
        n["rico:name"]
        for n in graph
        if n.get("@type") == "m3gim:StageRole" and n.get("rico:name")
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
    for script in VIEW_SCRIPTS:
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
# build-views.py: Partie, Gattung, Rollenzaehlung
# ---------------------------------------------------------------------------


def test_auftritte_carry_stage_role(auftritte, stage_role_labels):
    """Die Partie am Auftritt ist besetzt und stammt aus dem StageRole-Bestand.

    Die Schwelle ist niedrig, weil nur eindeutige Records eine Partie liefern
    (siehe test_auftritt_rolle_only_from_unambiguous_record). Sie sichert allein,
    dass der Zugriff ueber m3gim:hasPerformance ueberhaupt traegt.
    """
    mit_rolle = [a for a in auftritte if a.get("rolle")]
    assert len(mit_rolle) >= 8, (
        f"Nur {len(mit_rolle)} von {len(auftritte)} Auftritten tragen eine Partie "
        "— die Buehnenrollen erreichen die Ansicht nicht."
    )
    unknown = sorted({a["rolle"] for a in mit_rolle if a["rolle"] not in stage_role_labels})
    assert not unknown, f"Partien ohne StageRole-Entsprechung im Graph: {unknown[:5]}"


def test_auftritt_rolle_only_from_unambiguous_record(graph, records):
    """Nennt ein Record mehrere Partien, wird keine als die der Nachlassbildnerin ausgewiesen.

    Seit E-96 fehlt der Rollenqualifikator, der die Partie der Nachlassbildnerin
    kenntlich machte. Die erste Partie eines Besetzungszettels zu waehlen erzeugt
    Zuschreibungen ausserhalb ihres Stimmfachs, etwa Hans Sachs oder Tristan.
    """
    perf_index = build_views.build_performance_index(graph)
    for record in records:
        names = build_views.stage_role_names(record, perf_index)
        if len(names) > 1:
            assert build_views._extract_rolle_from_record(record, perf_index) is None, (
                f"{record.get('rico:identifier')} nennt {len(names)} Partien und weist "
                "trotzdem eine als Partie des Auftritts aus."
            )


def test_auftritte_with_stage_role_are_opera(auftritte):
    """Eine besetzte Partie zieht die Gattung oper nach sich (has_character_role)."""
    mit_rolle = [a for a in auftritte if a.get("rolle")]
    assert mit_rolle, "Keine Auftritte mit Partie — Vorbedingung verletzt"
    offenders = [(a["rolle"], a.get("gattung")) for a in mit_rolle if a.get("gattung") != "oper"]
    assert not offenders, f"Auftritte mit Partie ohne Gattung oper: {offenders[:5]}"


def test_records_with_named_stage_role_are_opera(graph, records):
    """Auch ohne Opern-Stichwort im Titel gilt ein Record mit benannter Partie als Oper.

    Prueft die Lesestelle in _extract_werk_from_record direkt: ohne den Zugriff
    ueber m3gim:hasPerformance faellt die Gattung auf konzert oder None zurueck.
    """
    perf_index = build_views.build_performance_index(graph)
    candidates = [
        r
        for r in records
        if any(
            name and name not in ("Alt Solo",)
            for name in build_views.stage_role_names(r, perf_index)
        )
        and not any(
            kw in (r.get("rico:title") or "").lower() for kw in build_views.OPER_KEYWORDS
        )
    ]
    assert len(candidates) >= 20, (
        f"Nur {len(candidates)} Records mit benannter Partie ohne Opern-Stichwort "
        "— Vorbedingung des Tests verletzt"
    )
    offenders = [
        r.get("rico:identifier")
        for r in candidates
        if build_views._extract_werk_from_record(r, perf_index)[2] != "oper"
    ]
    assert not offenders, f"Records mit Partie, aber Gattung != oper: {offenders[:5]}"


def test_kosmos_werke_carry_stage_roles(kosmos, stage_role_labels):
    """Die Rollenzaehlung je Werk im Kosmos ist wieder besetzt."""
    werke = [w for k in kosmos.get("komponisten", []) for w in k.get("werke", [])]
    assert werke, "Kosmos ohne Werke — Vorbedingung verletzt"
    mit_rollen = [w for w in werke if w.get("rollen")]
    assert len(mit_rollen) >= 10, (
        f"Nur {len(mit_rollen)} von {len(werke)} Werken tragen Rollen "
        "— die Buehnenrollen erreichen den Kosmos nicht."
    )
    labels = {r["name"] for w in mit_rollen for r in w["rollen"]}
    unknown = sorted(labels - stage_role_labels)
    assert not unknown, f"Kosmos-Rollen ohne StageRole-Entsprechung: {unknown[:5]}"


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
    assert audit_data.has_links({"m3gim:hasPerformance": [{"@id": "m3gim:perf_x_1"}]})
    assert not audit_data.has_links({"m3gim:hasPerformanceRole": [{"name": "Fricka"}]})
    assert not audit_data.has_links({})
