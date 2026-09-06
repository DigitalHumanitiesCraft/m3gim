"""Failure-path guarantees for the data-preserving pipeline boundary."""

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import urllib.error
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

REPO_ROOT = Path(__file__).parent.parent
SCRIPTS = REPO_ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import _common  # noqa: E402
import reconcile  # noqa: E402


def load_script(module_name: str, filename: str):
    spec = importlib.util.spec_from_file_location(module_name, SCRIPTS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_atomic_json_failure_preserves_existing_file(tmp_path, monkeypatch):
    destination = tmp_path / "result.json"
    destination.write_text('{"state":"old"}', encoding="utf-8")

    def interrupted_dump(*args, **kwargs):
        args[1].write('{"state":')
        raise OSError("interrupted write")

    monkeypatch.setattr(_common.json, "dump", interrupted_dump)
    with pytest.raises(OSError, match="interrupted write"):
        _common.atomic_write_json(destination, {"state": "new"})

    assert destination.read_text(encoding="utf-8") == '{"state":"old"}'
    assert not list(tmp_path.glob("*.tmp"))


def test_atomic_copy_replace_failure_preserves_existing_file(tmp_path, monkeypatch):
    source = tmp_path / "source.json"
    destination = tmp_path / "published.json"
    source.write_text('{"state":"new"}', encoding="utf-8")
    destination.write_text('{"state":"old"}', encoding="utf-8")
    monkeypatch.setattr(
        _common.os, "replace",
        lambda *args: (_ for _ in ()).throw(OSError("replace interrupted")),
    )

    with pytest.raises(OSError, match="replace interrupted"):
        _common.atomic_copy_file(source, destination)

    assert destination.read_text(encoding="utf-8") == '{"state":"old"}'
    assert not list(tmp_path.glob("*.tmp"))


def test_reconciliation_keeps_selected_type_when_index_is_missing(
        tmp_path, monkeypatch):
    destination = tmp_path / "reconciliation.json"
    previous = {
        "matched": [{"type": "work", "name": "Aida", "qid": "Q123"}],
        "unmatched": [], "skipped": [],
    }
    destination.write_text(json.dumps(previous), encoding="utf-8")
    monkeypatch.setattr(reconcile, "OUTPUT_FILE", destination)
    monkeypatch.setattr(reconcile, "load_index", lambda *args: None)

    result = reconcile.run_reconciliation(["work"])

    assert result["matched"] == previous["matched"]
    assert json.loads(destination.read_text(encoding="utf-8"))["matched"] == previous["matched"]


def test_transient_search_failure_is_retryable_and_not_unmatched(
        tmp_path, monkeypatch):
    destination = tmp_path / "reconciliation.json"
    monkeypatch.setattr(reconcile, "OUTPUT_FILE", destination)
    monkeypatch.setattr(reconcile, "load_index", lambda *args: pd.DataFrame({
        "m3gim_id": ["W1"], "name": ["Aida"], "wikidata_id": [np.nan],
    }))
    monkeypatch.setattr(reconcile, "_api_request",
                        lambda params: (_ for _ in ()).throw(urllib.error.URLError("timeout")))
    monkeypatch.setattr(reconcile, "REQUEST_DELAY", 0)

    result = reconcile.run_reconciliation(["work"], force=True)

    assert result["unmatched"] == []
    assert result["errors"][0]["retryable"] is True
    cached = reconcile.load_previous_results()
    assert ("work", "Aida") not in cached["unmatched_keys"]


def test_force_reconciliation_keeps_previous_match_on_transient_failure(
        tmp_path, monkeypatch):
    destination = tmp_path / "reconciliation.json"
    previous_match = {"type": "work", "name": "Aida", "qid": "Q123"}
    destination.write_text(json.dumps({
        "matched": [previous_match], "unmatched": [], "skipped": [],
    }), encoding="utf-8")
    monkeypatch.setattr(reconcile, "OUTPUT_FILE", destination)
    monkeypatch.setattr(reconcile, "load_index", lambda *args: pd.DataFrame({
        "m3gim_id": ["W1"], "name": ["Aida"], "wikidata_id": [np.nan],
    }))
    monkeypatch.setattr(
        reconcile, "reconcile_work",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            reconcile.TransientRequestError("timeout")),
    )
    work_config = next(row for row in reconcile.INDEX_CONFIG
                       if row["type"] == "work")
    monkeypatch.setitem(work_config, "reconcile_fn", reconcile.reconcile_work)
    monkeypatch.setattr(reconcile, "REQUEST_DELAY", 0)

    result = reconcile.run_reconciliation(["work"], force=True)

    assert previous_match in result["matched"]
    assert result["unmatched"] == []


def test_wikidata_csv_export_requires_approval_for_fuzzy_low():
    exporter = load_script("wikidata_csv_under_test", "export-wikidata-csv.py")
    entries = [
        {"name": "unchecked", "match": "fuzzy_low"},
        {"name": "approved", "match": "fuzzy_low", "manual_review": "approved"},
        {"name": "exact", "match": "exact"},
    ]
    assert [row["name"] for row in exporter.exportable_matches(entries)] == [
        "approved", "exact",
    ]


def test_validate_missing_object_input_reports_without_crashing(tmp_path):
    env = dict(os.environ)
    env.update({"M3GIM_SHEETS_DIR": str(tmp_path / "missing"),
                "M3GIM_REPORTS_DIR": str(tmp_path / "reports")})
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "validate.py")], cwd=REPO_ROOT,
        env=env, capture_output=True, text=True, encoding="utf-8",
    )
    assert proc.returncode == 1
    assert "Objekttabelle nicht gefunden" in proc.stdout
    assert "AttributeError" not in proc.stderr
    report = (tmp_path / "reports/validation-report.md").read_text(encoding="utf-8")
    assert "INPUT_MISSING" in report
    assert "Keine Fehler" not in report


def test_validate_absent_object_with_other_inputs_is_an_error(tmp_path):
    sheets = tmp_path / "sheets"
    sheets.mkdir()
    for name in ("Personenindex", "Organisationsindex", "Ortsindex", "Werkindex"):
        shutil.copy2(REPO_ROOT / f"data/google-spreadsheet/M3GIM-{name}.xlsx", sheets)
    shutil.copytree(REPO_ROOT / "data/google-spreadsheet/verknuepfungen",
                    sheets / "verknuepfungen")
    env = dict(os.environ)
    env.update({"M3GIM_SHEETS_DIR": str(sheets),
                "M3GIM_REPORTS_DIR": str(tmp_path / "reports")})

    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "validate.py")], cwd=REPO_ROOT,
        env=env, capture_output=True, text=True, encoding="utf-8",
    )
    assert proc.returncode == 1
    assert "Objekttabelle nicht gefunden" in proc.stdout
    report = (tmp_path / "reports/validation-report.md").read_text(encoding="utf-8")
    assert "INPUT_MISSING" in report and "Objekte" in report


def test_transform_missing_index_preserves_existing_output(tmp_path):
    sheets = tmp_path / "sheets"
    output = tmp_path / "output"
    sheets.mkdir()
    output.mkdir()
    shutil.copy2(REPO_ROOT / "data/google-spreadsheet/M3GIM-Objekte.csv", sheets)
    existing = output / "m3gim.jsonld"
    existing.write_text('{"state":"old"}', encoding="utf-8")
    env = dict(os.environ)
    env.update({"M3GIM_SHEETS_DIR": str(sheets),
                "M3GIM_OUTPUT_DIR": str(output)})

    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "transform.py")], cwd=REPO_ROOT,
        env=env, capture_output=True, text=True, encoding="utf-8",
    )
    assert proc.returncode == 1
    assert "Pflichtindizes fehlen oder sind leer" in proc.stdout
    assert existing.read_text(encoding="utf-8") == '{"state":"old"}'


def test_force_backup_restores_previous_snapshot_after_failed_verification(
        tmp_path, monkeypatch):
    backup = load_script("backup_under_test", "backup.py")
    source = tmp_path / "drive-download-20260906T120000Z-source"
    source.mkdir()
    (source / "data.txt").write_text("new", encoding="utf-8")
    backup_root = tmp_path / "backup"
    backup_root.mkdir()
    destination = backup_root / "2026-09-06T120000Z"
    destination.mkdir()
    (destination / "data.txt").write_text("old", encoding="utf-8")
    monkeypatch.setattr(backup, "BACKUP_ROOT", backup_root)
    monkeypatch.setattr(backup, "LOG_PATH", backup_root / "backup-log.md")
    real_verify = backup.verify_snapshot
    calls = 0

    def fail_after_replacement(source_path, snapshot_path):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("post-replacement verification failed")
        return real_verify(source_path, snapshot_path)

    monkeypatch.setattr(backup, "verify_snapshot", fail_after_replacement)
    assert backup.main(["--force", str(source)]) == 2
    assert (destination / "data.txt").read_text(encoding="utf-8") == "old"


def test_new_backup_removes_failed_destination_after_final_verification(
        tmp_path, monkeypatch):
    backup = load_script("backup_new_under_test", "backup.py")
    source = tmp_path / "drive-download-20260906T130000Z-source"
    source.mkdir()
    (source / "data.txt").write_text("new", encoding="utf-8")
    backup_root = tmp_path / "backup"
    backup_root.mkdir()
    destination = backup_root / "2026-09-06T130000Z"
    monkeypatch.setattr(backup, "BACKUP_ROOT", backup_root)
    monkeypatch.setattr(backup, "LOG_PATH", backup_root / "backup-log.md")
    real_verify = backup.verify_snapshot
    calls = 0

    def fail_final_verification(source_path, snapshot_path):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("final verification failed")
        return real_verify(source_path, snapshot_path)

    monkeypatch.setattr(backup, "verify_snapshot", fail_final_verification)
    assert backup.main([str(source)]) == 2
    assert not destination.exists()


def test_retryable_old_match_and_unmatched_are_retried_on_next_run(
        tmp_path, monkeypatch):
    destination = tmp_path / "reconciliation.json"
    old_match = {"type": "work", "name": "Aida", "qid": "Q123"}
    old_unmatched = {"type": "work", "name": "Otello"}
    destination.write_text(json.dumps({
        "matched": [old_match], "unmatched": [old_unmatched], "skipped": [],
    }), encoding="utf-8")
    monkeypatch.setattr(reconcile, "OUTPUT_FILE", destination)
    monkeypatch.setattr(reconcile, "load_index", lambda *args: pd.DataFrame({
        "m3gim_id": ["W1", "W2"], "name": ["Aida", "Otello"],
        "wikidata_id": [np.nan, np.nan],
    }))
    attempts = []

    def fail_temporarily(name, **kwargs):
        attempts.append(name)
        raise reconcile.TransientRequestError("timeout")

    work_config = next(row for row in reconcile.INDEX_CONFIG
                       if row["type"] == "work")
    monkeypatch.setitem(work_config, "reconcile_fn", fail_temporarily)
    monkeypatch.setattr(reconcile, "REQUEST_DELAY", 0)

    first = reconcile.run_reconciliation(["work"], force=True)
    second = reconcile.run_reconciliation(["work"])

    assert attempts == ["Aida", "Otello", "Aida", "Otello"]
    assert old_match in first["matched"] and old_match in second["matched"]
    assert old_unmatched in first["unmatched"] and old_unmatched in second["unmatched"]


def test_reconciliation_cli_fails_for_missing_selected_index(tmp_path):
    env = dict(os.environ)
    env.update({"M3GIM_SHEETS_DIR": str(tmp_path / "sheets"),
                "M3GIM_OUTPUT_DIR": str(tmp_path / "output")})
    proc = subprocess.run(
        [sys.executable, str(SCRIPTS / "reconcile.py"), "--type", "work"],
        cwd=REPO_ROOT, env=env, capture_output=True, text=True, encoding="utf-8",
    )
    assert proc.returncode == 1
    assert "Pflichtindex fehlt oder ist leer" in (
        tmp_path / "output/wikidata-reconciliation.json"
    ).read_text(encoding="utf-8")


def test_quality_counts_performance_and_cataloguing_excludes_derived_folio():
    quality = load_script("quality_under_test", "report-quality.py")
    cataloguing = load_script("cataloguing_under_test", "report-cataloguing.py")
    performance_only = {
        "@id": "record:performance", "@type": "rico:Record",
        "m3gim-ontology:hasPerformance": {"@id": "performance:1"},
        "m3gim-ontology:processingStatus": "abgeschlossen",
    }
    derived = {
        "@id": "record:derived", "@type": "rico:Record",
        "rico:identifier": "UAKUG/NIM_001 1",
        "m3gim-ontology:derivedFolioRecord": True,
        "m3gim-ontology:processingStatus": "abgeschlossen",
    }
    assert quality.count_links_on_record(performance_only) == 1
    assert cataloguing.worked_on_without_link([derived]) == []
