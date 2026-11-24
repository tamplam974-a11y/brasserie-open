/** Export et import BeerXML 1.0. Les ingrédients inconnus à l’import sont créés comme ingrédients personnalisés. */
import { HOPS, MALTS, YEASTS, addHop, addMalt, addYeast } from './data/ingredients';
import { STYLES } from './data/styles';
import { compute, computeWater, defaultRecipe, notesFromText, notesToText, sanitize, type HopRow, type RecipeState } from './library';

const num = (s: string) => parseFloat(String(s).replace(',', '.'));
const esc = (s: string | number) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);
const t = (name: string, v: string | number) => `<${name}>${esc(v)}</${name}>`;
const fix = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '0');
const toLovibond = (ebc: number) => (ebc / 1.97 + 0.76) / 1.3546;
const fromLovibond = (l: number) => (1.3546 * l - 0.76) * 1.97;
const fmtN = (v: number, d = 2) => String(Math.round(v * 10 ** d) / 10 ** d).replace('.', ',');
const USE_OUT: Record<HopRow['use'], string> = { boil: 'Boil', fwh: 'First Wort', hopstand: 'Aroma', dryhop: 'Dry Hop' };
const USE_IN: Record<string, HopRow['use']> = { boil: 'boil', 'first wort': 'fwh', aroma: 'hopstand', 'dry hop': 'dryhop', mash: 'boil' };

function recipeXml(d: RecipeState): string {
  const r = compute(d);
  const { water, strikeC } = computeWater(d);
  const style = STYLES.find((s) => s.id === d.styleId);
  const yeast = YEASTS.find((y) => y.id === d.yeastId) ?? YEASTS[0];
  const ferm = d.mrows.map((m) => {
    const k = MALTS.find((x) => x.id === m.id);
    if (!k) return '';
    const type = k.extractPct >= 100 ? 'Sugar' : k.id === 'oats' ? 'Adjunct' : 'Grain';
    return `<FERMENTABLE>${t('NAME', k.name)}${t('VERSION', 1)}${t('TYPE', type)}${t('AMOUNT', fix(num(m.kg) || 0))}${t('YIELD', fix(k.extractPct, 1))}${t('COLOR', fix(toLovibond(Number.isFinite(num(m.ebc ?? '')) && num(m.ebc ?? '') >= 0 ? num(m.ebc ?? '') : k.ebc), 1))}</FERMENTABLE>`;
  }).join('');
  const hops = d.hrows.map((h) => {
    const k = HOPS.find((x) => x.id === h.id);
    if (!k) return '';
    const time = h.use === 'dryhop' ? '0' : fix(num(h.min) || 0, 0);
    return `<HOP>${t('NAME', k.name)}${t('VERSION', 1)}${t('ALPHA', fix(num(h.aa) || 0, 2))}${t('AMOUNT', fix((num(h.grams) || 0) / 1000))}${t('USE', USE_OUT[h.use])}${t('TIME', time)}${h.use === 'hopstand' ? t('X_TEMP', fix(num(h.temp) || 0, 0)) : ''}</HOP>`;
  }).join('');
  const temps = /(\d+)\D+(\d+)/.exec(yeast.tempC);
  const liquid = yeast.brand === 'Wyeast' || yeast.brand === 'White Labs';
  const yeastXml = `<YEAST>${t('NAME', yeast.name)}${t('VERSION', 1)}${t('TYPE', yeast.lager ? 'Lager' : 'Ale')}${t('FORM', liquid ? 'Liquid' : 'Dry')}${t('AMOUNT', liquid ? '0.1' : '0.011')}${t('ATTENUATION', fix(yeast.attenuationPct, 1))}${temps ? t('MIN_TEMPERATURE', temps[1]) + t('MAX_TEMPERATURE', temps[2]) : ''}</YEAST>`;
  const steps = d.mash.map((s, i) =>
    `<MASH_STEP>${t('NAME', s.name || 'Palier')}${t('VERSION', 1)}${t('TYPE', 'Infusion')}${t('STEP_TEMP', fix(num(s.temp) || 0, 1))}${t('STEP_TIME', fix(num(s.min) || 0, 0))}${i === 0 && water ? t('INFUSE_AMOUNT', fix(water.strikeL, 1)) : ''}</MASH_STEP>`).join('');
  const m = style ? /^(\d+)([A-Za-z]*)$/.exec(style.id) : null;
  const styleXml = style && m
    ? `<STYLE>${t('NAME', style.name)}${t('CATEGORY', style.name)}${t('CATEGORY_NUMBER', m[1])}${t('STYLE_LETTER', m[2] || 'A')}${t('STYLE_GUIDE', 'BJCP')}${t('VERSION', 1)}${t('TYPE', style.id === '5D' ? 'Lager' : 'Ale')}${t('OG_MIN', style.og[0])}${t('OG_MAX', style.og[1])}${t('FG_MIN', style.fg[0])}${t('FG_MAX', style.fg[1])}${t('IBU_MIN', style.ibu[0])}${t('IBU_MAX', style.ibu[1])}${t('COLOR_MIN', style.srm[0])}${t('COLOR_MAX', style.srm[1])}</STYLE>`
    : '';
  const calc = r ? `${t('OG', fix(r.og))}${t('FG', fix(r.fg))}${t('IBU', fix(r.ibu, 1))}${t('EST_COLOR', fix(r.srm, 1))}${t('EST_ABV', fix(r.abv, 1))}` : '';
  const noteText = notesToText(d.notes);
  const notesXml = noteText ? t('NOTES', noteText) : '';
  void strikeC;
  return `<RECIPE>${t('NAME', d.name)}${t('VERSION', 1)}${t('TYPE', 'All Grain')}${t('BREWER', 'Brasserie Open')}${t('BATCH_SIZE', fix(num(d.vol) || 0))}${t('BOIL_SIZE', fix(water?.preBoilL ?? (num(d.vol) || 0)))}${t('BOIL_TIME', fix(num(d.water.boil) || 60, 0))}${t('EFFICIENCY', fix(num(d.eff) || 0, 1))}${styleXml}<HOPS>${hops}</HOPS><FERMENTABLES>${ferm}</FERMENTABLES><MISCS></MISCS><YEASTS>${yeastXml}</YEASTS><WATERS></WATERS><MASH>${t('NAME', 'Mash')}${t('VERSION', 1)}${t('GRAIN_TEMP', fix(num(d.water.grainTemp) || 20, 1))}<MASH_STEPS>${steps}</MASH_STEPS></MASH>${calc}${notesXml}</RECIPE>`;
}

const wrap = (parts: string[]) => `<?xml version="1.0" encoding="UTF-8"?>\n<RECIPES>\n${parts.join('\n')}\n</RECIPES>\n`;
export const recipeToBeerXml = (d: RecipeState): string => wrap([recipeXml(d)]);
/** Toutes les recettes dans un seul fichier BeerXML. */
export const recipesToBeerXml = (ds: RecipeState[]): string => wrap(ds.map(recipeXml));

const child = (e: Element, name: string) => Array.from(e.children).find((x) => x.tagName === name)?.textContent?.trim() ?? '';
const numOf = (e: Element, name: string, d = NaN) => {
  const v = parseFloat(child(e, name).replace(',', '.'));
  return Number.isFinite(v) ? v : d;
};
const byName = <T extends { name: string }>(arr: T[], name: string) => arr.find((x) => x.name.toLowerCase() === name.toLowerCase());

function fromRecipe(el: Element): RecipeState {
  const all = (name: string) => Array.from(el.getElementsByTagName(name));
  const d0 = defaultRecipe();
  const mrows = all('FERMENTABLE').map((f) => {
    const name = child(f, 'NAME') || 'Malt importé';
    const k = byName(MALTS, name);
    const id = k?.id ?? addMalt({ name, ebc: fromLovibond(numOf(f, 'COLOR', 3)), extractPct: numOf(f, 'YIELD', 78) });
    const xml = fromLovibond(numOf(f, 'COLOR', NaN));
    return { id, kg: fmtN(numOf(f, 'AMOUNT', 0)), ...(k && Number.isFinite(xml) && Math.abs(xml - k.ebc) > 0.5 ? { ebc: fmtN(xml, 0) } : {}) };
  });
  const hrows = all('HOP').map((h) => {
    const name = child(h, 'NAME') || 'Houblon importé';
    const id = byName(HOPS, name)?.id ?? addHop({ name, aa: numOf(h, 'ALPHA', 8), aroma: '' });
    const use = USE_IN[child(h, 'USE').toLowerCase()] ?? 'boil';
    const k = HOPS.find((x) => x.id === id);
    return {
      id, use, grams: fmtN(numOf(h, 'AMOUNT', 0) * 1000, 1), aa: fmtN(numOf(h, 'ALPHA', k?.aa ?? 8)),
      min: use === 'dryhop' ? '0' : fmtN(numOf(h, 'TIME', 0), 0), temp: fmtN(numOf(h, 'X_TEMP', 80), 0),
    };
  });
  let yeastId = d0.yeastId;
  const y = all('YEAST')[0];
  if (y) {
    const name = child(y, 'NAME') || 'Levure importée';
    const lo = numOf(y, 'MIN_TEMPERATURE'), hi = numOf(y, 'MAX_TEMPERATURE');
    yeastId = byName(YEASTS, name)?.id ?? addYeast({
      name, attenuationPct: numOf(y, 'ATTENUATION', 75),
      tempC: Number.isFinite(lo) && Number.isFinite(hi) ? `${Math.round(lo)}–${Math.round(hi)}` : '',
      lager: child(y, 'TYPE').toLowerCase() === 'lager',
    });
  }
  const st = all('STYLE')[0];
  const sid = st ? `${child(st, 'CATEGORY_NUMBER')}${child(st, 'STYLE_LETTER')}`.toUpperCase() : '';
  const styleId = STYLES.find((s) => s.id.toUpperCase() === sid)?.id ?? d0.styleId;
  const mash = all('MASH_STEP').map((s) => ({
    name: child(s, 'NAME') || 'Palier', temp: fmtN(numOf(s, 'STEP_TEMP', 66), 1), min: fmtN(numOf(s, 'STEP_TIME', 60), 0),
  }));
  const mashEl = all('MASH')[0];
  const batch = numOf(el, 'BATCH_SIZE'), eff = numOf(el, 'EFFICIENCY'), boil = numOf(el, 'BOIL_TIME');
  return sanitize({
    ...d0, name: child(el, 'NAME') || 'Recette importée', notes: notesFromText(child(el, 'NOTES')), styleId, yeastId, mrows, hrows,
    vol: Number.isFinite(batch) ? fmtN(batch) : d0.vol,
    eff: Number.isFinite(eff) ? fmtN(eff, 1) : d0.eff,
    mash: mash.length ? mash : d0.mash,
    water: {
      ...d0.water,
      grainTemp: mashEl ? fmtN(numOf(mashEl, 'GRAIN_TEMP', 20), 1) : d0.water.grainTemp,
      boil: Number.isFinite(boil) ? fmtN(boil, 0) : d0.water.boil,
    },
  });
}

/** Retourne les recettes du fichier BeerXML, ou null si le fichier n’en contient pas. */
export function parseBeerXml(text: string): RecipeState[] | null {
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return null;
    const recipes = Array.from(doc.getElementsByTagName('RECIPE'));
    return recipes.length ? recipes.map(fromRecipe) : null;
  } catch {
    return null;
  }
}
