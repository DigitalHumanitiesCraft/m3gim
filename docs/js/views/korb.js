/**
 * M³GIM Wissenskorb View — Simple list of bookmarked records.
 */

import { el, clear } from '../utils/dom.js';
import { formatSignatur, getDocTypeId, truncate } from '../utils/format.js';
import { DOKUMENTTYP_LABELS } from '../data/constants.js';
import { getKorbItems, removeFromKorb, clearKorb, onKorbChange } from '../ui/korb.js';
import { selectRecord } from '../ui/router.js';

let store = null;
let container = null;

export function renderKorb(storeRef, containerEl) {
  store = storeRef;
  container = containerEl;

  onKorbChange(() => renderList());
  renderList();
}

function renderList() {
  if (!container) return;
  clear(container);

  const wrapper = el('div', { className: 'korb-page' });

  const ids = getKorbItems();

  // Header
  const header = el('div', { className: 'korb-header' },
    el('h2', { className: 'korb-title' }, `Wissenskorb (${ids.length})`),
    ids.length > 0
      ? el('button', {
          className: 'korb-clear',
          onClick: () => { clearKorb(); },
        }, 'Korb leeren')
      : null,
  );
  wrapper.appendChild(header);

  if (ids.length === 0) {
    wrapper.appendChild(el('div', { className: 'korb-empty' },
      el('svg', {
        html: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
      }),
      el('p', { className: 'korb-empty__text' }, 'Noch keine Dokumente gesammelt.'),
      el('p', { className: 'korb-empty__hint' }, 'Klicken Sie das Lesezeichen-Symbol neben einem Dokument im Archiv oder in den Indizes.'),
    ));
    container.appendChild(wrapper);
    return;
  }

  // Records list
  const list = el('div', { className: 'korb-list' });
  const records = ids
    .map(id => store.records.get(id))
    .filter(Boolean)
    .sort((a, b) => (a['rico:identifier'] || '').localeCompare(b['rico:identifier'] || '', undefined, { numeric: true }));

  for (const r of records) {
    const docType = getDocTypeId(r) || '';
    const docLabel = DOKUMENTTYP_LABELS[docType] || docType || '';
    const recordId = r['@id'];

    const row = el('div', { className: 'korb-item' },
      el('span', {
        className: 'korb-item__sig',
        onClick: (e) => { e.stopPropagation(); selectRecord(recordId); },
      }, formatSignatur(r['rico:identifier'])),
      el('span', { className: 'korb-item__title' }, truncate(r['rico:title'] || '(ohne Titel)', 60)),
      docLabel ? el('span', { className: `badge badge--${docType}` }, docLabel) : null,
      el('button', {
        className: 'korb-item__remove',
        title: 'Aus Korb entfernen',
        onClick: (e) => { e.stopPropagation(); removeFromKorb(recordId); },
        html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      }),
    );
    list.appendChild(row);
  }
  wrapper.appendChild(list);
  container.appendChild(wrapper);
}
