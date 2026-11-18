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
