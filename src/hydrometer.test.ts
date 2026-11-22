import { describe, expect, it } from 'vitest';
import { analyze, mergeReadings, normSg, parseReadings, parseTime, type Reading } from './hydrometer';

const H = 3600e3;
const serie = (n: number, f: (i: number) => number): Reading[] => Array.from({ length: n }, (_, i) => ({ t: Date.UTC(2026, 10, 1) + i * 6 * H, sg: f(i) }));

describe('densimètres connectés', () => {
  it('reconnaît les formats de date', () => {
    expect(parseTime('2026-11-01 10:00:00')).toBe(parseTime('2026-11-01T10:00:00'));
    expect(parseTime('1793527200')).toBe(1793527200 * 1000);
    expect(parseTime('01/11/2026 10:00')).toBe(new Date(2026, 10, 1, 10, 0, 0).getTime());
    expect(parseTime('n’importe quoi')).toBeNaN();
  });
  it('ramène les densités au SG', () => {
    expect(normSg(1050)).toBeCloseTo(1.05, 6);
    expect(normSg(1.048)).toBeCloseTo(1.048, 6);
    expect(normSg(12)).toBeCloseTo(1.0484, 3);
    expect(normSg(12, true)).toBeCloseTo(1.0484, 3);
    expect(normSg(500)).toBeNaN();
    expect(normSg(NaN)).toBeNaN();
  });
  it('lit un export de type Tilt (SG x 1000, °F)', () => {
    const { readings, errors } = parseReadings('Timestamp,SG,Temp\n2026-11-01 10:00:00,1050,68\n2026-11-01 16:00:00,1048,69\n');
    expect(errors).toEqual([]);
    expect(readings[0].sg).toBeCloseTo(1.05, 6);
    expect(readings[0].tempC).toBeCloseTo(20, 1);
  });
  it('lit un export de type iSpindel (point-virgule, °C, densité décimale)', () => {
    const { readings } = parseReadings('time;gravity;temperature\n2026-11-01 10:00:00;1,050;19,5\n');
    expect(readings[0].sg).toBeCloseTo(1.05, 6);
    expect(readings[0].tempC).toBeCloseTo(19.5, 6);
  });
  it('signale les lignes illisibles et trie par date', () => {
    const { readings, errors } = parseReadings('time,gravity\n2026-11-02 10:00,1.040\nhier,1.050\n2026-11-01 10:00,abc\n2026-11-01 11:00,1.050\n');
    expect(readings.map((r) => r.sg)).toEqual([1.05, 1.04]);
    expect(errors).toHaveLength(2);
  });
  it('fusionne sans doublon', () => {
    const a = serie(3, () => 1.05);
    expect(mergeReadings(a, a.slice(1))).toHaveLength(3);
  });
  it('voit une fermentation active puis terminée', () => {
    const active = analyze(serie(16, (i) => 1.05 - i * 0.002))!;
    expect(active.stable).toBe(false);
    expect(active.pointsPerDay).toBeGreaterThan(5);
    const finie = analyze(serie(40, (i) => Math.max(1.01, 1.05 - i * 0.004)))!;
    expect(finie.stable).toBe(true);
    expect(finie.abv).toBeCloseTo(5.25, 1);
    expect(finie.attenuationPct).toBeCloseTo(80, 0);
  });
  it('utilise la densité initiale de la recette si on la donne', () => {
    expect(analyze(serie(4, () => 1.02), 1.06)!.abv).toBeCloseTo(5.25, 1);
    expect(analyze([])).toBeNull();
  });
});
