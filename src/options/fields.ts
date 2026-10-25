// Éléments communs de la page de réglages.

import { h } from '../lib/dom';
import { t, type MessageKey } from '../lib/i18n';

export function card(titleKey: MessageKey, ...children: Array<Node | null>): HTMLElement {
  return h('section', { class: 'card' }, h('h2', {}, t(titleKey)), ...children.filter((c): c is Node => c !== null));
}

export function status(): HTMLElement {
  return h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
}

export function copyField(id: string, label: string, value: string, hint?: string): HTMLElement {
  const input = h('input', { id, type: 'text', readonly: true, value, class: 'mono' });
  const button = h('button', { type: 'button', class: 'outlined-button' }, t('copy'));
  button.addEventListener('click', () => {
    void navigator.clipboard.writeText(value).then(() => {
      button.textContent = t('copied');
      window.setTimeout(() => (button.textContent = t('copy')), 1500);
    });
  });
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h('div', { class: 'row' }, input, button),
    hint ? h('p', { class: 'help field-help' }, hint) : null,
  );
}

export function textField(id: string, label: string, value: string, placeholder: string): { field: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { id, type: 'text', value, placeholder, class: 'mono', spellcheck: 'false', autocomplete: 'off' });
  return { field: h('div', { class: 'field' }, h('label', { for: id }, label), h('div', { class: 'row' }, input)), input };
}
