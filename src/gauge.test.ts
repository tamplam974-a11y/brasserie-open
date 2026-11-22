import { describe, expect, it } from 'vitest';
import { gaugeHue } from './gauge';

describe('couleur des jauges', () => {
  it('reste verte dans la plage, bornes comprises', () => {
    expect(gaugeHue(1.06, 1.056, 1.07)).toBe(120);
    expect(gaugeHue(1.056, 1.056, 1.07)).toBe(120);
    expect(gaugeHue(1.07, 1.056, 1.07)).toBe(120);
  });
  it('passe au jaune à une demi-largeur de plage et au rouge à une largeur', () => {
    expect(gaugeHue(20 - 5, 20, 30)).toBe(60);
    expect(gaugeHue(30 + 10, 20, 30)).toBe(0);
    expect(gaugeHue(100, 20, 30)).toBe(0);
  });
  it('est symétrique de part et d’autre de la plage', () => {
    expect(gaugeHue(15, 20, 30)).toBe(gaugeHue(35, 20, 30));
  });
});
