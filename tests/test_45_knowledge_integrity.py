"""Verweis- und Linkintegritaet der Wissensbasis.

Die Wissensbasis traegt zwei Zitiersysteme, die aus Code, Tests, Vokabular und
Action-Layer heraus angesprochen werden. E-Nummern benennen Architektur- und
Modellentscheidungen, AF- und QF-Nummern benennen Abgleich- und Quellfehler.
Beide Systeme haelt heute je ein einzelnes Dokument. Sobald ein Umbau die
Definitionen nach Gegenstand verteilt, kann eine Nummer unbemerkt verschwinden
oder doppelt entstehen, und das Zitat im Code zeigt danach ins Leere, ohne dass
etwas bricht.

Dieser Test ist die Schranke dagegen. Er bindet nicht an ein bestimmtes
Dokument, sondern verlangt, dass jede zitierte Nummer irgendwo in `knowledge/`
genau eine Definition hat. Damit ueberlebt er die Verteilung der Register.

Der zweite Teil sichert die relativen Markdown-Links der Wissensbasis und des
Action-Layers. Eine Umbenennung oder Loeschung bricht sie sonst lautlos.
"""

import re
from collections import defaultdict
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).parent.parent
KNOWLEDGE = REPO_ROOT / "knowledge"

# Wo zitiert werden darf. Die Ordner decken Pipeline, Frontend, Tests,
# Vokabular und die beiden Steuerdokumente ab.
CITATION_ROOTS = ["scripts", "docs/js", "tests", "vocab", "knowledge"]
CITATION_FILES = ["CLAUDE.md", "README.md"]
CITATION_SUFFIXES = {".py", ".js", ".mjs", ".md", ".ttl", ".html"}

CITATION = re.compile(r"\b(E|AF|QF)-(\d{1,3})\b")

# Eine Definition steht als Tabellenzeile oder als Ueberschrift. Der fette
# Absatzkopf zaehlt nicht mit, sonst gilt jeder Journaleintrag der Form
# "**E-106 - ...**" als zweite Adresse derselben Nummer. Durchgestrichene
# Eintraege zaehlen mit, sie sind revidierte Entscheidungen und bleiben die
# Adresse ihrer Nummer.
DEFINITION = re.compile(
    r"^(?:\|\s*(?:~~)?|#{1,6}\s+(?:~~)?)(E|AF|QF)-(\d{1,3})\b"
)

# Nummern, die zitiert werden, ohne je vergeben worden zu sein. Der Eintrag
# haelt den Grund fest, damit die Ausnahme nicht zur stillen Luecke wird.
NEVER_ASSIGNED = {
    "E-167": "von einer Order genannt, nie vergeben; fortlaufend wurde E-117 gesetzt",
}

MD_LINK = re.compile(r"\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)")


def _citation_files():
    seen = []
    for rel in CITATION_ROOTS:
        root = REPO_ROOT / rel
        if not root.exists():
            continue
        seen.extend(
            p for p in root.rglob("*")
            if p.is_file() and p.suffix in CITATION_SUFFIXES
        )
    seen.extend((REPO_ROOT / f) for f in CITATION_FILES if (REPO_ROOT / f).exists())
    return seen


def _definitions():
    """Nummer -> Liste der Fundstellen, gesammelt ueber die ganze Wissensbasis."""
    found = defaultdict(list)
    for path in sorted(KNOWLEDGE.rglob("*.md")):
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            match = DEFINITION.match(line.strip())
            if match:
                key = f"{match.group(1)}-{int(match.group(2)):02d}"
                found[key].append(f"{path.relative_to(REPO_ROOT)}:{lineno}")
    return found


def _citations():
    """Nummer -> Menge der zitierenden Dateien."""
    found = defaultdict(set)
    for path in _citation_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for match in CITATION.finditer(text):
            key = f"{match.group(1)}-{int(match.group(2)):02d}"
            found[key].add(str(path.relative_to(REPO_ROOT)))
    return found


@pytest.fixture(scope="module")
def registry():
    return _definitions(), _citations()


def test_every_citation_resolves(registry):
    """Keine zitierte Nummer ohne Definition in der Wissensbasis."""
    definitions, citations = registry
    dangling = {
        key: sorted(files)[:4]
        for key, files in sorted(citations.items())
        if key not in definitions and key not in NEVER_ASSIGNED
    }
    assert not dangling, (
        "Zitierte Kennungen ohne Definition in knowledge/. "
        f"Ohne Adresse zeigt das Zitat ins Leere: {dangling}"
    )


def test_no_number_defined_twice(registry):
    """Jede Nummer hat genau eine Adresse, auch nach Verteilung der Register."""
    definitions, _ = registry
    doubled = {
        key: places for key, places in sorted(definitions.items()) if len(places) > 1
    }
    assert not doubled, (
        "Kennungen mit mehr als einer Definition. Eine Nummer muss genau eine "
        f"Adresse haben, sonst driften die Fassungen auseinander: {doubled}"
    )


def test_relative_markdown_links_resolve():
    """Jeder relative Link in knowledge/ und CLAUDE.md zeigt auf eine Datei."""
    broken = []
    targets = list(KNOWLEDGE.rglob("*.md"))
    claude = REPO_ROOT / "CLAUDE.md"
    if claude.exists():
        targets.append(claude)
    for path in sorted(targets):
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            for target in MD_LINK.findall(line):
                if target.startswith(("http://", "https://", "mailto:")):
                    continue
                if not (path.parent / target).resolve().exists():
                    broken.append(
                        f"{path.relative_to(REPO_ROOT)}:{lineno} -> {target}"
                    )
    assert not broken, f"Relative Links ohne Ziel: {broken}"
