// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import SettingsTab from './SettingsTab';
import StockTab from './StockTab';
import { setSettings, settings, DEFAULT_SETTINGS } from './settings';
import { defaultRecipe } from './library';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('onglet Stock', () => {
  it('ajoute un lot de malt et calcule le solde', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(<StockTab recipe={defaultRecipe()} />); });
    const add = [...host.querySelectorAll('button')].filter((b) => b.textContent === '+ Lot')[0];
    await act(async () => { click(add); });
    await act(async () => { type(host.querySelector<HTMLInputElement>('input[aria-label="Quantité initiale"]')!, '25'); });
    await act(async () => { type(host.querySelector<HTMLInputElement>('input[aria-label="Retrait"]')!, '4,5'); });
    expect(host.querySelector('output[aria-label="Solde"]')!.textContent).toBe('20,5');
    expect(host.textContent).toContain('Total du solde : 20,5 kg');
    expect(host.textContent).toContain('Quantité initiale (kg)');
    expect(host.textContent).toContain('Quantité initiale (g)');
    await act(async () => { root.unmount(); });
  });
});

describe('onglet Réglages', () => {
  it('applique un réglage prédéfini', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    let changes = 0;
    await act(async () => { root.render(<SettingsTab recipe={defaultRecipe()} onChange={() => { changes++; }} />); });
    const btn = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Little Bock (approx.)')!;
    await act(async () => { click(btn); });
    expect(settings).toMatchObject({ pelletPct: 10, fwhPct: 25, gravityMode: 'og' });
    expect(changes).toBe(1);
    setSettings(DEFAULT_SETTINGS, false);
    await act(async () => { root.unmount(); });
  });
});
