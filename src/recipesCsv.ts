/** Export et import CSV de toutes les recettes : une ligne par malt, houblon ou palier, avec les repères de la recette sur chaque ligne. */
import { HOPS, MALTS, YEASTS, addHop, addMalt, addYeast } from './data/ingredients';
import { STYLES } from './data/styles';
import { parseCsv, toNum } from './csv';
import { defaultRecipe, sanitize, type HopRow, type MaltRow, type MashStep, type RecipeState } from './library';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const cell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const USE_OUT: Record<HopRow['use'], string> = { boil: 'ébullition', fwh: 'FWH', hopstand: 'hopstand', dryhop: 'dry hop' };
const HEADER = 'recette;style;volume_l;rendement;levure;section;nom;quantite;ebc;alpha;usage;minutes;temp_c';

export function recipesToCsv(ds: RecipeState[]): string {
  const rows: string[][] = [];
  for (const d of ds) {
    const head = [d.name, d.styleId, d.vol, d.eff, YEASTS.find((y) => y.id === d.yeastId)?.name ?? ''];
    const start = rows.length;
    for (const m of d.mrows) {
      const k = MALTS.find((x) => x.id === m.id);
      rows.push([...head, 'malt', k?.name ?? m.id, m.kg, m.ebc ?? (k ? String(k.ebc).replace('.', ',') : ''), '', '', '', '']);
    }
    for (const h of d.hrows) {
      const k = HOPS.find((x) => x.id === h.id);
      rows.push([...head, 'houblon', k?.name ?? h.id, h.grams, '', h.aa, USE_OUT[h.use], h.use === 'dryhop' ? '' : h.min, h.use === 'hopstand' ? h.temp : '']);
    }
    for (const s of d.mash) rows.push([...head, 'palier', s.name, '', '', '', '', s.min, s.temp]);
    if (rows.length === start) rows.push([...head, '', '', '', '', '', '', '', '']);
  }
  return `${[HEADER, ...rows.map((r) => r.map(cell).join(';'))].join('\n')}\n`;
}

const byName = <T extends { name: string }>(arr: T[], name: string) => arr.find((x) => norm(x.name) === norm(name));

/** Relit un CSV produit par recipesToCsv (ou construit à la main). Les ingrédients inconnus deviennent des ingrédients personnalisés. */
export function parseRecipesCsv(text: string): RecipeState[] | null {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  if (rows.length < 2) return null;
  const head = rows[0].map(norm);
  const i = {
    name: head.indexOf('recette'), style: head.indexOf('style'), vol: head.indexOf('volumel'), eff: head.indexOf('rendement'),
    yeast: head.indexOf('levure'), sec: head.indexOf('section'), item: head.indexOf('nom'), qty: head.indexOf('quantite'),
    ebc: head.indexOf('ebc'), aa: head.indexOf('alpha'), use: head.indexOf('usage'), min: head.indexOf('minutes'), temp: head.indexOf('tempc'),
  };
  if (i.name < 0 || i.sec < 0 || i.item < 0) return null;
  const get = (r: string[], k: number) => (k >= 0 ? (r[k] ?? '').trim() : '');
  const groups = new Map<string, { name: string; rows: string[][] }>();
  for (const r of rows.slice(1)) {
    const name = get(r, i.name);
    if (!name) continue;
    const g = groups.get(norm(name)) ?? { name, rows: [] };
    g.rows.push(r);
    groups.set(norm(name), g);
  }
  const out: RecipeState[] = [];
  for (const { name, rows: rs } of groups.values()) {
    const d0 = defaultRecipe(name);
    const first = (k: number) => rs.map((r) => get(r, k)).find(Boolean) ?? '';
    const styleRaw = first(i.style);
    const styleId = STYLES.find((s) => norm(s.id) === norm(styleRaw) || norm(s.name) === norm(styleRaw))?.id ?? d0.styleId;
    const yeastName = first(i.yeast);
    const yeastId = yeastName ? (byName(YEASTS, yeastName)?.id ?? addYeast({ name: yeastName, attenuationPct: 75, tempC: '' })) : d0.yeastId;
    const mrows: MaltRow[] = [], hrows: HopRow[] = [], mash: MashStep[] = [];
    for (const r of rs) {
      const section = norm(get(r, i.sec)), item = get(r, i.item);
      if (section === 'malt' && item) {
        const k = byName(MALTS, item), e = toNum(get(r, i.ebc));
        const id = k?.id ?? addMalt({ name: item, ebc: Number.isFinite(e) ? e : 3, extractPct: 78 });
        mrows.push({ id, kg: get(r, i.qty) || '0', ...(k && Number.isFinite(e) && Math.abs(e - k.ebc) > 0.5 ? { ebc: get(r, i.ebc) } : {}) });
      } else if ((section === 'houblon' || section === 'hop') && item) {
        const k = byName(HOPS, item), aaStr = get(r, i.aa), alpha = toNum(aaStr);
        const id = k?.id ?? addHop({ name: item, aa: Number.isFinite(alpha) ? alpha : 8, aroma: '' });
        const u = norm(get(r, i.use));
        const use: HopRow['use'] = /fwh|premier/.test(u) ? 'fwh' : /hopstand|whirlpool|aroma|flamme/.test(u) ? 'hopstand' : /dry|froid/.test(u) ? 'dryhop' : 'boil';
        hrows.push({
          id, use, grams: get(r, i.qty) || '0', aa: aaStr || String(k?.aa ?? 8).replace('.', ','),
          min: get(r, i.min) || (use === 'dryhop' ? '0' : '60'), temp: get(r, i.temp) || (use === 'hopstand' ? '80' : '100'),
        });
      } else if (section === 'palier') {
        mash.push({ name: item || 'Palier', temp: get(r, i.temp), min: get(r, i.min) });
      }
    }
    out.push(sanitize({ ...d0, name, styleId, yeastId, vol: first(i.vol) || d0.vol, eff: first(i.eff) || d0.eff, mrows, hrows, mash: mash.length ? mash : d0.mash }));
  }
  return out.length ? out : null;
}
