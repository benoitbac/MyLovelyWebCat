<script lang="ts">
  import CatSvg from './CatSvg.svelte';
  import { setPointer, clearPointer, pet } from '../companion/loop';

  let stage!: HTMLDivElement;

  function toNorm(e: PointerEvent) {
    const r = stage.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.42;
    const nx = (e.clientX - cx) / (r.width * 0.5);
    const ny = (e.clientY - cy) / (r.height * 0.5);
    return { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
  }

  function onMove(e: PointerEvent) {
    const n = toNorm(e);
    setPointer(n.x, n.y, true);
  }
  function onLeave() {
    clearPointer();
  }
  function onDown(e: PointerEvent) {
    const n = toNorm(e);
    setPointer(n.x, n.y, true);
    pet();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="stage"
  bind:this={stage}
  onpointermove={onMove}
  onpointerleave={onLeave}
  onpointerdown={onDown}
>
  <div class="bg"></div>
  <div class="glow"></div>
  <CatSvg />
</div>

<style>
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: pointer;
  }
  .bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        60% 50% at 50% 38%,
        color-mix(in srgb, var(--brand) 22%, transparent),
        transparent 70%
      ),
      radial-gradient(80% 80% at 50% 120%, var(--bg-2), var(--bg));
    z-index: 0;
  }
  .glow {
    position: absolute;
    width: 60vmin;
    height: 60vmin;
    top: 42%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--brand) 30%, transparent),
      transparent 62%
    );
    filter: blur(30px);
    z-index: 0;
    animation: pulse 6s ease-in-out infinite;
  }
  :global(.cat) {
    position: relative;
    z-index: 1;
  }
  @keyframes pulse {
    50% {
      transform: translate(-50%, -50%) scale(1.08);
      opacity: 0.85;
    }
  }
</style>
