import { describe, expect, it } from 'vitest';
import { hopsToCsv, maltsToCsv, parseCsv, parseHops, parseMalts, parseStyles, parseYeasts, stylesToCsv, toNum, yeastsToCsv } from './csv';

describe('CSV', () => {
  it('lit des champs entre guillemets et les fins de ligne Windows', () => {
    expect(parseCsv('a;b\r\n"x;y";"il dit ""oui"""\r\n')).toEqual([['a', 'b'], ['x;y', 'il dit "oui"']]);
  });
  it('ignore le BOM et détecte la virgule comme séparateur', () => {
    expect(parseCsv('\uFEFFnom,ebc\nPilsen,3.5')).toEqual([['nom', 'ebc'], ['Pilsen', '3.5']]);
  });
  it('lit les nombres avec virgule, pourcentage ou fourchette', () => {
    expect(toNum('3,5')).toBeCloseTo(3.5);
    expect(toNum('81 %')).toBe(81);
    expect(toNum('75-80')).toBeCloseTo(77.5);
    expect(toNum('')).toBeNaN();
  });
  it('lit des malts avec en-têtes français et signale les lignes invalides', () => {
    const { rows, errors } = parseMalts('Nom;Marque;Couleur (EBC);Extrait\nPilsen;Best Malz;3,5;81\nSans extrait;Best Malz;5;\n;X;1;80\n');
    expect(rows).toEqual([{ name: 'Pilsen', brand: 'Best Malz', ebc: 3.5, extractPct: 81 }]);
    expect(errors).toHaveLength(2);
  });
  it('lit des malts sans en-tête, dans l’ordre nom, marque, ebc, extrait', () => {
    expect(parseMalts('Pilsen;Dingemans;3;80').rows[0]).toMatchObject({ name: 'Pilsen', brand: 'Dingemans', ebc: 3, extractPct: 80 });
  });
  it('lit des levures avec fourchette d’atténuation et type lager', () => {
    const { rows } = parseYeasts('name,brand,attenuation,temperature,type\nW-34/70,Fermentis,"80-84",9-15,lager');
    expect(rows[0]).toMatchObject({ attenuationPct: 82, tempC: '9-15', lager: true });
  });
  it('lit des houblons avec en-têtes anglais', () => {
    expect(parseHops('name;brand;aa;aroma\nCitra;Yakima;12,5;agrumes').rows[0]).toMatchObject({ aa: 12.5, aroma: 'agrumes' });
  });
  it('reconnaît des en-têtes précisés et ne confond pas « Malterie » avec le nom', () => {
    const { rows } = parseMalts('Malterie;Nom du malt;Couleur (EBC);Extrait (%)\nBest Malz;Pilsen;3,5;81');
    expect(rows[0]).toMatchObject({ brand: 'Best Malz', ebc: 3.5, extractPct: 81 });
  });
});

describe('CSV des styles', () => {
  it('lit un style avec en-têtes, couleur en SRM', () => {
    const { rows, errors } = parseStyles('id;nom;og_min;og_max;fg_min;fg_max;ibu_min;ibu_max;srm_min;srm_max;abv_min;abv_max\nX1;Ma bière;1,045;1,055;1,010;1,014;20;30;8;14;4,5;5,5');
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ id: 'X1', name: 'Ma bière', og: [1.045, 1.055], srm: [8, 14], abv: [4.5, 5.5] });
  });
  it('convertit une couleur donnée en EBC', () => {
    const { rows } = parseStyles('id;nom;og min;og max;fg min;fg max;ibu min;ibu max;ebc min;ebc max;abv min;abv max\nX2;Foncée;1,050;1,060;1,012;1,016;25;35;60;80;5;6');
    expect(rows[0].srm[0]).toBeCloseTo(30.5, 1);
  });
  it('lit des styles sans en-tête, dans l’ordre du modèle', () => {
    expect(parseStyles('X3;Sans titre;1,040;1,050;1,008;1,012;10;20;3;6;4;5').rows).toHaveLength(1);
  });
  it('signale une plage inversée ou une valeur absurde', () => {
    const { rows, errors } = parseStyles('X4;Inversé;1,060;1,040;1,008;1,012;10;20;3;6;4;5\nX5;Absurde;1,040;1,050;1,008;1,012;10;900;3;6;4;5');
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(2);
  });
});

describe('export CSV (aller-retour avec l’import)', () => {
  it('relit des malts exportés, noms avec point-virgule et guillemets compris', () => {
    const xs = [{ name: 'Malt « spécial »; test', brand: 'Ma Malterie', ebc: 3.5, extractPct: 81 }, { name: 'Caramel "120"', brand: 'Moi', ebc: 120, extractPct: 74.5 }];
    expect(parseMalts(maltsToCsv(xs)).rows).toEqual(xs);
  });
  it('relit des houblons et des levures exportés', () => {
    const hs = [{ name: 'Mon houblon', brand: 'Ferme', aa: 12.5, aroma: 'agrumes, résine' }];
    expect(parseHops(hopsToCsv(hs)).rows).toEqual(hs);
    const ys = [{ name: 'Ma levure', brand: 'Labo', attenuationPct: 78, tempC: '18–22', lager: false }, { name: 'Ma lager', brand: 'Labo', attenuationPct: 82, tempC: '10–14', lager: true }];
    expect(parseYeasts(yeastsToCsv(ys)).rows).toEqual(ys);
  });
  it('relit des styles exportés', () => {
    const ss = [{ id: 'X1', name: 'Ma bière', og: [1.045, 1.055] as [number, number], fg: [1.01, 1.014] as [number, number], ibu: [20, 30] as [number, number], srm: [8, 14] as [number, number], abv: [4.5, 5.5] as [number, number] }];
    expect(parseStyles(stylesToCsv(ss)).rows).toEqual(ss);
  });
});

