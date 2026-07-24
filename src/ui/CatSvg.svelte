<script lang="ts">
  import { dna } from '../customization/dna';
  import { expression, gaze } from '../companion/loop';

  // Décalage du regard (en unités du viewBox).
  const gx = $derived($gaze.x * 7);
  const gy = $derived($gaze.y * 5);

  // Ouverture des yeux (clignement + humeur) et rougeur.
  const eo = $derived(Math.max(0.06, $expression.eyeOpen));
  const blush = $derived($expression.blush);
  const perk = $derived($expression.earPerk);

  // Oreilles : plus l'humeur est basse, plus elles s'affaissent vers l'extérieur.
  const earL = $derived((1 - perk) * 12);

  // Bouche : coins qui remontent avec le sourire.
  const mouthY = $derived(198 - $expression.mouthCurve * 4);
</script>

<svg
  class="cat"
  viewBox="0 0 320 372"
  xmlns="http://www.w3.org/2000/svg"
  style="--furA:{$dna.furA}; --furB:{$dna.furB}; --belly:{$dna.belly}; --eye:{$dna.eye}; --accent:{$dna.accent};"
  role="img"
  aria-label="Compagnon chat"
>
  <defs>
    <linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" class="s-furA" />
      <stop offset="100%" class="s-furB" />
    </linearGradient>
    <radialGradient id="belly" cx="50%" cy="42%" r="62%">
      <stop offset="0%" class="s-belly" stop-opacity="0.55" />
      <stop offset="70%" class="s-belly" stop-opacity="0.28" />
      <stop offset="100%" class="s-belly" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="iris" cx="50%" cy="42%" r="60%">
      <stop offset="0%" class="s-eye-l" />
      <stop offset="100%" class="s-eye" />
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
    <filter id="drop" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.28" />
    </filter>
  </defs>

  <!-- ombre au sol -->
  <ellipse cx="160" cy="352" rx="94" ry="15" fill="#000" opacity="0.20" filter="url(#soft)" />

  <g filter="url(#drop)">
    <!-- queue -->
    <path
      d="M228 300 C300 300 302 214 262 188"
      fill="none"
      stroke="url(#fur)"
      stroke-width="34"
      stroke-linecap="round"
    />

    <!-- corps -->
    <ellipse cx="160" cy="276" rx="90" ry="76" fill="url(#fur)" />
    <ellipse cx="160" cy="298" rx="52" ry="56" fill="url(#belly)" />
    <!-- pattes avant -->
    <ellipse cx="126" cy="338" rx="27" ry="18" fill="url(#fur)" />
    <ellipse cx="194" cy="338" rx="27" ry="18" fill="url(#fur)" />

    <!-- tête (respire) -->
    <g class="head">
      <!-- oreilles -->
      <g style="transform: rotate({-earL}deg); transform-origin: 96px 92px;">
        <path d="M60 104 L84 20 L150 82 Z" fill="url(#fur)" stroke-linejoin="round" />
        <path d="M82 92 L92 46 L132 82 Z" class="inner" />
      </g>
      <g style="transform: rotate({earL}deg); transform-origin: 224px 92px;">
        <path d="M260 104 L236 20 L170 82 Z" fill="url(#fur)" stroke-linejoin="round" />
        <path d="M238 92 L228 46 L188 82 Z" class="inner" />
      </g>

      <!-- crâne -->
      <ellipse cx="160" cy="152" rx="110" ry="100" fill="url(#fur)" />
      <!-- brillance -->
      <ellipse cx="118" cy="112" rx="46" ry="34" fill="#fff" opacity="0.10" filter="url(#soft)" />

      <!-- joues -->
      <ellipse cx="96" cy="184" rx="20" ry="12" class="cheek" style="opacity:{blush}" />
      <ellipse cx="224" cy="184" rx="20" ry="12" class="cheek" style="opacity:{blush}" />

      <!-- yeux -->
      <g style="transform: scaleY({eo}); transform-origin: 118px 158px;">
        <ellipse cx="118" cy="158" rx="24" ry="29" fill="#fdfdff" />
        <ellipse cx={118 + gx} cy={158 + gy} rx="19" ry="24" fill="url(#iris)" />
        <ellipse cx={118 + gx} cy={158 + gy} rx="10.5" ry="16" fill="#20143a" />
        <circle cx={118 + gx - 6} cy={158 + gy - 8} r="6" fill="#fff" />
        <circle cx={118 + gx + 5} cy={158 + gy + 6} r="3" fill="#fff" opacity="0.85" />
      </g>
      <g style="transform: scaleY({eo}); transform-origin: 202px 158px;">
        <ellipse cx="202" cy="158" rx="24" ry="29" fill="#fdfdff" />
        <ellipse cx={202 + gx} cy={158 + gy} rx="19" ry="24" fill="url(#iris)" />
        <ellipse cx={202 + gx} cy={158 + gy} rx="10.5" ry="16" fill="#20143a" />
        <circle cx={202 + gx - 6} cy={158 + gy - 8} r="6" fill="#fff" />
        <circle cx={202 + gx + 5} cy={158 + gy + 6} r="3" fill="#fff" opacity="0.85" />
      </g>

      <!-- museau -->
      <path d="M150 184 Q160 181 170 184 Q167 193 160 195 Q153 193 150 184 Z" class="nose" />
      <!-- bouche -->
      <path
        d="M160 195 L160 {mouthY} M160 {mouthY} Q150 {mouthY + 8} 142 {mouthY +
          2} M160 {mouthY} Q170 {mouthY + 8} 178 {mouthY + 2}"
        fill="none"
        stroke="#3a2450"
        stroke-width="2.4"
        stroke-linecap="round"
        opacity="0.55"
      />

      <!-- moustaches -->
      <g stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.5">
        <path d="M104 182 L44 172" />
        <path d="M104 190 L42 190" />
        <path d="M104 198 L44 208" />
        <path d="M216 182 L276 172" />
        <path d="M216 190 L278 190" />
        <path d="M216 198 L276 208" />
      </g>
    </g>
  </g>
</svg>

<style>
  .cat {
    width: min(62vmin, 460px);
    height: auto;
    overflow: visible;
    animation: breathe 4.2s ease-in-out infinite;
  }
  .head {
    animation: bob 4.2s ease-in-out infinite;
    transform-box: fill-box;
  }
  .s-furA {
    stop-color: var(--furA);
  }
  .s-furB {
    stop-color: var(--furB);
  }
  .s-belly {
    stop-color: var(--belly);
  }
  .s-eye {
    stop-color: var(--eye);
  }
  /* iris un peu plus clair au centre */
  .s-eye-l {
    stop-color: color-mix(in srgb, var(--eye) 65%, white);
  }
  .inner {
    fill: color-mix(in srgb, var(--accent) 78%, #7a2f4d);
  }
  .cheek {
    fill: var(--accent);
    filter: url(#soft);
  }
  .nose {
    fill: color-mix(in srgb, var(--accent) 80%, #d1466f);
  }
  @keyframes breathe {
    50% {
      transform: scale(1.018);
    }
  }
  @keyframes bob {
    50% {
      transform: translateY(-4px);
    }
  }
</style>
