// Trait d'union entre l'UI (dock) et le compagnon : applique l'effet d'une
// action sur les besoins et déclenche la réaction visuelle du chat.

import type { Renderer } from '../engine/renderer';
import { applyNeedsAction, type ActionKind } from './needs';

let current: Renderer | null = null;

export function setRenderer(renderer: Renderer | null): void {
  current = renderer;
}

export function performAction(kind: ActionKind): void {
  applyNeedsAction(kind);
  current?.react(kind);
}
