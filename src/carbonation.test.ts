import { describe, expect, it } from 'vitest';
import { carbRange, kegPressure, midpoint, primingSugar, residualCo2 } from './carbonation';

describe('carbonation', () => {
  it('donne environ 0,86 volume de CO2 résiduel à 20 °C', () => {
    expect(residualCo2(20)).toBeCloseTo(0.86, 2);
  });
  it('baisse le CO2 résiduel quand la température monte', () => {
    expect(residualCo2(15)).toBeGreaterThan(residualCo2(25));
  });
  it('calcule le sucre pour 2,4 volumes dans 20 L à 20 °C avec du sucre blanc', () => {
    const p = primingSugar({ volumeL: 20, targetVol: 2.4, tempC: 20, sugar: 'saccharose' });
    expect(p.gPerL).toBeCloseTo(5.62, 1);
    expect(p.totalG).toBeCloseTo(p.gPerL * 20, 6);
  });
  it('ne demande pas de sucre si le CO2 résiduel suffit, et plus de dextrose que de sucre blanc', () => {
    expect(primingSugar({ volumeL: 20, targetVol: 0.5, tempC: 20, sugar: 'saccharose' }).totalG).toBe(0);
    const a = primingSugar({ volumeL: 20, targetVol: 2.4, tempC: 20, sugar: 'dextrose' }).gPerL;
    const b = primingSugar({ volumeL: 20, targetVol: 2.4, tempC: 20, sugar: 'saccharose' }).gPerL;
    expect(a).toBeGreaterThan(b);
  });
  it('donne environ 11,25 psi pour 2,5 volumes à 38 °F', () => {
    const k = kegPressure((38 - 32) * 5 / 9, 2.5);
    expect(k.psi).toBeCloseTo(11.25, 1);
    expect(k.bar).toBeCloseTo(0.776, 2);
  });
  it('propose une fourchette par style et une valeur par défaut', () => {
    expect(carbRange('10A')[0]).toBeGreaterThan(3);
    expect(carbRange('INCONNU')).toEqual([2.2, 2.8]);
    expect(midpoint([2.2, 2.8])).toBe(2.5);
  });
});
