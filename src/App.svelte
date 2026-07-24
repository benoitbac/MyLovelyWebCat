<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import GameScene from './ui/GameScene.svelte';
  import CustomizationPanel from './ui/CustomizationPanel.svelte';
  import { theme, toggleTheme } from './state/theme';
  import { mood, type Mood } from './companion/mood';
  import { startDnaEngine } from './customization/dna';
  import { startCompanionLoop, stopCompanionLoop } from './companion/loop';
  import { muted } from './game/sound';

  let showCustomize = $state(false);

  onMount(() => {
    void startDnaEngine();
    startCompanionLoop();
  });
  onDestroy(() => stopCompanionLoop());

  const MOOD_LABEL: Record<Mood, string> = {
    content: '😺',
    playful: '😸',
    sleepy: '😴',
    happy: '😻',
  };
</script>

<main>
  <header class="topbar">
    <div class="brand">
      <span class="logo">🐱</span>
      <b>Miaou</b>
      <span class="tag">Pounce</span>
    </div>
    <div class="meta">
      <span class="mood" title="Humeur du compagnon">{MOOD_LABEL[$mood]}</span>
      <button
        class="icon"
        onclick={() => muted.update((m) => !m)}
        title="Son"
        aria-label="Activer/couper le son"
      >
        {$muted ? '🔇' : '🔊'}
      </button>
      <button
        class="icon"
        onclick={() => (showCustomize = !showCustomize)}
        title="Personnaliser"
        aria-label="Personnaliser"
      >
        🎨
      </button>
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

  <GameScene />
  {#if showCustomize}
    <CustomizationPanel onClose={() => (showCustomize = false)} />
  {/if}
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
    z-index: 5;
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
    gap: 10px;
  }
  .mood {
    font-size: 15px;
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
