// Cerveau du compagnon, découplé du rendu : une boucle rAF qui fait vivre
// l'humeur, calcule l'expression (avec clignement) et suit le regard.
// L'illustration (CatSvg) ne fait que lire ces stores et s'animer.

import { writable } from 'svelte/store';
import { MoodController, type Expression } from './mood';
import { fps } from '../state/stats';

export const expression = writable<Expression>({
  eyeOpen: 0.82,
  mouthCurve: 0.4,
  earPerk: 0.72,
  blush: 0.14,
  sleepy: 0,
});
export const gaze = writable<{ x: number; y: number }>({ x: 0, y: 0 });

const controller = new MoodController();
let pointer = { x: 0, y: 0, active: false };
let prev = { x: 0, y: 0 };
let gazeOverride: { x: number; y: number } | null = null;

/** Force la cible du regard (ex. la pelote pendant le jeu). null = suit la souris. */
export function setGazeOverride(v: { x: number; y: number } | null): void {
  gazeOverride = v;
}
let raf = 0;
let last = 0;
let fpsAcc = 0;
let fpsFrames = 0;

// Clignement naturel : brève fermeture périodique (~toutes les 3,3 s).
function blink(t: number): number {
  const p = (t * 0.3) % 1;
  if (p < 0.06) return Math.abs(p - 0.03) / 0.03;
  return 1;
}

function tick(ms: number): void {
  const t = ms / 1000;
  const dt = last ? Math.min(t - last, 0.05) : 0.016;
  last = t;

  const speed = Math.hypot(pointer.x - prev.x, pointer.y - prev.y) / Math.max(dt, 1e-3);
  prev = { x: pointer.x, y: pointer.y };

  const e = controller.update(dt, { mouseActive: pointer.active, mouseSpeed: speed });
  expression.set({ ...e, eyeOpen: e.eyeOpen * blink(t) });

  const target = gazeOverride ?? (pointer.active ? pointer : { x: 0, y: 0 });
  const k = Math.min(1, dt * 6);
  gaze.update((g) => ({ x: g.x + (target.x - g.x) * k, y: g.y + (target.y - g.y) * k }));

  fpsAcc += dt;
  fpsFrames++;
  if (fpsAcc >= 0.5) {
    fps.set(Math.round(fpsFrames / fpsAcc));
    fpsAcc = 0;
    fpsFrames = 0;
  }

  raf = requestAnimationFrame(tick);
}

export function startCompanionLoop(): void {
  last = 0;
  if (!raf) raf = requestAnimationFrame(tick);
}
export function stopCompanionLoop(): void {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}
export function setPointer(x: number, y: number, active: boolean): void {
  pointer = { x, y, active };
}
export function clearPointer(): void {
  pointer = { ...pointer, active: false };
}
export function pet(): void {
  controller.pet();
}
export function play(): void {
  controller.play();
}
