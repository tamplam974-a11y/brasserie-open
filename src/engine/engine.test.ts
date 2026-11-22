import { describe, expect, it } from 'vitest';
import {
  abvSimple,
  apparentAttenuation,
  brixToSg,
  correctGravityForTemperature,
  dilutionToTargetGravity,
  gravityAfterVolumeChange,
  platoToSg,
  refractometerFinalGravity,
  sgToPlato,
  ibuContributions,
  ibuTinseth,
  mcu,
  srmMorey,
  srmToEbc,
  ebcToSrm,
} from './index';

describe('alcool et atténuation', () => {
  it('calcule 5,25 % pour 1.050 et 1.010', () => {
    expect(abvSimple(1.05, 1.01)).toBeCloseTo(5.25, 2);
  });
  it('calcule une atténuation apparente de 80 %', () => {
    expect(apparentAttenuation(1.05, 1.01)).toBeCloseTo(80, 5);
  });
});

describe('conversions Plato / Brix / SG', () => {
  it('convertit 12 °P en environ 1.0484', () => {
    expect(platoToSg(12)).toBeCloseTo(1.0484, 3);
  });
  it('retrouve 12 °P après aller-retour', () => {
    expect(sgToPlato(platoToSg(12))).toBeCloseTo(12, 1);
  });
  it('traite le Brix comme du Plato pour un moût', () => {
    expect(brixToSg(12)).toBe(platoToSg(12));
  });
});

describe('correction de température', () => {
  it('ne change rien à la température de calibration', () => {
    expect(correctGravityForTemperature(1.05, 20, 20)).toBeCloseTo(1.05, 6);
  });
  it('corrige 1.050 lu à 80 °F (26,7 °C) pour un densimètre calibré à 60 °F', () => {
    expect(correctGravityForTemperature(1.05, (80 - 32) * 5 / 9, (60 - 32) * 5 / 9)).toBeCloseTo(1.0524, 3);
  });
  it('augmente la lecture si l\'échantillon est plus chaud', () => {
    expect(correctGravityForTemperature(1.05, 30, 20)).toBeGreaterThan(1.05);
  });
});

describe('réfractomètre', () => {
  it('estime une densité finale plausible (Brix 12 initial, 7 actuel)', () => {
    const fg = refractometerFinalGravity(12, 7, 1);
    expect(fg).toBeGreaterThan(1.014);
    expect(fg).toBeLessThan(1.016);
  });
});

describe('dilution et volume', () => {
  it('dilue 20 L de 1.060 à 1.050 avec 4 L d\'eau', () => {
    const r = dilutionToTargetGravity(20, 1.06, 1.05);
    expect(r.finalVolumeL).toBeCloseTo(24, 6);
    expect(r.waterToAddL).toBeCloseTo(4, 6);
  });
  it('indique 4 L à évaporer pour passer de 1.050 à 1.060 (24 L)', () => {
    const r = dilutionToTargetGravity(24, 1.05, 1.06);
    expect(r.waterToAddL).toBeCloseTo(-4, 6);
  });
  it('concentre 25 L à 1.040 en 20 L à 1.050', () => {
    expect(gravityAfterVolumeChange(25, 1.04, 20)).toBeCloseTo(1.05, 6);
  });
  it('refuse une densité inférieure ou égale à 1', () => {
    expect(() => dilutionToTargetGravity(20, 1, 1.05)).toThrow();
  });
});

describe('amertume Tinseth', () => {
  const hop = { grams: 28, alphaAcidPct: 5, boilTimeMin: 60 };
  it('donne environ 17 IBU pour 28 g à 5 % pendant 60 min (19 L, 1.050)', () => {
    expect(ibuTinseth([hop], 19, 1.05)).toBeCloseTo(17, 1);
  });
  it('donne 0 IBU sans ébullition', () => {
    expect(ibuTinseth([{ ...hop, boilTimeMin: 0 }], 19, 1.05)).toBe(0);
  });
  it('additionne les contributions', () => {
    const second = { grams: 14, alphaAcidPct: 10, boilTimeMin: 15 };
    const parts = ibuContributions([hop, second], 19, 1.05);
    expect(parts).toHaveLength(2);
    expect(ibuTinseth([hop, second], 19, 1.05)).toBeCloseTo(parts[0] + parts[1], 10);
  });
  it('baisse l\'utilisation quand la densité augmente', () => {
    expect(ibuTinseth([hop], 19, 1.09)).toBeLessThan(ibuTinseth([hop], 19, 1.05));
  });
});

describe('couleur Morey', () => {
  const grains = [{ kg: 4.5359237, lovibond: 2 }];
  it('calcule 4 MCU pour 10 lb de malt à 2 °L dans 5 gallons', () => {
    expect(mcu(grains, 18.92706)).toBeCloseTo(4, 3);
  });
  it('donne environ 3,86 SRM et 7,6 EBC', () => {
    const srm = srmMorey(grains, 18.92706);
    expect(srm).toBeCloseTo(3.86, 1);
    expect(srmToEbc(srm)).toBeCloseTo(7.6, 1);
  });
  it('convertit EBC et SRM dans les deux sens', () => {
    expect(ebcToSrm(srmToEbc(10))).toBeCloseTo(10, 10);
  });
});

import { calcRecipe } from './index';
describe('recette complète', () => {
  const base = { volumeL: 20, efficiencyPct: 75, yeastAttenuationPct: 75, hops: [],
    malts: [{ kg: 5, extractPct: 80, ebc: 3.5 }] };
  it('calcule DI, DF et alcool d’une recette simple', () => {
    const r = calcRecipe(base);
    expect(r.og).toBeCloseTo(1.0577, 3);
    expect(r.fg).toBeCloseTo(1.0144, 3);
    expect(r.abv).toBeCloseTo(5.68, 1);
  });
  it('ignore le dry hop dans les IBU', () => {
    const h = { grams: 30, alphaAcidPct: 10, boilTimeMin: 60 };
    expect(calcRecipe({ ...base, hops: [{ ...h, dryHop: true }] }).ibu).toBe(0);
    expect(calcRecipe({ ...base, hops: [h] }).ibu).toBeGreaterThan(20);
  });
  it('donne une bière pâle pour du malt Pilsner seul', () => {
    expect(calcRecipe(base).ebc).toBeLessThan(8);
  });
});

import { hopstandEquivalentMinutes } from './index';
describe('hopstand', () => {
  it('équivaut à l’ébullition à 100 °C', () => {
    expect(hopstandEquivalentMinutes(20, 100)).toBeCloseTo(20, 6);
  });
  it('réduit fortement l’utilisation à 80 °C', () => {
    const m = hopstandEquivalentMinutes(20, 80);
    expect(m).toBeGreaterThan(2.5);
    expect(m).toBeLessThan(4);
  });
  it('ne produit pas d’amertume sous 60 °C', () => {
    expect(hopstandEquivalentMinutes(30, 50)).toBe(0);
  });
  it('apporte moins d’IBU en hopstand qu’en ébullition', () => {
    const base = { volumeL: 20, efficiencyPct: 75, yeastAttenuationPct: 75,
      malts: [{ kg: 5, extractPct: 80, ebc: 3.5 }] };
    const h = { grams: 30, alphaAcidPct: 10, boilTimeMin: 20 };
    const boil = calcRecipe({ ...base, hops: [h] }).ibu;
    const stand = calcRecipe({ ...base, hops: [{ ...h, tempC: 80 }] }).ibu;
    expect(stand).toBeGreaterThan(0);
    expect(stand).toBeLessThan(boil);
  });
});

describe('IBU par ligne', () => {
  it('détaille chaque houblon et leur somme donne le total', () => {
    const r = calcRecipe({ volumeL: 20, efficiencyPct: 75, yeastAttenuationPct: 75,
      malts: [{ kg: 5, extractPct: 80, ebc: 3.5 }],
      hops: [{ grams: 20, alphaAcidPct: 12, boilTimeMin: 60 },
             { grams: 50, alphaAcidPct: 12, boilTimeMin: 0, dryHop: true },
             { grams: 30, alphaAcidPct: 10, boilTimeMin: 20, tempC: 80 }] });
    expect(r.hopIbu).toHaveLength(3);
    expect(r.hopIbu[1]).toBe(0);
    expect(r.hopIbu[0] + r.hopIbu[1] + r.hopIbu[2]).toBeCloseTo(r.ibu, 10);
  });
});

describe('température d’une addition en ébullition', () => {
  const base = { volumeL: 20, efficiencyPct: 75, yeastAttenuationPct: 75,
    malts: [{ kg: 5, extractPct: 80, ebc: 3.5 }] };
  const h = { grams: 20, alphaAcidPct: 12, boilTimeMin: 60 };
  it('ne change rien à 100 °C', () => {
    expect(calcRecipe({ ...base, hops: [{ ...h, tempC: 100 }] }).ibu)
      .toBeCloseTo(calcRecipe({ ...base, hops: [h] }).ibu, 10);
  });
  it('réduit l’amertume à 95 °C', () => {
    expect(calcRecipe({ ...base, hops: [{ ...h, tempC: 95 }] }).ibu)
      .toBeLessThan(calcRecipe({ ...base, hops: [h] }).ibu);
  });
});

describe('FWH', () => {
  const base = { volumeL: 20, efficiencyPct: 75, yeastAttenuationPct: 75,
    malts: [{ kg: 5, extractPct: 80, ebc: 3.5 }] };
  const h = { grams: 20, alphaAcidPct: 12, boilTimeMin: 60 };
  it('apporte plus d’IBU que la même addition en ébullition', () => {
    const boil = calcRecipe({ ...base, hops: [h] }).ibu;
    const fwh = calcRecipe({ ...base, hops: [{ ...h, fwh: true }] }).ibu;
    expect(fwh).toBeGreaterThan(boil);
    expect(fwh / boil).toBeCloseTo(1.1, 6);
  });
});

describe('proportionnalité (curseurs du bilan)', () => {
  const hop = { grams: 20, alphaAcidPct: 12, boilTimeMin: 60 };
  const base = { volumeL: 20, efficiencyPct: 75, yeastAttenuationPct: 75, hops: [hop],
    malts: [{ kg: 5, extractPct: 80, ebc: 3.5 }, { kg: 1, extractPct: 75, ebc: 30 }] };
  it('multiplier tous les malts par f multiplie les points de densité par f', () => {
    const a = calcRecipe(base);
    const b = calcRecipe({ ...base, malts: base.malts.map((m) => ({ ...m, kg: m.kg * 1.2 })) });
    expect((b.og - 1) / (a.og - 1)).toBeCloseTo(1.2, 10);
  });
  it('multiplier les houblons par f multiplie les IBU par f', () => {
    const a = calcRecipe(base);
    const b = calcRecipe({ ...base, hops: [{ ...hop, grams: hop.grams * 1.5 }] });
    expect(b.ibu / a.ibu).toBeCloseTo(1.5, 10);
  });
});

import { mashWater, strikeTemperature } from './index';
describe('eaux d’empâtage', () => {
  it('calcule empâtage, rinçage et volume pré-ébullition', () => {
    const w = mashWater({ grainKg: 5.5, ratioLPerKg: 3, absorptionLPerKg: 1, evapLPerH: 3, boilMin: 60, lossL: 1.5, batchL: 20 });
    expect(w.strikeL).toBeCloseTo(16.5, 6);
    expect(w.firstRunningsL).toBeCloseTo(11, 6);
    expect(w.preBoilL).toBeCloseTo(24.5, 6);
    expect(w.spargeL).toBeCloseTo(13.5, 6);
  });
  it('ne demande pas de rinçage quand le premier moût suffit', () => {
    const w = mashWater({ grainKg: 10, ratioLPerKg: 4, absorptionLPerKg: 1, evapLPerH: 2, boilMin: 60, lossL: 1, batchL: 20 });
    expect(w.spargeL).toBe(0);
  });
  it('donne environ 72,3 °C pour viser 66 °C avec un grain à 20 °C et 3 L/kg', () => {
    expect(strikeTemperature(66, 20, 3)).toBeCloseTo(72.29, 1);
  });
});

import { abvAdvanced, abvFromPrimingSugar, SUGARS } from './index';
describe('alcool précis et ressucrage', () => {
  it('donne environ 5,34 % avec la formule précise pour 1.050 et 1.010', () => {
    expect(abvAdvanced(1.05, 1.01)).toBeCloseTo(5.34, 1);
  });
  it('ajoute environ 0,45 % pour 7 g/L de sucre blanc', () => {
    expect(abvFromPrimingSugar(7, SUGARS.saccharose.ethanolGPerG)).toBeCloseTo(0.453, 2);
  });
  it('n’ajoute rien sans sucre et moins avec du dextrose qu’avec du saccharose', () => {
    expect(abvFromPrimingSugar(0, SUGARS.saccharose.ethanolGPerG)).toBe(0);
    expect(abvFromPrimingSugar(7, SUGARS.dextrose.ethanolGPerG)).toBeLessThan(abvFromPrimingSugar(7, SUGARS.saccharose.ethanolGPerG));
  });
});

import { refractometerFg, sugarToReachGravity, gravityPoints, SUGAR_GRAVITY } from './index';
describe('concentration par ajout de sucre et réfractomètre en DI', () => {
  it('calcule le sucre blanc pour passer 20 L de 1.060 à 1.080', () => {
    const r = sugarToReachGravity(20, 1.06, 1.08, 'saccharose')!;
    expect(r.grams).toBeCloseTo(1197, 0);
    const points = gravityPoints(1.06) * 20 + (r.grams / 1000) * SUGAR_GRAVITY.saccharose.pointsLPerKg;
    expect(points / r.finalVolumeL).toBeCloseTo(80, 3);
  });
  it('ne propose rien si la cible est déjà atteinte ou invalide', () => {
    expect(sugarToReachGravity(20, 1.06, 1.05, 'dextrose')).toBeNull();
    expect(sugarToReachGravity(0, 1.06, 1.08, 'dextrose')).toBeNull();
  });
  it('demande plus de dextrose que de sucre blanc, car il apporte moins de densité', () => {
    const a = sugarToReachGravity(20, 1.05, 1.07, 'dextrose')!.grams;
    const b = sugarToReachGravity(20, 1.05, 1.07, 'saccharose')!.grams;
    expect(a).toBeGreaterThan(b);
  });
  it('donne la même densité finale qu’avec le Brix initial équivalent', () => {
    const og = 1.0484;
    expect(refractometerFg(og, 7, 1)).toBeCloseTo(refractometerFinalGravity(12, 7, 1), 2);
    expect(refractometerFg(og, 7, 1.04)).toBeLessThan(og);
  });
});

import { originalGravityFromReadings } from './index';
describe('retrouver la densité initiale', () => {
  it('retrouve le Brix initial utilisé pour fabriquer les deux lectures', () => {
    const fg = refractometerFinalGravity(12, 7, 1.04);
    const r = originalGravityFromReadings(fg, 7, 1.04)!;
    expect(r.originalBrix).toBeCloseTo(12, 3);
    expect(r.og).toBeCloseTo(platoToSg(12 / 1.04), 4);
  });
  it('donne une densité initiale plausible pour 1.012 au densimètre et 8 °Brix', () => {
    const r = originalGravityFromReadings(1.012, 8, 1)!;
    expect(r.og).toBeGreaterThan(1.06);
    expect(r.og).toBeLessThan(1.067);
    expect(abvSimple(r.og, 1.012)).toBeGreaterThan(6);
  });
  it('augmente la densité initiale quand le densimètre lit plus bas pour un même Brix', () => {
    const a = originalGravityFromReadings(1.014, 8, 1.04)!.og;
    const b = originalGravityFromReadings(1.008, 8, 1.04)!.og;
    expect(b).toBeGreaterThan(a);
  });
  it('refuse des lectures incohérentes', () => {
    expect(originalGravityFromReadings(1.06, 5, 1.04)).toBeNull();
    expect(originalGravityFromReadings(0.9, 8, 1.04)).toBeNull();
  });
});
