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

# Kommentare und Docstrings nennen Wissensdokumente beim Dateinamen, um die
# Herleitung einer Regel adressierbar zu halten. Wird das Dokument umbenannt
# oder aufgeloest, zeigt der Name ins Leere, ohne dass etwas bricht; die
# Herleitung ist dann faktisch verloren.
CODE_ROOTS = ["scripts", "docs", "tests", "vocab"]
CODE_SUFFIXES = {".py", ".js", ".mjs", ".css", ".json", ".ttl", ".html"}
DOC_TOKEN = re.compile(r"\b([a-z0-9][a-z0-9._-]*\.md)\b", re.I)

# Dateinamen, die ein Skript erzeugt statt sie zu zitieren. Der Eintrag nennt
# den Grund, damit die Ausnahme nicht zur stillen Luecke wird.
WRITTEN_NOT_CITED = {
    "backup-log.md": "schreibt scripts/backup.py in das ignorierte data/backup/",
}


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


def test_no_dead_document_references_in_code():
    """Jeder in Code oder Fixture genannte Dokumentname existiert im Repo."""
    existing = {p.name for p in REPO_ROOT.rglob("*.md") if ".git" not in str(p)}
    dead = defaultdict(list)
    for rel in CODE_ROOTS:
        root = REPO_ROOT / rel
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix not in CODE_SUFFIXES:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for lineno, line in enumerate(text.splitlines(), start=1):
                for name in DOC_TOKEN.findall(line):
                    if name in existing or name in WRITTEN_NOT_CITED:
                        continue
                    dead[name].append(f"{path.relative_to(REPO_ROOT)}:{lineno}")
    assert not dead, (
        "Dokumentnamen in Code ohne existierende Datei. Die zitierte Herleitung "
        f"ist damit unerreichbar: {dict(sorted(dead.items()))}"
    )


# Verweise der Form "<dokument>.md Paragraph 10" adressieren einen Abschnitt in einem
# Wissensdokument. Wird der Abschnitt in ein anderes Dokument verschoben oder
# umnummeriert, zeigt der Verweis auf einen Abschnitt, den es dort nicht gibt.
# Der Dateiname existiert weiterhin, der vorige Test greift also nicht.
SECTION_REF = re.compile(r"\b([a-z0-9][a-z0-9._-]*\.md)\s*§\s*(\d{1,2})\b", re.I)


def _sections_by_document():
    """Dateiname -> Menge der Abschnittsnummern, die das Dokument fuehrt."""
    found = defaultdict(set)
    for path in KNOWLEDGE.rglob("*.md"):
        for line in path.read_text(encoding="utf-8").splitlines():
            match = re.match(r"^#{2,3}\s+(\d{1,2})\.\s", line)
            if match:
                found[path.name].add(int(match.group(1)))
    return found


def test_section_references_resolve():
    """Jeder Verweis auf einen nummerierten Abschnitt trifft ihn im genannten Dokument."""
    sections = _sections_by_document()
    if not sections:
        pytest.skip("Kein Wissensdokument fuehrt nummerierte Abschnitte")
    wrong = defaultdict(list)
    roots = [REPO_ROOT / r for r in CODE_ROOTS] + [KNOWLEDGE]
    files = [REPO_ROOT / f for f in CITATION_FILES if (REPO_ROOT / f).exists()]
    for root in roots:
        if root.exists():
            files.extend(
                p for p in root.rglob("*")
                if p.is_file() and p.suffix in CODE_SUFFIXES | {".md"}
            )
    for path in sorted(set(files)):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            for doc, number in SECTION_REF.findall(line):
                if doc not in sections:
                    continue
                if int(number) not in sections[doc]:
                    wrong[f"{doc} § {number}"].append(
                        f"{path.relative_to(REPO_ROOT)}:{lineno}"
                    )
    assert not wrong, (
        "Abschnittsverweise, die im genannten Dokument nicht existieren: "
        f"{ {k: v[:3] for k, v in sorted(wrong.items())} }"
    )
