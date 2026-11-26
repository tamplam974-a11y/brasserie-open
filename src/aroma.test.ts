import { describe, expect, it } from 'vitest';
import { FAMILIES, aromaProfile, aromaWeight, combineProfiles, familyOf, hopProfile } from './aroma';

const at = (v: number[], f: (typeof FAMILIES)[number]) => v[FAMILIES.indexOf(f)];

describe('arômes', () => {
  it('range les descripteurs dans la bonne famille', () => {
    expect(familyOf('pamplemousse')).toBe('agrumes');
    expect(familyOf('fruits tropicaux')).toBe('fruits tropicaux');
    expect(familyOf('fruit de la passion')).toBe('fruits tropicaux');
    expect(familyOf('fruits à noyau')).toBe('fruits à noyau');
    expect(familyOf('mûre')).toBe('fruits rouges');
    expect(familyOf('amérisant neutre')).toBeNull();
  });
  it('donne 5 à la famille dominante', () => {
    const v = aromaProfile([{ aroma: 'agrumes, fruits tropicaux', grams: 50, use: 'dryhop', min: 0 }]);
    expect(at(v, 'agrumes')).toBe(5);
    expect(at(v, 'fruits tropicaux')).toBe(5);
    expect(at(v, 'floral')).toBe(0);
  });
  it('fait peser le dry hop bien plus que l’ébullition longue', () => {
    const v = aromaProfile([
      { aroma: 'agrumes', grams: 20, use: 'boil', min: 60 },
      { aroma: 'floral', grams: 20, use: 'dryhop', min: 0 },
    ]);
    expect(at(v, 'floral')).toBe(5);
    expect(at(v, 'agrumes')).toBeLessThan(0.5);
  });
  it('renvoie des zéros sans arôme connu', () => {
    expect(aromaProfile([{ aroma: 'amérisant', grams: 30, use: 'boil', min: 60 }]).every((x) => x === 0)).toBe(true);
    expect(aromaProfile([]).every((x) => x === 0)).toBe(true);
  });
});

describe('houblon seul et association', () => {
  it('donne plus de poids au premier descripteur', () => {
    const v = hopProfile('agrumes, fruits tropicaux');
    expect(at(v, 'agrumes')).toBe(5);
    expect(at(v, 'fruits tropicaux')).toBeCloseTo(3.75, 6);
  });
  it('associe deux houblons en gardant 5 au maximum', () => {
    const c = combineProfiles([hopProfile('agrumes'), hopProfile('résine, agrumes')]);
    expect(Math.max(...c)).toBe(5);
    expect(at(c, 'agrumes')).toBe(5);
    expect(at(c, 'résine / pin')).toBeGreaterThan(0);
  });
  it('renvoie des zéros sans profil', () => {
    expect(combineProfiles([]).every((x) => x === 0)).toBe(true);
    expect(hopProfile('amérisant').every((x) => x === 0)).toBe(true);
  });
});

describe('houblon à l’empâtage et arôme', () => {
  it('compte pour un cinquième de son poids', () => {
    expect(aromaWeight({ aroma: 'agrumes', grams: 50, use: 'mash', min: 60 })).toBeCloseTo(10, 10);
  });
});
