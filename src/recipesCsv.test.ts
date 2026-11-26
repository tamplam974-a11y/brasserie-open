import { describe, expect, it } from 'vitest';
import { MALTS } from './data/ingredients';
import { defaultRecipe } from './library';
import { parseRecipesCsv, recipesToCsv } from './recipesCsv';

const hops = (d: ReturnType<typeof defaultRecipe>) => d.hrows.map((h) => ({ id: h.id, grams: h.grams, aa: h.aa, use: h.use, min: h.use === 'dryhop' ? '0' : h.min, ...(h.use === 'hopstand' ? { temp: h.temp } : {}) }));

describe('CSV de toutes les recettes', () => {
  const a = defaultRecipe('Recette A');
  a.hrows.push({ id: 'mosaic', grams: '30', aa: '11,5', use: 'hopstand', min: '20', temp: '75' }, { id: 'citra', grams: '20', aa: '12', use: 'fwh', min: '60', temp: '100' });
  a.mash = [{ name: 'Palier unique', temp: '67', min: '60' }];
  const b = { ...defaultRecipe('Recette B ; « spéciale » "test"'), styleId: '5B', vol: '30', eff: '75', yeastId: 'k97', mrows: [{ id: 'pils', kg: '6', ebc: '10' }], hrows: [] };

  it('relit toutes les recettes exportées', () => {
    const back = parseRecipesCsv(recipesToCsv([a, b]))!;
    expect(back).toHaveLength(2);
    expect(back[0].name).toBe('Recette A');
    expect(back[0].mrows).toEqual(a.mrows);
    expect(hops(back[0])).toEqual(hops(a));
    expect(back[0].mash).toEqual(a.mash);
    expect(back[1].name).toBe(b.name);
    expect([back[1].styleId, back[1].vol, back[1].eff, back[1].yeastId]).toEqual(['5B', '30', '75', 'k97']);
    expect(back[1].mrows).toEqual([{ id: 'pils', kg: '6', ebc: '10' }]);
    expect(back[1].hrows).toEqual([]);
  });
  it('garde une recette vide sur une ligne', () => {
    const vide = { ...defaultRecipe('Vide'), mrows: [], hrows: [], mash: [] };
    expect(parseRecipesCsv(recipesToCsv([vide]))![0].name).toBe('Vide');
  });
  it('crée les ingrédients inconnus et lit un CSV écrit à la main', () => {
    const csv = 'recette;section;nom;quantite;alpha;usage;minutes\nTest;malt;Malt inventé XYZ;4;;;\nTest;houblon;Houblon inventé XYZ;25;9;whirlpool;15\n';
    const [d] = parseRecipesCsv(csv)!;
    expect(MALTS.some((m) => m.name === 'Malt inventé XYZ' && m.custom)).toBe(true);
    expect(d.hrows[0]).toMatchObject({ grams: '25', aa: '9', use: 'hopstand', min: '15' });
  });
  it('refuse un fichier sans les colonnes attendues', () => {
    expect(parseRecipesCsv('a;b\n1;2\n')).toBeNull();
    expect(parseRecipesCsv('')).toBeNull();
  });
});

describe('CSV et mash hopping', () => {
  it('relit un houblon d’empâtage', () => {
    const d = defaultRecipe('Mash CSV');
    d.hrows.push({ id: 'saaz', grams: '20', aa: '3,5', use: 'mash', min: '60', temp: '66' });
    const [back] = parseRecipesCsv(recipesToCsv([d]))!;
    expect(back.hrows[2]).toMatchObject({ id: 'saaz', use: 'mash', min: '60', grams: '20' });
  });
});
