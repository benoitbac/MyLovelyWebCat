<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Renderer } from '../engine/renderer';
  import { setRenderer } from '../companion/companion';

  let canvas!: HTMLCanvasElement;
  let error = $state<string | null>(null);
  let renderer: Renderer | null = null;

  onMount(async () => {
    try {
      renderer = await Renderer.create(canvas);
      setRenderer(renderer);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  onDestroy(() => {
    setRenderer(null);
    renderer?.dispose();
  });

  function onMove(e: PointerEvent) {
    renderer?.setPointer(e.clientX, e.clientY, true);
  }
  function onLeave() {
    renderer?.clearPointer();
  }
  function onDown(e: PointerEvent) {
    renderer?.setPointer(e.clientX, e.clientY, true);
    renderer?.pet(); // caresser au clic
  }
</script>

<div class="stage">
  <canvas bind:this={canvas} onpointermove={onMove} onpointerleave={onLeave} onpointerdown={onDown}
  ></canvas>

  {#if error}
    <div class="fallback" role="alert">
      <div class="emoji">😿</div>
      <h2>WebGPU indisponible</h2>
      <p>{error}</p>
      <p class="hint">Essaie Chrome ou Edge 113+, ou active WebGPU dans les options.</p>
    </div>
  {/if}
</div>

<style>
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: pointer;
  }
  .fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 6px;
    padding: 24px;
    color: var(--muted);
  }
  .emoji {
    font-size: 48px;
  }
  .fallback h2 {
    margin: 6px 0 0;
    color: var(--text);
  }
  .hint {
    font-size: 13px;
    opacity: 0.8;
  }
</style>
