// Rendu 2D du jeu — lit l'état directement depuis le moteur Rust/WASM
// (buffers Float32Array) et dessine proies, particules, popups et laser.
// Le chat reste une illustration SVG posée par-dessus (GameScene).

import type { Game } from '../wasm/miaou_engine';

const COLORS = ['#c9c3e0', '#ff9ecf', '#ffd24a']; // mouse, yarn, golden

export function draw(ctx: CanvasRenderingContext2D, g: Game, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  const shake = g.shake;
  if (shake > 0.001) {
    const s = shake * 10;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  // Sol.
  const floorY = h - 40;
  const grd = ctx.createLinearGradient(0, floorY - 60, 0, h);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(150,130,255,0.10)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, floorY - 60, w, 100);

  // Proies : [x, y, r, kind, face] * n
  const prey = g.prey_data();
  for (let i = 0; i < prey.length; i += 5) {
    drawPrey(ctx, prey[i], prey[i + 1], prey[i + 2], prey[i + 3], prey[i + 4]);
  }

  // Particules : [x, y, size, alpha, colorId] * n
  const parts = g.particle_data();
  for (let i = 0; i < parts.length; i += 5) {
    ctx.globalAlpha = parts[i + 3];
    ctx.fillStyle = COLORS[parts[i + 4]] ?? '#fff';
    circle(ctx, parts[i], parts[i + 1], parts[i + 2]);
  }
  ctx.globalAlpha = 1;

  // Popups de score : [x, y, alpha, value] * n
  const pops = g.popup_data();
  ctx.textAlign = 'center';
  ctx.font = '700 22px system-ui, sans-serif';
  for (let i = 0; i < pops.length; i += 4) {
    ctx.globalAlpha = pops[i + 2];
    ctx.fillStyle = '#ffe08a';
    ctx.fillText('+' + Math.round(pops[i + 3]), pops[i], pops[i + 1]);
  }
  ctx.globalAlpha = 1;

  drawLaser(ctx, g);
  ctx.restore();
}

function drawPrey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  kind: number,
  face: number,
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.9, r * 1.1, r * 0.35, 0, 0, 7);
  ctx.fill();

  ctx.scale(face, 1);

  if (kind === 1) {
    // pelote
    ctx.fillStyle = '#ff8fb0';
    circle(ctx, 0, 0, r);
    ctx.strokeStyle = 'rgba(120,20,60,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.5, (i * Math.PI) / 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const gold = kind === 2;
  const body = gold ? '#ffd24a' : '#c3bcda';
  const ear = gold ? '#ffe08a' : '#d7d1ea';

  ctx.strokeStyle = body;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, 0);
  ctx.quadraticCurveTo(-r * 1.9, -2, -r * 1.9, -r * 0.7);
  ctx.stroke();

  ctx.fillStyle = ear;
  circle(ctx, r * 0.15, -r * 0.8, r * 0.45);
  ctx.fillStyle = '#ff9ecf';
  circle(ctx, r * 0.15, -r * 0.8, r * 0.24);

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.78, 0, 0, 7);
  ctx.fill();

  ctx.fillStyle = '#20143a';
  circle(ctx, r * 0.45, -r * 0.1, r * 0.14);
  ctx.fillStyle = '#ff7eb0';
  circle(ctx, r * 0.98, 0, r * 0.13);
  if (gold) {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    circle(ctx, r * 0.3, -r * 0.4, r * 0.12);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawLaser(ctx: CanvasRenderingContext2D, g: Game): void {
  const trail = g.trail_data();
  const count = trail.length / 2;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = (i / count) * 0.4;
    ctx.fillStyle = '#ff3b5c';
    circle(ctx, trail[i * 2], trail[i * 2 + 1], 3 + (i / count) * 4);
  }
  ctx.globalAlpha = 1;

  const x = g.cursor_x;
  const y = g.cursor_y;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 22);
  halo.addColorStop(0, 'rgba(255,80,110,0.55)');
  halo.addColorStop(1, 'rgba(255,80,110,0)');
  ctx.fillStyle = halo;
  circle(ctx, x, y, 22);
  ctx.fillStyle = '#ff2b50';
  circle(ctx, x, y, 6);
  ctx.fillStyle = '#fff';
  circle(ctx, x - 1.5, y - 1.5, 2);
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
