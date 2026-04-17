/**
 * M³GIM Erschliessungsstand — Browsing-UI fuer den Quality-Snapshot (E-75).
 *
 * Laedt docs/data/quality-snapshot.json und rendert die Sektionen als
 * tabellen- und chip-basierte Report-Seite. Pipeline-Quelle:
 * scripts/report-quality.py (schreibt MD + JSON).
 */

import { el, clear } from '../utils/dom.js';

let snapshotPromise = null;
function loadSnapshot() {
  if (!snapshotPromise) {
    snapshotPromise = fetch('./data/quality-snapshot.json')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
  }
  return snapshotPromise;
}

export async function renderErschliessungsstand(_store, container) {
  clear(container);
  container.appendChild(el('div', { className: 'eschl-loading' }, 'Lade Quality-Snapshot\u2026'));
  let data;
  try {
    data = await loadSnapshot();
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { className: 'eschl-error' },
      el('p', {}, 'Quality-Snapshot nicht verfuegbar.'),
      el('p', { className: 'eschl-hint' },
        'Pipeline-Lauf nachziehen: ',
        el('code', {}, 'python scripts/report-quality.py'),
      ),
    ));
    return;
  }
  clear(container);

  const wrapper = el('div', { className: 'eschl-view' });

  wrapper.appendChild(el('header', { className: 'eschl-header' },
    el('h2', {}, 'Erschlie\u00dfungsstand'),
    el('p', { className: 'eschl-subtitle' },
      'Datenqualit\u00e4t, Wikidata-Coverage, offene Bl\u00f6cker'),
    el('p', { className: 'eschl-meta' },
      `Generiert: ${data.generated || '\u2014'} \u00b7 `,
      `Grundlage: `,
      el('code', {}, data.source?.jsonld || 'm3gim.jsonld'),
    ),
  ));

  wrapper.appendChild(renderCoverage(data.coverage));
  wrapper.appendChild(renderWikidata(data.wikidata));
  wrapper.appendChild(renderBlockers(data.blockers));

  container.appendChild(wrapper);
}

function pct(n) {
  if (n == null || !Number.isFinite(n)) return '\u2014';
  return `${Math.round(n * 100)}\u2009%`;
}

function renderCoverage(cov) {
  const section = el('section', { className: 'eschl-section' });
  section.appendChild(el('h3', { className: 'eschl-section-title' }, 'VERKN\u00dcPFUNG & PROVENIENZ'));

  if (cov?.link_rate) {
    const lr = cov.link_rate;
    section.appendChild(el('p', { className: 'eschl-headline' },
      el('strong', {}, `${lr.linked}/${lr.total}`),
      ' Records mit mindestens einer Verkn\u00fcpfung (',
      el('strong', {}, pct(lr.pct)),
      ').',
    ));
  }

  if (cov?.konvolute_multi && cov.konvolute_multi.length > 0) {
    section.appendChild(el('h4', {}, 'Konvolute mit mehreren Folios'));
    section.appendChild(buildTable(
      ['Konvolut', 'Records', 'verlinkt', 'Rate'],
      cov.konvolute_multi.map((k) => [
        k.konvolut,
        String(k.total),
        String(k.linked),
        pct(k.rate),
      ]),
      [null, 'num', 'num', 'num'],
    ));
  }

  if (cov?.single_aggregate) {
    const s = cov.single_aggregate;
    section.appendChild(el('p', { className: 'eschl-note' },
      `Einzelobjekte: ${s.linked} von ${s.total} verlinkt (${pct(s.rate)}), `,
      `verteilt auf ${s.signatures} Signaturen.`,
    ));
  }

  if (cov?.provenance) {
    const p = cov.provenance;
    section.appendChild(el('h4', {}, 'Provenance-Coverage'));
    section.appendChild(buildTable(
      ['Ebene', 'mit Quelle', 'gesamt', 'Quote'],
      [
        ['Records mit xlsxSource',               String(p.records_with_xlsx?.n), String(p.records_with_xlsx?.total), pct(p.records_with_xlsx?.pct)],
        ['Records mit agrelon:hasProvenance',    String(p.records_with_agrelon_provenance?.n), String(p.records_with_agrelon_provenance?.total), pct(p.records_with_agrelon_provenance?.pct)],
        ['Nested Entities mit xlsxSource',       String(p.nested_with_xlsx?.n), String(p.nested_with_xlsx?.total), pct(p.nested_with_xlsx?.pct)],
      ],
      [null, 'num', 'num', 'num'],
    ));
  }

  if (cov?.bearbeitungsstand && cov.bearbeitungsstand.length > 0) {
    section.appendChild(el('h4', {}, 'Bearbeitungsstand'));
    section.appendChild(buildTable(
      ['Status', 'Records'],
      cov.bearbeitungsstand.map((b) => [b.status, String(b.count)]),
      [null, 'num'],
    ));
  }

  return section;
}

function renderWikidata(wd) {
  const section = el('section', { className: 'eschl-section' });
  section.appendChild(el('h3', { className: 'eschl-section-title' }, 'WIKIDATA-COVERAGE'));
  if (!wd) return section;

  if (wd.summary) {
    section.appendChild(el('p', { className: 'eschl-headline' },
      `${wd.summary.matched} gematcht \u00b7 `,
      `${wd.summary.unmatched} ohne Match \u00b7 `,
      `${wd.summary.skipped} \u00fcbersprungen.`,
    ));
  }

  if (wd.by_type && wd.by_type.length > 0) {
    section.appendChild(buildTable(
      ['Typ', 'exact', 'fuzzy_high', 'fuzzy_low', 'gesamt'],
      wd.by_type.map((t) => [t.type, String(t.exact), String(t.fuzzy_high), String(t.fuzzy_low), String(t.total)]),
      [null, 'num', 'num', 'num', 'num'],
    ));
  }

  section.appendChild(el('h4', {}, 'Low-Confidence-Matches (manuelle Freigabe erforderlich)'));
  if (wd.low_confidence && wd.low_confidence.length > 0) {
    section.appendChild(el('p', { className: 'eschl-note' },
      'Freigegebene Eintr\u00e4ge manuell als ',
      el('code', {}, 'manual_review: approved'),
      ' markieren (in ',
      el('code', {}, 'data/output/wikidata-reconciliation.json'),
      ').',
    ));
    section.appendChild(buildTable(
      ['Typ', 'Name', 'Q-ID', 'Label', 'Score'],
      wd.low_confidence.map((m) => [
        m.type || '?',
        m.name || '?',
        m.qid || '?',
        m.label || '?',
        String(m.confidence ?? '?'),
      ]),
      [null, null, null, null, 'num'],
      { qidColumn: 2 },
    ));
  } else {
    section.appendChild(el('p', { className: 'eschl-empty' },
      'Keine Low-Confidence-Matches in diesem Lauf.'));
  }

  return section;
}

function renderBlockers(blockers) {
  const section = el('section', { className: 'eschl-section' });
  section.appendChild(el('h3', { className: 'eschl-section-title' },
    'EXTERNE BL\u00d6CKER (zur Kl\u00e4rung mit Erschlie\u00dfungsteam)'));
  if (!blockers || blockers.length === 0) {
    section.appendChild(el('p', { className: 'eschl-empty' },
      'Keine offenen Bl\u00f6cker dokumentiert.'));
    return section;
  }
  const list = el('ol', { className: 'eschl-blockers' });
  for (const b of blockers) {
    list.appendChild(el('li', {},
      el('strong', {}, b.title || b.id),
      el('p', { className: 'eschl-blocker-desc' }, b.description || ''),
    ));
  }
  section.appendChild(list);
  return section;
}

/**
 * Tabellen-Helper. rows als String-Arrays, colTypes als ['num'|null, ...]
 * fuer rechtsbuendige Zahlspalten. Optional opts.qidColumn macht aus dem
 * Wert einen Wikidata-Link.
 */
function buildTable(headers, rows, colTypes = [], opts = {}) {
  const table = el('table', { className: 'eschl-table' });
  const thead = el('thead');
  const headerRow = el('tr');
  for (let i = 0; i < headers.length; i++) {
    const cls = colTypes[i] === 'num' ? 'eschl-num' : '';
    headerRow.appendChild(el('th', { className: cls }, headers[i]));
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (let i = 0; i < row.length; i++) {
      const cls = colTypes[i] === 'num' ? 'eschl-num' : '';
      if (opts.qidColumn === i && row[i] && row[i].startsWith('Q')) {
        tr.appendChild(el('td', { className: cls },
          el('a', {
            href: `https://www.wikidata.org/wiki/${row[i]}`,
            target: '_blank',
            rel: 'noopener noreferrer',
          }, row[i]),
        ));
      } else {
        tr.appendChild(el('td', { className: cls }, row[i]));
      }
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}
