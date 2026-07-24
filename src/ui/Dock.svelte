<script lang="ts">
  import { performAction } from '../companion/companion';
  import type { ActionKind } from '../companion/needs';

  const actions: { icon: string; label: string; kind: ActionKind }[] = [
    { icon: '🤚', label: 'Caresser', kind: 'pet' },
    { icon: '🍽️', label: 'Nourrir', kind: 'feed' },
    { icon: '🧶', label: 'Jouer', kind: 'play' },
    { icon: '🛁', label: 'Brosser', kind: 'groom' },
  ];
</script>

<nav class="dock" aria-label="Actions du compagnon">
  {#each actions as action (action.kind)}
    <button class="act" onclick={() => performAction(action.kind)} title={action.label}>
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
    transition:
      transform 0.08s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }
  .act:hover {
    background: color-mix(in srgb, var(--brand) 20%, var(--surface-2));
    box-shadow: 0 0 18px color-mix(in srgb, var(--brand) 35%, transparent);
  }
  .act:active {
    transform: translateY(2px) scale(0.96);
  }
  .i {
    font-size: 20px;
  }
</style>
