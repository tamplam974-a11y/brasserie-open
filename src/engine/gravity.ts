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
