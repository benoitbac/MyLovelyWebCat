// ADN cosmétique : l'apparence du compagnon, éditable en direct, persistée
// localement (IndexedDB) et encodable dans l'URL pour le partage.

import { writable, get } from 'svelte/store';
import { kvGet, kvSet } from '../state/db';

export type HatKind = 'none' | 'tophat' | 'cap' | 'crown' | 'party';

export interface DNA {
  furA: string; // pelage (haut)
  furB: string; // pelage (bas)
  belly: string; // ventre
  eye: string; // yeux
  accent: string; // rose (oreilles internes, nez, joues)
  earSize: number; // 0.6 .. 1.4
  roundness: number; // -1 .. 1
  bodySize: number; // 0.75 .. 1.35 (corpulence)
  noseSize: number; // 0.6 .. 1.6 (truffe)
  hat: HatKind;
  collar: boolean;
  glasses: boolean;
}

export const DEFAULT_DNA: DNA = {
  furA: '#c99a6a',
  furB: '#a9764a',
  belly: '#f0e2cf',
  eye: '#7bd88f',
  accent: '#ff9ecf',
  earSize: 1.0,
  roundness: 0.0,
  bodySize: 1.0,
  noseSize: 1.0,
  hat: 'none',
  collar: false,
  glasses: false,
};

/** Robes de pelage prêtes à l'emploi (clair, foncé, ventre). */
export const FUR_PRESETS: { name: string; furA: string; furB: string; belly: string }[] = [
  { name: 'Brun', furA: '#c99a6a', furB: '#a9764a', belly: '#f0e2cf' },
  { name: 'Roux', furA: '#f0a860', furB: '#e07b3a', belly: '#fbe6cf' },
  { name: 'Noir', furA: '#4a4658', furB: '#2c2836', belly: '#6b6678' },
  { name: 'Blanc', furA: '#ffffff', furB: '#e6e2f0', belly: '#ffffff' },
  { name: 'Gris', furA: '#b9b6c8', furB: '#8d8aa0', belly: '#e6e4ef' },
  { name: 'Crème', furA: '#f5e6c8', furB: '#e6cfa0', belly: '#fff6e6' },
  { name: 'Lavande', furA: '#b9a6ff', furB: '#7b5cff', belly: '#efeaff' },
];

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
  const preset = FUR_PRESETS[Math.floor(Math.random() * FUR_PRESETS.length)];
  const hats: HatKind[] = ['none', 'none', 'tophat', 'cap', 'crown', 'party'];
  dna.set({
    furA: preset.furA,
    furB: preset.furB,
    belly: preset.belly,
    eye: rc(),
    accent: rc(),
    earSize: Number((0.75 + Math.random() * 0.6).toFixed(2)),
    roundness: Number((Math.random() * 2 - 1).toFixed(2)),
    bodySize: Number((0.8 + Math.random() * 0.5).toFixed(2)),
    noseSize: Number((0.7 + Math.random() * 0.8).toFixed(2)),
    hat: hats[Math.floor(Math.random() * hats.length)],
    collar: Math.random() < 0.5,
    glasses: Math.random() < 0.35,
  });
}

export function applyFurPreset(p: { furA: string; furB: string; belly: string }): void {
  dna.update((d) => ({ ...d, furA: p.furA, furB: p.furB, belly: p.belly }));
}

export function resetDNA(): void {
  dna.set({ ...DEFAULT_DNA });
}

export function hexToRGB(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
