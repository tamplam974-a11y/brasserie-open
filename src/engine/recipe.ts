/** Calcul d’une recette complète : DI, DF, alcool, IBU, couleur. Volumes en L, masses en kg/g. */
import { abvSimple, apparentAttenuation } from './gravity';
import { hopstandEquivalentMinutes, ibuForAddition, type HopAddition } from './bitterness';
import { srmMorey, srmToEbc } from './color';

/** Points de densité x litres par kg pour un extrait de 100 % (saccharose). */
const POINTS_L_PER_KG = 384.6;

/** Bonus d’utilisation du houblonnage du premier moût (FWH) par rapport à la même durée d’ébullition. Approximation courante (+10 %), à valider. */
export const FWH_FACTOR = 1.1;

/** Houblons ajoutés à l’empâtage (mash hopping) : amertume ramenée à 20 % de celle du même houblon bouilli aussi longtemps (réglage par défaut de BeerSmith, -80 %). */
export const MASH_FACTOR = 0.2;

export interface RecipeMalt { kg: number; extractPct: number; ebc: number }
/** dryHop : 0 IBU. tempC : température de l’addition (100 °C en ébullition ; plus bas pour un hopstand ou une altitude élevée). */
export interface RecipeHop extends HopAddition { dryHop?: boolean; tempC?: number; fwh?: boolean; mash?: boolean }
/** Réglages de calcul de l’amertume (voir settings.ts). Sans eux : premier moût +10 %, aucun bonus granulés, densité d’ébullition = DI. */
export interface Calibration {
  pelletPct?: number;
  fwhPct?: number;
  gravityMode?: 'og' | 'mean' | 'pre';
  /** Volume de la cuve après ébullition divisé par le volume avant ébullition (sert à estimer la densité avant ébullition). */
  preBoilRatio?: number;
}

export interface RecipeInput {
  volumeL: number;
  efficiencyPct: number;
  malts: RecipeMalt[];
  hops: RecipeHop[];
  yeastAttenuationPct: number;
  calibration?: Calibration;
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
  const cal = r.calibration ?? {};
  const pre = 1 + (og - 1) * (cal.preBoilRatio ?? 1);
  const boilGravity = cal.gravityMode === 'pre' ? pre : cal.gravityMode === 'mean' ? (og + pre) / 2 : og;
  const fwh = cal.fwhPct === undefined ? FWH_FACTOR : 1 + cal.fwhPct / 100;
  const pellet = 1 + (cal.pelletPct ?? 0) / 100;
  const hopIbu = r.hops.map((h) =>
    h.dryHop ? 0 : ibuForAddition(
      h.tempC === undefined ? h
        : { ...h, boilTimeMin: hopstandEquivalentMinutes(h.boilTimeMin, h.tempC) },
      r.volumeL, boilGravity) * (h.fwh ? fwh : 1) * (h.mash ? MASH_FACTOR : 1) * pellet);
  const ibu = hopIbu.reduce((t, x) => t + x, 0);;
  const srm = srmMorey(r.malts.map((m) => ({ kg: m.kg, lovibond: ebcToLovibond(m.ebc) })), r.volumeL);
  return {
    og, fg, abv: abvSimple(og, fg), attenuationPct: apparentAttenuation(og, fg),
    ibu, ebc: srmToEbc(srm), srm, buGu: points > 0 ? ibu / points : 0, hopIbu,
  };
}
