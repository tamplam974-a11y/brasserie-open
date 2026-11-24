import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { HOPS, MALTS, YEASTS } from './data/ingredients';
import { STYLES, type Range } from './data/styles';
import { parseBeerXml, recipeToBeerXml } from './beerxml';
import { gaugeHue } from './gauge';
import { FAMILIES, FAMILY_COLORS, aromaProfile } from './aroma';
import { YEAST_COLORS, YEAST_FAMILIES, yeastProfile } from './yeastProfile';
import {
  USE_DEFAULTS, compute, computeWater, defaultRecipe, loadLibrary, newId, parseRecipeHtml, recipeToHtml,
  saveLibrary, scaleRecipe, type HopRow, type Library, type MaltRow, type MashStep, type Notes, type RecipeState, type WaterParams,
} from './library';

const num = (s: string) => parseFloat(s.replace(',', '.'));
const fmt = (x: number, d = 1) =>
  x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtIn = (x: number, d: number) => String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',');

/** Champ de poids avec boutons + et − (et flèches haut/bas du clavier). */
function Stepper(p: { label: string; value: string; step: number; decimals: number; onChange: (v: string) => void }) {
  const bump = (dir: 1 | -1) =>
    p.onChange(fmtIn(Math.max(0, (num(p.value) || 0) + dir * p.step), p.decimals));
  return (
    <div className="stepper">
      <input
        aria-label={p.label}
        inputMode="decimal"
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            bump(e.key === 'ArrowUp' ? 1 : -1);
          }
        }}
      />
      <span className="steps">
        <button type="button" tabIndex={-1} aria-label={`Augmenter (${p.label})`} onClick={() => bump(1)}>+</button>
        <button type="button" tabIndex={-1} aria-label={`Diminuer (${p.label})`} onClick={() => bump(-1)}>−</button>
      </span>
    </div>
  );
}

const hueColor = (v: number, [lo, hi]: Range) => `hsl(${gaugeHue(v, lo, hi)} 70% var(--gl))`;

function Gauge(p: {
  label: string; value: number; range: Range; d?: number;
  step?: number; hint?: string; onDragStart?: () => void; onDrag?: (v: number) => void;
}) {
  const [lo, hi] = p.range;
  const min = lo - (hi - lo), max = hi + (hi - lo);
  const pos = (x: number) => Math.min(100, Math.max(0, ((x - min) / (max - min)) * 100));
  const d = p.d ?? 1;
  const color = `hsl(${gaugeHue(p.value, lo, hi)} 70% var(--gl))`;
  const g = (h: number) => `hsl(${h} 70% var(--gl))`;
  const grad = `linear-gradient(to right, ${g(0)} 0%, ${g(60)} ${pos(lo - (hi - lo) / 2)}%, ${g(120)} ${pos(lo)}%, ${g(120)} ${pos(hi)}%, ${g(60)} ${pos(hi + (hi - lo) / 2)}%, ${g(0)} 100%)`;
  const track = useRef<HTMLDivElement>(null);
  const live = !!p.onDrag;
  const valueAt = (clientX: number) => {
    const b = track.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - b.left) / b.width));
    return min + t * (max - min);
  };
  const handlers = live
    ? {
        role: 'slider' as const, tabIndex: 0, title: p.hint, 'aria-label': p.label,
        'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': p.value,
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          p.onDragStart?.();
          p.onDrag!(valueAt(e.clientX));
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) p.onDrag!(valueAt(e.clientX));
        },
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          p.onDragStart?.();
          p.onDrag!(p.value + (e.key === 'ArrowRight' ? 1 : -1) * (p.step ?? (max - min) / 100));
        },
      }
    : {};
  return (
    <div className="gauge">
      <div className="gl"><span>{p.label}</span><b style={{ color }}>{fmt(p.value, d)}</b></div>
      <div className={live ? 'track live' : 'track'} ref={track} style={{ background: grad }} {...handlers}>
        <i className="mark" style={{ left: `${pos(p.value)}%` }} />
      </div>
      <small>attendu : {fmt(lo, d)}–{fmt(hi, d)}</small>
    </div>
  );
}

/** Petit indicateur (DI, IBU, EBC) coloré selon l’écart au style. */
function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return <span className="chip"><small>{label}</small><b style={color ? { color } : undefined}>{value}</b></span>;
}

/** Choix d’ingrédient avec appel rapide : on tape quelques lettres, on valide avec Entrée ou un clic. */
function Picker<T extends { id: string; name: string; brand?: string }>(p: {
  items: T[]; value: string; label: string; onPick: (id: string) => void;
}) {
  const current = p.items.find((x) => x.id === p.value);
  const [q, setQ] = useState<string | null>(null);
  const [hi, setHi] = useState(0);
  const plain = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const found = q === null ? [] : p.items.filter((x) => plain(`${x.brand ?? ''} ${x.name}`).includes(plain(q))).slice(0, q ? 12 : 30);
  const pick = (x: T, input: HTMLElement | null) => { p.onPick(x.id); setQ(null); input?.blur(); };
  return (
    <div className="picker">
      <input
        role="combobox" aria-expanded={q !== null} aria-label={p.label} placeholder="Tapez pour chercher…"
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

/** Liste d’options groupée par marque. */
function Opts<T extends { id: string; name: string; brand?: string }>({ items }: { items: T[] }) {
  const groups = [...new Set(items.map((x) => x.brand ?? 'Génériques'))];
  return (
    <>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {items.filter((x) => (x.brand ?? 'Génériques') === g).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </optgroup>
      ))}
    </>
  );
}

const NOTE_FIELDS: [keyof Notes, string, string][] = [
  ['before', 'Avant le brassage', 'Idées, courses, matériel, objectifs…'],
  ['during', 'Pendant le brassage', 'Températures réelles, densités mesurées, incidents…'],
  ['after', 'Après le brassage', 'Fermentation, dégustation, améliorations…'],
];

/** Diagramme en toile d’araignée coloré (une couleur par axe). */
function Radar({ labels, values, colors }: { labels: string[]; values: number[]; colors: string[] }) {
  const n = labels.length, cx = 180, cy = 97, R = 74;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number): [number, number] => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];
  const rv = (i: number) => (R * values[i]) / 5;
  const poly = (r: (i: number) => number) => labels.map((_, i) => pt(i, r(i)).join(',')).join(' ');
  return (
    <svg className="radar" viewBox="0 0 360 196" role="img" aria-label={`Diagramme : ${labels.join(', ')}`}>
      {[1, 2, 3, 4, 5].map((k) => <polygon key={k} className="ring" points={poly(() => (R * k) / 5)} />)}
      {labels.map((_, i) => <line key={i} className="axis" x1={cx} y1={cy} x2={pt(i, R)[0]} y2={pt(i, R)[1]} />)}
      {labels.map((_, i) => {
        const j = (i + 1) % n;
        return (
          <polygon key={i} points={`${cx},${cy} ${pt(i, rv(i)).join(',')} ${pt(j, rv(j)).join(',')}`}
            fill={values[i] >= values[j] ? colors[i] : colors[j]} fillOpacity={0.45} />
        );
      })}
      <polygon className="outline" points={poly(rv)} />
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 10);
        const c = Math.cos(angle(i));
        return (
          <g key={l}>
            {values[i] > 0 && <circle cx={pt(i, rv(i))[0]} cy={pt(i, rv(i))[1]} r={3} fill={colors[i]} />}
            <text x={x} y={y + 3} textAnchor={Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end'} style={{ fill: colors[i] }}>
              {l}{values[i] > 0 ? ` ${values[i].toFixed(1)}` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const WATER_FIELDS: [keyof WaterParams, string][] = [
  ['ratio', 'Eau/grain (L/kg)'], ['absorb', 'Absorption (L/kg)'], ['evap', 'Évaporation (L/h)'],
  ['boil', 'Ébullition (min)'], ['loss', 'Pertes (L)'], ['grainTemp', 'Grain (°C)'],
];

export default function RecipeBuilder({ openRequest, deleteRequest, reorderRequest, importRequest, onLibraryChange, onSnapshot }: {
  openRequest?: { id: string; n: number } | null;
  deleteRequest?: { id: string; n: number } | null;
  reorderRequest?: { ids: string[]; n: number } | null;
  importRequest?: { recipes: RecipeState[]; n: number } | null;
  onLibraryChange?: () => void;
  onSnapshot?: (d: RecipeState) => void;
}) {
  const [lib, setLib] = useState<Library>(loadLibrary);
  const [init] = useState<RecipeState>(() => lib.items.find((x) => x.id === lib.current)!.data);
  const [name, setName] = useState(init.name);
  const [styleId, setStyleId] = useState(init.styleId);
  const [vol, setVol] = useState(init.vol);
  const [eff, setEff] = useState(init.eff);
  const [yeastId, setYeastId] = useState(init.yeastId);
  const [mrows, setM] = useState<MaltRow[]>(init.mrows);
  const [hrows, setH] = useState<HopRow[]>(init.hrows);
  const [mash, setMash] = useState<MashStep[]>(init.mash);
  const [water, setWater] = useState<WaterParams>(init.water);
  const [notes, setNotes] = useState<Notes>(init.notes);
  const [showNotes, setShowNotes] = useState(false);
  const [resizeTo, setResizeTo] = useState<string | null>(null);
  const [saveAs, setSaveAs] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const snapshot = (): RecipeState => ({ name, styleId, vol, eff, yeastId, mrows, hrows, mash, water, notes });
  const apply = (d: RecipeState) => {
    setName(d.name); setStyleId(d.styleId); setVol(d.vol); setEff(d.eff); setYeastId(d.yeastId);
    setM(d.mrows); setH(d.hrows); setMash(d.mash); setWater(d.water); setNotes(d.notes);
  };
  // Historique pour « Retour » : les modifications rapprochées (moins de 0,6 s) forment une seule étape.
  const past = useRef<RecipeState[]>([]);
  const prev = useRef<RecipeState>(init);
  const lastEdit = useRef(0);
  const [undoCount, setUndoCount] = useState(0);
  const key = JSON.stringify(snapshot());
  useEffect(() => {
    if (key === JSON.stringify(prev.current)) return;
    const now = Date.now();
    if (now - lastEdit.current > 600) {
      past.current.push(prev.current);
      if (past.current.length > 50) past.current.shift();
      setUndoCount(past.current.length);
    }
    lastEdit.current = now;
    prev.current = JSON.parse(key) as RecipeState;
  }, [key]);
  useEffect(() => { onSnapshot?.(JSON.parse(key) as RecipeState); }, [key]);
  const undo = () => {
    const d = past.current.pop();
    if (!d) return;
    prev.current = d;
    setUndoCount(past.current.length);
    apply(d);
  };
  /** Charge une autre recette (bibliothèque, import) et repart d’un historique vide. */
  const load = (d: RecipeState) => { past.current = []; prev.current = d; setUndoCount(0); apply(d); };
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };
  const stored = lib.items.find((x) => x.id === lib.current);
  const dirty = !stored || JSON.stringify(stored.data) !== JSON.stringify(snapshot());
  const guard = () => !dirty || window.confirm('Abandonner les modifications non mémorisées ?');
  const persist = (next: Library) => {
    setLib(next);
    try { saveLibrary(next); onLibraryChange?.(); return true; } catch { flash('Mémorisation impossible dans ce navigateur'); return false; }
  };
  const save = () => {
    const nm = name.trim() || 'Sans titre';
    setName(nm);
    const items = lib.items.map((x) => (x.id === lib.current ? { ...x, data: { ...snapshot(), name: nm } } : x));
    if (persist({ ...lib, items })) flash('Recette mémorisée ✓');
  };
  const add = (data: RecipeState) => {
    const id = newId();
    persist({ current: id, items: [...lib.items, { id, data }] });
    load(data);
  };
  const addMany = (ds: RecipeState[]) => {
    const items = ds.map((data) => ({ id: newId(), data }));
    if (!items.length) return;
    persist({ current: items[items.length - 1].id, items: [...lib.items, ...items] });
    load(items[items.length - 1].data);
  };
  const exportXml = () => {
    const url = URL.createObjectURL(new Blob([recipeToBeerXml(snapshot())], { type: 'application/xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name.trim() || 'recette').replace(/[^\p{L}\p{N}]+/gu, '-')}.xml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importXml = (file: File | undefined) => {
    if (!file || !guard()) return;
    file.text().then((t) => {
      const ds = parseBeerXml(t);
      if (ds) { addMany(ds); flash(`${ds.length} recette(s) importée(s) ✓`); } else flash('BeerXML non reconnu');
    });
  };
  const createClone = () => {
    const nm = (saveAs ?? '').trim() || `${name.trim() || 'Recette'} (copie)`;
    add({ ...snapshot(), name: nm });
    setSaveAs(null);
    flash('Clone créé ✓ : l’original est conservé');
  };
  const ebcOf = (id: string) => {
    const e = MALTS.find((x) => x.id === id)?.ebc;
    return e === undefined ? '–' : fmt(e, e < 10 ? 1 : 0);
  };
  // Demande d’ouverture venue de l’onglet « Mes recettes ».
  useEffect(() => {
    if (openRequest) switchTo(openRequest.id);
  }, [openRequest]);
  useEffect(() => {
    if (deleteRequest) removeId(deleteRequest.id);
  }, [deleteRequest]);
  // Recettes importées depuis l’onglet « Mes recettes » : ajoutées à la bibliothèque, la recette ouverte ne change pas.
  useEffect(() => {
    if (!importRequest) return;
    persist({ ...lib, items: [...lib.items, ...importRequest.recipes.map((data) => ({ id: newId(), data }))] });
  }, [importRequest]);
  // Nouvel ordre des recettes demandé depuis l’onglet « Mes recettes ».
  useEffect(() => {
    if (!reorderRequest) return;
    const wanted = reorderRequest.ids;
    const byId = new Map(lib.items.map((x) => [x.id, x]));
    const items = [...wanted.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])), ...lib.items.filter((x) => !wanted.includes(x.id))];
    persist({ ...lib, items });
  }, [reorderRequest]);
  const hasNotes = Object.values(notes).some((t) => t.trim());
  const applyResize = () => {
    const nv = num(resizeTo ?? '');
    if (!(nv > 0) || !(num(vol) > 0)) { flash('Volume invalide'); return; }
    const d = scaleRecipe(snapshot(), nv);
    setVol(d.vol); setM(d.mrows); setH(d.hrows);
    setResizeTo(null);
    flash(`Recette redimensionnée (×${fmt(nv / num(vol), 2)})`);
  };
  const newRecipe = () => { if (guard()) add(defaultRecipe('Nouvelle recette')); };
  const switchTo = (id: string) => {
    const it = lib.items.find((x) => x.id === id);
    if (!it || id === lib.current || !guard()) return;
    persist({ ...lib, current: id });
    load(it.data);
  };
  const removeId = (target: string) => {
    const item = lib.items.find((x) => x.id === target);
    if (!item || !window.confirm(`Supprimer « ${item.data.name} » ?`)) return;
    const items = lib.items.filter((x) => x.id !== target);
    if (!items.length) {
      const d = defaultRecipe('Nouvelle recette');
      const id = newId();
      persist({ current: id, items: [{ id, data: d }] });
      load(d);
    } else if (target === lib.current) { persist({ current: items[0].id, items }); load(items[0].data); }
    else persist({ ...lib, items });
  };
  const exportHtml = () => {
    const url = URL.createObjectURL(new Blob([recipeToHtml(snapshot())], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name.trim() || 'recette').replace(/[^\p{L}\p{N}]+/gu, '-')}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importHtml = (file: File | undefined) => {
    if (!file || !guard()) return;
    file.text().then((t) => {
      const d = parseRecipeHtml(t);
      if (d) { add(d); flash('Recette importée ✓'); } else flash('Fichier non reconnu');
    });
  };
  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0];
  const yeast = YEASTS.find((y) => y.id === yeastId) ?? YEASTS[0];
  const V = num(vol), E = num(eff);
  const valid = V > 0 && E > 0;
  const r = compute(snapshot());
  const { water: mw, strikeC } = computeWater(snapshot());
  const radar = aromaProfile(hrows.map((h) => ({
    aroma: HOPS.find((x) => x.id === h.id)?.aroma ?? '', grams: num(h.grams) || 0, use: h.use, min: num(h.min) || 0,
  })));
  // Glisser un curseur du bilan : tous les malts (ou tous les houblons amérisants) sont mis à l’échelle.
  const base = useRef<{ mrows: MaltRow[]; hrows: HopRow[]; og: number; ibu: number } | null>(null);
  const startDrag = () => { if (r) base.current = { mrows, hrows, og: r.og, ibu: r.ibu }; };
  const dragOg = (v: number) => {
    const b = base.current;
    if (!b || b.og <= 1) return;
    const f = (Math.round(v * 1000) / 1000 - 1) / (b.og - 1);
    if (f > 0) setM(b.mrows.map((m) => ({ ...m, kg: fmtIn((num(m.kg) || 0) * f, 2) })));
  };
  const dragIbu = (v: number) => {
    const b = base.current;
    if (!b || b.ibu <= 0) return;
    const f = Math.max(0, Math.round(v)) / b.ibu;
    setH(b.hrows.map((h) => (h.use === 'dryhop' ? h : { ...h, grams: fmtIn((num(h.grams) || 0) * f, 1) })));
  };
  const totalKg = mrows.reduce((s, m) => s + (num(m.kg) || 0), 0);
  return (
    <section className="recipe">
      <div className="inputs">
      <div className="libbar libstack">
        <div className="libline">
          <select className="lib" aria-label="Liste des recettes" title="Choisir une recette" value="" onChange={(e) => switchTo(e.target.value)}>
            <option value="" disabled hidden>Liste</option>
            {lib.items.map((x) => <option key={x.id} value={x.id}>{x.id === lib.current ? '✓ ' : ''}{x.data.name}</option>)}
          </select>
          <input className="nm rname" aria-label="Nom de la recette" placeholder="Nom de la recette" title="Modifiez le nom, puis cliquez sur Mémoriser" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="save" onClick={save}>Mémoriser</button>
          <button className="add" onClick={() => setSaveAs(saveAs === null ? `${name.trim() || 'Recette'} (copie)` : null)}>Enregistrer sous</button>
        </div>
        <div className="libline">
          <button className="add" onClick={undo} disabled={!undoCount} title="Annuler la dernière modification">↶ Retour</button>
          <button className="add" onClick={newRecipe}>Nouvelle</button>
          <button className="add" onClick={() => removeId(lib.current)}>Supprimer</button>
          <button className="add" onClick={() => setResizeTo(resizeTo === null ? vol : null)}>Redimensionner</button>
          <button className="add" onClick={() => setShowNotes(!showNotes)}>Notes{hasNotes ? ' ●' : ''}</button>
          <details className="files"><summary className="add">Fichiers ▾</summary><div className="filemenu">
            <button className="add" onClick={exportHtml}>Exporter HTML</button>
            <label className="add">Importer HTML
              <input type="file" accept=".html,text/html" hidden onChange={(e) => { importHtml(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            <button className="add" onClick={exportXml}>Exporter BeerXML</button>
            <label className="add">Importer BeerXML
              <input type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => { importXml(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div></details>
          <span className="saved">{msg || (dirty ? '● non mémorisé' : '')}</span>
        </div>
      </div>
      {saveAs !== null && (
        <div className="panel">
          <span>Nom du clone :</span>
          <input className="wide" aria-label="Nom du clone" value={saveAs} onChange={(e) => setSaveAs(e.target.value)} />
          <button className="save" onClick={createClone}>Créer le clone</button>
          <button className="add" onClick={() => setSaveAs(null)}>Annuler</button>
          <small>L’original reste tel qu’il est mémorisé ; vous continuez sur la copie.</small>
        </div>
      )}
      {resizeTo !== null && (
        <div className="panel">
          <span>Passer de {fmt(num(vol) || 0, 1)} L à</span>
          <input aria-label="Nouveau volume en litres" inputMode="decimal" value={resizeTo} onChange={(e) => setResizeTo(e.target.value)} />
          <span>L</span>
          <button className="save" onClick={applyResize}>Appliquer</button>
          <button className="add" onClick={() => setResizeTo(null)}>Annuler</button>
          <small>Malts et houblons sont multipliés dans la même proportion.</small>
        </div>
      )}
      {showNotes && (
        <div className="notes">
          {NOTE_FIELDS.map(([k, label, ph]) => (
            <label className="field" key={k}><span>{label}</span>
              <textarea rows={3} placeholder={ph} value={notes[k]} onChange={(e) => setNotes({ ...notes, [k]: e.target.value })} /></label>
          ))}
        </div>
      )}
      <div className="top4">
        <label className="field"><span>Style</span>
          <select value={styleId} onChange={(e) => setStyleId(e.target.value)}>
            {STYLES.map((st) => <option key={st.id} value={st.id}>{st.id} – {st.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Volume (L)</span>
          <input inputMode="decimal" value={vol} onChange={(e) => setVol(e.target.value)} /></label>
        <label className="field"><span>Rendement (%)</span>
          <input inputMode="decimal" value={eff} onChange={(e) => setEff(e.target.value)} /></label>
      </div>
      <div className="sec"><h3>Malts ({fmt(totalKg, 2)} kg)</h3>
        <div className="chips" aria-label="Indicateurs de la recette">
          <Chip label="DI" value={r ? fmt(r.og, 3) : '–'} color={r ? hueColor(r.og, style.og) : undefined} />
          <Chip label="DF" value={r ? fmt(r.fg, 3) : '–'} color={r ? hueColor(r.fg, style.fg) : undefined} />
          <Chip label="IBU" value={r ? fmt(r.ibu, 0) : '–'} color={r ? hueColor(r.ibu, style.ibu) : undefined} />
          <Chip label="EBC" value={r ? fmt(r.ebc, 0) : '–'} color={r ? hueColor(r.ebc, [style.srm[0] * 1.97, style.srm[1] * 1.97]) : undefined} />
          <Chip label="ABV" value={r ? `${fmt(r.abv, 1)} %` : '–'} color={r ? hueColor(r.abv, style.abv) : undefined} />
        </div>
        <button className="add" onClick={() => setM([...mrows, { id: 'pils', kg: '1' }])}>+ Malt</button></div>
      <div className="row mrow head" aria-hidden="true"><span>Malt</span><span>EBC</span><span>Kilos</span><span>%</span><span /></div>
      {mrows.map((m, i) => (
        <div className="row mrow" key={i}>
          <Picker label="Malt" items={MALTS} value={m.id} onPick={(id) => setM(mrows.map((x, j) => (j === i ? { id, kg: x.kg } : x)))} />
          <input
            className={m.ebc !== undefined ? 'ebc custom' : 'ebc'} inputMode="decimal" aria-label="Couleur du malt en EBC (modifiable)"
            title="EBC du catalogue, modifiable pour cette recette" placeholder={ebcOf(m.id)} value={m.ebc ?? ebcOf(m.id)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setM(mrows.map((x, j) => (j === i ? { ...x, ebc: e.target.value } : x)))}
            onBlur={() => { if (m.ebc !== undefined && !m.ebc.trim()) setM(mrows.map((x, j) => (j === i ? { id: x.id, kg: x.kg } : x))); }}
          />
          <Stepper label="Kilos" step={0.1} decimals={2} value={m.kg}
            onChange={(v) => setM(mrows.map((x, j) => (j === i ? { ...x, kg: v } : x)))} />
          <output className="pct" aria-label="Pourcentage du malt">{totalKg > 0 ? `${fmt(((num(m.kg) || 0) / totalKg) * 100, 1)} %` : '–'}</output>
          <button onClick={() => setM(mrows.filter((_, j) => j !== i))} aria-label="Supprimer">×</button>
        </div>
      ))}
      <div className="sec"><h3>Houblons</h3><button className="add" onClick={() => setH([...hrows, { id: 'cascade', grams: '20', aa: '6', use: 'boil', min: '15', temp: '100' }])}>+ Houblon</button></div>
      <div className="hops">
        <div className="row hrow head" aria-hidden="true">
          <span>Houblon</span><span>% alpha-acides</span><span>Grammes</span><span>Usage</span>
          <span>Minutes</span><span>°C</span><span>IBU</span><span />
        </div>
        {hrows.map((h, i) => {
          const up = (p: Partial<HopRow>) => setH(hrows.map((x, j) => (j === i ? { ...x, ...p } : x)));
          return (
            <div className="row hrow" key={i}>
              <Picker label="Houblon" items={HOPS} value={h.id} onPick={(id) => {
                const d = HOPS.find((x) => x.id === id)!;
                up({ id: d.id, aa: String(d.aa).replace('.', ',') });
              }} />
              <input aria-label="Alpha-acides en %" inputMode="decimal" value={h.aa} onChange={(e) => up({ aa: e.target.value })} />
              <Stepper label="Grammes" step={5} decimals={1} value={h.grams} onChange={(v) => up({ grams: v })} />
              <select aria-label="Usage" value={h.use} onChange={(e) => up({ use: e.target.value as HopRow['use'], ...USE_DEFAULTS[e.target.value as HopRow['use']] })}>
                <option value="boil">Ébullition</option>
                <option value="fwh">FWH</option>
                <option value="hopstand">Hopstand</option>
                <option value="dryhop">Dry hop</option>
              </select>
              <input aria-label="Minutes" inputMode="decimal" value={h.min} disabled={h.use === 'dryhop'} onChange={(e) => up({ min: e.target.value })} />
              <input aria-label="Température en °C" inputMode="decimal" value={h.use === 'hopstand' ? h.temp : h.use === 'dryhop' ? '' : '100'} disabled={h.use !== 'hopstand'} onChange={(e) => up({ temp: e.target.value })} />
              <output className="ibu" aria-label="IBU de la ligne">{r ? fmt(r.hopIbu[i] ?? 0, 1) : '–'}</output>
              <button onClick={() => setH(hrows.filter((_, j) => j !== i))} aria-label="Supprimer">×</button>
            </div>
          );
        })}
      </div>
      <p className="hint">Profil aromatique : {hrows.map((h) => HOPS.find((x) => x.id === h.id)?.aroma).join(' / ')}.</p>
      <div className="sec"><h3>Levure</h3></div>
      <div className="row yrow head" aria-hidden="true"><span>Levure</span><span>Atténuation</span><span>Fermentation</span></div>
      <div className="row yrow">
        <Picker label="Levure" items={YEASTS} value={yeastId} onPick={setYeastId} />
        <output className="pct" aria-label="Atténuation typique">{yeast.attenuationPct} %</output>
        <output className="pct" aria-label="Température de fermentation">{yeast.tempC} °C</output>
      </div>
      <details className="mash">
        <summary>Empâtage et volumes d’eau</summary>
        <div className="row msrow head" aria-hidden="true"><span>Étape</span><span>°C</span><span>Min</span><span /></div>
        {mash.map((st, i) => {
          const up = (p: Partial<MashStep>) => setMash(mash.map((x, j) => (j === i ? { ...x, ...p } : x)));
          return (
            <div className="row msrow" key={i}>
              <input aria-label="Étape" value={st.name} onChange={(e) => up({ name: e.target.value })} />
              <input aria-label="Température" inputMode="decimal" value={st.temp} onChange={(e) => up({ temp: e.target.value })} />
              <input aria-label="Minutes" inputMode="decimal" value={st.min} onChange={(e) => up({ min: e.target.value })} />
              <button onClick={() => setMash(mash.filter((_, j) => j !== i))} aria-label="Supprimer">×</button>
            </div>
          );
        })}
        <button className="add" onClick={() => setMash([...mash, { name: 'Palier', temp: '70', min: '15' }])}>+ Palier</button>
        <div className="wgrid">
          {WATER_FIELDS.map(([k, label]) => (
            <label className="field" key={k}><span>{label}</span>
              <input inputMode="decimal" value={water[k]} onChange={(e) => setWater({ ...water, [k]: e.target.value })} /></label>
          ))}
        </div>
        {mw ? (
          <>
            <div className="result"><span>Eau d’empâtage</span><strong>{fmt(mw.strikeL)} L{strikeC !== null ? ` à ${fmt(strikeC, 0)} °C` : ''}</strong></div>
            <div className="result"><span>Eau de rinçage</span><strong>{fmt(mw.spargeL)} L</strong></div>
            <div className="result"><span>Volume pré-ébullition</span><strong>{fmt(mw.preBoilL)} L</strong></div>
          </>
        ) : <p className="hint">Renseignez des malts, un volume et les paramètres d’eau.</p>}
      </details>
      </div>
      <aside className="bilan">
      <h3>Bilan comparé au style {style.id}</h3>
      {r ? (
        <>
          <Gauge label="Densité initiale" value={r.og} range={style.og} d={3} step={0.001} hint="Glissez pour ajuster la quantité de tous les malts" onDragStart={startDrag} onDrag={dragOg} />
          <Gauge label="Densité finale" value={r.fg} range={style.fg} d={3} />
          <Gauge label="Alcool (% vol.)" value={r.abv} range={style.abv} />
          <Gauge label="Amertume (IBU)" value={r.ibu} range={style.ibu} step={1} hint="Glissez pour ajuster les houblons amérisants (le dry hop ne change pas)" onDragStart={startDrag} onDrag={dragIbu} />
          <Gauge label="Couleur (EBC)" value={r.ebc} range={[style.srm[0] * 1.97, style.srm[1] * 1.97]} />
          <p className="hint">Rapport IBU/DI : {fmt(r.buGu, 2)}</p>
        </>
      ) : <p className="hint">Saisissez un volume et un rendement valides.</p>}
      <h3>Association des houblons</h3>
      {radar.some((v) => v > 0)
        ? <Radar labels={[...FAMILIES]} values={radar} colors={FAMILY_COLORS} />
        : <p className="hint">Aucun arôme renseigné pour les houblons de cette recette.</p>}
      <h3>Profil de la levure</h3>
      <Radar labels={[...YEAST_FAMILIES]} values={yeastProfile(yeast)} colors={YEAST_COLORS} />
      <p className="hint">Estimation à partir du type de levure.</p>
      </aside>
    </section>
  );
}
