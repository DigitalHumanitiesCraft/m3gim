/** A named, keyboard-operable entry to supporting detail. */
import { el } from '../utils/dom.js';

export function detailDisclosure(title, content) {
  return el('details', { className: 'detail-disclosure' },
    el('summary', { className: 'detail-disclosure__summary' }, title),
    el('div', { className: 'detail-disclosure__body' }, content));
}
