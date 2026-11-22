// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MALTS } from './data/ingredients';
import { parseBeerXml, recipeToBeerXml } from './beerxml';
import { compute, defaultRecipe } from './library';

describe('BeerXML', () => {
  it('relit une recette exportée', () => {
    const d = defaultRecipe('Ma <IPA> & co');
    d.hrows.push({ id: 'citra', grams: '30', aa: '12,5', use: 'hopstand', min: '20', temp: '75' });
    d.mash = [{ name: 'Palier unique', temp: '67', min: '60' }];
    const xml = recipeToBeerXml(d);
    expect(xml).toContain('<RECIPES>');
    const [back] = parseBeerXml(xml)!;
    expect(back.name).toBe(d.name);
    expect(back.mrows.map((m) => m.id)).toEqual(d.mrows.map((m) => m.id));
    expect(back.hrows.map((h) => h.use)).toEqual(d.hrows.map((h) => h.use));
    expect(back.hrows[2].temp).toBe('75');
    expect(back.mash).toEqual(d.mash);
    expect(compute(back)!.og).toBeCloseTo(compute(d)!.og, 3);
  });
  it('crée les ingrédients inconnus à l’import', () => {
    const xml = `<RECIPES><RECIPE><NAME>Importée</NAME><VERSION>1</VERSION><TYPE>All Grain</TYPE><BATCH_SIZE>23</BATCH_SIZE><BOIL_TIME>60</BOIL_TIME><EFFICIENCY>70</EFFICIENCY>
<FERMENTABLES><FERMENTABLE><NAME>Malt Mystère</NAME><VERSION>1</VERSION><TYPE>Grain</TYPE><AMOUNT>4</AMOUNT><YIELD>75</YIELD><COLOR>5</COLOR></FERMENTABLE></FERMENTABLES>
<HOPS><HOP><NAME>Houblon Inconnu</NAME><VERSION>1</VERSION><ALPHA>8</ALPHA><AMOUNT>0.03</AMOUNT><USE>Boil</USE><TIME>60</TIME></HOP></HOPS></RECIPE></RECIPES>`;
    const [d] = parseBeerXml(xml)!;
    expect(MALTS.some((m) => m.name === 'Malt Mystère' && m.custom)).toBe(true);
    expect(d.vol).toBe('23');
    expect(d.hrows[0].grams).toBe('30');
    expect(compute(d)!.ibu).toBeGreaterThan(0);
  });
  it('refuse un fichier qui n’est pas du BeerXML', () => {
    expect(parseBeerXml('<html/>')).toBeNull();
    expect(parseBeerXml('pas du xml')).toBeNull();
  });
  it('conserve les notes', () => {
    const d = { ...defaultRecipe('Avec notes'), notes: { before: 'prévoir 2 sachets', during: 'DI mesurée 1,062', after: 'bonne carbonatation' } };
    const [back] = parseBeerXml(recipeToBeerXml(d))!;
    expect(back.notes).toEqual(d.notes);
  });
  it('conserve un EBC modifié sur un malt connu', () => {
    const d = defaultRecipe('EBC perso');
    d.mrows[0] = { ...d.mrows[0], ebc: '40' };
    const [back] = parseBeerXml(recipeToBeerXml(d))!;
    expect(back.mrows[0].ebc).toBe('40');
    expect(back.mrows[1].ebc).toBeUndefined();
  });
});

