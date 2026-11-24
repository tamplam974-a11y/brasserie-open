import { compute, recipeNumber, type RecipeState } from './library';

/** Tri des recettes, partagé entre l’onglet « Mes recettes » et la liste déroulante « Liste » de la recette. */
export type Sort = 'manual' | 'name' | 'num' | 'numdesc' | 'abv' | 'ibu' | 'ebc' | 'og';

export const SORTS: [Sort, string][] = [
  ['manual', 'Ordre manuel'], ['name', 'Trier par nom'], ['num', 'Numéro croissant'], ['numdesc', 'Numéro décroissant'],
  ['abv', 'Alcool décroissant'], ['ibu', 'Amertume décroissante'], ['ebc', 'Couleur décroissante'], ['og', 'Densité décroissante'],
];

const SORT_KEY = 'brasserie-open:tri-recettes';

export function loadSort(): Sort {
  try {
    const v = localStorage.getItem(SORT_KEY);
    return SORTS.some(([k]) => k === v) ? (v as Sort) : 'manual';
  } catch {
    return 'manual';
  }
}

export function saveSort(s: Sort): void {
  try { localStorage.setItem(SORT_KEY, s); } catch { /* sans effet */ }
}

/** Classe des éléments portant une recette (`data`). L’ordre manuel est celui de la bibliothèque ; les recettes sans numéro passent en dernier. */
export function sortItems<T extends { data: RecipeState }>(items: T[], sort: Sort): T[] {
  if (sort === 'manual') return items;
  if (sort === 'name') return [...items].sort((a, b) => a.data.name.localeCompare(b.data.name, 'fr'));
  if (sort === 'num' || sort === 'numdesc') {
    return [...items].sort((a, b) => {
      const na = recipeNumber(a.data.name), nb = recipeNumber(b.data.name);
      if (na === null || nb === null) return na === nb ? 0 : na === null ? 1 : -1;
      return sort === 'num' ? na - nb : nb - na;
    });
  }
  const value = new Map(items.map((x) => [x, compute(x.data)?.[sort] ?? 0]));
  return [...items].sort((a, b) => (value.get(b) ?? 0) - (value.get(a) ?? 0));
}
