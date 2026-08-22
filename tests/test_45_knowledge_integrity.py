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
    "validation-report.md": "schreibt scripts/validate.py in das ignorierte data/reports/",
    "exploration-report.md": "schreibt scripts/explore.py in das ignorierte data/reports/",
    "link-proposals.md": "schreibt scripts/propose-links.py in das ignorierte data/reports/",
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
# Die zusammengesetzte Form "Paragraph 4 und 7" nennt zwei Abschnitte in
# einem Verweis. Ohne die Fortsetzung wird nur der erste geprueft, und der
# zweite kann unbemerkt ins Leere zeigen.
SECTION_REF = re.compile(
    r"\b([a-z0-9][a-z0-9._-]*\.md)[)\]`]*\s*§+\s*(\d{1,2})"
    r"((?:\s*(?:,|und|and|bis)\s*\d{1,2})*)",
    re.I,
)


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
            for doc, first, more in SECTION_REF.findall(line):
                if doc not in sections:
                    continue
                numbers = [int(first)] + [int(n) for n in re.findall(r"\d{1,2}", more)]
                for number in numbers:
                    if number not in sections[doc]:
                        wrong[f"{doc} § {number}"].append(
                            f"{path.relative_to(REPO_ROOT)}:{lineno}"
                        )
    assert not wrong, (
        "Abschnittsverweise, die im genannten Dokument nicht existieren: "
        f"{ {k: v[:3] for k, v in sorted(wrong.items())} }"
    )


def test_written_not_cited_entries_stay_honest():
    """Jede Ausnahme der Erzeugt-statt-zitiert-Liste ist noch begruendet.

    Die Liste entschaerft den Totverweis-Waechter. Zwei Wege machen sie
    unehrlich. Ein Eintrag wird stehen gelassen, obwohl kein Skript den Namen
    mehr schreibt, dann traegt die Liste eine Ausnahme ohne Gegenstand. Oder
    ein Name wird eingetragen, den ein Wissensdokument sehr wohl zitiert, dann
    verdeckt die Ausnahme genau den toten Verweis, den der Waechter meldet.
    """
    written = defaultdict(list)
    for path in sorted((REPO_ROOT / "scripts").rglob("*.py")):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for name in WRITTEN_NOT_CITED:
            if name in text:
                written[name].append(path.name)

    stale = sorted(name for name in WRITTEN_NOT_CITED if name not in written)
    assert not stale, (
        "Ausnahmen ohne schreibendes Skript. Der Eintrag ist zu entfernen, "
        f"sonst deckt er kuenftig einen echten Totverweis: {stale}"
    )

    linked = defaultdict(list)
    for path in sorted((REPO_ROOT / "knowledge").rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        for lineno, line in enumerate(text.splitlines(), start=1):
            for target in MD_LINK.findall(line):
                name = target.rsplit("/", 1)[-1]
                if name in WRITTEN_NOT_CITED:
                    linked[name].append(f"{path.name}:{lineno}")
    assert not linked, (
        "Ein Wissensdokument verlinkt einen als erzeugt gefuehrten Namen. Der "
        "Link zeigt ins Leere, und die Ausnahme verdeckt ihn: "
        f"{dict(sorted(linked.items()))}"
    )


# Vokabularnamen, wie die Wissensbasis sie schreibt, in Backticks und mit
# einem der m3gim-Praefixe.
VOCAB_TERM = re.compile(r"`(m3gim[a-z-]*:[A-Za-z_][A-Za-z0-9_]*)`")

# Dokumente, die festhalten, was einmal entschieden oder getan wurde. Ihre
# Terme tragen die Namen ihrer Zeit; ein Nachzug wuerde den Datensatz der
# Entscheidung verfaelschen.
HISTORICAL_DOCS = {"architecture-decisions.md", "journal.md"}

# Kanalnamen der DOM-CustomEvents. Sie sehen wie ein Vokabularterm aus und
# sind keiner; ihre Definition steht in docs/js/ui/.
EVENT_CHANNELS = {
    "m3gim:navigate": "Navigationskanal in docs/js/ui/events.js",
    "m3gim:filter": "Filterkanal in docs/js/ui/filter-state.js",
    "m3gim:archiv-filter": "Bestandsfilter-Kanal in docs/js/ui/events.js",
}

# Marke fuer Passagen, die absichtlich Namen ausserhalb des heutigen
# Vokabulars fuehren, also Entfallenes und beschlossene Zielzustaende. Sie
# nennt ihren Grund im Dokument, statt ihn in eine Liste im Testcode
# auszulagern, und kennt zwei Reichweiten. Allein auf einer Zeile gilt sie bis
# zur naechsten Ueberschrift, an eine Textzeile angehaengt nur fuer diese.
VOCAB_EXEMPT = re.compile(r"<!--\s*vocab-exempt:\s*(.+?)\s*-->")
HEADING = re.compile(r"^#{1,6}\s")


# Das Vokabular fuehrt die entschiedenen, aber noch nicht angelegten Terme
# des Zielmodells in einer redaktionellen Notiz. Sie ist damit deren einzige
# Adresse, und die Wissensbasis darf sie nennen, solange sie dort steht.
TARGET_REGISTER = re.compile(r"Nicht aufgenommen sind.*?\(([^)]*)\)", re.S)


def _target_terms() -> set:
    ttl = (REPO_ROOT / "vocab" / "m3gim.ttl").read_text(encoding="utf-8")
    match = TARGET_REGISTER.search(ttl)
    if not match:
        return set()
    return {
        f"m3gim-ontology:{name.strip()}"
        for name in match.group(1).split(",")
        if name.strip()
    }


def _declared_terms() -> set:
    ttl = (REPO_ROOT / "vocab" / "m3gim.ttl").read_text(encoding="utf-8")
    return set(re.findall(r"^(m3gim[a-z-]*:[A-Za-z_][A-Za-z0-9_]*)\s", ttl, re.M))


def test_knowledge_names_only_declared_vocabulary():
    """Jeder Vokabularname der Wissensbasis existiert im Vokabular.

    Der Modellumbau hat Vokabular, Pipeline, Datensatz, Tests und Frontend
    gezogen. Die beschreibenden Dokumente sind stellenweise zurueckgeblieben,
    und nichts hat es gemeldet, weil der Abdeckungspruefer den Datensatz gegen
    das Vokabular haelt und die Wissensbasis in keiner Richtung vorkommt. Ein
    Dokument, das heutiges Verhalten unter einem abgeschafften Namen
    beschreibt, ist schlimmer als eine Luecke, weil es gelesen und geglaubt
    wird.

    Ausgenommen sind die historischen Dokumente, die Instanz-IDs des
    Datennamensraums, die DOM-Kanalnamen und jede Passage, die mit der Marke
    ``<!-- vocab-exempt: Grund -->`` ausdruecklich Entfallenes oder einen
    beschlossenen Zielzustand fuehrt.
    """
    declared = _declared_terms()
    assert len(declared) > 100, f"Vokabular unerwartet klein geparst: {len(declared)}"
    target = _target_terms()
    assert target, "Das Zielmodell-Register des Vokabulars ist nicht auffindbar"
    known = declared | target

    stale = defaultdict(list)
    for path in sorted((REPO_ROOT / "knowledge").glob("*.md")):
        if path.name in HISTORICAL_DOCS:
            continue
        exempt = False
        for lineno, line in enumerate(path.read_text(encoding="utf-8").split("\n"), 1):
            if HEADING.match(line):
                exempt = False
            mark = VOCAB_EXEMPT.search(line)
            if mark:
                if not VOCAB_EXEMPT.sub("", line).strip():
                    exempt = True
                continue
            if exempt:
                continue
            for term in VOCAB_TERM.findall(line):
                if term.startswith("m3gim-data:") or term in known:
                    continue
                if term in EVENT_CHANNELS:
                    continue
                stale[term].append(f"{path.name}:{lineno}")
    assert not stale, (
        "Wissensdokumente nennen Vokabularterme, die das Vokabular nicht "
        "fuehrt. Entweder ist der Name nachzuziehen, oder die Passage "
        "beschreibt Entfallenes oder einen Zielzustand und braucht die Marke "
        f"<!-- vocab-exempt: Grund -->: {dict(sorted(stale.items()))}"
    )
