import { useEffect, useState } from 'react';
import { HOPS, MALTS } from './data/ingredients';
import type { RecipeState } from './library';
import { Picker } from './Picker';
import { balance, deduct, loadStock, needsFromRecipe, newLot, saveStock, type Lot, type Need, type Stock } from './stock';

const f = (x: number, d: number) => x.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d });
type Item = { id: string; name: string; brand?: string };

function Lots(p: {
  title: string; items: Item[]; valueLabel: string; unit: 'kg' | 'g'; decimals: number;
  lots: Lot[]; onChange: (l: Lot[]) => void; defaultValue: (id: string) => string;
}) {
  const update = (i: number, patch: Partial<Lot>) => p.onChange(p.lots.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = p.lots.reduce((s, l) => s + balance(l), 0);
  return (
    <section>
      <div className="top">
        <h2>{p.title}</h2>
        <button className="add" onClick={() => p.onChange([...p.lots, newLot()])}>+ Lot</button>
      </div>
      <div className="stkwrap">
        <div className="row stk head" aria-hidden="true">
          <span>Nom</span><span>{p.valueLabel}</span><span>Date d’achat</span>
          <span>Quantité initiale ({p.unit})</span><span>Retrait ({p.unit})</span><span>Solde ({p.unit})</span><span />
        </div>
        {p.lots.map((l, i) => {
          const bal = balance(l);
          return (
            <div className="row stk" key={l.id}>
              <Picker label={`${p.title} : nom`} items={p.items} value={l.ingredientId}
                onPick={(id) => update(i, { ingredientId: id, name: p.items.find((x) => x.id === id)?.name ?? '', value: p.defaultValue(id) })} />
              <input aria-label={p.valueLabel} inputMode="decimal" value={l.value} onChange={(e) => update(i, { value: e.target.value })} />
              <input type="date" aria-label="Date d’achat" value={l.date} onChange={(e) => update(i, { date: e.target.value })} />
              <input aria-label="Quantité initiale" inputMode="decimal" value={l.initial} onChange={(e) => update(i, { initial: e.target.value })} />
              <input aria-label="Retrait" inputMode="decimal" value={l.withdrawn} onChange={(e) => update(i, { withdrawn: e.target.value })} />
              <output className={bal < 0 ? 'ebc neg' : 'ebc'} aria-label="Solde">{f(bal, p.decimals)}</output>
              <button className="x" aria-label="Supprimer la ligne" title="Supprimer la ligne" onClick={() => p.onChange(p.lots.filter((_, j) => j !== i))}>×</button>
            </div>
          );
        })}
      </div>
      {p.lots.length === 0 && <p className="hint">Aucun achat enregistré. Cliquez sur « + Lot » pour en ajouter un.</p>}
      <p className="hint">Total du solde : <b>{f(total, p.decimals)} {p.unit}</b></p>
    </section>
  );
}

/** Stock de malts et de houblons, avec retrait automatique des ingrédients de la recette en cours. */
export default function StockTab({ recipe }: { recipe: RecipeState | null }) {
  const [stock, setStock] = useState<Stock>(loadStock);
  const [note, setNote] = useState('');
  useEffect(() => { saveStock(stock); }, [stock]);
  const withdraw = () => {
    if (!recipe || !window.confirm(`Retirer du stock les ingrédients de « ${recipe.name} » ?`)) return;
    const needs = needsFromRecipe(recipe);
    const m = deduct(stock.malts, needs.malts, 3);
    const h = deduct(stock.hops, needs.hops, 1);
    setStock({ malts: m.lots, hops: h.lots });
    const list = (xs: Need[], items: Item[], unit: string) =>
      xs.map((n) => `${items.find((i) => i.id === n.ingredientId)?.name ?? n.ingredientId} (${f(n.amount, 2)} ${unit})`);
    const missing = [...list(m.missing, MALTS, 'kg'), ...list(h.missing, HOPS, 'g')];
    setNote(missing.length ? `Retiré, mais le stock ne suffit pas pour : ${missing.join(', ')}.` : `Ingrédients de « ${recipe.name} » retirés du stock.`);
  };
  return (
    <div className="wide">
      <section>
        <div className="top">
          <h2>Stock</h2>
          <button className="save" disabled={!recipe} title="Retire du stock les malts et houblons de la recette ouverte dans l’onglet Accueil" onClick={withdraw}>
            Déduire la recette en cours
          </button>
        </div>
        <p className="hint">
          Un achat par ligne. Le solde est la quantité initiale moins les retraits. « Déduire la recette en cours » retire les malts et houblons
          de la recette ouverte, en commençant par les achats les plus anciens : à utiliser une seule fois par brassin.
        </p>
        {note && <p className="hint"><b>{note}</b></p>}
      </section>
      <Lots title="Malts" items={MALTS} valueLabel="EBC" unit="kg" decimals={2} lots={stock.malts}
        onChange={(malts) => setStock({ ...stock, malts })} defaultValue={(id) => String(MALTS.find((m) => m.id === id)?.ebc ?? '').replace('.', ',')} />
      <Lots title="Houblons" items={HOPS} valueLabel="AA (%)" unit="g" decimals={1} lots={stock.hops}
        onChange={(hops) => setStock({ ...stock, hops })} defaultValue={(id) => String(HOPS.find((h) => h.id === id)?.aa ?? '').replace('.', ',')} />
    </div>
  );
}
