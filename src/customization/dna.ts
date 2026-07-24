// ADN cosmétique : l'apparence du compagnon, éditable en direct, persistée
// localement (IndexedDB) et encodable dans l'URL pour le partage.

import { writable, get } from 'svelte/store';
import { kvGet, kvSet } from '../state/db';

export interface DNA {
  furA: string; // pelage (haut)
  furB: string; // pelage (bas)
  belly: string; // ventre
  eye: string; // yeux
  accent: string; // rose (oreilles internes, nez, joues)
  earSize: number; // 0.6 .. 1.4
  roundness: number; // -1 .. 1
}

export const DEFAULT_DNA: DNA = {
  furA: '#b9a6ff',
  furB: '#7b5cff',
  belly: '#efeaff',
  eye: '#ffd24a',
  accent: '#ff9ecf',
  earSize: 1.0,
  roundness: 0.0,
};

const KEY = 'dna';

function decode(code: string): DNA | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    return { ...DEFAULT_DNA, ...JSON.parse(json) };
  } catch {
    return null;
  }
}

function fromURL(): DNA | null {
  const code = new URLSearchParams(location.hash.slice(1)).get('dna');
  return code ? decode(code) : null;
}

export const dna = writable<DNA>(fromURL() ?? { ...DEFAULT_DNA });

export function encode(d: DNA): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(d))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function shareURL(): string {
  const url = new URL(location.href);
  url.hash = 'dna=' + encode(get(dna));
  return url.toString();
}

/** Charge l'apparence persistée (sauf si l'URL en impose déjà une) et
 *  sauvegarde à chaque modification. */
export async function startDnaEngine(): Promise<void> {
  if (!fromURL()) {
    const saved = await kvGet<DNA>(KEY);
    if (saved) dna.set({ ...DEFAULT_DNA, ...saved });
  }
  dna.subscribe((d) => void kvSet(KEY, d));
}

export function setDNA<K extends keyof DNA>(key: K, value: DNA[K]): void {
  dna.update((d) => ({ ...d, [key]: value }));
}

export function randomizeDNA(): void {
  const rc = () =>
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0');
  dna.set({
    furA: rc(),
    furB: rc(),
    belly: rc(),
    eye: rc(),
    accent: rc(),
    earSize: Number((0.8 + Math.random() * 0.5).toFixed(2)),
    roundness: Number((Math.random() * 2 - 1).toFixed(2)),
  });
}

export function resetDNA(): void {
  dna.set({ ...DEFAULT_DNA });
}

export function hexToRGB(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
