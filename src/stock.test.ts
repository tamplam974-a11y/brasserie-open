import { describe, expect, it } from 'vitest';
import { balance, deduct, needsFromRecipe, newLot, type Lot } from './stock';
import { defaultRecipe } from './library';

const lot = (p: Partial<Lot>): Lot => ({ ...newLot(), ...p });

describe('stock', () => {
  it('calcule le solde', () => {
    expect(balance(lot({ initial: '25', withdrawn: '3,5' }))).toBeCloseTo(21.5, 10);
    expect(balance(lot({ initial: '', withdrawn: '' }))).toBe(0);
    expect(balance(lot({ initial: '1', withdrawn: '2' }))).toBe(-1);
  });
  it('retire d’abord des achats les plus anciens et ne modifie pas les lignes d’origine', () => {
    const lots = [lot({ id: 'b', ingredientId: 'pale', date: '2026-06-01', initial: '10' }), lot({ id: 'a', ingredientId: 'pale', date: '2026-01-01', initial: '3' }), lot({ id: 'c', ingredientId: 'munich', initial: '5' })];
    const r = deduct(lots, [{ ingredientId: 'pale', amount: 4 }], 3);
    expect(r.missing).toEqual([]);
    expect(r.lots.find((l) => l.id === 'a')!.withdrawn).toBe('3');
    expect(r.lots.find((l) => l.id === 'b')!.withdrawn).toBe('1');
    expect(r.lots.find((l) => l.id === 'c')!.withdrawn).toBe('');
    expect(lots[0].withdrawn).toBe('');
  });
  it('signale ce qui manque et regroupe les besoins d’un même ingrédient', () => {
    const lots = [lot({ id: 'a', ingredientId: 'citra', initial: '60' })];
    const r = deduct(lots, [{ ingredientId: 'citra', amount: 50 }, { ingredientId: 'citra', amount: 30 }, { ingredientId: 'mosaic', amount: 20 }], 1);
    expect(r.lots[0].withdrawn).toBe('60');
    expect(r.missing).toEqual([{ ingredientId: 'citra', amount: 20 }, { ingredientId: 'mosaic', amount: 20 }]);
  });
  it('ignore les lignes déjà épuisées et les quantités nulles', () => {
    const lots = [lot({ id: 'a', ingredientId: 'pale', date: '2026-01-01', initial: '2', withdrawn: '2' }), lot({ id: 'b', ingredientId: 'pale', date: '2026-02-01', initial: '5' })];
    const r = deduct(lots, [{ ingredientId: 'pale', amount: 1.5 }, { ingredientId: 'pale', amount: 0 }], 3);
    expect(r.lots.map((l) => l.withdrawn)).toEqual(['2', '1,5']);
  });
  it('lit les besoins d’une recette en kilos et en grammes', () => {
    const n = needsFromRecipe(defaultRecipe());
    expect(n.malts[0]).toEqual({ ingredientId: 'pale', amount: 5 });
    expect(n.hops.map((h) => h.amount)).toEqual([15, 50]);
  });
});
