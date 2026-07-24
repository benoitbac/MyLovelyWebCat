// Petits sons de jeu synthétisés (WebAudio) — zéro asset. Le contexte audio
// est créé au premier geste (clic de démarrage), ce qui satisfait l'autoplay.

import { writable } from 'svelte/store';

export const muted = writable(false);
let isMuted = false;
muted.subscribe((m) => (isMuted = m));

let ctx: AudioContext | null = null;
function ac(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

export function resumeAudio(): void {
  void ac().resume();
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number): void {
  if (isMuted) return;
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g).connect(a.destination);
  const t = a.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

export function sndCatch(combo: number): void {
  const step = Math.min(combo, 12);
  blip(520 + step * 45, 0.09, 'triangle', 0.07);
  blip(780 + step * 45, 0.13, 'sine', 0.05);
}
export function sndGolden(): void {
  blip(660, 0.1, 'triangle', 0.07);
  blip(990, 0.12, 'sine', 0.06);
  blip(1320, 0.16, 'sine', 0.05);
}
export function sndPounce(): void {
  blip(240, 0.07, 'sine', 0.05);
}
export function sndMiss(): void {
  blip(180, 0.14, 'sawtooth', 0.03);
}
export function sndOver(): void {
  blip(440, 0.16, 'sine', 0.06);
  window.setTimeout(() => blip(330, 0.22, 'sine', 0.05), 130);
}
