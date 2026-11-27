import { useState } from 'react';

/** Choix d’ingrédient avec appel rapide : on tape quelques lettres, on valide avec Entrée ou un clic. */
export function Picker<T extends { id: string; name: string; brand?: string }>(p: {
  items: T[]; value: string; label: string; onPick: (id: string) => void;
}) {
  const current = p.items.find((x) => x.id === p.value);
  const [q, setQ] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const plain = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const found = q === null ? [] : p.items.filter((x) => plain(`${x.brand ?? ''} ${x.name}`).includes(plain(q))).slice(0, 120);
  const pick = (x: T, input: HTMLElement | null) => { p.onPick(x.id); setQ(null); input?.blur(); };
  return (
    <div className="picker">
      <input
        role="combobox" aria-expanded={q !== null} aria-label={p.label} placeholder="Tapez pour chercher…" title="Cliquez, puis tapez quelques lettres pour chercher"
        value={q ?? current?.name ?? ''}
        onFocus={(e) => { setQ(''); setHi(0); e.target.select(); }}
        onChange={(e) => { setQ(e.target.value); setHi(0); }}
        onBlur={() => setQ(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi(Math.min(hi + 1, found.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(Math.max(hi - 1, 0)); }
          else if (e.key === 'Enter' && found[hi]) { e.preventDefault(); pick(found[hi], e.currentTarget); }
          else if (e.key === 'Escape') { setQ(null); e.currentTarget.blur(); }
        }}
      />
      {q !== null && found.length > 0 && (
        <ul className="pick-list" role="listbox">
          {found.map((x, i) => (
            <li key={x.id} role="option" aria-selected={i === hi} className={i === hi ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(x, e.currentTarget.closest('.picker')?.querySelector('input') ?? null); }}>
              {x.name}{x.brand ? <small> {x.brand}</small> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
