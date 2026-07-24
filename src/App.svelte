<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CompanionStage from './ui/CompanionStage.svelte';
  import Dock from './ui/Dock.svelte';
  import NeedsPanel from './ui/NeedsPanel.svelte';
  import { theme, toggleTheme } from './state/theme';
  import { fps } from './state/stats';
  import { mood, type Mood } from './companion/mood';
  import { startNeedsEngine, stopNeedsEngine } from './companion/needs';

  onMount(() => void startNeedsEngine());
  onDestroy(() => stopNeedsEngine());

  const MOOD_LABEL: Record<Mood, string> = {
    content: '😺 content',
    playful: '😸 joueur',
    sleepy: '😴 endormi',
    happy: '😻 heureux',
  };
</script>

<main>
  <header class="topbar">
    <div class="brand">
      <span class="logo">🐱</span>
      <b>Miaou</b>
      <span class="tag">companion</span>
    </div>
    <div class="meta">
      <span class="mood" title="Humeur du compagnon">{MOOD_LABEL[$mood]}</span>
      <span class="fps" title="Images par seconde">{$fps} FPS</span>
      <button
        class="icon"
        onclick={toggleTheme}
        title="Changer de thème"
        aria-label="Changer de thème"
      >
        {$theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  </header>

  <CompanionStage />
  <NeedsPanel />
  <Dock />
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--stroke);
    background: color-mix(in srgb, var(--surface) 70%, transparent);
    backdrop-filter: blur(14px);
    z-index: 2;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
  }
  .logo {
    font-size: 20px;
  }
  .tag {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--muted);
    border: 1px solid var(--stroke);
    padding: 2px 7px;
    border-radius: 999px;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .fps {
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: var(--muted);
  }
  .mood {
    font-size: 12px;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    border-radius: 999px;
    padding: 3px 10px;
  }
  .icon {
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    border-radius: var(--radius-sm);
    padding: 6px 9px;
    font-size: 14px;
    line-height: 1;
  }
</style>
