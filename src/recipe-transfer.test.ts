// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { HOPS, MALTS, YEASTS, addHop, addMalt, addYeast, removeCustom } from './data/ingredients';
import { STYLES, removeStyle, upsertStyles } from './data/styles';
import { compute, defaultRecipe, parseRecipeHtml, recipeToHtml } from './library';

describe('recette HTML portable', () => {
  it('recrée les ingrédients et le style personnalisés absents ailleurs', () => {
    const malt = addMalt({ name: 'Malt voyageur', ebc: 150, extractPct: 70 });
    const hop = addHop({ name: 'Houblon voyageur', aa: 9, aroma: 'agrumes' });
    const yeast = addYeast({ name: 'Levure voyageuse', attenuationPct: 83, tempC: '18–22' });
    upsertStyles([{ id: 'ZZ1', name: 'Style voyageur', og: [1.04, 1.05], fg: [1.01, 1.014], ibu: [10, 20], srm: [5, 10], abv: [4, 5] }]);
    const d = defaultRecipe('Voyage');
    d.styleId = 'ZZ1';
    d.yeastId = yeast;
    d.mrows.push({ id: malt, kg: '1' });
    d.hrows.push({ id: hop, grams: '20', aa: '9', use: 'boil', min: '10', temp: '100' });
    const html = recipeToHtml(d);
    const before = compute(d)!;
    for (const [list, id] of [[MALTS, malt], [HOPS, hop], [YEASTS, yeast]] as const) removeCustom(list, id);
    removeStyle('ZZ1');
    expect(MALTS.some((m) => m.id === malt)).toBe(false);
    const back = parseRecipeHtml(html)!;
    expect(back.mrows.map((m) => m.id)).toContain(malt);
    expect(back.hrows.map((h) => h.id)).toContain(hop);
    expect(back.yeastId).toBe(yeast);
    expect(back.styleId).toBe('ZZ1');
    expect(STYLES.some((s) => s.id === 'ZZ1')).toBe(true);
    expect(compute(back)!.ebc).toBeCloseTo(before.ebc, 6);
  });
  it('rattache la recette à un ingrédient de même nom déjà présent sous un autre identifiant', () => {
    const a = addMalt({ name: 'Malt jumeau', ebc: 40, extractPct: 75 });
    const d = { ...defaultRecipe('Jumeau'), mrows: [{ id: a, kg: '2' }] };
    const html = recipeToHtml(d);
    removeCustom(MALTS, a);
    const b = addMalt({ name: 'Malt jumeau', ebc: 40, extractPct: 75 });
    expect(b).not.toBe(a);
    expect(parseRecipeHtml(html)!.mrows[0].id).toBe(b);
  });
  it('ignore des définitions invalides sans planter', () => {
    const d = defaultRecipe('Bizarre');
    const html = recipeToHtml(d).replace('"customs":{', '"customs":{"malts":[{"id":5},{"id":"c-bad","name":"x","ebc":"oups","extractPct":1}],');
    expect(parseRecipeHtml(html)?.name).toBe('Bizarre');
  });
});
