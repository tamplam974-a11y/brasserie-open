/** Couleur d’affichage d’une bière selon son SRM (interpolation entre repères d’une échelle de couleurs usuelle). */
const STOPS: [number, string][] = [
  [1, '#FFE699'], [2, '#FFD878'], [3, '#FFBF42'], [4, '#FBB123'], [6, '#F39C00'], [9, '#E58500'], [13, '#CF6900'],
  [17, '#BB5100'], [20, '#A03B00'], [24, '#7E2F00'], [30, '#4E1E00'], [35, '#2F1300'], [40, '#1A0B05'],
];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function srmColor(srm: number): string {
  if (!Number.isFinite(srm) || srm <= STOPS[0][0]) return STOPS[0][1];
  const last = STOPS[STOPS.length - 1];
  if (srm >= last[0]) return last[1];
  const k = STOPS.findIndex(([s]) => s > srm);
  const [s0, c0] = STOPS[k - 1];
  const [s1, c1] = STOPS[k];
  const t = (srm - s0) / (s1 - s0);
  const [a, b] = [rgb(c0), rgb(c1)];
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
