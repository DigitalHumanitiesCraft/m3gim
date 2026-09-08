/**
 * M³GIM Static Data & Constants
 * Ported from scripts/build-views.py
 */

// =========================================================================
// Wikidata Icon (simplified barcode logo, inline SVG)
// =========================================================================

// Monochrome since the palette decision of 2026-09-03: the bars take
// currentColor, which the badge sets to the one match green (--color-match).
export const WIKIDATA_ICON_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><rect x="0.5" y="1" width="1" height="10"/><rect x="2" y="1" width="1" height="10"/><rect x="4" y="1" width="1" height="10"/><rect x="5.5" y="1" width="1" height="10"/><rect x="7.5" y="1" width="1" height="10"/><rect x="9" y="1" width="1" height="10"/><rect x="10.5" y="1" width="1" height="10"/></svg>';

/* Jump glyphs of the Indizes (E-226): general signs like the Wikidata and Korb
   icons, not content-family symbols, hence here and not in family-icons.js. */
export const NETZWERK_GLYPH_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
  + '<line x1="6.6" y1="6.6" x2="10.4" y2="10.4"/><line x1="17.4" y1="6.6" x2="13.6" y2="10.4"/>'
  + '<line x1="17.4" y1="17.4" x2="13.6" y2="13.6"/>'
  + '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>'
  + '<circle cx="19" cy="19" r="2"/></svg>';

export const DOKUMENT_GLYPH_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  + ' aria-hidden="true">'
  + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
  + '<polyline points="14 2 14 8 20 8"/></svg>';

export const KARTE_GLYPH_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  + ' aria-hidden="true">'
  + '<polygon points="9,3 3,6 3,21 9,18 15,21 21,18 21,3 15,6"/>'
  + '<line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>';

// =========================================================================
// Basket icon (Korb)
// =========================================================================

/**
 * Inline SVG for Korb buttons, the same tray as the Korb tab in index.html
 * (source of truth for that markup). size: 12 (index detail) | 14 (Bestand/
 * inline detail) | 16 (record detail). filled = record is in the Korb.
 *
 * Only the tray body carries the fill; the front line stays a stroked
 * polyline, which a fill would turn into an unreadable filled wedge.
 */
export function korbIcon(size = 14, filled = false) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path fill="${filled ? 'currentColor' : 'none'}" d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`;
}

/** Label of a Korb button, tooltip and accessible name in one, so the three
 *  places that carry the button word it identically. */
export function korbTip(inKorb) {
  return inKorb ? 'Aus dem Korb entfernen' : 'In den Korb';
}

// Document type labels come from the data now: the pipeline writes
// skos:prefLabel on the m3gim-dft concepts (E-101), the loader stores them in
// store.dftHierarchy, format.js dftLabel(store, id) resolves them. The former
// hand-map DOKUMENTTYP_LABELS is gone.

// =========================================================================
// Language codes (ISO 639-1) -> readable German labels
// =========================================================================

const LANGUAGE_LABELS = {
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

const ROLE_CLUSTER = {
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
  // 'maskenbidner' is the passed-through typo form from the source (data.md § Rollenvokabular).
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
  // § Erweiterung fuer den neuen Datenstand. The commented lines are not inert:
  // tests/test_15_vocab_coverage.py reads this block as text, so a role listed
  // here counts as mapped and is kept out of the 'neutral' finding.
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
// `research-framework.md § Mobilitaetstypen` and `data-model.md § Mobilitätsmodell`.
// Orthogonal to ROLE_CLUSTER (there: chip colour per role category);
// here: thematic cluster per mobility Sicht.
// =========================================================================

const EVENT_ROLE_TO_MOBILITY_CLUSTER = {
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

  // Needs clarification: not attested in data.md § Rollenvokabular as a mobility role
  // -- deliberately null rather than arbitrarily classified.
  // TODO M3.5 review (Session 36): clarify with the Erschliessungsteam.
  'auftrag':           null,  // work/contract/appearance commission? Unclear.
  'entstehung':        null,  // work or document creation? Unclear.
  // Finance role (data.md § Rollenvokabular, Finanzrollen) -- does not belong in mobility
  // Sichten. Marked explicitly as non-mobility here for the test; display goes
  // via the finance cluster.
  'ueberweisung':      null,
  'überweisung':       null,

  // Mobility place roles (E-97): produce dateless SpatiotemporalEvents.
  // Assigned to the 'korrespondenz' cluster (bundles travel + correspondence,
  // see above) per data.md § Ortsrollen: zielort/abreiseort = travel mobility,
  // empfangsort = correspondence mobility, absendeort = both, vertragsort =
  // mobility place role of the travel/correspondence trace (data-model.md § Mobilitätsmodell).
  // Datelessness is the normal case here, not a defect: the Sicht assignment
  // goes via the role, not via a date (no date is guessed, data-model.md § Meta-Statement-Modell).
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
};

export function sectionForRole(role) {
  if (!role) return null;
  return ROLE_TO_SECTION[String(role).trim().toLowerCase()] || null;
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
 * with the Erschliessungsteam (data-model.md § Finanzschicht). Until then this entry keeps
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
const ANNOTATION_ROLE_CLUSTER = {
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
// Content families of a record (E-158). Since the decision of the project lead
// of 2026-09-03 the families are the four entity types of the model; the
// Bestand table paints one Erschliessungs-Punkt per family in the same colour
// the detail uses for the block title, so the legend arises from proximity
// instead of text (design.md rule 2/11).
//
// Beziehungen joins person, because roughly one in a thousand records carries a
// relation without a person. Genannte Daten and Finanzen carry no family:
// familyOfBlock returns 'neutral' for them and their block title stays without
// a dot. The labels are one word each, because they are read as a legend; the
// block titles in the detail may be longer.
// =========================================================================

export const CONTENT_FAMILIES = Object.freeze([
  { key: 'person',      label: 'Personen',      blocks: ['produktion', 'mitwirkende', 'erwaehnt', 'weitere', 'beziehungen'] },
  { key: 'institution', label: 'Institutionen', blocks: ['institutionen'] },
  { key: 'ort',         label: 'Orte',          blocks: ['auffuehrungen', 'ort'] },
  { key: 'werk',        label: 'Werke',         blocks: ['werk'] },
]);

/** Family key of a detail block key, or 'neutral' when the block has none. */
export function familyOfBlock(blockKey) {
  const fam = CONTENT_FAMILIES.find(f => f.blocks.includes(blockKey));
  return fam ? fam.key : 'neutral';
}
