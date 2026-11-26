// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import RecipeBuilder from './RecipeBuilder';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Écrit dans un champ React comme le ferait un clavier. */
function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('appel rapide dans la recette', () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  it('propose des suggestions pour un malt, un houblon et une levure', async () => {
    await act(async () => { root.render(<RecipeBuilder />); });
    const cases: [string, string, string][] = [['Malt', 'cara', 'Caramel'], ['Houblon', 'cit', 'Citra'], ['Levure', 'wyeast', 'Wyeast']];
    for (const [label, query, expected] of cases) {
      const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
      expect(input, label).not.toBeNull();
      await act(async () => { input.focus(); input.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); });
      await act(async () => { type(input, query); });
      const items = [...host.querySelectorAll('.pick-list li')].map((li) => li.textContent ?? '');
      expect(items.length, `${label} : suggestions`).toBeGreaterThan(0);
      expect(items.some((t) => t.includes(expected)), `${label} : ${expected}`).toBe(true);
      await act(async () => { input.blur(); input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    }
  });

  it('remplace le houblon choisi et reprend son pourcentage d’alpha-acides', async () => {
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Houblon"]')!;
    await act(async () => { input.focus(); input.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); });
    await act(async () => { type(input, 'galaxy'); });
    const li = host.querySelector<HTMLLIElement>('.pick-list li')!;
    await act(async () => { li.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); });
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Houblon"]')!.value).toContain('Galaxy');
    expect(host.querySelector<HTMLInputElement>('input[aria-label="Alpha-acides en %"]')!.value).toBe('14');
  });
});
