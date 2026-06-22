/**
 * Statistik-View — interaktives Master-Detail-Dashboard ueber den Bestand.
 *
 * Geteilte Sidebar-Shell (viewShell/createSidebar) wie Karte und Netzwerk: links
 * waehlt ein uebergreifendes Single-Select genau eine von sechs Ansichten in zwei
 * Gruppen (Mobilitaet / Werk & Bestand). Darunter schneidet ein record-basierter
 * Zeitraum-Filter; bei event-getriebenen Ansichten kommen Sicht- und Land-Facetten
 * hinzu. Rechts rendert die gewaehlte Ansicht ueber die volle Breite (Live-Store,
 * kein Pipeline-Derivat). Tech-Reporting (Bearbeitungsstand, Wikidata-Abdeckung)
 * bleibt im Markdown-Report `data/reports/quality-snapshot.md`.
 *
 * Diese Datei ist reine View-Orchestrierung + DOM-Rendering. Alle Aggregationen,
 * der Zeit-/Facetten-Filter (filterStore) und die geteilten Sichten-Konstanten
 * liegen in `statistics-data.js` (keine DOM-/d3-Abhaengigkeit).
 */

/* global d3 */

import { clear, el } from '../utils/dom.js';
import { logStamp } from '../utils/env.js';
import { ortColor } from '../data/constants.js';
import { applyArchivFilter, navigateToView } from '../ui/router.js';
import { createSidebar, viewShell } from '../ui/sidebar.js';
import {
  SICHTEN, SICHT_COLOR,
  facetInventory, filterStore,
  aggregateSichten, aggregateEventRoles, aggregateDecadesBySicht,
  aggregatePlaces, aggregateCountries,
  aggregateDocTypes, aggregateAgentRelations, aggregateRelationPartners,
  aggregatePersonRollen, aggregateComposers, aggregateFinances,
} from './statistics-data.js';

// KUG-Blau als monochrome Leitfarbe; sequenzielle Abstufung fuer Long-Tail-Bars.
const KUG_BLUE = '#004A8F';

// Gedaempfte kategoriale Palette nur fuer den Netzwerk-/Finanz-Donut, wo ein
// Donut Kategorien zeigt. Kein Regenbogen: gesetzte, ruhige Toene.
const DONUT_PALETTE = [
  '#004A8F',  // KUG-Blau
  '#4B6A8C',  // Staubblau
  '#5F7A61',  // Salbei
  '#7A5245',  // Kastanie
  '#6B4E7D',  // Aubergine
  '#3D5A4F',  // Tannengruen
];

// Sequenzielle KUG-Blau-Abstufung fuer monochrome Ranglisten (Dokumenttypen).
// Index 0 = vollton, danach schrittweise aufgehellt; deckt die Top-Balken ab.
function blueShade(i, n) {
  const t = n > 1 ? i / (n - 1) : 0;
  // Lighten towards a pale blue without leaving the KUG-blue family.
  const lo = [0x00, 0x4A, 0x8F];
  const hi = [0xB6, 0xC8, 0xDE];
  const mix = lo.map((c, k) => Math.round(c + (hi[k] - c) * t * 0.75));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

// Dashboard-Bereiche in zwei Gruppen; Single-Select uebergreifend (genau eine
// aktive View). Event-getriebene Views erhalten die Sicht-/Land-Facetten.
const SECTIONS = [
  { id: 'wohin-wann',    group: 'Mobilität',      label: 'Wohin & Wann',       events: true,  build: buildWohinWann },
  { id: 'art',           group: 'Mobilität',      label: 'Art der Mobilität',  events: true,  build: buildArtDerMobilitaet },
  // "Mit wem" liegt in der Mobilitaets-Gruppe, ist aber NICHT event-facettierbar:
  // es zaehlt agentRelations (record-, nicht ereignisbasiert). Daher greifen nur
  // Zeitraum, keine Sicht/Land-Facetten — sonst staenden tote Regler.
  { id: 'netzwerk',      group: 'Mobilität',      label: 'Mit wem',            events: false, build: buildMitWem },
  { id: 'repertoire',    group: 'Werk & Bestand', label: 'Repertoire',         events: false, build: buildRepertoireSection },
  { id: 'personen',      group: 'Werk & Bestand', label: 'Personen',           events: false, build: buildPersonenSection },
  { id: 'dokumenttypen', group: 'Werk & Bestand', label: 'Dokumenttypen',      events: false, build: buildBestandSection },
  { id: 'finanzen',      group: 'Werk & Bestand', label: 'Finanzen',           events: false, build: buildFinanzenSection },
];

const SECTION_BY_ID = new Map(SECTIONS.map(s => [s.id, s]));

export function renderStatistik(store, container) {
  clear(container);

  // Inventar aus dem vollen Store: Jahresspektrum, Sichten- und Land-Facetten.
  const inv = facetInventory(store);
  const minYear = inv.minYear;
  const maxYear = inv.maxYear;
  const undatedTotal = inv.undatedTotal;

  // State: genau eine aktive Ansicht plus Zeitfenster plus zwei Event-Facetten.
  // sichtSel/landSel = null bedeutet "alle" (kein Schnitt).
  let active = 'wohin-wann';
  let lo = minYear, hi = maxYear;
  let sichtSel = null;   // Set<string> | null
  let landSel = null;    // Set<string> | null

  const activeDef = () => SECTION_BY_ID.get(active) || SECTIONS[0];
  const isEventView = () => activeDef().events;

  // Buehne: nur die aktive Ansicht, ueber die volle Breite.
  const stage = el('div', { className: 'statistik__stage' });
  const main = el('div', { className: 'view-main statistik-main' }, stage);

  // Status-Zeile: macht Zeitschnitt, ausgeblendete undatierte Records und die
  // wirkenden Facetten sichtbar (Erschliessungsspiegel, E-87).
  const noteEl = el('p', { className: 'stat-filter-note' });

  const sichtCount = () => (sichtSel ? sichtSel.size : 'alle');
  const landCount = () => (landSel ? landSel.size : 'alle');

  const updateNote = (fs, full) => {
    const parts = [];
    if (full) {
      parts.push(`Voller Zeitraum · ${store.allRecords.length} Dokumente`
        + (undatedTotal ? ` (inkl. ${undatedTotal} undatierte)` : ''));
    } else {
      parts.push(`Zeitfenster ${lo}–${hi} · ${fs.allRecords.length} von `
        + `${store.allRecords.length} Dokumenten`
        + (undatedTotal ? ` · ${undatedTotal} undatierte ausgeblendet` : ''));
    }
    // Facetten greifen nur in event-getriebenen Views und schneiden Ereignisse,
    // nicht Records; das hier ehrlich benennen.
    if (isEventView() && (sichtSel || landSel)) {
      const f = [];
      if (sichtSel) f.push(`Sicht: ${sichtSel.size} gewählt`);
      if (landSel) f.push(`Land: ${landSel.size} gewählt`);
      parts.push(`${f.join(' · ')} (schneidet Ereignisse, nicht Dokumente)`);
    }
    noteEl.textContent = parts.join(' — ');
  };

  // Aktuell geltende Facetten je nach View: record-only Views ignorieren
  // Sicht/Land (sie wirken nur auf Ereignisse).
  const currentFilters = () => ({
    lo, hi,
    sichten: isEventView() ? sichtSel : null,
    laender: isEventView() ? landSel : null,
  });

  // Neuaufbau der aktiven Ansicht mit dem gefilterten Sub-Store.
  let sidebar = null;
  const rebuild = () => {
    const f = currentFilters();
    // Nur das ZEITFENSTER entscheidet ueber "voll vs. geschnitten" — Facetten
    // schneiden Ereignisse, nicht Records, und blenden keine undatierten aus.
    const timeFull = (lo <= minYear && hi >= maxYear);
    const fs = filterStore(store, f);
    const def = activeDef();
    clear(stage);
    stage.appendChild(def.build(fs));
    updateNote(fs, timeFull);
  };
  let raf = 0;
  const scheduleRebuild = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; rebuild(); });
  };

  // Sidebar wird je nach aktiver View frisch gebaut: bei einer event-getriebenen
  // View erscheinen Sicht- und Land-Facetten, bei record-only Views nicht. Der
  // Shell wird erst beim ersten Mount aus der echten Sidebar gebaut (kein
  // Platzhalter — sonst stuende ein klassenloser Div als erstes Flex-Kind und
  // die .view-sidebar-Breitenregel griffe nicht).
  let shell = null;
  const mountSidebar = () => {
    const fresh = buildSidebar();
    if (sidebar) shell.replaceChild(fresh.element, sidebar.element);
    else shell = viewShell(fresh.element, main);
    sidebar = fresh;
  };

  // Wechsel der aktiven View: Sidebar neu (Facetten-Kontext) + Stage neu.
  const switchView = (id) => {
    if (id === active) return;
    active = id;
    mountSidebar();
    rebuild();
  };

  const ansichtSection = (groupTitle) => ({
    title: groupTitle,
    controls: [{
      kind: 'legend',
      items: SECTIONS.filter(s => s.group === groupTitle).map(d => ({
        id: d.id, label: d.label,
        // Neutrale Swatch: die Ansicht-Chips tragen keine irrefuehrende Leitfarbe.
        color: 'var(--color-text-tertiary)',
      })),
      isActive: (id) => id === active,
      onToggle: (id) => switchView(id),
    }],
  });

  function buildSidebar() {
    const sections = [
      ansichtSection('Mobilität'),
      ansichtSection('Werk & Bestand'),
      {
        title: 'Zeitraum',
        controls: [
          { kind: 'range', min: minYear, max: maxYear,
            from: () => lo, to: () => hi, fullLabel: true,
            onChange: (a, b) => { lo = a; hi = b; scheduleRebuild(); } },
          { kind: 'custom', node: noteEl },
        ],
      },
    ];

    // Facetten nur bei event-getriebenen Views — sie schneiden Ereignisse.
    if (isEventView()) {
      sections.push({
        title: 'Sicht',
        controls: [{
          kind: 'legend',
          items: inv.sichten.map(s => ({
            id: s.id, label: s.label, color: SICHT_COLOR[s.id] || KUG_BLUE,
            count: s.count,
          })),
          isActive: (id) => !sichtSel || sichtSel.has(id),
          onToggle: (id) => {
            if (!sichtSel) sichtSel = new Set(inv.sichten.map(s => s.id));
            if (sichtSel.has(id)) sichtSel.delete(id); else sichtSel.add(id);
            if (sichtSel.size === inv.sichten.length) sichtSel = null;
            sidebar.update();
            scheduleRebuild();
          },
        }],
      });
      sections.push({
        title: 'Land',
        controls: [{
          kind: 'legend',
          items: inv.laender.map(l => ({
            id: l.code, label: l.label,
            // Neutrale Farbe: Laender sind keine Mobilitaets-Sichten.
            color: 'var(--color-text-tertiary)', count: l.count,
          })),
          isActive: (id) => !landSel || landSel.has(id),
          onToggle: (id) => {
            if (!landSel) landSel = new Set(inv.laender.map(l => l.code));
            if (landSel.has(id)) landSel.delete(id); else landSel.add(id);
            if (landSel.size === inv.laender.length) landSel = null;
            sidebar.update();
            scheduleRebuild();
          },
        }],
      });
    }

    return createSidebar({ sections });
  }

  mountSidebar();
  container.appendChild(shell);
  rebuild();

  logStamp('statistik', [
    ['records', store.allRecords.length],
    ['events', store.mobilityEvents.size],
    ['personen', store.persons.size],
    ['ansichten', SECTIONS.length],
    ['aktiv', active],
    ['spanne', `${minYear}-${maxYear}`],
    ['undatiert', undatedTotal],
    ['sicht', sichtCount()],
    ['land', landCount()],
  ]);
}

// ---------------------------------------------------------------------------
// § Mobilitaet — Wohin & Wann
// ---------------------------------------------------------------------------

function buildWohinWann(store) {
  const section = el('section', { className: 'stat-section stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Wohin & Wann'));

  // Subsection 1: Jahrzehnte, gestapelt nach Mobilitaets-Sicht.
  const decades = aggregateDecadesBySicht(store);
  const whenWrap = el('div', { className: 'stat-subsection' });
  whenWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Wann & welche Art'));
  // Ehrliche Caption: datierte vs. alle Ereignisse.
  if (decades.total > decades.dated) {
    whenWrap.appendChild(el('p', { className: 'stat-subsection__note' },
      `${decades.dated} von ${decades.total} Ereignissen mit Jahresangabe — `
      + `${decades.total - decades.dated} ohne datierbares Jahr hier nicht gestapelt.`));
  }
  const segMeta = SICHTEN.map(s => ({ id: s.id, label: s.label }))
    .concat([{ id: 'neutral', label: 'Nicht klassifiziert' }]);
  whenWrap.appendChild(buildStackedBars(decades.rows, segMeta));
  section.appendChild(whenWrap);

  // Subsection 2: Reichweite ueber Laender, monochrom KUG-Blau.
  const countries = aggregateCountries(store);
  if (countries.length > 0) {
    const located = countries.reduce((s, c) => s + c.count, 0);
    const landWrap = el('div', { className: 'stat-subsection' });
    landWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Reichweite (Länder)'));
    if (decades.total > located) {
      landWrap.appendChild(el('p', { className: 'stat-subsection__note' },
        `${located} von ${decades.total} Ereignissen mit Länderangabe verortet.`));
    }
    landWrap.appendChild(buildHorizontalBars(countries.map(c => ({
      label: c.label, value: c.count, color: KUG_BLUE,
    }))));
    section.appendChild(landWrap);
  }

  // Subsection 3: Top-Orte (Stadt-Ebene) mit Wikidata-ext-Link + Bestand-Cross-Link.
  const places = aggregatePlaces(store).slice(0, 12);
  if (places.length > 0) {
    const placesWrap = el('div', { className: 'stat-subsection' });
    placesWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Top-Orte'));
    placesWrap.appendChild(buildHorizontalBars(places.map(p => {
      // Cross-Link nur, wenn der aggregierte Stadtname ein Orts-Eintrag ist.
      const linkable = store.locations.has(p.name);
      return {
        label: p.name,
        value: p.count,
        onClick: linkable ? () => applyArchivFilter('location', p.name) : null,
        hrefTitle: linkable ? `${p.name} im Bestand zeigen` : p.name,
        extraHref: p.qid ? `https://www.wikidata.org/wiki/${String(p.qid).replace(/^wd:/, '')}` : null,
        extraTitle: p.qid ? `Bei Wikidata ansehen (${p.qid})` : '',
        // Wiederkehrende Orte in ihrer konstanten Wiedererkennungsfarbe, sonst KUG-Blau.
        color: ortColor(p.name) || KUG_BLUE,
      };
    })));
    section.appendChild(placesWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// § Mobilitaet — Art der Mobilitaet
// ---------------------------------------------------------------------------

function buildArtDerMobilitaet(store) {
  const section = el('section', { className: 'stat-section stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Art der Mobilität'));

  // Subsection 1: die fuenf Sichten + Residual, in den Sicht-Farben.
  const rows = aggregateSichten(store).slice().sort((a, b) => b.count - a.count);
  const sichtWrap = el('div', { className: 'stat-subsection' });
  sichtWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Sichten'));
  sichtWrap.appendChild(buildHorizontalBars(rows.map(s => ({
    label: s.label,
    value: s.count,
    color: SICHT_COLOR[s.id] || KUG_BLUE,
    // Klick fuehrt in die Karte, dort nur diese Sicht aktiv. Residual hat kein Pendant.
    onClick: s.id === 'neutral' ? null : () => navigateToView('karte', { sicht: s.id }),
    hrefTitle: s.id === 'neutral' ? s.desc : `${s.label} auf der Karte zeigen`,
  }))));
  section.appendChild(sichtWrap);

  // Subsection 2: Auftrittstypen (Event-Rollen), jeder Balken in der Sicht-Farbe.
  const roles = aggregateEventRoles(store);
  if (roles.length > 0) {
    const roleWrap = el('div', { className: 'stat-subsection' });
    roleWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Auftrittstypen'));
    roleWrap.appendChild(el('p', { className: 'stat-subsection__note' },
      'Die Ensemble- oder Institutions-Zuordnung pro Ereignis ist derzeit nicht '
      + 'erfasst (z. B. Bayreuther Ensemble). Gastspiele erscheinen daher als Rolle '
      + 'und Ort, nicht nach Ensemble auswertbar.'));
    roleWrap.appendChild(buildHorizontalBars(roles.map(r => ({
      label: r.label,
      value: r.count,
      color: SICHT_COLOR[r.sicht] || SICHT_COLOR.neutral,
    }))));
    section.appendChild(roleWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// § Mobilitaet — Mit wem (Netzwerk: AgRelOn-Donut + Rollen-Bars)
// ---------------------------------------------------------------------------

function buildMitWem(store) {
  const section = el('section', { className: 'stat-section stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Mit wem'));

  const { items: relItems, total: relTotal } = aggregateAgentRelations(store);
  const { partners, namedRelations, allRelations } = aggregateRelationPartners(store);

  // Eine stabile Farbe je Beziehungstyp, geteilt zwischen Donut und Partnerliste,
  // damit der Klick-Filter visuell zusammenhaengt.
  const typeColor = new Map(relItems.map((it, i) => [it.label, DONUT_PALETTE[i % DONUT_PALETTE.length]]));

  // Drill-State: ein gewaehlter Typ filtert die Partnerliste; null = alle.
  let selectedType = null;

  // Rechte Spalte: benannte Partner, re-rendert bei Typ-Auswahl.
  const partnerWrap = el('div', { className: 'stat-subsection' });
  const partnerTitle = el('h4', { className: 'stat-subsection__title' }, 'Benannte Partner');
  partnerWrap.appendChild(partnerTitle);
  if (allRelations > 0) {
    partnerWrap.appendChild(el('p', { className: 'stat-subsection__note' },
      `${namedRelations} von ${allRelations} Relationen mit benanntem Gegenüber — bei den `
      + 'übrigen ist Malaniuk das genannte Ende. Klick auf ein Segment filtert nach Typ.'));
  }
  const partnerList = el('div');
  partnerWrap.appendChild(partnerList);

  const renderPartners = () => {
    clear(partnerList);
    const shown = selectedType
      ? partners.filter(p => p.byType.some(t => t.label === selectedType))
      : partners;
    partnerTitle.textContent = selectedType
      ? `Benannte Partner — ${selectedType}` : 'Benannte Partner';
    if (shown.length === 0) {
      partnerList.appendChild(el('p', { className: 'stat-subsection__note' },
        'Keine benannten Partner für diesen Beziehungstyp.'));
      return;
    }
    partnerList.appendChild(buildHorizontalBars(shown.map(p => {
      const segForType = selectedType ? p.byType.find(t => t.label === selectedType) : null;
      const value = segForType ? segForType.count : p.count;
      const dominant = selectedType || p.byType[0].label;
      return {
        label: p.name,
        value,
        color: typeColor.get(dominant) || KUG_BLUE,
        hrefTitle: p.byType.map(t => `${t.label} (${t.count})`).join(' · '),
      };
    })));
  };

  // Linke Spalte: Typ-Donut. Klick auf Segment oder Legendenzeile schaltet den
  // Partnerfilter (Toggle). Das ist die Zusammenfuehrung: Beziehungstyp x Partner.
  if (relTotal > 0) {
    const relWrap = el('div', { className: 'stat-subsection' });
    relWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      `AgRelOn-Relationen (${relTotal})`));
    relWrap.appendChild(buildDonut(
      relItems.map(item => ({
        label: item.label,
        value: item.count,
        color: typeColor.get(item.label),
        onClick: () => {
          selectedType = (selectedType === item.label) ? null : item.label;
          renderPartners();
        },
      })),
      { size: 300, ariaLabel: 'AgRelOn-Relationstypen, klickbar zum Filtern der Partner' },
    ));
    section.appendChild(relWrap);
  }

  renderPartners();
  section.appendChild(partnerWrap);
  return section;
}

// ---------------------------------------------------------------------------
// § Werk & Bestand — Personen (Funktions-Census des Bestands)
// ---------------------------------------------------------------------------

function buildPersonenSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Personen'));

  const rollItems = aggregatePersonRollen(store);
  section.appendChild(el('p', { className: 'stat-subsection__note' },
    `${store.persons.size} Personen im Bestand · nach Funktion (Mehrfachrollen möglich)`));

  if (rollItems.length > 0) {
    const top = rollItems.slice(0, 12);
    const wrap = el('div', { className: 'stat-subsection' });
    wrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      `Personen nach Rolle (Top ${top.length} von ${rollItems.length})`));
    wrap.appendChild(buildHorizontalBars(top.map(item => ({
      label: item.rolle,
      value: item.count,
      color: KUG_BLUE,
    }))));
    section.appendChild(wrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// § Werk & Bestand — Repertoire (Top-Komponisten)
// ---------------------------------------------------------------------------

function buildRepertoireSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Repertoire'));

  const composers = aggregateComposers(store);
  const top = composers.slice(0, 10);
  const subWrap = el('div', { className: 'stat-subsection' });
  subWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
    `Top 10 Komponisten (von ${composers.length})`));
  subWrap.appendChild(buildHorizontalBars(top.map(c => ({
    label: c.komponist,
    value: c.count,
    color: KUG_BLUE,
  }))));
  section.appendChild(subWrap);
  return section;
}

// ---------------------------------------------------------------------------
// § Werk & Bestand — Dokumenttypen (monochrome Rangliste)
// ---------------------------------------------------------------------------

function buildBestandSection(store) {
  const section = el('section', { className: 'stat-section' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Dokumenttypen'));

  const docTypes = aggregateDocTypes(store).filter(d => d.count > 0);
  const typed = docTypes.filter(d => d.id !== null);
  const ohneTyp = docTypes.find(d => d.id === null);
  const total = docTypes.reduce((s, d) => s + d.count, 0);

  section.appendChild(el('p', { className: 'stat-subsection__note' },
    `${total} Dokumente · ${typed.length} Typen`));

  // Long-Tail-Rangliste: monochrom in sequenzieller KUG-Blau-Abstufung statt
  // Regenbogen. Klick fuehrt in den Bestand, dort nach Dokumenttyp gefiltert.
  const BAR_TOP = 12;
  const head = typed.slice(0, BAR_TOP);
  const rows = head.map((d, i) => ({
    label: d.label, value: d.count, color: blueShade(i, head.length),
    onClick: () => applyArchivFilter('docType', d.id),
    hrefTitle: `${d.label} im Bestand zeigen`,
  }));
  const tail = typed.slice(BAR_TOP);
  if (tail.length) {
    rows.push({
      label: `Sonstige (${tail.length} Typen)`,
      value: tail.reduce((s, d) => s + d.count, 0),
      color: 'var(--color-sand)',
    });
  }
  if (ohneTyp) {
    rows.push({
      label: 'ohne Typ', value: ohneTyp.count, color: 'var(--color-text-tertiary)',
      onClick: () => applyArchivFilter('docType', '__none__'),
      hrefTitle: 'Records ohne klassifizierten Dokumenttyp im Bestand zeigen',
    });
  }

  section.appendChild(buildHorizontalBars(rows));
  return section;
}

// ---------------------------------------------------------------------------
// § Werk & Bestand — Finanzen (Waehrungs-Donut + Detail-Rollen)
// ---------------------------------------------------------------------------

function buildFinanzenSection(store) {
  const section = el('section', { className: 'stat-section stat-section--minor stat-section--split' });
  section.appendChild(el('h3', { className: 'stat-section__title' }, 'Finanzen'));

  const fin = aggregateFinances(store);

  // Codes mit Ziffern ("00 DM") sind Erfassungsartefakte, keine Waehrungen — als
  // eine gedaempfte Sammelgruppe buendeln statt als gleichrangige Waehrung zeigen
  // (Ehrlichkeitsprinzip, siehe datenfehler.md). Betraege werden NIE summiert,
  // nur Nennungen gezaehlt.
  const validCur = fin.currencies.filter(c => !/\d/.test(c.code));
  const suspectCur = fin.currencies.filter(c => /\d/.test(c.code));
  if (validCur.length > 0 || suspectCur.length > 0) {
    const curWrap = el('div', { className: 'stat-subsection' });
    curWrap.appendChild(el('h4', { className: 'stat-subsection__title' }, 'Währungen'));
    const curData = validCur.map((c, i) => ({
      label: `${c.label} (${c.code})`,
      value: c.count,
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
    }));
    if (suspectCur.length > 0) {
      const sum = suspectCur.reduce((s, c) => s + c.count, 0);
      curData.push({
        label: 'unklar (Erfassung)', value: sum, muted: true,
        color: 'var(--color-text-tertiary)',
        tip: `Fehlerhafte Währungsangaben: ${suspectCur.map(c => `${c.code} (${c.count})`).join(', ')}`,
      });
    }
    curWrap.appendChild(buildDonut(curData,
      { size: 300, ariaLabel: 'Währungen in den Finanznennungen' }));
    section.appendChild(curWrap);
  }

  if (fin.roles.length > 0) {
    const roleWrap = el('div', { className: 'stat-subsection' });
    roleWrap.appendChild(el('h4', { className: 'stat-subsection__title' },
      'Detail-Rollen'));
    // Rollen-Bars monochrom KUG-Blau.
    roleWrap.appendChild(buildHorizontalBars(fin.roles.map(r => ({
      label: r.role,
      value: r.count,
      color: KUG_BLUE,
    }))));
    section.appendChild(roleWrap);
  }

  return section;
}

// ---------------------------------------------------------------------------
// Visual helpers — Donut, Horizontal Bars, Stacked Bars, Histogram, Legend
// ---------------------------------------------------------------------------

/**
 * Gestapelte Jahrzehnt-Balken: je rows-Eintrag eine Zeile mit Decade-Label, einem
 * Track aus farbigen Segmenten je Sicht und einer Gesamtsumme. segMeta liefert die
 * Reihenfolge und Labels der Sicht-Segmente; die Faerbung kommt aus SICHT_COLOR.
 * rows: [{decade, total, bySicht:{sichtId:count}}].
 */
function buildStackedBars(rows, segMeta) {
  const wrap = el('div', { className: 'stat-stack-wrap' });
  const list = el('div', { className: 'stat-stack' });
  const max = rows.reduce((m, r) => Math.max(m, r.total), 0) || 1;

  for (const row of rows) {
    const track = el('div', { className: 'stat-stack__track' });
    for (const seg of segMeta) {
      const v = (row.bySicht && row.bySicht[seg.id]) || 0;
      if (v <= 0) continue;
      const segEl = el('span', {
        className: 'stat-stack__seg',
        title: `${row.decade}s · ${seg.label}: ${v}`,
      });
      segEl.style.width = `${(v / max) * 100}%`;
      segEl.style.background = SICHT_COLOR[seg.id] || SICHT_COLOR.neutral;
      track.appendChild(segEl);
    }
    list.appendChild(el('div', { className: 'stat-stack__row' },
      el('span', { className: 'stat-stack__label' }, `${row.decade}s`),
      track,
      el('span', { className: 'stat-stack__total' }, String(row.total)),
    ));
  }
  wrap.appendChild(list);

  // Sicht-Legende unterhalb der Stapel.
  const legend = el('div', { className: 'stat-stack-legend' });
  for (const seg of segMeta) {
    legend.appendChild(el('span', { className: 'stat-stack-legend__item' },
      el('span', { className: 'stat-stack-legend__swatch',
        style: `background:${SICHT_COLOR[seg.id] || SICHT_COLOR.neutral}` }),
      el('span', { className: 'stat-stack-legend__label' }, seg.label),
    ));
  }
  wrap.appendChild(legend);

  return wrap;
}

/**
 * Donut-Chart mit Legende rechts. data: [{label, value, color, muted?, onClick?, tip?}].
 * Faellt ohne d3 (CDN-Ausfall) auf eine kompakte Balkenliste zurueck.
 */
function buildDonut(data, { size = 300, ariaLabel = '' } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const wrap = el('div', { className: 'stat-chart stat-chart--donut' });

  if (typeof d3 === 'undefined' || total === 0) {
    wrap.appendChild(buildHorizontalBars(data.map(d => ({
      label: d.label, value: d.value, color: d.color, onClick: d.onClick,
    }))));
    return wrap;
  }

  const chartEl = el('div', { className: 'stat-chart__svg-wrap' });
  const radius = size / 2;
  const inner = radius * 0.55;

  const svg = d3.create('svg')
    .attr('viewBox', `${-radius} ${-radius} ${size} ${size}`)
    .attr('width', size)
    .attr('height', size)
    .attr('role', 'img')
    .attr('aria-label', ariaLabel);

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(inner).outerRadius(radius).padAngle(0.006).cornerRadius(2);

  // Hover-Verkettung Segment <-> Legende: ein aktiver Index hebt beide hervor,
  // alle anderen werden ueber die CSS-Klasse `is-hovering` gedimmt.
  const arcNodes = [];
  const legendRows = [];
  const setActive = (idx) => {
    wrap.classList.toggle('is-hovering', idx != null);
    arcNodes.forEach((n, i) => n && n.classList.toggle('is-active', i === idx));
    legendRows.forEach((n, i) => n && n.classList.toggle('is-active', i === idx));
  };

  svg.selectAll('path')
    .data(pie(data))
    .join('path')
      .attr('class', d => `stat-donut__arc${d.data.onClick ? ' stat-donut__arc--link' : ''}`)
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('opacity', d => d.data.muted ? 0.5 : 1)
      .each(function (d) { arcNodes[d.index] = this; })
      .on('mouseenter', (_, d) => setActive(d.index))
      .on('mouseleave', () => setActive(null))
      .on('click', (_, d) => { if (d.data.onClick) d.data.onClick(); })
      .append('title')
        .text(d => d.data.tip
          || `${d.data.label}: ${d.data.value} (${Math.round(d.data.value / total * 100)} %)`);

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.1em')
    .attr('class', 'stat-donut__center-value')
    .text(total);
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.1em')
    .attr('class', 'stat-donut__center-label')
    .text(data.length + ' Kategorien');

  chartEl.appendChild(svg.node());
  wrap.appendChild(chartEl);

  const legend = el('ul', { className: 'stat-chart__legend' });
  data.forEach((d, i) => {
    const { element, row } = buildLegendItem(d, i, total, setActive);
    legendRows[i] = row;
    legend.appendChild(element);
  });
  wrap.appendChild(legend);

  return wrap;
}

/**
 * Eine Legendenzeile. Mit `onClick` wird sie zum Cross-Link-Button (Drilldown),
 * mit `sub[]` zur aufklappbaren Gruppe ("Sonstige"), deren Kinder selbst wieder
 * Cross-Links sein koennen. `row` ist das Element fuer das Hover-Highlight.
 */
function buildLegendItem(d, idx, total, setActive) {
  const pct = total ? Math.round(d.value / total * 100) : 0;
  const hasSub = Array.isArray(d.sub) && d.sub.length > 0;
  const clickable = typeof d.onClick === 'function';

  const rowAttrs = {
    className: 'stat-chart__legend-row'
      + (clickable ? ' stat-chart__legend-row--link' : '')
      + (hasSub ? ' stat-chart__legend-row--group' : ''),
  };
  if (clickable) {
    rowAttrs.role = 'button';
    rowAttrs.tabindex = '0';
    rowAttrs.onClick = () => d.onClick();
    rowAttrs.onKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.onClick(); }
    };
  }
  const row = el('div', rowAttrs,
    el('span', {
      className: `stat-chart__legend-caret${hasSub ? '' : ' stat-chart__legend-caret--empty'}`,
      'aria-hidden': 'true',
    }, hasSub ? '›' : ''),
    el('span', { className: 'stat-chart__legend-swatch',
      style: `background:${d.color}; opacity:${d.muted ? 0.5 : 1}` }),
    el('span', { className: 'stat-chart__legend-label', dataset: { tip: d.tip || d.label } }, d.label),
    el('span', { className: 'stat-chart__legend-value' }, `${d.value} · ${pct} %`),
  );
  row.addEventListener('mouseenter', () => setActive(idx));
  row.addEventListener('mouseleave', () => setActive(null));

  const li = el('li', { className: 'stat-chart__legend-item' }, row);

  if (hasSub) {
    const subList = el('ul', { className: 'stat-chart__legend-sub' });
    subList.hidden = true;
    for (const s of d.sub) {
      const subPct = total ? Math.round(s.value / total * 100) : 0;
      const subClickable = typeof s.onClick === 'function';
      const subAttrs = {
        className: 'stat-chart__legend-subitem' + (subClickable ? ' stat-chart__legend-row--link' : ''),
      };
      if (subClickable) {
        subAttrs.role = 'button';
        subAttrs.tabindex = '0';
        subAttrs.onClick = () => s.onClick();
        subAttrs.onKeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.onClick(); }
        };
      }
      subList.appendChild(el('li', subAttrs,
        el('span', { className: 'stat-chart__legend-swatch', style: `background:${s.color}` }),
        el('span', { className: 'stat-chart__legend-label', dataset: { tip: s.tip || s.label } }, s.label),
        el('span', { className: 'stat-chart__legend-value' }, `${s.value} · ${subPct} %`),
      ));
    }
    row.addEventListener('click', () => {
      const open = subList.hidden;
      subList.hidden = !open;
      row.classList.toggle('is-open', open);
    });
    li.appendChild(subList);
  }

  return { element: li, row };
}

/**
 * Horizontale Bar-Liste. rows: [{label, value, href?, color?, onClick?, extraHref?}].
 * Keine Prozent, kein Bearbeitungsstand-Vokabular.
 */
function buildHorizontalBars(rows) {
  const list = el('ul', { className: 'stat-bars' });
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  for (const row of rows) {
    const li = el('li', { className: 'stat-bars__row' });

    // Label: in-App-Cross-Link (onClick) als Button, externer Link (href) als
    // Anker, sonst statischer Text.
    let label;
    if (typeof row.onClick === 'function') {
      label = el('span', {
        className: 'stat-bars__label stat-bars__label--link',
        role: 'button', tabindex: '0', title: row.hrefTitle || '',
        onClick: () => row.onClick(),
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.onClick(); } },
      }, row.label);
    } else if (row.href) {
      label = el('a', {
        className: 'stat-bars__label stat-bars__label--link',
        href: row.href, target: '_blank', rel: 'noopener', title: row.hrefTitle || '',
      }, row.label);
    } else {
      label = el('span', { className: 'stat-bars__label', title: row.hrefTitle || '' }, row.label);
    }

    const track = el('div', { className: 'stat-bars__track' });
    const fill = el('div', { className: 'stat-bars__fill' });
    fill.style.width = `${Math.max(2, Math.round((row.value / max) * 100))}%`;
    if (row.color) fill.style.background = row.color;
    track.appendChild(fill);

    const ext = row.extraHref
      ? el('a', {
          className: 'stat-bars__ext', href: row.extraHref,
          target: '_blank', rel: 'noopener', title: row.extraTitle || 'Externer Verweis',
          'aria-label': row.extraTitle || 'Externer Verweis',
        }, '↗')
      : null;

    li.appendChild(label);
    li.appendChild(track);
    li.appendChild(el('span', { className: 'stat-bars__count' }, ext, String(row.value)));
    list.appendChild(li);
  }
  return list;
}

// buildHistogram wurde mit dem Umbau auf gestapelte Jahrzehnt-Balken
// (buildStackedBars) ueberfluessig und entfernt (kein toter Code).
