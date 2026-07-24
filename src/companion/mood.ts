// Machine à humeurs du compagnon. Elle décide de l'humeur courante à partir
// de l'interaction (souris qui bouge, caresse, inactivité) et produit une
// « expression » continue (yeux, bouche, oreilles, rougeur…) lissée dans le
// temps — ce sont ces valeurs que le shader utilise pour animer le visage.

import { writable } from 'svelte/store';

export type Mood = 'content' | 'playful' | 'sleepy' | 'happy';

export interface Expression {
  eyeOpen: number; // 0 fermé .. 1 grand ouvert
  mouthCurve: number; // 0 neutre .. 1 grand sourire
  earPerk: number; // 0 aplaties .. 1 dressées
  blush: number; // 0 .. 1
  sleepy: number; // 0 éveillé .. 1 endormi
}

const PRESETS: Record<Mood, Expression> = {
  content: { eyeOpen: 0.82, mouthCurve: 0.4, earPerk: 0.72, blush: 0.14, sleepy: 0.0 },
  playful: { eyeOpen: 1.0, mouthCurve: 0.7, earPerk: 1.0, blush: 0.36, sleepy: 0.0 },
  sleepy: { eyeOpen: 0.24, mouthCurve: 0.12, earPerk: 0.26, blush: 0.1, sleepy: 1.0 },
  happy: { eyeOpen: 0.92, mouthCurve: 1.0, earPerk: 0.94, blush: 0.55, sleepy: 0.0 },
};

/** Humeur courante, exposée à l'UI (badge dans la barre du haut). */
export const mood = writable<Mood>('content');

const IDLE_TO_SLEEPY = 8; // secondes d'inactivité avant l'assoupissement
const PET_DURATION = 2.2; // durée de l'état « heureux » après une caresse

export class MoodController {
  private expr: Expression = { ...PRESETS.content };
  private current: Mood = 'content';
  private idle = 0;
  private happyTimer = 0;

  update(dt: number, opts: { mouseActive: boolean; mouseSpeed: number }): Expression {
    // 1) Choix de l'humeur cible.
    let next: Mood;
    if (this.happyTimer > 0) {
      this.happyTimer -= dt;
      next = 'happy';
    } else if (opts.mouseActive && opts.mouseSpeed > 0.15) {
      this.idle = 0;
      next = 'playful';
    } else {
      this.idle += dt;
      next = this.idle > IDLE_TO_SLEEPY ? 'sleepy' : 'content';
    }

    if (next !== this.current) {
      this.current = next;
      mood.set(next);
    }

    // 2) Lissage de l'expression vers la cible (indépendant du framerate).
    const target = PRESETS[next];
    const k = 1 - Math.exp(-dt * 4);
    this.expr.eyeOpen += (target.eyeOpen - this.expr.eyeOpen) * k;
    this.expr.mouthCurve += (target.mouthCurve - this.expr.mouthCurve) * k;
    this.expr.earPerk += (target.earPerk - this.expr.earPerk) * k;
    this.expr.blush += (target.blush - this.expr.blush) * k;
    this.expr.sleepy += (target.sleepy - this.expr.sleepy) * k;
    return this.expr;
  }

  /** Caresse : bascule en humeur « heureux » pour un court instant. */
  pet(): void {
    this.happyTimer = PET_DURATION;
  }
}
