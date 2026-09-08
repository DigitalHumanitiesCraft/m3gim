/** Shared responsive detail: a right column on wide hosts and a modal dialog
 * on narrow ones. Callers own selection state; this component owns placement,
 * focus and the common heading. */
import { el, clear } from '../utils/dom.js';

let sequence = 0;

export function createSelectionDetail({ host, onClose = () => {}, onChange = () => {} }) {
  const slot = el('aside', {
    className: 'selection-detail__slot', 'aria-label': 'Details und Belege', hidden: true,
  });
  const dialog = el('dialog', {
    className: 'selection-detail__dialog', 'aria-label': 'Details und Belege',
    onCancel: event => { event.preventDefault(); close(); },
  });
  host.append(slot, dialog);
  let panel = null;
  let rootTrigger = null;
  let mode = null;
  let destroyed = false;

  function place() {
    if (!panel || destroyed) return;
    // A hidden view must not reopen its selection as a modal over another tab.
    if (!host.getClientRects().length) {
      if (dialog.open) dialog.close();
      return;
    }
    const focused = panel.contains(document.activeElement) ? document.activeElement : null;
    const nextMode = host.clientWidth < 900 ? 'dialog' : 'column';
    if (nextMode === 'dialog') {
      slot.hidden = true;
      if (panel.parentElement !== dialog) dialog.appendChild(panel);
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
      slot.hidden = false;
      if (panel.parentElement !== slot) slot.appendChild(panel);
    }
    if (focused?.isConnected) focused.focus({ preventScroll: true });
    if (mode !== nextMode) { mode = nextMode; onChange({ open: true, mode }); }
  }

  function open({ title, kicker, subtitle, content, trigger, back } = {}) {
    if (destroyed) return;
    const nested = panel && trigger && panel.contains(trigger);
    if (!nested && trigger) rootTrigger = trigger;
    panel?.remove();
    const id = `selection-detail-${++sequence}`;
    const actions = el('div', { className: 'selection-detail__actions' });
    if (back) {
      const callback = typeof back === 'function' ? back : back.onClick;
      const label = typeof back === 'object' && back.label ? back.label : 'Zurück';
      actions.appendChild(el('button', {
        type: 'button', className: 'selection-detail__back', onClick: callback,
      }, label));
    }
    actions.appendChild(el('button', {
      type: 'button', className: 'selection-detail__close',
      'aria-label': 'Schließen', onClick: () => close(),
    }, '×'));
    panel = el('div', {
      className: 'selection-detail selection-detail__panel', role: 'region', tabindex: '-1',
      'aria-labelledby': `${id}-title`,
      onKeydown: event => {
        if (event.key !== 'Escape') return;
        event.preventDefault(); event.stopPropagation(); close();
      },
    }, actions,
    kicker ? el('div', { className: 'selection-detail__kicker' }, kicker) : null,
    el('h3', { className: 'selection-detail__title', id: `${id}-title` }, title || ''),
    subtitle ? el('p', { className: 'selection-detail__subtitle' }, subtitle) : null,
    el('div', { className: 'selection-detail__content' }, content || ''));
    host.classList.add('selection-detail-open');
    place();
    panel.focus({ preventScroll: true });
    panel.scrollTop = 0;
  }

  function close({ restoreFocus = true, notify = true } = {}) {
    if (!panel) return;
    const focusTarget = rootTrigger;
    panel.remove(); panel = null;
    if (dialog.open) dialog.close();
    clear(dialog); clear(slot);
    slot.hidden = true;
    host.classList.remove('selection-detail-open');
    mode = null; rootTrigger = null;
    if (restoreFocus && focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
    if (notify) onClose();
  }

  const observer = new ResizeObserver(place);
  observer.observe(host);
  return {
    open, close,
    destroy() {
      if (destroyed) return;
      close({ restoreFocus: false, notify: false });
      destroyed = true; observer.disconnect(); slot.remove(); dialog.remove();
    },
    get element() { return panel; },
    get scrollElement() { return panel; },
  };
}
