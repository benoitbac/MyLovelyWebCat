//! Simulateur de vie du chat — le cœur du « game of life », en Rust/WASM.
//! Le chat a des besoins qui évoluent, prend des décisions autonomes (se
//! déplace, dort, mange, joue, se lave…) et vit selon un cycle jour/nuit.
//! Le shell web ne fait que lire cet état et le mettre en scène.

use wasm_bindgen::prelude::*;

#[inline]
fn clamp(v: f32, a: f32, b: f32) -> f32 {
    v.max(a).min(b)
}

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

// États de comportement (exposés en u8 vers le JS).
const IDLE: u8 = 0;
const WALK: u8 = 1;
const SIT: u8 = 2;
const SLEEP: u8 = 3;
const PLAY: u8 = 4;
const EAT: u8 = 5;
const GROOM: u8 = 6;

const DAY_LEN: f32 = 180.0; // secondes pour un cycle jour/nuit complet

#[wasm_bindgen]
pub struct Life {
    w: f32,
    hunger: f32,
    energy: f32,
    joy: f32,
    hygiene: f32,

    x: f32,
    target_x: f32,
    facing: f32,
    bob: f32,

    state: u8,
    pending: u8,
    state_t: f32,
    state_dur: f32,

    clock: f32,
    coins: u32,
    rng: Rng,
}

#[wasm_bindgen]
impl Life {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> Life {
        Life {
            w: 800.0,
            hunger: 72.0,
            energy: 80.0,
            joy: 68.0,
            hygiene: 75.0,
            x: 400.0,
            target_x: 400.0,
            facing: 1.0,
            bob: 0.0,
            state: IDLE,
            pending: SIT,
            state_t: 0.0,
            state_dur: 2.0,
            clock: 0.18,
            coins: 0,
            rng: Rng(seed.max(1)),
        }
    }

    pub fn resize(&mut self, w: f32) {
        self.w = w;
        self.x = clamp(self.x, 90.0, w - 90.0);
        self.target_x = clamp(self.target_x, 90.0, w - 90.0);
    }

    pub fn load(&mut self, hunger: f32, energy: f32, joy: f32, hygiene: f32, coins: u32) {
        self.hunger = hunger;
        self.energy = energy;
        self.joy = joy;
        self.hygiene = hygiene;
        self.coins = coins;
    }

    fn bowl_x(&self) -> f32 {
        self.w * 0.18
    }
    fn bed_x(&self) -> f32 {
        self.w * 0.82
    }

    pub fn update(&mut self, dt: f32) {
        self.clock = (self.clock + dt / DAY_LEN).fract();

        // Décroissance des besoins (dépend de l'état).
        let sleeping = self.state == SLEEP;
        self.hunger = clamp(self.hunger - 0.5 * dt, 0.0, 100.0);
        self.hygiene = clamp(self.hygiene - 0.25 * dt, 0.0, 100.0);
        if sleeping {
            self.energy = clamp(self.energy + 9.0 * dt, 0.0, 100.0);
            self.joy = clamp(self.joy - 0.1 * dt, 0.0, 100.0);
        } else {
            self.energy = clamp(self.energy - 0.35 * dt, 0.0, 100.0);
            self.joy = clamp(self.joy - 0.4 * dt, 0.0, 100.0);
        }
        match self.state {
            EAT => self.hunger = clamp(self.hunger + 22.0 * dt, 0.0, 100.0),
            GROOM => self.hygiene = clamp(self.hygiene + 20.0 * dt, 0.0, 100.0),
            PLAY => self.joy = clamp(self.joy + 12.0 * dt, 0.0, 100.0),
            _ => {}
        }

        self.state_t += dt;

        if self.state == WALK {
            let dir = self.target_x - self.x;
            self.facing = if dir >= 0.0 { 1.0 } else { -1.0 };
            let sp = 90.0;
            if dir.abs() <= sp * dt {
                self.x = self.target_x;
                let p = self.pending;
                self.enter(p);
            } else {
                self.x += self.facing * sp * dt;
                self.bob = (self.state_t * 9.0).sin().abs() * 5.0;
            }
        } else {
            self.bob *= (1.0 - (dt * 6.0).min(1.0));
            if self.state_t >= self.state_dur {
                self.decide();
            }
        }
    }

    fn enter(&mut self, state: u8) {
        self.state = state;
        self.state_t = 0.0;
        self.state_dur = match state {
            SLEEP => self.rng.range(9.0, 16.0),
            SIT => self.rng.range(3.0, 6.5),
            PLAY => self.rng.range(3.0, 5.0),
            EAT => self.rng.range(2.0, 3.2),
            GROOM => self.rng.range(3.0, 5.0),
            _ => self.rng.range(2.0, 4.0),
        };
    }

    fn walk_to(&mut self, target: f32, then: u8) {
        self.target_x = clamp(target, 90.0, self.w - 90.0);
        self.pending = then;
        self.state = WALK;
        self.state_t = 0.0;
    }

    // Décision autonome : besoins d'abord, puis envie aléatoire.
    fn decide(&mut self) {
        let night = self.clock > 0.55;
        if self.energy < 22.0 || (night && self.energy < 55.0) {
            let b = self.bed_x();
            self.walk_to(b, SLEEP);
            return;
        }
        if self.hunger < 28.0 {
            let b = self.bowl_x();
            self.walk_to(b, EAT);
            return;
        }
        if self.hygiene < 30.0 {
            self.enter(GROOM);
            return;
        }
        let r = self.rng.next();
        if self.joy < 45.0 && r < 0.5 {
            let t = self.rng.range(self.w * 0.3, self.w * 0.7);
            self.walk_to(t, PLAY);
        } else if r < 0.35 {
            let t = self.rng.range(120.0, self.w - 120.0);
            self.walk_to(t, SIT);
        } else if r < 0.55 {
            self.enter(GROOM);
        } else if r < 0.75 {
            self.enter(SIT);
        } else {
            self.enter(IDLE);
        }
    }

    // --- Interactions du joueur ---
    pub fn feed(&mut self) {
        self.hunger = clamp(self.hunger + 34.0, 0.0, 100.0);
        let b = self.bowl_x();
        self.walk_to(b, EAT);
    }
    pub fn cuddle(&mut self) {
        self.joy = clamp(self.joy + 24.0, 0.0, 100.0);
        if self.state != SLEEP {
            self.enter(SIT);
        }
    }
    pub fn clean(&mut self) {
        self.hygiene = clamp(self.hygiene + 40.0, 0.0, 100.0);
        self.enter(GROOM);
    }
    pub fn toy(&mut self) {
        self.joy = clamp(self.joy + 18.0, 0.0, 100.0);
        self.energy = clamp(self.energy - 6.0, 0.0, 100.0);
        self.enter(PLAY);
    }
    pub fn reward(&mut self, coins: u32, joy: f32) {
        self.coins += coins;
        self.joy = clamp(self.joy + joy, 0.0, 100.0);
    }

    // --- Lecture de l'état ---
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f32 {
        self.x
    }
    #[wasm_bindgen(getter)]
    pub fn facing(&self) -> f32 {
        self.facing
    }
    #[wasm_bindgen(getter)]
    pub fn bob(&self) -> f32 {
        self.bob
    }
    #[wasm_bindgen(getter)]
    pub fn state(&self) -> u8 {
        self.state
    }
    #[wasm_bindgen(getter)]
    pub fn hunger(&self) -> f32 {
        self.hunger
    }
    #[wasm_bindgen(getter)]
    pub fn energy(&self) -> f32 {
        self.energy
    }
    #[wasm_bindgen(getter)]
    pub fn joy(&self) -> f32 {
        self.joy
    }
    #[wasm_bindgen(getter)]
    pub fn hygiene(&self) -> f32 {
        self.hygiene
    }
    #[wasm_bindgen(getter)]
    pub fn clock(&self) -> f32 {
        self.clock
    }
    #[wasm_bindgen(getter)]
    pub fn coins(&self) -> u32 {
        self.coins
    }
}
