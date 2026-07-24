<script lang="ts">
  import { dna, setDNA, randomizeDNA, resetDNA, shareURL } from '../customization/dna';

  let { onClose }: { onClose: () => void } = $props();
  let copied = $state(false);

  const colors = [
    { key: 'furA', label: 'Pelage (haut)' },
    { key: 'furB', label: 'Pelage (bas)' },
    { key: 'belly', label: 'Ventre' },
    { key: 'eye', label: 'Yeux' },
    { key: 'accent', label: 'Rose' },
  ] as const;

  function onColor(key: (typeof colors)[number]['key'], e: Event) {
    setDNA(key, (e.target as HTMLInputElement).value);
  }
  function onRange(key: 'earSize' | 'roundness', e: Event) {
    setDNA(key, Number((e.target as HTMLInputElement).value));
  }

  async function share() {
    const url = shareURL();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      prompt('Copie ton lien Miaou :', url);
    }
    copied = true;
    setTimeout(() => (copied = false), 1800);
  }
</script>

<aside class="panel">
  <header>
    <h2>🎨 Apparence</h2>
    <button class="close" onclick={onClose} aria-label="Fermer">✕</button>
  </header>

  <div class="colors">
    {#each colors as c (c.key)}
      <label>
        <input type="color" value={$dna[c.key]} oninput={(e) => onColor(c.key, e)} />
        <span>{c.label}</span>
      </label>
    {/each}
  </div>

  <label class="slider">
    Oreilles <span>{$dna.earSize.toFixed(2)}</span>
    <input
      type="range"
      min="0.6"
      max="1.4"
      step="0.01"
      value={$dna.earSize}
      oninput={(e) => onRange('earSize', e)}
    />
  </label>

  <label class="slider">
    Rondeur <span>{$dna.roundness.toFixed(2)}</span>
    <input
      type="range"
      min="-1"
      max="1"
      step="0.01"
      value={$dna.roundness}
      oninput={(e) => onRange('roundness', e)}
    />
  </label>

  <div class="actions">
    <button class="ghost" onclick={randomizeDNA}>🎲 Aléatoire</button>
    <button class="ghost" onclick={resetDNA}>↺ Reset</button>
  </div>
  <button class="primary" onclick={share}>{copied ? '✓ Lien copié !' : '🔗 Lien de partage'}</button
  >
</aside>

<style>
  .panel {
    position: fixed;
    top: 60px;
    right: 12px;
    z-index: 4;
    width: 240px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: color-mix(in srgb, var(--surface) 78%, transparent);
    border: 1px solid var(--stroke);
    border-radius: var(--radius);
    backdrop-filter: blur(16px);
    box-shadow: var(--shadow);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h2 {
    margin: 0;
    font-size: 15px;
  }
  .close {
    background: transparent;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    color: var(--muted);
    padding: 3px 7px;
  }
  .colors {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .colors label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--muted);
  }
  input[type='color'] {
    width: 40px;
    height: 26px;
    padding: 1px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: transparent;
  }
  .slider {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .slider span {
    float: right;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--brand);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  button.ghost,
  button.primary {
    flex: 1;
    padding: 9px;
    border-radius: var(--radius-sm);
    font-size: 12.5px;
    font-weight: 600;
    border: 1px solid var(--stroke);
    color: var(--text);
    background: var(--surface-2);
  }
  button.primary {
    background: linear-gradient(135deg, var(--brand), #4636b8);
    color: #fff;
    border-color: transparent;
  }
</style>
