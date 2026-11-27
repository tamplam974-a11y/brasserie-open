import { useState } from 'react';
import { LAST_BACKUP_KEY, applyBackup, isBackup, makeBackup, summarize, type Backup, type Store } from './backup';
import { downloadText } from './download';

const store: Store = { read: (k) => localStorage.getItem(k), write: (k, v) => localStorage.setItem(k, v) };

const line = (s: ReturnType<typeof summarize>) =>
  `${s.recipes} recette(s), ${s.malts} malt(s), ${s.hops} houblon(s), ${s.yeasts} levure(s), ${s.styles} style(s) personnalisé(s), ${s.readings} relevé(s) de densimètre, ${s.lots} lot(s) en stock`;

/** Sauvegarde et transfert de toutes les données entre navigateurs ou entre la version locale et la version en ligne. */
export default function BackupTab() {
  const [pending, setPending] = useState<Backup | null>(null);
  const [note, setNote] = useState('');
  const mine = (() => { try { return summarize(makeBackup(store.read)); } catch { return null; } })();
  const exportAll = () => {
    try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch { /* sans effet */ }
    downloadText(JSON.stringify(makeBackup(store.read), null, 2), `brasserie-open-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };
  const apply = (mode: 'merge' | 'replace') => {
    if (!pending) return;
    if (mode === 'replace' && !window.confirm('Remplacer vos données par celles du fichier ?')) return;
    try { applyBackup(pending, mode, store); location.reload(); } catch { setNote('Écriture impossible dans ce navigateur.'); }
  };
  return (
    <div className="wide">
      <section>
        <h2>Sauvegarde et transfert</h2>
        <p className="hint">
          Vos recettes, ingrédients et styles personnalisés sont enregistrés <b>dans ce navigateur, pour cette adresse</b> (la version en ligne et la version sur votre PC sont deux espaces séparés).
          Ce fichier permet de les déplacer ou de les mettre à l’abri. Mémorisez d’abord vos recettes en cours : seules les recettes mémorisées sont sauvegardées.
        </p>
        {mine && <p>Dans ce navigateur : {line(mine)}.</p>}
        <p>Dernière sauvegarde exportée : <b>{(() => { const t = Number(localStorage.getItem(LAST_BACKUP_KEY)); return t > 0 ? new Date(t).toLocaleString('fr-FR') : 'jamais'; })()}</b>.</p>
        <div className="csvbar">
          <button className="save" onClick={exportAll}>Exporter toutes mes données</button>
          <label className="add">Importer une sauvegarde
            <input type="file" accept=".json,application/json" hidden onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              file.text().then((t) => {
                try { const o: unknown = JSON.parse(t); if (isBackup(o)) { setPending(o); setNote(''); } else setNote('Fichier de sauvegarde non reconnu.'); }
                catch { setNote('Fichier de sauvegarde non reconnu.'); }
              });
            }} />
          </label>
        </div>
        {note && <p className="hint"><b>{note}</b></p>}
        {pending && (
          <div className="panel">
            <span>Le fichier contient : {line(summarize(pending))}.</span>
            <button className="save" onClick={() => apply('merge')}>Fusionner avec mes données</button>
            <button className="add danger" onClick={() => apply('replace')}>Remplacer mes données</button>
            <button className="add" onClick={() => setPending(null)}>Annuler</button>
            <small>« Fusionner » garde tout ce que vous avez et ajoute ce qui manque. La page se recharge ensuite.</small>
          </div>
        )}
      </section>
    </div>
  );
}
