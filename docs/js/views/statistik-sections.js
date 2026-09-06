/**
 * Statistics sections over the shared document cut.
 * Rows navigate through a shared facet or expose their complete evidence set.
 */

import { el } from '../utils/dom.js';
import { formatSignatur } from '../utils/format.js';
import { applyArchivFilter, navigateToView } from '../ui/router.js';
import { buildHorizontalBars } from '../ui/charts.js';
import {
  aggregateDocTypes, aggregateEntities, aggregateAgentRoles,
  aggregateStageRoles, aggregateComposers,
} from './statistik-data.js';

// Der Akzent als monochrome Leitfarbe; sequenzielle Abstufung fuer Long-Tail-Bars.
const KUG_BLUE = 'var(--accent)';

// Wie viele Zeilen eine Rangliste zeigt, bevor der Rest als Sammelzeile steht.
const BAR_TOP = 12;

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

function section(title) {
  const node = el('section', { className: 'stat-section' });
  node.appendChild(el('h3', { className: 'stat-section__title' }, title));
  return node;
}

/** Untersektion mit Titel; die Zahl steht im Titel, nicht in einer Caption. */
function subsection(parent, title) {
  const wrap = el('div', { className: 'stat-subsection' });
  wrap.appendChild(el('h4', { className: 'stat-subsection__title' }, title));
  parent.appendChild(wrap);
  return wrap;
}

function showEvidence(region, store, row) {
  region.replaceChildren();
  region.appendChild(el('h5', { className: 'stat-evidence__title' },
    `${row.label} · ${row.recordIds.length} Belege`));
  const list = el('div', { className: 'stat-evidence__list' });
  for (const id of row.recordIds) {
    const record = store && store.records ? store.records.get(id) : null;
    list.appendChild(el('button', {
      className: 'stat-evidence__record', type: 'button',
      dataset: { recordId: id },
      onClick: () => navigateToView('bestand', { recordId: id }),
    }, record
      ? `${formatSignatur(record['rico:identifier'])} · ${record['rico:title'] || '(ohne Titel)'}`
      : id));
  }
  region.appendChild(list);
}

function ranking(rows, { facet = null, evidence = false, store = null, color = () => KUG_BLUE } = {}) {
  const head = evidence ? rows : rows.slice(0, BAR_TOP);
  const maxValue = rows.reduce((max, row) => Math.max(max, row.count), 0) || 1;
  const detailRegion = el('div', { className: 'stat-evidence', 'aria-live': 'polite' });
  const barFor = (row, i) => {
    const hasEvidence = (row.evidence || evidence) && row.recordIds && row.recordIds.length;
    return {
      label: row.label,
      value: row.count,
      color: row.color || color(i, rows.length),
      onClick: hasEvidence
        ? () => showEvidence(detailRegion, store, row)
        : facet ? () => applyArchivFilter(facet, row.value ?? row.label) : null,
      tip: hasEvidence ? 'Belege anzeigen' : facet ? 'Im Bestand zeigen' : '',
    };
  };
  const tail = evidence ? [] : rows.slice(BAR_TOP);
  const chart = buildHorizontalBars(head.map(barFor), { maxValue });
  if (tail.length) {
    const more = el('button', {
      className: 'stat-ranking__more', type: 'button', 'aria-expanded': 'false',
      onClick: () => {
        const expanded = more.getAttribute('aria-expanded') === 'true';
        detailRegion.replaceChildren();
        if (!expanded) {
          detailRegion.appendChild(buildHorizontalBars(
            tail.map((row, i) => barFor(row, i + BAR_TOP)), { maxValue }));
        }
        more.setAttribute('aria-expanded', String(!expanded));
      },
    }, `Weitere (${tail.length})`);
    chart.appendChild(el('li', { className: 'stat-ranking__more-row' },
      more));
  }
  return el('div', { className: 'stat-ranking' }, chart, detailRegion);
}

// ---------------------------------------------------------------------------
// § Dokumenttypen
// ---------------------------------------------------------------------------

export function buildDokumenttypen(store, ids) {
  const node = section('Dokumenttypen');
  const docTypes = aggregateDocTypes(store, ids).filter(d => d.count > 0);
  const typed = docTypes.filter(d => d.id !== null);
  const ohneTyp = docTypes.find(d => d.id === null);

  const wrap = subsection(node, `Typen (${typed.length})`);
  const rows = typed.map(d => ({ ...d, value: d.id }));
  if (ohneTyp) rows.push({ ...ohneTyp, evidence: true, color: 'var(--color-text-tertiary)' });
  wrap.appendChild(ranking(rows, {
    facet: 'docType', color: blueShade, store,
  }));
  return node;
}

// ---------------------------------------------------------------------------
// § Repertoire — Werke, Buehnenrollen, Komponisten
// ---------------------------------------------------------------------------

export function buildRepertoire(store, ids) {
  const node = section('Repertoire');

  const werke = aggregateEntities(store, 'works', ids);
  if (werke.length) {
    subsection(node, `Werke (${werke.length})`)
      .appendChild(ranking(werke, { facet: 'werk' }));
  }

  const rollen = aggregateStageRoles(store, ids);
  if (rollen.length) {
    // Stage roles have no record facet, so the row exposes its evidence set.
    subsection(node, `Bühnenrollen (${rollen.length})`)
      .appendChild(ranking(rollen, { evidence: true, store }));
  }

  const komponisten = aggregateComposers(store, ids);
  if (komponisten.length) {
    subsection(node, `Komponisten (${komponisten.length})`)
      .appendChild(ranking(komponisten, { evidence: true, store }));
  }
  return node;
}

// ---------------------------------------------------------------------------
// § Personen
// ---------------------------------------------------------------------------

export function buildPersonen(store, ids) {
  const node = section('Personen');

  const personen = aggregateEntities(store, 'persons', ids);
  if (personen.length) {
    subsection(node, `Personen (${personen.length})`)
      .appendChild(ranking(personen, { facet: 'person' }));
  }

  const rollen = aggregateAgentRoles(store, ids);
  if (rollen.length) {
    // Agent roles have no shared facet; each row exposes its evidence set.
    subsection(node, `Rollen (${rollen.length})`)
      .appendChild(ranking(rollen, { evidence: true, store }));
  }
  return node;
}

// ---------------------------------------------------------------------------
// § Institutionen
// ---------------------------------------------------------------------------

export function buildInstitutionen(store, ids) {
  const node = section('Institutionen');
  const institutionen = aggregateEntities(store, 'organizations', ids);
  if (institutionen.length) {
    subsection(node, `Institutionen (${institutionen.length})`)
      .appendChild(ranking(institutionen, { facet: 'institution' }));
  }
  return node;
}
