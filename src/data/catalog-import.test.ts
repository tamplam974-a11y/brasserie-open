import { describe, expect, it } from 'vitest';
import { MALTS, YEASTS, importMalts, importYeasts } from './ingredients';

describe('import de catalogue', () => {
  it('remplace le catalogue indicatif d’une marque connue', () => {
    expect(MALTS.some((m) => m.brand === 'Dingemans' && !m.custom)).toBe(true);
    const res = importMalts([{ name: 'Pilsen', brand: 'DINGEMANS', ebc: 3.2, extractPct: 82 }]);
    expect(res.replaced).toEqual(['Dingemans']);
    expect(MALTS.some((m) => m.brand === 'Dingemans' && !m.custom)).toBe(false);
    const nouveau = MALTS.find((m) => m.name === 'Pilsen' && m.brand === 'Dingemans');
    expect(nouveau?.custom).toBe(true);
  });
  it('met à jour une ligne déjà importée au lieu de la dupliquer', () => {
    const res = importMalts([{ name: 'Pilsen', brand: 'Dingemans', ebc: 3.4, extractPct: 81 }]);
    expect(res).toMatchObject({ added: 0, updated: 1, replaced: [] });
    expect(MALTS.filter((m) => m.name === 'Pilsen' && m.brand === 'Dingemans')).toHaveLength(1);
  });
  it('garde les autres marques et classe une marque inconnue telle quelle', () => {
    const n = YEASTS.filter((y) => y.brand === 'Wyeast').length;
    const res = importYeasts([{ name: 'Ma levure', brand: 'Mon Labo', attenuationPct: 78, tempC: '18-22', lager: false }]);
    expect(res.replaced).toEqual([]);
    expect(YEASTS.filter((y) => y.brand === 'Wyeast')).toHaveLength(n);
    expect(YEASTS.some((y) => y.brand === 'Mon Labo')).toBe(true);
  });
});
