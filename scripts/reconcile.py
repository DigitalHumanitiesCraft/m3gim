#!/usr/bin/env python3
"""
M³GIM Reconcile — Wikidata-Reconciliation für Indizes.

Liest die 4 Index-Tabellen (Personen, Organisationen, Orte, Werke),
fragt die Wikidata Search API ab und traegt Q-IDs ein.
Ergebnisse werden als JSON-Datei gespeichert, die von transform.py
bei der naechsten Pipeline-Ausfuehrung uebernommen wird.

Strategie:
  - Exakte Label-Treffer bevorzugt, Alias-Treffer eine Stufe darunter
  - Fuzzy-Matching als Fallback (thefuzz token_set_ratio), Aliase
    werden mitverglichen
  - Personen: beide Namensformen werden abgefragt und die Trefferlisten
    vereinigt, Filterung auf instance-of human (Q5); bei Punktgleichstand
    zweier Entitaeten entsteht kein Treffer
  - Organisationen: Filterung auf organisation/institution
  - Orte: Filterung auf geographic entity
  - Werke: P31-Typfilter plus bindende P86-Pruefung gegen den im
    Werkindex gefuehrten Komponisten
  - Kennungen, die schon in den Indizes stehen, werden geprueft statt
    uebersprungen
  - Confidence-Level: exact (100), alias (95), fuzzy_high (>=90),
    fuzzy_low (>=80)

Verwendung:
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

from _common import INDEX_HEADER_SHIFTS

# Windows-Konsole: UTF-8 erzwingen
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent.parent
SHEETS_DIR = BASE_DIR / "data" / "google-spreadsheet"
OUTPUT_FILE = BASE_DIR / "data" / "output" / "wikidata-reconciliation.json"

# ---------------------------------------------------------------------------
# Wikidata API
# ---------------------------------------------------------------------------

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
USER_AGENT = "m3gim-research/1.0 (https://dhcraft.org/m3gim; office@dhcraft.org)"
REQUEST_DELAY = 0.5  # Sekunden zwischen Anfragen (Rate Limiting)
MIN_NAME_LENGTH = 3  # Kurze Namen (Kuerzel, Initialien) ueberspringen

QID_PATTERN = re.compile(r"^Q\d+$")

# Fuzzy-Matching Schwellenwerte
FUZZY_HIGH_THRESHOLD = 90
FUZZY_LOW_THRESHOLD = 80
ALIAS_MATCH_SCORE = 95  # Alias-Treffer bleibt unter dem exakten Labeltreffer

# Komponistenabgleich: token_sort_ratio, weil token_set_ratio einen
# blossen Nachnamen-Alias ("Strauss") als volle Uebereinstimmung wertet.
# Kalibriert am belegten Bestand: niedrigster richtiger Wert 91,
# hoechster falscher 72.
COMPOSER_MATCH_THRESHOLD = 85

# Instance-of (P31) Werte fuer Filterung
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
# Empirisch aus den P31-Werten der belegten Werkentitaeten
# (data/reports/identifier-proposals-works.md, ueber wbgetentities geprueft):
# Q58483083=dramatisch-musikalisches Werk (traegt praktisch jede Oper),
# Q105543609=musikalisches Werk/Komposition, Q785522=italienische Oper,
# Q781815=Passion, Q15079786=Ballett, Q58483088=choreografisches Werk.
# Q1344=Oper, Q7366=Lied, Q9730=klassische Musik bleiben als seltene,
# nicht widerlegte Werkklassen stehen.
# Entfernt, weil belegt fehlzuordnend: Q7725634=literarisches Werk (Vorlage
# statt Vertonung), Q482994=Album (Tonaufnahme statt Werk),
# Q188451=Musikgenre (Gattung statt Werk).


_CLAIMS_CACHE: dict = {}
_NAMES_CACHE: dict = {}


def clear_caches() -> None:
    """Leert die Entitaets-Caches (Tests, wiederholte Laeufe)."""
    _CLAIMS_CACHE.clear()
    _NAMES_CACHE.clear()


def _api_request(params: dict) -> dict:
    """Eine Wikidata-Anfrage mit Projekt-Kennung und Rate-Limit-Pause."""
    url = f"{WIKIDATA_API}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    time.sleep(REQUEST_DELAY)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_wikidata(query: str, language: str = "de", limit: int = 5) -> list:
    """Sucht Entitaeten ueber die Wikidata Search API."""
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
    """Holt die Claims (P31, P86 etc.) fuer eine Entitaet."""
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
        return {}  # Fehlschlag nicht cachen
    claims = data.get("entities", {}).get(qid, {}).get("claims", {})
    _CLAIMS_CACHE[qid] = claims
    return claims


def get_entity_names(qid: str) -> list:
    """Labels und Aliase einer Entitaet in allen Sprachen.

    Ohne Sprachfilter, weil der Komponistenabgleich auf die
    Transliterationsvarianten angewiesen ist, die je nach Person in
    unterschiedlichen Sprachen als Alias gepflegt sind.
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
    """Extrahiert die Entitaets-Q-IDs einer Property aus Claims."""
    result = []
    for claim in claims.get(prop, []):
        value = claim.get("mainsnak", {}).get("datavalue", {}).get("value", {})
        if isinstance(value, dict) and "id" in value:
            result.append(value["id"])
    return result


def get_instance_of(claims: dict) -> set:
    """Extrahiert alle P31 (instance-of) Q-IDs aus Claims."""
    return set(get_claim_ids(claims, "P31"))


def is_exact_match(search_name: str, result_label: str) -> bool:
    """Prueft ob der Name exakt uebereinstimmt (case-insensitive)."""
    return search_name.strip().lower() == result_label.strip().lower()


def result_names(result: dict) -> tuple[str, list]:
    """Label und Namensvarianten eines wbsearchentities-Treffers.

    Bei einem Alias-Treffer liefert die API die getroffene Aliasform im
    Label-Feld, sobald die Entitaet in der Abfragesprache kein Label hat;
    nur ``match.type`` unterscheidet Alias und Ansetzung zuverlaessig.
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
    """Bewertet Match-Qualitaet zwischen Suchname, WD-Label und Aliasformen.

    Returns: (level, score)
      level: 'exact', 'alias', 'fuzzy_high', 'fuzzy_low', oder None
      score: 0-100 Aehnlichkeitswert
    """
    if result_label and is_exact_match(search_name, result_label):
        return ('exact', 100)

    for alias in aliases:
        if alias and is_exact_match(search_name, alias):
            return ('alias', ALIAS_MATCH_SCORE)

    needle = search_name.lower()
    score = fuzz.token_set_ratio(needle, result_label.lower()) if result_label else 0
    # Aliase mit token_sort_ratio: Aliaslisten fuehren zusammengesetzte
    # Formen ("Werk. Incipit"), deren Wortobermenge mit token_set_ratio
    # 100 ergaebe und das gesuchte Werk verdraengte.
    for alias in aliases:
        if alias:
            score = max(score, fuzz.token_sort_ratio(needle, alias.lower()))

    if score >= FUZZY_HIGH_THRESHOLD:
        return ('fuzzy_high', score)
    if score >= min_confidence:
        return ('fuzzy_low', score)
    return (None, score)


def check_type(qid: str, expected_types) -> bool:
    """Prueft ob eine Entitaet den erwarteten P31-Typ hat."""
    instances = get_instance_of(get_entity_claims(qid))
    if isinstance(expected_types, str):
        return expected_types in instances
    return bool(instances & expected_types)


def normalize_name(name: str) -> str:
    """Diakritika-freie Kleinschreibung fuer den Namensvergleich."""
    decomposed = unicodedata.normalize("NFKD", name or "")
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", stripped.replace("ß", "ss").lower()).strip()


def invert_name(name: str) -> str:
    """'Nachname, Vorname' zur natuerlichen Namensfolge."""
    parts = (name or "").split(",", 1)
    if len(parts) == 2:
        return f"{parts[1].strip()} {parts[0].strip()}"
    return (name or "").strip()


def composer_matches(qid: str, komponist: str) -> bool:
    """Prueft P86 der Entitaet gegen den im Werkindex gefuehrten Komponisten.

    Verbindlich, sobald der Index einen Komponisten fuehrt: eine Entitaet
    ohne P86 oder mit abweichendem Komponisten gilt als nicht bestaetigt.
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
# Reconciliation-Funktionen pro Typ
# ---------------------------------------------------------------------------

def search_all(queries: list) -> list:
    """Vereinigt die Trefferlisten mehrerer Suchanfragen, ohne Dubletten."""
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
# Index-Konfiguration (ersetzt den Duplikat-Code)
# ---------------------------------------------------------------------------

# Header-Shift-Korrekturen kommen aus _common.py (INDEX_HEADER_SHIFTS).

INDEX_CONFIG = [
    {
        "type": "person",
        "label": "Personenindex",
        "filename": "M3GIM-Personenindex.xlsx",
        "shift_key": None,
        "reconcile_fn": reconcile_person,
        "expected_types": Q_HUMAN,
        "extra_fields": [],
    },
    {
        "type": "org",
        "label": "Organisationsindex",
        "filename": "M3GIM-Organisationsindex.xlsx",
        "shift_key": "organisationsindex",
        "reconcile_fn": lambda name, min_confidence=FUZZY_LOW_THRESHOLD, **kw: reconcile_simple(name, Q_ORGANIZATION, min_confidence=min_confidence),
        "expected_types": Q_ORGANIZATION,
        "extra_fields": [],
    },
    {
        "type": "location",
        "label": "Ortsindex",
        "filename": "M3GIM-Ortsindex.xlsx",
        "shift_key": "ortsindex",
        "reconcile_fn": lambda name, min_confidence=FUZZY_LOW_THRESHOLD, **kw: reconcile_simple(name, Q_GEOGRAPHIC, min_confidence=min_confidence),
        "expected_types": Q_GEOGRAPHIC,
        "extra_fields": [],
    },
    {
        "type": "work",
        "label": "Werkindex",
        "filename": "M3GIM-Werkindex.xlsx",
        "shift_key": "werkindex",
        "reconcile_fn": reconcile_work,
        "expected_types": Q_MUSICAL_WORK,
        "extra_fields": ["komponist"],
    },
]


def load_index(filename: str, shift_key: str = None) -> pd.DataFrame:
    """Laedt eine Index-Tabelle mit optionaler Header-Shift-Korrektur."""
    path = SHEETS_DIR / filename
    if not path.exists():
        print(f"  [SKIP] {filename} nicht gefunden")
        return pd.DataFrame()

    df = pd.read_excel(path)

    if shift_key and shift_key in INDEX_HEADER_SHIFTS:
        expected = INDEX_HEADER_SHIFTS[shift_key]
        if len(df.columns) >= len(expected):
            first_row = df.iloc[0].tolist()
            df.columns = expected + list(df.columns[len(expected):])
            first_df = pd.DataFrame([first_row], columns=df.columns)
            df = pd.concat([first_df, df.iloc[1:]], ignore_index=True)

    return df


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
        df = load_index(cfg["filename"], shift_key=cfg["shift_key"])
        if df.empty:
            continue

        # Spaltennamen ermitteln
        name_col = "name" if "name" in df.columns else df.columns[1]
        wd_col = "wikidata_id" if "wikidata_id" in df.columns else None

        for _, row in df.iterrows():
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
