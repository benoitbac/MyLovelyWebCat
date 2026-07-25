// Gestionnaire d'un chat 3D à partir d'un vrai modèle glTF : chargement,
// mise à l'échelle/centrage, teinte, corpulence, accessoires et animations.
// Réutilisable par le créateur ET par le monde 3D.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CatConfig } from '../state/cat';

export class CatShow {
  readonly group = new THREE.Group();
  private readonly inner = new THREE.Group(); // reçoit la corpulence (scale)
  private readonly modelRoot = new THREE.Group();
  private readonly acc = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private mixer: THREE.AnimationMixer | null = null;
  private mats: { m: THREE.MeshStandardMaterial; base: THREE.Color }[] = [];
  private bbox = new THREE.Box3();

  constructor() {
    this.inner.add(this.modelRoot);
    this.inner.add(this.acc);
    this.group.add(this.inner);
  }

  async loadUrl(url: string): Promise<void> {
    const gltf = await this.loader.loadAsync(url);
    this.setModel(gltf.scene, gltf.animations);
  }
  async loadBuffer(buf: ArrayBuffer): Promise<void> {
    const gltf = await this.loader.parseAsync(buf, '');
    this.setModel(gltf.scene, gltf.animations);
  }

  private setModel(scene: THREE.Object3D, animations: THREE.AnimationClip[]): void {
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.disposeChildren(this.modelRoot);
    this.mats = [];

    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        for (const raw of list) {
          const m = raw as THREE.MeshStandardMaterial;
          if (m && m.color) {
            m.color = m.color.clone();
            this.mats.push({ m, base: m.color.clone() });
          }
        }
      }
    });

    // Mise à l'échelle + pose au sol, centré.
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const s = 2.6 / Math.max(size.x, size.y, size.z || 1);
    scene.scale.setScalar(s);
    const b2 = new THREE.Box3().setFromObject(scene);
    const c2 = b2.getCenter(new THREE.Vector3());
    scene.position.x -= c2.x;
    scene.position.z -= c2.z;
    scene.position.y -= b2.min.y;

    this.modelRoot.add(scene);
    this.bbox = new THREE.Box3().setFromObject(this.modelRoot);

    if (animations.length) {
      this.mixer = new THREE.AnimationMixer(scene);
      this.mixer.clipAction(animations[0]).play();
    }
  }

  applyLook(c: CatConfig): void {
    const tint = new THREE.Color(c.tint);
    for (const { m, base } of this.mats) m.color.copy(base).lerp(tint, c.tintAmount);
    this.inner.scale.set(c.scale, 1 + (c.scale - 1) * 0.5, c.scale);
    this.buildAccessories(c);
  }

  private buildAccessories(c: CatConfig): void {
    this.disposeChildren(this.acc);
    const b = this.bbox;
    const cx = (b.min.x + b.max.x) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    const top = b.max.y;
    const front = b.max.z;
    const w = Math.max(b.max.x - b.min.x, 0.4);

    const accent = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.5 });
    const black = new THREE.MeshStandardMaterial({ color: '#2a2536', roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({
      color: '#ffd24a',
      roughness: 0.3,
      metalness: 0.6,
    });
    const add = (m: THREE.Mesh) => {
      m.castShadow = true;
      this.acc.add(m);
    };

    // Chapeau, posé sur le sommet (approximation par bounding box).
    const hx = cx;
    const hy = top;
    const hs = w * 0.55;
    if (c.hat === 'tophat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(hs, hs, hs * 0.08, 32), black);
      brim.position.set(hx, hy, cz);
      add(brim);
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(hs * 0.6, hs * 0.6, hs * 0.9, 32),
        black,
      );
      crown.position.set(hx, hy + hs * 0.45, cz);
      add(crown);
    } else if (c.hat === 'cap') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(hs * 0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        accent,
      );
      dome.position.set(hx, hy, cz);
      add(dome);
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(hs * 0.75, hs * 0.75, hs * 0.08, 24, 1, false, 0, Math.PI),
        accent,
      );
      visor.position.set(hx, hy, cz + hs * 0.6);
      visor.rotation.x = Math.PI / 2;
      add(visor);
    } else if (c.hat === 'crown') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(hs * 0.6, hs * 0.12, 12, 32), gold);
      ring.position.set(hx, hy + hs * 0.2, cz);
      ring.rotation.x = Math.PI / 2;
      add(ring);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(hs * 0.12, hs * 0.35, 10), gold);
        spike.position.set(
          hx + Math.cos(a) * hs * 0.6,
          hy + hs * 0.42,
          cz + Math.sin(a) * hs * 0.6,
        );
        add(spike);
      }
    } else if (c.hat === 'party') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(hs * 0.55, hs * 1.2, 28), accent);
      cone.position.set(hx, hy + hs * 0.6, cz);
      add(cone);
    }

    if (c.collar) {
      const neckY = b.min.y + (top - b.min.y) * 0.5;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(w * 0.42, w * 0.09, 12, 32), accent);
      collar.position.set(cx, neckY, cz + (front - cz) * 0.35);
      collar.rotation.x = Math.PI / 2 - 0.2;
      add(collar);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(w * 0.1, 16, 16), gold);
      bell.position.set(cx, neckY - w * 0.12, front);
      add(bell);
    }

    if (c.glasses) {
      const frame = new THREE.MeshStandardMaterial({
        color: '#20202a',
        roughness: 0.3,
        metalness: 0.4,
      });
      const gy = top - (top - b.min.y) * 0.28;
      for (const sx of [-w * 0.2, w * 0.2]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.16, w * 0.03, 10, 24), frame);
        ring.position.set(cx + sx, gy, front);
        add(ring);
      }
    }
  }

  update(dt: number): void {
    this.mixer?.update(dt);
  }

  dispose(): void {
    this.disposeChildren(this.modelRoot);
    this.disposeChildren(this.acc);
  }

  private disposeChildren(g: THREE.Object3D): void {
    for (const child of [...g.children]) {
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const list = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of list) (m as THREE.Material).dispose();
        }
      });
      g.remove(child);
    }
  }
}
