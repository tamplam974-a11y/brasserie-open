import { describe, expect, it } from 'vitest';
import { defaultRecipe } from './library';
import { boilSchedule } from './sheet';

describe('chronologie d’ébullition', () => {
  it('commence et finit l’ébullition, houblon d’amertume à 0 min, dry hop à la fin', () => {
    const s = boilSchedule(defaultRecipe());
    expect(s[0]).toEqual({ when: '0 min', what: 'Début de l’ébullition' });
    expect(s.some((x) => x.when === '0 min' && x.what.includes('Magnum'))).toBe(true);
    expect(s[s.length - 1].when).toBe('Fermentation (dry hop)');
  });
  it('place le FWH avant l’ébullition et le hopstand après la flamme', () => {
    const d = defaultRecipe();
    d.hrows.push({ id: 'citra', grams: '20', aa: '12', use: 'fwh', min: '60', temp: '100' }, { id: 'mosaic', grams: '30', aa: '11', use: 'hopstand', min: '20', temp: '80' });
    const s = boilSchedule(d);
    expect(s[0].when).toContain('Avant l’ébullition');
    const fin = s.findIndex((x) => x.what.startsWith('Fin de l’ébullition'));
    expect(s[fin + 1].when).toContain('80 °C');
  });
  it('ajoute à 40 min un houblon de 20 min dans une ébullition de 60', () => {
    const d = defaultRecipe();
    d.hrows = [{ id: 'saaz', grams: '20', aa: '3,5', use: 'boil', min: '20', temp: '100' }];
    expect(boilSchedule(d).some((x) => x.when === '40 min' && x.what.includes('Saaz'))).toBe(true);
  });
});

describe('mash hopping dans la fiche', () => {
  it('place le houblon d’empâtage avant tout le reste', () => {
    const d = defaultRecipe();
    d.hrows.push({ id: 'saaz', grams: '20', aa: '3,5', use: 'mash', min: '60', temp: '66' });
    const s = boilSchedule(d);
    expect(s[0]).toEqual({ when: 'Dans l’empâtage', what: '20 g Saaz (60 min)' });
  });
});
