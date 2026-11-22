import { useState } from 'react';
import { parseStyles } from './csv';
import { STYLES, removeStyle, upsertStyles } from './data/styles';
import { downloadText } from './download';

const f = (x: number, d = 0) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const FORM: [string, string][] = [
  ['id', 'N° (ex. 21A)'], ['name', 'Nom'], ['ogmin', 'DI min'], ['ogmax', 'DI max'], ['fgmin', 'DF min'], ['fgmax', 'DF max'],
  ['ibumin', 'IBU min'], ['ibumax', 'IBU max'], ['srmmin', 'SRM min'], ['srmmax', 'SRM max'], ['abvmin', 'Alcool min'], ['abvmax', 'Alcool max'],
];
const TEMPLATE = 'id;nom;og_min;og_max;fg_min;fg_max;ibu_min;ibu_max;srm_min;srm_max;abv_min;abv_max\nX1;Ma bière maison;1,045;1,055;1,010;1,014;20;30;8;14;4,5;5,5\n';

/** Styles de bière : liste, ajout à la main et import CSV (les fichiers venant de la source officielle du style guide). */
export default function StylesTab() {
  const [, bump] = useState(0);
  const [q, setQ] = useState('');
  const [v, setV] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const run = (text: string) => {
    const { rows, errors } = parseStyles(text);
    const bad = errors.length ? ` ${errors.length} ligne(s) ignorée(s) (${errors.slice(0, 2).join(' ; ')}${errors.length > 2 ? ' …' : ''}).` : '';
    if (!rows.length) return `Aucun style valide.${bad || ' Fichier vide.'}`;
    const res = upsertStyles(rows);
    bump((n) => n + 1);
    return `${res.added} ajouté(s), ${res.replaced} remplacé(s).${bad}`;
  };
  const shown = STYLES.filter((s) => `${s.id} ${s.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="wide">
      <section>
        <h2>Styles <small>({STYLES.length})</small></h2>
        <div className="csvbar">
          <label className="add">Importer CSV
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) file.text().then((t) => setNote(run(t)));
            }} />
          </label>
          <button className="add" onClick={() => downloadText(TEMPLATE, 'modele-styles.csv')}>Modèle CSV</button>
        </div>
        <p className="hint">Colonnes : id, nom, og_min, og_max, fg_min, fg_max, ibu_min, ibu_max, srm_min, srm_max (ou ebc_min, ebc_max), abv_min, abv_max. Un style importé avec un numéro déjà présent remplace l’existant.</p>
        {note && <p className="hint"><b>{note}</b></p>}
        <h3>Ajouter un style</h3>
        <div className="stylegrid">
          {FORM.map(([k, label]) => (
            <input key={k} placeholder={label} aria-label={label} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
          ))}
          <button className="save" onClick={() => {
            const line = FORM.map(([k]) => (v[k] ?? '').replace(/;/g, ',')).join(';');
            const msg = run(line);
            setNote(msg);
            if (!msg.startsWith('Aucun')) setV({});
          }}>Ajouter</button>
        </div>
      </section>
      <section>
        <div className="top">
          <h2>Tous les styles</h2>
          <input className="nm" placeholder="Filtrer (numéro, nom)" aria-label="Filtrer les styles" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tablewrap tall">
          <table className="tbl">
            <thead><tr><th>N°</th><th>Style</th><th>DI</th><th>DF</th><th>IBU</th><th>EBC</th><th>Alcool</th><th /></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td><b>{s.name}</b>{s.custom && <small> · perso</small>}</td>
                  <td>{f(s.og[0], 3)}–{f(s.og[1], 3)}</td>
                  <td>{f(s.fg[0], 3)}–{f(s.fg[1], 3)}</td>
                  <td>{f(s.ibu[0])}–{f(s.ibu[1])}</td>
                  <td>{f(s.srm[0] * 1.97)}–{f(s.srm[1] * 1.97)}</td>
                  <td>{f(s.abv[0], 1)}–{f(s.abv[1], 1)} %</td>
                  <td>{s.custom && <button className="x" aria-label={`Supprimer ${s.name}`} title="Supprimer" onClick={() => { removeStyle(s.id); bump((n) => n + 1); }}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
