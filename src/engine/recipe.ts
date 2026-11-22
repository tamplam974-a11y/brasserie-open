/** Calcul d’une recette complète : DI, DF, alcool, IBU, couleur. Volumes en L, masses en kg/g. */
import { abvSimple, apparentAttenuation } from './gravity';
import { hopstandEquivalentMinutes, ibuForAddition, type HopAddition } from './bitterness';
import { srmMorey, srmToEbc } from './color';

/** Points de densité x litres par kg pour un extrait de 100 % (saccharose). */
const POINTS_L_PER_KG = 384.6;

/** Bonus d’utilisation du houblonnage du premier moût (FWH) par rapport à la même durée d’ébullition. Approximation courante (+10 %), à valider. */
export const FWH_FACTOR = 1.1;

export interface RecipeMalt { kg: number; extractPct: number; ebc: number }
/** dryHop : 0 IBU. tempC : température de l’addition (100 °C en ébullition ; plus bas pour un hopstand ou une altitude élevée). */
export interface RecipeHop extends HopAddition { dryHop?: boolean; tempC?: number; fwh?: boolean }
export interface RecipeInput {
  volumeL: number;
  efficiencyPct: number;
  malts: RecipeMalt[];
  hops: RecipeHop[];
  yeastAttenuationPct: number;
}
export interface RecipeResult {
  og: number; fg: number; abv: number; attenuationPct: number;
  ibu: number; ebc: number; srm: number; buGu: number;
  /** IBU de chaque ligne de houblon, dans l’ordre de la recette. */
  hopIbu: number[];
}

/** EBC vers degrés Lovibond (conversion de Daniels). */
const ebcToLovibond = (ebc: number) => (ebc / 1.97 + 0.76) / 1.3546;

export function calcRecipe(r: RecipeInput): RecipeResult {
  const points = r.malts.reduce(
    (s, m) => s + (m.kg * (m.extractPct / 100) * POINTS_L_PER_KG * (r.efficiencyPct / 100)) / r.volumeL, 0);
  const og = 1 + points / 1000;
  const fg = 1 + ((og - 1) * (100 - r.yeastAttenuationPct)) / 100;
  // Simplification : la densité d’ébullition est assimilée à la DI.
  const hopIbu = r.hops.map((h) =>
    h.dryHop ? 0 : ibuForAddition(
      h.tempC === undefined ? h
        : { ...h, boilTimeMin: hopstandEquivalentMinutes(h.boilTimeMin, h.tempC) },
      r.volumeL, og) * (h.fwh ? FWH_FACTOR : 1));
  const ibu = hopIbu.reduce((t, x) => t + x, 0);;
  const srm = srmMorey(r.malts.map((m) => ({ kg: m.kg, lovibond: ebcToLovibond(m.ebc) })), r.volumeL);
  return {
    og, fg, abv: abvSimple(og, fg), attenuationPct: apparentAttenuation(og, fg),
    ibu, ebc: srmToEbc(srm), srm, buGu: points > 0 ? ibu / points : 0, hopIbu,
  };
}
