// Initialisation unique du module WASM (moteur Rust), partagée par le jeu et
// le simulateur de vie.
import init from '../wasm/miaou_engine';

let p: Promise<unknown> | null = null;
export function ready(): Promise<unknown> {
  p ??= init();
  return p;
}
