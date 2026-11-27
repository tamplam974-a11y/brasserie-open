/** Réglages de calcul communs à toutes les recettes (calibrage de l’amertume), mémorisés dans le navigateur. */

export type GravityMode = 'og' | 'mean' | 'pre';
export interface Settings { pelletPct: number; fwhPct: number; gravityMode: GravityMode }

/** Réglage par défaut : calé sur BeerSmith (premier moût +10 %, pas de bonus granulés, densité d’ébullition = densité initiale). */
export const DEFAULT_SETTINGS: Settings = { pelletPct: 0, fwhPct: 10, gravityMode: 'og' };

/** Réglages approchant d’autres logiciels, ajustés sur UNE seule recette comparée : à prendre comme des ordres de grandeur. */
export const PRESETS: { id: string; label: string; settings: Settings }[] = [
  { id: 'beersmith', label: 'BeerSmith (défaut)', settings: DEFAULT_SETTINGS },
  { id: 'littlebock', label: 'Little Bock (approx.)', settings: { pelletPct: 10, fwhPct: 25, gravityMode: 'og' } },
  { id: 'brewfather', label: 'Brewfather (approx.)', settings: { pelletPct: 15, fwhPct: 0, gravityMode: 'pre' } },
];

const KEY = 'brasserie-open:reglages';
export const settings: Settings = { ...DEFAULT_SETTINGS };

const clamp = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** Modifie les réglages (valeurs bornées) ; `persist` à false pour un essai sans mémorisation. */
export function setSettings(next: Partial<Settings>, persist = true): void {
  settings.pelletPct = clamp(next.pelletPct, 0, 30, settings.pelletPct);
  settings.fwhPct = clamp(next.fwhPct, 0, 50, settings.fwhPct);
  if (next.gravityMode === 'og' || next.gravityMode === 'mean' || next.gravityMode === 'pre') settings.gravityMode = next.gravityMode;
  if (!persist) return;
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* stockage indisponible */ }
}

export const matchPreset = (s: Settings): string =>
  PRESETS.find((p) => p.settings.pelletPct === s.pelletPct && p.settings.fwhPct === s.fwhPct && p.settings.gravityMode === s.gravityMode)?.id ?? 'custom';

try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
  if (saved && typeof saved === 'object') setSettings(saved, false);
} catch { /* réglages illisibles : valeurs par défaut */ }
