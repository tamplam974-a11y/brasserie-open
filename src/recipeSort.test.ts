import { describe, expect, it } from 'vitest';
import { defaultRecipe } from './library';
import { loadSort, sortItems } from './recipeSort';

const item = (name: string, kg = '5') => ({ data: { ...defaultRecipe(name), mrows: [{ id: 'pale', kg }] } });
const names = (xs: { data: { name: string } }[]) => xs.map((x) => x.data.name);

describe('tri des recettes', () => {
  const xs = [item('Blonde'), item('113 Grape ale'), item('7 IPA'), item('42 Stout'), item('Ambrée')];
  it('garde l’ordre de la bibliothèque en mode manuel', () => {
    expect(sortItems(xs, 'manual')).toBe(xs);
  });
  it('trie par nom', () => {
    expect(names(sortItems(xs, 'name'))).toEqual(['113 Grape ale', '42 Stout', '7 IPA', 'Ambrée', 'Blonde']);
  });
  it('trie par numéro, croissant ou décroissant, les recettes sans numéro en dernier', () => {
    expect(names(sortItems(xs, 'num'))).toEqual(['7 IPA', '42 Stout', '113 Grape ale', 'Blonde', 'Ambrée']);
    expect(names(sortItems(xs, 'numdesc'))).toEqual(['113 Grape ale', '42 Stout', '7 IPA', 'Blonde', 'Ambrée']);
  });
  it('trie par alcool décroissant et ne modifie pas la liste d’origine', () => {
    const ys = [item('Faible', '3'), item('Forte', '9'), item('Moyenne', '6')];
    expect(names(sortItems(ys, 'abv'))).toEqual(['Forte', 'Moyenne', 'Faible']);
    expect(names(ys)).toEqual(['Faible', 'Forte', 'Moyenne']);
  });
  it('revient à l’ordre manuel si rien n’est mémorisé', () => {
    expect(loadSort()).toBe('manual');
  });
});
