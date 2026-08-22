#!/usr/bin/env python3
"""Schlaegt Verknuepfungen fuer unverknuepfte Dokumente vor, aus ihren Titeln.

Der groesste Teil des Bestands traegt keine einzige Verknuepfung, obwohl der
erfasste Titel bereits einen Ort, ein Werk, eine Institution oder ein Jahr
nennt, das in einem der vier Indizes steht. Dieses Skript liest die Titel,
gleicht sie gegen die Indizes ab und legt das Ergebnis als Vorschlagsliste vor.

Die Grenze ist die des Projekts: das Skript raet nicht in die Daten hinein.
Es schreibt weder die Verknuepfungstabelle noch den Datensatz, sondern eine
Vorschlagsdatei, aus der das Erschliessungsteam bestaetigte Zeilen uebernimmt.
Damit steht es in derselben Reihe wie die manuell freigegebenen Q-ID-Treffer
(scripts/verify-manual-approvals.py) und nicht bei den abgeschafften
Heuristiken, die ungefragt Daten erzeugt haben.

Was ein Vorschlag traegt und was nicht:

  * Er traegt Signatur, Folio, Typ, Indexnamen und die Belegstelle im Titel.
  * Er traegt KEINE Rolle. Die Rolle ist eine Aussage ueber die Beziehung
    zwischen Dokument und Entitaet und steht nicht im Titel; sie erfasst das
    Team.
  * Er entsteht nur bei eindeutiger Lage. Ein Titelabschnitt, auf den zwei
    Indexeintraege zugleich passen, wird als mehrdeutig gemeldet.

Aufruf::

    python scripts/propose-links.py                # alle unverknuepften
    python scripts/propose-links.py --limit 50     # erste 50 Dokumente
    python scripts/propose-links.py --typ ort werk # nur diese Indizes

Ausgabe (beides von einem Lauf reproduzierbar, daher nicht versioniert):

    data/reports/link-proposals.md    Durchsicht fuer das Team
    data/reports/link-proposals.xlsx  einfuegefertige Zeilen
"""

import argparse
import io
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8",
                                  errors="replace")

BASE = Path(__file__).parent.parent
SHEETS = BASE / "data" / "google-spreadsheet"
REPORTS = BASE / "data" / "reports"

# Spalten der Verknuepfungstabelle. Eine bestaetigte Zeile geht ohne Umbau
# hinueber, deshalb ist die Reihenfolge festgehalten und getestet.
LINK_COLUMNS = ["archivsignatur", "folio", "datenpunkt_id", "typ", "name",
                "rolle", "anmerkung"]

# Ein Indexname unter dieser Laenge trifft zu leicht zufaellig; "Ur" oder "Aix"
# wuerden den Bestand mit Scheinbelegen fuellen.
MIN_SURFACE = 4

# Malaniuks Lebensspanne mit Rand. Alles ausserhalb ist im Titel eher eine
# Signatur, eine Blattzahl oder eine Opuszahl als ein Jahr.
YEAR_RANGE = (1900, 2015)
YEAR = re.compile(r"(?<!\d)(\d{4})(?!\d)")

# Deutsche Ableitungsendungen, die ein Ortsname im Titel annimmt. Der Bestand
# schreibt weit oefter "Bayreuther Festspiele" als "Festspiele in Bayreuth";
# ohne diese Liste faende der Abgleich die Haelfte der Ortsnennungen nicht.
# Die Liste ist geschlossen und kurz: eine offene Regel wie "beliebige zwei
# Buchstaben" machte aus "Grazie" einen Beleg fuer Graz.
DERIVATION_SUFFIXES = ("er", "ers", "ern", "erin", "erinnen", "isch",
                       "ische", "ischen", "ischer", "ischem", "s")

# Die vier Indizes und ihr Typwert in der Verknuepfungstabelle.
INDEX_KINDS = {
    "ort": "Ortsindex",
    "werk": "Werkindex",
    "person": "Personenindex",
    "institution": "Organisationsindex",
}


@dataclass(frozen=True)
class Hit:
    """Ein Indextreffer im Titel: der kanonische Name plus die Belegstelle."""
    name: str
    surface: str
    kind: str
    index_id: str = ""


@dataclass(frozen=True)
class Entry:
    """Ein Indexeintrag mit allen Oberflaechenformen, unter denen er auftritt."""
    name: str
    kind: str
    index_id: str
    surfaces: tuple


# ---------------------------------------------------------------------------
# Normalisierung und Oberflaechenformen
# ---------------------------------------------------------------------------

def fold_indexed(text: str) -> tuple:
    """Vergleichsform plus Rueckweg auf die Stellen des Originals.

    Der Titelbestand mischt "Munchen" und "Muenchen" mit der korrekten Form;
    ohne die Faltung faende der Abgleich nur eine davon. Die Faltung aendert
    aber Laengen (ein Umlaut zerfaellt, das scharfe s wird zwei Zeichen), und
    ohne den Rueckweg zeigte die Belegstelle einen um ein paar Zeichen
    verschobenen Ausschnitt des Titels, an dem niemand den Vorschlag pruefen
    kann. ``origin[i]`` ist die Position im Original, aus der das gefaltete
    Zeichen ``i`` stammt.
    """
    folded, origin = [], []
    for i, ch in enumerate(str(text or "")):
        piece = unicodedata.normalize("NFKD", ch)
        piece = "".join(c for c in piece if not unicodedata.combining(c))
        piece = piece.replace("ß", "ss").lower()
        for c in piece:
            folded.append(c)
            origin.append(i)
    return "".join(folded), origin


def fold(text: str) -> str:
    """Vergleichsform ohne Rueckweg, fuer Indexnamen."""
    return fold_indexed(text)[0].strip()


def person_surfaces(name: str) -> list:
    """Formen eines Personennamens, die im Titel vorkommen koennen.

    Der Index fuehrt "Nachname, Vorname"; ein Titel schreibt meist
    "Vorname Nachname". Der blosse Nachname bleibt aussen vor: er passt zu
    haeufig auf mehrere Personen und wuerde einen geratenen Vornamen in die
    Daten tragen.
    """
    name = (name or "").strip()
    if not name:
        return []
    if "," in name:
        last, first = [p.strip() for p in name.split(",", 1)]
        if not first:
            return [last]
        return [f"{last}, {first}", f"{first} {last}"]
    return [name]


def plain_surfaces(name: str) -> list:
    name = (name or "").strip()
    return [name] if name else []


def build_index(rows, kind: str) -> list:
    """Baut aus Indexzeilen die Eintragsliste fuer den Abgleich.

    ``rows`` ist eine Folge von Mappings mit mindestens ``name``; ``m3gim_id``
    wird mitgefuehrt, wenn vorhanden.
    """
    surfacer = person_surfaces if kind == "person" else plain_surfaces
    entries = []
    for row in rows:
        name = str(row.get("name") or "").strip()
        if not name or name.lower() == "nan":
            continue
        surfaces = tuple(s for s in surfacer(name) if len(s) >= MIN_SURFACE)
        if not surfaces:
            continue
        entries.append(Entry(name=name, kind=kind,
                             index_id=str(row.get("m3gim_id") or "").strip(),
                             surfaces=surfaces))
    return entries


# ---------------------------------------------------------------------------
# Abgleich
# ---------------------------------------------------------------------------

def _spans(haystack: str, needle: str) -> list:
    """Alle Fundstellen von ``needle`` in ``haystack`` an Wortgrenzen.

    Die Grenze ist ueber alphanumerische Nachbarzeichen definiert statt ueber
    eine Wortgrenzen-Klasse des Regex-Moduls, damit ein Indexname mit Komma
    oder Bindestrich nicht an seinem eigenen Satzzeichen scheitert.
    """
    out = []
    start = 0
    n = len(needle)
    if not n:
        return out
    while True:
        i = haystack.find(needle, start)
        if i < 0:
            return out
        before = haystack[i - 1] if i > 0 else " "
        if before.isalnum():
            start = i + 1
            continue
        end = _word_end(haystack, i + n)
        if end is not None:
            out.append((i, end))
        start = i + 1


def _word_end(haystack: str, pos: int):
    """Ende des Treffers ab ``pos``, oder None, wenn dort kein Wort endet.

    Direkt an einer Wortgrenze endet der Treffer bei ``pos``. Folgt eine
    Ableitungsendung aus der geschlossenen Liste und danach eine Wortgrenze,
    endet er hinter der Endung, damit die Belegstelle die tatsaechlich
    geschriebene Form zeigt.
    """
    if pos >= len(haystack) or not haystack[pos].isalnum():
        return pos
    for suffix in DERIVATION_SUFFIXES:
        end = pos + len(suffix)
        if haystack[pos:end] != suffix:
            continue
        if end >= len(haystack) or not haystack[end].isalnum():
            return end
    return None


def _covers(outer: tuple, inner: tuple) -> bool:
    return outer[0] <= inner[0] and inner[1] <= outer[1]


def find_mentions(title: str, entries: list) -> list:
    """Eindeutige Indextreffer im Titel.

    Zwei Regeln halten den Vorschlag ehrlich. Der laengere Treffer verdraengt
    den kuerzeren, den er ueberdeckt. Passen zwei verschiedene Eintraege auf
    dieselbe Stelle, faellt die Stelle heraus; eine Aufloesung waere geraten.
    """
    hay, origin = fold_indexed(title)
    if not hay:
        return []
    found = []
    for entry in entries:
        for surface in entry.surfaces:
            for span in _spans(hay, fold(surface)):
                found.append((span, entry, surface))
    if not found:
        return []

    # Mehrdeutige Stellen zuerst herausnehmen: dieselbe Spanne, verschiedene
    # Eintraege. Erst danach die Ueberdeckung aufloesen, sonst verdraengt ein
    # mehrdeutiger Langtreffer einen eindeutigen kurzen.
    by_span = {}
    for span, entry, surface in found:
        by_span.setdefault(span, []).append((entry, surface))
    unambiguous = [(span, cands[0][0], cands[0][1])
                   for span, cands in by_span.items()
                   if len({e.name for e, _ in cands}) == 1]

    # Laengster Treffer zuerst, damit er die von ihm ueberdeckten verdraengt.
    unambiguous.sort(key=lambda f: (f[0][0] - f[0][1], f[0][0]))
    kept = []
    for span, entry, surface in unambiguous:
        if any(_covers(k[0], span) for k in kept):
            continue
        kept.append((span, entry, surface))

    return [Hit(name=entry.name,
                surface=_original_slice(title, origin, span) or surface,
                kind=entry.kind, index_id=entry.index_id)
            for span, entry, surface in kept]


def _original_slice(title: str, origin: list, span: tuple) -> str:
    """Der Ausschnitt des Originaltitels, den eine gefaltete Spanne bezeichnet."""
    a, b = span
    if not origin or a >= len(origin):
        return ""
    start = origin[a]
    end = origin[min(b, len(origin)) - 1] + 1
    return str(title)[start:end]


def ambiguous_mentions(title: str, entries: list) -> list:
    """Stellen, auf die mehr als ein Indexeintrag passt. Fuer den Bericht."""
    hay, origin = fold_indexed(title)
    by_span = {}
    for entry in entries:
        for surface in entry.surfaces:
            for span in _spans(hay, fold(surface)):
                by_span.setdefault(span, set()).add(entry.name)
    return [(_original_slice(title, origin, span), sorted(names))
            for span, names in by_span.items() if len(names) > 1]


def extract_years(title: str) -> list:
    """Vierstellige Jahre im plausiblen Bereich, in Auftrittsreihenfolge."""
    out = []
    for m in YEAR.finditer(str(title or "")):
        y = int(m.group(1))
        if YEAR_RANGE[0] <= y <= YEAR_RANGE[1] and m.group(1) not in out:
            out.append(m.group(1))
    return out


# ---------------------------------------------------------------------------
# Vorschlagszeilen
# ---------------------------------------------------------------------------

def proposals_for(record: dict, indexes: dict) -> list:
    """Vorschlagszeilen fuer ein Dokument, in der Form der Verknuepfungstabelle.

    ``indexes`` bildet den Typwert auf die Eintragsliste ab. Die Rollenspalte
    bleibt leer, die Anmerkung nennt die Belegstelle im Titel.
    """
    title = str(record.get("titel") or "")
    rows = []
    for kind, entries in indexes.items():
        for hit in find_mentions(title, entries):
            note = f"Vorschlag aus dem Titel, Belegstelle {hit.surface}"
            if hit.index_id:
                note += f", Index {hit.index_id}"
            rows.append({
                "archivsignatur": str(record.get("archivsignatur") or "").strip(),
                "folio": str(record.get("folio") or "").strip(),
                "datenpunkt_id": "",
                "typ": kind,
                "name": hit.name,
                "rolle": "",
                "anmerkung": note,
                "_index_id": hit.index_id,
                "_titel": title,
            })
    return rows


# ---------------------------------------------------------------------------
# Lauf
# ---------------------------------------------------------------------------

def load_indexes(kinds) -> dict:
    """Laedt die Indizes mit dem Leser der Pipeline (Header-Shift-Korrektur)."""
    sys.path.insert(0, str(BASE / "scripts"))
    from transform import load_index  # noqa: WPS433 — ein Leser fuer beide Wege

    out = {}
    for kind in kinds:
        df = load_index(INDEX_KINDS[kind])
        if df is None:
            print(f"  WARNUNG: {INDEX_KINDS[kind]} nicht gefunden")
            continue
        if "name" not in df.columns:
            print(f"  WARNUNG: {INDEX_KINDS[kind]} ohne name-Spalte")
            continue
        out[kind] = build_index(df.to_dict("records"), kind=kind)
    return out


def load_records() -> pd.DataFrame:
    df = pd.read_excel(SHEETS / "M3GIM-Objekte.xlsx")
    df.columns = [str(c).lower().strip() for c in df.columns]
    if "folio nr" in df.columns:
        df = df.rename(columns={"folio nr": "folio"})
    return df


def object_id(signatur, folio) -> str:
    """Kennung eines Dokuments, wie die Pipeline sie bildet: Signatur plus Folio.

    Die Verknuepfung haengt am einzelnen Blatt, nicht am Konvolut. Ein Abgleich
    allein ueber die Signatur hielte jedes Blatt eines Konvoluts fuer
    verknuepft, sobald ein einziges anderes Blatt darin eine Verknuepfung hat.
    """
    sys.path.insert(0, str(BASE / "scripts"))
    from transform import normalize_signatur  # noqa: WPS433

    sig = normalize_signatur(str(signatur or "").strip())
    fol = str(folio or "").strip()
    if fol.lower() in ("", "nan"):
        return sig
    return f"{sig} {fol}"


def linked_objects() -> set:
    """Dokumentkennungen, die mindestens eine Verknuepfungszeile tragen."""
    sys.path.insert(0, str(BASE / "scripts"))
    from transform import load_verknuepfungen  # noqa: WPS433

    for name in ["M3GIM-Verknüpfungen.xlsx", "M3GIM-Verknuepfungen.xlsx"]:
        path = SHEETS / name
        if not path.exists():
            continue
        df = load_verknuepfungen(path)
        out = set()
        for _, row in df.iterrows():
            sig = row.get("archivsignatur")
            if pd.isna(sig) or not str(sig).strip():
                continue
            folio = row.get("folio") if "folio" in df.columns else None
            if pd.notna(folio) and str(folio).strip().lower() == "folio":
                folio = None
            out.add(object_id(sig, folio if pd.notna(folio) else None))
        return out
    raise FileNotFoundError("Keine Verknuepfungstabelle gefunden")


def main() -> int:
    ap = argparse.ArgumentParser(description="Verknuepfungs-Vorschlaege aus Titeln")
    ap.add_argument("--typ", nargs="+", choices=sorted(INDEX_KINDS),
                    default=sorted(INDEX_KINDS),
                    help="Nur diese Indizes abgleichen")
    ap.add_argument("--limit", type=int, default=0,
                    help="Nur die ersten N unverknuepften Dokumente")
    ap.add_argument("--alle", action="store_true",
                    help="Auch bereits verknuepfte Dokumente einbeziehen")
    args = ap.parse_args()

    print("M3GIM Verknuepfungs-Vorschlaege")
    print("=" * 60)

    indexes = load_indexes(args.typ)
    for kind, entries in indexes.items():
        print(f"  {INDEX_KINDS[kind]}: {len(entries)} Eintraege")

    df = load_records()
    linked = set() if args.alle else linked_objects()
    todo = [r for r in df.to_dict("records")
            if object_id(r.get("archivsignatur"), r.get("folio")) not in linked]
    if args.limit:
        todo = todo[:args.limit]
    print(f"  {len(todo)} Dokumente ohne Verknuepfung im Blick")

    rows, ambiguous, with_year = [], [], []
    all_entries = [e for entries in indexes.values() for e in entries]
    for rec in todo:
        rows.extend(proposals_for(rec, indexes))
        title = str(rec.get("titel") or "")
        for surface, names in ambiguous_mentions(title, all_entries):
            ambiguous.append((rec.get("archivsignatur"), surface, names))
        years = extract_years(title)
        if years:
            with_year.append((rec.get("archivsignatur"), years, title[:90]))

    REPORTS.mkdir(parents=True, exist_ok=True)
    _write_markdown(rows, ambiguous, with_year, todo)
    _write_xlsx(rows)

    touched = len({object_id(r["archivsignatur"], r["folio"]) for r in rows})
    print()
    print(f"  {len(rows)} Vorschlaege fuer {touched} Dokumente")
    print(f"  {len(ambiguous)} mehrdeutige Stellen zur Entscheidung")
    print(f"  {len(with_year)} Dokumente mit Jahresangabe im Titel")
    print(f"  Durchsicht: {REPORTS / 'link-proposals.md'}")
    print(f"  Einfuegefertig: {REPORTS / 'link-proposals.xlsx'}")
    return 0


def _write_markdown(rows, ambiguous, with_year, todo):
    # Gruppiert nach Dokument, nicht nach Konvolut. Ein Konvolut wie das
    # Bayreuther Programmheft traegt weit ueber hundert Blaetter; unter der
    # blossen Signatur stuenden sie als eine Liste ohne erkennbaren Bezug.
    by_sig = {}
    for r in rows:
        key = r["archivsignatur"] + (f" {r['folio']}" if r["folio"] else "")
        by_sig.setdefault(key, []).append(r)
    out = ["# Vorschlaege fuer die Verknuepfung", "",
           "Erzeugt von `scripts/propose-links.py` aus den Titeln der "
           "unverknuepften Dokumente. Nichts davon steht in den Daten. "
           "Bestaetigte Zeilen wandern aus `link-proposals.xlsx` in die "
           "Verknuepfungstabelle; die Rollenspalte fuellt das Team.", "",
           f"- Dokumente ohne Verknuepfung im Blick: {len(todo)}",
           f"- Dokumente mit mindestens einem Vorschlag: {len(by_sig)}",
           f"- Vorschlaege insgesamt: {len(rows)}",
           f"- Mehrdeutige Stellen: {len(ambiguous)}",
           f"- Dokumente mit Jahresangabe im Titel: {len(with_year)}", ""]

    out += ["## Vorschlaege je Dokument", ""]
    for sig in sorted(by_sig):
        group = by_sig[sig]
        out += [f"### {sig}", "", f"> {group[0]['_titel']}", "",
                "| Typ | Indexeintrag | Belegstelle |", "|---|---|---|"]
        for r in group:
            out.append(f"| {r['typ']} | {r['name']} | {r['anmerkung']} |")
        out.append("")

    if ambiguous:
        out += ["## Mehrdeutige Stellen", "",
                "Diese Titelabschnitte passen auf mehr als einen Indexeintrag. "
                "Das Skript loest sie nicht auf.", "",
                "| Signatur | Belegstelle | Kandidaten |", "|---|---|---|"]
        for sig, surface, names in ambiguous:
            out.append(f"| {sig} | {surface} | {', '.join(names)} |")
        out.append("")

    if with_year:
        out += ["## Jahresangaben im Titel", "",
                "Ein Jahr im Titel ist kein Verknuepfungsvorschlag, sondern ein "
                "Hinweis auf ein fehlendes Entstehungsdatum.", "",
                "| Signatur | Jahr | Titel |", "|---|---|---|"]
        for sig, years, title in with_year:
            out.append(f"| {sig} | {', '.join(years)} | {title} |")
        out.append("")

    (REPORTS / "link-proposals.md").write_text("\n".join(out), encoding="utf-8")


def _write_xlsx(rows):
    frame = pd.DataFrame([{c: r[c] for c in LINK_COLUMNS} for r in rows],
                         columns=LINK_COLUMNS)
    frame.to_excel(REPORTS / "link-proposals.xlsx", index=False)


if __name__ == "__main__":
    sys.exit(main())
