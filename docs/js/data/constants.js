/**
 * M³GIM Static Data & Constants
 * Ported from scripts/build-views.py
 */

// =========================================================================
// Person categories (keyword in name → category)
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
  // Regisseure — specific names before generic 'wagner'.
  // Keys carry the dataset spelling "Nachname, Vorname"; getPersonKategorie
  // compares with includes() on the lowercased name, so 'wieland wagner'
  // never matched and both directors fell through to 'Komponist'.
  'wagner, wieland': 'Regisseur', 'wagner, wolfgang': 'Regisseur',
  'wagner, siegfried': 'Regisseur',
  'felsenstein': 'Regisseur', 'hartmann': 'Regisseur',
  // Now Wagner/Strauss/Gluck/Händel as Komponist (after specific Wagner family members)
  'wagner': 'Komponist', 'strauss': 'Komponist', 'gluck': 'Komponist', 'händel': 'Komponist',
  // Archivsubjekt
  'malaniuk': 'Archivsubjekt',
  // Korrepetitoren
  'werba': 'Korrepetitor', 'baumgartner': 'Korrepetitor',
  // Vermittler
  'taubman': 'Vermittler', 'taubmann': 'Vermittler',
  // Kollegen
  'ludwig': 'Kollege', 'jurinac': 'Kollege', 'della casa': 'Kollege',
  'nilsson': 'Kollege', 'vickers': 'Kollege', 'windgassen': 'Kollege',
  'hotter': 'Kollege', 'rehfuss': 'Kollege', 'callas': 'Kollege',
};

// =========================================================================
// Place colour coding — recurring places carry a constant colour across all
// views (recognition, design.md § Ortsfarbcodierung). Values live as
// --color-ort-* tokens in variables.css. Unlisted places return null, the
// caller then picks its own default.
// =========================================================================

const ORT_COLOR = {
  'Wien':     'var(--color-ort-wien)',
  'Graz':     'var(--color-ort-graz)',
  'München':  'var(--color-ort-muenchen)',
  'Bayreuth': 'var(--color-ort-bayreuth)',
  'Salzburg': 'var(--color-ort-salzburg)',
};

/** Constant colour of a recurring place, else null. */
export function ortColor(name) {
  return ORT_COLOR[name] || null;
}

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

// =========================================================================
// Wikidata Icon (simplified barcode logo, inline SVG)
// =========================================================================

export const WIKIDATA_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="1" width="1" height="10" fill="#990000"/><rect x="2" y="1" width="1" height="10" fill="#990000"/><rect x="4" y="1" width="1" height="10" fill="#339966"/><rect x="5.5" y="1" width="1" height="10" fill="#339966"/><rect x="7.5" y="1" width="1" height="10" fill="#006699"/><rect x="9" y="1" width="1" height="10" fill="#006699"/><rect x="10.5" y="1" width="1" height="10" fill="#006699"/></svg>';

// =========================================================================
// Lesezeichen-Icon (Wissenskorb)
// =========================================================================

/**
 * Inline SVG for Korb buttons; unifies the previously inline-duplicated
 * bookmark paths. size: 12 (index detail) | 14 (Bestand/inline detail).
 * filled = record is in the Korb.
 */
export function bookmarkIcon(size = 14, filled = false) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
}

// Document type labels come from the data now: the pipeline writes
// skos:prefLabel on the m3gim-dft concepts (E-101), the loader stores them in
// store.dftHierarchy, format.js dftLabel(store, id) resolves them. The former
// hand-map DOKUMENTTYP_LABELS is gone.

// =========================================================================
// Language codes (ISO 639-1) -> readable German labels
// =========================================================================

export const LANGUAGE_LABELS = {
  'de': 'Deutsch',
  'en': 'Englisch',
  'fr': 'Französisch',
  'it': 'Italienisch',
};

/**
 * Resolve a (possibly comma-separated) language value to readable labels.
 * "en, fr" -> "Englisch, Französisch". Unknown codes pass through unchanged.
 */
export function formatLanguage(value) {
  if (!value) return '';
  return String(value)
    .split(/[,/]/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(code => LANGUAGE_LABELS[code.toLowerCase()] || code)
    .join(', ');
}

// =========================================================================
// AgRelOn relation types → German labels (Session 32: E-75 chip pattern)
// =========================================================================

export const AGRELON_LABELS = {
  'agrelon:HasEmployeeEmployer':    'Arbeitgeber',
  'agrelon:HasCorrespondent':       'Korrespondenz',
  'agrelon:HasProfessionalContact': 'Beruflicher Kontakt',
  'agrelon:IsHasPatron':            'Patron',
  'agrelon:HasIsMember':            'Mitglied',
};

// =========================================================================
// Role clusters for chip colour families (Session 32: E-75 design rules)
// Prefix (uppercase, as shown in the chip) -> cluster class name.
// CSS rules: .chip--c-ort, .chip--c-person, .chip--c-rolle,
// .chip--c-beziehung, .chip--c-finanz, .chip--c-datum, .chip--c-neutral.
// =========================================================================

export const ROLE_CLUSTER = {
  // Places + spatiotemporal events
  'AUFFUEHRUNGSORT':  'ort',
  'AUFFÜHRUNGSORT':   'ort',
  'ERSCHEINUNGSORT':  'ort',
  'ABSENDEORT':       'ort',
  'ABREISEORT':       'ort',
  'ZIELORT':          'ort',
  'ENTSTEHUNGSORT':   'ort',
  'WOHNORT':          'ort',
  'AUFFUEHRUNG':      'ort',
  'AUFFÜHRUNG':       'ort',
  'AUFTRITT':         'ort',
  'PROBE':            'ort',
  'GENERALPROBE':     'ort',
  'GASTSPIEL':        'ort',
  'SPIELZEIT':        'ort',
  'PREMIERE':         'ort',
  'FESTVORSTELLUNG':  'ort',
  'WIEDERAUFNAHME':   'ort',
  'ENTSTEHUNG':       'ort',
  'AUFTRAG':          'ort',
  'REPERTOIRE':       'ort',
  'ERWAEHNT':         'ort',
  'ERWÄHNT':          'ort',
  // Event roles added from the deeper export (meeting 2026-06-23).
  'AUFNAHME':         'ort',
  'EMPFANG':          'ort',
  // The merged terms (E-136). Ort and Datum of the same role now share one
  // name, so the place form of the name no longer matches and the chip would
  // stay grey without these lines.
  'ABSENDUNG':        'ort',
  'ABREISE':          'ort',
  'EMPFANGNAHME':     'ort',
  'VERTRAGSORT':      'ort',
  'RAHMENVERANSTALTUNG': 'ort',
  'PUBLIKUM':         'person',
  'VERTRAGSPARTNER':  'person',
  'ABGEBILDET':       'person',
  'BELEUCHTER':       'person',
  'REPETITOR':        'person',
  'REGIEASSISTENT':   'person',
  'FOTOGRAF':         'person',
  'AUSBILDUNGSSTAETTE': 'beziehung',
  'AUSBILDUNGSSTÄTTE': 'beziehung',
  'INHABER':          'beziehung',
  'FLUGGESELLSCHAFT': 'beziehung',

  // Persons in production roles
  'KOMPONIST':        'person',
  'DIRIGENT':         'person',
  'SAENGER':          'person',
  'SÄNGER':           'person',
  'SÄNGERIN':         'person',
  'REGISSEUR':        'person',
  'CHORLEITER':       'person',
  'INTERPRET':        'person',
  'LIBRETTIST':       'person',
  'VERFASSER':        'person',
  'UEBERSETZER':      'person',
  'ÜBERSETZER':       'person',
  'HERAUSGEBER':      'person',
  'ARRANGEUR':        'person',
  'CHOREOGRAPH':      'person',
  'CHOREOGRAF':       'person',
  'BUEHNENBILDNER':   'person',
  'BÜHNENBILDNER':    'person',
  'KOSTUEMBILDNER':   'person',
  'KOSTÜMBILDNER':    'person',
  'AUSSTATTER':       'person',
  'BUEHNENLEITER':    'person',
  'BÜHNENLEITER':     'person',
  'TECHNISCHE LEITUNG': 'person',
  'PROTAGONIST':      'person',
  'AGENT':            'person',
  'VERMITTLER':       'person',
  // Person roles added from the deeper export (meeting 2026-06-23).
  // 'maskenbidner' is the passed-through typo form from the source (data.md § 5).
  'LEITUNG':          'person',
  'MASKENBIDNER':     'person',
  'ADRESSAT':         'person',
  'ABSENDER':         'person',
  'EMPFAENGER':       'person',
  'EMPFÄNGER':        'person',
  'UNTERZEICHNER':    'person',
  'AUFTRAGGEBER':     'person',

  // Stage roles
  'ROLLE':            'rolle',

  // AgRelOn relations
  'ARBEITGEBER':         'beziehung',
  'VERANSTALTER':        'person',
  'KORRESPONDENZ':       'beziehung',
  'BERUFLICHER KONTAKT': 'beziehung',
  'PATRON':              'beziehung',
  'MITGLIED':            'beziehung',

  // Finances
  'AUSGABEN':         'finanz',
  'EINNAHMEN':        'finanz',
  'HONORAR':          'finanz',
  'GAGE':             'finanz',
  'PROVISION':        'finanz',
  'VERTRAGSSUMME':    'finanz',

  // Date roles
  'ERSCHEINUNGSDATUM':  'datum',
  'ABSENDEDATUM':       'datum',
  'EMPFANGSDATUM':      'datum',
  'AUFFUEHRUNGSDATUM':  'datum',
  'AUFFÜHRUNGSDATUM':   'datum',
  'PREMIEREDATUM':      'datum',
  'AUSSTELLUNGSDATUM':  'datum',
  'ABREISEDATUM':       'datum',

  // === PENDING: new data state Lane 1 (G1/G2/G3/G8). Activate after promote +
  // Lane-1 confirmation of the role names; see architecture.md
  // § Erweiterung fuer den neuen Datenstand.
  // Unmapped falls to 'neutral' (grey) -- no crash, but design rule 3 breaks.
  // 'EMPFANGSORT':       'ort',          // G1
  // 'VERTRAGSORT':       'ort',          // G1
  // 'BELEUCHTER':        'person',       // G2 Crew
  // 'MASKENBILDNER':     'person',       // G2 (Tippfehler 'MASKENBIDNER' durchgereicht)
  // 'REPETITOR':         'person',       // G2
  // 'REGIEASSISTENT':    'person',       // G2
  // 'FOTOGRAF':          'person',       // G2
  // 'PUBLIKUM':          'person',       // G8 -- bzw. subject, mit Lane 1 klaeren
  // 'ABGEBILDET':        'person',       // G8
  // 'GESAMTVERGÜTUNG':   'finanz',       // G3 detailRole
  // 'REISEKOSTEN':       'finanz',       // G3
  // 'RUNDFUNKSHONORAR':  'finanz',       // G3 (Tippfehler-Variante durchgereicht)
};

export function roleClusterFor(prefix) {
  if (!prefix) return 'neutral';
  const key = String(prefix).toUpperCase();
  return ROLE_CLUSTER[key] || 'neutral';
}

// =========================================================================
// Mobilitaetssichten (Session 36, M3): `m3gim:eventRole` on STE events +
// date roles grouped by the five mobility types from
// `research-framework.md § Mobilitaetstypen` and `data-model.md § 10`.
// Orthogonal to ROLE_CLUSTER (there: chip colour per role category);
// here: thematic cluster per mobility Sicht.
// =========================================================================

export const EVENT_ROLE_TO_MOBILITY_CLUSTER = {
  // Performative mobility (appearances, performances)
  'auftritt':          'performativ',
  'aufführung':        'performativ',
  'auffuehrung':       'performativ',
  'gastspiel':         'performativ',
  'premiere':          'performativ',
  'wiederaufnahme':    'performativ',
  'festvorstellung':   'performativ',
  'probe':             'performativ',
  'probenbeginn':      'performativ',
  'auftrittsdatum':    'performativ',
  'auffuehrungsdatum': 'performativ',
  'aufführungsdatum':  'performativ',
  'probendatum':       'performativ',
  'premieredatum':     'performativ',

  // Institutional mobility (engagements)
  'spielzeit':         'institutionell',
  'spielzeitVon':      'institutionell',
  'spielzeitBis':      'institutionell',

  // Correspondence + travel
  'absendedatum':      'korrespondenz',
  'empfangsdatum':     'korrespondenz',
  'abreisedatum':      'korrespondenz',

  // Discursive mobility (press, radio)
  'erscheinungsdatum': 'diskursiv',
  'ausstrahlung':      'diskursiv',
  'ausstrahlungsdatum':'diskursiv',

  // Biographical mobility (papers, residence)
  'ausstellungsdatum': 'biografisch',
  'wohnort':           'biografisch',
  'gespräch':          'biografisch',
  'gespraech':         'biografisch',

  // Neutral marker
  'erwähnt':           null,
  'erwaehnt':          null,

  // Needs clarification: not attested in data.md § 5 as a mobility role
  // -- deliberately null rather than arbitrarily classified.
  // TODO M3.5 review (Session 36): clarify with the Erschliessungsteam.
  'auftrag':           null,  // work/contract/appearance commission? Unclear.
  'entstehung':        null,  // work or document creation? Unclear.
  // Finance role (data.md § 5 Finanzrollen) -- does not belong in mobility
  // Sichten. Marked explicitly as non-mobility here for the test; display goes
  // via the finance cluster.
  'ueberweisung':      null,
  'überweisung':       null,

  // Mobility place roles (E-97): produce dateless SpatiotemporalEvents.
  // Assigned to the 'korrespondenz' cluster (bundles travel + correspondence,
  // see above) per data.md § Ortsrollen: zielort/abreiseort = travel mobility,
  // empfangsort = correspondence mobility, absendeort = both, vertragsort =
  // mobility place role of the travel/correspondence trace (§ 10).
  // Datelessness is the normal case here, not a defect: the Sicht assignment
  // goes via the role, not via a date (no date is guessed, § 8 Konfidenz).
  // Decision E-110, order-m3gim 2026-06-21 point 1.
  'zielort':           'korrespondenz',
  'absendeort':        'korrespondenz',
  'abreiseort':        'korrespondenz',
  'empfangsort':       'korrespondenz',
  'vertragsort':       'korrespondenz',

  // Activated from the PENDING block (deeper export attests these eventRoles).
  // Provisional, to be confirmed with the Erschliessungsteam (meeting 2026-06-23):
  // generalprobe = performativ (like its sibling 'probe'); aufnahme = diskursiv
  // (media trace like 'ausstrahlung'); rahmenveranstaltung = null (genuinely
  // unclear, null = "no Sicht/needs clarification", guardrail-conform).
  'generalprobe':      'performativ',
  'aufnahme':          'diskursiv',
  'rahmenveranstaltung': null,
};

/**
 * Mobility Sicht of a role. Takes the concept id of the merged model
 * (ANNOTATION_ROLE_CLUSTER, authoritative) and also the raw role value of the
 * superseded model (EVENT_ROLE_TO_MOBILITY_CLUSTER), as long as the shipped
 * file under docs/data/ still carries the old model.
 */
export function mobilityClusterFor(eventRole) {
  if (!eventRole) return null;
  const raw = String(eventRole).trim();
  if (raw in ANNOTATION_ROLE_CLUSTER) return ANNOTATION_ROLE_CLUSTER[raw];
  const key = raw.toLowerCase();
  if (!(key in EVENT_ROLE_TO_MOBILITY_CLUSTER)) return null;
  return EVENT_ROLE_TO_MOBILITY_CLUSTER[key];
}

// =========================================================================
// Roles -> functional section in the archive inline detail (Session 34)
// Input: role value in lowercase (as in JSON-LD, e.g. "komponist").
// Returns: section key ('produktion' | 'mitwirkende' | 'erwaehnt' | null).
// null means no explicit assignment -> lands in the default "Weitere" bucket.
// =========================================================================

export const ROLE_TO_SECTION = {
  // Produktion — creative responsibility
  'komponist':         'produktion',
  'dirigent':          'produktion',
  'regisseur':         'produktion',
  'librettist':        'produktion',
  'übersetzer':        'produktion',
  'uebersetzer':       'produktion',
  'verfasser':         'produktion',
  'herausgeber':       'produktion',
  'arrangeur':         'produktion',
  'choreograph':       'produktion',
  'choreograf':        'produktion',
  'bühnenbildner':     'produktion',
  'buehnenbildner':    'produktion',
  'chorleiter':        'produktion',
  'kostümbildner':     'produktion',
  'kostuembildner':    'produktion',
  'ausstatter':        'produktion',
  'bühnenleiter':      'produktion',
  'buehnenleiter':     'produktion',
  'technische leitung': 'produktion',

  // Mitwirkende — on stage or in the archive context
  'sänger':            'mitwirkende',
  'saenger':           'mitwirkende',
  'sängerin':          'mitwirkende',
  'interpret':         'mitwirkende',
  'protagonist':       'mitwirkende',
  'agent':             'mitwirkende',
  'vermittler':        'mitwirkende',
  'adressat':          'mitwirkende',
  'absender':          'mitwirkende',
  'empfänger':         'mitwirkende',
  'empfaenger':        'mitwirkende',
  'unterzeichner':     'mitwirkende',
  'auftraggeber':      'mitwirkende',
  'veranstalter':      'mitwirkende',

  // Erwaehnt
  'erwähnt':           'erwaehnt',
  'erwaehnt':          'erwaehnt',

  // === PENDING: new data state Lane 1 (G2/G8). Activate after promote +
  // Lane-1 confirmation; see architecture.md § Erweiterung fuer den neuen
  // Datenstand. Otherwise these roles land in the default "Weitere" bucket
  // instead of Produktion/Erwaehnt.
  // 'beleuchter':        'produktion',  // G2
  // 'maskenbildner':     'produktion',  // G2
  // 'repetitor':         'produktion',  // G2
  // 'regieassistent':    'produktion',  // G2
  // 'fotograf':          'produktion',  // G2
  // 'publikum':          'erwaehnt',    // G8
  // 'abgebildet':        'erwaehnt',    // G8
};

export function sectionForRole(role) {
  if (!role) return null;
  return ROLE_TO_SECTION[String(role).trim().toLowerCase()] || null;
}

// =========================================================================
// STE chip prefix: map date roles to event/place roles.
// The pipeline emits m3gim:eventRole in the STE with the date property from
// the XLSX (e.g. "auffuehrungsdatum"). In the place-and-event chip
// (Ort · Datum) a place/event role reads more coherently.
// =========================================================================

export const STE_ROLE_DISPLAY = {
  absendedatum:       'ABSENDEORT',
  empfangsdatum:      'EMPFANGSORT',
  erscheinungsdatum:  'ERSCHEINUNGSORT',
  ausstellungsdatum:  'AUSSTELLUNGSORT',
  abreisedatum:       'ABREISEORT',
  auffuehrungsdatum:  'AUFFÜHRUNG',
  auftrittsdatum:     'AUFTRITT',
  premieredatum:      'PREMIERE',
  probendatum:        'PROBE',
  probenbeginn:       'PROBENBEGINN',
  ausstrahlungsdatum: 'AUSSTRAHLUNG',
  ueberweisungsdatum: 'ÜBERWEISUNG',
  gespraechsdatum:    'GESPRÄCH',
};

export function steChipPrefix(eventRole) {
  if (!eventRole) return 'EREIGNIS';
  const key = String(eventRole).trim().toLowerCase();
  return STE_ROLE_DISPLAY[key] || String(eventRole).toUpperCase();
}

// =========================================================================
// Annotation roles of the merged model.
//
// The class m3gim-ontology:Annotation carries every Datierung and every
// Verortung. Its role is a reference to a concept of the m3gim-vocab
// vocabulary and carries that concept's skos:prefLabel in the reference node.
// The display form thus lives in the data, not in code; the tables here hold
// only the three decisions the data does not make. Everything is keyed by the
// stable concept id, never by the display text.
// =========================================================================

/**
 * The five reference levels (Bezugsebene) of a Datierung, as terms of the
 * scheme `m3gim-vocab:datingScopes`. Which role carries which level lives in
 * the vocabulary since E-150 and reaches the store via the dataset; only the
 * identifiers stand here, so a comparison in code stays readable.
 *
 *   object       the document itself was created, issued, published, sent or
 *                received then.
 *   attested     the document attests an event that took place then. Only this
 *                level and `object` feed the timeline.
 *   mentioned    the date stands in the document and does not belong on the
 *                life line.
 *   framing      Rahmenveranstaltung, a span clearly wider than the document
 *                itself (festival season).
 *   unfulfilled  contract status `nicht eingehalten`, a date that precisely
 *                did not take place. Not a vocabulary term, so keyed as literal.
 */
export const DATING_SCOPE = Object.freeze({
  object: 'm3gim-vocab:objectDating',
  attested: 'm3gim-vocab:attestedDating',
  mentioned: 'm3gim-vocab:mentionedDating',
  framing: 'm3gim-vocab:framingDating',
  unfulfilled: 'm3gim-vocab:unfulfilledDating',
});

/**
 * The reference levels that may date a record (frontend contract A4). Every
 * other level stays readable but does not date the record. The rule sits as an
 * editorial note on `m3gim-ontology:datingScope` in the vocabulary and is not
 * machine-readable there; `tests/frontend/typed-dates.test.mjs` holds both
 * sides together.
 */
export const ANCHORING_SCOPES = new Set([DATING_SCOPE.object, DATING_SCOPE.attested]);

/**
 * The one role slot that is not a vocabulary term. The contract status
 * `nicht eingehalten` sits in the role column of the source, and the vocabulary
 * deliberately does not list it as a role term because its modelling is open
 * with the Erschliessungsteam (data-model.md § 11). Until then this entry keeps
 * it readable and at the same time out of the Zeitanker. It falls away with the
 * decision.
 */
export const LITERAL_ROLE_SCOPE = Object.freeze({
  'nicht eingehalten': DATING_SCOPE.unfulfilled,
});

/**
 * Mobility Sicht per annotation role, by concept id. Replaces the string
 * heuristic on the role name that derived a colour cluster from the "datum"
 * suffix; a term like `aufführung` no longer carries that suffix. The mappings
 * are taken unchanged from EVENT_ROLE_TO_MOBILITY_CLUSTER; `null` means, as
 * there, explicitly "no Sicht" and not "not entered".
 */
export const ANNOTATION_ROLE_CLUSTER = {
  'm3gim-vocab:performance':          'performativ',
  'm3gim-vocab:guestPerformance':     'performativ',
  'm3gim-vocab:premiere':             'performativ',
  'm3gim-vocab:revival':              'performativ',
  'm3gim-vocab:galaPerformance':      'performativ',
  'm3gim-vocab:rehearsal':            'performativ',
  'm3gim-vocab:rehearsalStartDate':   'performativ',
  'm3gim-vocab:dressRehearsal':       'performativ',
  'm3gim-vocab:performancePlace':     'performativ',

  'm3gim-vocab:season':               'institutionell',

  'm3gim-vocab:dispatch':             'korrespondenz',
  'm3gim-vocab:receiving':            'korrespondenz',
  'm3gim-vocab:departure':            'korrespondenz',
  'm3gim-vocab:destinationPlace':     'korrespondenz',
  'm3gim-vocab:contractPlace':        'korrespondenz',

  'm3gim-vocab:publicationDate':      'diskursiv',
  'm3gim-vocab:broadcastDate':        'diskursiv',
  'm3gim-vocab:recording':            'diskursiv',

  'm3gim-vocab:issueDate':            'biografisch',
  'm3gim-vocab:residencePlace':       'biografisch',
  'm3gim-vocab:conversationDate':     'biografisch',

  // Explicitly without Sicht (needs clarification or non-mobile process).
  'm3gim-vocab:mentioned':            null,
  'm3gim-vocab:framingEvent':         null,
  'm3gim-vocab:assignment':           null,
  'm3gim-vocab:creation':             null,
  'm3gim-vocab:transferDate':         null,
  'm3gim-vocab:installmentPeriod':    null,
  'm3gim-vocab:wageConfirmationDate': null,
  'm3gim-vocab:reception':            null,
  'nicht eingehalten':                null,
};


// =========================================================================
// Content families of a record (E-158). One family per functional block of
// the inline detail; the Bestand table paints one Erschliessungs-Punkt per
// family in the same colour the detail uses for the block title and its chips,
// so the legend arises from proximity instead of text (design.md rule 2/11).
// Family keys equal the .chip--c-<key> colour tokens.
// =========================================================================

export const CONTENT_FAMILIES = Object.freeze([
  { key: 'person',    label: 'Personen',           blocks: ['produktion', 'mitwirkende', 'erwaehnt', 'weitere'] },
  { key: 'rolle',     label: 'Werk & Repertoire',  blocks: ['werk'] },
  { key: 'ort',       label: 'Ort & Aufführung',   blocks: ['auffuehrungen', 'ort'] },
  { key: 'datum',     label: 'Genannte Daten',     blocks: ['genannte-daten'] },
  { key: 'beziehung', label: 'Beziehungen',        blocks: ['beziehungen'] },
  { key: 'finanz',    label: 'Finanzen',           blocks: ['finanzen'] },
]);

/** Family key of a detail block key, or 'neutral' when the block has none. */
export function familyOfBlock(blockKey) {
  const fam = CONTENT_FAMILIES.find(f => f.blocks.includes(blockKey));
  return fam ? fam.key : 'neutral';
}
