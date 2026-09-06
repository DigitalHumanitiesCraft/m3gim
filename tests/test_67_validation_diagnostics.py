"""Focused guards for validation diagnostics that correspond to data loss."""

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from validate import (  # noqa: E402
    published_record_keys,
    validate_date,
    validate_objekte,
    validate_verknuepfungen,
    validate_verknuepfungen_source,
)
from _common import (  # noqa: E402
    find_object_folio_column,
    has_record_content,
    has_source_value,
    link_record_key,
    record_key,
)
from transform import build_konvolut_hierarchy  # noqa: E402


def _link(folio: str) -> pd.DataFrame:
    return pd.DataFrame([{
        "archivsignatur": "UAKUG/NIM_005",
        "folio": folio,
        "typ": "person",
        "name": "Malaniuk, Ira",
        "_xlsx_sheet": "Box 1",
        "_xlsx_row": 12,
    }])


def test_link_target_uses_exact_record_key_and_canonical_repair():
    known = {"UAKUG/NIM_005 1_2"}

    exact = validate_verknuepfungen(_link("1_2"), known, {})
    repaired = validate_verknuepfungen(_link("1-2"), known, {})
    missing = validate_verknuepfungen(_link("1_3"), known, {})

    assert not [issue for issue in exact if issue.code == "E005"]
    assert not [issue for issue in repaired if issue.code == "E005"]
    misses = [issue for issue in missing if issue.code == "E005"]
    assert len(misses) == 1
    assert misses[0].value == "UAKUG/NIM_005 1_3"
    assert misses[0].sheet == "Box 1" and misses[0].row == 12


def test_complete_dates_must_be_real_calendar_dates():
    accepted = (
        "1956", "1956-05", "1956-05-13", "1956-02-29",
        "1956/1958", "1956-05/1958-07", "1956-05-13/1958-07-02",
        "1947-1952", "circa:1956", "vor:1956", "nach:1956",
    )
    rejected = (
        "1951-02-29", "1959-31-08", "1959-02-30", "1956-13",
        "1956-5-13", "1956-05-13/1958-02-30",
    )

    assert all(validate_date(value) for value in accepted)
    assert not any(validate_date(value) for value in rejected)


def test_impossible_complete_date_gets_source_cell_diagnostic():
    row = _link("16")
    row.loc[0, "typ"] = "datum"
    row.loc[0, "name"] = "1951-02-29"

    issues = validate_verknuepfungen_source(row)
    errors = [issue for issue in issues if issue.code == "E010"]

    assert len(errors) == 1
    assert errors[0].value == "1951-02-29"
    assert errors[0].sheet == "Box 1" and errors[0].row == 12


def test_signature_only_row_is_error_without_flagging_empty_or_folio_rows():
    rows = pd.DataFrame([
        {"archivsignatur": None, "folio nr": None, "titel": None},
        {"archivsignatur": "UAKUG/NIM_138", "folio nr": None, "titel": None},
        {"archivsignatur": "UAKUG/NIM_137", "folio nr": "11_62", "titel": None},
        {"archivsignatur": "UAKUG/NIM_139", "folio nr": "nan", "titel": None},
        {"archivsignatur": "UAKUG/NIM_140", "folio nr": "none", "titel": None},
    ])

    issues = validate_objekte(rows)
    signature_only = [issue for issue in issues if issue.code == "E016"]

    assert [(issue.row, issue.value) for issue in signature_only] == [
        (3, "UAKUG/NIM_138")
    ]


def test_shared_content_predicate_preserves_pandas_null_boundaries():
    assert not has_source_value(None)
    assert not has_source_value(pd.NA)
    assert not has_source_value(pd.NaT)
    assert not has_source_value("")
    assert has_source_value("nan")
    assert has_source_value("none")
    assert has_source_value(0)
    assert not has_record_content(pd.Series({"titel": pd.NA}))
    assert has_record_content(pd.Series({"titel": "nan"}))


def test_object_and_link_folios_keep_their_distinct_source_policies():
    for literal in ("nan", "none"):
        assert record_key("UAKUG/NIM_001", literal).endswith(f" {literal}")
        assert link_record_key("UAKUG/NIM_001", literal).endswith(f" {literal}")
    assert record_key("UAKUG/NIM_001", "Folio").endswith(" Folio")
    assert link_record_key("UAKUG/NIM_001", "Folio") == "UAKUG/NIM_001"
    assert record_key("UAKUG/NIM_001", pd.NA) == "UAKUG/NIM_001"
    assert link_record_key("UAKUG/NIM_001", pd.NaT) == "UAKUG/NIM_001"


def test_published_keys_exclude_dropped_rows_and_include_record_sets():
    objects = pd.DataFrame([
        {"archivsignatur": "UAKUG/NIM_138", "folio nr": None, "titel": None},
        {"archivsignatur": "UAKUG/NIM_005", "folio nr": "1_2", "titel": "Brief"},
        {"archivsignatur": "UAKUG/NIM_TT_01", "folio nr": None, "titel": "Band"},
        {"archivsignatur": "beispiel", "folio nr": "1_3", "titel": "Vorlage"},
        {"archivsignatur": "nan", "folio nr": "Folio", "titel": None},
    ])

    keys = published_record_keys(objects)

    assert "UAKUG/NIM_138" not in keys
    assert {"UAKUG/NIM_005", "UAKUG/NIM_005 1_2"} <= keys
    assert "UAKUG/NIM_TT_01" in keys
    assert not any(key.startswith("beispiel") for key in keys)
    assert {"nan", "nan Folio"} <= keys

    link = _link("")
    link.loc[0, "archivsignatur"] = "UAKUG/NIM_138"
    misses = [
        issue for issue in validate_verknuepfungen(link, keys, {})
        if issue.code == "E005"
    ]
    assert len(misses) == 1 and misses[0].value == "UAKUG/NIM_138"


def test_derived_folio_parent_is_a_valid_link_target():
    objects = pd.DataFrame([
        {
            "archivsignatur": "UAKUG/NIM_005",
            "folio nr": "1_1",
            "titel": "Erkennungszeile",
        },
        {
            "archivsignatur": "UAKUG/NIM_005",
            "folio nr": "33_1_2",
            "titel": "Seite",
        },
    ])
    keys = published_record_keys(objects)
    folio_col = find_object_folio_column(objects)
    records, record_sets, _ = build_konvolut_hierarchy(objects, folio_col)
    built = {node["rico:identifier"] for node in records + record_sets}

    assert keys == built
    assert {
        "UAKUG/NIM_005",
        "UAKUG/NIM_005 33",
        "UAKUG/NIM_005 33_1",
        "UAKUG/NIM_005 33_1_2",
    } <= keys
    assert not [
        issue for issue in validate_verknuepfungen(_link("33_1"), keys, {})
        if issue.code == "E005"
    ]


def test_published_key_policy_matches_built_hierarchy(xlsx_objekte):
    folio_col = find_object_folio_column(xlsx_objekte)
    records, record_sets, _ = build_konvolut_hierarchy(xlsx_objekte, folio_col)
    built = {
        node["rico:identifier"]
        for node in records + record_sets
        if node.get("rico:identifier")
    }

    assert published_record_keys(xlsx_objekte) == built
