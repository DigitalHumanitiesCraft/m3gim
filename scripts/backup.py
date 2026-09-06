#!/usr/bin/env python3
"""backup.py — backup-only archive of raw Google Drive exports.

Copies an export folder (as downloaded from Google Drive) unchanged into a
timestamped snapshot directory under ``data/backup/`` and writes a log entry
with SHA-256 checksums.

BACKUP ONLY. The script does not touch ``data/google-spreadsheet/`` and does
not start the pipeline. Promoting an export into the working state is a
separate, deliberately manual step (source files are git-tracked, every change
should be seen).

DSGVO: ``data/backup/`` is fully gitignored (root .gitignore plus a
self-ignoring .gitignore in the folder). Exports may contain DSGVO-sensitive
files (e.g. ``Handreichung-Datenerfassung.docx``) and must not reach the public
repo. See the red lines in ``CLAUDE.md``.

Run:

    python scripts/backup.py "C:/Users/chris/Downloads/drive-download-..."
    python scripts/backup.py            # newest drive-download-* in ~/Downloads
    python scripts/backup.py --force <path>   # overwrite an existing snapshot
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKUP_ROOT = REPO_ROOT / "data" / "backup"
LOG_PATH = BACKUP_ROOT / "backup-log.md"

# Drive exports are named "drive-download-YYYYMMDDTHHMMSSZ-...".
EXPORT_GLOB = "drive-download-*"
EXPORT_TS_RE = re.compile(r"(\d{8})T(\d{6})Z")

# DSGVO-sensitive filenames (substring, case-insensitive). Matches are marked
# with the text marker [DSGVO] in the log and emitted as a warning.
DSGVO_HINTS = ("handreichung", "antrag")

# Self-ignoring .gitignore in the backup folder (defense in depth on top of the
# root .gitignore entry).
FOLDER_GITIGNORE = (
    "# Backup-only, lokal. DSGVO: NICHT committen.\n"
    "# Snapshots koennen sensible Dateien enthalten (Handreichung, Antrag).\n"
    "# Siehe rote Linien in CLAUDE.md.\n"
    "*\n"
    "!.gitignore\n"
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def find_latest_export(downloads: Path) -> Path | None:
    candidates = [p for p in downloads.glob(EXPORT_GLOB) if p.is_dir()]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def snapshot_label(source: Path) -> str:
    """Snapshot name from the Drive timestamp of the export folder, else now()."""
    m = EXPORT_TS_RE.search(source.name)
    if m:
        d, t = m.group(1), m.group(2)  # 20260617, 055322
        return f"{d[0:4]}-{d[4:6]}-{d[6:8]}T{t}Z"
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")


def ensure_backup_root() -> None:
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    gi = BACKUP_ROOT / ".gitignore"
    if not gi.exists():
        gi.write_text(FOLDER_GITIGNORE, encoding="utf-8")


def collect_files(source: Path) -> list[Path]:
    return sorted(p for p in source.rglob("*") if p.is_file())


def verify_snapshot(source: Path, snapshot: Path) -> list[tuple[str, int, str, bool]]:
    """Verify that a snapshot exactly reproduces every source file."""
    entries = []
    source_files = collect_files(source)
    snapshot_files = collect_files(snapshot)
    source_names = [path.relative_to(source) for path in source_files]
    snapshot_names = [path.relative_to(snapshot) for path in snapshot_files]
    if source_names != snapshot_names:
        raise RuntimeError("Backup enthaelt nicht dieselbe Dateimenge wie die Quelle")
    for source_file, relative in zip(source_files, source_names, strict=True):
        target = snapshot / relative
        source_digest = sha256(source_file)
        target_digest = sha256(target)
        if source_digest != target_digest:
            raise RuntimeError(f"Pruefsumme stimmt nicht: {relative}")
        flag = any(hint in relative.name.lower() for hint in DSGVO_HINTS)
        entries.append((relative.as_posix(), target.stat().st_size,
                        target_digest, flag))
    return entries


def write_log_entry(label: str, source: Path, dest: Path,
                    entries: list[tuple[str, int, str, bool]]) -> None:
    run_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    total_bytes = sum(size for _, size, _, _ in entries)
    dsgvo = [name for name, _, _, flag in entries if flag]

    lines: list[str] = []
    if not LOG_PATH.exists():
        lines.append("# backup — Log\n")
        lines.append(
            "> Append-only-Protokoll der gesicherten Google-Drive-Exporte. "
            "Nur Backup; das Promoten in `data/google-spreadsheet/` ist ein "
            "separater manueller Schritt. Lokal, gitignored (DSGVO).\n"
        )

    lines.append(f"\n## {label}\n")
    lines.append(f"- Backup-Lauf: {run_ts}")
    lines.append(f"- Quelle: `{source}`")
    lines.append(f"- Ziel: `{dest.relative_to(REPO_ROOT)}`")
    lines.append(f"- Dateien: {len(entries)} ({total_bytes:,} Bytes)")
    if dsgvo:
        lines.append(
            f"- [DSGVO] {', '.join(dsgvo)} — nur lokal, nicht ins Repo."
        )
    lines.append("")
    lines.append("| Datei | Bytes | SHA-256 |")
    lines.append("|---|---:|---|")
    for name, size, digest, flag in entries:
        mark = " [DSGVO]" if flag else ""
        lines.append(f"| {name}{mark} | {size:,} | `{digest}` |")
    lines.append("")

    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


def main(argv: list[str] | None = None) -> int:
    # Windows console is often cp1252 -> force UTF-8 so non-ASCII output (dash,
    # umlaut filenames) does not raise UnicodeEncodeError.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass

    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", nargs="?",
                        help="Export-Ordner. Default: neuester drive-download-* in ~/Downloads.")
    parser.add_argument("--downloads", default=str(Path.home() / "Downloads"),
                        help="Downloads-Ordner fuer die Auto-Erkennung.")
    parser.add_argument("--force", action="store_true",
                        help="Vorhandenen Snapshot ueberschreiben.")
    args = parser.parse_args(argv)

    if args.source:
        source = Path(args.source).expanduser().resolve()
    else:
        source = find_latest_export(Path(args.downloads).expanduser())
        if source is None:
            print(f"FEHLER: kein '{EXPORT_GLOB}' in {args.downloads} gefunden.",
                  file=sys.stderr)
            return 2
        print(f"Auto-erkannt: {source}")

    if not source.is_dir():
        print(f"FEHLER: Quelle ist kein Verzeichnis: {source}", file=sys.stderr)
        return 2

    files = collect_files(source)
    if not files:
        print(f"FEHLER: Quelle ist leer: {source}", file=sys.stderr)
        return 2

    ensure_backup_root()
    label = snapshot_label(source)
    dest = BACKUP_ROOT / label

    replacing = dest.exists()
    if replacing:
        if not args.force:
            print(f"Snapshot existiert bereits: {dest.relative_to(REPO_ROOT)}")
            print("Bereits gesichert. --force zum Ueberschreiben.")
            return 0
    staging = BACKUP_ROOT / f".{label}.staging"
    rollback = BACKUP_ROOT / f".{label}.previous"
    if staging.exists() or rollback.exists():
        print(f"FEHLER: temporaerer Backup-Pfad existiert bereits: {staging}",
              file=sys.stderr)
        return 2
    try:
        shutil.copytree(source, staging, copy_function=shutil.copy2)
        entries = verify_snapshot(source, staging)
        if replacing:
            os.replace(dest, rollback)
        try:
            os.replace(staging, dest)
            entries = verify_snapshot(source, dest)
        except BaseException:
            if replacing and rollback.exists():
                if dest.exists():
                    shutil.rmtree(dest)
                os.replace(rollback, dest)
            raise
        if rollback.exists():
            shutil.rmtree(rollback)
    except (OSError, RuntimeError) as exc:
        if staging.exists():
            shutil.rmtree(staging)
        if not replacing and dest.exists():
            shutil.rmtree(dest)
        print(f"FEHLER: Backup nicht ersetzt: {exc}", file=sys.stderr)
        return 2

    write_log_entry(label, source, dest, entries)

    print(f"\nGesichert: {len(entries)} Datei(en) -> {dest.relative_to(REPO_ROOT)}")
    for name, size, _, flag in entries:
        mark = "  [DSGVO]" if flag else ""
        print(f"  {size:>10,}  {name}{mark}")
    print(f"\nLog: {LOG_PATH.relative_to(REPO_ROOT)}")
    dsgvo = [n for n, _, _, f in entries if f]
    if dsgvo:
        print(f"[DSGVO] {len(dsgvo)} sensible Datei(en) gesichert — bleiben lokal, "
              "nicht committen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
