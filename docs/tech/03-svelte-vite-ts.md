# 03 — Shell web : Vite + TypeScript + Svelte 5

## Décision

L'application (écrans, UI, HUD, rendu 2D canvas/SVG, orchestration du WASM) est en
**Svelte 5**, buildée par **Vite**, en **TypeScript** strict.

## Pourquoi c'est le meilleur choix ici

- **Runtime minuscule + réactivité fine (runes)** : Svelte compile vers du JS quasi
  optimal, sans Virtual DOM → parfait pour une UI qui tourne à 60/120 fps à côté
  d'un canvas et d'un module WASM.
- **Vite** : dev instantané (HMR), build ultra-rapide, gère nativement le **WASM** et
  les assets. Import direct du binding `wasm-pack`.
- **TypeScript strict** : typage de bout en bout, y compris les bindings WASM générés.
- **DX** : `svelte-check` + ESLint + Prettier → base saine, CI verte.

## Rôles

- **Rendu du chat** : illustration **SVG** vectorielle recolorable (l'« ADN »),
  nette et scalable — pas de dépendance lourde.
- **Rendu du jeu** : `<canvas>` 2D qui lit les buffers du moteur Rust.
- **Écrans** : routeur simple (`create` / `home` / `game`).

## Alternatives écartées

- **React** : écosystème énorme mais runtime + overhead plus lourds ; moins adapté à
  du temps réel fluide sans optimisations manuelles.
- **Vanilla** : trop coûteux à maintenir à l'échelle d'un vrai jeu.
- **Unity/WebGL export** : bundle énorme, démarrage lent, mal adapté à une app web/PWA.
