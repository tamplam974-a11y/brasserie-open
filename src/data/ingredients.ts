/** Valeurs typiques génériques, à ajuster selon la fiche technique de votre fournisseur. */
export interface Malt { id: string; name: string; extractPct: number; ebc: number; brand?: string; custom?: boolean }
export interface Hop { id: string; name: string; aa: number; aroma: string; brand?: string; custom?: boolean }
export interface Yeast { id: string; name: string; attenuationPct: number; tempC: string; brand?: string; custom?: boolean; lager?: boolean }

const GEN_MALTS: Malt[] = [
  { id: 'pils', name: 'Pilsner', extractPct: 80, ebc: 3.5 },
  { id: 'pale', name: 'Pale Ale', extractPct: 79, ebc: 6 },
  { id: 'mo', name: 'Maris Otter', extractPct: 80, ebc: 5.5 },
  { id: 'vienna', name: 'Vienna', extractPct: 79, ebc: 8 },
  { id: 'munich', name: 'Munich', extractPct: 78, ebc: 20 },
  { id: 'wheat', name: 'Froment malté', extractPct: 82, ebc: 4 },
  { id: 'carapils', name: 'Carapils / dextrine', extractPct: 74, ebc: 4 },
  { id: 'cara30', name: 'Caramel 30 EBC', extractPct: 75, ebc: 30 },
  { id: 'cara120', name: 'Caramel 120 EBC', extractPct: 74, ebc: 120 },
  { id: 'choc', name: 'Chocolat', extractPct: 65, ebc: 800 },
  { id: 'roast', name: 'Orge torréfiée', extractPct: 60, ebc: 1000 },
  { id: 'oats', name: 'Flocons d’avoine', extractPct: 70, ebc: 3 },
  { id: 'sugar', name: 'Sucre candi blond', extractPct: 100, ebc: 2 },
];

const GEN_HOPS: Hop[] = [
  { id: 'magnum', name: 'Magnum', aa: 13, aroma: 'amertume neutre' },
  { id: 'target', name: 'Target', aa: 10, aroma: 'herbes, résine' },
  { id: 'challenger', name: 'Challenger', aa: 7.5, aroma: 'épices, cèdre' },
  { id: 'ekg', name: 'East Kent Goldings', aa: 5, aroma: 'miel, fleurs' },
  { id: 'fuggles', name: 'Fuggles', aa: 4.5, aroma: 'terre, bois' },
  { id: 'saaz', name: 'Saaz', aa: 3.5, aroma: 'herbes, épices' },
  { id: 'hallertau', name: 'Hallertau Mittelfrüh', aa: 4, aroma: 'floral, épicé' },
  { id: 'styrian', name: 'Styrian Goldings', aa: 4, aroma: 'floral, terre' },
  { id: 'cascade', name: 'Cascade', aa: 6, aroma: 'pamplemousse, fleurs' },
  { id: 'centennial', name: 'Centennial', aa: 9.5, aroma: 'agrumes, fleurs' },
  { id: 'citra', name: 'Citra', aa: 12.5, aroma: 'agrumes, fruits tropicaux' },
  { id: 'mosaic', name: 'Mosaic', aa: 11.5, aroma: 'tropical, baies' },
  { id: 'simcoe', name: 'Simcoe', aa: 13, aroma: 'résine, fruits à noyau' },
  { id: 'amarillo', name: 'Amarillo', aa: 9, aroma: 'orange, fleurs' },
  { id: 'galaxy', name: 'Galaxy', aa: 14, aroma: 'fruit de la passion' },
  { id: 'nelson', name: 'Nelson Sauvin', aa: 12, aroma: 'raisin blanc, groseille' },
];

const GEN_YEASTS: Yeast[] = [
  { id: 'us05', name: 'Ale américaine neutre (type US-05)', attenuationPct: 80, tempC: '15–22' },
  { id: 's04', name: 'Ale anglaise (type S-04)', attenuationPct: 75, tempC: '15–20' },
  { id: 'k97', name: 'Kölsch / ale allemande (type K-97)', attenuationPct: 80, tempC: '15–20' },
  { id: 'wb06', name: 'Blanche / weizen (type WB-06)', attenuationPct: 75, tempC: '18–24' },
  { id: 'belge', name: 'Ale belge d’abbaye', attenuationPct: 80, tempC: '18–26' },
  { id: 'saison', name: 'Saison (type diastaticus)', attenuationPct: 88, tempC: '20–32' },
  { id: 'lager', name: 'Lager (type W-34/70)', attenuationPct: 82, tempC: '10–15' },
  { id: 'kveik', name: 'Kveik', attenuationPct: 78, tempC: '25–38' },
];

const GEN = 'Génériques';
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const maltsOf = (brand: string, rows: [string, number, number][]): Malt[] =>
  rows.map(([n, ebc, extractPct]) => ({ id: slug(`${brand} ${n}`), name: `${brand} ${n}`, brand, ebc, extractPct }));
const yeastsOf = (brand: string, rows: [string, number, string, boolean?][]): Yeast[] =>
  rows.map(([n, attenuationPct, tempC, lager]) => ({ id: slug(`${brand} ${n}`), name: `${brand} ${n}`, brand, attenuationPct, tempC, lager: !!lager }));

/**
 * Catalogues de départ : valeurs INDICATIVES (couleur EBC, extrait %, atténuation %),
 * à vérifier sur la fiche technique du fabricant. Les ingrédients personnalisés se règlent dans l’onglet Ingrédients.
 */
export const MALTS: Malt[] = [
  ...GEN_MALTS.map((x) => ({ ...x, brand: GEN })),
  ...maltsOf('Best Malz', [['Pilsen', 3.5, 81], ['Pale Ale', 6, 80], ['Heidelberg', 4.5, 81], ['Vienna', 8, 80], ['Munich Light', 15, 79], ['Munich Dark', 25, 78], ['Wheat Malt', 4, 82], ['Caramel Pils', 7, 76], ['Caramel Munich I', 90, 75], ['Caramel Munich II', 130, 74], ['Chocolate', 900, 66], ['Black Malt', 1200, 62]]),
  ...maltsOf('Dingemans', [['Pilsen', 3.5, 81], ['Pale Ale', 7, 80], ['Munich', 17, 79], ['Wheat Malt', 4, 82], ['Aromatic', 45, 77], ['Biscuit', 50, 76], ['Special B', 240, 70], ['Debittered Black', 1000, 62]]),
];
const hopsOf = (brand: string, rows: [string, number, string][]): Hop[] =>
  rows.map(([name, aa, aroma]) => ({ id: slug(`${brand} ${name}`), name, brand, aa, aroma }));

/** Alpha-acides indicatifs (milieu de fourchette) : ils varient selon la récolte, ajustez-les dans la recette. */
export const HOPS: Hop[] = [
  ...GEN_HOPS.map((x) => ({ ...x, brand: GEN })),
  ...hopsOf('Houblons américains', [
    ['Columbus', 15, 'résine, terre, agrumes'], ['Chinook', 13, 'pin, pamplemousse, épices'], ['Warrior', 16, 'amérisant neutre'],
    ['Summit', 17, 'amérisant, agrumes'], ['Apollo', 17, 'amérisant, résine'], ['Nugget', 12, 'herbes, résine'],
    ['Willamette', 5, 'terre, fruits, épices'], ['Liberty', 4, 'herbes, épices'], ['Mt. Hood', 5, 'herbes, épices'],
    ['Crystal', 4, 'fleurs, épices'], ['Sterling', 6, 'herbes, épices, agrumes'], ['Ahtanum', 6, 'agrumes, fleurs'],
    ['Azacca', 15, 'mangue, agrumes'], ['Ekuanot', 14, 'agrumes, fruits tropicaux, baies'], ['El Dorado', 15, 'fruits tropicaux, poire'],
    ['Idaho 7', 12, 'agrumes, résine, fruits à noyau'], ['Sabro', 14, 'noix de coco, agrumes'], ['Strata', 12, 'fruits tropicaux, baies'],
    ['Cashmere', 8, 'agrumes, melon'], ['Loral', 11, 'fleurs, agrumes'], ['Comet', 10, 'pamplemousse, herbes'],
    ['Palisade', 7, 'fruits à noyau, herbes'], ['Santiam', 6, 'herbes, épices'], ['Glacier', 5, 'fruits, herbes'],
    ['Bravo', 15, 'amérisant, fruits'], ['Calypso', 14, 'pomme, poire'],
  ]),
  ...hopsOf('Houblons néo-zélandais', [
    ['Motueka', 7, 'citron vert, agrumes'], ['Riwaka', 6, 'pamplemousse, fruit de la passion'], ['Rakau', 10, 'fruits tropicaux, pêche'],
    ['Wai-iti', 3, 'agrumes, pêche'], ['Waimea', 17, 'pin, agrumes'], ['Pacific Jade', 13, 'agrumes, poivre'],
    ['Pacific Gem', 15, 'bois, mûre'], ['Green Bullet', 12, 'résine, herbes'], ['Southern Cross', 13, 'agrumes, épices'],
    ['Kohatu', 6, 'fruits tropicaux, herbes'], ['Moutere', 7, 'fruits tropicaux, agrumes'],
  ]),
];
export const YEASTS: Yeast[] = [
  ...GEN_YEASTS.map((x) => ({ ...x, brand: GEN })),
  ...yeastsOf('Lallemand', [['Nottingham', 80, '14–21'], ['BRY-97', 80, '15–22'], ['Verdant IPA', 80, '18–23'], ['New England', 77, '18–23'], ['Windsor', 70, '15–22'], ['London ESB', 70, '18–22'], ['Köln', 78, '15–20'], ['Abbaye', 80, '17–25'], ['Belle Saison', 92, '20–35'], ['Munich Classic', 75, '17–22'], ['Diamond Lager', 80, '10–15', true], ['Voss Kveik', 78, '25–40']]),
  ...yeastsOf('Wyeast', [['1056 American Ale', 75, '15–22'], ['1272 American Ale II', 74, '16–22'], ['1318 London Ale III', 73, '18–23'], ['1098 British Ale', 74, '18–22'], ['1968 London ESB', 69, '18–22'], ['1469 West Yorkshire', 69, '18–22'], ['3068 Weihenstephan Weizen', 75, '18–24'], ['3944 Belgian Witbier', 74, '16–24'], ['3787 Trappist High Gravity', 76, '18–26'], ['1214 Belgian Abbey', 76, '18–25'], ['3711 French Saison', 80, '18–35'], ['3724 Belgian Saison', 80, '18–32'], ['2124 Bohemian Lager', 71, '9–13', true], ['2206 Bavarian Lager', 75, '8–13', true], ['3763 Roeselare Blend', 80, '18–24'], ['3278 Belgian Lambic Blend', 80, '18–24']]),
  ...yeastsOf('White Labs', [['WLP001 California Ale', 77, '20–23'], ['WLP002 English Ale', 67, '18–20'], ['WLP005 British Ale', 70, '18–21'], ['WLP008 East Coast Ale', 73, '20–23'], ['WLP029 German Ale/Kölsch', 75, '18–21'], ['WLP300 Hefeweizen Ale', 74, '20–22'], ['WLP400 Belgian Wit Ale', 76, '19–23'], ['WLP500 Trappist Ale', 78, '18–22'], ['WLP530 Abbey Ale', 78, '19–22'], ['WLP566 Belgian Saison II', 82, '20–24'], ['WLP800 Pilsner Lager', 75, '10–13', true], ['WLP830 German Lager', 77, '10–13', true]]),
  ...yeastsOf('Kveik', [['Voss', 78, '25–40'], ['Hornindal', 78, '25–40'], ['Ebbegarden', 78, '25–38'], ['Framgarden', 78, '28–38'], ['Stranda', 78, '30–40'], ['Sigmund (Gjernes)', 78, '25–40'], ['Lida', 78, '25–35'], ['Skare', 78, '25–38']]),
];

// ---- ingrédients personnalisés et catalogues importés (mémorisés dans le navigateur) ----
type Kind = 'malts' | 'hops' | 'yeasts';
const CUSTOM_KEY = 'brasserie-open:ingredients';
const CUSTOM = 'Personnalisés';
const cid = () => `c-${Math.random().toString(36).slice(2, 8)}`;
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
/** Marques dont le catalogue indicatif a été remplacé par un import. */
const REPLACED: Record<Kind, Set<string>> = { malts: new Set(), hops: new Set(), yeasts: new Set() };

export function saveCustom(): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify({
      malts: MALTS.filter((x) => x.custom), hops: HOPS.filter((x) => x.custom), yeasts: YEASTS.filter((x) => x.custom),
      replaced: { malts: [...REPLACED.malts], hops: [...REPLACED.hops], yeasts: [...REPLACED.yeasts] },
    }));
  } catch { /* stockage indisponible : les ajouts restent valables jusqu’au rechargement */ }
}

function dropBuiltin(list: { custom?: boolean; brand?: string }[], brands: Set<string>): void {
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].custom && brands.has(list[i].brand ?? '')) list.splice(i, 1);
}

function loadCustom(): void {
  try {
    const o = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '{}') as Record<string, unknown>;
    const arr = (k: string) => (Array.isArray(o[k]) ? (o[k] as Record<string, unknown>[]) : []);
    const ok = (x: Record<string, unknown>, ...nums: string[]) =>
      typeof x?.id === 'string' && typeof x.name === 'string' && nums.every((k) => Number.isFinite(x[k]));
    const brandOf = (x: Record<string, unknown>) => (typeof x.brand === 'string' ? x.brand : CUSTOM);
    const rep = (o.replaced ?? {}) as Record<string, string[]>;
    for (const k of ['malts', 'hops', 'yeasts'] as Kind[]) for (const b of Array.isArray(rep[k]) ? rep[k] : []) REPLACED[k].add(b);
    dropBuiltin(MALTS, REPLACED.malts); dropBuiltin(HOPS, REPLACED.hops); dropBuiltin(YEASTS, REPLACED.yeasts);
    for (const x of arr('malts')) if (ok(x, 'ebc', 'extractPct')) MALTS.push({ ...(x as unknown as Malt), brand: brandOf(x), custom: true });
    for (const x of arr('hops')) if (ok(x, 'aa')) HOPS.push({ ...(x as unknown as Hop), brand: brandOf(x), custom: true });
    for (const x of arr('yeasts')) if (ok(x, 'attenuationPct')) YEASTS.push({ ...(x as unknown as Yeast), brand: brandOf(x), custom: true });
  } catch { /* données illisibles : on ignore */ }
}
loadCustom();

export function addMalt(m: { name: string; ebc: number; extractPct: number }): string {
  const id = cid();
  MALTS.push({ ...m, id, brand: CUSTOM, custom: true });
  saveCustom();
  return id;
}
export function addHop(h: { name: string; aa: number; aroma: string }): string {
  const id = cid();
  HOPS.push({ ...h, id, brand: CUSTOM, custom: true });
  saveCustom();
  return id;
}
export function addYeast(y: { name: string; attenuationPct: number; tempC: string; lager?: boolean }): string {
  const id = cid();
  YEASTS.push({ ...y, id, brand: CUSTOM, custom: true });
  saveCustom();
  return id;
}
export function removeCustom(list: { id: string; custom?: boolean }[], id: string): void {
  const i = list.findIndex((x) => x.id === id && x.custom);
  if (i >= 0) { list.splice(i, 1); saveCustom(); }
}

export interface ImportResult { added: number; updated: number; replaced: string[] }

/**
 * Importe un catalogue. Si une marque importée correspond à une marque du catalogue indicatif
 * (ex. « Best Malz »), tout le catalogue indicatif de cette marque est remplacé par les lignes importées.
 */
function importInto<T extends { id: string; name: string; brand?: string; custom?: boolean }>(
  kind: Kind, list: T[], rows: (Partial<T> & { name: string; brand: string })[],
): ImportResult {
  const res: ImportResult = { added: 0, updated: 0, replaced: [] };
  const builtin = new Map<string, string>();
  for (const x of list) if (!x.custom && x.brand && x.brand !== GEN) builtin.set(norm(x.brand), x.brand);
  const canon = new Map(builtin);
  for (const b of REPLACED[kind]) canon.set(norm(b), b);
  const incoming = new Set(rows.map((r) => norm(r.brand)));
  for (const [n, b] of builtin) {
    if (!incoming.has(n)) continue;
    dropBuiltin(list, new Set([b]));
    REPLACED[kind].add(b);
    res.replaced.push(b);
  }
  for (const r of rows) {
    const brand = canon.get(norm(r.brand)) ?? r.brand;
    const ex = list.find((x) => x.custom && norm(x.name) === norm(r.name) && norm(x.brand ?? '') === norm(brand));
    if (ex) { Object.assign(ex, r, { brand }); res.updated++; }
    else { list.push({ ...r, brand, id: cid(), custom: true } as unknown as T); res.added++; }
  }
  saveCustom();
  return res;
}
export const importMalts = (rows: { name: string; brand: string; ebc: number; extractPct: number }[]) => importInto('malts', MALTS, rows);
export const importHops = (rows: { name: string; brand: string; aa: number; aroma: string }[]) => importInto('hops', HOPS, rows);
export const importYeasts = (rows: { name: string; brand: string; attenuationPct: number; tempC: string; lager: boolean }[]) => importInto('yeasts', YEASTS, rows);

/** Réintègre un ingrédient personnalisé venu d’un autre appareil : même identifiant s’il est libre, sinon celui d’un ingrédient de même nom et marque. */
function restore<T extends { id: string; name: string; brand?: string; custom?: boolean }>(list: T[], item: T): string {
  if (list.some((x) => x.id === item.id)) return item.id;
  const twin = list.find((x) => norm(x.name) === norm(item.name) && norm(x.brand ?? '') === norm(item.brand ?? ''));
  if (twin) return twin.id;
  list.push({ ...item, custom: true });
  saveCustom();
  return item.id;
}
export const restoreMalt = (m: Malt): string => restore(MALTS, m);
export const restoreHop = (h: Hop): string => restore(HOPS, h);
export const restoreYeast = (y: Yeast): string => restore(YEASTS, y);
