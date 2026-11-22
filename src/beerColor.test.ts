import { describe, expect, it } from 'vitest';
import { srmColor } from './beerColor';

const dark = (c: string) => rgbSum(c);
const rgbSum = (c: string) => [1, 3, 5].reduce((s, i) => s + parseInt(c.slice(i, i + 2), 16), 0);

describe('couleur de bière', () => {
  it('borne les valeurs extrêmes ou invalides', () => {
    expect(srmColor(0).toLowerCase()).toBe('#ffe699');
    expect(srmColor(80).toLowerCase()).toBe('#1a0b05');
    expect(srmColor(NaN).toLowerCase()).toBe('#ffe699');
  });
  it('retombe sur le repère exact', () => {
    expect(srmColor(6)).toBe('#f39c00');
  });
  it('fonce quand le SRM augmente', () => {
    const v = [2, 6, 13, 20, 30, 40].map((s) => dark(srmColor(s)));
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeLessThan(v[i - 1]);
  });
});
