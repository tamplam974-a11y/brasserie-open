import { afterEach, describe, expect, it } from 'vitest';
import { compute, defaultRecipe, type RecipeState } from './library';
import { DEFAULT_SETTINGS, PRESETS, matchPreset, setSettings, settings } from './settings';

afterEach(() => setSettings(DEFAULT_SETTINGS, false));

const withHops = (hrows: RecipeState['hrows']) => ({ ...defaultRecipe('Calibrage'), hrows });
const magnum = (use: RecipeState['hrows'][number]['use']) => ({ id: 'magnum', grams: '30', aa: '13', use, min: '60', temp: '100' });

describe('réglages de calcul', () => {
  it('commencent calés sur BeerSmith et se reconnaissent', () => {
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(matchPreset(settings)).toBe('beersmith');
    setSettings({ pelletPct: 3 }, false);
    expect(matchPreset(settings)).toBe('custom');
  });
  it('bornent les valeurs', () => {
    setSettings({ pelletPct: 99, fwhPct: -5 }, false);
    expect(settings.pelletPct).toBe(30);
    expect(settings.fwhPct).toBe(0);
  });
  it('appliquent le bonus granulés à tous les ajouts qui apportent de l’amertume', () => {
    const d = withHops([magnum('boil')]);
    const base = compute(d)!.ibu;
    setSettings({ pelletPct: 10 }, false);
    expect(compute(d)!.ibu / base).toBeCloseTo(1.1, 10);
  });
  it('règle le bonus du premier moût sans toucher à l’ébullition', () => {
    const fwh = withHops([magnum('fwh')]), boil = withHops([magnum('boil')]);
    const boilIbu = compute(boil)!.ibu;
    expect(compute(fwh)!.ibu / boilIbu).toBeCloseTo(1.1, 10);
    setSettings({ fwhPct: 25 }, false);
    expect(compute(fwh)!.ibu / boilIbu).toBeCloseTo(1.25, 10);
    expect(compute(boil)!.ibu).toBeCloseTo(boilIbu, 10);
  });
  it('donne plus d’amertume avec une densité d’ébullition plus basse', () => {
    const d = withHops([magnum('boil')]);
    const og = compute(d)!.ibu;
    setSettings({ gravityMode: 'mean' }, false);
    const mean = compute(d)!.ibu;
    setSettings({ gravityMode: 'pre' }, false);
    const pre = compute(d)!.ibu;
    expect(mean).toBeGreaterThan(og);
    expect(pre).toBeGreaterThan(mean);
  });
  it('approchent les trois logiciels comparés sur la recette de référence (ordre de grandeur)', () => {
    const d = { ...defaultRecipe('Claude'),
      mrows: [{ id: 'pale', kg: '4,13' }, { id: 'munich', kg: '0,79' }, { id: 'oats', kg: '0,63' }, { id: 'cara30', kg: '0,41' }],
      hrows: [
        { id: 'magnum', grams: '30', aa: '13', use: 'fwh' as const, min: '60', temp: '100' },
        { id: 'mosaic', grams: '25', aa: '11,8', use: 'boil' as const, min: '10', temp: '100' },
        { id: 'citra', grams: '50', aa: '12,8', use: 'hopstand' as const, min: '20', temp: '78' },
      ] };
    const target: Record<string, number> = { beersmith: 62.6, littlebock: 74, brewfather: 72 };
    for (const p of PRESETS) {
      setSettings(p.settings, false);
      const ibu = compute(d)!.ibu;
      expect(Math.abs(ibu - target[p.id]) / target[p.id], `${p.label} : ${ibu.toFixed(1)}`).toBeLessThan(0.05);
    }
  });
});
