import { describe, expect, it } from 'vitest';
import { YEAST_FAMILIES, yeastProfile } from './yeastProfile';

const at = (v: number[], f: (typeof YEAST_FAMILIES)[number]) => v[YEAST_FAMILIES.indexOf(f)];

describe('profil de levure', () => {
  it('reconnaît une levure neutre, une weizen, une saison et une lager', () => {
    expect(at(yeastProfile({ name: 'Lallemand Nottingham' }), 'neutre')).toBe(4);
    expect(at(yeastProfile({ name: 'Wyeast 3068 Weihenstephan Weizen' }), 'banane')).toBe(4);
    expect(at(yeastProfile({ name: 'Lallemand Belle Saison' }), 'poivre / épicé')).toBe(4);
    expect(at(yeastProfile({ name: 'Wyeast 2206 Bavarian Lager', lager: true }), 'neutre')).toBe(5);
  });
  it('place Köln avec les kölsch et le Belgian Witbier avec les blanches', () => {
    expect(at(yeastProfile({ name: 'Lallemand Köln' }), 'neutre')).toBe(3);
    expect(at(yeastProfile({ name: 'Wyeast 3944 Belgian Witbier' }), 'clou de girofle')).toBe(2);
  });
  it('donne un profil neutre aux levures inconnues, lager comprises', () => {
    expect(at(yeastProfile({ name: 'Ma levure' }), 'neutre')).toBe(3);
    expect(at(yeastProfile({ name: 'Ma levure', lager: true }), 'neutre')).toBe(5);
  });
});
