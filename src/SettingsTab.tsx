import { useState } from 'react';
import { compute, type RecipeState } from './library';
import { PRESETS, matchPreset, setSettings, settings, type GravityMode, type Settings } from './settings';

/** IBU de la recette sous un réglage donné, sans modifier les réglages en vigueur. */
function ibuUnder(d: RecipeState, s: Settings): number | null {
  const keep = { ...settings };
  setSettings(s, false);
  try { return compute(d)?.ibu ?? null; } finally { setSettings(keep, false); }
}

const MODES: [GravityMode, string][] = [
  ['og', 'Densité initiale (comme BeerSmith)'], ['mean', 'Moyenne avant et après ébullition (Tinseth d’origine)'], ['pre', 'Densité avant ébullition (estimée)'],
];

/** Calibrage du calcul de l’amertume, pour se rapprocher d’un autre logiciel de référence. */
export default function SettingsTab({ recipe, onChange }: { recipe: RecipeState | null; onChange: () => void }) {
  const [, bump] = useState(0);
  const apply = (s: Partial<Settings>) => { setSettings(s); bump((n) => n + 1); onChange(); };
  const current = matchPreset(settings);
  const ibu = recipe ? compute(recipe)?.ibu : null;
  return (
    <div className="wide">
      <section>
        <h2>Calibrage de l’amertume</h2>
        <p className="hint">
          Les logiciels de brassage calculent les IBU avec des hypothèses différentes. Ces réglages s’appliquent à <b>toutes les recettes</b> et à tous
          les calculs du site ; ils ne sont pas enregistrés dans les fichiers exportés. Le réglage par défaut est celui de BeerSmith.
        </p>
        <div className="seg" role="group" aria-label="Réglages prédéfinis">
          {PRESETS.map((p) => (
            <button key={p.id} className={current === p.id ? 'on' : ''} onClick={() => apply(p.settings)}>{p.label}</button>
          ))}
        </div>
        {current === 'custom' && <p className="hint">Réglage personnalisé.</p>}
        <div className="two" style={{ marginTop: 10 }}>
          <label className="field"><span>Bonus granulés (%), appliqué à tous les houblons</span>
            <input type="number" min={0} max={30} step={1} value={settings.pelletPct} onChange={(e) => apply({ pelletPct: Number(e.target.value) })} /></label>
          <label className="field"><span>Bonus du premier moût, FWH (%)</span>
            <input type="number" min={0} max={50} step={1} value={settings.fwhPct} onChange={(e) => apply({ fwhPct: Number(e.target.value) })} /></label>
        </div>
        <label className="field"><span>Densité utilisée dans la formule de Tinseth</span>
          <select value={settings.gravityMode} onChange={(e) => apply({ gravityMode: e.target.value as GravityMode })}>
            {MODES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <div className="result"><span>Amertume de la recette en cours</span><strong>{ibu !== null && ibu !== undefined ? `${ibu.toFixed(1).replace('.', ',')} IBU` : '–'}</strong></div>
      </section>
      {recipe && (
        <section>
          <h3>La même recette selon chaque réglage</h3>
          <table className="tbl tight">
            <tbody>
              {PRESETS.map((p) => {
                const v = ibuUnder(recipe, p.settings);
                return <tr key={p.id}><td>{p.label}</td><td>{v !== null ? `${v.toFixed(1).replace('.', ',')} IBU` : '–'}</td></tr>;
              })}
            </tbody>
          </table>
          <p className="hint">
            Les réglages « approx. » ont été ajustés sur une seule recette comparée dans trois logiciels : ils donnent un ordre de grandeur, pas la valeur exacte du logiciel.
            Seule une analyse en laboratoire donne l’amertume réelle.
          </p>
        </section>
      )}
    </div>
  );
}
