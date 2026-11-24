/** Lecture de catalogues d’ingrédients au format CSV (séparateur ; , ou tabulation, décimale avec virgule ou point). */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const first = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); out.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

/** Nombre avec virgule ou point, « % » toléré ; une fourchette (« 75-80 ») donne sa moyenne. */
export function toNum(s: string): number {
  const t = s.replace('%', '').replace(/\s+/g, '');
  const f = (x: string) => parseFloat(x.replace(',', '.'));
  const m = /^(\d+(?:[.,]\d+)?)[-–](\d+(?:[.,]\d+)?)$/.exec(t);
  return m ? (f(m[1]) + f(m[2])) / 2 : f(t);
}

type Field = 'name' | 'brand' | 'ebc' | 'extract' | 'att' | 'temp' | 'type' | 'alpha' | 'aroma'
  | 'id' | 'ogmin' | 'ogmax' | 'fgmin' | 'fgmax' | 'ibumin' | 'ibumax' | 'srmmin' | 'srmmax' | 'ebcmin' | 'ebcmax' | 'abvmin' | 'abvmax';
const SYN: Record<Field, string[]> = {
  name: ['nom', 'name', 'style', 'produit', 'product', 'malt', 'levure', 'yeast', 'houblon', 'hop', 'variete', 'variety'],
  brand: ['marque', 'brand', 'fabricant', 'supplier', 'maltster', 'fournisseur', 'producteur', 'laboratoire', 'malterie'],
  ebc: ['ebc', 'couleur', 'color', 'colour'],
  extract: ['extrait', 'extract', 'yield', 'rendement'],
  att: ['attenuation', 'attenuationpct', 'att', 'attenuationapparente'],
  temp: ['temperature', 'temp', 'tempc', 'temperaturefermentation', 'fermentation'],
  type: ['type', 'kind'],
  alpha: ['alpha', 'aa', 'alphaacides', 'alphaacide', 'alphaacids', 'alphaacid'],
  aroma: ['aromes', 'arome', 'aroma', 'aromas', 'profil'],
  id: ['id', 'numero', 'num', 'code', 'categorie', 'category'],
  ogmin: ['ogmin', 'dimin', 'densiteinitialemin'], ogmax: ['ogmax', 'dimax', 'densiteinitialemax'],
  fgmin: ['fgmin', 'dfmin', 'densitefinalemin'], fgmax: ['fgmax', 'dfmax', 'densitefinalemax'],
  ibumin: ['ibumin', 'amertumemin'], ibumax: ['ibumax', 'amertumemax'],
  srmmin: ['srmmin'], srmmax: ['srmmax'], ebcmin: ['ebcmin', 'couleurmin'], ebcmax: ['ebcmax', 'couleurmax'],
  abvmin: ['abvmin', 'alcoolmin', 'alcmin'], abvmax: ['abvmax', 'alcoolmax', 'alcmax'],
};

/** Lignes du fichier sous forme d’objets ; sans en-tête reconnu, les colonnes sont lues dans l’ordre donné. */
function table(text: string, order: Field[]): { rec: Record<Field, string>; line: number }[] {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  if (!rows.length) return [];
  const head = rows[0].map(norm);
  const idx = new Map<Field, number>();
  for (const f of order) { const i = head.findIndex((h) => SYN[f].includes(h)); if (i >= 0) idx.set(f, i); }
  // En-têtes avec précision (« Couleur (EBC) », « Extrait % ») : on accepte un début de nom connu, avec une liste réduite pour le nom du produit.
  for (const f of order) {
    if (idx.has(f)) continue;
    const taken = new Set(idx.values());
    // pour le nom du produit, « malt » ou « hop » ne comptent pas (risque de confusion avec « Malterie »)
    const syns = f === 'name' ? ['nom', 'name', 'produit', 'product', 'variete', 'variety'] : SYN[f];
    const i = head.findIndex((h, k) => !taken.has(k) && syns.some((x) => x.length >= 3 && h.startsWith(x)));
    if (i >= 0) idx.set(f, i);
  }
  const header = idx.has('name');
  if (!header) order.forEach((f, i) => idx.set(f, i));
  return rows.slice(header ? 1 : 0).map((r, k) => ({
    line: k + (header ? 2 : 1),
    rec: Object.fromEntries(order.map((f) => [f, (r[idx.get(f) ?? -1] ?? '').trim()])) as Record<Field, string>,
  }));
}

export interface Parsed<T> { rows: T[]; errors: string[] }

export function parseMalts(text: string): Parsed<{ name: string; brand: string; ebc: number; extractPct: number }> {
  const out: Parsed<{ name: string; brand: string; ebc: number; extractPct: number }> = { rows: [], errors: [] };
  for (const { rec, line } of table(text, ['name', 'brand', 'ebc', 'extract'])) {
    const ebc = toNum(rec.ebc), extractPct = toNum(rec.extract);
    if (!rec.name) out.errors.push(`ligne ${line} : nom manquant`);
    else if (!(ebc >= 0)) out.errors.push(`ligne ${line} : couleur EBC invalide (${rec.name})`);
    else if (!(extractPct >= 50 && extractPct <= 100)) out.errors.push(`ligne ${line} : extrait invalide (${rec.name})`);
    else out.rows.push({ name: rec.name, brand: rec.brand || 'Importé', ebc, extractPct });
  }
  return out;
}

export function parseYeasts(text: string): Parsed<{ name: string; brand: string; attenuationPct: number; tempC: string; lager: boolean }> {
  const out: Parsed<{ name: string; brand: string; attenuationPct: number; tempC: string; lager: boolean }> = { rows: [], errors: [] };
  for (const { rec, line } of table(text, ['name', 'brand', 'att', 'temp', 'type'])) {
    const attenuationPct = toNum(rec.att);
    if (!rec.name) out.errors.push(`ligne ${line} : nom manquant`);
    else if (!(attenuationPct >= 30 && attenuationPct <= 100)) out.errors.push(`ligne ${line} : atténuation invalide (${rec.name})`);
    else out.rows.push({ name: rec.name, brand: rec.brand || 'Importé', attenuationPct, tempC: rec.temp, lager: /lager|basse/i.test(rec.type) });
  }
  return out;
}

export function parseHops(text: string): Parsed<{ name: string; brand: string; aa: number; aroma: string }> {
  const out: Parsed<{ name: string; brand: string; aa: number; aroma: string }> = { rows: [], errors: [] };
  for (const { rec, line } of table(text, ['name', 'brand', 'alpha', 'aroma'])) {
    const aa = toNum(rec.alpha);
    if (!rec.name) out.errors.push(`ligne ${line} : nom manquant`);
    else if (!(aa >= 0.5 && aa <= 40)) out.errors.push(`ligne ${line} : alpha-acides invalides (${rec.name})`);
    else out.rows.push({ name: rec.name, brand: rec.brand || 'Importé', aa, aroma: rec.aroma });
  }
  return out;
}

export interface StyleIn { id: string; name: string; og: [number, number]; fg: [number, number]; ibu: [number, number]; srm: [number, number]; abv: [number, number] }

/** Styles au format id, nom, og, fg, ibu, srm (ou ebc), abv (min puis max). Sans en-tête, les colonnes sont lues dans cet ordre. */
export function parseStyles(text: string): Parsed<StyleIn> {
  const out: Parsed<StyleIn> = { rows: [], errors: [] };
  const order: Field[] = ['id', 'name', 'ogmin', 'ogmax', 'fgmin', 'fgmax', 'ibumin', 'ibumax', 'srmmin', 'srmmax', 'abvmin', 'abvmax', 'ebcmin', 'ebcmax'];
  const r1 = (x: number) => Math.round(x * 10) / 10;
  for (const { rec, line } of table(text, order)) {
    const n = (k: Field) => toNum(rec[k]);
    const srm: [number, number] = Number.isFinite(n('srmmin')) && Number.isFinite(n('srmmax'))
      ? [n('srmmin'), n('srmmax')] : [r1(n('ebcmin') / 1.97), r1(n('ebcmax') / 1.97)];
    const checks: [string, [number, number], number, number][] = [
      ['DI', [n('ogmin'), n('ogmax')], 1, 1.2], ['DF', [n('fgmin'), n('fgmax')], 0.98, 1.1], ['IBU', [n('ibumin'), n('ibumax')], 0, 200],
      ['couleur', srm, 0, 100], ['alcool', [n('abvmin'), n('abvmax')], 0, 25],
    ];
    if (!rec.id || !rec.name) { out.errors.push(`ligne ${line} : numéro ou nom manquant`); continue; }
    const bad = checks.find(([, [a, b], lo, hi]) => !(Number.isFinite(a) && Number.isFinite(b) && a >= lo && b <= hi && a <= b));
    if (bad) { out.errors.push(`ligne ${line} : ${bad[0]} invalide (${rec.name})`); continue; }
    out.rows.push({ id: rec.id, name: rec.name, og: checks[0][1], fg: checks[1][1], ibu: checks[2][1], srm, abv: checks[4][1] });
  }
  return out;
}

// ---- Export CSV : mêmes colonnes que l’import, pour pouvoir réimporter ailleurs ----
const cell = (v: string | number) => {
  const t = String(v);
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const dec = (n: number) => String(n).replace('.', ',');
const csv = (header: string, rows: (string | number)[][]) => `${[header, ...rows.map((r) => r.map(cell).join(';'))].join('\n')}\n`;

export const maltsToCsv = (xs: { name: string; brand?: string; ebc: number; extractPct: number }[]) =>
  csv('nom;marque;ebc;extrait', xs.map((x) => [x.name, x.brand ?? '', dec(x.ebc), dec(x.extractPct)]));
export const hopsToCsv = (xs: { name: string; brand?: string; aa: number; aroma: string }[]) =>
  csv('nom;marque;alpha;aromes', xs.map((x) => [x.name, x.brand ?? '', dec(x.aa), x.aroma]));
export const yeastsToCsv = (xs: { name: string; brand?: string; attenuationPct: number; tempC: string; lager?: boolean }[]) =>
  csv('nom;marque;attenuation;temperature;type', xs.map((x) => [x.name, x.brand ?? '', dec(x.attenuationPct), x.tempC, x.lager ? 'lager' : 'ale']));
export const stylesToCsv = (xs: StyleIn[]) =>
  csv('id;nom;og_min;og_max;fg_min;fg_max;ibu_min;ibu_max;srm_min;srm_max;abv_min;abv_max',
    xs.map((x) => [x.id, x.name, ...[x.og, x.fg, x.ibu, x.srm, x.abv].flatMap((r) => [dec(r[0]), dec(r[1])])]));
