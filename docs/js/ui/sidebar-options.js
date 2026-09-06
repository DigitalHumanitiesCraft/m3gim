/**
 * The row forms of the filter column: the suggestion row of a value set and the
 * group row of the tree, together with the label that marks the matched query
 * words. Pure drawing functions, they know neither filter state nor store.
 *
 * They stand beside `sidebar.js` because the facets (`sidebar-facets.js`) and
 * the tree need both row forms alike.
 */

import { el } from '../utils/dom.js';
import { familyIcon } from './family-icons.js';
import { matchRanges } from '../utils/normalize.js';

let rowSeq = 0;

/** The label with the matched query words in `mark`. */
export function labelNode(label, query, className = 'fs-option__label') {
  const node = el('span', { className });
  const chars = [...String(label)];
  const ranges = query ? matchRanges(label, query) : [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) node.appendChild(document.createTextNode(chars.slice(at, start).join('')));
    node.appendChild(el('mark', {}, chars.slice(start, end).join('')));
    at = end;
  }
  node.appendChild(document.createTextNode(chars.slice(at).join('')));
  return node;
}

/**
 * One suggestion row of a listbox. `implied` marks a value the cut already
 * carries without it being chosen itself (a child of a selected Oberbegriff).
 * Such a row is information and no target: it keeps the muted check, stays
 * unselected for assistive technology and takes no click, because choosing it
 * would add a value the Oberbegriff already carries.
 *
 * An `entry.family` puts the symbol of that content family before the label,
 * the same set the Indizes heads and the facet titles carry (E-212). A list
 * whose entries come from several families is thereby read by symbol instead of
 * by a text prefix on every row.
 */
export function optionRow(entry, query, count, on, onClick, checkable = false, implied = false) {
  const fam = entry.family
    ? familyIcon(entry.family,
        { size: 13, className: `fs-option__fam fam-mark fam-mark--${entry.family}` })
    : null;
  const row = el('div', {
    className: 'fs-option' + (checkable ? ' fs-option--checkable' : '')
      + (on ? ' fs-option--on' : '') + (implied ? ' fs-option--implied' : ''),
    role: 'option', id: `fs-opt-${++rowSeq}`, 'aria-selected': String(on),
    ...(implied ? { 'aria-disabled': 'true' } : { onClick }),
  },
    checkable
      ? el('span', {
          className: 'fs-option__check' + (implied ? ' fs-option__check--implied' : ''),
          'aria-hidden': 'true',
        }, on || implied ? '✓' : '')
      : null,
    fam,
    labelNode(entry.label, query),
    el('span', { className: 'fs-option__count' }, count ? String(count) : ''));
  // The icon is aria-hidden, so the family has to reach the row's name in
  // words; the label alone would leave two identical names indistinguishable.
  if (entry.family && entry.familyLabel) {
    row.setAttribute('aria-label', `${entry.familyLabel}: ${entry.label}`);
  }
  return row;
}

export function groupRow(entry, count, on, isOpen, hasKids, onToggle, onOpen, tip = '') {
  const chevron = hasKids
    ? el('button', {
        className: 'fs-tree__chevron' + (isOpen ? ' fs-tree__chevron--open' : ''),
        type: 'button', 'aria-expanded': String(isOpen),
        'aria-label': isOpen ? 'Untertypen ausblenden' : 'Untertypen einblenden',
        // The row itself is the selection target, so opening must not select.
        onClick: (e) => { e.stopPropagation(); onOpen(); },
      }, '›')
    : el('span', { className: 'fs-tree__chevron fs-tree__chevron--none', 'aria-hidden': 'true' });
  const row = el('div', {
    className: 'fs-option fs-option--group' + (on ? ' fs-option--on' : ''),
    role: 'option', 'aria-selected': String(on), 'data-tip': tip,
    'data-tip-wrap': '', 'data-tip-pos': 'bottom-left', onClick: onToggle,
  },
    chevron,
    labelNode(entry.label, ''),
    el('span', { className: 'fs-option__check', 'aria-hidden': 'true' }, on ? '✓' : ''),
    el('span', { className: 'fs-option__count' }, count ? String(count) : ''));
  return row;
}
