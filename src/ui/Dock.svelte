<script lang="ts">
  // Barre d'actions. Désactivées pour l'instant : elles seront câblées au
  // Sprint 2 (Tamagotchi) quand le compagnon aura des besoins et réagira.
  const actions = [
    { icon: '🤚', label: 'Caresser' },
    { icon: '🍽️', label: 'Nourrir' },
    { icon: '🧶', label: 'Jouer' },
    { icon: '🛁', label: 'Brosser' },
  ];
</script>

<nav class="dock" aria-label="Actions du compagnon">
  {#each actions as action (action.label)}
    <button class="act" disabled title="Bientôt — Sprint 2">
      <span class="i">{action.icon}</span>
      <span class="l">{action.label}</span>
    </button>
  {/each}
</nav>

<style>
  .dock {
    display: flex;
    gap: var(--gap);
    justify-content: center;
    padding: 12px;
    background: color-mix(in srgb, var(--surface) 70%, transparent);
    border-top: 1px solid var(--stroke);
    backdrop-filter: blur(14px);
  }
  .act {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-width: 74px;
    padding: 8px 10px;
    border: 1px solid var(--stroke);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    font-size: 12px;
    opacity: 0.55;
  }
  .act:disabled {
    cursor: not-allowed;
  }
  .i {
    font-size: 20px;
  }
</style>
