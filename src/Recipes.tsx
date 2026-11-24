import { useState, type DragEvent } from 'react';
import { srmColor } from './beerColor';
import { STYLES } from './data/styles';
import { parseBeerXml, recipesToBeerXml } from './beerxml';
import { downloadText } from './download';
import { compute, loadLibrary, recipeNumber, type RecipeState } from './library';
import { parseRecipesCsv, recipesToCsv } from './recipesCsv';

type Sort = 'manual' | 'name' | 'num' | 'numdesc' | 'abv' | 'ibu' | 'ebc' | 'og';
const f = (x: number, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Toutes les recettes mémorisées, en cartes ou en liste, réorganisables à la main. */
export default function Recipes({ onOpen, onDelete, onReorder, onImport }: {
  onOpen: (id: string) => void; onDelete: (id: string) => void; onReorder: (ids: string[]) => void; onImport: (ds: RecipeState[]) => void;
}) {
  const [note, setNote] = useState('');
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [q, setQ] = useState('');
  const [numQ, setNumQ] = useState('');
  const [sort, setSort] = useState<Sort>('manual');
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const lib = loadLibrary();
  const exportXml = () => downloadText(recipesToBeerXml(lib.items.map((x) => x.data)), 'mes-recettes.xml', 'application/xml');
  const exportCsv = () => downloadText(recipesToCsv(lib.items.map((x) => x.data)), 'mes-recettes.csv');
  const importFile = (file: File | undefined, kind: 'xml' | 'csv') => {
    if (!file) return;
    file.text().then((t) => {
      const ds = kind === 'xml' ? parseBeerXml(t) : parseRecipesCsv(t);
      if (!ds?.length) { setNote('Fichier non reconnu.'); return; }
      onImport(ds);
      setNote(`${ds.length} recette(s) ajoutée(s) à la bibliothèque.`);
    });
  };
  const all = lib.items.map(({ id, data }) => ({ id, data, r: compute(data), style: STYLES.find((s) => s.id === data.styleId), current: id === lib.current }));
  const rows = all
    .filter((x) => `${x.data.name} ${x.data.styleId} ${x.style?.name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((x) => !numQ.trim() || String(recipeNumber(x.data.name) ?? '').startsWith(numQ.trim().replace(/^#/, '')))
    .sort((a, b) => {
      if (sort === 'manual') return 0;
      if (sort === 'name') return a.data.name.localeCompare(b.data.name, 'fr');
      if (sort === 'num' || sort === 'numdesc') {
        const na = recipeNumber(a.data.name), nb = recipeNumber(b.data.name);
        if (na === null || nb === null) return na === nb ? 0 : na === null ? 1 : -1;
        return sort === 'num' ? na - nb : nb - na;
      }
      return (b.r?.[sort] ?? 0) - (a.r?.[sort] ?? 0);
    });
  const manual = sort === 'manual' && !q.trim() && !numQ.trim();
  const ids = all.map((x) => x.id);
  const move = (id: string, delta: -1 | 1) => {
    const i = ids.indexOf(id), j = i + delta;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next);
  };
  const drop = (target: string) => {
    if (drag && drag !== target) {
      const from = ids.indexOf(drag), to = ids.indexOf(target);
      const next = ids.filter((x) => x !== drag);
      next.splice(from < to ? next.indexOf(target) + 1 : next.indexOf(target), 0, drag);
      onReorder(next);
    }
    setDrag(null);
    setOver(null);
  };
  const dnd = (id: string) => (manual ? {
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => { setDrag(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); },
    onDragOver: (e: DragEvent<HTMLElement>) => { e.preventDefault(); setOver(id); },
    onDrop: (e: DragEvent<HTMLElement>) => { e.preventDefault(); drop(id); },
    onDragEnd: () => { setDrag(null); setOver(null); },
  } : {});
  const cls = (base: string, id: string) => `${base}${drag === id ? ' dragging' : ''}${over === id && drag && drag !== id ? ' over' : ''}`;
  const styleLabel = (x: (typeof rows)[number]) => (x.style ? `${x.style.id} – ${x.style.name}` : x.data.styleId);
  return (
    <div className="wide">
      <section>
        <div className="top">
          <h2>Mes recettes <small>({lib.items.length})</small></h2>
          <div className="seg" role="group" aria-label="Affichage">
            <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>Cartes</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>Liste</button>
          </div>
        </div>
        <div className="libbar">
          <input className="nm" placeholder="Rechercher (nom, style)" aria-label="Rechercher une recette" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="numq" placeholder="N°" inputMode="numeric" aria-label="Rechercher par numéro de recette" title="Numéro de recette : le nombre au début du nom" value={numQ} onChange={(e) => setNumQ(e.target.value)} />
          <select aria-label="Trier par" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="manual">Ordre manuel</option>
            <option value="name">Trier par nom</option>
            <option value="num">Numéro croissant</option>
            <option value="numdesc">Numéro décroissant</option>
            <option value="abv">Alcool décroissant</option>
            <option value="ibu">Amertume décroissante</option>
            <option value="ebc">Couleur décroissante</option>
            <option value="og">Densité décroissante</option>
          </select>
          <details className="files"><summary className="add">Fichiers ▾</summary><div className="filemenu">
            <button className="add" onClick={exportXml}>Tout exporter en BeerXML</button>
            <label className="add">Importer un BeerXML
              <input type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => { importFile(e.target.files?.[0], 'xml'); e.target.value = ''; }} />
            </label>
            <button className="add" onClick={exportCsv}>Tout exporter en CSV</button>
            <label className="add">Importer un CSV
              <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => { importFile(e.target.files?.[0], 'csv'); e.target.value = ''; }} />
            </label>
          </div></details>
        </div>
        {rows.length === 0 && <p className="hint">Aucune recette ne correspond.</p>}
        {view === 'cards' ? (
          <div className="rcards">
            {rows.map((x) => (
              <article className={cls('rcard', x.id)} key={x.id} {...dnd(x.id)}>
                <div className="swatch" style={{ background: x.r ? srmColor(x.r.srm) : 'var(--line)' }} />
                <h3>{x.data.name}{x.current && <small> · ouverte</small>}</h3>
                <p className="sub">{styleLabel(x)} · {x.data.vol} L</p>
                {x.r && (
                  <dl className="stats">
                    <div><dt>DI</dt><dd>{f(x.r.og, 3)}</dd></div>
                    <div><dt>Alcool</dt><dd>{f(x.r.abv)} %</dd></div>
                    <div><dt>IBU</dt><dd>{f(x.r.ibu, 0)}</dd></div>
                    <div><dt>EBC</dt><dd>{f(x.r.ebc, 0)}</dd></div>
                  </dl>
                )}
                <p className="sub">{x.data.mrows.length} malt(s) · {x.data.hrows.length} houblon(s)</p>
                <div className="cardbtns">
                  <button className="save" onClick={() => onOpen(x.id)}>Ouvrir</button>
                  <button className="add danger" onClick={() => onDelete(x.id)}>Supprimer</button>
                  {manual && (
                    <span className="mv">
                      <button className="x" aria-label="Avancer" title="Avancer" disabled={ids.indexOf(x.id) === 0} onClick={() => move(x.id, -1)}>◀</button>
                      <button className="x" aria-label="Reculer" title="Reculer" disabled={ids.indexOf(x.id) === ids.length - 1} onClick={() => move(x.id, 1)}>▶</button>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="tablewrap">
            <table className="tbl tight">
              <thead><tr><th /><th>Recette</th><th>Style</th><th>Vol.</th><th>DI</th><th>Alcool</th><th>IBU</th><th>EBC</th><th /></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id} className={cls('', x.id).trim()} {...dnd(x.id)}>
                    <td><i className="dot" style={{ background: x.r ? srmColor(x.r.srm) : 'var(--line)' }} /></td>
                    <td><b>{x.data.name}</b>{x.current && <small> · ouverte</small>}</td>
                    <td>{styleLabel(x)}</td>
                    <td>{x.data.vol} L</td>
                    <td>{x.r ? f(x.r.og, 3) : '–'}</td>
                    <td>{x.r ? `${f(x.r.abv)} %` : '–'}</td>
                    <td>{x.r ? f(x.r.ibu, 0) : '–'}</td>
                    <td>{x.r ? f(x.r.ebc, 0) : '–'}</td>
                    <td className="rowbtns">
                      <button className="add" onClick={() => onOpen(x.id)}>Ouvrir</button>
                      <button className="x" aria-label={`Supprimer ${x.data.name}`} title="Supprimer" onClick={() => onDelete(x.id)}>×</button>
                      {manual && (
                        <>
                          <button className="x" aria-label="Monter" title="Monter" disabled={ids.indexOf(x.id) === 0} onClick={() => move(x.id, -1)}>↑</button>
                          <button className="x" aria-label="Descendre" title="Descendre" disabled={ids.indexOf(x.id) === ids.length - 1} onClick={() => move(x.id, 1)}>↓</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {note && <p className="hint"><b>{note}</b></p>}
        <p className="hint">
          {manual ? 'Glissez-déposez une recette sur une autre (ou utilisez les flèches) pour changer l’ordre.' : 'Pour réorganiser : choisissez « Ordre manuel » et videz la recherche.'}
          {' '}Chiffres de la dernière version mémorisée de chaque recette.
        </p>
      </section>
    </div>
  );
}
