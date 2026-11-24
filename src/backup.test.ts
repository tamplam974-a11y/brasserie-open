import { describe, expect, it } from 'vitest';
import { KEYS, applyBackup, isBackup, makeBackup, summarize, type Store } from './backup';

const memory = (init: Record<string, unknown> = {}) => {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, JSON.stringify(v)]));
  const store: Store = { read: (k) => m.get(k) ?? null, write: (k, v) => void m.set(k, v) };
  return { m, store, get: (k: string) => JSON.parse(m.get(k) ?? 'null') };
};
const lib = (...ids: string[]) => ({ current: ids[0], items: ids.map((id) => ({ id, data: { name: id } })) });

describe('sauvegarde', () => {
  it('exporte seulement ce qui existe et se reconnaît', () => {
    const a = memory({ [KEYS.library]: lib('r1', 'r2'), [KEYS.styles]: [{ id: 'X1' }] });
    const b = makeBackup(a.store.read, new Date('2026-11-22T10:00:00Z'));
    expect(isBackup(b)).toBe(true);
    expect(isBackup({ app: 'autre' })).toBe(false);
    expect(summarize(b)).toMatchObject({ recipes: 2, styles: 1, malts: 0 });
    expect(Object.keys(b.data).sort()).toEqual(['library', 'styles']);
  });
  it('remplace les données présentes dans la sauvegarde et garde les autres', () => {
    const src = makeBackup(memory({ [KEYS.library]: lib('a') }).store.read);
    const dst = memory({ [KEYS.library]: lib('x', 'y'), [KEYS.styles]: [{ id: 'S' }] });
    applyBackup(src, 'replace', dst.store);
    expect(dst.get(KEYS.library).items.map((i: { id: string }) => i.id)).toEqual(['a']);
    expect(dst.get(KEYS.styles)).toEqual([{ id: 'S' }]);
  });
  it('fusionne les recettes sans rien perdre ni dupliquer', () => {
    const src = makeBackup(memory({ [KEYS.library]: { current: 'b', items: [{ id: 'a', data: { name: 'a' } }, { id: 'c', data: { name: 'Autre' } }, { id: 'new', data: { name: 'Nouvelle' } }] } }).store.read);
    const dst = memory({ [KEYS.library]: { current: 'a', items: [{ id: 'a', data: { name: 'a' } }, { id: 'c', data: { name: 'Locale' } }] } });
    applyBackup(src, 'merge', dst.store);
    const items = dst.get(KEYS.library).items as { id: string; data: { name: string } }[];
    expect(items).toHaveLength(4);
    expect(items.filter((i) => i.id === 'a')).toHaveLength(1);
    expect(items.some((i) => i.data.name === 'Autre (importée)')).toBe(true);
    expect(items.some((i) => i.data.name === 'Locale')).toBe(true);
    expect(dst.get(KEYS.library).current).toBe('a');
  });
  it('fusionne les ingrédients par identifiant ou par nom et marque', () => {
    const src = makeBackup(memory({ [KEYS.ingredients]: { malts: [{ id: 'c-1', name: 'Mon malt', brand: 'M', ebc: 5, extractPct: 80 }, { id: 'c-2', name: 'Autre', brand: 'M', ebc: 9, extractPct: 78 }], replaced: { malts: ['Best Malz'] } } }).store.read);
    const dst = memory({ [KEYS.ingredients]: { malts: [{ id: 'c-9', name: 'mon  malt', brand: 'm', ebc: 5, extractPct: 80 }], replaced: { malts: [] } } });
    applyBackup(src, 'merge', dst.store);
    const out = dst.get(KEYS.ingredients);
    expect(out.malts.map((m: { name: string }) => m.name)).toEqual(['mon  malt', 'Autre']);
    expect(out.replaced.malts).toEqual(['Best Malz']);
  });
  it('fusionne les relevés par date et les styles par numéro', () => {
    const src = makeBackup(memory({ [KEYS.hydrometer]: [{ t: 2, sg: 1.04 }, { t: 3, sg: 1.03 }], [KEYS.styles]: [{ id: 'x1', name: 'Importé' }, { id: 'X2', name: 'Nouveau' }] }).store.read);
    const dst = memory({ [KEYS.hydrometer]: [{ t: 1, sg: 1.05 }, { t: 2, sg: 1.045 }], [KEYS.styles]: [{ id: 'X1', name: 'Local' }] });
    applyBackup(src, 'merge', dst.store);
    expect(dst.get(KEYS.hydrometer).map((r: { t: number }) => r.t)).toEqual([1, 2, 3]);
    expect(dst.get(KEYS.hydrometer)[1].sg).toBe(1.04);
    expect(dst.get(KEYS.styles).map((s: { name: string }) => s.name)).toEqual(['Local', 'Nouveau']);
  });
});
