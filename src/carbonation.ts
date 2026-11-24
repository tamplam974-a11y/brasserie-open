/** Carbonatation : CO2 résiduel, sucre de ressucrage et pression en fût. Valeurs usuelles de brasseur amateur, à ajuster. */
import type { SugarKind } from './engine';

export const DEFAULT_RANGE: [number, number] = [2.2, 2.8];

/** Fourchettes de carbonatation usuelles (volumes de CO2) par numéro de style. Pas des valeurs officielles du BJCP. */
export const CARB_RANGES: Record<string, [number, number]> = {
  '19A': [2.2, 2.8], '26B': [2.6, 3.6], '26C': [3.0, 4.0], '26D': [2.6, 3.6], '25A': [2.6, 3.6], '15A': [2.0, 2.6], '16D': [2.2, 2.8],
  '13B': [1.8, 2.4], '17C': [1.8, 2.4], '6B': [2.4, 2.8], '23B': [2.2, 2.8], '21B-BE': [2.4, 3.2], '21B-BK': [2.2, 2.8], '21B-RY': [2.2, 2.8], 'BRAG': [1.8, 2.6],
  '1D': [2.4, 3.0], '5B': [2.4, 2.8], '5D': [2.4, 2.8], '10A': [3.3, 4.5], '17D': [1.5, 2.2], '18B': [2.3, 2.8], '20A': [2.0, 2.6],
  '20B': [2.0, 2.6], '20C': [1.8, 2.4], '21A': [2.2, 2.8], '22C': [1.8, 2.5], '23A': [3.0, 3.8], '23C': [2.2, 2.8], '23D': [2.4, 3.2],
  '24A': [2.6, 3.4], '24C': [2.2, 2.8], '25B': [2.8, 3.8], '26A': [2.5, 3.2], '27L': [2.4, 3.0],
};

export const carbRange = (styleId: string): [number, number] => CARB_RANGES[styleId] ?? DEFAULT_RANGE;
export const midpoint = (r: [number, number]) => Math.round(((r[0] + r[1]) / 2) * 10) / 10;

/** CO2 déjà dissous dans la bière après fermentation, selon la température la plus haute atteinte (formule usuelle, °F). */
export function residualCo2(tempC: number): number {
  const f = (tempC * 9) / 5 + 32;
  return 3.0378 - 0.050062 * f + 0.00026555 * f * f;
}

/** Grammes de produit par litre et par volume de CO2 à ajouter (valeurs usuelles, approchées). */
export const GRAMS_PER_L_PER_VOLUME: Record<SugarKind, number> = { saccharose: 3.65, dextrose: 4.0, miel: 4.8, dme: 5.3 };

export function primingSugar(o: { volumeL: number; targetVol: number; tempC: number; sugar: SugarKind }) {
  const residual = residualCo2(o.tempC);
  const toAdd = Math.max(0, o.targetVol - residual);
  const gPerL = toAdd * GRAMS_PER_L_PER_VOLUME[o.sugar];
  return { residual, toAdd, gPerL, totalG: gPerL * o.volumeL };
}

/** Pression de carbonatation forcée en fût (manométrique), à la température du fût. */
export function kegPressure(tempC: number, vol: number): { psi: number; bar: number } {
  const f = (tempC * 9) / 5 + 32;
  const psi = Math.max(0, -16.6999 - 0.0101059 * f + 0.00116512 * f * f + 0.173354 * f * vol + 4.24267 * vol - 0.0684226 * vol * vol);
  return { psi, bar: psi * 0.0689476 };
}
