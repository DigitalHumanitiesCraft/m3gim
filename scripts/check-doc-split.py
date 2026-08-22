# /// script
# requires-python = ">=3.11"
# ///
"""Inhaltserhalt bei der Teilung und Zusammenführung von Wissensdokumenten.

Ein Dokument in zwei zu zerlegen ist eine reine Verschiebeoperation, und ihr
Versagensmuster ist stiller Verlust. Ein Abschnitt verschwindet, ein zweiter
wird beim Verschieben umgeschrieben, und nichts meldet einen Fehler.

Datenfluss: eine Momentaufnahme vor dem Eingriff nach der Teilung gegen die
Zieldokumente gehalten, als Konsolenreport und Exit-Code.

Usage:
    python scripts/check-doc-split.py snapshot AUFNAHME QUELLE...
    python scripts/check-doc-split.py verify   AUFNAHME ZIEL...

Die Aufnahme hält je Abschnitt seine Überschrift und einen Hash des Rumpfes.
Die Prüfung meldet drei Klassen: ein Abschnitt fehlt in allen Zielen (Verlust),
ein Abschnitt steht in mehr als einem Ziel (Dublette), ein Abschnitt steht mit
verändertem Rumpf da (Umschreibung beim Verschieben). Ein bewusst geänderter
Rumpf wird durch eine neue Aufnahme quittiert.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

HEADING = re.compile(r"^(#{2,6})\s+(.*?)\s*$")


def sections(path: Path) -> dict[str, str]:
    """Überschrift -> Hash des Rumpfes bis zur nächsten Überschrift."""
    found: dict[str, str] = {}
    current: str | None = None
    body: list[str] = []

    def close() -> None:
        if current is not None:
            text = "\n".join(body).strip()
            normalised = re.sub(r"\s+", " ", text)
            found[current] = hashlib.sha256(normalised.encode("utf-8")).hexdigest()[:16]

    for line in path.read_text(encoding="utf-8").splitlines():
        match = HEADING.match(line)
        if match:
            close()
            current, body = match.group(2), []
        elif current is not None:
            body.append(line)
    close()
    return found


def snapshot(target: Path, sources: list[Path]) -> int:
    record: dict[str, dict[str, str]] = {}
    for source in sources:
        record[str(source)] = sections(source)
    target.write_text(
        json.dumps(record, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    total = sum(len(v) for v in record.values())
    print(f"OK Aufnahme geschrieben, {total} Abschnitte aus {len(sources)} Dokumenten")
    return 0


def verify(source_file: Path, targets: list[Path]) -> int:
    record = json.loads(source_file.read_text(encoding="utf-8"))
    expected: dict[str, str] = {}
    for per_file in record.values():
        expected.update(per_file)

    actual: dict[str, list[tuple[str, str]]] = {}
    for target in targets:
        for heading, digest in sections(target).items():
            actual.setdefault(heading, []).append((str(target), digest))

    lost = [h for h in expected if h not in actual]
    doubled = {h: [p for p, _ in v] for h, v in actual.items() if len(v) > 1}
    rewritten = {
        h: actual[h][0][0]
        for h, digest in expected.items()
        if h in actual and len(actual[h]) == 1 and actual[h][0][1] != digest
    }

    for heading in sorted(lost):
        print(f"FEHLER Abschnitt verloren: {heading}", file=sys.stderr)
    for heading, places in sorted(doubled.items()):
        print(f"FEHLER Abschnitt doppelt in {places}: {heading}", file=sys.stderr)
    for heading, place in sorted(rewritten.items()):
        print(f"FEHLER Rumpf verändert in {place}: {heading}", file=sys.stderr)

    findings = len(lost) + len(doubled) + len(rewritten)
    if findings:
        print(f"FEHLER {findings} Abweichungen gegen die Aufnahme", file=sys.stderr)
        return 1
    print(f"OK {len(expected)} Abschnitte unverändert wiedergefunden")
    return 0


def main() -> int:
    if len(sys.argv) < 4 or sys.argv[1] not in {"snapshot", "verify"}:
        print(__doc__.split("Usage:")[1].strip(), file=sys.stderr)
        return 2
    mode, record = sys.argv[1], Path(sys.argv[2])
    paths = [Path(p) for p in sys.argv[3:]]
    missing = [p for p in paths if not p.exists()]
    if missing:
        print(f"FEHLER Eingabedatei fehlt: {missing}", file=sys.stderr)
        return 1
    return snapshot(record, paths) if mode == "snapshot" else verify(record, paths)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    raise SystemExit(main())
