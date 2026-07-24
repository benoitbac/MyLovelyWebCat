//! Cœur moteur de « Miaou Pounce » — simulation déterministe compilée en WASM.
//! Toute la logique de jeu (chat, proies, bond, collisions, score, combos) vit
//! ici, en Rust. Le shell web ne fait que fournir les entrées et dessiner l'état.

use wasm_bindgen::prelude::*;

const ROUND_TIME: f32 = 60.0;

#[inline]
fn clamp(v: f32, a: f32, b: f32) -> f32 {
    if v < a {
        a
    } else if v > b {
        b
    } else {
        v
    }
}
#[inline]
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}
#[inline]
fn ease_out(t: f32) -> f32 {
    1.0 - (1.0 - t) * (1.0 - t)
}

/// RNG xorshift déterministe (pas de dépendance, reproductible).
struct Rng(u32);
impl Rng {
    fn next(&mut self) -> f32 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        (x as f32) / (u32::MAX as f32)
    }
    fn range(&mut self, a: f32, b: f32) -> f32 {
        a + (b - a) * self.next()
    }
}

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Mouse,
    Yarn,
    Golden,
}
impl Kind {
    fn radius(self) -> f32 {
        match self {
            Kind::Mouse => 15.0,
            Kind::Yarn => 19.0,
            Kind::Golden => 15.0,
        }
    }
    fn value(self) -> f32 {
        match self {
            Kind::Mouse => 100.0,
            Kind::Yarn => 60.0,
            Kind::Golden => 500.0,
        }
    }
    fn speed(self) -> f32 {
        match self {
            Kind::Mouse => 165.0,
            Kind::Yarn => 110.0,
            Kind::Golden => 240.0,
        }
    }
    fn color_id(self) -> f32 {
        match self {
            Kind::Mouse => 0.0,
            Kind::Yarn => 1.0,
            Kind::Golden => 2.0,
        }
    }
    fn as_f32(self) -> f32 {
        match self {
            Kind::Mouse => 0.0,
            Kind::Yarn => 1.0,
            Kind::Golden => 2.0,
        }
    }
}

struct Prey {
    kind: Kind,
    x: f32,
    y: f32,
    base_y: f32,
    vx: f32,
    wobble: f32,
    r: f32,
    value: f32,
    alive: bool,
}
struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    life: f32,
    max: f32,
    size: f32,
    color_id: f32,
}
struct Popup {
    x: f32,
    y: f32,
    life: f32,
    value: f32,
    color_id: f32,
}

#[wasm_bindgen]
pub struct Game {
    w: f32,
    h: f32,
    phase: u8, // 0 menu, 1 playing, 2 over
    score: f32,
    best: f32,
    combo: u32,
    best_combo: u32,
    mult: u32,
    time_left: f32,

    prey: Vec<Prey>,
    particles: Vec<Particle>,
    popups: Vec<Popup>,
    trail: Vec<(f32, f32)>,
    events: Vec<f32>,

    cursor_x: f32,
    cursor_y: f32,
    shake: f32,

    cat_x: f32,
    cat_lift: f32,
    cat_squash: f32,
    cat_facing: f32,
    cat_pouncing: bool,
    pounce_t: f32,
    start_x: f32,
    target_x: f32,
    target_y: f32,
    cooldown: f32,

    spawn_timer: f32,
    elapsed: f32,
    combo_timer: f32,
    rng: Rng,
}

#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Game {
        Game {
            w: 800.0,
            h: 600.0,
            phase: 0,
            score: 0.0,
            best: 0.0,
            combo: 0,
            best_combo: 0,
            mult: 1,
            time_left: ROUND_TIME,
            prey: Vec::new(),
            particles: Vec::new(),
            popups: Vec::new(),
            trail: Vec::new(),
            events: Vec::new(),
            cursor_x: 400.0,
            cursor_y: 300.0,
            shake: 0.0,
            cat_x: 400.0,
            cat_lift: 0.0,
            cat_squash: 0.0,
            cat_facing: 1.0,
            cat_pouncing: false,
            pounce_t: 0.0,
            start_x: 400.0,
            target_x: 400.0,
            target_y: 0.0,
            cooldown: 0.0,
            spawn_timer: 0.6,
            elapsed: 0.0,
            combo_timer: 0.0,
            rng: Rng(seed.max(1)),
        }
    }

    fn base_y(&self) -> f32 {
        self.h - 46.0
    }

    pub fn resize(&mut self, w: f32, h: f32) {
        self.w = w;
        self.h = h;
        if self.phase == 0 {
            self.cat_x = w / 2.0;
        }
    }

    pub fn set_cursor(&mut self, x: f32, y: f32) {
        self.cursor_x = x;
        self.cursor_y = y;
    }

    pub fn load_best(&mut self, best: f32) {
        self.best = best;
    }

    pub fn start(&mut self) {
        self.phase = 1;
        self.score = 0.0;
        self.combo = 0;
        self.best_combo = 0;
        self.mult = 1;
        self.time_left = ROUND_TIME;
        self.elapsed = 0.0;
        self.spawn_timer = 0.5;
        self.prey.clear();
        self.popups.clear();
    }

    pub fn pounce(&mut self) {
        if self.phase == 0 || self.phase == 2 {
            self.start();
            return;
        }
        if self.cat_pouncing || self.cooldown > 0.0 {
            return;
        }
        self.cat_pouncing = true;
        self.pounce_t = 0.0;
        self.start_x = self.cat_x;
        self.target_x = clamp(self.cursor_x, 50.0, self.w - 50.0);
        self.target_y = clamp(self.cursor_y, 120.0, self.base_y() - 20.0);
        self.events.push(2.0);
        self.events.push(0.0);
    }

    pub fn update(&mut self, dt: f32) {
        self.trail.push((self.cursor_x, self.cursor_y));
        if self.trail.len() > 16 {
            self.trail.remove(0);
        }
        self.shake = (self.shake - dt * 3.5).max(0.0);

        for p in self.particles.iter_mut() {
            p.vy += 520.0 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
        }
        self.particles.retain(|p| p.life > 0.0);
        for p in self.popups.iter_mut() {
            p.y -= 34.0 * dt;
            p.life -= dt;
        }
        self.popups.retain(|p| p.life > 0.0);

        self.update_cat(dt);

        if self.phase != 1 {
            return;
        }

        self.elapsed += dt;
        self.time_left = (ROUND_TIME - self.elapsed).max(0.0);
        let diff = clamp(self.elapsed / ROUND_TIME, 0.0, 1.0);

        self.combo_timer -= dt;
        if self.combo_timer <= 0.0 && self.combo > 0 {
            self.combo = 0;
        }
        self.mult = (1 + self.combo / 3).min(6);

        self.spawn_timer -= dt;
        if self.spawn_timer <= 0.0 {
            self.spawn(diff);
            self.spawn_timer = lerp(1.25, 0.42, diff) * self.rng.range(0.75, 1.25);
        }

        // Déplacement des proies + échappées.
        let (cx, cy, w, hh) = (self.cursor_x, self.cursor_y, self.w, self.h);
        let mut escaped = 0u32;
        for p in self.prey.iter_mut() {
            p.wobble += dt;
            p.x += p.vx * (1.0 + diff * 0.5) * dt;
            p.y = p.base_y + (p.wobble * 5.0).sin() * 9.0;
            let dxc = p.x - cx;
            let dyc = p.y - cy;
            let d = (dxc * dxc + dyc * dyc).sqrt();
            if d < 95.0 && d > 0.001 {
                p.x += (dxc / d) * 60.0 * dt;
                p.base_y += clamp((dyc / d) * 40.0 * dt, -1.5, 1.5);
                p.base_y = clamp(p.base_y, hh * 0.44, hh * 0.8);
            }
            if p.x < -50.0 || p.x > w + 50.0 {
                p.alive = false;
                if p.kind != Kind::Yarn {
                    escaped += 1;
                }
            }
        }
        if escaped > 0 {
            self.combo = 0;
            self.events.push(4.0);
            self.events.push(0.0);
        }
        self.prey.retain(|p| p.alive);

        // Attrape pendant le bond.
        if self.cat_pouncing {
            let paw_x = self.cat_x;
            let paw_y = self.base_y() - self.cat_lift - 24.0;
            let mut caught: Vec<usize> = Vec::new();
            for (i, p) in self.prey.iter().enumerate() {
                let dx = p.x - paw_x;
                let dy = p.y - paw_y;
                if (dx * dx + dy * dy).sqrt() < p.r + 60.0 {
                    caught.push(i);
                }
            }
            for &i in caught.iter() {
                self.catch(i);
            }
            self.prey.retain(|p| p.alive);
        }

        if self.time_left <= 0.0 {
            self.phase = 2;
            if self.score > self.best {
                self.best = self.score;
            }
            self.events.push(3.0);
            self.events.push(0.0);
        }
    }

    fn update_cat(&mut self, dt: f32) {
        self.cooldown = (self.cooldown - dt).max(0.0);
        if self.cat_pouncing {
            self.pounce_t += dt;
            let tt = 0.42_f32;
            let t = (self.pounce_t / tt).min(1.0);
            let arc = (std::f32::consts::PI * t).sin();
            self.cat_x = lerp(self.start_x, self.target_x, ease_out(t * 1.5).min(1.0));
            let reach = (self.base_y() - 24.0 - self.target_y).max(0.0);
            self.cat_lift = reach * arc;
            self.cat_squash = arc * 0.12;
            self.cat_facing = if self.target_x >= self.start_x { 1.0 } else { -1.0 };
            if t >= 1.0 {
                self.cat_pouncing = false;
                self.cat_lift = 0.0;
                self.cat_squash = 0.0;
                self.cooldown = 0.07;
            }
        } else {
            let tx = clamp(self.cursor_x, 80.0, self.w - 80.0);
            self.cat_x += (tx - self.cat_x) * (dt * 3.2).min(1.0);
            if (self.cursor_x - self.cat_x).abs() > 6.0 {
                self.cat_facing = if self.cursor_x >= self.cat_x { 1.0 } else { -1.0 };
            }
            self.cat_lift += (0.0 - self.cat_lift) * (dt * 8.0).min(1.0);
            self.cat_squash += (0.0 - self.cat_squash) * (dt * 8.0).min(1.0);
        }
    }

    fn spawn(&mut self, diff: f32) {
        let r = self.rng.next();
        let kind = if r < 0.07 {
            Kind::Golden
        } else if r < 0.32 {
            Kind::Yarn
        } else {
            Kind::Mouse
        };
        let from_left = self.rng.next() < 0.5;
        let base_y = self.h * 0.48 + self.rng.next() * self.h * 0.28;
        let speed = kind.speed() * (if from_left { 1.0 } else { -1.0 }) * (0.9 + diff * 0.6);
        self.prey.push(Prey {
            kind,
            x: if from_left { -30.0 } else { self.w + 30.0 },
            y: base_y,
            base_y,
            vx: speed,
            wobble: self.rng.range(0.0, 6.0),
            r: kind.radius(),
            value: kind.value(),
            alive: true,
        });
    }

    fn catch(&mut self, i: usize) {
        let (px, py, kind, value) = {
            let p = &mut self.prey[i];
            p.alive = false;
            (p.x, p.y, p.kind, p.value)
        };
        self.combo += 1;
        self.combo_timer = 2.2;
        if self.combo > self.best_combo {
            self.best_combo = self.combo;
        }
        let mult = (1 + self.combo / 3).min(6);
        let gain = value * mult as f32;
        self.score += gain;
        self.shake = (self.shake + if kind == Kind::Golden { 0.9 } else { 0.5 }).min(1.0);

        let n = if kind == Kind::Golden { 22 } else { 14 };
        for _ in 0..n {
            let a = self.rng.range(0.0, std::f32::consts::TAU);
            let sp = self.rng.range(80.0, 300.0);
            self.particles.push(Particle {
                x: px,
                y: py,
                vx: a.cos() * sp,
                vy: a.sin() * sp - 60.0,
                life: self.rng.range(0.5, 1.0),
                max: 1.0,
                size: self.rng.range(2.0, 5.0),
                color_id: kind.color_id(),
            });
        }
        self.popups.push(Popup {
            x: px,
            y: py - 10.0,
            life: 0.9,
            value: gain,
            color_id: kind.color_id(),
        });
        self.events.push(1.0);
        self.events.push(kind.as_f32());
    }

    // --- Accès à l'état pour le rendu (buffers Float32Array) ---
    pub fn prey_data(&self) -> Vec<f32> {
        let mut v = Vec::with_capacity(self.prey.len() * 5);
        for p in &self.prey {
            v.push(p.x);
            v.push(p.y);
            v.push(p.r);
            v.push(p.kind.as_f32());
            v.push(if p.vx >= 0.0 { 1.0 } else { -1.0 });
        }
        v
    }
    pub fn particle_data(&self) -> Vec<f32> {
        let mut v = Vec::with_capacity(self.particles.len() * 5);
        for p in &self.particles {
            v.push(p.x);
            v.push(p.y);
            v.push(p.size);
            v.push((p.life / p.max).max(0.0));
            v.push(p.color_id);
        }
        v
    }
    pub fn popup_data(&self) -> Vec<f32> {
        let mut v = Vec::with_capacity(self.popups.len() * 4);
        for p in &self.popups {
            v.push(p.x);
            v.push(p.y);
            v.push((p.life / 0.9).max(0.0));
            v.push(p.value);
        }
        v
    }
    pub fn trail_data(&self) -> Vec<f32> {
        let mut v = Vec::with_capacity(self.trail.len() * 2);
        for &(x, y) in &self.trail {
            v.push(x);
            v.push(y);
        }
        v
    }
    /// File d'événements depuis la dernière frame (code, arg)*. Vidée à la lecture.
    pub fn take_events(&mut self) -> Vec<f32> {
        std::mem::take(&mut self.events)
    }

    // --- Scalaires ---
    #[wasm_bindgen(getter)]
    pub fn phase(&self) -> u8 {
        self.phase
    }
    #[wasm_bindgen(getter)]
    pub fn score(&self) -> f32 {
        self.score
    }
    #[wasm_bindgen(getter)]
    pub fn best(&self) -> f32 {
        self.best
    }
    #[wasm_bindgen(getter)]
    pub fn combo(&self) -> u32 {
        self.combo
    }
    #[wasm_bindgen(getter)]
    pub fn best_combo(&self) -> u32 {
        self.best_combo
    }
    #[wasm_bindgen(getter)]
    pub fn mult(&self) -> u32 {
        self.mult
    }
    #[wasm_bindgen(getter)]
    pub fn time_left(&self) -> f32 {
        self.time_left
    }
    #[wasm_bindgen(getter)]
    pub fn shake(&self) -> f32 {
        self.shake
    }
    #[wasm_bindgen(getter)]
    pub fn cat_x(&self) -> f32 {
        self.cat_x
    }
    #[wasm_bindgen(getter)]
    pub fn cat_lift(&self) -> f32 {
        self.cat_lift
    }
    #[wasm_bindgen(getter)]
    pub fn cat_squash(&self) -> f32 {
        self.cat_squash
    }
    #[wasm_bindgen(getter)]
    pub fn cat_facing(&self) -> f32 {
        self.cat_facing
    }
    #[wasm_bindgen(getter)]
    pub fn cursor_x(&self) -> f32 {
        self.cursor_x
    }
    #[wasm_bindgen(getter)]
    pub fn cursor_y(&self) -> f32 {
        self.cursor_y
    }
    #[wasm_bindgen(getter)]
    pub fn base(&self) -> f32 {
        self.base_y()
    }
}
