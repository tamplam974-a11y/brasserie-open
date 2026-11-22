import { describe, expect, it } from 'vitest';
import { compute, computeWater, defaultRecipe, recipeToHtml, sanitize } from './library';

describe('bibliothèque', () => {
  it('répare une recette incomplète ou inconnue', () => {
    const d = sanitize({ styleId: 'XX', mrows: [{ id: 'inconnu', kg: '2' }], water: { ratio: 5 } });
    expect(d.styleId).toBe('21A');
    expect(d.mrows).toEqual([]);
    expect(d.water.ratio).toBe('3');
  });
  it('calcule la recette par défaut', () => {
    const r = compute(defaultRecipe());
    expect(r?.og).toBeGreaterThan(1.05);
    expect(r?.hopIbu).toHaveLength(2);
  });
  it('calcule les volumes d’eau par défaut', () => {
    const { water, strikeC } = computeWater(defaultRecipe());
    expect(water?.strikeL).toBeCloseTo(16.5, 6);
    expect(strikeC).toBeGreaterThan(66);
  });
  it('exporte en HTML échappé, avec des données réimportables', () => {
    const d = defaultRecipe('Test <b>x</b>');
    const html = recipeToHtml(d);
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;');
    const m = html.match(/id="brasserie-open-recette">([\s\S]*?)<\/script>/);
    expect(sanitize(JSON.parse(m![1]))).toEqual(d);
  });
});

describe('anciens styles', () => {
  it('convertit les anciens identifiants', () => {
    expect(sanitize({ styleId: '15A' }).styleId).toBe('10A');
    expect(sanitize({ styleId: '27' }).styleId).toBe('17D');
    expect(sanitize({ styleId: '27L' }).styleId).toBe('27L');
  });
});

import { compute as compute2, notesFromText, notesToText, scaleRecipe } from './library';
describe('redimensionnement et notes', () => {
  it('passe de 20 à 30 L en gardant densité et IBU', () => {
    const d = defaultRecipe();
    const s = scaleRecipe(d, 30);
    expect(s.vol).toBe('30');
    expect(s.mrows.map((m) => m.kg)).toEqual(['7,5', '0,75']);
    expect(s.hrows.map((h) => h.grams)).toEqual(['22,5', '75']);
    expect(compute2(s)!.og).toBeCloseTo(compute2(d)!.og, 4);
    expect(compute2(s)!.ibu).toBeCloseTo(compute2(d)!.ibu, 3);
  });
  it('ignore un volume invalide', () => {
    const d = defaultRecipe();
    expect(scaleRecipe(d, 0)).toBe(d);
    expect(scaleRecipe(d, NaN)).toBe(d);
  });
  it('relit les notes écrites en texte unique', () => {
    const n = { before: 'a\nb', during: '', after: 'c' };
    expect(notesFromText(notesToText(n))).toEqual(n);
    expect(notesToText({ before: '', during: ' ', after: '' })).toBe('');
    expect(notesFromText('simple remarque')).toEqual({ before: 'simple remarque', during: '', after: '' });
  });
  it('place les notes dans la fiche HTML, échappées', () => {
    const d = { ...defaultRecipe(), notes: { before: 'Penser à <acheter> du houblon', during: '', after: 'Très bon' } };
    const html = recipeToHtml(d);
    expect(html).toContain('Avant le brassage');
    expect(html).toContain('&lt;acheter&gt;');
    expect(html).not.toContain('Pendant le brassage');
  });
});

describe('EBC modifiable par malt', () => {
  it('prend en compte un EBC propre à la recette', () => {
    const d = defaultRecipe();
    const base = compute2(d)!.ebc;
    d.mrows[0] = { ...d.mrows[0], ebc: '120' };
    expect(compute2(d)!.ebc).toBeGreaterThan(base * 2);
    expect(scaleRecipe(d, 30).mrows[0].ebc).toBe('120');
  });
  it('ignore un EBC vide ou invalide', () => {
    const d = defaultRecipe();
    const base = compute2(d)!.ebc;
    d.mrows[0] = { ...d.mrows[0], ebc: ' ' };
    expect(compute2(d)!.ebc).toBeCloseTo(base, 10);
    expect(sanitize({ mrows: [{ id: 'pale', kg: '5', ebc: ' ' }] }).mrows[0]).toEqual({ id: 'pale', kg: '5' });
    expect(sanitize({ mrows: [{ id: 'pale', kg: '5', ebc: '30' }] }).mrows[0]).toEqual({ id: 'pale', kg: '5', ebc: '30' });
  });
});

