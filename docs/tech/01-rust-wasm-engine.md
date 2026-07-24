# 01 — Moteur en Rust → WebAssembly

## Décision

Le **cœur de calcul** (simulation des jeux ET simulation de vie du chat) est écrit
en **Rust**, compilé en **WebAssembly** via `wasm-pack`, et exécuté dans le
navigateur. Le JavaScript ne fait qu'orchestrer et dessiner.

## Pourquoi c'est le meilleur choix ici

- **Performance quasi native** : la boucle de simulation (proies, physique, IA du
  chat, milliers d'entités à terme) tourne sans le coût du GC JS ni le jank.
- **Déterminisme** : indispensable pour le multijoueur (rejouabilité, anti-triche,
  synchronisation) — un moteur déterministe rejoue exactement la même partie.
- **Sûreté mémoire** : Rust garantit l'absence de data races / use-after-free.
- **Portabilité** : le même code Rust pourra alimenter un serveur autoritatif .NET
  (via FFI/natif) ou un client, sans réécriture de la logique.
- **Taille** : le binaire WASM fait ~34 kB (gzip ~15 kB) — négligeable.

## Comment c'est câblé

```
engine/src/lib.rs   → jeu "Miaou Pounce" (Game)
engine/src/life.rs  → simulation de vie (Life)
        │ wasm-pack build --target web
        ▼
src/wasm/           → binding ESM importé par Vite/Svelte
```

- Communication JS↔WASM par **buffers Float32Array** (positions, particules…) et
  **getters** — zéro sérialisation JSON dans la boucle.
- Build : `npm run build:engine`.

## Alternatives écartées

- **Tout en TypeScript** : plus simple mais non déterministe, moins perf, et on perd
  l'argument multijoueur sérieux.
- **C++/Emscripten** : puissant mais toolchain plus lourde et moins sûre que Rust.
- **AssemblyScript** : sympa mais écosystème/maturité loin de Rust.
