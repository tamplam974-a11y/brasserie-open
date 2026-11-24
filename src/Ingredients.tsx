import { useState } from 'react';
import { HOPS, MALTS, YEASTS, addHop, addMalt, addYeast, importHops, importMalts, importYeasts, removeCustom, type Hop, type ImportResult, type Malt, type Yeast } from './data/ingredients';
import { hopsToCsv, maltsToCsv, parseHops, parseMalts, parseYeasts, yeastsToCsv } from './csv';

const num = (s: string) => parseFloat(s.replace(',', '.'));

function download(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function summary(res: ImportResult, errors: string[]): string {
  const bad = errors.length
    ? ` ${errors.length} ligne(s) ignorée(s) (${errors.slice(0, 2).join(' ; ')}${errors.length > 2 ? ' …' : ''}).`
    : '';
  const rep = res.replaced.length
    ? ` Catalogue indicatif remplacé : ${res.replaced.join(', ')}. Revoyez les recettes qui utilisaient ces ingrédients.`
    : '';
  return `${res.added} ajouté(s), ${res.updated} mis à jour.${rep}${bad}`;
}

interface Item { id: string; name: string; brand?: string; custom?: boolean }

function Catalog<T extends Item>(p: {
  title: string; items: T[]; fields: [string, string][]; detail: (x: T) => string;
  onAdd: (v: Record<string, string>) => boolean; onDelete: (id: string) => void;
  onImportText: (text: string) => string; template: string; filename: string;
  onExport: () => void; canExport: boolean;
}) {
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const [v, setV] = useState<Record<string, string>>({});
  const shown = p.items.filter((x) => `${x.brand ?? ''} ${x.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section>
      <h2>{p.title} <small>({p.items.length})</small></h2>
      <div className="csvbar">
        <label className="add">Importer CSV
          <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) f.text().then((t) => setNote(p.onImportText(t)));
          }} />
        </label>
        <button className="add" onClick={() => download(p.template, p.filename)}>Modèle CSV</button>
        <button className="add" disabled={!p.canExport} title="Exporte vos ingrédients personnalisés et importés, au même format que l’import" onClick={p.onExport}>Exporter CSV</button>
      </div>
      {note && <p className="hint">{note}</p>}
      <div className="iform">
        {p.fields.map(([k, label]) => (
          <input key={k} placeholder={label} aria-label={label} value={v[k] ?? ''}
            onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        ))}
        <button className="save" onClick={() => { if (p.onAdd(v)) setV({}); }}>Ajouter</button>
      </div>
      <input className="nm filter" placeholder="Filtrer la liste" aria-label="Filtrer" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="ilist">
        {shown.map((x) => (
          <div className="irow" key={x.id}>
            <span><b>{x.name}</b><br /><small>{p.detail(x)}</small></span>
            {x.custom && <button onClick={() => p.onDelete(x.id)} aria-label={`Supprimer ${x.name}`}>×</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Ingredients() {
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);
  return (
    <>
      <div className="ingr">
        <Catalog<Malt>
          title="Malts" items={MALTS}
          fields={[['name', 'Nom'], ['ebc', 'Couleur (EBC)'], ['ext', 'Extrait (%)']]}
          detail={(m) => `${m.ebc} EBC · extrait ${m.extractPct} %`}
          onAdd={(v) => {
            const ebc = num(v.ebc ?? ''), ext = num(v.ext ?? '');
            if (!v.name?.trim() || !(ebc >= 0) || !(ext > 0 && ext <= 100)) return false;
            addMalt({ name: v.name.trim(), ebc, extractPct: ext });
            refresh();
            return true;
          }}
          onDelete={(id) => { removeCustom(MALTS, id); refresh(); }}
          filename="modele-malts.csv"
          canExport={MALTS.some((x) => x.custom)}
          onExport={() => download(maltsToCsv(MALTS.filter((x) => x.custom)), 'mes-malts.csv')}
          template={'nom;marque;ebc;extrait\nPilsen;Ma Malterie;3,5;81\nCaramel 120;Ma Malterie;120;74\n'}
          onImportText={(t) => { const { rows, errors } = parseMalts(t); const r = importMalts(rows); refresh(); return rows.length ? summary(r, errors) : `Aucune ligne valide. ${errors[0] ?? 'Fichier vide.'}`; }}
        />
        <Catalog<Hop>
          title="Houblons" items={HOPS}
          fields={[['name', 'Nom'], ['aa', 'Alpha-acides (%)'], ['aroma', 'Arômes (facultatif)']]}
          detail={(h) => `${h.aa} % AA${h.aroma ? ` · ${h.aroma}` : ''}`}
          onAdd={(v) => {
            const aa = num(v.aa ?? '');
            if (!v.name?.trim() || !(aa > 0 && aa <= 40)) return false;
            addHop({ name: v.name.trim(), aa, aroma: v.aroma?.trim() ?? '' });
            refresh();
            return true;
          }}
          onDelete={(id) => { removeCustom(HOPS, id); refresh(); }}
          filename="modele-houblons.csv"
          canExport={HOPS.some((x) => x.custom)}
          onExport={() => download(hopsToCsv(HOPS.filter((x) => x.custom)), 'mes-houblons.csv')}
          template={'nom;marque;alpha;aromes\nMon houblon;Ma Ferme;12,5;agrumes, résine\n'}
          onImportText={(t) => { const { rows, errors } = parseHops(t); const r = importHops(rows); refresh(); return rows.length ? summary(r, errors) : `Aucune ligne valide. ${errors[0] ?? 'Fichier vide.'}`; }}
        />
        <Catalog<Yeast>
          title="Levures" items={YEASTS}
          fields={[['name', 'Nom'], ['att', 'Atténuation (%)'], ['temp', 'Fermentation (ex. 18–22)']]}
          detail={(y) => `atténuation ${y.attenuationPct} %${y.tempC ? ` · ${y.tempC} °C` : ''}`}
          onAdd={(v) => {
            const att = num(v.att ?? '');
            if (!v.name?.trim() || !(att > 0 && att <= 100)) return false;
            addYeast({ name: v.name.trim(), attenuationPct: att, tempC: v.temp?.trim() ?? '' });
            refresh();
            return true;
          }}
          onDelete={(id) => { removeCustom(YEASTS, id); refresh(); }}
          filename="modele-levures.csv"
          canExport={YEASTS.some((x) => x.custom)}
          onExport={() => download(yeastsToCsv(YEASTS.filter((x) => x.custom)), 'mes-levures.csv')}
          template={'nom;marque;attenuation;temperature;type\nMa levure ale;Mon Labo;75-80;18-22;ale\nMa levure lager;Mon Labo;80;10-14;lager\n'}
          onImportText={(t) => { const { rows, errors } = parseYeasts(t); const r = importYeasts(rows); refresh(); return rows.length ? summary(r, errors) : `Aucune ligne valide. ${errors[0] ?? 'Fichier vide.'}`; }}
        />
      </div>
      <p className="hint">Les valeurs des catalogues Best Malz, Dingemans, Lallemand, Wyeast, White Labs et Kveik sont indicatives : vérifiez-les sur la fiche du fabricant. Seuls les ingrédients personnalisés peuvent être supprimés.</p>
    </>
  );
}
