<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CatSvg from '../CatSvg.svelte';
  import { ready } from '../../game/wasm';
  import { Life } from '../../wasm/miaou_engine';
  import { expression, gaze } from '../../companion/loop';
  import { profile, go } from '../../state/app';
  import { kvGet, kvSet } from '../../state/db';

  let room!: HTMLDivElement;
  let life: Life | null = null;
  let raf = 0;
  let last = 0;
  let W = 900;
  let saveAcc = 0;

  // État réactif du chat pour le rendu.
  let x = $state(450);
  let bob = $state(0);
  let facing = $state(1);
  let catState = $state(2);
  let hunger = $state(72);
  let energy = $state(80);
  let joy = $state(68);
  let hygiene = $state(75);
  let clock = $state(0.18);

  const STATE_LABEL = ['🐾', '🐾', '😺', '😴', '🧶', '🍽️', '🧼'];

  function blink(t: number): number {
    const p = (t * 0.3) % 1;
    return p < 0.06 ? Math.abs(p - 0.03) / 0.03 : 1;
  }

  function pushExpression(s: number, joyV: number, t: number) {
    let e = { eyeOpen: 0.82, mouthCurve: 0.4, earPerk: 0.7, blush: 0.14, sleepy: 0 };
    if (s === 3) e = { eyeOpen: 0.06, mouthCurve: 0.15, earPerk: 0.3, blush: 0.08, sleepy: 1 };
    else if (s === 4) e = { eyeOpen: 1.0, mouthCurve: 0.92, earPerk: 1.0, blush: 0.4, sleepy: 0 };
    else if (s === 5) e = { eyeOpen: 0.7, mouthCurve: 0.6, earPerk: 0.85, blush: 0.28, sleepy: 0 };
    else if (s === 6) e = { eyeOpen: 0.5, mouthCurve: 0.35, earPerk: 0.6, blush: 0.15, sleepy: 0 };
    else e.mouthCurve = (joyV / 100) * 0.8 + 0.08;
    expression.set({ ...e, eyeOpen: e.eyeOpen * blink(t) });
    gaze.set({ x: facing * 0.15, y: 0 });
  }

  function frame(tms: number) {
    const t = tms / 1000;
    const dt = last ? Math.min(t - last, 0.05) : 0.016;
    last = t;
    if (life) {
      life.update(dt);
      x = life.x;
      bob = life.bob;
      facing = life.facing;
      catState = life.state;
      hunger = life.hunger;
      energy = life.energy;
      joy = life.joy;
      hygiene = life.hygiene;
      clock = life.clock;
      pushExpression(catState, joy, t);

      saveAcc += dt;
      if (saveAcc > 5) {
        saveAcc = 0;
        void kvSet('life', { hunger, energy, joy, hygiene });
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    W = room.clientWidth;
    life?.resize(W);
  }

  onMount(async () => {
    await ready();
    life = new Life((Math.floor(Math.random() * 4294967295) + 1) >>> 0);
    const saved = await kvGet<{ hunger: number; energy: number; joy: number; hygiene: number }>(
      'life',
    );
    if (saved) life.load(saved.hunger, saved.energy, saved.joy, saved.hygiene, 0);
    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    void kvSet('life', { hunger, energy, joy, hygiene });
    life?.free();
  });

  // Cycle jour/nuit → obscurité 0 (jour) .. 1 (nuit).
  const darkness = $derived.by(() => {
    const c = clock;
    if (c < 0.1) return 1 - c / 0.1;
    if (c < 0.15) return 0;
    if (c < 0.5) return 0;
    if (c < 0.62) return (c - 0.5) / 0.12;
    if (c < 0.92) return 1;
    return 1 - (c - 0.92) / 0.08;
  });
  const warm = $derived(
    Math.max(0, 1 - Math.min(Math.abs(clock - 0.1), Math.abs(clock - 0.55)) / 0.08),
  );
  const sunX = $derived(12 + clock * 76);
  const sunY = $derived(20 + Math.abs(clock - 0.32) * 90);

  const needs = $derived([
    { icon: '🍖', label: 'Faim', v: hunger },
    { icon: '⚡', label: 'Énergie', v: energy },
    { icon: '💜', label: 'Joie', v: joy },
    { icon: '🛁', label: 'Propreté', v: hygiene },
  ]);

  const actions = [
    { icon: '🍽️', label: 'Nourrir', fn: () => life?.feed() },
    { icon: '🫶', label: 'Câliner', fn: () => life?.cuddle() },
    { icon: '🧶', label: 'Jouer', fn: () => life?.toy() },
    { icon: '🛁', label: 'Laver', fn: () => life?.clean() },
  ];
</script>

<div class="room" bind:this={room}>
  <!-- fenêtre + ciel dynamique -->
  <div
    class="window"
    style="background: linear-gradient(180deg,
      color-mix(in srgb, #9cc4ff {100 - darkness * 88}%, #0b1030),
      color-mix(in srgb, #cfe4ff {100 - darkness * 90}%, #141838));"
  >
    <div
      class="sun"
      style="left:{sunX}%; top:{sunY}%;
        background: radial-gradient(circle, {darkness > 0.5
        ? '#eef2ff'
        : '#ffe9a8'}, transparent 70%);
        box-shadow: 0 0 40px {darkness > 0.5 ? 'rgba(220,230,255,.6)' : 'rgba(255,210,120,.8)'};"
    ></div>
    {#if darkness > 0.5}
      {#each [15, 35, 55, 72, 85, 25, 60] as sx, i (i)}
        <div class="star" style="left:{sx}%; top:{10 + ((i * 13) % 60)}%"></div>
      {/each}
    {/if}
  </div>

  <div class="wall" style="opacity:{warm * 0.5}"></div>

  <!-- cadre au mur -->
  <div class="furn frame">
    <svg viewBox="0 0 72 60">
      <rect
        x="3"
        y="3"
        width="66"
        height="54"
        rx="4"
        fill="#241d3c"
        stroke="#5a4a86"
        stroke-width="3"
      />
      <circle cx="36" cy="24" r="11" fill="#ffd24a" opacity="0.75" />
      <path d="M10 52 L26 34 L36 44 L46 30 L62 52 Z" fill="#7b5cff" />
    </svg>
  </div>

  <div class="floor"></div>
  <div class="rug"></div>

  <!-- plante -->
  <div class="furn plant2">
    <svg viewBox="0 0 90 130">
      <ellipse cx="45" cy="124" rx="30" ry="6" fill="#00000033" />
      <path d="M24 90 H66 L60 124 H30 Z" fill="#c96f4a" />
      <path d="M24 90 H66 L64 100 H26 Z" fill="#e0865f" />
      <path d="M45 90 C20 72 18 30 40 20 C45 46 47 70 45 90 Z" fill="#3f9a5a" />
      <path d="M45 90 C70 70 74 34 52 22 C47 48 47 70 45 90 Z" fill="#4fb56a" />
      <path d="M45 88 C44 60 44 34 46 24 C47 42 47 66 45 88 Z" fill="#5fc57a" />
    </svg>
  </div>

  <!-- gamelles -->
  <div class="furn bowls">
    <svg viewBox="0 0 130 60">
      <ellipse cx="65" cy="52" rx="58" ry="7" fill="#00000033" />
      <path d="M8 32 a30 15 0 0 0 60 0 Z" fill="#c94f7c" />
      <ellipse cx="38" cy="32" rx="30" ry="9" fill="#e06a95" />
      <ellipse cx="38" cy="31" rx="22" ry="6" fill="#8a5a34" />
      <path d="M72 36 a24 12 0 0 0 48 0 Z" fill="#4a7ec9" />
      <ellipse cx="96" cy="36" rx="24" ry="7" fill="#6a9ae0" />
      <ellipse cx="96" cy="35" rx="17" ry="4.5" fill="#bfe0ff" />
    </svg>
  </div>

  <!-- arbre à chat -->
  <div class="furn tree">
    <svg viewBox="0 0 120 230">
      <ellipse cx="60" cy="216" rx="48" ry="12" fill="#00000038" />
      <rect x="28" y="196" width="64" height="20" rx="7" fill="#6b5842" />
      <rect x="49" y="74" width="22" height="124" fill="#8a7250" />
      <rect x="49" y="74" width="22" height="124" fill="#000" opacity="0.06" />
      <rect x="16" y="58" width="88" height="18" rx="9" fill="#6b5842" />
      <ellipse cx="60" cy="54" rx="42" ry="17" fill="#5b4bd6" />
      <ellipse cx="60" cy="49" rx="35" ry="13" fill="#9a7bff" />
    </svg>
  </div>

  <!-- le chat vivant -->
  <button
    class="cat-wrap"
    style="transform: translateX({x}px)"
    onclick={() => life?.cuddle()}
    aria-label="Câliner le chat"
  >
    <div
      class="cat-inner"
      class:sleeping={catState === 3}
      style="transform: translate(-50%, {-bob}px) scaleX({facing})"
    >
      <CatSvg size={150} />
      {#if catState === 3}<span class="zzz">💤</span>{/if}
    </div>
  </button>

  <!-- teinte nuit -->
  <div class="night" style="opacity:{darkness * 0.55}"></div>

  <!-- HUD -->
  <header class="topbar">
    <div class="who">
      <b>{$profile.name}</b>
      <span class="mood">{STATE_LABEL[catState]}</span>
    </div>
    <div class="coins">🪙 {$profile.coins.toLocaleString('fr-FR')}</div>
  </header>

  <div class="needs">
    {#each needs as n (n.label)}
      <div class="need" class:low={n.v < 25} title={`${n.label} : ${Math.round(n.v)}%`}>
        <span class="ic">{n.icon}</span>
        <div class="track"><i style="width:{n.v}%"></i></div>
      </div>
    {/each}
  </div>

  <nav class="dock">
    {#each actions as a (a.label)}
      <button class="act" onclick={a.fn}>
        <span class="i">{a.icon}</span><span class="l">{a.label}</span>
      </button>
    {/each}
    <button class="play" onclick={() => go('game')}>🎮 Jouer</button>
    <button class="custo" onclick={() => go('create')} title="Personnaliser">🎨</button>
  </nav>
</div>

<style>
  .room {
    position: relative;
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    background: linear-gradient(180deg, #2a2140, #1a1530 60%, #241b3a);
  }
  .window {
    position: absolute;
    top: 9%;
    left: 50%;
    transform: translateX(-50%);
    width: 34%;
    height: 40%;
    border-radius: 16px;
    border: 8px solid #3a2f58;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.4),
      inset 0 0 0 2px rgba(255, 255, 255, 0.04);
    overflow: hidden;
  }
  .window::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255, 255, 255, 0.08), transparent 40%),
      linear-gradient(90deg, transparent 49%, #3a2f58 49% 51%, transparent 51%),
      linear-gradient(0deg, transparent 49%, #3a2f58 49% 51%, transparent 51%);
  }
  .sun {
    position: absolute;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #fff;
    opacity: 0.8;
    animation: tw 3s ease-in-out infinite;
  }
  @keyframes tw {
    50% {
      opacity: 0.2;
    }
  }
  .wall {
    position: absolute;
    inset: 0;
    background: radial-gradient(60% 50% at 50% 30%, rgba(255, 180, 120, 0.5), transparent 70%);
    pointer-events: none;
  }
  .floor {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 26%;
    background:
      repeating-linear-gradient(95deg, rgba(0, 0, 0, 0.06) 0 2px, transparent 2px 46px),
      linear-gradient(180deg, #6b4f36 0%, #7d5c3f 30%, #6a4a30 100%);
    box-shadow: inset 0 10px 30px rgba(0, 0, 0, 0.45);
  }
  .floor::before {
    /* plinthe */
    content: '';
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 10px;
    background: #4a3a5e;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
  .rug {
    position: absolute;
    left: 50%;
    bottom: 3%;
    transform: translateX(-50%);
    width: 52%;
    height: 15%;
    border-radius: 50%;
    background: radial-gradient(ellipse, #b98fd6 0%, #9a6fc0 55%, #7d5aa6 70%, transparent 72%);
    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.2) inset;
    opacity: 0.9;
  }
  .furn {
    position: absolute;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.4));
  }
  .furn svg {
    display: block;
    height: auto;
  }
  .plant2 {
    left: 6%;
    bottom: 20%;
    width: 74px;
  }
  .plant2 svg {
    width: 74px;
  }
  .bowls {
    left: 20%;
    bottom: 15%;
    transform: translateX(-50%);
    width: 120px;
  }
  .bowls svg {
    width: 120px;
  }
  .tree {
    left: 82%;
    bottom: 15%;
    transform: translateX(-50%);
    width: 130px;
  }
  .tree svg {
    width: 130px;
  }
  .frame {
    left: 20%;
    top: 15%;
    width: 92px;
  }
  .frame svg {
    width: 92px;
  }

  .cat-wrap {
    position: absolute;
    left: 0;
    bottom: 17%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    z-index: 3;
    will-change: transform;
  }
  .cat-inner {
    transform-origin: 50% 100%;
    position: relative;
  }
  .cat-inner.sleeping {
    filter: none;
  }
  .zzz {
    position: absolute;
    top: -6px;
    right: -14px;
    font-size: 20px;
    animation: float 2.4s ease-in-out infinite;
  }
  @keyframes float {
    50% {
      transform: translateY(-8px);
      opacity: 0.6;
    }
  }
  .night {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(8, 10, 40, 0.9), rgba(20, 12, 40, 0.7));
    pointer-events: none;
    z-index: 2;
  }

  .topbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    z-index: 5;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    color: var(--text);
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  .mood {
    font-size: 20px;
  }
  .coins {
    font-weight: 700;
    color: var(--gold);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--stroke);
    padding: 6px 12px;
    border-radius: 999px;
  }

  .needs {
    position: absolute;
    top: 58px;
    left: 18px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 180px;
    padding: 12px;
    background: rgba(15, 12, 30, 0.55);
    border: 1px solid var(--stroke);
    border-radius: 14px;
    backdrop-filter: blur(10px);
  }
  .need {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ic {
    width: 18px;
    text-align: center;
  }
  .track {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
  }
  .track > i {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand), var(--brand-2));
    transition: width 0.3s ease;
  }
  .need.low .track > i {
    background: linear-gradient(90deg, #ff6b6b, #ff9ecf);
  }

  .dock {
    position: absolute;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 5;
    padding: 10px;
    background: rgba(15, 12, 30, 0.6);
    border: 1px solid var(--stroke);
    border-radius: 18px;
    backdrop-filter: blur(14px);
  }
  .act {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 62px;
    padding: 8px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-size: 11px;
  }
  .act:hover {
    background: color-mix(in srgb, var(--brand) 25%, var(--surface-2));
  }
  .act .i {
    font-size: 20px;
  }
  .play {
    padding: 14px 22px;
    border-radius: 14px;
    border: none;
    font-size: 15px;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
    box-shadow: 0 8px 24px rgba(123, 92, 255, 0.45);
  }
  .custo {
    padding: 12px;
    font-size: 18px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
  }
</style>
