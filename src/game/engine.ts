// ============================================================================
//  engine.ts — Moteur du jeu "Miaou Pounce" (logique pure, sans rendu).
//  Boucle : un laser (curseur) que le chat poursuit ; des souris détalent ;
//  au clic, le chat bondit et attrape ce qui se trouve sous ses pattes.
//  Score, combos, chrono 60 s. Le rendu (canvas + SVG) lit cet état.
// ============================================================================

export type Phase = 'menu' | 'playing' | 'over';
export type PreyKind = 'mouse' | 'yarn' | 'golden';

export interface Prey {
  id: number;
  kind: PreyKind;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  wobble: number;
  r: number;
  value: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
}

export interface Popup {
  x: number;
  y: number;
  life: number;
  text: string;
  color: string;
}

export interface Cat {
  x: number;
  lift: number;
  squash: number;
  facing: number;
  pouncing: boolean;
  pounceT: number;
  startX: number;
  targetX: number;
  targetY: number;
  cooldown: number;
}

export interface GameEvents {
  onCatch?: (prey: Prey, mult: number) => void;
  onPounce?: () => void;
  onMiss?: () => void;
  onOver?: (score: number, best: number) => void;
}

const ROUND_TIME = 60;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

const KINDS: Record<PreyKind, { r: number; value: number; speed: number; weight: number }> = {
  mouse: { r: 15, value: 100, speed: 165, weight: 0.68 },
  yarn: { r: 19, value: 60, speed: 110, weight: 0.25 },
  golden: { r: 15, value: 500, speed: 240, weight: 0.07 },
};

export class Game {
  w = 800;
  h = 600;
  phase: Phase = 'menu';
  score = 0;
  best = 0;
  combo = 0;
  bestCombo = 0;
  mult = 1;
  timeLeft = ROUND_TIME;

  prey: Prey[] = [];
  particles: Particle[] = [];
  popups: Popup[] = [];
  trail: { x: number; y: number }[] = [];
  cursor = { x: 400, y: 300 };
  shake = 0;

  cat: Cat = {
    x: 400,
    lift: 0,
    squash: 0,
    facing: 1,
    pouncing: false,
    pounceT: 0,
    startX: 400,
    targetX: 400,
    targetY: 0,
    cooldown: 0,
  };

  private ev: GameEvents;
  private nextId = 1;
  private spawnTimer = 0.6;
  private elapsed = 0;
  private comboTimer = 0;

  constructor(events: GameEvents = {}) {
    this.ev = events;
  }

  get baseY(): number {
    return this.h - 46;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    if (this.phase === 'menu') this.cat.x = w / 2;
  }

  setCursor(x: number, y: number): void {
    this.cursor.x = x;
    this.cursor.y = y;
  }

  loadBest(best: number): void {
    this.best = best;
  }

  start(): void {
    this.phase = 'playing';
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.mult = 1;
    this.timeLeft = ROUND_TIME;
    this.elapsed = 0;
    this.spawnTimer = 0.5;
    this.prey = [];
    this.popups = [];
  }

  pounce(): void {
    if (this.phase === 'menu') {
      this.start();
      return;
    }
    if (this.phase === 'over') {
      this.start();
      return;
    }
    if (this.cat.pouncing || this.cat.cooldown > 0) return;
    this.cat.pouncing = true;
    this.cat.pounceT = 0;
    this.cat.startX = this.cat.x;
    this.cat.targetX = clamp(this.cursor.x, 50, this.w - 50);
    this.cat.targetY = clamp(this.cursor.y, 120, this.baseY - 20);
    this.ev.onPounce?.();
  }

  update(dt: number): void {
    this.trail.push({ x: this.cursor.x, y: this.cursor.y });
    if (this.trail.length > 16) this.trail.shift();
    this.shake = Math.max(0, this.shake - dt * 3.5);

    // Particules & popups vivent dans toutes les phases.
    for (const p of this.particles) {
      p.vy += 520 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.y -= 34 * dt;
      p.life -= dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);

    this.updateCat(dt);

    if (this.phase !== 'playing') return;

    this.elapsed += dt;
    this.timeLeft = Math.max(0, ROUND_TIME - this.elapsed);
    const diff = clamp(this.elapsed / ROUND_TIME, 0, 1);

    // Combo qui retombe si on tarde.
    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 0) this.combo = 0;
    this.mult = Math.min(6, 1 + Math.floor(this.combo / 3));

    // Apparition des proies.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(diff);
      this.spawnTimer = lerp(1.25, 0.42, diff) * (0.75 + Math.random() * 0.5);
    }

    // Déplacement des proies.
    for (const p of this.prey) {
      p.wobble += dt;
      p.x += p.vx * (1 + diff * 0.5) * dt;
      p.y = p.baseY + Math.sin(p.wobble * 5) * 9;
      // Fuit légèrement le laser (interaction).
      const dxc = p.x - this.cursor.x;
      const dyc = p.y - this.cursor.y;
      const d = Math.hypot(dxc, dyc);
      if (d < 95 && d > 0.001) {
        p.x += (dxc / d) * 60 * dt;
        p.baseY += clamp((dyc / d) * 40 * dt, -1.5, 1.5);
        p.baseY = clamp(p.baseY, this.h * 0.44, this.h * 0.8);
      }
      if (p.x < -50 || p.x > this.w + 50) {
        p.alive = false;
        if (p.kind !== 'yarn') {
          this.combo = 0; // une proie s'échappe : combo perdu
          this.ev.onMiss?.();
        }
      }
    }
    this.prey = this.prey.filter((p) => p.alive);

    // Attrape pendant le bond.
    if (this.cat.pouncing) {
      const pawX = this.cat.x;
      const pawY = this.baseY - this.cat.lift - 24;
      for (const p of this.prey) {
        if (Math.hypot(p.x - pawX, p.y - pawY) < p.r + 60) this.catch(p);
      }
    }

    if (this.timeLeft <= 0) {
      this.phase = 'over';
      this.best = Math.max(this.best, this.score);
      this.ev.onOver?.(this.score, this.best);
    }
  }

  private updateCat(dt: number): void {
    const c = this.cat;
    c.cooldown = Math.max(0, c.cooldown - dt);
    if (c.pouncing) {
      c.pounceT += dt;
      const T = 0.42;
      const t = Math.min(1, c.pounceT / T);
      const arc = Math.sin(Math.PI * t);
      c.x = lerp(c.startX, c.targetX, Math.min(1, easeOut(t * 1.5)));
      // Bondit jusqu'à la hauteur du laser (donc de la proie visée).
      const reach = Math.max(0, this.baseY - 24 - c.targetY);
      c.lift = reach * arc;
      c.squash = arc * 0.12;
      c.facing = c.targetX >= c.startX ? 1 : -1;
      if (t >= 1) {
        c.pouncing = false;
        c.lift = 0;
        c.squash = 0;
        c.cooldown = 0.07;
      }
    } else {
      const tx = clamp(this.cursor.x, 80, this.w - 80);
      c.x += (tx - c.x) * Math.min(1, dt * 3.2);
      if (Math.abs(this.cursor.x - c.x) > 6) c.facing = this.cursor.x >= c.x ? 1 : -1;
      c.lift += (0 - c.lift) * Math.min(1, dt * 8);
      c.squash += (0 - c.squash) * Math.min(1, dt * 8);
    }
  }

  private spawn(diff: number): void {
    const kind = this.pickKind();
    const meta = KINDS[kind];
    const fromLeft = Math.random() < 0.5;
    const baseY = this.h * 0.48 + Math.random() * this.h * 0.28;
    const speed = meta.speed * (fromLeft ? 1 : -1) * (0.9 + diff * 0.6);
    this.prey.push({
      id: this.nextId++,
      kind,
      x: fromLeft ? -30 : this.w + 30,
      y: baseY,
      baseY,
      vx: speed,
      wobble: Math.random() * 6,
      r: meta.r,
      value: meta.value,
      alive: true,
    });
  }

  private pickKind(): PreyKind {
    const r = Math.random();
    if (r < KINDS.golden.weight) return 'golden';
    if (r < KINDS.golden.weight + KINDS.yarn.weight) return 'yarn';
    return 'mouse';
  }

  private catch(p: Prey): void {
    p.alive = false;
    this.combo += 1;
    this.comboTimer = 2.2;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = Math.min(6, 1 + Math.floor(this.combo / 3));
    const gain = p.value * mult;
    this.score += gain;
    this.shake = Math.min(1, this.shake + (p.kind === 'golden' ? 0.9 : 0.5));

    const color = p.kind === 'golden' ? '#ffd24a' : p.kind === 'yarn' ? '#ff9ecf' : '#c9c3e0';
    const n = p.kind === 'golden' ? 22 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        size: 2 + Math.random() * 3,
        color,
      });
    }
    this.popups.push({ x: p.x, y: p.y - 10, life: 0.9, text: '+' + gain, color });
    this.ev.onCatch?.(p, mult);
  }
}
