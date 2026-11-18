/**
 * Couleur de la bière (formule de Morey).
 * Masses en kg, volume en litres.
 */

const LB_PER_KG = 2.20462262;
const GAL_PER_L = 0.264172052;

export interface GrainColor {
  kg: number;
  /** Couleur du malt en degrés Lovibond. */
  lovibond: number;
}

export function mcu(grains: GrainColor[], volumeL: number): number {
  const total = grains.reduce((s, g) => s + g.lovibond * g.kg * LB_PER_KG, 0);
  return total / (volumeL * GAL_PER_L);
}

export function srmMorey(grains: GrainColor[], volumeL: number): number {
  return 1.4922 * Math.pow(mcu(grains, volumeL), 0.6859);
}

export function srmToEbc(srm: number): number {
  return srm * 1.97;
}

export function ebcToSrm(ebc: number): number {
  return ebc / 1.97;
}
