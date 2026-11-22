import { useState } from 'react';
import { FAMILIES, combineProfiles, hopProfile } from './aroma';
import { HOPS, type Hop } from './data/ingredients';

const COLORS = ['#3fa34d', '#e0b400', '#2f9bd6', '#d6567a', '#8a63d2'];

interface Series { label: string; color: string; values: number[]; dashed?: boolean }

/** Plusieurs profils superposés sur les mêmes axes. */
function MultiRadar({ series }: { series: Series[] }) {
  const n = FAMILIES.length, cx = 190, cy = 128, R = 96;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const poly = (r: (i: number) => number) => FAMILIES.map((_, i) => pt(i, r(i)).join(',')).join(' ');
  return (
    <svg className="radar big" viewBox="0 0 380 262" role="img" aria-label="Comparaison des arômes de houblons">
      {[1, 2, 3, 4, 5].map((k) => <polygon key={k} className="ring" points={poly(() => (R * k) / 5)} />)}
      {FAMILIES.map((_, i) => <line key={i} className="axis" x1={cx} y1={cy} x2={pt(i, R)[0]} y2={pt(i, R)[1]} />)}
      {[1, 2, 3, 4, 5].map((k) => <text key={k} className="tick" x={cx + 3} y={cy - (R * k) / 5 + 3}>{k}</text>)}
      {series.map((s) => (
        <g key={s.label}>
          <polygon
            points={poly((i) => (R * s.values[i]) / 5)} fillOpacity={0.18}
            style={{ fill: s.dashed ? 'none' : s.color, stroke: s.color, strokeWidth: s.dashed ? 1.6 : 2, strokeDasharray: s.dashed ? '5 4' : undefined }}
          />
          {!s.dashed && s.values.map((v, i) => (v > 0 ? <circle key={i} cx={pt(i, (R * v) / 5)[0]} cy={pt(i, (R * v) / 5)[1]} r={3} style={{ fill: s.color }} /> : null))}
        </g>
      ))}
      {FAMILIES.map((l, i) => {
        const [x, y] = pt(i, R + 12);
        const c = Math.cos(ang(i));
        return <text key={l} x={x} y={y + 3} textAnchor={Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end'}>{l}</text>;
      })}
    </svg>
  );
}

/** Tous les houblons, avec en haut la comparaison de plusieurs houblons associés. */
export default function HopsTab() {
  const [slots, setSlots] = useState<string[]>(['Citra', 'Simcoe', 'Mosaic', '', '']);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'name' | 'aa'>('name');
  const find = (s: string) => HOPS.find((h) => h.name.toLowerCase() === s.trim().toLowerCase());
  const picked = slots.flatMap((s, i) => { const hop = find(s); return hop ? [{ i, hop }] : []; });
  const profiles = picked.map(({ hop }) => hopProfile(hop.aroma));
  const series: Series[] = picked.map(({ i, hop }, k) => ({ label: hop.name, color: COLORS[i], values: profiles[k] }));
  if (picked.length >= 2) series.push({ label: 'Association', color: 'var(--fg)', values: combineProfiles(profiles), dashed: true });
  const slotOf = (h: Hop) => slots.findIndex((s) => s.trim().toLowerCase() === h.name.toLowerCase());
  const full = slots.every((s) => s.trim());
  const toggle = (h: Hop) => {
    const at = slotOf(h);
    if (at >= 0) { setSlots(slots.map((x, j) => (j === at ? '' : x))); return; }
    const free = slots.findIndex((s) => !s.trim());
    if (free >= 0) setSlots(slots.map((x, j) => (j === free ? h.name : x)));
  };
  const shown = HOPS
    .filter((h) => `${h.name} ${h.brand ?? ''} ${h.aroma}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (sort === 'aa' ? b.aa - a.aa : a.name.localeCompare(b.name, 'fr')));
  return (
    <div className="wide">
      <section>
        <h2>Comparer des houblons</h2>
        <div className="hopsgrid">
          <div className="slots">
            <h3>Houblons <small>(5 max)</small></h3>
            {slots.map((s, i) => (
              <div className="slot" key={i}>
                <i className="dot" style={{ background: COLORS[i] }} />
                <input list="hop-names" placeholder="3 lettres min…" aria-label={`Houblon ${i + 1}`} value={s}
                  onChange={(e) => setSlots(slots.map((x, j) => (j === i ? e.target.value : x)))} />
                <button className="add" aria-label={`Effacer le houblon ${i + 1}`} onClick={() => setSlots(slots.map((x, j) => (j === i ? '' : x)))}>⌫</button>
              </div>
            ))}
            <datalist id="hop-names">{HOPS.map((h) => <option key={h.id} value={h.name} />)}</datalist>
            {slots.some((s) => s.trim() && !find(s)) && <p className="hint">Choisissez un nom dans la liste proposée.</p>}
          </div>
          <div>
            <MultiRadar series={series} />
            <div className="legend">
              {series.map((s) => (
                <span key={s.label}><i className={s.dashed ? 'dash' : 'dot'} style={s.dashed ? { borderColor: s.color } : { background: s.color }} />{s.label}</span>
              ))}
            </div>
            <p className="hint">Profils estimés d’après les descripteurs de chaque houblon (le premier cité compte le plus). « Association » additionne les houblons choisis.</p>
          </div>
        </div>
      </section>
      <section>
        <div className="top">
          <h2>Tous les houblons <small>({shown.length} sur {HOPS.length})</small></h2>
          <div className="libbar">
            <input className="nm" placeholder="Filtrer (nom, origine, arôme)" aria-label="Filtrer les houblons" value={q} onChange={(e) => setQ(e.target.value)} />
            <select aria-label="Trier par" value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'aa')}>
              <option value="name">Trier par nom</option>
              <option value="aa">Alpha-acides décroissants</option>
            </select>
          </div>
        </div>
        <div className="tablewrap tall">
          <table className="tbl tight">
            <thead><tr><th>Houblon</th><th>Origine</th><th>Alpha (%)</th><th>Arômes</th><th /></tr></thead>
            <tbody>
              {shown.map((h) => {
                const at = slotOf(h);
                return (
                  <tr key={h.id}>
                    <td><b>{h.name}</b></td>
                    <td>{h.brand}</td>
                    <td>{h.aa}</td>
                    <td>{h.aroma || '–'}</td>
                    <td>
                      <button className="add" disabled={at < 0 && full} title={at < 0 && full ? '5 houblons au maximum' : undefined} onClick={() => toggle(h)}>
                        {at >= 0 ? 'Retirer' : 'Comparer'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">Alpha-acides indicatifs : ils varient selon la récolte. Les houblons ajoutés dans l’onglet Ingrédients apparaissent ici.</p>
      </section>
    </div>
  );
}
