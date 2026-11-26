import { HOPS, MALTS, YEASTS } from './data/ingredients';
import { STYLES } from './data/styles';
import { compute, computeWater, type RecipeState } from './library';
import { boilSchedule } from './sheet';

const num = (s: string) => parseFloat(String(s).replace(',', '.'));
const f = (x: number, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const Blank = ({ w = 90 }: { w?: number }) => <span className="blank" style={{ width: w }} />;
const Check = () => <input type="checkbox" className="chk" aria-label="Fait" />;
const USE: Record<string, string> = { boil: 'Ébullition', fwh: 'FWH', hopstand: 'Hopstand', dryhop: 'Dry hop', mash: 'Mash hopping' };

/** Fiche de brassage imprimable, tirée de la recette en cours dans l’éditeur. */
export default function BrewSheet({ recipe: d }: { recipe: RecipeState | null }) {
  if (!d) {
    return <div className="wide"><section><h2>Fiche de brassage</h2><p className="hint">Ouvrez d’abord une recette dans l’onglet Accueil.</p></section></div>;
  }
  const r = compute(d);
  const { water, strikeC } = computeWater(d);
  const style = STYLES.find((s) => s.id === d.styleId);
  const yeast = YEASTS.find((y) => y.id === d.yeastId);
  const kg = d.mrows.reduce((s, m) => s + (num(m.kg) || 0), 0);
  const notes: [string, string][] = [['Avant', d.notes.before], ['Pendant', d.notes.during], ['Après', d.notes.after]];
  return (
    <div className="wide sheet">
      <section>
        <div className="top noprint"><h2>Fiche de brassage</h2><button className="save" onClick={() => window.print()}>Imprimer</button></div>
        <h2 className="sheet-title">{d.name}</h2>
        <p className="sub">
          {style ? `${style.id} – ${style.name}` : d.styleId} · {d.vol} L · rendement {d.eff} %
        </p>
        <p>Date : <Blank w={110} /> &nbsp; Brasseur : <Blank w={140} /> &nbsp; N° de brassin : <Blank w={60} /></p>
        {r && (
          <div className="chips">
            {[['DI', f(r.og, 3)], ['DF', f(r.fg, 3)], ['Alcool', `${f(r.abv)} %`], ['IBU', f(r.ibu, 0)], ['EBC', f(r.ebc, 0)]].map(([k, v]) => (
              <span className="chip" key={k}><small>{k}</small><b>{v}</b></span>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3>Ingrédients</h3>
        <table className="tbl">
          <thead><tr><th /><th>Malt</th><th>EBC</th><th>Kilos</th><th>%</th></tr></thead>
          <tbody>
            {d.mrows.map((m, i) => {
              const k = MALTS.find((x) => x.id === m.id);
              const q = num(m.kg) || 0;
              return <tr key={i}><td><Check /></td><td>{k?.name ?? m.id}</td><td>{m.ebc ? m.ebc : k ? f(k.ebc, 0) : '–'}</td><td>{f(q, 2)}</td><td>{kg > 0 ? f((q / kg) * 100) : '–'} %</td></tr>;
            })}
          </tbody>
        </table>
        <table className="tbl">
          <thead><tr><th /><th>Houblon</th><th>% alpha</th><th>Grammes</th><th>Usage</th><th>IBU</th></tr></thead>
          <tbody>
            {d.hrows.map((h, i) => (
              <tr key={i}>
                <td><Check /></td><td>{HOPS.find((x) => x.id === h.id)?.name ?? h.id}</td><td>{h.aa}</td><td>{h.grams}</td>
                <td>{USE[h.use]}{h.use === 'hopstand' ? ` ${h.temp} °C` : ''}{h.use !== 'dryhop' ? ` · ${h.min} min` : ''}</td>
                <td>{r ? f(r.hopIbu[i] ?? 0) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p><Check /> Levure : <b>{yeast?.name ?? d.yeastId}</b>{yeast?.tempC ? ` · fermentation ${yeast.tempC} °C` : ''}</p>
      </section>
      <section>
        <h3>Eau et empâtage</h3>
        {water && (
          <p>
            Eau d’empâtage : <b>{f(water.strikeL)} L</b>{strikeC !== null ? <> à <b>{f(strikeC, 0)} °C</b></> : null}
            {' · '}Eau de rinçage : <b>{f(water.spargeL)} L</b>{' · '}Volume pré-ébullition : <b>{f(water.preBoilL)} L</b>
          </p>
        )}
        <table className="tbl">
          <thead><tr><th /><th>Étape</th><th>°C</th><th>Minutes</th><th>Température relevée</th></tr></thead>
          <tbody>
            {d.mash.map((s, i) => <tr key={i}><td><Check /></td><td>{s.name}</td><td>{s.temp}</td><td>{s.min}</td><td><Blank w={70} /></td></tr>)}
          </tbody>
        </table>
      </section>
      <section>
        <h3>Ébullition et houblons</h3>
        <table className="tbl">
          <thead><tr><th /><th>Quand</th><th>Action</th></tr></thead>
          <tbody>{boilSchedule(d).map((s, i) => <tr key={i}><td><Check /></td><td>{s.when}</td><td>{s.what}</td></tr>)}</tbody>
        </table>
      </section>
      <section>
        <h3>Mesures du jour</h3>
        <table className="tbl">
          <tbody>
            <tr><td>Densité pré-ébullition</td><td><Blank /></td><td>Volume pré-ébullition</td><td><Blank /></td></tr>
            <tr><td>Densité initiale mesurée</td><td><Blank /></td><td>Volume en fermenteur</td><td><Blank /></td></tr>
            <tr><td>Température de mise en levure</td><td><Blank /></td><td>Date de mise en levure</td><td><Blank /></td></tr>
            <tr><td>Densité finale mesurée</td><td><Blank /></td><td>Date de mise en bouteille</td><td><Blank /></td></tr>
            <tr><td>Sucre de ressucrage (g/L)</td><td><Blank /></td><td>Alcool final</td><td><Blank /></td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3>Notes</h3>
        {notes.map(([k, t]) => (
          <div key={k}><b>{k} le brassage</b><p className="notes-text">{t.trim() || ' '}</p></div>
        ))}
        <div className="lines" />
      </section>
    </div>
  );
}
