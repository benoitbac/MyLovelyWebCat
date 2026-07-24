// Trait d'union entre l'UI (dock) et le compagnon : applique l'effet d'une
// action sur les besoins et déclenche la réaction d'humeur correspondante.

import { applyNeedsAction, type ActionKind } from './needs';
import { pet, play } from './loop';

export function performAction(kind: ActionKind): void {
  applyNeedsAction(kind);
  if (kind === 'play') play();
  else pet();
}
