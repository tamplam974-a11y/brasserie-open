/** Stock de malts (en kg) et de houblons (en g) : une ligne par achat, avec retraits et solde. */
import type { RecipeState } from './library';

export interface Lot { id: string; ingredientId: string; name: string; value: string; date: string; initial: string; withdrawn: string }
export interface Stock { malts: Lot[]; hops: Lot[] }
export const STOCK_KEY = 'brasserie-open:stock';

const num = (s: string) => parseFloat(String(s).replace(',', '.'));
const fmtNum = (x: number, d: number) => String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',');
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export const newLot = (): Lot => ({
  id: Math.random().toString(36).slice(2, 9), ingredientId: '', name: '', value: '',
  date: new Date().toISOString().slice(0, 10), initial: '', withdrawn: '',
});

/** Solde d’une ligne : quantité initiale moins retraits. */
export const balance = (l: Lot): number => (num(l.initial) || 0) - (num(l.withdrawn) || 0);

function cleanLots(x: unknown): Lot[] {
  return (Array.isArray(x) ? (x as Record<string, unknown>[]) : [])
    .filter((l) => l && typeof l === 'object' && typeof l.id === 'string')
    .map((l) => ({ id: l.id as string, ingredientId: str(l.ingredientId), name: str(l.name), value: str(l.value), date: str(l.date), initial: str(l.initial), withdrawn: str(l.withdrawn) }));
}

export function loadStock(): Stock {
  try {
    const o = JSON.parse(localStorage.getItem(STOCK_KEY) ?? '{}') as Record<string, unknown>;
    return { malts: cleanLots(o.malts), hops: cleanLots(o.hops) };
  } catch {
    return { malts: [], hops: [] };
  }
}

export function saveStock(s: Stock): void {
  try { localStorage.setItem(STOCK_KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ }
}

export interface Need { ingredientId: string; amount: number }

/**
 * Retire des quantités du stock en commençant par les achats les plus anciens (premier entré, premier sorti).
 * Renvoie de nouvelles lignes (celles d’origine ne sont pas modifiées) et ce qui manque.
 */
export function deduct(lots: Lot[], needs: Need[], decimals: number): { lots: Lot[]; missing: Need[] } {
  const out = lots.map((l) => ({ ...l }));
  const total = new Map<string, number>();
  for (const n of needs) if (n.ingredientId && n.amount > 0) total.set(n.ingredientId, (total.get(n.ingredientId) ?? 0) + n.amount);
  const missing: Need[] = [];
  for (const [id, amount] of total) {
    let rest = amount;
    const mine = out.filter((l) => l.ingredientId === id).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    for (const l of mine) {
      const free = balance(l);
      if (rest <= 0) break;
      if (free <= 0) continue;
      const take = Math.min(free, rest);
      l.withdrawn = fmtNum((num(l.withdrawn) || 0) + take, decimals);
      rest -= take;
    }
    if (rest > 1e-9) missing.push({ ingredientId: id, amount: rest });
  }
  return { lots: out, missing };
}

/** Quantités de malts (kg) et de houblons (g) utilisées par une recette. */
export function needsFromRecipe(d: RecipeState): { malts: Need[]; hops: Need[] } {
  return {
    malts: d.mrows.map((r) => ({ ingredientId: r.id, amount: num(r.kg) || 0 })),
    hops: d.hrows.map((r) => ({ ingredientId: r.id, amount: num(r.grams) || 0 })),
  };
}
