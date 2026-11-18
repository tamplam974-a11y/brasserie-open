/**
 * Amertume (IBU) selon la formule de Tinseth.
 * Volumes en litres, masses en grammes, durées en minutes.
 */

export interface HopAddition {
  name?: string;
  grams: number;
  alphaAcidPct: number;
  boilTimeMin: number;
}

/** Taux d'utilisation des acides alpha (Tinseth). */
export function tinsethUtilization(boilTimeMin: number, boilGravity: number): number {
  const bigness = 1.65 * Math.pow(0.000125, boilGravity - 1);
  const timeFactor = (1 - Math.exp(-0.04 * boilTimeMin)) / 4.15;
  return bigness * timeFactor;
}

/** IBU apportés par une addition. */
export function ibuForAddition(
  addition: HopAddition,
  volumeL: number,
  boilGravity: number,
): number {
  const alphaMgPerL = (addition.alphaAcidPct / 100) * addition.grams * 1000 / volumeL;
  return alphaMgPerL * tinsethUtilization(addition.boilTimeMin, boilGravity);
}

/** Contribution de chaque addition, utile pour le diagramme multi-houblons. */
export function ibuContributions(
  additions: HopAddition[],
  volumeL: number,
  boilGravity: number,
): number[] {
  return additions.map((a) => ibuForAddition(a, volumeL, boilGravity));
}

/** IBU total d'une recette. */
export function ibuTinseth(
  additions: HopAddition[],
  volumeL: number,
  boilGravity: number,
): number {
  return ibuContributions(additions, volumeL, boilGravity).reduce((s, v) => s + v, 0);
}
