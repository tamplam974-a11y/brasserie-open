import { HOPS, MALTS, YEASTS, restoreHop, restoreMalt, restoreYeast } from './data/ingredients';
import { STYLES, upsertStyles } from './data/styles';
import { calcRecipe, mashWater, strikeTemperature, type RecipeResult } from './engine';
import { settings } from './settings';

export interface MaltRow { id: string; kg: string; ebc?: string }
export interface HopRow { id: string; grams: string; aa: string; use: 'boil' | 'fwh' | 'hopstand' | 'dryhop' | 'mash'; min: string; temp: string }
export interface MashStep { name: string; temp: string; min: string }
export interface WaterParams { ratio: string; absorb: string; evap: string; boil: string; loss: string; grainTemp: string }
export interface Notes { before: string; during: string; after: string }
export interface RecipeState {
  name: string; styleId: string; vol: string; eff: string; yeastId: string;
  mrows: MaltRow[]; hrows: HopRow[]; mash: MashStep[]; water: WaterParams; notes: Notes;
}
export interface Library { current: string; items: { id: string; data: RecipeState }[] }

export const USE_DEFAULTS: Record<HopRow['use'], Partial<HopRow>> = {
  boil: { min: '60', temp: '100' }, fwh: { min: '60', temp: '100' }, hopstand: { min: '20', temp: '80' }, dryhop: { min: '0' }, mash: { min: '60', temp: '66' },
};
const USE_LABEL: Record<HopRow['use'], string> = { boil: 'Ébullition', fwh: 'FWH', hopstand: 'Hopstand', dryhop: 'Dry hop', mash: 'Mash hopping' };

const num = (s: string) => parseFloat(String(s).replace(',', '.'));
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
/** Anciens identifiants de styles (corrigés en v0.13). */
const STYLE_ALIAS: Record<string, string> = { '27': '17D' };
export const newId = () => Math.random().toString(36).slice(2, 9);

export function defaultRecipe(name = 'Ma recette'): RecipeState {
  return {
    name, styleId: '21A', vol: '20', eff: '72', yeastId: 'us05',
    mrows: [{ id: 'pale', kg: '5' }, { id: 'cara30', kg: '0,5' }],
    hrows: [
      { id: 'magnum', grams: '15', aa: '13', use: 'boil', min: '60', temp: '100' },
      { id: 'citra', grams: '50', aa: '12,5', use: 'dryhop', min: '0', temp: '80' },
    ],
    mash: [{ name: 'Saccharification', temp: '66', min: '60' }, { name: 'Mash out', temp: '78', min: '10' }],
    water: { ratio: '3', absorb: '1', evap: '3', boil: '60', loss: '1,5', grainTemp: '20' },
    notes: { before: '', during: '', after: '' },
  };
}

/** Rend toute donnée (stockage, fichier importé) utilisable : champs manquants ou inconnus remplacés par défaut. */
export function sanitize(raw: unknown, fallbackName = 'Ma recette'): RecipeState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = defaultRecipe(str(o.name, fallbackName));
  const w = (o.water && typeof o.water === 'object' ? o.water : {}) as Record<string, unknown>;
  return {
    name: d.name,
    styleId: STYLES.some((s) => s.id === (STYLE_ALIAS[String(o.styleId)] ?? o.styleId)) ? (STYLE_ALIAS[String(o.styleId)] ?? (o.styleId as string)) : d.styleId,
    vol: str(o.vol, d.vol),
    eff: str(o.eff, d.eff),
    yeastId: YEASTS.some((y) => y.id === o.yeastId) ? (o.yeastId as string) : d.yeastId,
    mrows: Array.isArray(o.mrows)
      ? (o.mrows as MaltRow[]).filter((r) => MALTS.some((m) => m.id === r?.id)).map((r) => ({ id: r.id, kg: str(r.kg, '1'), ...(typeof r.ebc === 'string' && r.ebc.trim() ? { ebc: r.ebc } : {}) }))
      : d.mrows,
    hrows: Array.isArray(o.hrows)
      ? (o.hrows as HopRow[]).filter((r) => HOPS.some((h) => h.id === r?.id)).map((r) => ({
          id: r.id, grams: str(r.grams, '0'), aa: str(r.aa, '0'),
          use: USE_DEFAULTS[r.use] ? r.use : 'boil', min: str(r.min, '0'), temp: str(r.temp, '80'),
        }))
      : d.hrows,
    mash: Array.isArray(o.mash)
      ? (o.mash as MashStep[]).map((s) => ({ name: str(s?.name, ''), temp: str(s?.temp, ''), min: str(s?.min, '') }))
      : d.mash,
    water: {
      ratio: str(w.ratio, d.water.ratio), absorb: str(w.absorb, d.water.absorb), evap: str(w.evap, d.water.evap),
      boil: str(w.boil, d.water.boil), loss: str(w.loss, d.water.loss), grainTemp: str(w.grainTemp, d.water.grainTemp),
    },
    notes: (() => {
      const n = (o.notes && typeof o.notes === 'object' ? o.notes : {}) as Record<string, unknown>;
      return { before: str(n.before, ''), during: str(n.during, ''), after: str(n.after, '') };
    })(),
  };
}

const LIB_KEY = 'brasserie-open:bibliotheque';
const LEGACY_KEY = 'brasserie-open:recette';

export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (raw) {
      const o = JSON.parse(raw) as { current?: string; items?: { id?: string; data?: unknown }[] };
      const items = (Array.isArray(o.items) ? o.items : []).map((x) => ({ id: str(x?.id, newId()), data: sanitize(x?.data) }));
      if (items.length) return { current: items.some((x) => x.id === o.current) ? (o.current as string) : items[0].id, items };
    }
    const old = localStorage.getItem(LEGACY_KEY); // recette unique des versions précédentes
    if (old) {
      const id = newId();
      return { current: id, items: [{ id, data: sanitize(JSON.parse(old), 'Ma recette') }] };
    }
  } catch {
    /* stockage illisible : on repart d’une bibliothèque neuve */
  }
  const id = newId();
  return { current: id, items: [{ id, data: defaultRecipe() }] };
}

export function saveLibrary(lib: Library): void {
  localStorage.setItem(LIB_KEY, JSON.stringify(lib));
}

export function compute(d: RecipeState): RecipeResult | null {
  const V = num(d.vol), E = num(d.eff);
  if (!(V > 0 && E > 0)) return null;
  const yeast = YEASTS.find((y) => y.id === d.yeastId) ?? YEASTS[0];
  const { water } = computeWater(d);
  const loss = num(d.water.loss);
  const preBoilRatio = water && Number.isFinite(loss) && water.preBoilL > 0 ? Math.min(1, (V + loss) / water.preBoilL) : 1;
  return calcRecipe({
    volumeL: V, efficiencyPct: E, yeastAttenuationPct: yeast.attenuationPct,
    calibration: { pelletPct: settings.pelletPct, fwhPct: settings.fwhPct, gravityMode: settings.gravityMode, preBoilRatio },
    malts: d.mrows.map((m) => {
      const x = MALTS.find((k) => k.id === m.id);
      const ov = num(m.ebc ?? '');
      return { kg: x ? num(m.kg) || 0 : 0, extractPct: x?.extractPct ?? 0, ebc: Number.isFinite(ov) && ov >= 0 ? ov : (x?.ebc ?? 0) };
    }),
    hops: d.hrows.map((h) => ({
      name: h.id, grams: num(h.grams) || 0, alphaAcidPct: num(h.aa) || 0, boilTimeMin: num(h.min) || 0,
      dryHop: h.use === 'dryhop', fwh: h.use === 'fwh', mash: h.use === 'mash',
      tempC: h.use === 'hopstand' ? (Number.isFinite(num(h.temp)) ? num(h.temp) : 0) : undefined,
    })),
  });
}

export function computeWater(d: RecipeState) {
  const kg = d.mrows.reduce((s, m) => s + (num(m.kg) || 0), 0);
  const V = num(d.vol);
  const [ratio, absorb, evap, boil, loss, grain] = [d.water.ratio, d.water.absorb, d.water.evap, d.water.boil, d.water.loss, d.water.grainTemp].map(num);
  const ok = kg > 0 && V > 0 && ratio > 0 && [absorb, evap, boil, loss].every((x) => Number.isFinite(x) && x >= 0);
  const t1 = num(d.mash[0]?.temp ?? '');
  return {
    water: ok ? mashWater({ grainKg: kg, ratioLPerKg: ratio, absorptionLPerKg: absorb, evapLPerH: evap, boilMin: boil, lossL: loss, batchL: V }) : null,
    strikeC: ratio > 0 && Number.isFinite(grain) && Number.isFinite(t1) ? strikeTemperature(t1, grain, ratio) : null,
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const f = (x: number, n = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: n, maximumFractionDigits: n });

/** Fiche de recette HTML autonome. Les données de la recette y sont embarquées pour pouvoir la réimporter. */
export function recipeToHtml(d: RecipeState): string {
  const r = compute(d);
  const { water, strikeC } = computeWater(d);
  const style = STYLES.find((s) => s.id === d.styleId);
  const yeast = YEASTS.find((y) => y.id === d.yeastId);
  const totalKg = d.mrows.reduce((s, m) => s + (num(m.kg) || 0), 0);
  const rows = (cells: string[][]) => cells.map((c) => `<tr>${c.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('');
  const malts = rows(d.mrows.map((m) => {
    const kg = num(m.kg) || 0;
    return [esc(MALTS.find((k) => k.id === m.id)?.name ?? m.id), `${f(kg, 2)} kg`, totalKg > 0 ? `${f((kg / totalKg) * 100)} %` : '–'];
  }));
  const hops = rows(d.hrows.map((h, i) => [
    esc(HOPS.find((k) => k.id === h.id)?.name ?? h.id), `${esc(h.grams)} g`, `${esc(h.aa)} %`,
    USE_LABEL[h.use] + (h.use === 'hopstand' ? ` ${esc(h.temp)} °C` : ''),
    h.use === 'dryhop' ? '–' : `${esc(h.min)} min`, r ? f(r.hopIbu[i] ?? 0) : '–',
  ]));
  const steps = rows(d.mash.map((s) => [esc(s.name), `${esc(s.temp)} °C`, `${esc(s.min)} min`]));
  const bilan = r
    ? rows([['Densité initiale', f(r.og, 3)], ['Densité finale', f(r.fg, 3)], ['Alcool', `${f(r.abv)} %`], ['Amertume', `${f(r.ibu)} IBU`], ['Couleur', `${f(r.ebc, 0)} EBC`]])
    : '';
  const eau = water
    ? rows([['Eau d’empâtage', `${f(water.strikeL)} L${strikeC !== null ? ` à ${f(strikeC, 0)} °C` : ''}`], ['Eau de rinçage', `${f(water.spargeL)} L`], ['Volume pré-ébullition', `${f(water.preBoilL)} L`]])
    : '';
  const labels = ['Avant le brassage', 'Pendant le brassage', 'Après le brassage'];
  const noteBlock = (['before', 'during', 'after'] as const)
    .map((k, i) => (d.notes[k].trim() ? `<h3>${labels[i]}</h3><p style="white-space:pre-wrap">${esc(d.notes[k])}</p>` : ''))
    .join('');
  const json = JSON.stringify({ ...d, customs: usedCustoms(d) }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.name)} – Brasserie Open</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#23272c}h1{margin:0}h2{margin:22px 0 6px;font-size:1.1rem;border-bottom:1px solid #d0d4d9}table{border-collapse:collapse;width:100%}td{padding:4px 8px;border-bottom:1px solid #e3e5e8}small{color:#646c75}@media print{body{margin:0}}</style></head><body>
<h1>${esc(d.name)}</h1>
<small>Style ${esc(style ? `${style.id} – ${style.name}` : d.styleId)} · ${esc(d.vol)} L · rendement ${esc(d.eff)} % · levure : ${esc(yeast?.name ?? d.yeastId)}</small>
${bilan ? `<h2>Bilan</h2><table>${bilan}</table>` : ''}
<h2>Malts</h2><table>${malts}</table>
<h2>Houblons</h2><table>${hops}</table>
<h2>Empâtage</h2><table>${steps}</table>
${eau ? `<h2>Volumes d’eau</h2><table>${eau}</table>` : ''}
${noteBlock ? `<h2>Notes</h2>${noteBlock}` : ''}
<p><small>Fiche générée par Brasserie Open. Calculs indicatifs.</small></p>
<script type="application/json" id="brasserie-open-recette">${json}</script>
</body></html>`;
}

export function parseRecipeHtml(text: string): RecipeState | null {
  try {
    const el = new DOMParser().parseFromString(text, 'text/html').getElementById('brasserie-open-recette');
    return el?.textContent ? sanitize(restoreCustoms(JSON.parse(el.textContent) as Record<string, unknown>)) : null;
  } catch {
    return null;
  }
}

const fmtIn = (x: number, d: number) => String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',');

/** Change le volume et multiplie malts et houblons dans la même proportion (densité et IBU restent les mêmes). */
export function scaleRecipe(d: RecipeState, newVolume: number): RecipeState {
  const old = num(d.vol);
  if (!(old > 0) || !(newVolume > 0)) return d;
  const f = newVolume / old;
  return {
    ...d,
    vol: fmtIn(newVolume, 2),
    mrows: d.mrows.map((m) => ({ ...m, kg: fmtIn((num(m.kg) || 0) * f, 2) })),
    hrows: d.hrows.map((h) => ({ ...h, grams: fmtIn((num(h.grams) || 0) * f, 1) })),
  };
}

/** Texte unique des notes (pour BeerXML), avec des repères pour les retrouver à l’import. */
export function notesToText(n: Notes): string {
  if (!n.before.trim() && !n.during.trim() && !n.after.trim()) return '';
  return `[Avant]\n${n.before}\n[Pendant]\n${n.during}\n[Après]\n${n.after}`;
}

export function notesFromText(text: string): Notes {
  const out: Notes = { before: '', during: '', after: '' };
  const parts = text.split(/^\[(Avant|Pendant|Après)\]\n?/m);
  if (parts.length === 1) return { ...out, before: text.trim() };
  const key: Record<string, keyof Notes> = { Avant: 'before', Pendant: 'during', 'Après': 'after' };
  for (let i = 1; i < parts.length; i += 2) out[key[parts[i]]] = (parts[i + 1] ?? '').replace(/\n$/, '');
  if (parts[0].trim()) out.before = `${parts[0].trim()}\n${out.before}`.trim();
  return out;
}

/** Ingrédients et style personnalisés utilisés par la recette, embarqués dans sa fiche HTML pour qu’elle soit lisible ailleurs. */
function usedCustoms(d: RecipeState) {
  return {
    malts: MALTS.filter((x) => x.custom && d.mrows.some((r) => r.id === x.id)),
    hops: HOPS.filter((x) => x.custom && d.hrows.some((r) => r.id === x.id)),
    yeasts: YEASTS.filter((x) => x.custom && x.id === d.yeastId),
    style: STYLES.filter((x) => x.custom && x.id === d.styleId),
  };
}

const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length < 200;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isRange = (x: unknown): x is [number, number] => Array.isArray(x) && x.length === 2 && x.every(isNum);

/** Recrée les ingrédients et le style personnalisés d’une fiche importée, et corrige les identifiants si un équivalent existe déjà. */
function restoreCustoms(o: Record<string, unknown>): Record<string, unknown> {
  const c = (o.customs && typeof o.customs === 'object' ? o.customs : {}) as Record<string, unknown>;
  const list = (k: string) => (Array.isArray(c[k]) ? (c[k] as Record<string, unknown>[]) : []);
  const map = new Map<string, string>();
  for (const m of list('malts')) {
    if (isStr(m.id) && isStr(m.name) && isNum(m.ebc) && isNum(m.extractPct)) {
      map.set(m.id, restoreMalt({ id: m.id, name: m.name, brand: isStr(m.brand) ? m.brand : undefined, ebc: m.ebc, extractPct: m.extractPct }));
    }
  }
  for (const h of list('hops')) {
    if (isStr(h.id) && isStr(h.name) && isNum(h.aa)) {
      map.set(h.id, restoreHop({ id: h.id, name: h.name, brand: isStr(h.brand) ? h.brand : undefined, aa: h.aa, aroma: typeof h.aroma === 'string' ? h.aroma : '' }));
    }
  }
  for (const y of list('yeasts')) {
    if (isStr(y.id) && isStr(y.name) && isNum(y.attenuationPct)) {
      map.set(y.id, restoreYeast({ id: y.id, name: y.name, brand: isStr(y.brand) ? y.brand : undefined, attenuationPct: y.attenuationPct, tempC: typeof y.tempC === 'string' ? y.tempC : '', lager: y.lager === true }));
    }
  }
  for (const s of list('style')) {
    if (isStr(s.id) && isStr(s.name) && [s.og, s.fg, s.ibu, s.srm, s.abv].every(isRange) && !STYLES.some((x) => x.id === s.id)) {
      upsertStyles([{ id: s.id, name: s.name, og: s.og as [number, number], fg: s.fg as [number, number], ibu: s.ibu as [number, number], srm: s.srm as [number, number], abv: s.abv as [number, number] }]);
    }
  }
  const remap = (id: unknown) => (typeof id === 'string' ? map.get(id) ?? id : id);
  const rows = (x: unknown) => (Array.isArray(x) ? (x as { id?: unknown }[]).map((r) => ({ ...r, id: remap(r?.id) })) : x);
  return { ...o, mrows: rows(o.mrows), hrows: rows(o.hrows), yeastId: remap(o.yeastId) };
}

/** Numéro de recette : le nombre placé au début du nom (« 113 Grape ale » donne 113, « #7 IPA » donne 7), sinon null. */
export function recipeNumber(name: string): number | null {
  const m = /^\s*(?:n°|no\.?|#)?\s*(\d{1,6})(?!\d)/i.exec(name);
  return m ? parseInt(m[1], 10) : null;
}
