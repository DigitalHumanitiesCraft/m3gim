"""Unit-Tests fuer die Reconciliation-Logik aus scripts/reconcile.py.

Deckt die fuenf Ursachen der systematischen Fehlzuordnungen ab, die
data/reports/identifier-proposals-works.md und
data/reports/identifier-proposals-persons.md belegen:

  1. Typfilter der Werke (Q_MUSICAL_WORK ohne die Opernklasse)
  2. Komponistenpruefung (angekuendigt, nie bindend)
  3. Alias-Vergleich (nur Label verglichen, Alias als Label gelesen)
  4. Vorhandene Kennungen (uebersprungen, nie geprueft)
  5. Personensuche (Abbruch nach der Komma-Form, Rangfolge bei Gleichstand)

Offline. Alle Wikidata-Antworten in diesem Modul sind Aufzeichnungen vom
2026-08-22, abgerufen ueber wbsearchentities und wbgetentities mit der
Projekt-Kennung. Kein Test greift auf das Netz zu.
"""

import sys
from pathlib import Path

import pytest

# scripts/reconcile.py importierbar machen
SCRIPTS = Path(__file__).parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import reconcile  # noqa: E402


PROJECT_USER_AGENT = (
    "m3gim-research/1.0 (https://dhcraft.org/m3gim; office@dhcraft.org)"
)


# ---------------------------------------------------------------------------
# Aufzeichnung 1: P31 der belegten Werk-Entitaeten
#
# Quelle: die als "gesichert"/"wahrscheinlich" belegten Vorschlaege und die
# belegten Ersatz-Identifikatoren aus identifier-proposals-works.md, jeweils
# ueber wbgetentities abgerufen. (P31-Liste, Label).
# ---------------------------------------------------------------------------

CONFIRMED_WORK_TYPES = {
    "Q5064": (['Q58483083'], "Die Zauberflöte"),
    "Q11989": (['Q105543609'], "9. Sinfonie"),
    "Q19005": (['Q58483083'], "Madama Butterfly"),
    "Q23085": (['Q58483083'], "Lohengrin"),
    "Q50956": (['Q58483083'], "Eugen Onegin"),
    "Q171277": (['Q58483083'], "Aida"),
    "Q185968": (['Q58483083'], "Carmen"),
    "Q186162": (['Q58483083', 'Q785522'], "La traviata"),
    "Q189234": (['Q58483083'], "Rigoletto"),
    "Q192039": (['Q58483083'], "Don Giovanni"),
    "Q201873": (['Q58483083'], "Le nozze di Figaro"),
    "Q203470": (['Q58483083'], "Il trovatore"),
    "Q207410": (['Q58483083'], "Così fan tutte"),
    "Q207875": (['Q105543609'], "Requiem"),
    "Q220340": (['Q58483083'], "Parsifal"),
    "Q221047": (['Q58483083'], "Pique Dame"),
    "Q221757": (['Q58483083'], "Un ballo in maschera"),
    "Q223502": (['Q105543609'], "3. Sinfonie"),
    "Q249749": (['Q58483083'], "Herzog Blaubarts Burg"),
    "Q253376": (['Q58483083'], "Der Wildschütz"),
    "Q270785": (['Q105543609'], "8. Sinfonie"),
    "Q272029": (['Q58483083'], "Götterdämmerung"),
    "Q318455": (['Q58483083'], "Falstaff"),
    "Q320363": (['Q58483083'], "Macbeth"),
    "Q324319": (['Q58483083'], "Die Walküre"),
    "Q379111": (['Q781815'], "Matthäus-Passion"),
    "Q386846": (['Q58483083'], "Boris Godunow"),
    "Q390779": (['Q58483083'], "Arabella"),
    "Q432984": (['Q105543609'], "Alt-Rhapsodie"),
    "Q465540": (['Q58483083'], "Die Meistersinger von Nürnberg"),
    "Q471240": (['Q58483083'], "Der Rosenkavalier"),
    "Q527447": (['Q58483083'], "Spinnstube"),
    "Q560619": (['Q58483083'], "Tannhäuser"),
    "Q578526": (['Q58483083'], "La clemenza di Tito"),
    "Q642010": (['Q105543609'], "Weihnachts-Oratorium"),
    "Q643347": (['Q105543609'], "Stabat Mater"),
    "Q660836": (['Q105543609'], "Missa in angustiis"),
    "Q723407": (['Q58483083', 'Q7725634'], "Salome"),
    "Q723776": (['Q58483083'], "Orfeo ed Euridice"),
    "Q723790": (['Q105543609'], "Missa Solemnis"),
    "Q731927": (['Q58483083'], "Elektra"),
    "Q748840": (['Q58483083'], "La Gioconda"),
    "Q778788": (['Q105543609'], "Stabat Mater"),
    "Q846646": (['Q105543609'], "Das Lied von der Erde"),
    "Q865333": (['Q105543609'], "Johannes-Passion"),
    "Q875563": (['Q58483083'], "Giulio Cesare"),
    "Q917711": (['Q58483083'], "Chowanschtschina"),
    "Q970337": (['Q105543609'], "Die Jahreszeiten"),
    "Q1034949": (['Q58483083'], "Capriccio"),
    "Q1157012": (['Q105543609'], "Die Geschöpfe des Prometheus"),
    "Q1165496": (['Q58483083'], "Daphne"),
    "Q1170035": (['Q105543609'], "Das Paradies und die Peri"),
    "Q1193192": (['Q58483083'], "Der Evangelimann"),
    "Q1322339": (['Q58483083'], "Katja Kabanowa"),
    "Q1324254": (['Q58483083'], "Tristan und Isolde"),
    "Q1329006": (['Q105543609'], "Elias"),
    "Q1331995": (['Q105543609'], "Ellens dritter Gesang"),
    "Q1356210": (['Q105543609'], "Messa da Requiem"),
    "Q1472748": (['Q105543609'], "Messe f-Moll"),
    "Q1543168": (['Q105543609'], "Krönungsmesse"),
    "Q1545849": (['Q58483083'], "Vanessa"),
    "Q1924059": (['Q105543609'], "Messe Nr. 6 Es-Dur"),
    "Q2521679": (['Q15079786'], "Les Noces"),
    "Q2630833": (['Q58483088'], "Pulcinella"),
    "Q3567675": (['Q105543609'], "When Lilacs Last in the Dooryard Bloom'd"),
    "Q11296115": (['Q105543609'], "Ganymed"),
    "Q19896118": (['Q105543609'], "Spanisches Liederbuch"),
    "Q11493224": ([], "Vergin, tutto amor"),
}

# Belegte Fehlzuordnungen, die allein am Typ scheitern: literarische
# Vorlage, Tonaufnahme, Gattungsbegriff und thematisch Fremdes.
TYPE_FALSE_POSITIVES = {
    "Q729645": (['Q482994'], "Clarity"),
    "Q1213668": (['Q7725634'], "Die Jahreszeiten"),
    "Q3510792": (['Q482994'], "Don Giovanni"),
    "Q6941842": (['Q188451', 'Q107487333'], "Requiem"),
    "Q19183563": (['Q7725634'], "Die junge Magd"),
    "Q25218531": (['Q7725634'], "La Gioconda"),
    "Q33056195": (['Q7725634'], "Nachtstück"),
    "Q51806381": (['Q7725634'], "Lohengrin"),
    "Q85756466": (['Q482994'], "Der Rosenkavalier"),
    "Q85776062": (['Q482994'], "Le nozze di Figaro"),
    "Q86670408": (['Q482994'], "Pulcinella"),
    "Q110953165": (['Q7725634'], "Wilhelm Meisters Lehrjahre. Heiss mich nicht reden"),
    "Q115127657": (['Q482994'], "Tristan und Isolde"),
    "Q190891": (['Q77358734'], "zentrierte Fünfeckszahl"),
    "Q210080": (['Q7725634', 'Q1147354'], "Stabat mater"),
    "Q309823": (['Q49773'], "Offene Wissenschaft"),
    "Q674832": (['Q7725634'], "Carmen"),
}

# Belegte Fehlzuordnungen, die der Typfilter nicht fangen kann: echte
# musikalische Werke des falschen Komponisten. Sie gehoeren zur
# Komponistenpruefung, nicht zum Typfilter.
COMPOSER_FALSE_POSITIVES = {
    "Q790310": (['Q105543609'], "Ave Maria"),
    "Q3221001": (['Q105543609'], "Le chant de la terre"),
    "Q60992362": (['Q105543609'], "Regentropfen"),
    "Q64732249": (['Q105543609'], "Un ballo in maschera"),
    "Q106280609": (['Q105543609'], "Johannespassion"),
}


# ---------------------------------------------------------------------------
# Aufzeichnung 2: wbsearchentities-Antworten (language=de, limit=5)
# ---------------------------------------------------------------------------

RECORDED_SEARCH = {
    'Weber, Ludwig': [
        {'id': 'Q136748514', 'label': 'Weber, Ludwig',
         'match': {'type': 'alias', 'language': 'de', 'text': 'Weber, Ludwig'}},
    ],
    'Evgenij Onegin': [
        {'id': 'Q50956', 'label': 'Eugene Onegin',
         'description': 'opera by Pyotr Ilyich Tchaikovsky',
         'match': {'type': 'alias', 'language': 'de', 'text': 'Evgenij Onegin'},
         'aliases': ['Evgenij Onegin']},
        {'id': 'Q56220553', 'label': 'Evgenij Onegin',
         'match': {'type': 'label', 'language': 'en', 'text': 'Evgenij Onegin'}},
        {'id': 'Q50962', 'label': 'Eugene Onegin',
         'description': '1911 Russian film directed by Vasily Goncharov',
         'match': {'type': 'label', 'language': 'hr', 'text': 'Evgenij Onegin'},
         'aliases': ['Evgenij Onegin']},
        {'id': 'Q50961', 'label': 'Eugene Onegin',
         'description': '1959 Soviet opera film directed by Roman Tikhomirov',
         'match': {'type': 'label', 'language': 'it', 'text': 'Evgenij Onegin (film 1958)'},
         'aliases': ['Evgenij Onegin (film 1958)']},
    ],
    'Bach, Johann Sebastian': [
        {'id': 'Q23939877', 'label': 'Bach, Johann Sebastian (ADB)',
         'description': 'entry in the Allgemeine Deutsche Biographie',
         'match': {'type': 'label', 'language': 'de', 'text': 'Bach, Johann Sebastian (ADB)'}},
        {'id': 'Q28003252', 'label': 'Bach, Johann Sebastian',
         'description': 'encyclopedic article in Dictionary of Music and Musicians, 1900',
         'match': {'type': 'label', 'language': 'en', 'text': 'Bach, Johann Sebastian'}},
        {'id': 'Q1341631', 'label': 'Notebook for Anna Magdalena Bach',
         'description': 'two manuscript notebooks that Johann Sebastian Bach presented to his second wife',
         'match': {'type': 'alias', 'language': 'en',
                   'text': 'Bach, Johann Sebastian, 1685-1750. Notenbüchlein für Anna Magdalena Bach (1725)'},
         'aliases': ['Bach, Johann Sebastian, 1685-1750. Notenbüchlein für Anna Magdalena Bach (1725)']},
        {'id': 'Q75278', 'label': 'Es reißet euch ein schrecklich Ende, BWV 90',
         'description': 'church cantata by Johann Sebastian Bach',
         'match': {'type': 'alias', 'language': 'en',
                   'text': 'Bach, Johann Sebastian, 1685-1750. Es reisset euch ein schrecklich Ende'},
         'aliases': ['Bach, Johann Sebastian, 1685-1750. Es reisset euch ein schrecklich Ende']},
        {'id': 'Q3490100', 'label': 'Sonata in C major for flute or recorder and basso continuo',
         'description': 'flute sonata composed by Johann Sebastian Bach',
         'match': {'type': 'alias', 'language': 'en',
                   'text': 'Bach, Johann Sebastian, 1685-1750. Sonatas, flute, harpsichord, no. 4, C major'},
         'aliases': ['Bach, Johann Sebastian, 1685-1750. Sonatas, flute, harpsichord, no. 4, C major']},
    ],
    'Johann Sebastian Bach': [
        {'id': 'Q1339', 'label': 'Johann Sebastian Bach',
         'description': 'German composer (1685–1750)',
         'match': {'type': 'label', 'language': 'de', 'text': 'Johann Sebastian Bach'}},
        {'id': 'Q638391', 'label': 'Johann Sebastian Bach',
         'description': 'German painter, grandson of the composer (1748–1778)',
         'match': {'type': 'label', 'language': 'de', 'text': 'Johann Sebastian Bach'}},
        {'id': 'Q46993637', 'label': 'Portrait of Bach',
         'description': 'painting by Haussmann 1746',
         'match': {'type': 'alias', 'language': 'de', 'text': 'Johann Sebastian Bach'},
         'aliases': ['Johann Sebastian Bach']},
        {'id': 'Q214203', 'label': 'Bach-Werke-Verzeichnis',
         'description': 'catalogue identifying compositions by Johann Sebastian Bach',
         'match': {'type': 'alias', 'language': 'de', 'text': 'Johann Sebastian Bachs Werke'},
         'aliases': ['Johann Sebastian Bachs Werke']},
        {'id': 'Q105821980', 'label': 'Johann Sebastian Bach The Learned Musician',
         'description': 'Biography by Christoph Wolff',
         'match': {'type': 'label', 'language': 'de', 'text': 'Johann Sebastian Bach'},
         'aliases': ['Johann Sebastian Bach']},
    ],
    # Die Komma-Form liefert fuer Dermota gar nichts.
    'Dermota, Anton': [],
    'Anton Dermota': [
        {'id': 'Q12784779', 'label': 'Anton Dermota', 'description': 'Slovene politician',
         'match': {'type': 'label', 'language': 'de', 'text': 'Anton Dermota'}},
        {'id': 'Q588808', 'label': 'Anton Dermota', 'description': 'Slovenian opera singer (1910–1989)',
         'match': {'type': 'label', 'language': 'de', 'text': 'Anton Dermota'}},
        {'id': 'Q12784780', 'label': 'Anton Dermota', 'description': 'Wikimedia disambiguation page',
         'match': {'type': 'label', 'language': 'de', 'text': 'Anton Dermota'}},
    ],
    # Titel + Komponist findet nichts; wbsearchentities sucht auf Labels
    # und Aliassen, nicht im Volltext.
    'Un ballo in maschera Verdi, Giuseppe': [],
    'Un ballo in maschera': [
        {'id': 'Q221757', 'label': 'Un ballo in maschera', 'description': 'opera by Giuseppe Verdi',
         'match': {'type': 'label', 'language': 'de', 'text': 'Un ballo in maschera'}},
        {'id': 'Q64732249', 'label': 'Un ballo in maschera',
         'description': 'composition by Johann Strauss II',
         'match': {'type': 'label', 'language': 'de', 'text': 'Un ballo in maschera'}},
        {'id': 'Q3297216', 'label': 'Masquerade',
         'description': 'verse play written in 1835 by Mikhail Lermontov',
         'match': {'type': 'label', 'language': 'it', 'text': 'Un ballo in maschera'},
         'aliases': ['Un ballo in maschera']},
        {'id': 'Q55177541', 'label': 'Un ballo in maschera',
         'match': {'type': 'label', 'language': 'it', 'text': 'Un ballo in maschera'}},
        {'id': 'Q47088443', 'label': 'Un ballo in maschera',
         'match': {'type': 'label', 'language': 'it', 'text': 'Un ballo in maschera'}},
    ],
    # Der Werktitel steht bei der Oper nur als Alias, waehrend eine Arie
    # ihn als Bestandteil eines laengeren Alias fuehrt.
    'Le nozze di Figaro Mozart, Wolfgang Amadeus': [],
    'Le nozze di Figaro': [
        {'id': 'Q201873', 'label': 'The Marriage of Figaro',
         'description': 'opera by Wolfgang Amadeus Mozart',
         'match': {'type': 'label', 'language': 'de', 'text': 'Le nozze di Figaro'},
         'aliases': ['Le nozze di Figaro']},
        {'id': 'Q112130444', 'label': 'Le nozze di Figaro',
         'description': 'production of Opernhaus Zurich during the season 2021-2022',
         'match': {'type': 'label', 'language': 'de', 'text': 'Le nozze di Figaro'}},
        {'id': 'Q109002275', 'label': 'Le nozze di Figaro',
         'description': 'lyric comedy in 3 acts composed by Mario Mariotti',
         'match': {'type': 'label', 'language': 'en', 'text': 'Le nozze di Figaro'}},
        {'id': 'Q7049139', 'label': 'Non più andrai',
         'description': 'aria from the opera The Marriage of Figaro by W.A. Mozart',
         'match': {'type': 'alias', 'language': 'de',
                   'text': "Le nozze di Figaro. Hör' mein Fleh'n"},
         'aliases': ["Le nozze di Figaro. Hör' mein Fleh'n"]},
        {'id': 'Q85776062', 'label': 'Le nozze di Figaro',
         'description': '1982 studio album by Georg Solti',
         'match': {'type': 'label', 'language': 'en', 'text': 'Le nozze di Figaro'}},
    ],
    'Carmen Bizet, Georges': [],
    'Carmen': [
        {'id': 'Q1043619', 'label': 'Carmen', 'description': 'female given name',
         'match': {'type': 'label', 'language': 'de', 'text': 'Carmen'}},
        {'id': 'Q241239', 'label': 'Carmen',
         'description': 'municipality of the Philippines in the province of Bohol',
         'match': {'type': 'label', 'language': 'de', 'text': 'Carmen'}},
        {'id': 'Q674832', 'label': 'Carmen', 'description': '1845 novel by Prosper Mérimée',
         'match': {'type': 'label', 'language': 'de', 'text': 'Carmen'}},
        {'id': 'Q315882', 'label': 'Carmen',
         'description': 'municipality of the Philippines in the province of Cebu',
         'match': {'type': 'label', 'language': 'de', 'text': 'Carmen'}},
        {'id': 'Q315144', 'label': 'Carmen',
         'description': 'municipality of the Philippines in the province of Cotabato',
         'match': {'type': 'label', 'language': 'de', 'text': 'Carmen'}},
    ],
}


# ---------------------------------------------------------------------------
# Aufzeichnung 3: Claims (P31, P86) der beteiligten Entitaeten
# ---------------------------------------------------------------------------

RECORDED_CLAIMS = {
    'Q1043619': {'P31': ['Q11879590']},
    'Q105821980': {'P31': ['Q571']},
    'Q12784779': {'P31': ['Q5']},
    'Q12784780': {'P31': ['Q4167410']},
    'Q1339': {'P31': ['Q5']},
    'Q1341631': {'P31': ['Q87167', 'Q17489659', 'Q105543609'], 'P86': ['Q1339', 'Q76428']},
    'Q136748514': {'P31': ['Q5']},
    'Q190891': {'P31': ['Q77358734']},
    'Q214203': {'P31': ['Q5051330']},
    'Q221757': {'P31': ['Q58483083'], 'P86': ['Q7317']},
    'Q23939877': {'P31': ['Q19389637']},
    'Q241239': {'P31': ['Q24764']},
    'Q28003252': {'P31': ['Q13433827']},
    'Q309823': {'P31': ['Q49773']},
    'Q315144': {'P31': ['Q24764']},
    'Q315882': {'P31': ['Q24764']},
    'Q3297216': {'P31': ['Q7725634']},
    'Q3490100': {'P31': ['Q105543609'], 'P86': ['Q1339']},
    'Q46993637': {'P31': ['Q3305213']},
    'Q47088443': {'P31': ['Q47467768']},
    'Q50956': {'P31': ['Q58483083'], 'P86': ['Q7315']},
    'Q50961': {'P31': ['Q11424'], 'P86': ['Q7315']},
    'Q50962': {'P31': ['Q24862']},
    'Q55177541': {'P31': ['Q47467768']},
    'Q56220553': {'P31': ['Q47467768']},
    'Q588808': {'P31': ['Q5']},
    'Q638391': {'P31': ['Q5']},
    'Q64732249': {'P31': ['Q105543609'], 'P86': ['Q83309']},
    'Q674832': {'P31': ['Q7725634']},
    'Q723407': {'P31': ['Q58483083', 'Q7725634']},
    'Q729645': {'P31': ['Q482994']},
    'Q7049139': {'P31': ['Q105543609'], 'P86': ['Q254']},
    'Q85776062': {'P31': ['Q482994']},
    'Q109002275': {'P31': ['Q58483083'], 'P86': ['Q61060476']},
    'Q112130444': {'P31': ['Q43099500']},
    'Q201873': {'P31': ['Q58483083'], 'P86': ['Q254']},
    'Q75278': {'P31': ['Q105543609'], 'P86': ['Q1339']},
}

# Labels und Aliase der beteiligten Komponisten-Entitaeten (Auszug der
# lateinschriftlichen Formen). Q83309 traegt den blossen Nachnamen
# "Strauss" als Alias — daran haengt die Kalibrierung des Vergleichs.
RECORDED_NAMES = {
    'Q7317': ['Giuseppe Verdi', 'Giuseppe Fortunino Francesco Verdi', 'Verdi',
              'Cuzeppe Verdi', 'Iosephus Verdi'],
    'Q83309': ['Johann Strauss II', 'Johann Strauss the Younger', 'Strauss',
               'J. Strauss', 'Johann Baptist Strauss', 'Strauss II'],
    'Q7315': ['Pjotr Iljitsch Tschaikowski', 'Pyotr Ilyich Tchaikovsky',
              'Pëtr Ilʹič Čajkovskij', 'Tschaikowski'],
    'Q1339': ['Johann Sebastian Bach', 'Bach', 'J. S. Bach'],
    'Q254': ['Wolfgang Amadeus Mozart', 'Mozart', 'Wolfgang Amadè Mozart'],
    'Q61060476': ['Mario Mariotti'],
    'Q13894': ['Richard Strauss', 'Richard Georg Strauss', 'Strauss'],
}


def _as_claims(simple: dict) -> dict:
    """Baut die wbgetentities-Claim-Struktur aus der kompakten Aufzeichnung."""
    return {
        prop: [{"mainsnak": {"datavalue": {"value": {"id": qid}}}} for qid in qids]
        for prop, qids in simple.items()
    }


@pytest.fixture
def offline(monkeypatch):
    """Ersetzt jeden Netzweg durch die Aufzeichnung, ohne Rate-Limit-Pause."""
    monkeypatch.setattr(reconcile.time, "sleep", lambda *_: None)

    def _search(query, language="de", limit=5):
        if query not in RECORDED_SEARCH:
            raise AssertionError(f"Keine Aufzeichnung fuer Suchanfrage {query!r}")
        return [dict(r) for r in RECORDED_SEARCH[query]]

    def _claims(qid):
        return _as_claims(RECORDED_CLAIMS.get(qid, {}))

    monkeypatch.setattr(reconcile, "search_wikidata", _search)
    monkeypatch.setattr(reconcile, "get_entity_claims", _claims)
    # raising=False: vor der Reparatur gibt es get_entity_names noch nicht,
    # der Test soll am Defekt scheitern und nicht am Fixture.
    monkeypatch.setattr(reconcile, "get_entity_names",
                        lambda qid: list(RECORDED_NAMES.get(qid, [])),
                        raising=False)
    if hasattr(reconcile, "clear_caches"):
        reconcile.clear_caches()
    yield
    if hasattr(reconcile, "clear_caches"):
        reconcile.clear_caches()


# ---------------------------------------------------------------------------
# Kennung der Abfragen
# ---------------------------------------------------------------------------

def test_requests_carry_the_project_user_agent(monkeypatch):
    """Jede Wikidata-Abfrage traegt die vereinbarte Projekt-Kennung."""
    seen = []

    class _Resp:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def read(self):
            return b'{"search": []}'

    def _urlopen(req, timeout=None):
        seen.append(req.get_header("User-agent"))
        return _Resp()

    monkeypatch.setattr(reconcile.time, "sleep", lambda *_: None)
    monkeypatch.setattr(reconcile.urllib.request, "urlopen", _urlopen)

    reconcile.search_wikidata("Aida")

    assert seen == [PROJECT_USER_AGENT]


# ---------------------------------------------------------------------------
# Ursache 1: Typfilter der Werke
# ---------------------------------------------------------------------------

def test_work_type_filter_accepts_every_confirmed_work_class():
    """Jede belegte Werkentitaet passiert den Typfilter."""
    rejected = [
        (qid, label, p31)
        for qid, (p31, label) in CONFIRMED_WORK_TYPES.items()
        if p31 and not set(p31) & reconcile.Q_MUSICAL_WORK
    ]
    assert not rejected, (
        "Typfilter weist belegte Werke ab: "
        + ", ".join(f"{q} {lab} (P31 {p})" for q, lab, p in rejected)
    )


def test_work_type_filter_rejects_source_recording_and_genre():
    """Vorlage, Tonaufnahme und Gattungsbegriff passieren den Typfilter nicht."""
    accepted = [
        (qid, label, p31)
        for qid, (p31, label) in TYPE_FALSE_POSITIVES.items()
        if set(p31) & reconcile.Q_MUSICAL_WORK
    ]
    assert not accepted, (
        "Typfilter laesst belegte Fehlzuordnungen durch: "
        + ", ".join(f"{q} {lab} (P31 {p})" for q, lab, p in accepted)
    )


# ---------------------------------------------------------------------------
# Ursache 2: Komponistenpruefung
# ---------------------------------------------------------------------------

def test_work_rejects_exact_title_hit_with_wrong_composer(offline):
    """Ein exakter Titeltreffer des falschen Komponisten wird abgewiesen."""
    match = reconcile.reconcile_work("Un ballo in maschera",
                                     komponist="Verdi, Giuseppe")
    assert match is None or match["qid"] != "Q64732249", (
        "Quadrille von Johann Strauss II als Verdi-Oper uebernommen"
    )


def test_work_matches_the_opera_the_index_composer_confirms(offline):
    """Der Treffer ist die Verdi-Oper, nicht die gleichnamige Quadrille."""
    match = reconcile.reconcile_work("Un ballo in maschera",
                                     komponist="Verdi, Giuseppe")
    assert match is not None
    assert match["qid"] == "Q221757"


def test_work_alias_variant_does_not_outrank_the_work(offline):
    """Ein laengerer Alias mit demselben Wortbestand schlaegt das Werk nicht.

    Die Oper traegt den Quelltitel als Alias, die Arie als Bestandteil
    eines laengeren Alias. Ein Vergleich ueber die Wortmenge wertet beide
    gleich hoch und laesst die Arie gewinnen.
    """
    match = reconcile.reconcile_work("Le nozze di Figaro",
                                     komponist="Mozart, Wolfgang Amadeus")
    assert match is not None
    assert match["qid"] == "Q201873"


def test_work_composer_check_separates_namesakes(offline):
    """Der blosse Nachname als Alias bestaetigt den Komponisten nicht."""
    assert reconcile.composer_matches("Q64732249", "Strauss, Johann") is True
    assert reconcile.composer_matches("Q64732249", "Strauss, Richard") is False


def test_work_without_confirmable_type_returns_no_match(offline):
    """Ohne Komponistenangabe bleibt der Typfilter die einzige Schranke."""
    match = reconcile.reconcile_work("Carmen", komponist=None)
    assert match is None or match["qid"] != "Q674832", (
        "Mérimées Novelle als Werk uebernommen"
    )


# ---------------------------------------------------------------------------
# Ursache 3: Alias-Vergleich
# ---------------------------------------------------------------------------

def test_alias_hit_does_not_count_as_exact_label_match():
    """Ein Alias-Treffer erreicht nicht die Punktzahl eines Labeltreffers."""
    hit = RECORDED_SEARCH["Weber, Ludwig"][0]
    label, aliases = reconcile.result_names(hit)
    level, score = reconcile.compute_match_level("Weber, Ludwig", label,
                                                 aliases=aliases)
    assert level != "exact"
    assert score < 100


def test_alias_is_compared_so_transliterated_titles_match():
    """Der Einheits- oder Transliterationstitel wird ueber den Alias erkannt."""
    hit = RECORDED_SEARCH["Evgenij Onegin"][0]
    label, aliases = reconcile.result_names(hit)
    level, score = reconcile.compute_match_level("Evgenij Onegin", label,
                                                 aliases=aliases)
    assert level == "alias"
    assert score >= reconcile.FUZZY_HIGH_THRESHOLD


# ---------------------------------------------------------------------------
# Ursache 4: vorhandene Kennungen
# ---------------------------------------------------------------------------

def test_existing_identifier_of_wrong_type_is_flagged(offline):
    """Eine vorhandene Kennung des falschen Typs wird als ungeprueft erkannt."""
    verdict = reconcile.verify_existing_qid("Q190891", "work",
                                            komponist="Wagner, Richard")
    assert verdict["verified"] is False
    assert verdict["reason"]


def test_malformed_existing_identifier_is_flagged(offline):
    """Ein Wert, der keine Q-ID ist, faellt auf."""
    verdict = reconcile.verify_existing_qid("Frankfurt am Main", "location")
    assert verdict["verified"] is False


def test_run_verifies_identifiers_taken_from_the_index(offline, monkeypatch,
                                                       tmp_path):
    """Der Lauf prueft die Kennungen der uebersprungenen Zeilen.

    Laeuft gegen den echten Werkindex, aber mit aufgezeichneten Antworten
    und einem eigenen Ausgabeziel; die Normdatendateien bleiben unberuehrt.
    """
    monkeypatch.setattr(reconcile, "OUTPUT_FILE",
                        tmp_path / "reconciliation.json")
    monkeypatch.setattr(reconcile, "search_wikidata",
                        lambda query, language="de", limit=5: [])

    results = reconcile.run_reconciliation(["work"])

    verdicts = {
        entry["name"]: entry["verification"]
        for entry in results["skipped"]
        if entry.get("verification")
    }
    assert verdicts, "Kein Prüfergebnis zu den vorhandenen Kennungen"

    # Drei belegte Fehlwerte aus dem Werkindex, ein belegter Richtigwert.
    assert verdicts["Die Meistersinger von Nürnberg"]["verified"] is False
    assert verdicts["Julius Cäsar"]["verified"] is False
    assert verdicts["Orfeo ed Euridice"]["verified"] is False
    assert verdicts["Salome"]["verified"] is True


# ---------------------------------------------------------------------------
# Ursache 5: Personensuche
# ---------------------------------------------------------------------------

def test_person_search_tries_the_inverted_name_form(offline, monkeypatch):
    """Beide Namensformen werden abgefragt, auch wenn die erste Treffer hat."""
    asked = []

    def _search(query, language="de", limit=5):
        asked.append(query)
        return [dict(r) for r in RECORDED_SEARCH.get(query, [])]

    monkeypatch.setattr(reconcile, "search_wikidata", _search)

    reconcile.reconcile_person("Bach, Johann Sebastian")

    assert asked == ["Bach, Johann Sebastian", "Johann Sebastian Bach"]


def test_person_does_not_prefer_the_prominent_namesake(offline):
    """Bei Punktgleichstand entsteht kein Treffer statt des prominenteren."""
    match = reconcile.reconcile_person("Dermota, Anton")
    assert match is None or match["qid"] != "Q12784779", (
        "slowenischer Jurist als Tenor uebernommen"
    )
    assert match is None, "Gleichstand zweier Namensträger darf nicht entschieden werden"
