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

## 5. Architecture cible

Stack retenu (voir arbitrages) :

| Domaine            | Choix                                                                                        | Pourquoi                                      |
| ------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Build / DX         | **Vite + TypeScript**                                                                        | rapide, zéro-config, HMR                      |
| UI                 | **Svelte 5**                                                                                 | runtime minuscule, réactivité fine → fluidité |
| Rendu chat         | **WebGPU** (+ Canvas2D fallback)                                                             | performance et style                          |
| État / persistance | store Svelte + **IndexedDB**                                                                 | offline-first                                 |
| Temps réel         | **WebRTC** (getUserMedia, DataChannel)                                                       | vidéo/audio/contrôle P2P                      |
| Mobile             | **PWA** (manifest + service worker)                                                          | installable, notifications                    |
| Plus tard          | **Tauri** (desktop pet natif), **backend** (signaling/relay + comptes), **ESP32** (hardware) | évolutif                                      |

> **Tradeoff assumé** : Svelte donne une base plus légère/fluide que React, au prix
> d'un écosystème un peu plus petit. Les briques temps-réel (WebRTC, média) sont de
> toute façon agnostiques du framework.

### Découpage modulaire

```
src/
├── engine/         # WebGPU : rendu + boucle d'animation (le "corps" du chat)
├── companion/      # machine à états, humeurs, besoins (Tamagotchi)
├── customization/  # ADN cosmétique (couleurs, accessoires, morphologie)
├── sharing/        # capture, cartes, liens, export réseaux
├── playroom/       # Pilier 2 : jeux pour le vrai chat
├── vision/         # détection mouvement/patte via caméra (CV)
├── realtime/       # Pilier 3 : WebRTC, appairage, contrôle distant
├── state/          # store global + persistance IndexedDB
├── ui/             # composants Svelte, écrans, design system
└── lib/            # utils partagés
public/             # manifest PWA, icônes, assets
dashboard/          # tableau de bord des sprints (versionné)
planning/           # notes de sprint
```

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

| #   | Sprint                 | Pilier | Objectif                                                                     |
| --- | ---------------------- | ------ | ---------------------------------------------------------------------------- |
| 0   | Fondations & outillage | —      | Scaffold Vite+TS+Svelte, PWA, WebGPU bootstrap, design system, dashboard, CI |
| 1   | Le compagnon vivant    | 1      | Rendu WebGPU du chat + animation + réactions souris + humeurs de base        |
| 2   | Tamagotchi             | 1      | Besoins qui évoluent, actions (caresser/nourrir/jouer), persistance          |
| 3   | ADN cosmétique         | 1      | Customisation (couleurs, accessoires, morpho) + déblocables                  |
| 4   | Partage social         | 1      | Capture image/clip, cartes, liens, export réseaux                            |
| 5   | Playroom               | 2      | Jeux plein écran pour le vrai chat + capture de moments                      |
| 6   | Vision & interaction   | 2      | Détection mouvement/patte (caméra), attrapabilité                            |
| 7   | Home local             | 3      | Appairage téléphone↔maison (WebRTC local), live + audio + jeu à distance     |
| 8   | Cloud & comptes        | 3      | Backend signaling/relay, accès distant réel, galerie partagée                |

**Backlog / exploratoire** : Tauri (desktop pet always-on-top), hardware ESP32
(distributeur de croquettes / jouet connecté), personnalité IA + voix, multi-chats,
marketplace d'accessoires.
