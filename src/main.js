// ============================================================================
//  main.js — Orchestrateur : relie GPU, particules, ADN, entrées et UI.
// ============================================================================

import { initWebGPU } from './gpu/device.js';
import { Engine } from './gpu/engine.js';
import { buildParticleData } from './cat/silhouette.js';
import { DEFAULT_DNA, cloneDNA, dnaFromURL, hexToRGB } from './cat/dna.js';
import { initControls, syncInputs, updateStats } from './ui/controls.js';
import { copyShareLink, downloadCard, toast } from './ui/share.js';

const canvas = document.getElementById('gpu');
const MAX_DPR = 2;             // plafonne la résolution pour garder du FPS
const IDLE_START = 3.0;        // secondes avant de considérer le chat "au repos"
const IDLE_FULL = 9.0;

let engine;
let dna = dnaFromURL() ?? cloneDNA(DEFAULT_DNA);

// --- État runtime (entrées / temps) ----------------------------------------
const state = {
  mouse: { x: 0, y: 0 },
  mouseActive: 0,
  lastInput: 0,
  ripple: { x: 0, y: 0, t0: -10 },
};

const U = new Float32Array(32);   // miroir du bloc uniforme

function fatal(msg) {
  const o = document.getElementById('overlay');
  o.querySelector('.overlay-msg').textContent = msg;
  o.classList.add('show');
}

// --- Boucle -----------------------------------------------------------------
let last = 0;
let fpsAcc = 0, fpsFrames = 0, fpsShown = 0;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function buildUniforms(now, dt) {
  const idle = smoothstep(IDLE_START, IDLE_FULL, now - state.lastInput);
  const [pr, pg, pb] = hexToRGB(dna.primary);
  const [nr, ng, nb] = hexToRGB(dna.neon);
  const [ar, ag, ab] = hexToRGB(dna.accent);
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  const sizeBase = { low: 4.4, medium: 3.1, high: 2.4 }[dna.density] ?? 3.1;
  const rippleAge = (now - state.ripple.t0);

  U[0] = canvas.width; U[1] = canvas.height;
  U[2] = state.mouse.x; U[3] = state.mouse.y;
  U[4] = now; U[5] = dt;
  U[6] = state.mouseActive; U[7] = dna.behavior === 'shy' ? 1 : 0;
  U[8] = pr; U[9] = pg; U[10] = pb; U[11] = 1;
  U[12] = nr * 1.5; U[13] = ng * 1.5; U[14] = nb * 1.5; U[15] = 1;   // néon boosté (HDR)
  U[16] = ar * 1.4; U[17] = ag * 1.4; U[18] = ab * 1.4; U[19] = 1;
  U[20] = 0.012 + idle * 0.022;              // breatheAmp
  U[21] = 1.1 - idle * 0.5;                   // breatheSpeed
  U[22] = 0.80 + dna.trail * 0.17;            // trailDecay
  U[23] = 0.45 + dna.glow * 1.05;             // glow
  U[24] = 0.5;                                // mouseRadius (monde)
  U[25] = dna.behavior === 'shy' ? 85 : 48;   // mouseStrength
  U[26] = sizeBase * dpr;                     // sizePx
  U[27] = idle;                               // idle factor
  U[28] = state.ripple.x; U[29] = state.ripple.y;
  U[30] = rippleAge < 1.2 ? rippleAge : -1;   // <0 = inactif
  U[31] = 32;                                 // rippleStrength
}

function frame(tms) {
  const now = tms / 1000;
  const dt = last ? Math.min(now - last, 0.05) : 0.016;
  last = now;

  buildUniforms(now, dt);
  engine.writeUniforms(U);
  engine.render();

  // Compteur FPS (lissé sur ~0.5s).
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) {
    fpsShown = fpsFrames / fpsAcc;
    updateStats(fpsShown, engine.count);
    fpsAcc = 0; fpsFrames = 0;
  }

  requestAnimationFrame(frame);
}

// --- Redimensionnement ------------------------------------------------------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (w === engine.width && h === engine.height) return;
  canvas.width = w; canvas.height = h;
  engine.resize(w, h);
}

// --- Entrées : souris = coord. "monde" (inverse de la correction d'aspect) --
function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const a = canvas.width / canvas.height;
  return a >= 1 ? { x: nx * a, y: ny } : { x: nx, y: ny / a };
}

function markInput() { state.lastInput = last; }

function bindInput() {
  canvas.addEventListener('pointermove', (e) => {
    state.mouse = toWorld(e.clientX, e.clientY);
    state.mouseActive = 1;
    markInput();
  });
  canvas.addEventListener('pointerleave', () => { state.mouseActive = 0; });
  canvas.addEventListener('pointerdown', (e) => {
    const w = toWorld(e.clientX, e.clientY);
    state.ripple = { x: w.x, y: w.y, t0: last };   // déclenche l'onde de choc
    markInput();
  });
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') actions.onRandom();
    if (e.key === 'h' || e.key === 'H') document.getElementById('panel')?.classList.toggle('collapsed');
  });
}

// --- Applique un ADN (reconstruit les particules si nécessaire) -------------
function applyDNA(structural) {
  if (structural) {
    const { data, count } = buildParticleData(dna);
    engine.setParticles(data, count);
  }
}

// --- Actions de l'UI --------------------------------------------------------
const actions = {
  onChange(next, structural) { dna = next; applyDNA(structural); },
  onRandom() {
    const rnd = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    dna = cloneDNA({
      ...dna,
      primary: rnd(), neon: rnd(), accent: rnd(),
      behavior: Math.random() < 0.5 ? 'magnet' : 'shy',
      hat: Math.random() < 0.5,
      trail: +(0.3 + Math.random() * 0.6).toFixed(2),
      glow: +(0.5 + Math.random() * 0.5).toFixed(2),
    });
    syncInputs(dna);
    applyDNA(true);
    toast('🎲 Nouvel ADN généré !');
  },
  onReset() {
    dna = cloneDNA(DEFAULT_DNA);
    syncInputs(dna);
    applyDNA(true);
    history.replaceState(null, '', location.pathname);
    toast('↺ ADN réinitialisé');
  },
  onLink() { copyShareLink(dna); },
  onCard() {
    downloadCard(canvas, dna, async () => {
      engine.writeUniforms(U);
      engine.render();
      await engine.device.queue.onSubmittedWorkDone();
    });
  },
};

// --- Boot -------------------------------------------------------------------
async function boot() {
  let gpu;
  try {
    gpu = await initWebGPU(canvas);
  } catch (e) {
    fatal(e.message);
    return;
  }

  // Récupération d'un device perdu (driver reset, mise en veille…).
  gpu.device.lost.then((info) => {
    if (info.reason !== 'destroyed') fatal('Contexte GPU perdu — recharge la page. (' + info.message + ')');
  });

  engine = new Engine(gpu, canvas);
  await engine.init();

  resize();
  const { data, count } = buildParticleData(dna);
  engine.setParticles(data, count);

  initControls(dna, actions);
  bindInput();

  document.getElementById('loading')?.remove();
  requestAnimationFrame(frame);
}

boot();
