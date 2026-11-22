/** Densimètres connectés (iSpindel, Tilt, RAPT Pill, Plaato…) : lecture de relevés au format CSV et analyse de la fermentation. */
import { parseCsv, toNum } from './csv';
import { abvSimple, apparentAttenuation, platoToSg } from './engine';

export interface Reading { t: number; sg: number; tempC?: number }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const TIME = ['time', 'timestamp', 'date', 'datetime', 'datetimeutc', 'heure', 'created', 'createdat', 'recorded', 'recordedat'];
const GRAV = ['gravity', 'sg', 'specificgravity', 'densite', 'density', 'gravite', 'plato', 'brix', 'p'];
const TEMP = ['temp', 'temperature', 'tempc', 'tempf', 'temperaturec', 'temperaturef'];

/** Horodatage en millisecondes : epoch (secondes ou millisecondes), ISO, ou jj/mm/aaaa hh:mm. */
export function parseTime(raw: string): number {
  const s = raw.trim();
  if (/^\d{9,13}(\.\d+)?$/.test(s)) { const v = parseFloat(s); return v < 1e11 ? v * 1000 : v; }
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (fr) return new Date(+fr[3], +fr[2] - 1, +fr[1], +fr[4], +fr[5], +(fr[6] ?? 0)).getTime();
  return Date.parse(s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s);
}

/** Densité en SG : 1050 (Tilt) devient 1,050, un °Plato ou °Brix est converti. */
export function normSg(v: number, plato = false): number {
  if (!Number.isFinite(v)) return NaN;
  if (plato) return platoToSg(v);
  if (v >= 900 && v < 1300) return v / 1000; // Tilt : SG x 1000
  if (v >= 0.95 && v <= 1.2) return v;
  if (v > 0 && v <= 40) return platoToSg(v);
  return NaN;
}

export function parseReadings(text: string, unit: 'auto' | 'c' | 'f' = 'auto'): { readings: Reading[]; errors: string[] } {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()));
  const errors: string[] = [];
  if (!rows.length) return { readings: [], errors: ['fichier vide'] };
  const head = rows[0].map(norm);
  const find = (names: string[]) => head.findIndex((h) => names.includes(h) || names.some((n) => n.length >= 4 && h.startsWith(n)));
  let [it, ig, ie] = [find(TIME), find(GRAV), find(TEMP)];
  const header = it >= 0 && ig >= 0;
  if (!header) [it, ig, ie] = [0, 1, 2];
  const plato = header && /plato|brix/.test(head[ig]);
  const raw: { t: number; sg: number; temp: number }[] = [];
  rows.slice(header ? 1 : 0).forEach((r, k) => {
    const line = k + (header ? 2 : 1);
    const t = parseTime(r[it] ?? '');
    const sg = normSg(toNum(r[ig] ?? ''), plato);
    if (!Number.isFinite(t)) errors.push(`ligne ${line} : date illisible`);
    else if (!Number.isFinite(sg)) errors.push(`ligne ${line} : densité illisible`);
    else raw.push({ t, sg, temp: ie >= 0 ? toNum(r[ie] ?? '') : NaN });
  });
  const temps = raw.map((x) => x.temp).filter(Number.isFinite).sort((a, b) => a - b);
  const median = temps.length ? temps[Math.floor(temps.length / 2)] : NaN;
  const fahrenheit = unit === 'f' || (unit === 'auto' && ((header && ie >= 0 && /tempf|temperaturef/.test(head[ie])) || median > 45));
  const readings = raw
    .map(({ t, sg, temp }): Reading => ({ t, sg, ...(Number.isFinite(temp) ? { tempC: fahrenheit ? ((temp - 32) * 5) / 9 : temp } : {}) }))
    .sort((a, b) => a.t - b.t);
  return { readings, errors };
}

export function mergeReadings(a: Reading[], b: Reading[]): Reading[] {
  const byTime = new Map<number, Reading>();
  for (const r of [...a, ...b]) byTime.set(r.t, r);
  return [...byTime.values()].sort((x, y) => x.t - y.t);
}

export interface Analysis {
  n: number; startSg: number; lastSg: number; lastTempC?: number; hours: number;
  attenuationPct: number; abv: number; pointsPerDay: number; stable: boolean;
}

/** État de la fermentation : alcool et atténuation, vitesse sur 24 h, stabilité sur 48 h (moins de 1,5 point d’écart). */
export function analyze(rs: Reading[], og?: number): Analysis | null {
  if (!rs.length) return null;
  const first = rs[0], last = rs[rs.length - 1];
  const start = og ?? first.sg;
  const ref = [...rs].reverse().find((r) => r.t <= last.t - 24 * 3600e3);
  const hrs = ref ? (last.t - ref.t) / 3600e3 : 0;
  const pointsPerDay = ref && hrs > 0 ? ((ref.sg - last.sg) * 1000) / (hrs / 24) : 0;
  const recent = rs.filter((r) => r.t >= last.t - 48 * 3600e3);
  const sgs = recent.map((r) => r.sg);
  const stable = recent.length > 1 && last.t - recent[0].t >= 36 * 3600e3 && Math.max(...sgs) - Math.min(...sgs) < 0.0015;
  return {
    n: rs.length, startSg: start, lastSg: last.sg, lastTempC: last.tempC, hours: (last.t - first.t) / 3600e3,
    attenuationPct: start > 1 ? apparentAttenuation(start, last.sg) : 0, abv: abvSimple(start, last.sg), pointsPerDay, stable,
  };
}
