/**
 * Teinte (en degrés) d’une jauge : 120 (vert) dans la plage du style, puis dégradé
 * vers le jaune (60) et le rouge (0) à mesure que la valeur s’éloigne.
 * Rouge atteint à une largeur de plage d’écart.
 */
export function gaugeHue(value: number, lo: number, hi: number): number {
  const dist = value < lo ? lo - value : value > hi ? value - hi : 0;
  const t = Math.min(1, dist / (hi - lo || 1));
  return Math.round(120 * (1 - t));
}
