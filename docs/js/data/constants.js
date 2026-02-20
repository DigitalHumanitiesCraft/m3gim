/**
 * M³GIM Static Data & Constants
 * Ported from scripts/build-views.py
 */

// =========================================================================
// Komponisten-Mapping (keyword in title → composer name)
// =========================================================================

export const KOMPONISTEN_MAPPING = {
  // Wagner
  'ring': 'Wagner', 'nibelungen': 'Wagner', 'walküre': 'Wagner',
  'rheingold': 'Wagner', 'siegfried': 'Wagner', 'götterdämmerung': 'Wagner',
  'meistersinger': 'Wagner', 'tristan': 'Wagner', 'parsifal': 'Wagner',
  'lohengrin': 'Wagner', 'tannhäuser': 'Wagner',
  'fricka': 'Wagner', 'waltraute': 'Wagner', 'erda': 'Wagner', 'brangäne': 'Wagner',
  // Verdi
  'aida': 'Verdi', 'amneris': 'Verdi', 'trovatore': 'Verdi',
  'azucena': 'Verdi', 'maskenball': 'Verdi', 'ulrica': 'Verdi',
  'don carlos': 'Verdi', 'eboli': 'Verdi',
  // Strauss
  'rosenkavalier': 'Strauss', 'octavian': 'Strauss', 'ariadne': 'Strauss',
  'elektra': 'Strauss', 'klytämnestra': 'Strauss', 'frau ohne schatten': 'Strauss',
  // Gluck/Händel
  'orpheus': 'Gluck/Händel', 'orfeo': 'Gluck/Händel',
  'julius cäsar': 'Gluck/Händel', 'händel': 'Gluck/Händel', 'gluck': 'Gluck/Händel',
  // Beethoven
  'fidelio': 'Beethoven', 'beethoven': 'Beethoven',
};

// Normalize variant composer names from JSON-LD to canonical form
export const KOMPONISTEN_NORMALISIERUNG = {
  'wagner, richard': 'Wagner', 'wagner': 'Wagner', 'richard wagner': 'Wagner',
  'verdi, giuseppe': 'Verdi', 'verdi': 'Verdi', 'giuseppe verdi': 'Verdi',
  'strauss, richard': 'Strauss', 'strauss': 'Strauss', 'richard strauss': 'Strauss',
  'beethoven, ludwig van': 'Beethoven', 'beethoven, ludwig von': 'Beethoven',
  'beethoven': 'Beethoven', 'ludwig van beethoven': 'Beethoven',
  'gluck, christoph willibald': 'Gluck/Händel', 'gluck/händel': 'Gluck/Händel',
  'händel, georg friedrich': 'Gluck/Händel',
  'mozart, wolfgang amadeus': 'Mozart', 'mozart': 'Mozart',
  'wolf, hugo': 'Wolf', 'hugo wolf': 'Wolf',
  'brahms, johannes': 'Brahms', 'brahms': 'Brahms',
  'schubert, franz': 'Schubert', 'schubert': 'Schubert',
  'hindemith, paul': 'Hindemith', 'hindemith': 'Hindemith',
  'bizet, georges': 'Bizet', 'bizet': 'Bizet',
  'tschaikowsky, peter': 'Tschaikowsky', 'tschaikowsky': 'Tschaikowsky',
  'mahler, gustav': 'Mahler', 'mahler': 'Mahler',
  'barwinsky, wolodymyr': 'Barwinsky', 'barwinsky': 'Barwinsky',
};

export const KOMPONISTEN_FARBEN = {
  'Wagner': '#6B2C2C',
  'Verdi': '#2C5C3F',
  'Strauss': '#4A3A6B',
  'Gluck/Händel': '#8B7355',
  'Beethoven': '#4A5A7A',
  'Mozart': '#5A3D6B',
  'Wolf': '#6B5A3D',
  'Brahms': '#3D5A6B',
  'Andere': '#757575',
};

// =========================================================================
// Personen-Kategorien (keyword in name → category)
// =========================================================================

export const PERSONEN_KATEGORIEN = {
  // Komponisten (before Dirigenten so specific names match first)
  'beethoven': 'Komponist', 'verdi': 'Komponist', 'mozart': 'Komponist',
  'brahms': 'Komponist', 'schubert': 'Komponist', 'wolf, hugo': 'Komponist',
  'mahler': 'Komponist', 'bizet': 'Komponist', 'tschaikowsky': 'Komponist',
  'barwinsky': 'Komponist', 'puccini': 'Komponist',
  // Dirigenten
  'karajan': 'Dirigent', 'böhm': 'Dirigent', 'knappertsbusch': 'Dirigent',
  'furtwängler': 'Dirigent', 'krauss': 'Dirigent', 'krauß': 'Dirigent',
  'solti': 'Dirigent', 'kempe': 'Dirigent', 'kolessa': 'Dirigent',
  'hindemith': 'Dirigent',
  // Regisseure — specific names before generic 'wagner'
  'wieland wagner': 'Regisseur', 'wolfgang wagner': 'Regisseur',
  'wagner, siegfried': 'Regisseur',
  'felsenstein': 'Regisseur', 'hartmann': 'Regisseur',
  // Now Wagner/Strauss/Gluck/Händel as Komponist (after specific Wagner family members)
  'wagner': 'Komponist', 'strauss': 'Komponist', 'gluck': 'Komponist', 'händel': 'Komponist',
  // Korrepetitoren
  'werba': 'Korrepetitor', 'baumgartner': 'Korrepetitor',
  // Vermittler
  'taubman': 'Vermittler', 'taubmann': 'Vermittler',
  // Kollegen
  'ludwig': 'Kollege', 'jurinac': 'Kollege', 'della casa': 'Kollege',
  'nilsson': 'Kollege', 'vickers': 'Kollege', 'windgassen': 'Kollege',
  'hotter': 'Kollege', 'rehfuss': 'Kollege', 'callas': 'Kollege',
};

// Normalize variant person names to canonical form
// Keys are lowercase, matching is done on lowercased input
export const PERSONEN_NORMALISIERUNG = {
  // Hartmann variants
  'hartmann, prof.': 'Hartmann, Rudolf',
  'hartmann, rudolf': 'Hartmann, Rudolf',
  // Taubmann variants (single-n and double-n)
  'taubman, martin hugo': 'Taubmann, Martin Hugo',
  'taubmann, martin hugo': 'Taubmann, Martin Hugo',
  'taubmann, frau': 'Taubmann, Martin Hugo',
  // Dermota variants
  'dermota': 'Dermota, Anton',
  'dermotas, anton': 'Dermota, Anton',
  'dermota, anton': 'Dermota, Anton',
  // Dönch variants
  'dönch, carl': 'Dönch, Karl',
  'dönch, karl': 'Dönch, Karl',
  // Gostic/Gostič
  'gostic, josef': 'Gostič, Josef',
  'gostič, josef': 'Gostič, Josef',
  // Guthrie variants
  'guthrie, frederic': 'Guthrie, Frederick',
  'guthrie, frederick': 'Guthrie, Frederick',
  // Krauss/Krauß
  'krauß, clemens': 'Krauss, Clemens',
  'krauss, clemens': 'Krauss, Clemens',
  // Kupper variants
  'kupper, annelies': 'Kupper, Anneliese',
  'kupper, anneliese': 'Kupper, Anneliese',
  // Majkut/Maykut
  'maykut, erich': 'Majkut, Erich',
  'majkut, erich': 'Majkut, Erich',
  // Metternich typo
  'metternicz, josef': 'Metternich, Josef',
  'metternich, josef': 'Metternich, Josef',
  // Schmidt-Garre typo
  'schmidt-gasse, helmut': 'Schmidt-Garre, Helmut',
  'schmidt-garre, helmut': 'Schmidt-Garre, Helmut',
  // Verdi typo
  'verdi, guiseppe': 'Verdi, Giuseppe',
  // Kusche lowercase
  'kusche, benno': 'Kusche, Benno',
  // Kurt, Kuhlmann (reversed)
  'kurt, kuhlmann': 'Kuhlmann, Kurt',
  // Felbermayer hyphen error
  'felberma-yers, anny': 'Felbermayer, Anny',
  // Wagner typo
  'wagner, siegfied': 'Wagner, Siegfried',
  // Wehrli extra period
  'wehrli., dr.': 'Wehrli, Dr.',
  // Levinger period instead of comma
  'levinger. dr. henry w.': 'Levinger, Dr. Henry W.',
};

// Composer names to exclude from person matrix (they are composers, not network contacts)
export const KOMPONISTEN_NAMEN = new Set([
  'wagner', 'verdi', 'strauss', 'beethoven', 'mozart', 'brahms',
  'schubert', 'wolf', 'gluck', 'händel', 'hindemith', 'bizet',
  'tschaikowsky', 'mahler', 'barwinsky', 'puccini', 'weber',
]);

export const PERSONEN_FARBEN = {
  'Komponist': '#6B2C2C',
  'Dirigent': '#4A6E96',
  'Regisseur': '#6B4E8C',
  'Korrepetitor': '#8B7355',
  'Vermittler': '#3D7A5A',
  'Kollege': '#9A6B3D',
  'Andere': '#757575',
};

// =========================================================================
// Dokumenttyp Labels
// =========================================================================

export const DOKUMENTTYP_LABELS = {
  'brief': 'Brief',
  'programmheft': 'Programmheft',
  'plakat': 'Plakat',
  'rezension': 'Rezension',
  'zeitungsausschnitt': 'Zeitungsausschnitt',
  'vertrag': 'Vertrag',
  'konvolut': 'Konvolut',
  'quittung': 'Quittung',
  'biographie': 'Biographie',
  'typoskript': 'Typoskript',
  'ausweis': 'Ausweis',
  'dokument': 'Dokument',
  'photokopie': 'Photokopie',
  'notiz': 'Notiz',
  'visitenkarte': 'Visitenkarte',
  'tontraeger': 'Tonträger',
  'telegramm': 'Telegramm',
  'postkarte': 'Postkarte',
  'fotografie': 'Fotografie',
  'urkunde': 'Urkunde',
  'noten': 'Noten',
  'manuskript': 'Manuskript',
  'rechnung': 'Rechnung',
  'sammlung': 'Sammlung',
  'korrespondenz': 'Korrespondenz',
};

// =========================================================================
// 5-Year Periods for Matrix
// =========================================================================

export const ZEITRAEUME = [
  '1940-1944', '1945-1949', '1950-1954', '1955-1959',
  '1960-1964', '1965-1969', '1970-1974',
];

