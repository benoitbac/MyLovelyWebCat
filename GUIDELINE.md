# 🐱 Miaou — Guideline

> Nom de code : **Miaou** (provisoire). Repo : `MyLovelyWebCat`.
> Document vivant : toute décision structurante se reflète ici et dans le [dashboard](dashboard/index.html).

---

## 1. Vision

Un **compagnon félin virtuel** qui vit dans le navigateur, ultra-fluide et mignon,
décliné en trois couches qui partagent le même « être » et le même moteur :

1. **Miaou Companion** — un compagnon de bureau façon Tamagotchi : il vit, réagit,
   a des humeurs et des besoins ; on le personnalise, on le caresse, on le nourrit.
2. **Miaou Playroom** — un mode pensé pour **ton vrai chat** resté seul : des jeux à
   l'écran (pelote, laser, proie) qu'il peut « attraper », qui l'occupent sainement.
3. **Miaou Home** — le pont **téléphone ↔ maison** : filmer son chat, capturer ses
   moments de jeu, lui parler, et lui lancer un jeu à distance.

**Fil rouge : le partage.** Chaque instant mignon (compagnon comme vrai chat) est
pensé pour devenir une image / un clip partageable sur les réseaux — toujours opt-in.

---

## 2. Les trois piliers en détail

### Pilier 1 — Miaou Companion (compagnon de bureau)

- Un chat rendu en **WebGPU**, animé en continu (respiration, regard, réactions souris).
- **Machine à états / humeurs** : joueur, câlin, endormi, affamé, boudeur…
- **Besoins qui évoluent dans le temps** (faim, énergie, humeur, propreté) — façon Tamagotchi.
- **Actions** : caresser, nourrir, jouer, brosser, endormir…
- **Customisation** (« ADN cosmétique ») : couleurs, accessoires, morphologie, déblocables.
- **Persistance locale** : il se souvient de son état entre les sessions.

### Pilier 2 — Miaou Playroom (pour le vrai chat)

- Jeux **plein écran** conçus pour un chat : cibles qui bougent de façon crédible
  (proie, pelote, insecte, laser), avec une vraie « attrapabilité ».
- **Détection d'interaction** : mouvement/patte via caméra (vision) et/ou tactile.
- **Capture automatique de moments** : screenshots/clips quand le chat joue.
- **Bien-être animal d'abord** (voir §6).

### Pilier 3 — Miaou Home (caméra + contrôle à distance)

- **Filmer** le chat (caméra locale), **flux live** consultable depuis le téléphone.
- **Parler au chat** (audio bidirectionnel).
- **Lancer un jeu à distance** (« envoie une pelote »).
- **Galerie de moments** capturés, prêts à partager.
- **Local d'abord** (même WiFi, WebRTC direct), **cloud prévu** ensuite (accès de partout).

---

## 3. Principes produit

- **Mignon avant tout** : le charme et la lisibilité priment sur la démo technique.
- **Ultra-fluide** : 60 fps minimum, 120 fps si dispo. La fluidité fait le vivant.
- **Partageable par design** : capture, cartes, liens encodés — mais toujours **opt-in**.
- **Respect du chat** : jeux non-frustrants, pas de sons stressants, sessions bornées (§6).
- **Vie privée** : la caméra reste **locale par défaut**, rien ne part sans action explicite.
- **Offline-first (Pilier 1)** : le compagnon fonctionne sans réseau.

## 4. Principes techniques

- **Rendu** : WebGPU (moteur du chat, particules/2D stylisé), fallback gracieux si indispo.
- **Perf budget** : boucle de rendu découplée de la logique ; pas de jank ; budget frame surveillé.
- **PWA** : installable sur desktop et mobile (le téléphone est un vrai client du Pilier 3).
- **Local-first networking** : appairage par QR/lien, WebRTC pair-à-pair sur réseau local ;
  le backend cloud est une **surcouche** ajoutée ensuite, pas un prérequis.
- **Typé** : TypeScript partout, code modulaire et testable.

---

## 5. Architecture cible — stack studio

Objectif produit : un **« game of life » de chat** (élevage/vie + customisation poussée),
**multijoueur**, avec de **vrais mini-jeux**. On assume une stack pro moderne, chaque
techno à sa juste place.

| Domaine              | Choix                                                  | Pourquoi                                             |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Cœur moteur (jeux)   | **Rust → WebAssembly** (`engine/`)                     | simulation/physique déterministe, rapide, portable   |
| Backend / multi      | **.NET 9 · ASP.NET Core + SignalR** (`server/`)        | temps réel (arène bureau), API, classements, comptes |
| Shell / UI / rendu   | **Vite + TypeScript + Svelte 5** (`src/`)              | orchestration, rendu Canvas/SVG, réactivité fluide   |
| Illustration du chat | **SVG vectoriel** recolorable (ADN)                    | mignon, net, scalable, customisable                  |
| État / persistance   | store Svelte + **IndexedDB** (local), **.NET** (cloud) | offline-first puis sauvegarde/compte                 |
| Mobile               | **PWA**                                                | installable                                          |
| Plus tard            | WebRTC (cam/pilier « vrai chat »), Tauri, hardware     | évolutif                                             |

> Le jeu tourne **dans le navigateur** (exigence de base) : Rust vit en **WASM** côté
> client (le moteur), .NET est le **backend** (multi/persistance/social). C'est la plus
> grosse stack _sérieuse_ pour un jeu web multi — et elle **compile/tourne** déjà (moteur
> WASM bundlé, serveur `/health` + `/api/scores` OK).

### Découpage (monorepo)

```
engine/            # 🦀 Rust : cœur moteur des jeux → compilé en WASM
│   └── src/lib.rs #    (Miaou Pounce : chat, proies, bond, collisions, score…)
server/            # ⚡ .NET 9 : API + SignalR (arène temps réel, classements)
│   ├── Program.cs
│   └── Hubs/ArenaHub.cs
src/               # 🕸️ Web (Svelte/TS)
├── wasm/          #    binding généré du moteur Rust (wasm-pack, versionné)
├── game/          #    rendu canvas + son du jeu (lit les buffers WASM)
├── companion/     #    cerveau du chat : humeurs, expression, regard
├── customization/ #    ADN cosmétique (couleurs, morphologie, partage URL)
├── state/         #    persistance IndexedDB
└── ui/            #    composants & écrans Svelte
```

Build : `npm run build:engine` (Rust→WASM) puis `npm run build` (web) ; `dotnet run`
dans `server/` pour le backend.

---

## 6. Bien-être animal & vie privée (transverse, non négociable)

- **Jeux gagnables** : la proie doit pouvoir être « attrapée » (récompense visuelle),
  jamais une frustration infinie.
- **Pas de stimuli stressants** : pas de sons aigus/soudains, pas de flashs.
- **Sessions bornées** : durée de jeu limitée + pauses suggérées.
- **Caméra locale par défaut** : aucun flux ne quitte l'appareil sans action explicite.
- **Chiffrement** : les flux distants passent par WebRTC (DTLS/SRTP).
- **Consentement clair** pour caméra/micro, et pour tout partage.

---

## 7. Definition of Done (par tâche)

- [ ] Fonctionne à **60 fps** minimum sur desktop récent, sans jank visible.
- [ ] **TypeScript** sans erreur, **lint/format** OK, aucune erreur console.
- [ ] **Responsive** (desktop + mobile) quand pertinent.
- [ ] Comportement **derrière un état** clair (pas de code mort activé par défaut).
- [ ] Pilier 1 : **fonctionne offline**.
- [ ] Accessibilité de base (contrastes, focus, `prefers-reduced-motion`).
- [ ] **Commit** en Conventional Commits + **dashboard mis à jour**.

## 8. Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`…).
- **Branches** : `feat/…`, `fix/…`, `chore/…` ; PR vers `main`.
- **Un sprint = un objectif** ; les tâches vivent dans le [dashboard](dashboard/index.html).
- **Docs vivantes** : cette guideline et le dashboard sont la source de vérité.

---

## 9. Roadmap (vue d'ensemble)

Détail interactif & suivi dans le **[dashboard](dashboard/index.html)**.

**Vision = « GTA-like félin » / game of life new-gen** : on personnifie son avatar
en **3D**, il vit dans un **monde 3D où l'on se balade**, avec de vrais jeux, en
**multijoueur**. Stack : **Three.js/WebGL(→WebGPU)** pour le 3D, **Rust/WASM** pour
la simulation, **.NET 9/SignalR** pour le multi, **Svelte/TS** pour l'orchestration.

| Lot | Contenu                                                                            | Stack                | État  |
| --- | ---------------------------------------------------------------------------------- | -------------------- | ----- |
| A   | **Fondations stack** : moteur Rust→WASM + backend .NET (SignalR) + web             | Rust · .NET · TS     | ✅    |
| B   | **Créateur 3D (avatar façon GTA)** : chat 3D tournable, robes, morpho, accessoires | Three.js             | ✅    |
| C   | **Monde 3D balade** : scène 3D, ton chat 3D dedans, caméra qui suit, jour/nuit     | Three.js             | ⏳ ⭐ |
| D   | **Game of life dans le monde** : besoins, IA autonome (Rust), soins, économie, PNJ | Rust/WASM · Three.js | ⏳    |
| E   | **Vrais jeux** intégrés au monde (Pounce fait + autres), bonus, déblocables        | Rust/WASM            | 🟡    |
| F   | **Multijoueur** : autres chats (collègues) dans le monde, temps réel               | .NET/SignalR         | ⏳    |
| G   | **Partage social** : captures, cartes, liens                                       | Svelte · .NET        | ⏳    |

⭐ Prochaine brique. **Choix du monde** (Terre, Lune, appart…) à l'entrée du monde.

**Après** : rendu **WebGPU** (Three.js WebGPURenderer), comptes cloud & sauvegarde,
mobile (PWA/Tauri), pilier « vrai chat » (caméra/WebRTC), personnalité IA.
