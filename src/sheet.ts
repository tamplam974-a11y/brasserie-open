import { HOPS } from './data/ingredients';
import type { RecipeState } from './library';

const num = (s: string) => parseFloat(String(s).replace(',', '.'));

/** Chronologie des houblons autour de l’ébullition, dans l’ordre où on les ajoute. */
export function boilSchedule(d: RecipeState): { when: string; what: string }[] {
  const total = num(d.water.boil) > 0 ? num(d.water.boil) : 60;
  const rows: { at: number; when: string; what: string }[] = [{ at: 0, when: '0 min', what: 'Début de l’ébullition' }];
  for (const h of d.hrows) {
    const g = `${h.grams} g ${HOPS.find((x) => x.id === h.id)?.name ?? h.id}`;
    const m = num(h.min) || 0;
    if (h.use === 'mash') rows.push({ at: -2, when: 'Dans l’empâtage', what: `${g} (${m} min)` });
    else if (h.use === 'fwh') rows.push({ at: -1, when: 'Avant l’ébullition (premier moût)', what: g });
    else if (h.use === 'boil') {
      const at = Math.max(0, total - Math.min(m, total));
      rows.push({ at, when: `${at} min`, what: `${g} (${m} min d’ébullition)` });
    } else if (h.use === 'hopstand') rows.push({ at: total + 1, when: `Flamme éteinte, ${h.temp} °C`, what: `${g} pendant ${m} min` });
    else rows.push({ at: total + 2, when: 'Fermentation (dry hop)', what: g });
  }
  rows.push({ at: total + 0.5, when: `${total} min`, what: 'Fin de l’ébullition, flamme éteinte' });
  return rows.sort((a, b) => a.at - b.at).map(({ when, what }) => ({ when, what }));
}
