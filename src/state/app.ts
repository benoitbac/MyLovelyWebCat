// État applicatif : navigation entre écrans + profil du joueur (nom, création,
// monnaie), persisté localement.

import { writable, get } from 'svelte/store';
import { kvGet, kvSet } from './db';

export type Screen = 'create' | 'home' | 'game';

export const screen = writable<Screen>('home');

export interface Profile {
  created: boolean;
  name: string;
  coins: number;
}

const DEFAULT: Profile = { created: false, name: 'Miaou', coins: 0 };

export const profile = writable<Profile>({ ...DEFAULT });

export async function startApp(): Promise<void> {
  const saved = await kvGet<Profile>('profile');
  if (saved) profile.set({ ...DEFAULT, ...saved });
  profile.subscribe((p) => void kvSet('profile', p));
  screen.set(get(profile).created ? 'home' : 'create');
}

export function go(s: Screen): void {
  screen.set(s);
}

export function addCoins(n: number): void {
  profile.update((p) => ({ ...p, coins: p.coins + n }));
}

export function finishCreation(name: string): void {
  profile.update((p) => ({ ...p, created: true, name: name.trim() || 'Miaou' }));
  screen.set('home');
}
