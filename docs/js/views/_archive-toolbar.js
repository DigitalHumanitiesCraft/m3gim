/**
 * Archiv-spezifische Toolbar (Bestand + Chronik). Dünner Wrapper um die
 * generische `buildToolbar` (siehe `_toolbar.js`), der die Archiv-Facetten
 * deklariert und die gewohnte API (setPerson/setLocation/setWerk) erhält.
 *
 * API: buildFilterToolbar(store, { initial, onChange })
 *   -> { element, setPerson, setLocation, setWerk, setCount, getState }
 */

import { buildToolbar } from './_toolbar.js';


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
    setCount(text)    { toolbar.setCount(text); },
    getState()        { return toolbar.getState(); },
  };
}
