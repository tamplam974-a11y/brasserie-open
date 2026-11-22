/**
 * Calculs de densité : alcool, atténuation, conversions Plato/Brix/SG,
 * correction de température, réfractomètre, dilution et recalibrage de volume.
 *
 * Toutes les densités sont exprimées en SG (ex. 1.050).
 * Tous les volumes sont en litres, les températures en °C.
 */

export const ABV_FACTOR = 131.25;

/** Alcool par volume (%), formule simple : (DI - DF) x 131,25. */
export function abvSimple(og: number, fg: number): number {
  return (og - fg) * ABV_FACTOR;
}

/** Atténuation apparente (%). */
export function apparentAttenuation(og: number, fg: number): number {
  return ((og - fg) / (og - 1)) * 100;
}

/** Points de densité : 1.050 devient 50. */
export function gravityPoints(sg: number): number {
  return (sg - 1) * 1000;
}

/** Degrés Plato vers densité (SG). */
export function platoToSg(plato: number): number {
  return 1 + plato / (258.6 - (plato / 258.2) * 227.1);
}

/** Densité (SG) vers degrés Plato (polynôme de référence). */
export function sgToPlato(sg: number): number {
  return -616.868 + 1111.14 * sg - 630.272 * sg ** 2 + 135.997 * sg ** 3;
}

/**
 * Brix vers SG. Pour un moût sans alcool, Brix et Plato sont
 * pratiquement identiques : on réutilise la même conversion.
 */
export function brixToSg(brix: number): number {
  return platoToSg(brix);
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function waterDensityFactor(tempF: number): number {
  return (
    1.00130346 -
    0.000134722124 * tempF +
    0.00000204052596 * tempF ** 2 -
    0.00000000232820948 * tempF ** 3
  );
}

/**
 * Corrige une lecture de densimètre selon la température de l'échantillon.
 * calibrationTempC : température de calibration du densimètre (20 °C en général).
 */
export function correctGravityForTemperature(
  reading: number,
  sampleTempC: number,
  calibrationTempC = 20,
): number {
  const sample = waterDensityFactor(celsiusToFahrenheit(sampleTempC));
  const calibration = waterDensityFactor(celsiusToFahrenheit(calibrationTempC));
  return reading * (sample / calibration);
}

/**
 * Densité finale estimée à partir de deux lectures de réfractomètre
 * (Brix initial et Brix actuel), car l'alcool fausse la lecture après
 * le début de la fermentation.
 *
 * Formule cubique de type Terrill. À valider contre un calculateur de
 * référence avant publication (voir PROJET.md).
 * wortCorrectionFactor : facteur de correction moût/saccharose (1,04 en général).
 */
export function refractometerFinalGravity(
  originalBrix: number,
  currentBrix: number,
  wortCorrectionFactor = 1.04,
): number {
  const ob = originalBrix / wortCorrectionFactor;
  const fb = currentBrix / wortCorrectionFactor;
  return (
    1.001843 -
    0.002318474 * ob -
    0.000007775 * ob ** 2 -
    0.000000034 * ob ** 3 +
    0.00574 * fb +
    0.00003344 * fb ** 2 +
    0.000000086 * fb ** 3
  );
}

export interface DilutionResult {
  /** Volume final une fois la densité cible atteinte (L). */
  finalVolumeL: number;
  /** Eau à ajouter (L). Négatif : volume à évaporer pour concentrer. */
  waterToAddL: number;
}

/**
 * Volume à atteindre pour obtenir une densité cible,
 * en conservant la quantité de sucre (points x volume constant).
 */
export function dilutionToTargetGravity(
  volumeL: number,
  currentSg: number,
  targetSg: number,
): DilutionResult {
  if (currentSg <= 1 || targetSg <= 1) {
    throw new Error('Les densités doivent être supérieures à 1.000');
  }
  const finalVolumeL = (volumeL * gravityPoints(currentSg)) / gravityPoints(targetSg);
  return { finalVolumeL, waterToAddL: finalVolumeL - volumeL };
}

/** Nouvelle densité après un changement de volume (évaporation ou ajout d'eau). */
export function gravityAfterVolumeChange(
  volumeL: number,
  currentSg: number,
  newVolumeL: number,
): number {
  return 1 + (gravityPoints(currentSg) * volumeL) / newVolumeL / 1000;
}

/** Formule précise (Hall) : plus juste que la formule simple pour les densités élevées. */
export function abvAdvanced(og: number, fg: number): number {
  return ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);
}

export type SugarKind = 'saccharose' | 'dextrose' | 'miel' | 'dme';
/** Éthanol théorique produit par gramme de produit (valeurs approchées). */
export const SUGARS: Record<SugarKind, { label: string; ethanolGPerG: number }> = {
  saccharose: { label: 'Sucre blanc (saccharose)', ethanolGPerG: 0.538 },
  dextrose: { label: 'Dextrose (glucose monohydrate)', ethanolGPerG: 0.465 },
  miel: { label: 'Miel', ethanolGPerG: 0.41 },
  dme: { label: 'Extrait de malt sec (DME)', ethanolGPerG: 0.36 },
};

/**
 * Alcool (% vol.) apporté par le sucre de ressucrage, en g par litre de bière.
 * Éthanol en g/L divisé par 7,89 (densité 0,789) ; rendement réel supposé à 95 % du théorique.
 */
export function abvFromPrimingSugar(gPerL: number, ethanolGPerG: number, yieldRate = 0.95): number {
  return (gPerL * ethanolGPerG * yieldRate) / 7.89;
}

/** Points de densité (points x litres) apportés par kg de sucre, et volume ajouté (L) par kg. Valeurs usuelles. */
export const SUGAR_GRAVITY: Record<SugarKind, { pointsLPerKg: number; litersPerKg: number }> = {
  saccharose: { pointsLPerKg: 384.6, litersPerKg: 0.63 },
  dextrose: { pointsLPerKg: 309, litersPerKg: 0.63 },
  dme: { pointsLPerKg: 375, litersPerKg: 0.67 },
  miel: { pointsLPerKg: 292, litersPerKg: 0.7 },
};

/** Sucre à ajouter pour monter un moût à une densité cible, en tenant compte du volume qu’il ajoute. */
export function sugarToReachGravity(
  volumeL: number, currentSg: number, targetSg: number, kind: SugarKind,
): { grams: number; finalVolumeL: number } | null {
  if (!(volumeL > 0) || currentSg <= 1 || !(targetSg > currentSg)) return null;
  const { pointsLPerKg: p, litersPerKg: dv } = SUGAR_GRAVITY[kind];
  const t = gravityPoints(targetSg);
  const kg = ((t - gravityPoints(currentSg)) * volumeL) / (p - t * dv);
  return { grams: kg * 1000, finalVolumeL: volumeL + kg * dv };
}

/** Densité actuelle estimée à partir de la densité initiale (SG) et du °Brix lu, pour un réfractomètre. */
export function refractometerFg(og: number, currentBrix: number, wortCorrectionFactor = 1.04): number {
  return refractometerFinalGravity(sgToPlato(og) * wortCorrectionFactor, currentBrix, wortCorrectionFactor);
}

/**
 * Densité initiale (SG) retrouvée à partir de la densité lue au densimètre et du °Brix lu au réfractomètre
 * sur la même bière en cours ou en fin de fermentation : on inverse la formule de refractometerFinalGravity
 * (recherche par dichotomie du Brix initial). Retourne null si les deux lectures sont incohérentes.
 */
export function originalGravityFromReadings(
  hydrometerSg: number, currentBrix: number, wortCorrectionFactor = 1.04,
): { og: number; originalBrix: number } | null {
  const g = (ob: number) => refractometerFinalGravity(ob, currentBrix, wortCorrectionFactor) - hydrometerSg;
  let lo = currentBrix, hi = 45;
  if (!(g(lo) >= 0) || !(g(hi) <= 0)) return null;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) lo = mid; else hi = mid;
  }
  const originalBrix = (lo + hi) / 2;
  return { og: platoToSg(originalBrix / wortCorrectionFactor), originalBrix };
}
