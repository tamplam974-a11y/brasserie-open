import { describe, expect, it } from 'vitest';
import { STYLES } from './styles';

describe('styles', () => {
  it('ont des identifiants uniques et des plages cohérentes', () => {
    expect(new Set(STYLES.map((s) => s.id)).size).toBe(STYLES.length);
    for (const s of STYLES) {
      for (const r of [s.og, s.fg, s.ibu, s.srm, s.abv]) expect(r[0]).toBeLessThan(r[1]);
      expect(s.fg[1]).toBeLessThan(s.og[0]);
    }
  });
  it('contiennent les styles demandés', () => {
    const names = STYLES.map((s) => s.name).join('|');
    for (const n of ['American Wheat', 'Lichtenhainer', 'Berliner Weisse', 'Imperial Stout', 'Saison', 'Lambic', 'Oud Bruin', 'Barleywine']) {
      expect(names).toContain(n);
    }
  });
});
