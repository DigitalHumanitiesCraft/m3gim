/** Register properties and document co-mentions inside the shared detail shell. */
import { el } from '../utils/dom.js';
import { AGRELON_LABELS } from '../data/constants.js';
import { familyIcon } from '../ui/family-icons.js';
import { detailDisclosure } from '../ui/detail-disclosure.js';
import {
  buildUmfeld, entryRoles,
} from './indizes-data.js';

let sequence = 0;

function section(title, content) {
  return el('section', { className: 'idx-detail__section' },
    el('h4', { className: 'idx-detail__heading' }, title), content);
}

function chip(prefix, value, tip) {
  return el('span', {
    className: `chip chip--role-pair chip--c-rolle${tip?.startsWith('ergänzt:') ? ' mark-derived' : ''}`,
    ...(tip ? { dataset: { tip, tipWrap: '' } } : {}),
  }, el('span', { className: 'chip-rolle' }, prefix),
  el('span', { className: 'chip-wert' }, value));
}

/** Keep the remainder reachable in place, including by keyboard. */
function expandable(items, limit, render, label, moreClass) {
  const box = el('div', { className: 'idx-expandable' }, ...items.slice(0, limit).map(render));
  const rest = items.slice(limit);
  if (!rest.length) return box;
  const id = `idx-remainder-${++sequence}`;
  const remainder = el('div', { id, className: 'idx-expandable__rest', hidden: true }, ...rest.map(render));
  const button = el('button', {
    type: 'button', className: `idx-more ${moreClass}`,
    'aria-expanded': 'false', 'aria-controls': id,
    'aria-label': `${rest.length} weitere ${label} anzeigen`,
    onClick: () => {
      remainder.hidden = !remainder.hidden;
      button.setAttribute('aria-expanded', String(!remainder.hidden));
      button.setAttribute('aria-label', remainder.hidden
        ? `${rest.length} weitere ${label} anzeigen` : `Weniger ${label} anzeigen`);
      button.textContent = remainder.hidden ? `+${rest.length} weitere` : 'Weniger anzeigen';
    },
  }, `+${rest.length} weitere`);
  box.append(remainder, button);
  return box;
}

function relations(entry, recordIds, navigate) {
  const byType = new Map();
  for (const relation of entry.relations || []) {
    if (!relation.type || !recordIds.has(relation.recordId)) continue;
    if (!byType.has(relation.type)) byType.set(relation.type, new Set());
    byType.get(relation.type).add(relation.recordId);
  }
  if (!byType.size) return null;
  const box = el('div', { className: 'idx-relations' });
  for (const [type, ids] of byType) {
    const label = AGRELON_LABELS[type] || type.replace(/^agrelon:Has/, '');
    box.appendChild(el('details', { className: 'idx-relation' },
      el('summary', {}, `${label} · ${ids.size} Dokument${ids.size === 1 ? '' : 'e'}`),
      el('div', { className: 'idx-relation__records' }, ...[...ids].map(recordId => el('button', {
        type: 'button', className: 'idx-evidence',
        onClick: () => navigate('bestand', { recordId }),
      }, recordId.replace(/^m3gim-data:/, ''), el('span', { 'aria-hidden': 'true' }, ' →'))))));
  }
  return section('Erfasste Beziehungen', box);
}

function umfeld(store, register, entry, recordIds, navigate) {
  const groups = buildUmfeld(store, register, entry, { limit: 5, recordIds });
  if (!groups.length) return null;
  const box = el('div', { className: 'idx-umfeld' });
  for (const group of groups) {
    const chips = expandable([...group.items, ...group.rest], 5, item => el('button', {
      className: 'chip chip--role-pair chip--c-neutral chip--clickable', type: 'button',
      dataset: {
        tip: `${item.count} gemeinsame${item.count === 1 ? 's' : ''} Dokument${item.count === 1 ? '' : 'e'}. `
          + `Öffnet den Eintrag im Register ${group.label}.`, tipWrap: '',
      },
      onClick: () => navigate('indizes', { register: group.key, entry: item.name }),
    }, familyIcon(group.family, { size: 11, className: `fam-mark fam-mark--${group.family}` }),
    el('span', { className: 'chip-wert' }, item.name), el('span', { 'aria-hidden': 'true' }, '→')),
    group.label, 'idx-umfeld__more');
    chips.classList.add('idx-umfeld__chips');
    box.appendChild(el('div', { className: 'idx-umfeld__group' },
      el('h5', {
        className: 'idx-umfeld__label',
        dataset: { tip: 'ergänzt: Ko-Okkurrenz im selben Dokument, aus den Archivdatensätzen abgeleitet.'
          + (group.omitsNachlassbildnerin ? ' Die Nachlassbildnerin steht in fast jedem Dokument und bleibt ausgenommen.' : ''),
        tipWrap: '' },
      }, familyIcon(group.family, { size: 12, className: `fam-mark fam-mark--${group.family}` }), group.label),
      chips));
  }
  return detailDisclosure('Im selben Dokument genannt', box);
}

export function buildRegisterDetail({ store, register, entry, recordIds, properties, span, navigate }) {
  const content = el('div', { className: 'idx-detail', id: `idx-detail-${++sequence}` });
  if (properties || span.textContent) content.appendChild(section('Eigenschaften', el('div', {
    className: 'idx-detail__properties',
  }, properties, span.textContent ? el('div', {}, 'Datierte Dokumente: ', span) : null)));
  const roles = entryRoles(store, register, entry, recordIds);
  if (roles.length) content.appendChild(section('Rollen in den Dokumenten', el('div', {
    className: 'idx-relations idx-rollen',
  }, expandable(roles, 3, role => chip(String(role.name).toUpperCase(), String(role.count),
    `${role.count} Dokument${role.count === 1 ? '' : 'e'} führen ${entry.name} in dieser Rolle`),
  'Dokumentrollen', 'idx-document-roles__more'))));
  const relationSection = relations(entry, recordIds, navigate);
  if (relationSection) content.appendChild(relationSection);
  const coMentions = umfeld(store, register, entry, recordIds, navigate);
  if (coMentions) content.appendChild(coMentions);
  return content;
}
