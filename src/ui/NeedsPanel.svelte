<script lang="ts">
  import { needs } from '../companion/needs';

  const items = [
    { key: 'hunger', icon: '🍖', label: 'Faim' },
    { key: 'energy', icon: '⚡', label: 'Énergie' },
    { key: 'hygiene', icon: '🛁', label: 'Propreté' },
    { key: 'affection', icon: '💜', label: 'Affection' },
  ] as const;
</script>

<div class="needs" aria-label="Besoins du compagnon">
  {#each items as it (it.key)}
    {@const v = Math.round($needs[it.key])}
    <div class="need" class:low={v < 25} title={`${it.label} : ${v}%`}>
      <span class="ic">{it.icon}</span>
      <div class="track"><i style="width:{v}%"></i></div>
    </div>
  {/each}
</div>

<style>
  .needs {
    position: fixed;
    top: 60px;
    left: 12px;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    width: 190px;
    background: color-mix(in srgb, var(--surface) 72%, transparent);
    border: 1px solid var(--stroke);
    border-radius: var(--radius);
    backdrop-filter: blur(14px);
    box-shadow: var(--shadow);
  }
  .need {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .ic {
    font-size: 15px;
    width: 18px;
    text-align: center;
  }
  .track {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: rgba(128, 128, 160, 0.22);
    overflow: hidden;
  }
  .track > i {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand), var(--brand-2));
    transition: width 0.4s ease;
  }
  .need.low .track > i {
    background: linear-gradient(90deg, #ff6b6b, #ff9ecf);
  }
  .need.low .ic {
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      transform: scale(1.18);
    }
  }
</style>
