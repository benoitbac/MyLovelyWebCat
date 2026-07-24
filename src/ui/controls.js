// ============================================================================
//  controls.js — Câble le panneau HTML à l'ADN cosmétique.
//  Ne connaît rien du rendu : il émet juste des événements via les callbacks.
// ============================================================================

import { STRUCTURAL_KEYS } from '../cat/dna.js';

const $ = (id) => document.getElementById(id);

const FIELDS = {
  primary: { el: 'c-primary', prop: 'value' },
  neon: { el: 'c-neon', prop: 'value' },
  accent: { el: 'c-accent', prop: 'value' },
  behavior: { el: 'c-behavior', prop: 'value' },
  hat: { el: 'c-hat', prop: 'checked' },
  trail: { el: 'c-trail', prop: 'value', num: true },
  glow: { el: 'c-glow', prop: 'value', num: true },
  density: { el: 'c-density', prop: 'value' },
};

export function initControls(dna, handlers) {
  // Reflète l'ADN courant dans les inputs.
  syncInputs(dna);

  for (const [key, f] of Object.entries(FIELDS)) {
    const el = $(f.el);
    if (!el) continue;
    const evt = el.type === 'range' ? 'input' : 'change';
    el.addEventListener(evt, () => {
      dna[key] = f.num ? parseFloat(el[f.prop]) : el[f.prop];
      handlers.onChange(dna, STRUCTURAL_KEYS.includes(key));
    });
  }

  $('btn-random')?.addEventListener('click', () => handlers.onRandom());
  $('btn-reset')?.addEventListener('click', () => handlers.onReset());
  $('btn-link')?.addEventListener('click', () => handlers.onLink());
  $('btn-card')?.addEventListener('click', () => handlers.onCard());
  $('panel-toggle')?.addEventListener('click', () => {
    document.getElementById('panel')?.classList.toggle('collapsed');
  });
}

export function syncInputs(dna) {
  for (const [key, f] of Object.entries(FIELDS)) {
    const el = $(f.el);
    if (el) el[f.prop] = dna[key];
  }
}

export function updateStats(fps, particles) {
  const f = $('stat-fps');
  const p = $('stat-count');
  if (f) f.textContent = fps.toFixed(0);
  if (p) p.textContent = particles.toLocaleString('fr-FR');
}
