import { describe, expect, it } from 'vitest';
import { HOPS, MALTS, YEASTS, addMalt, removeCustom } from './ingredients';

describe('catalogues', () => {
  it('ont des identifiants et des noms uniques', () => {
    for (const list of [MALTS, HOPS, YEASTS]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
      expect(new Set(list.map((x) => x.name.toLowerCase())).size).toBe(list.length);
    }
  });
  it('ont des valeurs plausibles', () => {
    for (const m of MALTS) { expect(m.ebc).toBeGreaterThan(0); expect(m.extractPct).toBeGreaterThanOrEqual(55); expect(m.extractPct).toBeLessThanOrEqual(100); }
    for (const y of YEASTS) { expect(y.attenuationPct).toBeGreaterThanOrEqual(60); expect(y.attenuationPct).toBeLessThanOrEqual(100); }
  });
  it('contiennent les fabricants demandés', () => {
    const brands = new Set([...MALTS, ...YEASTS].map((x) => x.brand));
    for (const b of ['Best Malz', 'Dingemans', 'Lallemand', 'Wyeast', 'White Labs', 'Kveik']) expect(brands.has(b)).toBe(true);
  });
  it('ajoute et supprime un ingrédient personnalisé', () => {
    const id = addMalt({ name: 'Mon malt', ebc: 10, extractPct: 78 });
    expect(MALTS.find((m) => m.id === id)?.custom).toBe(true);
    removeCustom(MALTS, id);
    expect(MALTS.some((m) => m.id === id)).toBe(false);
  });
  it('ne supprime pas un ingrédient du catalogue', () => {
    const n = MALTS.length;
    removeCustom(MALTS, MALTS[0].id);
    expect(MALTS).toHaveLength(n);
  });
});
