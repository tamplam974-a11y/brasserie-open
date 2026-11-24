/** Sauvegarde complète des données (recettes, ingrédients et styles personnalisés, relevés) pour les déplacer d’un navigateur à l’autre. */

export const KEYS = {
  library: 'brasserie-open:bibliotheque',
  ingredients: 'brasserie-open:ingredients',
  styles: 'brasserie-open:styles',
  hydrometer: 'brasserie-open:densimetre',
} as const;
/** Date (en millisecondes) du dernier export complet, mémorisée pour le rappel en bas de page. */
export const LAST_BACKUP_KEY = 'brasserie-open:derniere-sauvegarde';
type Name = keyof typeof KEYS;

export interface Store { read: (key: string) => string | null; write: (key: string, value: string) => void }
export interface Backup { app: 'brasserie-open'; version: 1; created: string; data: Partial<Record<Name, unknown>> }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const arr = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? (x as Record<string, unknown>[]) : []);
const obj = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {});

export function makeBackup(read: Store['read'], now = new Date()): Backup {
  const data: Backup['data'] = {};
  for (const [name, key] of Object.entries(KEYS) as [Name, string][]) {
    const raw = read(key);
    if (!raw) continue;
    try { data[name] = JSON.parse(raw); } catch { /* valeur illisible : ignorée */ }
  }
  return { app: 'brasserie-open', version: 1, created: now.toISOString(), data };
}

export function isBackup(x: unknown): x is Backup {
  const o = obj(x);
  return o.app === 'brasserie-open' && !!o.data && typeof o.data === 'object';
}

export function summarize(b: Backup) {
  const ing = obj(b.data.ingredients);
  return {
    recipes: arr(obj(b.data.library).items).length,
    malts: arr(ing.malts).length, hops: arr(ing.hops).length, yeasts: arr(ing.yeasts).length,
    styles: arr(b.data.styles).length, readings: arr(b.data.hydrometer).length,
  };
}

function mergeLibrary(a: unknown, b: unknown) {
  const A = obj(a), B = obj(b);
  const items = [...arr(A.items)];
  for (const it of arr(B.items)) {
    if (typeof it.id !== 'string') continue;
    const same = items.find((x) => x.id === it.id);
    if (same && JSON.stringify(same.data) === JSON.stringify(it.data)) continue;
    if (!same) { items.push(it); continue; }
    const data = obj(it.data);
    items.push({ id: `${it.id}-${Math.random().toString(36).slice(2, 6)}`, data: { ...data, name: `${String(data.name ?? 'Recette')} (importée)` } });
  }
  return { current: typeof A.current === 'string' ? A.current : (items[0]?.id ?? ''), items };
}

function mergeIngredients(a: unknown, b: unknown) {
  const A = obj(a), B = obj(b);
  const merge = (x: unknown, y: unknown) => {
    const out = [...arr(x)];
    for (const it of arr(y)) {
      if (typeof it.id !== 'string' || typeof it.name !== 'string') continue;
      const name = norm(it.name), brand = norm(String(it.brand ?? ''));
      const dup = out.some((o) => o.id === it.id || (norm(String(o.name)) === name && norm(String(o.brand ?? '')) === brand));
      if (!dup) out.push(it);
    }
    return out;
  };
  const rep = (k: string) => [...new Set([...(obj(A.replaced)[k] as string[] ?? []), ...(obj(B.replaced)[k] as string[] ?? [])])];
  return {
    malts: merge(A.malts, B.malts), hops: merge(A.hops, B.hops), yeasts: merge(A.yeasts, B.yeasts),
    replaced: { malts: rep('malts'), hops: rep('hops'), yeasts: rep('yeasts') },
  };
}

function mergeStyles(a: unknown, b: unknown) {
  const out = [...arr(a)];
  for (const s of arr(b)) {
    const id = String(s.id).toLowerCase();
    if (typeof s.id === 'string' && !out.some((o) => String(o.id).toLowerCase() === id)) out.push(s);
  }
  return out;
}

function mergeReadings(a: unknown, b: unknown) {
  const byTime = new Map<number, Record<string, unknown>>();
  for (const r of [...arr(a), ...arr(b)]) if (typeof r.t === 'number') byTime.set(r.t, r);
  return [...byTime.values()].sort((x, y) => (x.t as number) - (y.t as number));
}

/** « replace » écrase les données présentes dans la sauvegarde ; « merge » y ajoute seulement ce qui manque. */
export function applyBackup(b: Backup, mode: 'merge' | 'replace', store: Store): void {
  const current = (key: string): unknown => { try { const r = store.read(key); return r ? JSON.parse(r) : undefined; } catch { return undefined; } };
  const put = (key: string, v: unknown) => store.write(key, JSON.stringify(v));
  const d = b.data;
  if (mode === 'replace') {
    for (const [name, key] of Object.entries(KEYS) as [Name, string][]) if (d[name] !== undefined) put(key, d[name]);
    return;
  }
  if (d.library !== undefined) put(KEYS.library, mergeLibrary(current(KEYS.library), d.library));
  if (d.ingredients !== undefined) put(KEYS.ingredients, mergeIngredients(current(KEYS.ingredients), d.ingredients));
  if (d.styles !== undefined) put(KEYS.styles, mergeStyles(current(KEYS.styles), d.styles));
  if (d.hydrometer !== undefined) put(KEYS.hydrometer, mergeReadings(current(KEYS.hydrometer), d.hydrometer));
}
