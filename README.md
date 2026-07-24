<div align="center">

<img src="assets/cat.svg" alt="NekoGPU mascot" width="240" />

# 🐱 NekoGPU

**Un compagnon virtuel félin de bureau, ultra-fluide, 100 % WebGPU — sans AUCUNE dépendance.**

Des dizaines de milliers de particules simulées sur le GPU dessinent un chat qui
respire, réagit à ta souris, se laisse caresser… et que tu peux personnaliser
puis partager d'un lien. Pas de Three.js, pas de React, pas de build. Juste du
HTML / JS / WGSL vanilla.

[![License: MIT](https://img.shields.io/badge/License-MIT-8b7bf5.svg)](LICENSE)
![WebGPU](https://img.shields.io/badge/WebGPU-compute%20%2B%20render-00e5ff.svg)
![Zero deps](https://img.shields.io/badge/dependencies-0-39ff14.svg)
![Vanilla](https://img.shields.io/badge/vanilla-JS%20%2F%20WGSL-ff8fb1.svg)

</div>

---

## ✨ Fonctionnalités

- **Moteur de particules massivement parallèle** — un *compute shader* WGSL fait
  vivre jusqu'à **90 000 particules** dans un Storage Buffer, qui s'assemblent
  dynamiquement en silhouette de chat (corps, oreilles, queue, yeux qui clignent).
- **Rendu néon HDR** — sprites additifs, tone mapping ACES, fond cyber et
  **traînée lumineuse** obtenue par une passe de feedback ping-pong (`rgba16float`).
- **ADN Cosmétique** — pelage, néon, couleur des yeux, densité, lueur, longueur de
  traînée, chapeau cyberpunk 🎩. Tout est modifiable **en direct**.
- **Partage** — bouton *Lien de partage* (l'état exact du chat encodé dans l'URL)
  et *Ma carte* (export **PNG 1200×630** prêt à flex sur les réseaux).
- **Comportements vivants** — le chat **suit** la souris (aimant) ou la **fuit**
  (timide), part en **respiration lente** quand tu es inactif, et réagit au clic
  par une **onde de choc** (comme une caresse).

## 🚀 Démarrage

Aucune dépendance à installer. Un petit serveur statique natif (Node ≥ 18) suffit —
il est nécessaire car WebGPU + modules ES ne tournent pas en `file://`.

```bash
git clone https://github.com/benoitbac/MyLovelyWebCat.git
cd MyLovelyWebCat
npm start          # → http://localhost:8080
```

> Navigateur requis : **Chrome / Edge 113+**, ou Firefox récent avec WebGPU activé.

## 🎮 Prise en main

| Action | Effet |
| --- | --- |
| Bouger la souris | Le chat suit / fuit le curseur |
| Cliquer | Onde de choc — une caresse |
| Rester inactif | Respiration lente (mode repos) |
| `R` | ADN aléatoire |
| `H` | Afficher / masquer le panneau |

## 🧠 Architecture

Pipeline GPU en **4 passes** par frame :

```
compute (simulate.wgsl)  →  ressorts + souris + clic + respiration
   │
fade (fade.wgsl)         →  atténue la traînée précédente  ┐ ping-pong
   │                                                        │ rgba16float
particles (particles.wgsl) → sprites additifs (bloom)      ┘
   │
present (present.wgsl)   →  fond cyber + ACES + vignette → écran
```

```
src/
├── main.js              # orchestrateur : boucle, entrées, uniformes, actions
├── gpu/
│   ├── device.js        # init WebGPU (adaptateur / device / canvas)
│   └── engine.js        # pipelines, textures, les 4 passes de rendu
├── cat/
│   ├── silhouette.js    # génération des particules (échantillonnage par rejet)
│   └── dna.js           # état cosmétique + encodage URL de partage
├── ui/
│   ├── controls.js      # panneau ↔ ADN
│   └── share.js         # lien de partage + carte PNG
└── shaders/*.wgsl       # simulate · particles · fade · present
```

## 🤝 Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) et le [Code de conduite](CODE_OF_CONDUCT.md).

## 📄 Licence

[MIT](LICENSE).

<div align="center">
<sub>Fait avec 🐈 et beaucoup de particules.</sub>
</div>
