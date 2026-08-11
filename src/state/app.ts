// État applicatif : navigation entre écrans + profil du joueur (nom, création,
// monnaie), persisté localement.

import { writable } from 'svelte/store';
import { kvGet, kvSet } from './db';

export type Screen = 'create' | 'home' | 'game';

// On démarre sur le créateur : évite de monter le monde 3D une frame au boot
// (mount gâché + connexion réseau fantôme) avant que startApp ne s'exécute.
export const screen = writable<Screen>('create');

export interface Profile {
  created: boolean;
  name: string;
  coins: number;
  careStreak: number; // soins enchaînés (série en cours)
  lastCareTs: number; // horodatage du dernier soin (pour rompre la série)
  lastCareDay: string; // jour du dernier bonus quotidien (YYYY-MM-DD)
}

const DEFAULT: Profile = {
  created: false,
  name: 'Miaou',
  coins: 0,
  careStreak: 0,
  lastCareTs: 0,
  lastCareDay: '',
};

export const profile = writable<Profile>({ ...DEFAULT });

export async function startApp(): Promise<void> {
  const saved = await kvGet<Profile>('profile');
  if (saved) profile.set({ ...DEFAULT, ...saved });
  profile.subscribe((p) => void kvSet('profile', p));
  // On démarre toujours sur le créateur pour l'instant (menu à venir).
  screen.set('create');
}

export function go(s: Screen): void {
  screen.set(s);
}

export function addCoins(n: number): void {
  profile.update((p) => ({ ...p, coins: p.coins + n }));
}

/** Débite le portefeuille si le solde suffit. Renvoie false sinon (rien débité). */
export function spendCoins(n: number): boolean {
  let ok = false;
  profile.update((p) => {
    if (p.coins < n) return p;
    ok = true;
    return { ...p, coins: p.coins - n };
  });
  return ok;
}

export function finishCreation(name: string): void {
  profile.update((p) => ({ ...p, created: true, name: name.trim() || 'Miaou' }));
  screen.set('home');
}
