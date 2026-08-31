/**
 * Archiv-spezifische Toolbar (Bestand + Chronik). Dünner Wrapper um die
 * generische `buildToolbar` (siehe `_toolbar.js`), der die Archiv-Facetten
 * deklariert und die gewohnte API (setPerson/setLocation/setWerk) erhält.
 *
 * Die drei Entitaetsfacetten halten seit E-151 Listen; setPerson/setLocation/
 * setWerk ersetzen die Auswahl, addFacet/removeFacet aendern sie schrittweise.
 *
 * API: buildFilterToolbar(store, { initial, onChange })
 *   -> { element, setPerson, setLocation, setWerk, setDocType, setCount,
 *        getState, applyFacet, addFacet, removeFacet }
 */

import { el, clear } from '../utils/dom.js';
import { buildToolbar } from './_toolbar.js';


/**
 * Schaerfegrad-Banner aktualisieren: im engen Modus die Differenz nennen.
 * Bestand und Chronik tragen je ein eigenes Banner-Element, adressiert ueber
 * seine DOM-id; die Darstellung ist dieselbe.
 */
export function updateSchaerfeBanner(bannerId, schaerfe, engInfo) {
  const banner = document.getElementById(bannerId);
  if (!banner) return;
  if (schaerfe !== 'eng' || !engInfo) {
    banner.hidden = true;
    banner.textContent = '';
    return;
  }
  banner.hidden = false;
  clear(banner);
  banner.appendChild(el('span', { className: 'archiv-schaerfe__mode' }, 'Schärfegrad eng'));
  banner.appendChild(el('span', { className: 'archiv-schaerfe__diff' },
    `${engInfo.eng} von ${engInfo.total} raumzeitlich/Aufführungs-belegt`));
}


// Die Facettenschluessel, die von aussen adressierbar sind.
const ARCHIV_FACETS = new Set(['person', 'location', 'werk', 'docType']);


export function buildFilterToolbar(store, { initial = {}, onChange } = {}) {
  const toolbar = buildToolbar(store, {
    initial,
    onChange,
    showReset: true,
    showCount: true,
    className: 'archiv-toolbar',
    facets: [
      { kind: 'search', key: 'search', placeholder: 'Suche (Signatur, Titel, Typ, Datum\u2026)' },
      { kind: 'dftSelect', key: 'docType' },
      {
        kind: 'entityCombobox', key: 'person', entityMap: 'persons',
        placeholder: 'Person filtern\u2026',
        title: 'Dokumente nach verkn\u00fcpfter Person filtern',
      },
      {
        kind: 'entityCombobox', key: 'location', entityMap: 'locations',
        placeholder: 'Ort filtern\u2026',
        title: 'Dokumente nach verkn\u00fcpftem Ort filtern',
      },
      {
        kind: 'entityCombobox', key: 'werk', entityMap: 'works',
        placeholder: 'Werk filtern\u2026',
        title: 'Dokumente nach verkn\u00fcpftem Werk filtern',
      },
      // Erschliessungs-Umfang (E-116): Default zeigt nur erschlossene Records
      // (mind. eine Verknuepfung). Eingeschaltet erscheinen zusaetzlich die
      // noch nicht erschlossenen Bestaende, ausgegraut markiert -- alle Daten
      // erreichbar, ohne den Erschliessungsstand zu kaschieren.
      { kind: 'toggle', key: 'zeigeUnerschlossen', label: 'Nicht erschlossene einblenden' },
    ],
  });

  return {
    element: toolbar.element,
    setPerson(name)   { toolbar.setFacet('person', name); },
    setLocation(name) { toolbar.setFacet('location', name); },
    setWerk(name)     { toolbar.setFacet('werk', name); },
    setDocType(id)    { toolbar.setFacet('docType', id); },
    setCount(text)    { toolbar.setCount(text); },
    getState()        { return toolbar.getState(); },
    // Cross-View-Filter: eine Facette {facet,value} auf die Toolbar anwenden.
    // Bestand und Chronik teilen sich dieselbe Zuordnung (vorher dupliziert).
    // `value` darf ein Wert oder eine Liste sein (E-151).
    applyFacet(facet, value) {
      if (ARCHIV_FACETS.has(facet)) toolbar.setFacet(facet, value);
    },
    /** Einen Wert an eine Entitaetsfacette anhaengen, ohne die uebrigen zu
     *  verlieren (Chip-Klick aus einem Detail). */
    addFacet(facet, value) {
      if (ARCHIV_FACETS.has(facet)) toolbar.addFacet(facet, value);
    },
    removeFacet(facet, value) {
      if (ARCHIV_FACETS.has(facet)) toolbar.removeFacet(facet, value);
    },
  };
}
