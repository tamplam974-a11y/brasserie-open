import { describe, expect, it } from 'vitest';
import { STYLES, removeStyle, upsertStyles } from './styles';

const maison = { id: 'X1', name: 'Ma bière maison', og: [1.045, 1.055] as [number, number], fg: [1.01, 1.014] as [number, number], ibu: [20, 30] as [number, number], srm: [8, 14] as [number, number], abv: [4.5, 5.5] as [number, number] };

describe('styles personnalisés', () => {
  it('ajoute puis supprime un style', () => {
    expect(upsertStyles([maison])).toEqual({ added: 1, replaced: 0 });
    expect(STYLES.find((s) => s.id === 'X1')?.custom).toBe(true);
    removeStyle('X1');
    expect(STYLES.some((s) => s.id === 'X1')).toBe(false);
  });
  it('remplace un style de départ de même numéro, qui réapparaît après suppression', () => {
    const avant = STYLES.find((s) => s.id === '21A')!;
    expect(upsertStyles([{ ...maison, id: '21A', name: 'Mon IPA' }])).toEqual({ added: 0, replaced: 1 });
    expect(STYLES.filter((s) => s.id === '21A')).toHaveLength(1);
    expect(STYLES.find((s) => s.id === '21A')?.name).toBe('Mon IPA');
    removeStyle('21A');
    expect(STYLES.find((s) => s.id === '21A')?.name).toBe(avant.name);
  });
  it('garde la liste triée par numéro', () => {
    const ids = STYLES.map((s) => s.id);
    expect([...ids].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))).toEqual(ids);
  });
});
