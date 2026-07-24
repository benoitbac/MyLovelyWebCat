# Choix techniques de Miaou — résumé

> Philosophie : **le meilleur outil à sa juste place**, pas une collection de logos.
> Chaque techno ci-dessous est choisie parce qu'elle est la référence _sérieuse_
> pour son rôle dans un **jeu web multijoueur de niveau studio** — et surtout :
> **elle compile et tourne déjà** dans ce repo, ce n'est pas du powerpoint.

| Rôle                         | Techno retenue                          | Pourquoi (résumé)                                           | Doc                                |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| Cœur moteur (jeux + vie)     | **Rust → WebAssembly**                  | perf native, déterministe, sûr ; le calcul lourd hors du JS | [01](01-rust-wasm-engine.md)       |
| Backend / multijoueur        | **.NET 9 · ASP.NET Core + SignalR**     | temps réel bas-latence, écosystème mûr, scalable            | [02](02-dotnet-signalr-backend.md) |
| Shell / UI / rendu 2D        | **Vite + TypeScript + Svelte 5**        | DX au top, runtime minuscule, réactivité fine → fluidité    | [03](03-svelte-vite-ts.md)         |
| Rendu 3D (créateur, à venir) | **Three.js / WebGL2 (→ WebGPU)**        | vrai 3D temps réel dans le navigateur (turntable façon GTA) | [04](04-rendu-3d.md)               |
| Persistance locale           | **IndexedDB**                           | offline-first, robuste                                      | —                                  |
| Distribution                 | **PWA** (+ **Tauri** desktop plus tard) | installable web, puis app native / Steam via wrapper        | —                                  |

## Le principe d'architecture

```
        ┌──────────────── navigateur (client) ────────────────┐
        │  Svelte + TS  (UI, écrans, rendu 2D canvas/SVG)      │
        │        │                        ▲                    │
        │        ▼                        │ buffers            │
        │  🦀 moteur Rust → WASM  (jeux + simulation de vie)   │
        └───────────────────────┬─────────────────────────────┘
                                 │  WebSocket (SignalR) / HTTP
                                 ▼
        ┌──────────────── serveur ────────────────────────────┐
        │  ⚡ .NET 9  ·  API (scores) + Arène temps réel (multi)│
        └─────────────────────────────────────────────────────┘
```

- Le **JS n'est qu'un chef d'orchestre** : la simulation vit en Rust/WASM.
- Le **multijoueur** passe par SignalR (WebSocket managé) côté .NET.
- Tout est **typé de bout en bout** (Rust, C#, TypeScript).

## État (ce qui tourne déjà)

- ✅ Moteur Rust compilé en WASM, bundlé par Vite (~34 kB gzip ~15 kB).
- ✅ Jeu « Miaou Pounce » + simulation de vie du chat, tous deux en Rust.
- ✅ Backend .NET : `/health`, `/api/scores`, hub SignalR `/hub/arena` (build + run OK).
- ⏳ Client multijoueur, rendu 3D du créateur, accessoires/goodies, progression.
