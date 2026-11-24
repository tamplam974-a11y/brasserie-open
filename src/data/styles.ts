/**
 * Sélection de styles inspirée du BJCP (plages chiffrées uniquement).
 * Valeurs à vérifier sur la source officielle (bjcp.org) avant publication.
 */
export type Range = [number, number];
export interface Style { id: string; name: string; og: Range; fg: Range; ibu: Range; srm: Range; abv: Range; custom?: boolean }

const RAW: Style[] = [
  { id: '5B', name: 'Kölsch', og: [1.044, 1.05], fg: [1.007, 1.011], ibu: [18, 30], srm: [3.5, 5], abv: [4.4, 5.2] },
  { id: '10A', name: 'Weissbier', og: [1.044, 1.053], fg: [1.008, 1.014], ibu: [8, 15], srm: [2, 6], abv: [4.3, 5.6] },
  { id: '18B', name: 'American Pale Ale', og: [1.045, 1.06], fg: [1.01, 1.015], ibu: [30, 50], srm: [5, 10], abv: [4.5, 6.2] },
  { id: '21A', name: 'American IPA', og: [1.056, 1.07], fg: [1.008, 1.014], ibu: [40, 70], srm: [6, 14], abv: [5.5, 7.5] },
  { id: '20A', name: 'American Porter', og: [1.05, 1.07], fg: [1.012, 1.018], ibu: [25, 50], srm: [22, 40], abv: [4.8, 6.5] },
  { id: '20B', name: 'American Stout', og: [1.05, 1.075], fg: [1.01, 1.022], ibu: [35, 75], srm: [30, 40], abv: [5, 7] },
  { id: '24A', name: 'Witbier', og: [1.044, 1.052], fg: [1.008, 1.012], ibu: [8, 20], srm: [2, 4], abv: [4.5, 5.5] },
  { id: '24C', name: 'Belgian Pale Ale', og: [1.048, 1.054], fg: [1.01, 1.014], ibu: [20, 30], srm: [8, 14], abv: [4.8, 5.5] },
  { id: '25B', name: 'Saison', og: [1.048, 1.065], fg: [1.002, 1.008], ibu: [20, 35], srm: [5, 14], abv: [3.5, 9.5] },
  { id: '26A', name: 'Trappist Single', og: [1.044, 1.054], fg: [1.004, 1.01], ibu: [25, 45], srm: [3, 5], abv: [4.8, 6] },
  { id: '17D', name: 'English Barleywine', og: [1.08, 1.12], fg: [1.018, 1.03], ibu: [35, 70], srm: [8, 22], abv: [8, 12] },
  { id: '5D', name: 'German Pils', og: [1.044, 1.05], fg: [1.008, 1.013], ibu: [22, 40], srm: [2, 5], abv: [4.4, 5.2] },
  { id: '1D', name: 'American Wheat Beer', og: [1.04, 1.055], fg: [1.008, 1.013], ibu: [15, 30], srm: [3, 6], abv: [4, 5.5] },
  { id: '27L', name: 'Lichtenhainer (bière historique)', og: [1.032, 1.04], fg: [1.004, 1.008], ibu: [5, 12], srm: [3, 6], abv: [3.5, 4.7] },
  { id: '23A', name: 'Berliner Weisse', og: [1.028, 1.032], fg: [1.003, 1.006], ibu: [3, 8], srm: [2, 3], abv: [2.8, 3.8] },
  { id: '23C', name: 'Oud Bruin', og: [1.04, 1.074], fg: [1.008, 1.012], ibu: [20, 25], srm: [15, 22], abv: [4, 8] },
  { id: '23D', name: 'Lambic', og: [1.04, 1.054], fg: [1.001, 1.01], ibu: [0, 10], srm: [3, 7], abv: [5, 6.5] },
  { id: '20C', name: 'Imperial Stout', og: [1.075, 1.115], fg: [1.018, 1.03], ibu: [50, 90], srm: [30, 40], abv: [8, 12] },
  { id: '19A', name: 'American Amber Ale', og: [1.045, 1.06], fg: [1.01, 1.015], ibu: [25, 40], srm: [10, 17], abv: [4.5, 6.2] },
  { id: '26B', name: 'Belgian Dubbel', og: [1.062, 1.075], fg: [1.008, 1.018], ibu: [15, 25], srm: [10, 17], abv: [6, 7.6] },
  { id: '26C', name: 'Belgian Tripel', og: [1.075, 1.085], fg: [1.008, 1.014], ibu: [20, 40], srm: [4.5, 7], abv: [7.5, 9.5] },
  { id: '26D', name: 'Belgian Dark Strong Ale', og: [1.075, 1.115], fg: [1.01, 1.024], ibu: [20, 35], srm: [12, 22], abv: [8, 12] },
  { id: '25A', name: 'Belgian Blond Ale', og: [1.062, 1.075], fg: [1.008, 1.018], ibu: [15, 30], srm: [4, 6], abv: [6, 7.5] },
  { id: '15A', name: 'Irish Red Ale', og: [1.036, 1.046], fg: [1.01, 1.014], ibu: [18, 28], srm: [9, 14], abv: [3.8, 5] },
  { id: '16D', name: 'Foreign Extra Stout', og: [1.056, 1.075], fg: [1.01, 1.018], ibu: [50, 70], srm: [30, 40], abv: [6.3, 8] },
  { id: '13B', name: 'British Brown Ale', og: [1.04, 1.052], fg: [1.008, 1.013], ibu: [20, 30], srm: [12, 22], abv: [4.2, 5.9] },
  { id: '17C', name: 'Wee Heavy (Strong Scotch Ale)', og: [1.07, 1.13], fg: [1.018, 1.04], ibu: [17, 35], srm: [14, 25], abv: [6.5, 10] },
  { id: '6B', name: 'Rauchbier', og: [1.05, 1.057], fg: [1.012, 1.016], ibu: [20, 30], srm: [12, 22], abv: [4.8, 6] },
  { id: '23B', name: 'Flanders Red Ale', og: [1.048, 1.057], fg: [1.002, 1.012], ibu: [10, 25], srm: [10, 16], abv: [4.6, 6.5] },
  { id: '21B-BE', name: 'Belgian IPA (21B)', og: [1.058, 1.08], fg: [1.008, 1.016], ibu: [50, 100], srm: [5, 15], abv: [6.2, 9.5] },
  { id: '21B-BK', name: 'Black IPA (21B)', og: [1.05, 1.085], fg: [1.01, 1.018], ibu: [50, 90], srm: [25, 40], abv: [5.5, 9] },
  { id: '21B-RY', name: 'Rye IPA (21B)', og: [1.056, 1.075], fg: [1.008, 1.014], ibu: [50, 75], srm: [6, 14], abv: [5.5, 8] },
  { id: 'BRAG', name: 'Braggot (indicatif)', og: [1.06, 1.12], fg: [1.01, 1.03], ibu: [10, 35], srm: [5, 25], abv: [6, 12] },
  { id: '22C', name: 'American Barleywine', og: [1.08, 1.12], fg: [1.016, 1.03], ibu: [50, 100], srm: [10, 19], abv: [8, 12] },
];

const KEY = 'brasserie-open:styles';
let custom: Style[] = [];

/** Liste vivante : styles de départ (sauf ceux remplacés) + styles personnalisés, triée par numéro. */
export const STYLES: Style[] = [];

function rebuild(): void {
  const ids = new Set(custom.map((c) => c.id.toLowerCase()));
  STYLES.splice(0, STYLES.length, ...RAW.filter((x) => !ids.has(x.id.toLowerCase())), ...custom);
  STYLES.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}

function persist(): void {
  try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch { /* stockage indisponible */ }
}

function load(): void {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Style[];
    const okRange = (r: unknown) => Array.isArray(r) && r.length === 2 && r.every((x) => Number.isFinite(x));
    custom = (Array.isArray(raw) ? raw : [])
      .filter((x) => typeof x?.id === 'string' && typeof x.name === 'string' && [x.og, x.fg, x.ibu, x.srm, x.abv].every(okRange))
      .map((x) => ({ id: x.id, name: x.name, og: x.og, fg: x.fg, ibu: x.ibu, srm: x.srm, abv: x.abv, custom: true }));
  } catch { custom = []; }
}
load();
rebuild();

export type StyleIn = Omit<Style, 'custom'>;

/** Ajoute des styles ; un numéro déjà présent (de départ ou personnalisé) est remplacé. */
export function upsertStyles(rows: StyleIn[]): { added: number; replaced: number } {
  let added = 0, replaced = 0;
  for (const r of rows) {
    const key = r.id.toLowerCase();
    if (STYLES.some((x) => x.id.toLowerCase() === key)) replaced++; else added++;
    custom = custom.filter((c) => c.id.toLowerCase() !== key);
    custom.push({ ...r, custom: true });
    rebuild();
  }
  persist();
  return { added, replaced };
}

/** Supprime un style personnalisé (le style de départ de même numéro, s’il existe, réapparaît). */
export function removeStyle(id: string): void {
  custom = custom.filter((c) => c.id !== id);
  rebuild();
  persist();
}
