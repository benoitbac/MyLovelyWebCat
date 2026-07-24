<script lang="ts">
  import CatSvg from '../CatSvg.svelte';
  import { dna, setDNA, randomizeDNA } from '../../customization/dna';
  import { profile, finishCreation } from '../../state/app';
  import { expression, gaze } from '../../companion/loop';

  let name = $state($profile.name === 'Miaou' ? '' : $profile.name);

  // Expression fixe "mignonne" pour la vitrine.
  expression.set({ eyeOpen: 0.9, mouthCurve: 0.75, earPerk: 0.95, blush: 0.3, sleepy: 0 });
  gaze.set({ x: 0, y: 0.05 });

  const colors = [
    { key: 'furA', label: 'Pelage clair' },
    { key: 'furB', label: 'Pelage foncé' },
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
</script>

<div class="creator">
  <div class="stage">
    <div class="podium"></div>
    <div class="preview"><CatSvg size={280} /></div>
    <h1>Crée ton chat</h1>
    <p class="sub">Façonne ton compagnon, donne-lui un nom, puis adopte-le.</p>
  </div>

  <aside class="panel">
    <label class="name">
      Nom du chat
      <input type="text" bind:value={name} maxlength="16" placeholder="Ex : Pixel, Mochi…" />
    </label>

    <div class="section">Couleurs</div>
    <div class="colors">
      {#each colors as c (c.key)}
        <label>
          <input type="color" value={$dna[c.key]} oninput={(e) => onColor(c.key, e)} />
          <span>{c.label}</span>
        </label>
      {/each}
    </div>

    <div class="section">Morphologie</div>
    <label class="slider">
      Oreilles <b>{$dna.earSize.toFixed(2)}</b>
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
      Rondeur <b>{$dna.roundness.toFixed(2)}</b>
      <input
        type="range"
        min="-1"
        max="1"
        step="0.01"
        value={$dna.roundness}
        oninput={(e) => onRange('roundness', e)}
      />
    </label>

    <div class="btns">
      <button class="ghost" onclick={randomizeDNA}>🎲 Surprise</button>
      <button class="adopt" onclick={() => finishCreation(name)}>Adopter →</button>
    </div>
  </aside>
</div>

<style>
  .creator {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .stage {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background:
      radial-gradient(
        60% 50% at 50% 40%,
        color-mix(in srgb, var(--brand) 26%, transparent),
        transparent 70%
      ),
      radial-gradient(90% 90% at 50% 120%, var(--bg-2), var(--bg));
  }
  .preview {
    filter: drop-shadow(0 24px 30px rgba(0, 0, 0, 0.45));
    animation: bobp 4s ease-in-out infinite;
  }
  @keyframes bobp {
    50% {
      transform: translateY(-10px);
    }
  }
  .podium {
    position: absolute;
    bottom: 20%;
    width: 320px;
    height: 70px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(123, 92, 255, 0.35), transparent 70%);
  }
  .stage h1 {
    margin: 8px 0 0;
    font-size: 34px;
    font-weight: 800;
  }
  .sub {
    margin: 0;
    color: var(--muted);
  }
  .panel {
    width: 320px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: rgba(15, 12, 30, 0.6);
    border-left: 1px solid var(--stroke);
    backdrop-filter: blur(14px);
    overflow-y: auto;
  }
  .name {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
    font-weight: 600;
  }
  .name input {
    padding: 11px 12px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-size: 15px;
  }
  .section {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--brand-2);
    margin-top: 4px;
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
    width: 42px;
    height: 28px;
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
  .slider b {
    float: right;
    color: var(--text);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--brand);
  }
  .btns {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }
  .ghost {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-weight: 600;
  }
  .adopt {
    flex: 1.4;
    padding: 12px;
    border-radius: 12px;
    border: none;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
    box-shadow: 0 8px 24px rgba(123, 92, 255, 0.45);
  }
</style>
