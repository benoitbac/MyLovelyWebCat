// Chat 3D stylisé, construit en géométrie Three.js et piloté par l'ADN.
// Tout est paramétrable : couleurs, corpulence, oreilles, truffe, rondeur,
// et accessoires (chapeaux, collier, lunettes).

import * as THREE from 'three';
import type { DNA } from '../customization/dna';

export interface CatModel {
  group: THREE.Group;
  update(dna: DNA): void;
  dispose(): void;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createCat(): CatModel {
  const group = new THREE.Group();

  const fur = new THREE.MeshStandardMaterial({
    color: '#a9764a',
    roughness: 0.72,
    metalness: 0.02,
  });
  const belly = new THREE.MeshStandardMaterial({ color: '#f0e2cf', roughness: 0.8 });
  const accent = new THREE.MeshStandardMaterial({ color: '#ff9ecf', roughness: 0.6 });
  const iris = new THREE.MeshStandardMaterial({
    color: '#7bd88f',
    roughness: 0.25,
    metalness: 0.1,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#181225', roughness: 0.2 });
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });

  // Corps
  const body = mesh(new THREE.SphereGeometry(1, 48, 48), fur);
  body.position.y = 1.05;
  body.scale.set(0.95, 1.12, 0.9);
  group.add(body);

  // Ventre
  const bellyPatch = mesh(new THREE.SphereGeometry(0.62, 32, 32), belly);
  bellyPatch.position.set(0, 0.95, 0.42);
  bellyPatch.scale.set(0.8, 1.0, 0.5);
  group.add(bellyPatch);

  // Pattes avant
  for (const sx of [-0.42, 0.42]) {
    const paw = mesh(new THREE.SphereGeometry(0.3, 24, 24), fur);
    paw.position.set(sx, 0.32, 0.55);
    paw.scale.set(1, 0.8, 1.2);
    group.add(paw);
  }

  // Tête
  const head = mesh(new THREE.SphereGeometry(0.86, 48, 48), fur);
  head.position.y = 2.25;
  group.add(head);

  // Museau (discret)
  const muzzle = mesh(new THREE.SphereGeometry(0.28, 32, 32), belly);
  muzzle.position.set(0, 1.98, 0.68);
  muzzle.scale.set(1.05, 0.62, 0.5);
  group.add(muzzle);

  // Oreilles (groupes pour scaler la taille)
  const ears: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    const outer = mesh(new THREE.ConeGeometry(0.36, 0.78, 28), fur);
    ear.add(outer);
    const inner = mesh(new THREE.ConeGeometry(0.2, 0.5, 24), accent);
    inner.position.set(0, -0.02, 0.09);
    ear.add(inner);
    ear.position.set(sx * 0.52, 2.92, 0.02);
    ear.rotation.z = -sx * 0.26;
    ear.rotation.x = -0.12;
    group.add(ear);
    ears.push(ear);
  }

  // Yeux
  for (const sx of [-0.34, 0.34]) {
    const eyeball = mesh(new THREE.SphereGeometry(0.19, 28, 28), iris);
    eyeball.position.set(sx, 2.3, 0.66);
    group.add(eyeball);
    const pupil = mesh(new THREE.SphereGeometry(0.1, 20, 20), dark);
    pupil.position.set(sx, 2.29, 0.79);
    group.add(pupil);
    const glint = mesh(new THREE.SphereGeometry(0.045, 12, 12), white);
    glint.position.set(sx - 0.05, 2.36, 0.83);
    group.add(glint);
  }

  // Truffe
  const nose = mesh(new THREE.SphereGeometry(0.1, 20, 20), accent);
  nose.position.set(0, 2.04, 0.98);
  nose.scale.set(1.3, 0.9, 0.9);
  group.add(nose);

  // Queue
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.7, 0.7, -0.45),
    new THREE.Vector3(1.35, 0.8, -0.15),
    new THREE.Vector3(1.5, 1.5, 0.15),
    new THREE.Vector3(1.05, 2.05, 0.35),
  ]);
  const tail = mesh(new THREE.TubeGeometry(tailCurve, 40, 0.17, 16, false), fur);
  group.add(tail);

  // Groupe accessoires (reconstruit à chaque update).
  const acc = new THREE.Group();
  group.add(acc);

  function clearAcc() {
    for (const child of acc.children) {
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    acc.clear();
  }

  function buildHat(kind: DNA['hat'], accentColor: string) {
    if (kind === 'none') return;
    const black = new THREE.MeshStandardMaterial({ color: '#2a2536', roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({
      color: '#ffd24a',
      roughness: 0.3,
      metalness: 0.6,
    });
    if (kind === 'tophat') {
      const brim = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 40), black);
      brim.position.y = 3.05;
      acc.add(brim);
      const crown = mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.75, 40), black);
      crown.position.y = 3.45;
      acc.add(crown);
      const band = mesh(
        new THREE.TorusGeometry(0.56, 0.06, 12, 40),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }),
      );
      band.position.y = 3.2;
      band.rotation.x = Math.PI / 2;
      acc.add(band);
    } else if (kind === 'cap') {
      const dome = mesh(
        new THREE.SphereGeometry(0.7, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.6 }),
      );
      dome.position.y = 2.95;
      acc.add(dome);
      const visor = mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.06, 32, 1, false, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.6 }),
      );
      visor.position.set(0, 2.95, 0.5);
      visor.rotation.x = Math.PI / 2;
      acc.add(visor);
    } else if (kind === 'crown') {
      const ring = mesh(new THREE.TorusGeometry(0.5, 0.09, 14, 40), gold);
      ring.position.y = 3.0;
      ring.rotation.x = Math.PI / 2;
      acc.add(ring);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = mesh(new THREE.ConeGeometry(0.1, 0.28, 12), gold);
        spike.position.set(Math.cos(a) * 0.5, 3.18, Math.sin(a) * 0.5);
        acc.add(spike);
      }
    } else if (kind === 'party') {
      const cone = mesh(
        new THREE.ConeGeometry(0.42, 0.95, 28),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }),
      );
      cone.position.y = 3.45;
      acc.add(cone);
      const pom = mesh(new THREE.SphereGeometry(0.14, 16, 16), gold);
      pom.position.y = 3.95;
      acc.add(pom);
    }
  }

  function update(dna: DNA) {
    fur.color.set(dna.furB);
    belly.color.set(dna.belly);
    accent.color.set(dna.accent);
    iris.color.set(dna.eye);

    const b = dna.bodySize;
    const r = dna.roundness;
    body.scale.set(0.95 * b * (1 + 0.1 * r), 1.12 * b * (1 - 0.04 * r), 0.9 * b * (1 + 0.1 * r));
    for (const ear of ears) ear.scale.setScalar(dna.earSize);
    nose.scale.set(1.3 * dna.noseSize, 0.9 * dna.noseSize, 0.9 * dna.noseSize);

    clearAcc();
    buildHat(dna.hat, dna.accent);
    if (dna.collar) {
      const collar = mesh(
        new THREE.TorusGeometry(0.6, 0.09, 14, 40),
        new THREE.MeshStandardMaterial({ color: dna.accent, roughness: 0.5 }),
      );
      collar.position.y = 1.62;
      collar.rotation.x = Math.PI / 2 - 0.15;
      acc.add(collar);
      const bell = mesh(
        new THREE.SphereGeometry(0.12, 20, 20),
        new THREE.MeshStandardMaterial({ color: '#ffd24a', roughness: 0.3, metalness: 0.6 }),
      );
      bell.position.set(0, 1.42, 0.55);
      acc.add(bell);
    }
    if (dna.glasses) {
      const frame = new THREE.MeshStandardMaterial({
        color: '#20202a',
        roughness: 0.3,
        metalness: 0.4,
      });
      for (const sx of [-0.34, 0.34]) {
        const ring = mesh(new THREE.TorusGeometry(0.22, 0.035, 12, 28), frame);
        ring.position.set(sx, 2.3, 0.7);
        acc.add(ring);
      }
      const bridge = mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), frame);
      bridge.position.set(0, 2.32, 0.72);
      acc.add(bridge);
    }
  }

  function dispose() {
    clearAcc();
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }

  return { group, update, dispose };
}
