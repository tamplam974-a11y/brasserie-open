import { useState } from 'react';
import { carbRange, kegPressure, midpoint, primingSugar } from './carbonation';
import { STYLES } from './data/styles';
import { SUGARS, abvFromPrimingSugar, type SugarKind } from './engine';
import type { RecipeState } from './library';

const num = (s: string) => parseFloat(s.replace(',', '.'));
const f = (x: number, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtIn = (x: number) => String(x).replace('.', ',');

/** Carbonatation en bouteille (sucre de ressucrage) et pression en fût, selon le style et la température. */
export default function Carbonation({ recipe }: { recipe: RecipeState | null }) {
  const [styleId, setStyleId] = useState(recipe?.styleId ?? '21A');
  const [vol, setVol] = useState(recipe?.vol ?? '20');
  const [target, setTarget] = useState(() => fmtIn(midpoint(carbRange(recipe?.styleId ?? '21A'))));
  const [temp, setTemp] = useState('20');
  const [sugar, setSugar] = useState<SugarKind>('saccharose');
  const [kegT, setKegT] = useState('4');
  const range = carbRange(styleId);
  const [V, T, Tf, Tk] = [num(vol), num(target), num(temp), num(kegT)];
  const p = V > 0 && T > 0 && Number.isFinite(Tf) ? primingSugar({ volumeL: V, targetVol: T, tempC: Tf, sugar }) : null;
  const kp = T > 0 && Number.isFinite(Tk) ? kegPressure(Tk, T) : null;
  const changeStyle = (id: string) => { setStyleId(id); setTarget(fmtIn(midpoint(carbRange(id)))); };
  return (
    <div className="wide">
      <section>
        <div className="top">
          <h2>Carbonatation</h2>
          <button className="add" disabled={!recipe} onClick={() => { if (recipe) { changeStyle(recipe.styleId); setVol(recipe.vol); } }}>Reprendre la recette en cours</button>
        </div>
        <label className="field"><span>Style</span>
          <select value={styleId} onChange={(e) => changeStyle(e.target.value)}>
            {STYLES.map((s) => <option key={s.id} value={s.id}>{s.id} – {s.name}</option>)}
          </select>
        </label>
        <p className="hint">Fourchette usuelle pour ce style : {f(range[0])} à {f(range[1])} volumes de CO2 (valeurs de brasseur, pas du BJCP).</p>
        <label className="field"><span>Volumes de CO2 visés : <b>{Number.isFinite(T) ? f(T) : '–'}</b></span>
          <input type="range" min="1" max="4.5" step="0.1" value={Number.isFinite(T) ? T : 2.4} onChange={(e) => setTarget(fmtIn(+e.target.value))} />
        </label>
        <div className="two">
          <label className="field"><span>Volume de bière à carbonater (L)</span><input inputMode="decimal" value={vol} onChange={(e) => setVol(e.target.value)} /></label>
          <label className="field"><span>Température de fermentation (°C)</span><input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} /></label>
        </div>
        <p className="hint">Prenez la température la plus haute atteinte par la bière après la fermentation : elle fixe le CO2 qui reste dissous.</p>
        <label className="field"><span>Sucre de ressucrage</span>
          <select value={sugar} onChange={(e) => setSugar(e.target.value as SugarKind)}>
            {Object.entries(SUGARS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        {p ? (
          <>
            <div className="result"><span>CO2 déjà dissous</span><strong>{f(p.residual, 2)} vol.</strong></div>
            <div className="result"><span>CO2 à produire</span><strong>{f(p.toAdd, 2)} vol.</strong></div>
            <div className="result"><span>Sucre à ajouter</span><strong>{f(p.totalG)} g ({f(p.gPerL, 2)} g/L)</strong></div>
            <div className="result"><span>Alcool apporté</span><strong>+ {f(abvFromPrimingSugar(p.gPerL, SUGARS[sugar].ethanolGPerG), 2)} %</strong></div>
            {p.toAdd === 0 && <p className="hint">Le CO2 déjà dissous suffit : pas de sucre à ajouter.</p>}
            {T > 3.5 && <p className="hint">Au-delà de 3,5 volumes, utilisez des bouteilles renforcées (type champagne) et vérifiez leur résistance.</p>}
          </>
        ) : <p className="hint">Saisissez un volume, une température et un niveau de CO2 valides.</p>}
        <h3>Mise en fût (carbonatation forcée)</h3>
        <label className="field"><span>Température du fût (°C)</span><input inputMode="decimal" value={kegT} onChange={(e) => setKegT(e.target.value)} /></label>
        {kp && <div className="result"><span>Pression pour {f(T)} volumes</span><strong>{f(kp.bar, 2)} bar ({f(kp.psi)} psi)</strong></div>}
        <p className="hint">Pression manométrique, à appliquer plusieurs jours. Les coefficients de sucre sont des valeurs usuelles : quand c’est possible, vérifiez avec une pesée et prélevez une bouteille test.</p>
      </section>
    </div>
  );
}
