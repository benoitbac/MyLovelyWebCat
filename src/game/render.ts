// Rendu 2D du jeu sur un <canvas> : proies, particules, popups de score et
// le laser (curseur). Le chat, lui, est une illustration SVG posée par-dessus.

import type { Game, Prey } from './engine';

export function draw(ctx: CanvasRenderingContext2D, g: Game): void {
  ctx.clearRect(0, 0, g.w, g.h);

  ctx.save();
  if (g.shake > 0.001) {
    const s = g.shake * 10;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }

  // Ligne de sol douce (repère de jeu).
  const floorY = g.h - 40;
  const grd = ctx.createLinearGradient(0, floorY - 60, 0, g.h);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(1, 'rgba(150,130,255,0.10)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, floorY - 60, g.w, 100);

  for (const p of g.prey) drawPrey(ctx, p);

  // Particules.
  for (const pt of g.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Popups de score.
  ctx.textAlign = 'center';
  ctx.font = '700 22px system-ui, sans-serif';
  for (const pop of g.popups) {
    ctx.globalAlpha = Math.max(0, pop.life / 0.9);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;

  drawLaser(ctx, g);
  ctx.restore();
}

function drawPrey(ctx: CanvasRenderingContext2D, p: Prey): void {
  const face = p.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(p.x, p.y);

  // ombre
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, p.r * 0.9, p.r * 1.1, p.r * 0.35, 0, 0, 7);
  ctx.fill();

  ctx.scale(face, 1);

  if (p.kind === 'yarn') {
    ctx.fillStyle = '#ff8fb0';
    circle(ctx, 0, 0, p.r);
    ctx.strokeStyle = 'rgba(120,20,60,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.5, (i * Math.PI) / 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const gold = p.kind === 'golden';
  const body = gold ? '#ffd24a' : '#c3bcda';
  const ear = gold ? '#ffe08a' : '#d7d1ea';

  // queue
  ctx.strokeStyle = body;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-p.r * 0.9, 0);
  ctx.quadraticCurveTo(-p.r * 1.9, -2, -p.r * 1.9, -p.r * 0.7);
  ctx.stroke();
  // oreilles
  ctx.fillStyle = ear;
  circle(ctx, p.r * 0.15, -p.r * 0.8, p.r * 0.45);
  ctx.fillStyle = '#ff9ecf';
  circle(ctx, p.r * 0.15, -p.r * 0.8, p.r * 0.24);
  // corps
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.r, p.r * 0.78, 0, 0, 7);
  ctx.fill();
  // oeil + nez (devant = +x)
  ctx.fillStyle = '#20143a';
  circle(ctx, p.r * 0.45, -p.r * 0.1, p.r * 0.14);
  ctx.fillStyle = '#ff7eb0';
  circle(ctx, p.r * 0.98, 0, p.r * 0.13);
  if (gold) {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    circle(ctx, p.r * 0.3, -p.r * 0.4, p.r * 0.12);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawLaser(ctx: CanvasRenderingContext2D, g: Game): void {
  // traînée
  for (let i = 0; i < g.trail.length; i++) {
    const t = g.trail[i];
    const a = (i / g.trail.length) * 0.4;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ff3b5c';
    circle(ctx, t.x, t.y, 3 + (i / g.trail.length) * 4);
  }
  ctx.globalAlpha = 1;

  const { x, y } = g.cursor;
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
