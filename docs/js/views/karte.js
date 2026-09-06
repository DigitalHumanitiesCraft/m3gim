/**
 * M³GIM Karten-View — entitaetszentriert (D3-geo).
 *
 * Forschungswerkzeug fuer die Frage "wo war diese Entitaet praesent?". Man waehlt
 * eine Entitaet (Organisation, Person oder Werk) in der Sidebar; die Karte zeigt
 * alle Orte, die an ihren Records haengen, als Punkte. Beim Werk sind das die
 * Orte der Dokumente, die es nennen, also die belegten Auffuehrungsorte. Ohne gewaehlte Entitaet zeigt
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
 * zusammengezogen (Record-Orte + verortete Annotationen). Ein Knoten schluesselt
 * die Ortsrollen seiner Belege auf und traegt die Farbe der haeufigsten; die
 * Groesse traegt die Belegzahl im Zeitfenster.
 */

import { el, clear } from '../utils/dom.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import { buildRoleChip } from './record-chips.js';
import { cityOf } from '../utils/format.js';
import { formatDate, extractYear } from '../utils/date-parser.js';
import { logStamp } from '../utils/env.js';
import { getFilter, setFilter, facetValues } from '../ui/filter-state.js';
import { navigateToView } from '../ui/router.js';
import { familyIcon } from '../ui/family-icons.js';
import { onViewNavigate } from '../ui/events.js';
import { recordsFor, yearBounds } from '../data/records-for.js';
import { REST_COLOR } from './statistik-data.js';
import {
  buildEntities, buildOccurrences, placeRoleScale, hasGeo,
  breakdownByRole, barSegments, sortOcc, unlocatedPlaces, occurrencesInCut,
} from './karte-data.js';
import { entitySection } from './karte-picker.js';
import { buildMap, loadCountries } from './karte-map.js';

/* global d3 */

let _sidebar = null;

// Ein Sprung aus den Indizes nennt seine Entitaet im Navigationskontext
// (E-226). Der Name wird hier gemerkt und von renderMobilitaet anstelle der
// Malaniuk-Voreinstellung gewaehlt; ist die Karte schon gezeichnet, setzt
// _applyEntity ihn direkt.
let _wantedEntity = null;
let _applyEntity = null;

onViewNavigate('karte', (detail) => {
  const name = detail && detail.entity;
  if (!name) return;
  _wantedEntity = name;
  if (_applyEntity) _applyEntity(name);
});

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
  // The colour axis stands over the whole Bestand and not over the cut: a role
  // keeps its colour while the filter moves the shares.
  const roleScale = placeRoleScale(allOcc);
  const datedYears = allOcc.map(o => extractYear(o.date)).filter(y => y != null);
  const minYear = datedYears.length ? Math.min(...datedYears) : 1940;
  const maxYear = datedYears.length ? Math.max(...datedYears) : 1980;
  // Die Schiene laeuft ueber dieselben Jahre wie in jeder anderen Ansicht, sonst
  // meint ein hier gesetztes Zeitfenster beim Wechsel etwas anderes. Dass die
  // verorteten Belege nur einen Teil davon fuellen, sagt das Band auf der
  // Schiene, nicht eine engere Schiene.
  const span = {
    ...yearBounds(store),
    covered: {
      min: minYear, max: maxYear,
      tip: `Verortete Belege liegen zwischen ${minYear} und ${maxYear}.`,
    },
  };

  const state = {
    entity: null,          // gewaehlte Entitaet oder null (= alle)
    selectedCities: [],
  };

  // Entitaet loesen: dieselbe Wirkung fuer den Chip der Filterleiste (E-223)
  // und den Kopf der Detail-Region.
  const clearEntity = () => { state.entity = null; state.selectedCities = []; redraw(); };

  // Malaniuk ist die Voreinstellung: die Karte beantwortet "wo war diese
  // Entitaet praesent", und ohne Wahl stuende sie auf der Gesamt-Geografie.
  // Eine per Navigation genannte Entitaet geht vor.
  state.entity = (_wantedEntity && entities.find(e => e.name === _wantedEntity))
    || entities.find(e => /Malaniuk/i.test(e.name)) || null;
  _wantedEntity = null;
  _applyEntity = (name) => {
    const hit = entities.find(e => e.name === name);
    if (!hit) return;
    state.entity = hit;
    state.selectedCities = [];
    redraw();
  };

  // Pull the shared document cut in as the eligible Beleg set. Search and the
  // primary record time anchor are resolved once by recordsFor; annotation
  // dates remain provenance and never create a second, narrower cut here.
  let cutOcc = new Set();
  function pullSharedIntoState(shared) {
    state.selectedCities = facetValues(shared, 'ort');
    cutOcc = new Set(occurrencesInCut(store, allOcc, shared));
  }
  pullSharedIntoState(getFilter());

  // Der geteilte Schnitt. Nur die Entitaetswahl verengt ihn karten-lokal; das
  // Land steht seit F1 als geteilte Facette in der Spalte.
  const inCut = o => cutOcc.has(o);
  const inEntity = o => !state.entity || state.entity.records.has(o.recordId);
  // Was die Karte zeichnet: geteilter Schnitt und Entitaet zusammen.
  const inScope = o => inCut(o) && inEntity(o);

  // Points, counts and evidence lists read the identical eligible set.
  const currentAll = () => allOcc.filter(inScope);

  // The one way from a place to its Belege: the place enters the shared ort
  // facet, and the detail region answers with its documents. Map node and the
  // list of places the map cannot draw take that same way, otherwise the list
  // would lead somewhere else than the point beside it.
  function toggleCity(city) {
    setFilter({ ort: state.selectedCities.includes(city)
      ? state.selectedCities.filter(c => c !== city)
      : [...state.selectedCities, city] });
  }

  // Ereignis-Region (Statuszeile / Ortsauswahl).
  const detailRegion = el('div', { className: 'mob-panel__detail' });
  const panelNode = el('div', { className: 'mob-panel' }, detailRegion);

  // The places of the cut the map cannot draw. They stand as rows beside the
  // map, in the chip row pattern of the legend, and lead to their documents
  // through the same click as a map point (F4).
  const unlocRows = () => unlocatedPlaces(currentAll());
  function paintUnloc(region) {
    clear(region);
    for (const row of unlocRows()) {
      const on = state.selectedCities.includes(row.city);
      const reason = row.wikidata
        ? 'Wikidata-Treffer ohne Koordinaten im Datensatz'
        : 'ohne Wikidata-Treffer, daher ohne Koordinaten';
      region.appendChild(el('button', {
        className: 'vs-chip', type: 'button', 'aria-pressed': String(on),
        dataset: { tip: reason + (on ? ' · Ortsschnitt lösen' : ' · Belege zeigen'),
          tipWrap: '', tipPos: 'bottom-left' },
        onClick: () => toggleCity(row.city),
      },
        el('span', { className: 'mob-vmark mob-vmark--unloc'
          + (row.wikidata ? ' mob-vmark--unloc-qid' : ''), 'aria-hidden': 'true' }),
        el('span', { className: 'vs-chip__label' }, row.city),
        el('span', { className: 'vs-chip__count' }, String(row.records))));
    }
  }

  // ---- Sidebar: das geteilte Geruest plus die view-eigenen Sektionen ----
  if (_sidebar) _sidebar.destroy();
  const sidebar = createSidebar(store, {
    yearSpan: span,
    search: { placeholder: 'Signatur, Titel, Typ oder Datum' },
    getCount: () => recordsFor(store, getFilter()).ids.size,
    getScopeDescription: () => `${new Set(currentAll().map(o => o.recordId).filter(Boolean)).size} Dokumente mit Ortsbelegen in dieser Kartenauswahl; Dokumente ohne Ortsbeleg bleiben Teil des gemeinsamen Schnitts.`,
    // Die view-eigenen Sektionen starten zugeklappt, damit die geteilten Filter
    // ohne Scrollen in der Spalte stehen; ihre Wahl steht im Streifen ueber den
    // Daten und geht dabei nicht verloren.
    sections: [
      entitySection(entities, state, () => {
        state.selectedCities = [];
        setFilter({ ort: [] });
        redraw();
      }),
      {
        // F4: no place vanishes silently. The section falls away once the cut
        // carries no such place, and otherwise its number says how much stands
        // beside the map instead of on it.
        title: () => `Ohne Kartenpunkt (${unlocRows().length})`,
        collapsible: true,
        collapsed: () => true,
        hidden: () => unlocRows().length === 0,
        tip: () => 'Orte des Ausschnitts ohne Koordinate im Datensatz, daher ohne '
          + 'Kartenpunkt. Grüner Ring: Wikidata-Treffer, dem die Koordinaten fehlen. '
          + 'Grauer Ring: kein Treffer des Abgleichs. Die Zahl nennt die Dokumente.',
        controls: [{ kind: 'custom', className: 'vs-legend', build: paintUnloc,
          update: paintUnloc }],
      },
    ],
    legend: [
      {
        // The six most frequent place roles carry a hue, every rarer one
        // shares the grey; their names stand in the node's tooltip.
        title: 'Farbschlüssel',
        controls: [{ kind: 'staticLegend', rows: legendRows(roleScale) }],
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
    // The entity is the one narrowing the Karte still owns; it stands in the
    // strip like any facet and answers to the same reset (E-223).
    localChips: () => (state.entity
      ? [{ title: 'Entität', chips: [{ label: state.entity.name, onRemove: clearEntity }] }]
      : []),
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

  // Detail-Region: nur die gewaehlte Entitaet (Kopf mit Loesen) und, bei
  // Knoten-Klick, die Belege des Orts. Keine Status-/Zaehlzeile mehr.
  function renderPanel() {
    clear(detailRegion);

    if (state.entity) {
      // Die Inhaltsfamilie der Wahl steht als Symbol in Familienfarbe, wie in
      // Register, Bestand, Detail und seit E-241 auch in der Vorschlagszeile
      // der Entitaetswahl.
      const fam = state.entity.family
        ? familyIcon(state.entity.family,
            { size: 14, className: `fam-mark fam-mark--${state.entity.family}` })
        : null;
      detailRegion.appendChild(el('div', { className: 'mob-entity__active' },
        fam,
        el('span', { className: 'mob-entity__activename' }, state.entity.name),
        el('button', { className: 'mob-detail__clear', type: 'button',
          onClick: clearEntity }, 'Auswahl lösen')));
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

      // Shares by place role: stacked bar plus one row per role with its count.
      const bd = breakdownByRole(list, roleScale);
      const bar = el('div', { className: 'mob-detail__bar' });
      for (const s of barSegments(bd)) {
        // No tooltip: the rows under the bar already name label and count.
        const seg = el('span');
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
  }

  // Geometrie laden (gecacht), dann zeichnen
  loadCountries().then(countries => {
    const map = buildMap(mapCell, countries, withGeo, state, {
      isEligible: inScope, roleScale,
      windowActive: () => Array.isArray(getFilter().zeitfenster),
      onSelectCity: toggleCity,
    });
    draw = map.draw;
    redraw();
  }).catch(error => {
    console.error('Karte konnte nicht aufgebaut werden:', error);
    clear(mapCell);
    mapCell.appendChild(el('div', { className: 'mob-empty' },
      'Ländergeometrie konnte nicht geladen werden. Liste in der Sidebar nutzen.'));
  });

  logStamp('karte', [
    ['entitaeten', entities.length],
    ['ortsrollen', roleScale.size],
    ['orte', new Set(withGeo.map(o => cityOf(o.place))).size],
    ['belege', allOcc.length],
    ['unverortet', allOcc.length - withGeo.length],
    ['schiene', `${span.min}-${span.max}`],
    ['belegte jahre', `${minYear}-${maxYear}`],
  ]);
}

/** The colour key: the roles that carry a hue plus one row for the grey rest
 *  where there is one. More rows would make the column scroll. */
function legendRows(scale) {
  const rows = [];
  let rest = 0;
  for (const entry of scale.values()) {
    if (entry.color === REST_COLOR) { rest += 1; continue; }
    rows.push({ color: entry.color, label: entry.label });
  }
  if (rest > 0) rows.push({ color: REST_COLOR, label: `weitere (${rest})` });
  return rows;
}

// ---------------------------------------------------------------------------
// Beleg-Chip der Ortsauswahl
// ---------------------------------------------------------------------------

function buildOccChip(o) {
  const place = o.place || 'unbekannt';
  // Verortungs-Notiz: macht die Sicherheit der Platzierung pro Beleg sichtbar.
  const note = o.placement === 'city' ? 'stadtgenau'
    : o.placement === 'far' ? 'weit · prüfen'
    : o.placement === 'unlocatable' ? (o.placeWikidata ? 'Q-ID ohne Koordinaten' : 'ohne Koordinate')
    : null;
  // The annotation date is evidence provenance; the shared time cut uses the
  // primary record anchor and retains records without an anchor.
  const dated = o.date ? (formatDate(o.date) || o.date) : null;
  const tail = note ? ' · ' + note : '';
  const value = dated
    ? `${place} · ${dated}${tail}`
    : el('span', {}, `${place} · `,
        el('em', { className: 'mob-chip__undated' }, 'o. D.'), tail);
  return buildRoleChip({
    prefix: o.roleLabel || (o.source === 'ste' ? 'EREIGNIS' : 'ORT'),
    value,
    wikidata: o.placeWikidata,
    tip: o.recordId || '',
    // Through the router, so the hash keeps the shared filter (user-story
    // audit 2026-09-03).
    onClick: () => { if (o.recordId) navigateToView('bestand', { recordId: o.recordId }); },
  });
}
