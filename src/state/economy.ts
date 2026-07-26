// Économie in-world : on gagne des croquettes 🪙 en s'occupant du chat au bon
// moment (un soin utile paie plus qu'un soin superflu), une série récompense la
// régularité, et un bonus tombe au premier soin de la journée. On dépense à la
// boutique en gadgets qui comblent plusieurs besoins d'un coup.

import { get } from 'svelte/store';
import { profile, addCoins, spendCoins } from './app';
import type { Life } from '../wasm/miaou_engine';

export type CareKind = 'feed' | 'cuddle' | 'toy' | 'clean';

export interface Needs {
  hunger: number;
  energy: number;
  joy: number;
  hygiene: number;
}

export interface CareReward {
  coins: number;
  streak: number; // longueur de la série après ce soin
  daily: boolean; // le bonus du jour vient-il de tomber
}

// Besoin visé par chaque soin : c'est son déficit qui détermine l'utilité.
const TARGET: Record<CareKind, keyof Needs> = {
  feed: 'hunger',
  cuddle: 'joy',
  toy: 'joy',
  clean: 'hygiene',
};

const STREAK_WINDOW_MS = 30_000; // au-delà, la série retombe
const DAILY_BONUS = 25;
const BASE = 3;

const today = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/**
 * Récompense un soin et crédite le portefeuille. Le gain = (base + utilité) ×
 * multiplicateur de série ; l'utilité vient du déficit du besoin visé, donc
 * s'occuper d'un chat qui en a besoin rapporte, spammer un besoin déjà plein non.
 */
export function earnFromCare(kind: CareKind, needs: Needs): CareReward {
  const now = Date.now();
  const p = get(profile);

  const streak = now - p.lastCareTs <= STREAK_WINDOW_MS ? p.careStreak + 1 : 1;
  const streakMult = Math.min(3, 1 + (streak - 1) * 0.25);

  const gap = 100 - needs[TARGET[kind]]; // 0 (plein) .. 100 (au plus bas)
  const utility = Math.round((gap / 100) * 8);
  const coins = Math.max(1, Math.round((BASE + utility) * streakMult));

  const daily = today(now) !== p.lastCareDay;

  profile.update((prev) => ({
    ...prev,
    careStreak: streak,
    lastCareTs: now,
    lastCareDay: daily ? today(now) : prev.lastCareDay,
  }));

  addCoins(coins + (daily ? DAILY_BONUS : 0));
  return { coins, streak, daily };
}

export interface ShopItem {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;
  apply: (life: Life) => void;
}

// Les articles combent PLUSIEURS besoins d'un coup — c'est ce qui justifie leur
// prix face aux actions gratuites du dock, qui n'en touchent qu'un.
export const SHOP: ShopItem[] = [
  {
    id: 'sardine',
    icon: '🐟',
    name: 'Sardine fraîche',
    desc: 'Rassasie et régale : faim +++ et une pointe de joie.',
    cost: 12,
    apply: (l) => {
      l.feed();
      l.reward(0, 10);
    },
  },
  {
    id: 'plumeau',
    icon: '🪶',
    name: 'Plumeau',
    desc: 'Grosse séance de chasse : joie ++ garantie.',
    cost: 10,
    apply: (l) => {
      l.toy();
      l.reward(0, 14);
    },
  },
  {
    id: 'spa',
    icon: '🛁',
    name: 'Spa félin',
    desc: 'Brossage complet et détente : propreté +++ et joie +.',
    cost: 14,
    apply: (l) => {
      l.clean();
      l.reward(0, 12);
    },
  },
  {
    id: 'festin',
    icon: '🎁',
    name: 'Festin royal',
    desc: 'La totale : faim, propreté, jeu et câlin d’un seul coup.',
    cost: 40,
    apply: (l) => {
      l.feed();
      l.clean();
      l.toy();
      l.reward(0, 24);
    },
  },
];

/** Tente l'achat : débite puis applique l'effet. Renvoie false si solde insuffisant. */
export function buy(item: ShopItem, life: Life): boolean {
  if (!spendCoins(item.cost)) return false;
  item.apply(life);
  return true;
}
