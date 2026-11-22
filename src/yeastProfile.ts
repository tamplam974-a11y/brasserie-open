/** Profil aromatique estimé d’une levure (0 à 5), déduit de son nom et de son type. Indicatif. */

export const YEAST_FAMILIES = [
  'neutre', 'fruits tropicaux', 'fruits à noyau', 'banane', 'clou de girofle', 'poivre / épicé', 'acide', 'alcoolisé', 'funk / brett',
] as const;
export type YeastFamily = (typeof YEAST_FAMILIES)[number];
export const YEAST_COLORS: string[] = ['#7f95ad', '#f07a2b', '#e98f6b', '#d9a500', '#9b4d2c', '#c0622e', '#8fb82f', '#b34a8a', '#7d7a3c'];

type Profile = Partial<Record<YeastFamily, number>>;
const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Règles testées dans l’ordre : la première qui correspond au nom l’emporte. */
const RULES: [RegExp, Profile][] = [
  [/kveik/, { 'fruits tropicaux': 3, 'fruits à noyau': 2, neutre: 2 }],
  [/roeselare|lambic|sour|brett/, { acide: 4, 'funk / brett': 4, 'fruits à noyau': 1 }],
  [/saison|3711|3724|wlp566|wlp568|diastaticus/, { 'poivre / épicé': 4, 'fruits à noyau': 2, 'fruits tropicaux': 1, alcoolisé: 1 }],
  [/weizen|hefe|weihenstephan|wb-?06|munich classic|3068|wlp300|wlp320/, { banane: 4, 'clou de girofle': 3 }],
  [/\bwit\b|witbier|3944|wlp400|3942/, { 'poivre / épicé': 3, 'clou de girofle': 2, banane: 1, 'fruits à noyau': 1 }],
  [/belge|belgian|abbaye|abbey|trappist|3787|1214|wlp500|wlp530|wlp550|wlp570|wlp575/, { 'fruits à noyau': 3, 'poivre / épicé': 3, banane: 1, alcoolisé: 2 }],
  [/verdant|new england|1318|london ale iii|wlp066|wlp095/, { 'fruits à noyau': 3, 'fruits tropicaux': 2, neutre: 2 }],
  [/english|anglaise|s-?04|1968|1469|1098|wlp002|wlp005|windsor|london esb/, { 'fruits à noyau': 3, neutre: 2 }],
  [/kolsch|koln|k-?97|wlp029/, { neutre: 3, 'fruits à noyau': 1 }],
  [/lager|2124|2206|wlp8\d\d|diamond|w-?34/, { neutre: 5 }],
  [/american|americaine|us-?05|bry-?97|nottingham|1056|1272|wlp001|wlp008|california|west coast/, { neutre: 4 }],
];

export interface YeastLike { name: string; lager?: boolean }

/** Valeurs dans l’ordre de YEAST_FAMILIES. */
export function yeastProfile(y: YeastLike): number[] {
  const n = plain(y.name);
  const rule = RULES.find(([re]) => re.test(n));
  const p: Profile = rule ? rule[1] : y.lager ? { neutre: 5 } : { neutre: 3 };
  return YEAST_FAMILIES.map((f) => p[f] ?? 0);
}
