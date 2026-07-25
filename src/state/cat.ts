// Configuration du chat 3D (base choisie + look), persistée. Sert au créateur
// et, ensuite, au monde 3D pour charger exactement le même chat.

import { writable } from 'svelte/store';
import { kvGet, kvSet } from './db';
import type { HatKind } from '../customization/dna';
import { CAT_CATALOG } from '../creator/catalog';

export interface CatConfig {
  base: string; // URL d'un modèle du catalogue, ou 'imported'
  name: string;
  tint: string; // teinte (hex)
  tintAmount: number; // 0 = couleurs d'origine .. 1 = teinté à fond
  scale: number; // corpulence
  hat: HatKind;
  collar: boolean;
  glasses: boolean;
  accent: string; // couleur des accessoires
}

export const DEFAULT_CAT: CatConfig = {
  base: CAT_CATALOG[0].url,
  name: '',
  tint: '#c9884a',
  tintAmount: 0,
  scale: 1,
  hat: 'none',
  collar: false,
  glasses: false,
  accent: '#ff5c8a',
};

export const catConfig = writable<CatConfig>({ ...DEFAULT_CAT });

const KEY = 'catConfig';
const IMPORTED = 'importedCatGlb';

export async function startCatConfig(): Promise<void> {
  const saved = await kvGet<CatConfig>(KEY);
  if (saved) catConfig.set({ ...DEFAULT_CAT, ...saved });
  catConfig.subscribe((c) => void kvSet(KEY, c));
}

export function setCat<K extends keyof CatConfig>(key: K, value: CatConfig[K]): void {
  catConfig.update((c) => ({ ...c, [key]: value }));
}

/** Modèle importé par l'utilisateur (blob glb) — stocké en IndexedDB. */
export async function setImportedGlb(buf: ArrayBuffer): Promise<void> {
  await kvSet(IMPORTED, buf);
}
export async function getImportedGlb(): Promise<ArrayBuffer | undefined> {
  return kvGet<ArrayBuffer>(IMPORTED);
}
