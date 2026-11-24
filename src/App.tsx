import { useEffect, useRef, useState, type ReactElement } from 'react';
import RecipeBuilder from './RecipeBuilder';
import Ingredients from './Ingredients';
import Recipes from './Recipes';
import HopsTab from './HopsTab';
import StylesTab from './StylesTab';
import BrewSheet from './BrewSheet';
import Carbonation from './Carbonation';
import Hydrometer from './Hydrometer';
import BackupTab from './BackupTab';
import { LAST_BACKUP_KEY } from './backup';
import type { RecipeState } from './library';
import {
  abvSimple,
  apparentAttenuation,
  dilutionToTargetGravity,
  gravityAfterVolumeChange,
  abvAdvanced,
  abvFromPrimingSugar,
  SUGARS,
  refractometerFg,
  originalGravityFromReadings,
  sugarToReachGravity,
  type SugarKind,
} from './engine';

const num = (s: string) => parseFloat(s.replace(',', '.'));
const positive = (...v: number[]) => v.every((x) => Number.isFinite(x) && x > 0);
const fmt = (x: number, d = 3) =>
  x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

function Field(p: { label: string; value: string; onChange: (v: string) => void; unit?: string }) {
  return (
    <label className="field">
      <span>{p.label}</span>
      <div>
        <input inputMode="decimal" value={p.value} onChange={(e) => p.onChange(e.target.value)} />
        {p.unit && <em>{p.unit}</em>}
      </div>
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="result">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const Hint = () => <p className="hint">Saisissez des valeurs valides pour voir le résultat.</p>;

function Refractometer() {
  const [og, setOg] = useState('1,050');
  const [cb, setCb] = useState('7');
  const [k, setK] = useState('1,04');
  const [hSg, setHSg] = useState('1,012');
  const [bx, setBx] = useState('8,5');
  const [OG, CB, K] = [num(og), num(cb), num(k)];
  const valid = positive(OG - 1, CB, K) && OG < 1.2;
  const fg = refractometerFg(OG, CB, K);
  const [HSG, BX] = [num(hSg), num(bx)];
  const back = positive(HSG - 1, BX, K) ? originalGravityFromReadings(HSG, BX, K) : null;
  return (
    <section>
      <h2>Réfractomètre</h2>
      <p>Estime la densité finale et l’alcool à partir de la densité initiale (densité spécifique) et du °Brix lu pendant ou après la fermentation.</p>
      <Field label="Densité initiale (DI)" value={og} onChange={setOg} />
      <Field label="°Brix lu (actuel)" value={cb} onChange={setCb} unit="°Bx" />
      <Field label="Facteur de correction moût" value={k} onChange={setK} />
      {valid ? (
        <>
          <Result label="Densité actuelle estimée" value={fmt(fg)} />
          <Result label="Alcool estimé" value={`${fmt(abvSimple(OG, fg), 1)} %`} />
          <Result label="Atténuation apparente" value={`${fmt(apparentAttenuation(OG, fg), 0)} %`} />
        </>
      ) : (
        <Hint />
      )}
      <h3>Retrouver la densité initiale</h3>
      <p className="hint">Si vous n’avez pas mesuré la densité initiale : entrez la densité lue au densimètre et le °Brix lu au réfractomètre sur la même bière, à la même température. Le facteur de correction est celui du dessus.</p>
      <Field label="Densité lue au densimètre" value={hSg} onChange={setHSg} />
      <Field label="°Brix lu au réfractomètre" value={bx} onChange={setBx} unit="°Bx" />
      {back ? (
        <>
          <Result label="Densité initiale estimée" value={fmt(back.og)} />
          <Result label="Brix initial équivalent" value={`${fmt(back.originalBrix, 1)} °Bx`} />
          <Result label="Alcool estimé" value={`${fmt(abvSimple(back.og, HSG), 1)} %`} />
          <Result label="Atténuation apparente" value={`${fmt(apparentAttenuation(back.og, HSG), 0)} %`} />
        </>
      ) : positive(HSG - 1, BX, K) ? (
        <p className="hint">Lectures incohérentes : pour ce °Brix, le densimètre ne peut pas lire une valeur aussi haute. Vérifiez les saisies et la température.</p>
      ) : (
        <Hint />
      )}
    </section>
  );
}

function Dilution() {
  // Dilution : baisser la densité en ajoutant de l’eau
  const [v, setV] = useState('20');
  const [sg, setSg] = useState('1,060');
  const [t, setT] = useState('1,050');
  const [v2, setV2] = useState('25');
  // Concentration : monter la densité par évaporation ou en ajoutant du sucre
  const [cv, setCv] = useState('20');
  const [csg, setCsg] = useState('1,050');
  const [ct, setCt] = useState('1,060');
  const [kind, setKind] = useState<SugarKind>('saccharose');
  const [V, SG, T, V2] = [num(v), num(sg), num(t), num(v2)];
  const [CV, CSG, CT] = [num(cv), num(csg), num(ct)];
  const dil = positive(V, SG - 1, T - 1) && T < SG ? dilutionToTargetGravity(V, SG, T) : null;
  const concOk = positive(CV, CSG - 1, CT - 1) && CT > CSG;
  const evap = concOk ? dilutionToTargetGravity(CV, CSG, CT) : null;
  const sugarAdd = concOk ? sugarToReachGravity(CV, CSG, CT, kind) : null;
  return (
    <div className="stack">
      <section>
        <h2>Dilution</h2>
        <p>Eau à ajouter pour baisser la densité jusqu’à la valeur souhaitée, en conservant la même quantité de sucre.</p>
        <Field label="Volume" value={v} onChange={setV} unit="L" />
        <Field label="Densité actuelle" value={sg} onChange={setSg} />
        <Field label="Densité souhaitée" value={t} onChange={setT} />
        {dil ? (
          <>
            <Result label="Eau à ajouter" value={`${fmt(dil.waterToAddL, 2)} L`} />
            <Result label="Volume final" value={`${fmt(dil.finalVolumeL, 2)} L`} />
          </>
        ) : positive(V, SG - 1, T - 1) ? (
          <p className="hint">Pour monter la densité, utilisez la section Concentration, plus bas.</p>
        ) : (
          <Hint />
        )}
        <h3>Recalibrage après changement de volume</h3>
        <Field label="Nouveau volume (évaporation ou eau)" value={v2} onChange={setV2} unit="L" />
        {positive(V, SG - 1, V2) ? (
          <Result label="Nouvelle densité" value={fmt(gravityAfterVolumeChange(V, SG, V2))} />
        ) : (
          <Hint />
        )}
      </section>
      <section>
        <h2>Concentration</h2>
        <p>Pour monter la densité jusqu’à la valeur souhaitée : en évaporant, ou en ajoutant du sucre.</p>
        <Field label="Volume" value={cv} onChange={setCv} unit="L" />
        <Field label="Densité actuelle" value={csg} onChange={setCsg} />
        <Field label="Densité souhaitée" value={ct} onChange={setCt} />
        {concOk ? (
          <>
            <h3>Par évaporation</h3>
            <Result label="Volume à évaporer" value={`${fmt(-(evap?.waterToAddL ?? 0), 2)} L`} />
            <Result label="Volume final" value={`${fmt(evap?.finalVolumeL ?? 0, 2)} L`} />
            <h3>Par ajout de sucre</h3>
            <label className="field">
              <span>Sucre ajouté</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as SugarKind)}>
                {Object.entries(SUGARS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
              </select>
            </label>
            {sugarAdd && (
              <>
                <Result label="Sucre à ajouter" value={`${fmt(sugarAdd.grams, 0)} g`} />
                <Result label="Volume final" value={`${fmt(sugarAdd.finalVolumeL, 2)} L`} />
              </>
            )}
          </>
        ) : positive(CV, CSG - 1, CT - 1) ? (
          <p className="hint">Visez une densité plus haute que la densité actuelle.</p>
        ) : (
          <Hint />
        )}
      </section>
    </div>
  );
}

function Alcohol() {
  const [og, setOg] = useState('1,050');
  const [fg, setFg] = useState('1,010');
  const [sugar, setSugar] = useState('7');
  const [kind, setKind] = useState<SugarKind>('saccharose');
  const [OG, FG, S] = [num(og), num(fg), num(sugar)];
  const valid = positive(OG - 1, FG - 1) && OG > FG && Number.isFinite(S) && S >= 0;
  const base = abvSimple(OG, FG);
  const added = valid ? abvFromPrimingSugar(S, SUGARS[kind].ethanolGPerG) : 0;
  return (
    <section>
      <h2>Taux d’alcool</h2>
      <p>À partir de la densité initiale (DI), de la densité finale (DF) et du sucre de ressucrage.</p>
      <Field label="Densité initiale (DI)" value={og} onChange={setOg} />
      <Field label="Densité finale (DF)" value={fg} onChange={setFg} />
      <Field label="Sucre de ressucrage" value={sugar} onChange={setSugar} unit="g/L" />
      <label className="field">
        <span>Type de sucre</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as SugarKind)}>
          {Object.entries(SUGARS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </label>
      {valid ? (
        <>
          <Result label="Alcool avant ressucrage" value={`${fmt(base, 2)} %`} />
          <Result label="Alcool apporté par le ressucrage" value={`+ ${fmt(added, 2)} %`} />
          <Result label="Alcool final" value={`${fmt(base + added, 2)} %`} />
          <Result label="Alcool final (formule précise)" value={`${fmt(abvAdvanced(OG, FG) + added, 2)} %`} />
          <Result label="Atténuation apparente" value={`${fmt(apparentAttenuation(OG, FG), 0)} %`} />
          <p className="hint">Environ 0,07 % d’alcool par gramme de sucre blanc et par litre. La formule précise est préférable au-dessus de 1,070.</p>
        </>
      ) : (
        <Hint />
      )}
    </section>
  );
}

function lastBackup(): string {
  try {
    const t = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return t > 0 ? new Date(t).toLocaleDateString('fr-FR') : 'jamais (onglet Sauvegarde)';
  } catch {
    return 'inconnue';
  }
}

interface InstallEvent extends Event { prompt: () => Promise<void> }
interface Req { id: string; n: number }
interface Ctx { openReq: Req | null; delReq: Req | null; ordReq: { ids: string[]; n: number } | null; impReq: { recipes: RecipeState[]; n: number } | null; importRecipes: (ds: RecipeState[]) => void; open: (id: string) => void; remove: (id: string) => void; reorder: (ids: string[]) => void; bump: () => void; setCurrent: (d: RecipeState) => void; current: () => RecipeState | null }

const TOOLS: { id: string; label: string; view: (c: Ctx) => ReactElement }[] = [
  { id: 'recette', label: 'Recette', view: (c) => <RecipeBuilder openRequest={c.openReq} deleteRequest={c.delReq} reorderRequest={c.ordReq} importRequest={c.impReq} onLibraryChange={c.bump} onSnapshot={c.setCurrent} /> },
  { id: 'recettes', label: 'Mes recettes', view: (c) => <Recipes onOpen={c.open} onDelete={c.remove} onReorder={c.reorder} onImport={c.importRecipes} /> },
  { id: 'ingredients', label: 'Ingrédients', view: () => <Ingredients /> },
  { id: 'houblons', label: 'Houblons', view: () => <HopsTab /> },
  { id: 'styles', label: 'Styles', view: () => <StylesTab /> },
  { id: 'fiche', label: 'Fiche de brassage', view: (c) => <BrewSheet recipe={c.current()} /> },
  { id: 'carbo', label: 'Carbonatation', view: (c) => <Carbonation recipe={c.current()} /> },
  { id: 'densimetre', label: 'Densimètre', view: (c) => <Hydrometer recipe={c.current()} /> },
  { id: 'sauvegarde', label: 'Sauvegarde', view: () => <BackupTab /> },
  { id: 'refracto', label: 'Réfractomètre', view: () => <Refractometer /> },
  { id: 'dilution', label: 'Dilution et concentration', view: () => <Dilution /> },
  { id: 'alcool', label: 'Taux d’alcool', view: () => <Alcohol /> },
];

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function App() {
  const [tool, setTool] = useState(TOOLS[0].id);
  const [openReq, setOpenReq] = useState<{ id: string; n: number } | null>(null);
  const [delReq, setDelReq] = useState<{ id: string; n: number } | null>(null);
  const [ordReq, setOrdReq] = useState<{ ids: string[]; n: number } | null>(null);
  const [impReq, setImpReq] = useState<{ recipes: RecipeState[]; n: number } | null>(null);
  const [, setLibVersion] = useState(0);
  const cur = useRef<RecipeState | null>(null);
  // Bouton « Installer » : proposé par les navigateurs de type Chrome quand le site est installable.
  const [installEv, setInstallEv] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEv(e as InstallEvent); };
    const onInstalled = () => setInstallEv(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* stockage indisponible : le choix ne sera pas mémorisé */
    }
  }, [theme]);
  return (
    <main>
      <header className="noprint">
        <div>
          <h1>Brasserie Open</h1>
          <p className="sub">Boîte à outils gratuite du brasseur amateur</p>
        </div>
        <div className="hbtns">
        {installEv && (
          <button className="theme" title="Installer Brasserie Open comme une application" onClick={() => { void installEv.prompt().then(() => setInstallEv(null)); }}>
            ⤓ Installer
          </button>
        )}
        <button
          className="theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
        >
          {theme === 'dark' ? '☀ Clair' : '☾ Sombre'}
        </button>
        </div>
      </header>
      <nav className="noprint">
        {TOOLS.map((t) => (
          <button key={t.id} className={t.id === tool ? 'on' : ''} onClick={() => setTool(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {TOOLS.map((t) => (
        <div className="tool" key={t.id} hidden={t.id !== tool}>{t.view({
          openReq, delReq, ordReq, impReq,
          importRecipes: (ds) => setImpReq({ recipes: ds, n: Date.now() }),
          open: (id) => { setOpenReq({ id, n: Date.now() }); setTool('recette'); },
          remove: (id) => setDelReq({ id, n: Date.now() }),
          reorder: (ids) => setOrdReq({ ids, n: Date.now() }),
          bump: () => setLibVersion((v) => v + 1),
          setCurrent: (d) => { cur.current = d; },
          current: () => cur.current,
        })}</div>
      ))}
      <footer className="noprint">
        Calculs indicatifs : vérifiez toujours avec vos propres mesures.<br />
        Recettes mémorisées dans ce navigateur, pour l’adresse {window.location.host}. Dernière sauvegarde : {lastBackup()}. Version {__APP_VERSION__}.
      </footer>
    </main>
  );
}
