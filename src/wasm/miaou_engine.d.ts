/* tslint:disable */
/* eslint-disable */

export class Game {
    free(): void;
    [Symbol.dispose](): void;
    load_best(best: number): void;
    constructor(seed: number);
    particle_data(): Float32Array;
    popup_data(): Float32Array;
    pounce(): void;
    prey_data(): Float32Array;
    resize(w: number, h: number): void;
    set_cursor(x: number, y: number): void;
    start(): void;
    /**
     * File d'événements depuis la dernière frame (code, arg)*. Vidée à la lecture.
     */
    take_events(): Float32Array;
    trail_data(): Float32Array;
    update(dt: number): void;
    readonly base: number;
    readonly best: number;
    readonly best_combo: number;
    readonly cat_facing: number;
    readonly cat_lift: number;
    readonly cat_squash: number;
    readonly cat_x: number;
    readonly combo: number;
    readonly cursor_x: number;
    readonly cursor_y: number;
    readonly mult: number;
    readonly phase: number;
    readonly score: number;
    readonly shake: number;
    readonly time_left: number;
}

export class Life {
    free(): void;
    [Symbol.dispose](): void;
    clean(): void;
    cuddle(): void;
    feed(): void;
    load(hunger: number, energy: number, joy: number, hygiene: number, coins: number): void;
    constructor(seed: number);
    resize(w: number): void;
    reward(coins: number, joy: number): void;
    toy(): void;
    update(dt: number): void;
    readonly bob: number;
    readonly clock: number;
    readonly coins: number;
    readonly energy: number;
    readonly facing: number;
    readonly hunger: number;
    readonly hygiene: number;
    readonly joy: number;
    readonly state: number;
    readonly x: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_game_free: (a: number, b: number) => void;
    readonly __wbg_life_free: (a: number, b: number) => void;
    readonly game_base: (a: number) => number;
    readonly game_best: (a: number) => number;
    readonly game_best_combo: (a: number) => number;
    readonly game_cat_facing: (a: number) => number;
    readonly game_cat_lift: (a: number) => number;
    readonly game_cat_squash: (a: number) => number;
    readonly game_cat_x: (a: number) => number;
    readonly game_combo: (a: number) => number;
    readonly game_cursor_x: (a: number) => number;
    readonly game_cursor_y: (a: number) => number;
    readonly game_load_best: (a: number, b: number) => void;
    readonly game_mult: (a: number) => number;
    readonly game_new: (a: number) => number;
    readonly game_particle_data: (a: number) => [number, number];
    readonly game_phase: (a: number) => number;
    readonly game_popup_data: (a: number) => [number, number];
    readonly game_pounce: (a: number) => void;
    readonly game_prey_data: (a: number) => [number, number];
    readonly game_resize: (a: number, b: number, c: number) => void;
    readonly game_score: (a: number) => number;
    readonly game_set_cursor: (a: number, b: number, c: number) => void;
    readonly game_shake: (a: number) => number;
    readonly game_start: (a: number) => void;
    readonly game_take_events: (a: number) => [number, number];
    readonly game_time_left: (a: number) => number;
    readonly game_trail_data: (a: number) => [number, number];
    readonly game_update: (a: number, b: number) => void;
    readonly life_bob: (a: number) => number;
    readonly life_clean: (a: number) => void;
    readonly life_clock: (a: number) => number;
    readonly life_coins: (a: number) => number;
    readonly life_cuddle: (a: number) => void;
    readonly life_energy: (a: number) => number;
    readonly life_facing: (a: number) => number;
    readonly life_feed: (a: number) => void;
    readonly life_hunger: (a: number) => number;
    readonly life_hygiene: (a: number) => number;
    readonly life_joy: (a: number) => number;
    readonly life_load: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly life_new: (a: number) => number;
    readonly life_resize: (a: number, b: number) => void;
    readonly life_reward: (a: number, b: number, c: number) => void;
    readonly life_state: (a: number) => number;
    readonly life_toy: (a: number) => void;
    readonly life_update: (a: number, b: number) => void;
    readonly life_x: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
