# 04 — Rendu 3D (créateur type GTA) — à venir

## Objectif

Pouvoir **tourner autour du chat en 3D** dans le créateur (turntable façon GTA), et
à terme un rendu plus « produit ».

## Décision de techno

- **Three.js sur WebGL2** pour démarrer : la référence 3D temps réel du web, énorme
  écosystème, contrôles orbitaux (`OrbitControls`) prêts à l'emploi, chargement de
  modèles **glTF**.
- **Migration WebGPU** ensuite (Three.js a un backend WebGPU) pour l'éclairage
  avancé quand ce sera pertinent.

## Ce que ça implique (honnête)

Un vrai 3D « qui envoie » demande un **modèle 3D de chat stylisé** (low-poly + PBR),
pas juste du code : soit modelé (Blender → glTF), soit généré. C'est un **lot
dédié** — le faire à moitié (une image 2D qu'on incline en CSS) ferait justement
« cheap ». On le fait bien :

1. Modèle chat low-poly stylisé (glTF), matériaux paramétrables par l'« ADN »
   (couleurs → uniforms/matériaux).
2. Scène Three.js : sol/podium, éclairage 3 points, ombres douces.
3. `OrbitControls` limités (rotation horizontale + léger tilt) = effet GTA.
4. Accessoires (chapeaux, colliers…) = sous-meshes attachés au modèle.

## Pourquoi pas tout de suite

Le reste du jeu (game of life, jeux, multi) apporte plus de valeur immédiate. Le 3D
est un **sprint art+tech isolé** pour ne pas livrer un placeholder qui déçoit.

## Alternatives

- **Babylon.js** : excellent aussi (plus « moteur de jeu »), option valable.
- **CSS 3D transforms** : insuffisant pour un vrai personnage (rendu plat).
