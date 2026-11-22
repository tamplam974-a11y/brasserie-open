import { useEffect, useState } from 'react';
import { analyze, mergeReadings, parseReadings, type Reading } from './hydrometer';
import { compute, type RecipeState } from './library';

const KEY = 'brasserie-open:densimetre';
const f = (x: number, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const when = (t: number) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function load(): Reading[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Reading[];
    return Array.isArray(a) ? a.filter((r) => Number.isFinite(r?.t) && Number.isFinite(r?.sg)) : [];
  } catch { return []; }
}

/** Courbe de densité (gauche) et de température (droite) ; lignes pointillées pour la DI et la DF attendues. */
function Chart({ data, og, fg }: { data: Reading[]; og?: number; fg?: number }) {
  const [W, H, L, R, T, B] = [640, 250, 52, 46, 12, 26];
  const t0 = data[0].t, span = Math.max(1, data[data.length - 1].t - t0);
  const sgs = [...data.map((d) => d.sg), ...(og ? [og] : []), ...(fg ? [fg] : [])];
  const [lo, hi] = [Math.min(...sgs) - 0.002, Math.max(...sgs) + 0.002];
  const temps = data.map((d) => d.tempC).filter((x): x is number => x !== undefined);
  const [tlo, thi] = temps.length ? [Math.min(...temps) - 1, Math.max(...temps) + 1] : [0, 1];
  const x = (t: number) => L + ((t - t0) / span) * (W - L - R);
  const ySg = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const yT = (v: number) => T + (1 - (v - tlo) / (thi - tlo)) * (H - T - B);
  const path = (pts: [number, number][]) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Courbe de fermentation">
      <rect x={L} y={T} width={W - L - R} height={H - T - B} className="plot" />
      {og && <line x1={L} x2={W - R} y1={ySg(og)} y2={ySg(og)} className="ref" />}
      {fg && <line x1={L} x2={W - R} y1={ySg(fg)} y2={ySg(fg)} className="ref" />}
      {temps.length > 0 && <path className="ctemp" d={path(data.filter((d) => d.tempC !== undefined).map((d) => [x(d.t), yT(d.tempC as number)]))} />}
      <path className="csg" d={path(data.map((d) => [x(d.t), ySg(d.sg)]))} />
      <text x={L - 6} y={T + 8} textAnchor="end">{f(hi, 3)}</text>
      <text x={L - 6} y={H - B} textAnchor="end">{f(lo, 3)}</text>
      {temps.length > 0 && <text x={W - R + 6} y={T + 8}>{f(thi, 0)} °C</text>}
      {temps.length > 0 && <text x={W - R + 6} y={H - B}>{f(tlo, 0)} °C</text>}
      <text x={L} y={H - 8}>{when(t0)}</text>
      <text x={W - R} y={H - 8} textAnchor="end">{when(data[data.length - 1].t)}</text>
    </svg>
  );
}

/** Suivi de fermentation par densimètre connecté : import de relevés CSV ou d’une adresse, analyse et courbe. */
export default function Hydrometer({ recipe }: { recipe: RecipeState | null }) {
  const [data, setData] = useState<Reading[]>(load);
  const [unit, setUnit] = useState<'auto' | 'c' | 'f'>('auto');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [man, setMan] = useState({ when: '', sg: '', temp: '' });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data.slice(-20000))); } catch { /* stockage indisponible */ } }, [data]);
  const expected = recipe ? compute(recipe) : null;
  const a = analyze(data, expected?.og);
  const take = (text: string) => {
    const { readings, errors } = parseReadings(text, unit);
    if (!readings.length) { setNote(`Aucun relevé lu. ${errors[0] ?? ''}`); return; }
    setData((d) => mergeReadings(d, readings));
    setNote(`${readings.length} relevé(s) ajouté(s).${errors.length ? ` ${errors.length} ligne(s) ignorée(s) (${errors.slice(0, 2).join(' ; ')}).` : ''}`);
  };
  const fetchUrl = () => {
    fetch(url.trim())
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(take)
      .catch(() => setNote('Adresse inaccessible : elle doit renvoyer un CSV et autoriser les navigateurs (CORS).'));
  };
  const addManual = () => {
    const { readings } = parseReadings(`time,gravity,temp\n${man.when.replace('T', ' ')},${man.sg.replace(',', '.')},${man.temp.replace(',', '.')}`, 'c');
    if (!readings.length) { setNote('Date ou densité invalide.'); return; }
    setData((d) => mergeReadings(d, readings));
    setMan({ when: '', sg: '', temp: '' });
    setNote('Relevé ajouté.');
  };
  return (
    <div className="wide">
      <section>
        <h2>Densimètre connecté</h2>
        <p className="hint">Importez les relevés d’un iSpindel, d’un Tilt, d’une RAPT Pill ou de tout appareil qui exporte un CSV (colonnes date, densité, température). Les densités en 1050, en SG ou en °Plato et les températures en °F sont reconnues.</p>
        <div className="csvbar">
          <label className="add">Importer un CSV
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) file.text().then(take);
            }} />
          </label>
          <select aria-label="Unité de température" value={unit} onChange={(e) => setUnit(e.target.value as 'auto' | 'c' | 'f')}>
            <option value="auto">Température : détection</option><option value="c">Température en °C</option><option value="f">Température en °F</option>
          </select>
          <button className="add danger" disabled={!data.length} onClick={() => { if (window.confirm('Effacer tous les relevés ?')) { setData([]); setNote(''); } }}>Effacer</button>
        </div>
        <div className="slot">
          <input placeholder="Adresse d’un fichier CSV (https://…)" aria-label="Adresse du CSV" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="add" disabled={!url.trim()} onClick={fetchUrl}>Charger</button>
        </div>
        <div className="stylegrid">
          <input type="datetime-local" aria-label="Date et heure" value={man.when} onChange={(e) => setMan({ ...man, when: e.target.value })} />
          <input placeholder="Densité (1,042)" aria-label="Densité" value={man.sg} onChange={(e) => setMan({ ...man, sg: e.target.value })} />
          <input placeholder="Temp. (°C)" aria-label="Température" value={man.temp} onChange={(e) => setMan({ ...man, temp: e.target.value })} />
          <button className="save" onClick={addManual}>Ajouter un relevé</button>
        </div>
        {note && <p className="hint"><b>{note}</b></p>}
      </section>
      {a && (
        <section>
          <h2>Fermentation</h2>
          <div className="chips">
            {[
              ['Densité', f(a.lastSg, 3)],
              ['Alcool', `${f(a.abv)} %`],
              ['Atténuation', `${f(a.attenuationPct, 0)} %`],
              ['Vitesse', `${f(a.pointsPerDay, 1)} pt/j`],
              ...(a.lastTempC !== undefined ? [['Température', `${f(a.lastTempC, 1)} °C`]] : []),
            ].map(([k, v]) => <span className="chip" key={k}><small>{k}</small><b>{v}</b></span>)}
          </div>
          <p className="hint">
            {a.n} relevé(s) sur {f(a.hours, 0)} h · {a.stable ? 'densité stable depuis 48 h : fermentation probablement terminée.' : 'la densité bouge encore : fermentation en cours.'}
            {expected ? ` Recette : DI ${f(expected.og, 3)}, DF attendue ${f(expected.fg, 3)}.` : ''}
          </p>
          {data.length > 1 && <Chart data={data} og={expected?.og} fg={expected?.fg} />}
          <div className="tablewrap">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Densité</th><th>Température</th></tr></thead>
              <tbody>
                {data.slice(-8).reverse().map((r) => <tr key={r.t}><td>{when(r.t)}</td><td>{f(r.sg, 3)}</td><td>{r.tempC !== undefined ? `${f(r.tempC, 1)} °C` : '–'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section>
        <h3>Connexion en direct</h3>
        <p className="hint">Ce site tourne dans votre navigateur : il ne peut pas recevoir lui-même les envois d’un densimètre (webhook). Pour un suivi automatique, faites publier les relevés de l’appareil par son service en ligne (iSpindel vers un service d’archivage, passerelle TiltPi, cloud RAPT…) sous forme de fichier CSV public, puis collez son adresse ci-dessus et cliquez sur Charger : seuls les serveurs qui autorisent les navigateurs (CORS) fonctionnent. Les relevés se cumulent sans doublons.</p>
      </section>
    </div>
  );
}
