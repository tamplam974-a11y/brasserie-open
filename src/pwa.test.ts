import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(new URL(`../public/${f}`, import.meta.url));
const manifest = JSON.parse(read('manifest.webmanifest').toString('utf8')) as {
  name: string; start_url: string; scope: string; display: string; icons: { src: string; sizes: string; type: string; purpose: string }[];
};

describe('application installable (PWA)', () => {
  it('déclare un manifeste complet, relatif au dossier du site', () => {
    expect(manifest.name).toBe('Brasserie Open');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
  });
  it('fournit des icônes 192 et 512 px, dont une adaptable, et elles ont bien la taille annoncée', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      const png = read(icon.src);
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });
  it('contient un service worker qui ne met jamais en cache les autres sites', () => {
    const sw = read('sw.js').toString('utf8');
    expect(sw).toContain("url.origin !== self.location.origin");
    expect(sw).toContain("request.method !== 'GET'");
  });
});
