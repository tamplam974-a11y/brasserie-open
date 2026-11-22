/** Profil aromatique d’une recette : association des arômes de houblon par famille (0 à 5, relatif). */

export const FAMILIES = [
  'agrumes', 'fruits tropicaux', 'fruits à noyau', 'fruits rouges', 'résine / pin', 'herbacé', 'floral', 'épicé', 'terre / bois',
] as const;
export type Family = (typeof FAMILIES)[number];
/** Une couleur par famille, dans l’ordre de FAMILIES. */
export const FAMILY_COLORS: string[] = ['#e0a010', '#f07a2b', '#e98f6b', '#cf3f5f', '#3d9a63', '#8bb84a', '#c06ad0', '#c0622e', '#8a6d4b'];

/** Mots-clés par famille, testés dans cet ordre sur chaque descripteur (début de mot, sans accents). */
const KEYWORDS: [Family, string[]][] = [
  ['fruits tropicaux', ['tropica', 'mangue', 'ananas', 'passion', 'coco', 'melon', 'papaye', 'litchi']],
  ['agrumes', ['agrume', 'pamplemousse', 'citron', 'orange', 'mandarine']],
  ['fruits rouges', ['baie', 'mure', 'groseille', 'framboise', 'fraise', 'cassis', 'cerise', 'raisin']],
  ['fruits à noyau', ['noyau', 'peche', 'abricot', 'prune', 'pomme', 'poire', 'fruits']],
  ['résine / pin', ['resine', 'pin', 'sapin']],
  ['herbacé', ['herbe', 'herbac', 'foin']],
  ['floral', ['fleur', 'floral', 'miel', 'rose']],
  ['épicé', ['epice', 'epic', 'poivre', 'menthe']],
  ['terre / bois', ['terre', 'bois', 'cedre', 'tabac']],
];

const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function familyOf(descriptor: string): Family | null {
  const t = plain(descriptor).trim();
  for (const [fam, words] of KEYWORDS) if (words.some((w) => new RegExp(`(^|\\s)${w}`).test(t))) return fam;
  return null;
}

export interface AromaHop { aroma: string; grams: number; use: 'boil' | 'fwh' | 'hopstand' | 'dryhop'; min: number }

/** Poids d’une addition pour l’arôme : le dry hop et le hopstand comptent pleinement, l’ébullition longue très peu. */
export function aromaWeight(h: AromaHop): number {
  if (h.use === 'dryhop' || h.use === 'hopstand') return h.grams;
  if (h.use === 'fwh') return h.grams * 0.15;
  return h.grams * Math.max(0.05, 1 - h.min / 60);
}

/** Valeurs dans l’ordre de FAMILIES, la famille dominante valant 5 (profil relatif). */
export function aromaProfile(hops: AromaHop[]): number[] {
  const sums = new Map<Family, number>();
  for (const h of hops) {
    const fams = h.aroma.split(',').map(familyOf).filter((f): f is Family => f !== null);
    const w = aromaWeight(h);
    for (const f of fams) sums.set(f, (sums.get(f) ?? 0) + w / fams.length);
  }
  const max = Math.max(0, ...sums.values());
  return FAMILIES.map((f) => (max > 0 ? ((sums.get(f) ?? 0) / max) * 5 : 0));
}

/** Poids des descripteurs d’un houblon selon leur rang : le premier cité est le plus marqué. */
const RANK = [1, 0.75, 0.55, 0.4];

/** Profil d’un houblon seul (0 à 5, famille dominante à 5), d’après l’ordre de ses descripteurs. */
export function hopProfile(aroma: string): number[] {
  const sums = new Map<Family, number>();
  aroma.split(',').forEach((t, i) => {
    const f = familyOf(t);
    if (f) sums.set(f, (sums.get(f) ?? 0) + RANK[Math.min(i, RANK.length - 1)]);
  });
  const max = Math.max(0, ...sums.values());
  return FAMILIES.map((f) => (max > 0 ? ((sums.get(f) ?? 0) / max) * 5 : 0));
}

/** Association de plusieurs profils : somme, ramenée à 5 pour la famille dominante. */
export function combineProfiles(profiles: number[][]): number[] {
  const sum = FAMILIES.map((_, i) => profiles.reduce((s, p) => s + (p[i] ?? 0), 0));
  const max = Math.max(0, ...sum);
  return sum.map((v) => (max > 0 ? (v / max) * 5 : 0));
}
