// Besoins du compagnon (façon Tamagotchi) : ils décroissent avec le temps —
// y compris hors-ligne (rattrapés au chargement via l'horodatage) — et les
// actions du joueur les font remonter.

import { writable, get } from 'svelte/store';
import { kvGet, kvSet } from '../state/db';

export type ActionKind = 'pet' | 'feed' | 'play' | 'groom';

export interface Needs {
  hunger: number; // 0 affamé .. 100 rassasié
  energy: number; // 0 épuisé .. 100 en forme
  hygiene: number; // 0 sale .. 100 propre
  affection: number; // 0 délaissé .. 100 comblé
}

const DEFAULT: Needs = { hunger: 70, energy: 80, hygiene: 75, affection: 65 };
const KEY = 'needs';
const MAX_OFFLINE_S = 48 * 3600; // on ne rattrape pas plus de 48h

// Décroissance par seconde (dérivée de valeurs « par minute »).
const DECAY = { hunger: 0.6 / 60, energy: 0.4 / 60, hygiene: 0.3 / 60, affection: 0.5 / 60 };

// Effet des actions sur les besoins.
const DELTAS: Record<ActionKind, Partial<Needs>> = {
  feed: { hunger: +35, energy: +8, hygiene: -5 },
  play: { affection: +22, energy: -12, hunger: -6, hygiene: -4 },
  pet: { affection: +18, energy: +2 },
  groom: { hygiene: +40, affection: +6 },
};

export const needs = writable<Needs>({ ...DEFAULT });

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function apply(mut: (n: Needs) => void): void {
  needs.update((n) => {
    const c = { ...n };
    mut(c);
    c.hunger = clamp(c.hunger);
    c.energy = clamp(c.energy);
    c.hygiene = clamp(c.hygiene);
    c.affection = clamp(c.affection);
    return c;
  });
}

export function applyNeedsAction(kind: ActionKind): void {
  const d = DELTAS[kind];
  apply((n) => {
    n.hunger += d.hunger ?? 0;
    n.energy += d.energy ?? 0;
    n.hygiene += d.hygiene ?? 0;
    n.affection += d.affection ?? 0;
  });
  scheduleSave();
}

function decay(seconds: number): void {
  apply((n) => {
    n.hunger -= DECAY.hunger * seconds;
    n.energy -= DECAY.energy * seconds;
    n.hygiene -= DECAY.hygiene * seconds;
    n.affection -= DECAY.affection * seconds;
  });
}

interface Saved {
  needs: Needs;
  ts: number;
}

let saveTimer = 0;
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = 0;
    void save();
  }, 4000);
}
async function save(): Promise<void> {
  await kvSet<Saved>(KEY, { needs: get(needs), ts: Date.now() });
}

let interval = 0;

export async function startNeedsEngine(): Promise<void> {
  const saved = await kvGet<Saved>(KEY);
  if (saved) {
    needs.set({ ...DEFAULT, ...saved.needs });
    const elapsed = Math.min((Date.now() - saved.ts) / 1000, MAX_OFFLINE_S);
    decay(elapsed);
  }
  interval = window.setInterval(() => decay(1), 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void save();
  });
  window.addEventListener('beforeunload', () => void save());
}

export function stopNeedsEngine(): void {
  if (interval) {
    clearInterval(interval);
    interval = 0;
  }
  void save();
}
