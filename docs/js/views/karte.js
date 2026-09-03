/**
 * M³GIM Karten-View — entitaetszentriert (D3-geo).
 *
 * Forschungswerkzeug fuer die Frage "wo war diese Entitaet praesent?". Man waehlt
 * eine Entitaet (Organisation oder Person) in der Sidebar; die Karte zeigt alle
 * Orte, die an ihren Records haengen, als Punkte. Ohne gewaehlte Entitaet zeigt
 * sie die Gesamt-Geografie des Bestands. Keine Verbindungslinien zwischen den
 * Knoten — die biografische Trajektorie (frueher E-111) ist bewusst entfernt;
 * die raeumliche Verteilung einer Entitaet ist die Aussage, nicht der Weg.
 *
 * Beispiel: "Bayreuther Festspiele" -> Bayreuth (Hauptort) plus die auswaertigen
 * Spielorte (Muenchen, Paris, Stuttgart, …), je nach Datenlage mit oder ohne
 * Koordinaten. Orte ohne Koordinaten werden ehrlich als Liste ausgewiesen, nicht
 * verschwiegen (Linie "Stand nicht kaschieren").
 *
 * Die Orte einer Entitaet werden in karte-data.js aus zwei Quellen
 * zusammengezogen (Record-Orte + verortete Annotationen). Knoten sind nach
 * dominanter Mobilitaetssicht eingefaerbt, die jeder Beleg aus der Datenschicht
 * mitbringt; die Groesse traegt die Belegzahl im Zeitfenster.
 */

import { el, clear } from '../utils/dom.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { buildRoleChip } from './record-chips.js';
import { cityOf } from '../utils/format.js';
import { formatDate, extractYear } from '../utils/date-parser.js';
import { logStamp } from '../utils/env.js';
import { getFilter, setFilter, facetValues } from '../ui/filter-state.js';
import { zeitfensterToYearRange } from '../ui/filter-sync.js';
import {
  buildEntities, buildOccurrences, SICHTEN, hasGeo,
  breakdownByView, barSegments, sortOcc,
  countryByCity, countryOfOcc, aggregateCountries,
} from './karte-data.js';
import { entitySection } from './karte-picker.js';
import { buildMap, loadCountries } from './karte-map.js';

/* global d3 */

let _sidebar = null;

// ---------------------------------------------------------------------------
// Haupteinstieg
// ---------------------------------------------------------------------------

export function renderMobilitaet(store, container) {
  clear(container);

  const entities = buildEntities(store);
  const allOcc = buildOccurrences(store);

  if (allOcc.length === 0) {
    container.appendChild(el('div', { className: 'mob-notice' },
      el('div', { className: 'mob-empty' }, 'Keine verorteten Belege im Datenstand.')));
    return;
  }
  if (typeof d3 === 'undefined') {
    container.appendChild(el('div', { className: 'mob-notice' },
      el('div', { className: 'mob-empty' }, 'D3 ist nicht geladen, die Karte kann nicht gezeichnet werden.')));
    return;
  }

  const withGeo = allOcc.filter(hasGeo);
  const datedYears = allOcc.map(o => extractYear(o.date)).filter(y => y != null);
  const minYear = datedYears.length ? Math.min(...datedYears) : 1940;
  const maxYear = datedYears.length ? Math.max(...datedYears) : 1980;
  const span = { min: minYear, max: maxYear };

  const state = {
    entity: null,          // gewaehlte Entitaet oder null (= alle)
    country: null,         // gewaehltes Land oder null (= alle)
    yearFrom: minYear,
    yearTo: maxYear,
    selectedCities: [],
  };

  // Das Land haengt am Ereignis; ueber die Stadt erreicht es auch die
  // Record-Orte, die selbst keines fuehren.
  const cityCountry = countryByCity(store);

  // Malaniuk ist die Voreinstellung: die Karte beantwortet "wo war diese
  // Entitaet praesent", und ohne Wahl stuende sie auf der Gesamt-Geografie.
  state.entity = entities.find(e => /Malaniuk/i.test(e.name)) || null;

  // Geteilten Filter initial nachziehen: zeitfenster -> Jahresfenster,
  // ort -> selectedCities. Die Sicht-Facette spielt in der Entitaets-Karte keine
  // Rolle (keine Sicht-Legende) und wird ignoriert.
  function pullSharedIntoState(shared) {
    const { yearFrom, yearTo } = zeitfensterToYearRange(shared.zeitfenster);
    state.yearFrom = yearFrom == null ? minYear : Math.max(minYear, yearFrom);
    state.yearTo = yearTo == null ? maxYear : Math.min(maxYear, yearTo);
    state.selectedCities = facetValues(shared, 'ort');
  }
  pullSharedIntoState(getFilter());

  const inEntity = o => !state.entity || state.entity.records.has(o.recordId);
  const inCountry = o => !state.country
    || countryOfOcc(o, cityCountry) === state.country;
  // Was die Karte zeichnet: Entitaet und Land zusammen.
  const inScope = o => inEntity(o) && inCountry(o);
  const inWindow = o => {
    const y = extractYear(o.date);
    return y == null || (y >= state.yearFrom && y <= state.yearTo);
  };

  // Belege des Ausschnitts ohne den Landesschnitt: die Reichweite-Liste soll
  // beim Klick auf ein Land nicht auf diese eine Zeile zusammenfallen.
  const occInReach = () => allOcc.filter(inEntity).filter(inWindow);

  // Ereignis-Region (Statuszeile / Ortsauswahl).
  const detailRegion = el('div', { className: 'mob-panel__detail' });
  const panelNode = el('div', { className: 'mob-panel' }, detailRegion);

  // Laender-Reichweite als Filterliste: jede Zeile traegt ihre Dokumentzahl und
  // schaltet den Landesschnitt der Karte (Klick auf das aktive Land loest ihn).
  // Eigene Zeichnung statt der Legenden-Fabrik, weil die Zahlen mit jedem
  // Schnitt neu stehen; die Klassen sind die der geteilten Legende.
  function paintLaender(region) {
    clear(region);
    const rows = aggregateCountries(occInReach(), cityCountry);
    for (const row of rows) {
      const on = !state.country || state.country === row.code;
      const chip = el('button', {
        className: 'vs-chip' + (on ? '' : ' vs-chip--off'),
        type: 'button', 'aria-pressed': String(state.country === row.code),
        title: `${row.label}: ${row.count} Dokumente`,
        onClick: () => {
          state.country = state.country === row.code ? null : row.code;
          redraw();
        },
      },
        el('span', { className: 'vs-chip__swatch' }),
        el('span', { className: 'vs-chip__label' }, row.label),
        el('span', { className: 'vs-chip__count' }, String(row.count)));
      chip.querySelector('.vs-chip__swatch').style.background = 'var(--color-text-tertiary)';
      region.appendChild(chip);
    }
  }

  // ---- Sidebar: das geteilte Geruest plus die view-eigenen Sektionen ----
  if (_sidebar) _sidebar.destroy();
  const sidebar = createSidebar(store, {
    yearSpan: span,
    // Die Karte schneidet ueber Entitaet und Zeitfenster; ein Freitextfeld haette
    // hier keine Wirkung.
    search: false,
    getCount: () => new Set(allOcc.filter(inScope).filter(inWindow)
      .map(o => o.recordId).filter(Boolean)).size,
    sections: [
      entitySection(entities, state, () => {
        state.selectedCities = [];
        setFilter({ ort: [] });
        redraw();
      }),
      {
        title: 'Länder-Reichweite',
        titleActive: () => state.country != null,
        controls: [{ kind: 'custom', className: 'vs-legend', build: paintLaender,
          update: paintLaender }],
      },
    ],
    legend: [
      {
        title: 'Farbschlüssel',
        controls: [{ kind: 'staticLegend', rows: SICHTEN.map(t => ({ color: t.color, label: t.label })) }],
      },
      {
        title: 'Verortung',
        controls: [{
          kind: 'staticLegend',
          rows: [
            { markerClass: 'mob-vmark mob-vmark--secured', label: 'gesichert (Ort/Stadt)' },
            { markerClass: 'mob-vmark mob-vmark--city', label: 'stadtgenau (Adresse → Stadt)' },
            { markerClass: 'mob-vmark mob-vmark--far', label: 'weit · prüfen' },
          ],
        }],
      },
      { controls: [{ kind: 'custom', node: panelNode }] },
    ],
    onChange: () => { pullSharedIntoState(getFilter()); redraw(); },
  });
  _sidebar = sidebar;

  // ---- Karte (volle Restbreite und -hoehe) ----
  const mapCell = el('div', { className: 'mob-map' },
    el('div', { className: 'mob-map__loading' }, 'Karte wird geladen …'));
  const main = el('div', { className: 'view-main view-main--stacked' },
    sidebar.strip, el('div', { className: 'view-main__stage' }, mapCell));

  container.appendChild(viewShell(sidebar.element, main));

  let draw = () => {};
  function redraw() { draw(); renderPanel(); sidebar.update(); }

  // Aktuell sichtbare Belege (Entitaet). Fuer die Detailliste eines gewaehlten Orts.
  const currentAll = () => allOcc.filter(inScope);

  // Detail-Region: nur die gewaehlte Entitaet (Kopf mit Loesen) und, bei
  // Knoten-Klick, die Belege des Orts. Keine Status-/Zaehlzeile mehr.
  function renderPanel() {
    clear(detailRegion);

    if (state.entity) {
      detailRegion.appendChild(el('div', { className: 'mob-entity__active' },
        el('span', { className: 'mob-entity__activename' }, state.entity.name),
        el('button', { className: 'mob-detail__clear', type: 'button',
          onClick: () => { state.entity = null; state.selectedCities = []; redraw(); } }, 'Auswahl lösen')));
    }

    // Mehrfachauswahl (E-151): jeder gewaehlte Ort bekommt seinen Block. Bei
    // genau einem Ort ist die Ausgabe dieselbe wie vor der Listenform.
    for (const city of state.selectedCities) {
      const list = currentAll().filter(o => cityOf(o.place) === city);
      detailRegion.appendChild(el('div', { className: 'mob-detail__head' },
        el('h3', { className: 'mob-detail__title' }, city),
        el('button', { className: 'mob-detail__clear', type: 'button',
          onClick: () => {
            state.selectedCities = state.selectedCities.filter(c => c !== city);
            setFilter({ ort: state.selectedCities });
          } }, 'Ort lösen')));

      // Zuordnungen: Anteile nach Sicht (gestapelter Balken + Zeilen mit Zahl).
      const bd = breakdownByView(list);
      const bar = el('div', { className: 'mob-detail__bar' });
      for (const s of barSegments(bd)) {
        const seg = el('span', { title: `${s.label}: ${s.count}` });
        seg.style.width = s.pct + '%';
        seg.style.background = s.color;
        bar.appendChild(seg);
      }
      detailRegion.appendChild(bar);
      const rows = el('div', { className: 'mob-detail__rows' });
      for (const b of bd) {
        const sw = el('span', { className: 'mob-detail__sw' });
        sw.style.background = b.color;
        rows.appendChild(el('div', { className: 'mob-detail__row' },
          sw, el('span', { className: 'mob-detail__rowlabel' }, b.label),
          el('span', { className: 'mob-detail__rown' }, String(b.count))));
      }
      detailRegion.appendChild(rows);

      // Dokumente: alle verknuepften Belege, nach Datum. docCount = distinkte Records.
      const docCount = new Set(list.map(o => o.recordId).filter(Boolean)).size;
      detailRegion.appendChild(el('div', { className: 'mob-detail__subhead' },
        `Dokumente (${docCount})`));
      const chips = el('div', { className: 'mob-chips' });
      for (const o of sortOcc(list)) chips.appendChild(buildOccChip(o));
      detailRegion.appendChild(chips);
    }
    if (state.selectedCities.length > 0) return;

    // Ohne Ortsauswahl: nicht verortbare Belege ehrlich ausweisen (kein
    // Kartenpunkt moeglich). Kompakt und eingeklappt, entitaetsbezogen.
    const unloc = currentAll().filter(o => o.placement === 'unlocatable');
    if (unloc.length) {
      const cities = [...new Set(unloc.map(o => cityOf(o.place)))];
      const det = el('details', { className: 'mob-unloc' });
      det.appendChild(el('summary', { className: 'mob-unloc__summary' },
        `${cities.length} Orte ohne Koordinate`));
      det.appendChild(el('div', { className: 'mob-detail__note' },
        'Erfasst, aber (noch) nicht mit Wikidata verortet — daher kein Kartenpunkt.'));
      const chips = el('div', { className: 'mob-chips' });
      for (const o of sortOcc(unloc)) chips.appendChild(buildOccChip(o));
      det.appendChild(chips);
      detailRegion.appendChild(det);
    }
  }

  // Geometrie laden (gecacht), dann zeichnen
  loadCountries().then(countries => {
    const map = buildMap(mapCell, countries, withGeo, state, {
      inEntity: inScope, inWindow,
      onSelectCity: city => {
        setFilter({ ort: state.selectedCities.includes(city)
          ? state.selectedCities.filter(c => c !== city)
          : [...state.selectedCities, city] });
      },
    });
    draw = map.draw;
    redraw();
  }).catch(() => {
    clear(mapCell);
    mapCell.appendChild(el('div', { className: 'mob-empty' },
      'Ländergeometrie konnte nicht geladen werden. Liste in der Sidebar nutzen.'));
  });

  logStamp('karte', [
    ['entitaeten', entities.length],
    ['orte', new Set(withGeo.map(o => cityOf(o.place))).size],
    ['belege', allOcc.length],
    ['unverortet', allOcc.length - withGeo.length],
    ['jahre', `${minYear}-${maxYear}`],
  ]);
}

// ---------------------------------------------------------------------------
// Beleg-Chip der Ortsauswahl
// ---------------------------------------------------------------------------

function buildOccChip(o) {
  const date = o.date ? (formatDate(o.date) || o.date) : '—';
  const place = o.place || 'unbekannt';
  // Verortungs-Notiz: macht die Sicherheit der Platzierung pro Beleg sichtbar.
  const note = o.placement === 'city' ? 'stadtgenau'
    : o.placement === 'far' ? 'weit · prüfen'
    : o.placement === 'unlocatable' ? (o.placeWikidata ? 'Q-ID ohne Koordinaten' : 'ohne Koordinate')
    : null;
  return buildRoleChip({
    prefix: o.roleLabel || (o.source === 'ste' ? 'EREIGNIS' : 'ORT'),
    value: `${place} · ${date}${note ? ' · ' + note : ''}`,
    xlsxSource: o.xlsxSource,
    wikidata: o.placeWikidata,
    tip: o.recordId || '',
    onClick: () => { if (o.recordId) window.location.hash = '#bestand/' + encodeURIComponent(o.recordId); },
  });
}
