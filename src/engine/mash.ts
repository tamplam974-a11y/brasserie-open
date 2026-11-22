/** Eaux d’empâtage et de rinçage. Volumes en L, masses en kg, températures en °C. */

export interface MashInput {
  grainKg: number;
  ratioLPerKg: number;
  absorptionLPerKg: number;
  evapLPerH: number;
  boilMin: number;
  /** Pertes avant la mise en fermenteur (trub, fond de cuve). */
  lossL: number;
  /** Volume voulu dans le fermenteur. */
  batchL: number;
}

export interface MashWater {
  strikeL: number;
  firstRunningsL: number;
  evaporationL: number;
  preBoilL: number;
  spargeL: number;
}

export function mashWater(i: MashInput): MashWater {
  const strikeL = i.grainKg * i.ratioLPerKg;
  const firstRunningsL = strikeL - i.grainKg * i.absorptionLPerKg;
  const evaporationL = (i.evapLPerH * i.boilMin) / 60;
  const preBoilL = i.batchL + i.lossL + evaporationL;
  return { strikeL, firstRunningsL, evaporationL, preBoilL, spargeL: Math.max(0, preBoilL - firstRunningsL) };
}

/** Température de l’eau d’empâtage (formule classique, ratio en L/kg, constante 0,41). */
export function strikeTemperature(targetC: number, grainTempC: number, ratioLPerKg: number): number {
  return (0.41 / ratioLPerKg) * (targetC - grainTempC) + targetC;
}
