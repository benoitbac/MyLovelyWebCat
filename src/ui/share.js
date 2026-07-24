// ============================================================================
//  share.js — Export "flex" : lien de partage + carte PNG téléchargeable.
// ============================================================================

import { shareURL } from '../cat/dna.js';

// --- Toast minimaliste ------------------------------------------------------
export function toast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// --- Copie le lien de partage dans le presse-papier -------------------------
export async function copyShareLink(dna) {
  const url = shareURL(dna);
  location.hash = 'dna=' + url.split('dna=')[1]; // garde l'état dans l'URL
  try {
    await navigator.clipboard.writeText(url);
    toast('🔗 Lien copié — prêt à flex !');
  } catch {
    prompt('Copie ton lien NekoGPU :', url);
  }
  return url;
}

// --- Génère une carte 1200x630 (format réseaux) et la télécharge ------------
// `ensureFrame` doit rendre une frame fraîche et attendre le GPU avant capture.
export async function downloadCard(sourceCanvas, dna, ensureFrame) {
  await ensureFrame();

  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  // Fond dégradé + grille néon.
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#0a0a1a');
  grd.addColorStop(1, '#140a24');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,150,255,0.06)';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

  // Capture du chat (à gauche), ajustée en conservant le ratio.
  const s = Math.min((W * 0.52) / sourceCanvas.width, (H * 0.86) / sourceCanvas.height);
  const dw = sourceCanvas.width * s;
  const dh = sourceCanvas.height * s;
  g.drawImage(sourceCanvas, 40, (H - dh) / 2, dw, dh);

  // Bloc texte (à droite).
  const tx = Math.max(dw + 90, W * 0.56);
  g.fillStyle = dna.neon;
  g.font = '700 78px system-ui, sans-serif';
  g.fillText('NekoGPU', tx, 170);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.font = '400 26px system-ui, sans-serif';
  g.fillText('mon compagnon félin WebGPU', tx, 210);

  // Puces couleurs de l'ADN.
  const chips = [['Pelage', dna.primary], ['Néon', dna.neon], ['Yeux', dna.accent]];
  chips.forEach(([label, color], i) => {
    const y = 280 + i * 58;
    g.fillStyle = color;
    g.beginPath(); g.arc(tx + 16, y - 8, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = '500 28px system-ui, sans-serif';
    g.fillText(`${label} · ${color}`, tx + 44, y);
  });

  // Badges comportement / chapeau.
  const badges = [
    dna.behavior === 'magnet' ? 'Aimant' : 'Timide',
    dna.hat ? 'Chapeau cyberpunk' : 'Sans chapeau',
    `Densité ${dna.density}`,
  ];
  g.font = '500 22px system-ui, sans-serif';
  let bx = tx;
  badges.forEach((b) => {
    const w = g.measureText(b).width + 32;
    g.fillStyle = 'rgba(123,92,255,0.18)';
    roundRect(g, bx, 470, w, 44, 22); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(b, bx + 16, 498);
    bx += w + 14;
  });

  g.fillStyle = 'rgba(255,255,255,0.4)';
  g.font = '400 20px system-ui, sans-serif';
  g.fillText('▸ ' + shareURL(dna).replace(/^https?:\/\//, '').slice(0, 60) + '…', tx, 570);

  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nekogpu-card.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('🖼️ Carte téléchargée !');
  }, 'image/png');
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
