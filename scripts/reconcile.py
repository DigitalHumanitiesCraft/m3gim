#!/usr/bin/env python3
"""
M³GIM Reconcile — Wikidata reconciliation for the indexes.

Reads the four index tables (persons, organisations, places, works), queries
the Wikidata Search API and records Q-IDs. Results are stored as a JSON file
that transform.py picks up on the next pipeline run.

Strategy:
  - Exact label matches preferred, alias matches one tier below
  - Fuzzy matching as fallback (thefuzz token_set_ratio), aliases compared too
  - Persons: both name forms are queried and the result lists unioned, filtered
    to instance-of human (Q5); a score tie between two entities yields no match
  - Organisations: filtered to organisation/institution
  - Places: filtered to geographic entity; besides the Ortsindex the pass
    covers the place strings of the Verknuepfungstabelle (AF-07)
  - Works: P31 type filter plus a binding P86 check against the composer named
    in the Werkindex
  - Identifiers already present in the indexes are verified rather than skipped
  - Confidence levels: exact (100), alias (95), fuzzy_high (>=90),
    fuzzy_low (>=80)

Usage:
    python scripts/reconcile.py [--dry-run] [--type person|org|location|work]
                                [--force] [--min-confidence 80]
"""

import sys
import json
import re
import time
import argparse
import unicodedata
import urllib.request
import urllib.parse
import urllib.error
import pandas as pd
from datetime import datetime
from pathlib import Path
from thefuzz import fuzz

from _common import OUTPUT_DIR, SHEETS_DIR, load_index

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

OUTPUT_FILE = OUTPUT_DIR / "wikidata-reconciliation.json"

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
USER_AGENT = "m3gim-research/1.0 (https://dhcraft.org/m3gim; office@dhcraft.org)"
REQUEST_DELAY = 0.5  # seconds between requests (rate limiting)
MIN_NAME_LENGTH = 3  # skip short names (abbreviations, initials)

QID_PATTERN = re.compile(r"^Q\d+$")

FUZZY_HIGH_THRESHOLD = 90
FUZZY_LOW_THRESHOLD = 80
ALIAS_MATCH_SCORE = 95  # an alias hit stays below the exact label hit

# Composer comparison uses token_sort_ratio, because token_set_ratio would rate
# a bare surname alias ("Strauss") as a full match. Calibrated against the
# attested stock: lowest correct value 91, highest wrong one 72.
COMPOSER_MATCH_THRESHOLD = 85

# Instance-of (P31) values used for filtering
Q_HUMAN = "Q5"
Q_GEOGRAPHIC = {"Q515", "Q486972", "Q1549591", "Q3957", "Q6256", "Q35657"}
# Q515=city, Q486972=human settlement, Q1549591=municipality, Q3957=town,
# Q6256=country, Q35657=state

Q_ORGANIZATION = {"Q43229", "Q4830453", "Q3918", "Q7075", "Q31855",
                   "Q2385804", "Q24354", "Q57660343"}
# Q43229=organization, Q4830453=business, Q3918=university, Q7075=library,
# Q31855=research institute, Q2385804=musical ensemble,
# Q24354=theater, Q57660343=opera house

Q_MUSICAL_WORK = {"Q58483083", "Q105543609", "Q785522", "Q781815",
                   "Q15079786", "Q58483088", "Q1344", "Q7366", "Q9730"}
# Derived empirically from the P31 values of the attested work entities
# (data/reports/identifier-proposals-works.md, checked via wbgetentities):
# Q58483083=dramatic-musical work (carries practically every opera),
# Q105543609=musical work/composition, Q785522=Italian opera,
# Q781815=Passion, Q15079786=ballet, Q58483088=choreographic work.
# Q1344=opera, Q7366=song, Q9730=classical music remain as rare, not-disproven
# work classes.
# Removed because attested as misassigning: Q7725634=literary work (source text
# instead of setting), Q482994=album (recording instead of work),
# Q188451=music genre (category instead of work).


_CLAIMS_CACHE: dict = {}
_NAMES_CACHE: dict = {}


def clear_caches() -> None:
    """Clears the entity caches (tests, repeated runs)."""
    _CLAIMS_CACHE.clear()
    _NAMES_CACHE.clear()


def _api_request(params: dict) -> dict:
    """One Wikidata request with the project user agent and a rate-limit pause."""
    url = f"{WIKIDATA_API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    time.sleep(REQUEST_DELAY)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_wikidata(query: str, language: str = "de", limit: int = 5) -> list:
    """Searches entities via the Wikidata Search API."""
    try:
        data = _api_request({
            "action": "wbsearchentities",
            "search": query,
            "language": language,
            "limit": str(limit),
            "format": "json",
        })
        return data.get("search", [])
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print(f"  [WARN] API-Fehler fuer '{query}': {e}")
        return []


def get_entity_claims(qid: str) -> dict:
    """Fetches the claims (P31, P86 etc.) for an entity."""
    if qid in _CLAIMS_CACHE:
        return _CLAIMS_CACHE[qid]
    try:
        data = _api_request({
            "action": "wbgetentities",
            "ids": qid,
            "props": "claims",
            "format": "json",
        })
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return {}  # do not cache a failure
    claims = data.get("entities", {}).get(qid, {}).get("claims", {})
    _CLAIMS_CACHE[qid] = claims
    return claims


def get_entity_names(qid: str) -> list:
    """Labels and aliases of an entity across all languages.

    No language filter, because the composer comparison depends on the
    transliteration variants that, depending on the person, are maintained as
    aliases in different languages.
    """
    if qid in _NAMES_CACHE:
        return _NAMES_CACHE[qid]
    try:
        data = _api_request({
            "action": "wbgetentities",
            "ids": qid,
            "props": "labels|aliases",
            "format": "json",
        })
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
        return []
    entity = data.get("entities", {}).get(qid, {})
    names = {v["value"] for v in entity.get("labels", {}).values()}
    for alias_group in entity.get("aliases", {}).values():
        names |= {a["value"] for a in alias_group}
    result = sorted(names)
    _NAMES_CACHE[qid] = result
    return result


def get_claim_ids(claims: dict, prop: str) -> list:
    """Extracts the entity Q-IDs of a property from claims."""
    result = []
    for claim in claims.get(prop, []):
        value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        if isinstance(value, dict) and "id" in value:
            result.append(value["id"])
    return result


def get_instance_of(claims: dict) -> set:
    """Extracts all P31 (instance-of) Q-IDs from claims."""
    return set(get_claim_ids(claims, "P31"))


def is_exact_match(search_name: str, result_label: str) -> bool:
    """Checks whether the name matches exactly (case-insensitive)."""
    return search_name.strip().lower() == result_label.strip().lower()


def result_names(result: dict) -> tuple[str, list]:
    """Label and name variants of a wbsearchentities hit.

    On an alias hit the API returns the matched alias form in the label field
    whenever the entity has no label in the query language; only ``match.type``
    tells alias and preferred form apart reliably.
    """
    match = result.get("match") or {}
    matched_text = (match.get("text") or "").strip()
    label = (result.get("label") or "").strip()
    variants = [a.strip() for a in (result.get("aliases") or []) if a]
    if matched_text:
        variants.append(matched_text)
    if (match.get("type") == "alias" and matched_text
            and is_exact_match(label, matched_text)):
        label = ""
    return label, variants


def compute_match_level(search_name: str, result_label: str,
                        min_confidence: int = FUZZY_LOW_THRESHOLD,
                        aliases=()) -> tuple[str | None, int]:
    """Rates match quality between search name, WD label and alias forms.

    Returns: (level, score)
      level: 'exact', 'alias', 'fuzzy_high', 'fuzzy_low', or None
      score: 0-100 similarity value
    """
    if result_label and is_exact_match(search_name, result_label):
        return ('exact', 100)

    for alias in aliases:
        if alias and is_exact_match(search_name, alias):
            return ('alias', ALIAS_MATCH_SCORE)

    needle = search_name.lower()
    score = fuzz.token_set_ratio(needle, result_label.lower()) if result_label else 0
    # Aliases via token_sort_ratio: alias lists carry composite forms
    # ("Werk. Incipit") whose word superset would score 100 under
    # token_set_ratio and crowd out the sought work.
    for alias in aliases:
        if alias:
            score = max(score, fuzz.token_sort_ratio(needle, alias.lower()))

    if score >= FUZZY_HIGH_THRESHOLD:
        return ('fuzzy_high', score)
    if score >= min_confidence:
        return ('fuzzy_low', score)
    return (None, score)


def check_type(qid: str, expected_types) -> bool:
    """Checks whether an entity has the expected P31 type."""
    instances = get_instance_of(get_entity_claims(qid))
    if isinstance(expected_types, str):
        return expected_types in instances
    return bool(instances & expected_types)


def normalize_name(name: str) -> str:
    """Diacritics-free lowercase form for the name comparison."""
    decomposed = unicodedata.normalize("NFKD", name or "")
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", stripped.replace("ß", "ss").lower()).strip()


def invert_name(name: str) -> str:
    """'Surname, given name' into natural name order."""
    parts = (name or "").split(",", 1)
    if len(parts) == 2:
        return f"{parts[1].strip()} {parts[0].strip()}"
    return (name or "").strip()


def composer_matches(qid: str, komponist: str) -> bool:
    """Checks the entity's P86 against the composer named in the Werkindex.

    Binding once the index names a composer: an entity without P86 or with a
    diverging composer counts as unconfirmed.
    """
    if not komponist:
        return True
    composers = get_claim_ids(get_entity_claims(qid), "P86")
    if not composers:
        return False
    wanted = normalize_name(invert_name(komponist))
    for composer_qid in composers:
        for variant in get_entity_names(composer_qid):
            if fuzz.token_sort_ratio(wanted, normalize_name(variant)) >= \
                    COMPOSER_MATCH_THRESHOLD:
                return True
    return False


# ---------------------------------------------------------------------------
# Reconciliation functions per type
# ---------------------------------------------------------------------------

def search_all(queries: list) -> list:
    """Unions the result lists of several searches, without duplicates."""
    results = []
    seen = set()
    for query in queries:
        for r in search_wikidata(query, language="de"):
            qid = r.get("id", "")
            if qid and qid not in seen:
                seen.add(qid)
                results.append(r)
    return results


def select_match(results: list, names: list, expected_types,
                 min_confidence: int = FUZZY_LOW_THRESHOLD,
                 confirm=None) -> dict | None:
    """Waehlt den Treffer mit der hoechsten Punktzahl, der alle Pruefungen besteht.

    Geprueft wird von der hoechsten Punktzahl abwaerts, damit nur die
    aussichtsreichen Kandidaten Abfragen kosten. Bestehen mehrere
    Entitaeten derselben Punktzahl alle Pruefungen, entsteht kein Treffer:
    die Reihenfolge der Wikidata-Suche wuerde sonst die prominentere
    Namensgleiche waehlen.
    """
    scored = []
    for r in results:
        qid = r.get("id", "")
        label, variants = result_names(r)
        best_level, best_score = None, 0
        for name in names:
            level, score = compute_match_level(name, label, min_confidence,
                                               variants)
            if level and score > best_score:
                best_level, best_score = level, score
        if best_level:
            display = label or (variants[0] if variants else "")
            scored.append((best_score, best_level, qid, display))

    for score in sorted({entry[0] for entry in scored}, reverse=True):
        tier = [e for e in scored if e[0] == score]
        confirmed = [
            e for e in tier
            if check_type(e[2], expected_types)
            and (confirm is None or confirm(e[2]))
        ]
        if len(confirmed) == 1:
            _, level, qid, display = confirmed[0]
            return {"qid": qid, "label": display,
                    "match": level, "confidence": score}
        if len(confirmed) > 1:
            print(f"  [AMBIG {score}: {', '.join(e[2] for e in confirmed)}]",
                  end=" ")
            return None
    return None


def reconcile_person(name: str, min_confidence: int = FUZZY_LOW_THRESHOLD,
                     **_) -> dict | None:
    """Reconciliation fuer Personen: Name → Q-ID mit Fuzzy-Matching + Q5.

    Beide Namensformen werden abgefragt und die Trefferlisten vereinigt.
    Die Komma-Form trifft bei kanonischen Personen die Lexikonartikel,
    die Person selbst steht nur in der invertierten Form.
    """
    candidates = [name]
    inverted = invert_name(name)
    if inverted and inverted != name:
        candidates.append(inverted)

    return select_match(search_all(candidates), candidates, Q_HUMAN,
                        min_confidence)


def reconcile_simple(name: str, expected_types: set,
                     min_confidence: int = FUZZY_LOW_THRESHOLD,
                     **_) -> dict | None:
    """Generische Reconciliation mit Fuzzy-Matching + P31-Typfilter."""
    return select_match(search_wikidata(name, language="de"), [name],
                        expected_types, min_confidence)


def reconcile_work(name: str, komponist: str = None,
                   min_confidence: int = FUZZY_LOW_THRESHOLD,
                   **_) -> dict | None:
    """Reconciliation fuer Werke: P31-Typfilter + bindende P86-Pruefung.

    Fuehrt der Werkindex einen Komponisten, muss die Entitaet ihn als P86
    ausweisen; sonst bleibt der Titel ohne Identifikator. Damit scheiden
    gleichnamige Werke fremder Komponisten aus.
    """
    queries = []
    if komponist:
        queries.append(f"{name} {komponist}")
    queries.append(name)

    confirm = (lambda qid: composer_matches(qid, komponist)) if komponist else None
    return select_match(search_all(queries), [name], Q_MUSICAL_WORK,
                        min_confidence, confirm=confirm)


def verify_existing_qid(qid: str, expected_types, komponist: str = None) -> dict:
    """Prueft eine schon im Index stehende Kennung gegen Wikidata.

    Returns: {"verified": bool, "reason": str}
    """
    value = (qid or "").strip()
    if not QID_PATTERN.match(value):
        return {"verified": False, "reason": "keine Q-ID"}

    claims = get_entity_claims(value)
    if not claims:
        return {"verified": False, "reason": "Entitaet nicht abrufbar"}

    if not check_type(value, expected_types):
        instances = ", ".join(sorted(get_instance_of(claims))) or "fehlt"
        return {"verified": False, "reason": f"Typ passt nicht (P31 {instances})"}

    if komponist and not composer_matches(value, komponist):
        return {"verified": False,
                "reason": f"Komponist nicht bestaetigt ({komponist})"}

    return {"verified": True, "reason": ""}


# ---------------------------------------------------------------------------
# Ortsnamen der Verknuepfungstabelle
# ---------------------------------------------------------------------------

VERKNUEPFUNGEN_DIR = "verknuepfungen"
_HAS_LETTER = re.compile(r"[^\W\d_]", re.UNICODE)


def verknuepfungen_place_names(known: set) -> list:
    """Place names of the link table that no Ortsindex row carries (AF-07).

    The link table names its places as raw strings, so a place without an
    index row was never reconciled. Only the segment before the first comma
    is taken: the trailing part is a date or a street address, and Wikidata
    carries no entity for either (AF-03). Strings without a letter are dates
    that leaked into the place column and are dropped here rather than sent
    to the API.
    """
    directory = SHEETS_DIR / VERKNUEPFUNGEN_DIR
    if not directory.is_dir():
        return []
    seen = set(known)
    names = []
    for path in sorted(directory.glob("Box_*.csv")):
        df = pd.read_csv(path, dtype=str, encoding="utf-8-sig")
        columns = {str(c).strip().lower(): c for c in df.columns}
        if "typ" not in columns or "name" not in columns:
            continue
        for _, row in df.iterrows():
            typ = str(row.get(columns["typ"], "")).strip().lower()
            if not typ.startswith("ort"):
                continue
            raw = str(row.get(columns["name"], "")).strip()
            name = raw.split(",", 1)[0].strip()
            if len(name) < MIN_NAME_LENGTH or not _HAS_LETTER.search(name):
                continue
            if name.lower() in seen:
                continue
            seen.add(name.lower())
            names.append(name)
    return sorted(names)


# ---------------------------------------------------------------------------
# Index-Konfiguration (ersetzt den Duplikat-Code)
# ---------------------------------------------------------------------------

# Header-Shift-Korrekturen kommen aus _common.py (INDEX_HEADER_SHIFTS).

INDEX_CONFIG = [
    {
        "type": "person",
        "label": "Personenindex",
        "index_name": "Personenindex",
        "reconcile_fn": reconcile_person,
        "expected_types": Q_HUMAN,
        "extra_fields": [],
    },
    {
        "type": "org",
        "label": "Organisationsindex",
        "index_name": "Organisationsindex",
        "reconcile_fn": lambda name, min_confidence=FUZZY_LOW_THRESHOLD, **kw: reconcile_simple(name, Q_ORGANIZATION, min_confidence=min_confidence),
        "expected_types": Q_ORGANIZATION,
        "extra_fields": [],
    },
    {
        "type": "location",
        "label": "Ortsindex",
        "index_name": "Ortsindex",
        "reconcile_fn": lambda name, min_confidence=FUZZY_LOW_THRESHOLD, **kw: reconcile_simple(name, Q_GEOGRAPHIC, min_confidence=min_confidence),
        "expected_types": Q_GEOGRAPHIC,
        "extra_fields": [],
    },
    {
        "type": "work",
        "label": "Werkindex",
        "index_name": "Werkindex",
        "reconcile_fn": reconcile_work,
        "expected_types": Q_MUSICAL_WORK,
        "extra_fields": ["komponist"],
    },
]


# ---------------------------------------------------------------------------
# Caching: vorhandene Ergebnisse laden
# ---------------------------------------------------------------------------

def load_previous_results() -> dict:
    """Laedt vorhandene Reconciliation-Ergebnisse als Cache.

    Returns dict mit:
      matched_keys: set of (type, name) Tupeln
      unmatched_keys: set of (type, name) Tupeln
      matched_data: dict (type, name) → vollstaendiger Match-Eintrag
    """
    empty = {"matched_keys": set(), "unmatched_keys": set(), "matched_data": {}}
    if not OUTPUT_FILE.exists():
        return empty

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    result = {
        "matched_keys": set(),
        "unmatched_keys": set(),
        "matched_data": {},
    }
    for m in data.get("matched", []):
        key = (m["type"], m["name"])
        result["matched_keys"].add(key)
        result["matched_data"][key] = m
    for u in data.get("unmatched", []):
        result["unmatched_keys"].add((u["type"], u["name"]))

    return result


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def run_reconciliation(entity_types: list, dry_run: bool = False,
                       force: bool = False,
                       min_confidence: int = FUZZY_LOW_THRESHOLD):
    """Fuehrt die Reconciliation durch."""

    # Cache laden (ueberspringbare Namen)
    cache = load_previous_results() if not force else {
        "matched_keys": set(), "unmatched_keys": set(), "matched_data": {}
    }
    cached_count = 0

    results = {
        "meta": {
            "date": datetime.now().isoformat(),
            "strategy": "fuzzy_match_with_confidence",
            "min_name_length": MIN_NAME_LENGTH,
            "min_confidence": min_confidence,
            "thresholds": {
                "exact": 100,
                "fuzzy_high": FUZZY_HIGH_THRESHOLD,
                "fuzzy_low": FUZZY_LOW_THRESHOLD,
            },
        },
        "matched": [],
        "unmatched": [],
        "skipped": [],
    }

    # Vorhandene Matches aus Cache uebernehmen (damit sie nicht verloren gehen)
    if not force and OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            prev = json.load(f)
        # Nur Matches uebernehmen, die nicht im aktuellen Lauf neu abgefragt werden
        for m in prev.get("matched", []):
            if m["type"] not in entity_types:
                results["matched"].append(m)
        for u in prev.get("unmatched", []):
            if u["type"] not in entity_types:
                results["unmatched"].append(u)
        for s in prev.get("skipped", []):
            if s["type"] not in entity_types:
                results["skipped"].append(s)

    for cfg in INDEX_CONFIG:
        etype = cfg["type"]
        if etype not in entity_types:
            continue

        print(f"\n=== {cfg['label']} ===")
        df = load_index(SHEETS_DIR, cfg["index_name"])
        if df is None or df.empty:
            print(f"  [SKIP] {cfg['index_name']} nicht gefunden")
            continue

        # Spaltennamen ermitteln
        name_col = "name" if "name" in df.columns else df.columns[1]
        wd_col = "wikidata_id" if "wikidata_id" in df.columns else None

        rows = [row for _, row in df.iterrows()]
        if etype == "location":
            known = {str(r.get(name_col, "")).strip().lower() for r in rows}
            rows += [{name_col: n} for n in verknuepfungen_place_names(known)]

        for row in rows:
            name = str(row.get(name_col, "")).strip()
            existing_wd = str(row.get(wd_col, "")).strip() if wd_col else ""

            if not name or name == "nan":
                continue

            # Extra-Felder sammeln (z.B. komponist fuer Werke)
            extra = {}
            for field in cfg["extra_fields"]:
                val = str(row.get(field, "")).strip()
                extra[field] = val if val != "nan" else None

            # Bereits im Index verknuepft: keine Suche, aber eine Pruefung
            # der vorhandenen Kennung
            if existing_wd and existing_wd != "nan" and existing_wd != "":
                entry = {"type": etype, "name": name,
                         "existing_qid": existing_wd}
                if not dry_run:
                    entry["verification"] = verify_existing_qid(
                        existing_wd, cfg["expected_types"],
                        komponist=extra.get("komponist"))
                results["skipped"].append(entry)
                verdict = entry.get("verification") or {}
                if verdict.get("verified", True):
                    print(f"  [SKIP] {name} — bereits {existing_wd}")
                else:
                    print(f"  [PRUEF] {name} — {existing_wd} fraglich: "
                          f"{verdict['reason']}")
                continue

            # Mindestlaenge pruefen (verhindert False Positives bei Kuerzeln)
            if len(name) < MIN_NAME_LENGTH:
                results["skipped"].append({
                    "type": etype, "name": name,
                    "existing_qid": f"zu kurz ({len(name)} Zeichen)"
                })
                print(f"  [SKIP] {name} — zu kurz ({len(name)} Zeichen)")
                continue

            # Cache-Hit: bereits abgefragt, Ergebnis wiederverwenden
            cache_key = (etype, name)
            if cache_key in cache["matched_keys"]:
                prev_match = cache["matched_data"].get(cache_key)
                if prev_match:
                    results["matched"].append(prev_match)
                    cached_count += 1
                    print(f"  [CACHE] {name} → {prev_match['qid']}")
                    continue
            if cache_key in cache["unmatched_keys"]:
                results["unmatched"].append({"type": etype, "name": name})
                cached_count += 1
                print(f"  [CACHE] {name} → kein Match")
                continue

            # Anzeige
            display = name
            if extra.get("komponist"):
                display = f"{name} ({extra['komponist']})"
            print(f"  [SEARCH] {display}...", end=" ", flush=True)

            if dry_run:
                print("→ [DRY RUN]")
                continue

            match = cfg["reconcile_fn"](name, min_confidence=min_confidence,
                                          **extra)
            time.sleep(REQUEST_DELAY)

            if match:
                entry = {"type": etype, "name": name, **extra, **match}
                results["matched"].append(entry)
                print(f"→ {match['qid']} ({match['match']})")
            else:
                entry = {"type": etype, "name": name}
                if extra:
                    entry.update(extra)
                results["unmatched"].append(entry)
                print("→ kein Match")

    # --- Ergebnis speichern (nicht im Dry-Run) ---
    if not dry_run:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

    # --- Zusammenfassung ---
    print(f"\n{'='*60}")
    print(f"Ergebnis:")
    print(f"  Matches:      {len(results['matched'])}")
    print(f"  Kein Match:   {len(results['unmatched'])}")
    print(f"  Uebersprungen: {len(results['skipped'])}")
    if cached_count > 0:
        print(f"  Aus Cache:    {cached_count}")
    if not dry_run:
        print(f"\nGespeichert: {OUTPUT_FILE}")

    unverified = [s for s in results["skipped"]
                  if s.get("verification") and not s["verification"]["verified"]]
    if unverified:
        print(f"\n  Fragliche vorhandene Kennungen: {len(unverified)}")
        for s in unverified:
            print(f"    {s['type']}: {s['name']} — {s['existing_qid']} "
                  f"({s['verification']['reason']})")

    if not dry_run and results["matched"]:
        print(f"\nNaechster Schritt:")
        print(f"  Pipeline neu ausfuehren: python scripts/transform.py")
        print(f"  (transform.py liest {OUTPUT_FILE.name} automatisch)")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="M³GIM Wikidata-Reconciliation"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Nur Namen auflisten, keine API-Abfragen"
    )
    parser.add_argument(
        "--type", choices=["person", "org", "location", "work"],
        help="Nur einen bestimmten Typ reconcilen"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Cache ignorieren, alle Namen neu abfragen"
    )
    parser.add_argument(
        "--min-confidence", type=int, default=FUZZY_LOW_THRESHOLD,
        help=f"Minimale Confidence (0-100, default: {FUZZY_LOW_THRESHOLD})"
    )
    args = parser.parse_args()

    entity_types = [args.type] if args.type else [
        "person", "org", "location", "work"
    ]

    print("M³GIM Wikidata-Reconciliation")
    print(f"Strategie: Fuzzy-Matching (min. Confidence {args.min_confidence}), "
          f"min. {MIN_NAME_LENGTH} Zeichen")
    if args.dry_run:
        print("[DRY RUN — keine API-Abfragen]")
    if args.force:
        print("[FORCE — Cache wird ignoriert]")

    run_reconciliation(entity_types, dry_run=args.dry_run, force=args.force,
                       min_confidence=args.min_confidence)


if __name__ == "__main__":
    main()
