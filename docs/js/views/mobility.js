/**
 * M³GIM Mobilitäts-View
 *
 * Eigenstaendige Perspektive auf alle SpatiotemporalEvents unter dem
 * Mobilitaetsaspekt: die fuenf Mobilitaetssichten aus datenmodell.md § 10
 * (inklusive der typisierten Reise-Ortsrollen), die Orte und die Zeit.
 * Statisch lesbar, deterministisch, Erschliessungsspiegel — Luecken stehen
 * sichtbar (datumslose, unverortete und kontextuelle Ereignisse).
 *
 * View-lokale Klassifikation: ordnet die E-97-Ortsrollen (zielort, absendeort,
 * abreiseort, empfangsort, vertragsort) der Reise- und Korrespondenzmobilitaet
 * zu, datenmodell.md § 10 folgend. Der globale `mobilityClusterFor`
 * (constants.js) laesst sie bis zur fachlichen Ratifikation neutral; diese
 * View greift bewusst nicht dort ein, damit Statistik und test_25 unberuehrt
 * bleiben. Echte Nicht-Mobilitaets-Rollen (Entstehung, Erwaehnung, Auftrag)
 * laufen sichtbar im Block "Weiterer Ortsbezug", nicht versteckt.
 */

import { el, clear } from '../utils/dom.js';
import { buildRoleChip } from './archive-inline-detail.js';
import { cityOf } from '../utils/format.js';
import { formatDate, extractYear } from '../utils/date-parser.js';
import { logStamp } from '../utils/env.js';

// Die fuenf Mobilitaetssichten (datenmodell.md § 10) plus ein transparenter
// Kontext-Block fuer Ortsbezuege ohne eigene Sicht. Reihenfolge bewusst.
const MOBILITY_TYPES = [
  {
    id: 'performativ',
    label: 'Performative Mobilität',
    frage: 'Wo trat sie auf?',
    desc: 'Auftritte, Aufführungen, Gastspiele, Premieren.',
    color: 'var(--color-sicht-performativ)',
    roles: ['auftritt', 'aufführung', 'auffuehrung', 'gastspiel', 'premiere',
      'wiederaufnahme', 'festvorstellung', 'probe', 'probenbeginn',
      'auftrittsdatum', 'auffuehrungsdatum', 'aufführungsdatum', 'probendatum',
      'premieredatum'],
  },
  {
    id: 'institutionell',
    label: 'Institutionelle Mobilität',
    frage: 'Wo war sie engagiert?',
    desc: 'Spielzeit-Engagements und Ensemble-Zugehörigkeit.',
    color: 'var(--color-sicht-institutionell)',
    roles: ['spielzeit', 'spielzeitvon', 'spielzeitbis'],
  },
  {
    id: 'reise',
    label: 'Reise- und Korrespondenzmobilität',
    frage: 'Woher, wohin, an wen?',
    desc: 'Reiseziele, Abreise-, Absende-, Empfangs- und Vertragsorte sowie '
      + 'die Datierungen des Briefverkehrs. Viele Ortsrollen tragen kein '
      + 'eigenes Datum, das Modell rät keines.',
    color: 'var(--color-sicht-korrespondenz)',
    roles: ['zielort', 'absendeort', 'abreiseort', 'empfangsort', 'vertragsort',
      'absendedatum', 'empfangsdatum', 'abreisedatum'],
  },
  {
    id: 'diskursiv',
    label: 'Diskursive Mobilität',
    frage: 'Wo wurde über sie berichtet?',
    desc: 'Rezensionen, Rundfunk und Druckerscheinungen.',
    color: 'var(--color-sicht-diskursiv)',
    roles: ['erscheinungsdatum', 'ausstrahlung', 'ausstrahlungsdatum'],
  },
  {
    id: 'biografisch',
    label: 'Biografische Mobilität',
    frage: 'Wo wohnte und lebte sie?',
    desc: 'Wohnsitze, Ausweise und persönliche Dokumente.',
    color: 'var(--color-sicht-biografisch)',
    roles: ['wohnort', 'ausstellungsdatum', 'gespräch', 'gespraech'],
  },
];

// Transparenter Rest: Ortsbezuege, die keine Mobilitaetssicht sind
// (Dokument- oder Werkentstehung, blosse Erwaehnung, Auftrag). Sichtbar
// gefuehrt statt stumm verworfen.
const KONTEXT = {
  id: 'kontext',
  label: 'Weiterer Ortsbezug',
  frage: 'Welche Orte nennt das Dokument sonst?',
  desc: 'Entstehungs- und Erwähnungsorte sowie Aufträge. Kein Beleg einer '
    + 'eigenen Bewegung, hier der Vollständigkeit halber gezeigt.',
  color: 'var(--color-text-tertiary)',
  roles: ['entstehung', 'erwähnt', 'erwaehnt', 'auftrag'],
};

const ROLE_TO_TYPE = (() => {
  const m = new Map();
  for (const t of [...MOBILITY_TYPES, KONTEXT]) {
    for (const r of t.roles) m.set(r, t.id);
  }
  return m;
})();

function typeForRole(role) {
  return ROLE_TO_TYPE.get(String(role || '').trim().toLowerCase()) || KONTEXT.id;
}

function hasGeo(ev) {
  return typeof ev.placeLat === 'number' && typeof ev.placeLon === 'number';
}

function eventDateLabel(ev) {
  if (!ev.date) return '—';
  return formatDate(ev.date) || ev.date;
}

export function renderMobilitaet(store, container) {
  clear(container);
  const events = [...store.mobilityEvents.values()];

  const wrap = el('div', { className: 'mobilitaet' });
  wrap.appendChild(buildIntro(events));

  const body = el('div', { className: 'mobilitaet__sections' });
  body.appendChild(buildSichtenSection(events));
  body.appendChild(buildOrteSection(events));
  body.appendChild(buildZeitSection(events));
  wrap.appendChild(body);

  container.appendChild(wrap);

  const byType = groupByType(events);
  logStamp('mobilitaet', [
    ['events', events.length],
    ['datiert', events.filter(e => extractYear(e.date) != null).length],
    ['verortet', events.filter(hasGeo).length],
    ['reise', (byType.get('reise') || []).length],
    ['kontext', (byType.get('kontext') || []).length],
    ['orte', new Set(events.map(e => cityOf(e.place)).filter(Boolean)).size],
  ]);
}

// ---------------------------------------------------------------------------
// Intro + Deckungs-Kennzahlen
// ---------------------------------------------------------------------------

function buildIntro(events) {
  const total = events.length;
  const datiert = events.filter(e => extractYear(e.date) != null).length;
  const verortet = events.filter(hasGeo).length;

  const intro = el('header', { className: 'mobilitaet__intro' });
  intro.appendChild(el('h2', { className: 'mobilitaet__title' }, 'Mobilität'));
  intro.appendChild(el('p', { className: 'mobilitaet__lead' },
    'Alle raumzeitlichen Ereignisse des Nachlasses unter dem Mobilitätsaspekt, '
    + 'geordnet nach den fünf Mobilitätssichten. Ein Erschließungsspiegel: '
    + 'datumslose, unverortete und rein kontextuelle Angaben stehen sichtbar, '
    + 'statt kaschiert zu werden.'));

  const badges = el('div', { className: 'mobilitaet__badges' });
  badges.appendChild(makeBadge(String(total), 'Ereignisse'));
  badges.appendChild(makeBadge(`${datiert}`, 'mit Jahr', total - datiert, 'ohne'));
  badges.appendChild(makeBadge(`${verortet}`, 'verortet', total - verortet, 'ohne Koordinaten'));
  intro.appendChild(badges);
  return intro;
}

function makeBadge(value, label, restValue, restLabel) {
  const b = el('div', { className: 'mob-badge' },
    el('span', { className: 'mob-badge__value' }, value),
    el('span', { className: 'mob-badge__label' }, label));
  if (restValue != null && restValue > 0) {
    b.appendChild(el('span', { className: 'mob-badge__rest' }, `${restValue} ${restLabel}`));
  }
  return b;
}

// ---------------------------------------------------------------------------
// § 1 Die fünf Mobilitätssichten
// ---------------------------------------------------------------------------

function groupByType(events) {
  const map = new Map();
  for (const ev of events) {
    const t = typeForRole(ev.role);
    if (!map.has(t)) map.set(t, []);
    map.get(t).push(ev);
  }
  return map;
}

function buildSichtenSection(events) {
  const section = el('section', { className: 'mob-section' });
  section.appendChild(el('h3', { className: 'mob-section__title' }, 'Die fünf Mobilitätssichten'));
  section.appendChild(el('p', { className: 'mob-section__lead' },
    'Jedes Ereignis nach seiner Rolle einer Sicht zugeordnet. Die Reisemobilität '
    + 'bündelt die typisierten Ortsrollen, auch die datumslosen. Ein Klick auf '
    + 'einen Chip öffnet das Dokument im Bestand.'));

  const byType = groupByType(events);
  for (const t of MOBILITY_TYPES) {
    section.appendChild(buildSichtBlock(t, byType.get(t.id) || []));
  }
  const kontext = byType.get(KONTEXT.id) || [];
  if (kontext.length > 0) {
    section.appendChild(buildSichtBlock(KONTEXT, kontext));
  }
  return section;
}

function buildSichtBlock(type, evs) {
  const block = el('div', { className: 'mob-sicht', dataset: { sicht: type.id } });
  block.style.setProperty('--sicht-color', type.color);

  const head = el('div', { className: 'mob-sicht__head' },
    el('span', { className: 'mob-sicht__accent' }),
    el('div', { className: 'mob-sicht__heading' },
      el('h4', { className: 'mob-sicht__label' }, type.label),
      el('span', { className: 'mob-sicht__frage' }, type.frage)),
    el('span', { className: 'mob-sicht__count' }, String(evs.length)));
  block.appendChild(head);
  block.appendChild(el('p', { className: 'mob-sicht__desc' }, type.desc));

  if (evs.length === 0) {
    block.appendChild(el('p', { className: 'mob-sicht__empty' },
      'Keine Belege im aktuellen Datenstand.'));
    return block;
  }

  const chips = el('div', { className: 'mob-chips' });
  for (const ev of sortEvents(evs)) {
    chips.appendChild(buildEventChip(ev));
  }
  block.appendChild(chips);
  return block;
}

// Deterministische Reihenfolge: nach Jahr (datierte zuerst), dann Ort, dann Rolle.
function sortEvents(evs) {
  return evs.slice().sort((a, b) => {
    const ya = extractYear(a.date), yb = extractYear(b.date);
    if (ya != null && yb != null && ya !== yb) return ya - yb;
    if (ya != null && yb == null) return -1;
    if (ya == null && yb != null) return 1;
    const pa = (a.place || '').localeCompare(b.place || '', 'de-DE');
    if (pa !== 0) return pa;
    return (a.role || '').localeCompare(b.role || '', 'de-DE');
  });
}

function buildEventChip(ev) {
  const place = ev.place || 'unbekannt';
  const date = eventDateLabel(ev);
  return buildRoleChip({
    prefix: ev.role || 'EVENT',
    value: `${place} · ${date}`,
    xlsxSource: ev.xlsxSource,
    wikidata: ev.placeWikidata,
    tip: ev.id,
    onClick: () => {
      if (ev.recordId) {
        window.location.hash = '#bestand/' + encodeURIComponent(ev.recordId);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// § 2 Orte
// ---------------------------------------------------------------------------

function aggregatePlaces(events) {
  // Auf Stadt-Ebene konsolidieren (cityOf), damit adressgenaue Varianten nicht
  // zersplittern. Ein Ort gilt als verortet, sobald irgendein Ereignis dort
  // Koordinaten traegt; sonst unverortet (Erschliessungsspiegel).
  const map = new Map();
  for (const ev of events) {
    if (!ev.place) continue;
    const city = cityOf(ev.place);
    if (!map.has(city)) {
      map.set(city, { name: city, count: 0, geo: false, qid: null });
    }
    const e = map.get(city);
    e.count++;
    if (hasGeo(ev)) e.geo = true;
    if (!e.qid && ev.placeWikidata) e.qid = ev.placeWikidata;
  }
  return [...map.values()].sort((a, b) =>
    b.count - a.count || a.name.localeCompare(b.name, 'de-DE'));
}

function buildOrteSection(events) {
  const section = el('section', { className: 'mob-section' });
  section.appendChild(el('h3', { className: 'mob-section__title' }, 'Orte'));
  section.appendChild(el('p', { className: 'mob-section__lead' },
    'Alle belegten Orte auf Stadt-Ebene, nach Häufigkeit. Orte ohne '
    + 'Koordinaten erscheinen markiert, sie fehlen einer Kartenansicht.'));

  const places = aggregatePlaces(events);
  const max = places.length ? places[0].count : 1;

  const list = el('ul', { className: 'mob-bars' });
  for (const p of places) {
    const row = el('li', { className: 'mob-bars__row' });
    const labelCell = p.qid
      ? el('a', {
          className: 'mob-bars__label mob-bars__label--link',
          href: `https://www.wikidata.org/wiki/${String(p.qid).replace(/^wd:/, '')}`,
          target: '_blank', rel: 'noopener noreferrer',
          title: `Wikidata: ${p.qid}`,
        }, p.name)
      : el('span', { className: 'mob-bars__label' }, p.name);
    row.appendChild(labelCell);

    const track = el('div', { className: 'mob-bars__track' });
    const fill = el('div', { className: `mob-bars__fill${p.geo ? '' : ' mob-bars__fill--unverortet'}` });
    fill.style.width = `${Math.max(4, Math.round(p.count / max * 100))}%`;
    track.appendChild(fill);
    row.appendChild(track);

    const count = el('span', { className: 'mob-bars__count' },
      p.geo ? String(p.count) : `${p.count} · unverortet`);
    row.appendChild(count);
    list.appendChild(row);
  }
  section.appendChild(list);
  return section;
}

// ---------------------------------------------------------------------------
// § 3 Zeit
// ---------------------------------------------------------------------------

function aggregateDecades(events) {
  const buckets = new Map();
  let datiert = 0;
  for (const ev of events) {
    const y = extractYear(ev.date);
    if (y == null) continue;
    datiert++;
    const decade = Math.floor(y / 10) * 10;
    buckets.set(decade, (buckets.get(decade) || 0) + 1);
  }
  if (buckets.size === 0) return { rows: [], datiert };
  const min = Math.min(...buckets.keys());
  const max = Math.max(...buckets.keys());
  const rows = [];
  for (let d = min; d <= max; d += 10) {
    rows.push({ decade: d, count: buckets.get(d) || 0 });
  }
  return { rows, datiert };
}

function buildZeitSection(events) {
  const section = el('section', { className: 'mob-section' });
  section.appendChild(el('h3', { className: 'mob-section__title' }, 'Zeit'));
  section.appendChild(el('p', { className: 'mob-section__lead' },
    'Datierte Ereignisse pro Jahrzehnt. Ereignisse ohne datierbares Jahr, '
    + 'darunter die meisten Reise-Ortsrollen, sind hier nicht darstellbar.'));

  const { rows, datiert } = aggregateDecades(events);
  const ohne = events.length - datiert;
  if (ohne > 0) {
    section.appendChild(el('p', { className: 'mob-section__note' },
      `${datiert} von ${events.length} Ereignissen mit datierbarem Jahr, `
      + `${ohne} ohne Datum hier nicht dargestellt.`));
  }

  if (rows.length === 0) {
    section.appendChild(el('p', { className: 'mob-sicht__empty' },
      'Keine datierten Ereignisse.'));
    return section;
  }

  const max = Math.max(...rows.map(r => r.count), 1);
  const list = el('ul', { className: 'mob-bars' });
  for (const r of rows) {
    const row = el('li', { className: 'mob-bars__row' });
    row.appendChild(el('span', { className: 'mob-bars__label' }, `${r.decade}er`));
    const track = el('div', { className: 'mob-bars__track' });
    const fill = el('div', { className: 'mob-bars__fill' });
    fill.style.width = `${Math.max(r.count ? 4 : 0, Math.round(r.count / max * 100))}%`;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', { className: 'mob-bars__count' }, String(r.count)));
    list.appendChild(row);
  }
  section.appendChild(list);
  return section;
}
