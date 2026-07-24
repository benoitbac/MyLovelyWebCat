<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CatSvg from './CatSvg.svelte';
  import init, { Game } from '../wasm/miaou_engine';
  import { draw } from '../game/render';
  import { sndCatch, sndGolden, sndPounce, sndOver, resumeAudio } from '../game/sound';
  import { setGazeOverride, play, pet } from '../companion/loop';
  import { kvGet, kvSet } from '../state/db';

  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;

  let phase = $state(0); // 0 menu, 1 playing, 2 over
  let score = $state(0);
  let combo = $state(0);
  let mult = $state(1);
  let timeLeft = $state(60);
  let best = $state(0);
  let bestCombo = $state(0);
  let catX = $state(0);
  let catLift = $state(0);
  let catSquash = $state(0);
  let catFacing = $state(1);
  let catBaseY = $state(0);

  let game: Game | null = null;
  let raf = 0;
  let last = 0;
  let ctx: CanvasRenderingContext2D | null = null;
  let ro: ResizeObserver;
  let W = 0;
  let H = 0;

  function resize() {
    W = host.clientWidth;
    H = host.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    game?.resize(W, H);
  }

  function localXY(e: PointerEvent) {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onMove(e: PointerEvent) {
    const p = localXY(e);
    game?.set_cursor(p.x, p.y);
  }
  function onDown(e: PointerEvent) {
    if (!game) return;
    resumeAudio();
    const p = localXY(e);
    game.set_cursor(p.x, p.y);
    const wasPlaying = game.phase === 1;
    game.pounce();
    if (!wasPlaying) play();
  }

  function frame(t: number) {
    const now = t / 1000;
    const dt = last ? Math.min(now - last, 0.05) : 0.016;
    last = now;

    if (game) {
      game.update(dt);
      if (ctx) draw(ctx, game, W, H);

      // Événements → son / réactions.
      const ev = game.take_events();
      for (let i = 0; i < ev.length; i += 2) {
        const code = ev[i];
        if (code === 1) {
          if (ev[i + 1] === 2) sndGolden();
          else sndCatch(game.combo);
          pet();
          navigator.vibrate?.(8);
        } else if (code === 2) {
          sndPounce();
        } else if (code === 3) {
          sndOver();
          void kvSet('bestScore', game.best);
        }
      }

      phase = game.phase;
      score = game.score;
      combo = game.combo;
      mult = game.mult;
      timeLeft = game.time_left;
      best = game.best;
      bestCombo = game.best_combo;
      catX = game.cat_x;
      catLift = game.cat_lift;
      catSquash = game.cat_squash;
      catFacing = game.cat_facing;
      catBaseY = game.base;

      setGazeOverride({
        x: Math.max(-1, Math.min(1, (game.cursor_x - game.cat_x) / 130)),
        y: Math.max(-1, Math.min(1, (game.cursor_y - (game.base - 70)) / 130)),
      });
    }

    raf = requestAnimationFrame(frame);
  }

  onMount(async () => {
    ctx = canvas.getContext('2d');
    await init();
    game = new Game((Math.floor(Math.random() * 4294967295) + 1) >>> 0);
    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    document.body.style.cursor = 'none';
    const b = await kvGet<number>('bestScore');
    if (typeof b === 'number') game.load_best(b);
    raf = requestAnimationFrame(frame);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    ro?.disconnect();
    setGazeOverride(null);
    document.body.style.cursor = '';
    game?.free();
  });
</script>

<div
  class="scene"
  bind:this={host}
  onpointermove={onMove}
  onpointerdown={onDown}
  role="application"
  aria-label="Jeu Miaou Pounce"
  tabindex="-1"
>
  <canvas bind:this={canvas}></canvas>

  <div class="cat-wrap" style="transform: translate({catX}px, {catBaseY - catLift}px)">
    <div
      class="cat-inner"
      style="transform: translate(-50%, -100%) scaleX({catFacing}) scaleY({1 + catSquash})"
    >
      <CatSvg size={168} />
    </div>
  </div>

  {#if phase === 1}
    <div class="hud">
      <div class="score">{score.toLocaleString('fr-FR')}</div>
      {#if combo > 1}
        <div class="combo">×{mult} · combo {combo}</div>
      {/if}
    </div>
    <div class="timer"><i style="width:{(timeLeft / 60) * 100}%"></i></div>
    <div class="hint-play">Passe le laser sur les souris et <b>clique pour bondir</b> 🐾</div>
  {/if}

  {#if phase === 0}
    <div class="overlay">
      <div class="engine-badge">🦀 moteur Rust · WASM</div>
      <h1>Miaou <span>Pounce</span></h1>
      <p>Guide le laser, fais bondir le chat sur les souris. 60 secondes de chasse !</p>
      <div class="cta">Clique n'importe où pour jouer</div>
      {#if best > 0}<div class="best">Meilleur : {best.toLocaleString('fr-FR')}</div>{/if}
    </div>
  {/if}

  {#if phase === 2}
    <div class="overlay">
      <div class="result-emoji">😻</div>
      <h1>Score : {score.toLocaleString('fr-FR')}</h1>
      <p>
        Meilleur combo ×{Math.min(6, 1 + Math.floor(bestCombo / 3))} · record {best.toLocaleString(
          'fr-FR',
        )}
      </p>
      <div class="cta">Clique pour rejouer</div>
    </div>
  {/if}
</div>

<style>
  .scene {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    cursor: none;
    outline: none;
    background:
      radial-gradient(
        70% 60% at 50% 30%,
        color-mix(in srgb, var(--brand) 16%, transparent),
        transparent 70%
      ),
      radial-gradient(90% 90% at 50% 120%, var(--bg-2), var(--bg));
  }
  .scene :global(*) {
    cursor: none;
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .cat-wrap {
    position: absolute;
    top: 0;
    left: 0;
    will-change: transform;
    z-index: 2;
    pointer-events: none;
  }
  .cat-inner {
    transform-origin: 50% 100%;
  }

  .hud {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    z-index: 3;
    pointer-events: none;
  }
  .score {
    font-size: 44px;
    font-weight: 800;
    color: var(--text);
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.4);
    font-variant-numeric: tabular-nums;
  }
  .combo {
    margin-top: 2px;
    font-size: 15px;
    font-weight: 700;
    color: var(--gold);
  }
  .timer {
    position: absolute;
    top: 0;
    left: 0;
    height: 5px;
    width: 100%;
    background: rgba(255, 255, 255, 0.08);
    z-index: 3;
  }
  .timer > i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--brand), var(--brand-2));
    transition: width 0.1s linear;
  }
  .hint-play {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 13px;
    color: var(--muted);
    z-index: 3;
    pointer-events: none;
    white-space: nowrap;
  }

  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
    z-index: 4;
    pointer-events: none;
    background: radial-gradient(circle at 50% 45%, transparent 30%, rgba(6, 6, 14, 0.55));
  }
  .engine-badge {
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-2);
    border: 1px solid var(--stroke);
    padding: 4px 10px;
    border-radius: 999px;
  }
  .overlay h1 {
    margin: 0;
    font-size: 46px;
    font-weight: 800;
  }
  .overlay h1 span {
    color: var(--brand-2);
  }
  .overlay p {
    margin: 0;
    max-width: 420px;
    color: var(--muted);
    line-height: 1.5;
  }
  .cta {
    margin-top: 12px;
    padding: 12px 24px;
    border-radius: 999px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
    box-shadow: 0 10px 30px rgba(123, 92, 255, 0.4);
    animation: bob 1.6s ease-in-out infinite;
  }
  .best {
    font-size: 14px;
    color: var(--gold);
  }
  .result-emoji {
    font-size: 60px;
  }
  @keyframes bob {
    50% {
      transform: translateY(-5px);
    }
  }
</style>
