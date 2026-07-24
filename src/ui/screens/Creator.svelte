<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { createCat, type CatModel } from '../../creator/cat3d';
  import {
    dna,
    setDNA,
    randomizeDNA,
    applyFurPreset,
    FUR_PRESETS,
    type HatKind,
  } from '../../customization/dna';
  import { profile, finishCreation } from '../../state/app';

  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let name = $state($profile.name === 'Miaou' ? '' : $profile.name);

  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  let cat: CatModel;
  let pmrem: THREE.PMREMGenerator;
  let raf = 0;
  let ro: ResizeObserver;
  let unsub: () => void;

  let importedModel: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let fileInput!: HTMLInputElement;
  let importErr = $state<string | null>(null);
  let importing = $state(false);

  function placeModel(obj: THREE.Object3D, animations: THREE.AnimationClip[]) {
    if (importedModel) scene.remove(importedModel);
    mixer?.stopAllAction();
    mixer = null;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.6 / Math.max(size.x, size.y, size.z || 1);
    obj.scale.setScalar(scale);
    const b2 = new THREE.Box3().setFromObject(obj);
    const c2 = b2.getCenter(new THREE.Vector3());
    obj.position.x -= c2.x;
    obj.position.z -= c2.z;
    obj.position.y -= b2.min.y;
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(obj);
    importedModel = obj;
    cat.group.visible = false;

    if (animations.length) {
      mixer = new THREE.AnimationMixer(obj);
      mixer.clipAction(animations[0]).play();
    }
  }

  function loadFile(f: File) {
    importErr = null;
    importing = true;
    void f
      .arrayBuffer()
      .then((buf) => {
        new GLTFLoader().parse(
          buf,
          '',
          (g) => {
            placeModel(g.scene, g.animations);
            importing = false;
          },
          (err) => {
            importErr = 'Modèle illisible (.glb / .gltf)';
            importing = false;
            console.error(err);
          },
        );
      })
      .catch(() => {
        importErr = 'Lecture du fichier impossible';
        importing = false;
      });
  }

  function onImport(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) loadFile(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) loadFile(f);
  }

  function useDefaultCat() {
    if (importedModel) {
      scene.remove(importedModel);
      importedModel = null;
    }
    mixer?.stopAllAction();
    mixer = null;
    cat.group.visible = true;
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  onMount(() => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0.5, 2.6, 6.4);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.7, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.2;
    controls.maxDistance = 9;
    controls.minPolarAngle = 0.7;
    controls.maxPolarAngle = 1.55;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0003;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9ab4ff, 0.7);
    fill.position.set(-6, 3, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd9a0, 0.9);
    rim.position.set(-1, 5, -6);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff, 0.12));

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 2.75, 0.35, 64),
      new THREE.MeshStandardMaterial({ color: '#241d3c', roughness: 0.55, metalness: 0.15 }),
    );
    podium.position.y = -0.17;
    podium.receiveShadow = true;
    scene.add(podium);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.55, 0.06, 16, 80),
      new THREE.MeshStandardMaterial({
        color: '#7b5cff',
        roughness: 0.3,
        metalness: 0.4,
        emissive: '#3a2a86',
      }),
    );
    ring.position.y = 0.02;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    cat = createCat();
    scene.add(cat.group);
    unsub = dna.subscribe((d) => cat?.update(d)); // fire immédiat = update initial

    // Charge un vrai modèle 3D animé (CC0) par défaut, au lieu de la géométrie.
    new GLTFLoader().load(
      '/models/animal.glb',
      (g) => placeModel(g.scene, g.animations),
      undefined,
      (e) => console.warn('modèle par défaut indisponible', e),
    );

    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const clock = new THREE.Clock();
    const loop = () => {
      const dt = clock.getDelta();
      mixer?.update(dt);
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    ro?.disconnect();
    unsub?.();
    cat?.dispose();
    controls?.dispose();
    pmrem?.dispose();
    renderer?.dispose();
  });
</script>

<div class="creator">
  <div
    class="viewport"
    bind:this={host}
    ondragover={(e) => e.preventDefault()}
    ondrop={onDrop}
    role="presentation"
  >
    <canvas bind:this={canvas}></canvas>
    <div class="title">
      <h1>Crée ton chat</h1>
      <p>Glisse pour tourner autour · dépose un <b>.glb</b> pour ton vrai chat</p>
    </div>
    {#if importing}
      <div class="loading">⏳ Chargement du modèle…</div>
    {/if}
  </div>

  <aside class="panel">
    <label class="name">
      Nom
      <input type="text" bind:value={name} maxlength="16" placeholder="Ex : Pixel, Mochi…" />
    </label>

    <div class="section">Mon vrai chat (réaliste)</div>
    <input
      type="file"
      accept=".glb,.gltf,model/gltf-binary"
      bind:this={fileInput}
      onchange={onImport}
      style="display:none"
    />
    <div class="btns" style="margin-top:0">
      <button class="ghost" style="flex:1" onclick={() => fileInput.click()}
        >📁 Importer un modèle</button
      >
      <button class="ghost" onclick={useDefaultCat} title="Revenir au chat stylisé">↩︎</button>
    </div>
    {#if importErr}<span class="err">{importErr}</span>{/if}
    <p class="hint3d">
      Génère le <b>.glb</b> de ton chat depuis sa photo (Meshy / Tripo), importe-le : il s'affiche en
      3D texturé et, s'il est animé, l'animation se joue.
    </p>

    <div class="section">Robe</div>
    <div class="presets">
      {#each FUR_PRESETS as p (p.name)}
        <button
          class="preset"
          style="--c:{p.furB}"
          class:active={$dna.furB === p.furB}
          onclick={() => applyFurPreset(p)}>{p.name}</button
        >
      {/each}
    </div>

    <div class="section">Couleurs</div>
    <div class="colors">
      <label
        ><input
          type="color"
          value={$dna.furB}
          oninput={(e) => setDNA('furB', (e.target as HTMLInputElement).value)}
        /> Pelage</label
      >
      <label
        ><input
          type="color"
          value={$dna.eye}
          oninput={(e) => setDNA('eye', (e.target as HTMLInputElement).value)}
        /> Yeux</label
      >
      <label
        ><input
          type="color"
          value={$dna.accent}
          oninput={(e) => setDNA('accent', (e.target as HTMLInputElement).value)}
        /> Truffe</label
      >
    </div>

    <div class="section">Morphologie</div>
    <label class="slider"
      >Corpulence <b>{$dna.bodySize.toFixed(2)}</b>
      <input
        type="range"
        min="0.75"
        max="1.35"
        step="0.01"
        value={$dna.bodySize}
        oninput={(e) => setDNA('bodySize', +(e.target as HTMLInputElement).value)}
      /></label
    >
    <label class="slider"
      >Oreilles <b>{$dna.earSize.toFixed(2)}</b>
      <input
        type="range"
        min="0.6"
        max="1.4"
        step="0.01"
        value={$dna.earSize}
        oninput={(e) => setDNA('earSize', +(e.target as HTMLInputElement).value)}
      /></label
    >
    <label class="slider"
      >Truffe <b>{$dna.noseSize.toFixed(2)}</b>
      <input
        type="range"
        min="0.6"
        max="1.6"
        step="0.01"
        value={$dna.noseSize}
        oninput={(e) => setDNA('noseSize', +(e.target as HTMLInputElement).value)}
      /></label
    >
    <label class="slider"
      >Rondeur <b>{$dna.roundness.toFixed(2)}</b>
      <input
        type="range"
        min="-1"
        max="1"
        step="0.01"
        value={$dna.roundness}
        oninput={(e) => setDNA('roundness', +(e.target as HTMLInputElement).value)}
      /></label
    >

    <div class="section">Accessoires</div>
    <label class="row"
      >Chapeau
      <select
        value={$dna.hat}
        onchange={(e) => setDNA('hat', (e.target as HTMLSelectElement).value as HatKind)}
      >
        <option value="none">Aucun</option>
        <option value="tophat">Haut-de-forme</option>
        <option value="cap">Casquette</option>
        <option value="crown">Couronne</option>
        <option value="party">Fête</option>
      </select>
    </label>
    <label class="check"
      ><input
        type="checkbox"
        checked={$dna.collar}
        onchange={(e) => setDNA('collar', (e.target as HTMLInputElement).checked)}
      /> Collier</label
    >
    <label class="check"
      ><input
        type="checkbox"
        checked={$dna.glasses}
        onchange={(e) => setDNA('glasses', (e.target as HTMLInputElement).checked)}
      /> Lunettes</label
    >

    <div class="btns">
      <button class="ghost" onclick={randomizeDNA}>🎲</button>
      <button class="adopt" onclick={() => finishCreation(name)}>Adopter →</button>
    </div>
  </aside>
</div>

<style>
  .creator {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .viewport {
    flex: 1;
    position: relative;
    min-width: 0;
    background: radial-gradient(60% 60% at 50% 35%, #3a2f5e, #1a1530 70%), #14101f;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .title {
    position: absolute;
    top: 22px;
    left: 28px;
    pointer-events: none;
  }
  .title h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 800;
  }
  .title p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 13px;
  }
  .panel {
    width: 300px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 11px;
    background: rgba(15, 12, 30, 0.7);
    border-left: 1px solid var(--stroke);
    backdrop-filter: blur(14px);
    overflow-y: auto;
  }
  .name {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 600;
  }
  .name input {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-size: 15px;
  }
  .section {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--brand-2);
    margin-top: 6px;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .preset {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px 6px 8px;
    border-radius: 999px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-size: 12px;
  }
  .preset::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--c);
  }
  .preset.active {
    border-color: var(--brand);
    box-shadow: 0 0 0 1px var(--brand);
  }
  .colors {
    display: flex;
    gap: 8px;
  }
  .colors label {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--muted);
  }
  input[type='color'] {
    width: 100%;
    height: 30px;
    padding: 1px;
    border: 1px solid var(--stroke);
    border-radius: 8px;
    background: transparent;
  }
  .slider {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--muted);
  }
  .slider b {
    float: right;
    color: var(--text);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--brand);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    color: var(--muted);
  }
  select {
    padding: 7px 10px;
    border-radius: 9px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--stroke);
    color: var(--text);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text);
  }
  .check input {
    width: 16px;
    height: 16px;
    accent-color: var(--brand);
  }
  .btns {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  .ghost {
    width: 46px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    font-size: 18px;
  }
  .adopt {
    flex: 1;
    padding: 13px;
    border-radius: 12px;
    border: none;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
    box-shadow: 0 8px 24px rgba(123, 92, 255, 0.45);
  }
  .err {
    color: #ff8a8a;
    font-size: 12px;
  }
  .hint3d {
    margin: 4px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 12px 20px;
    border-radius: 12px;
    background: rgba(15, 12, 30, 0.85);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-weight: 600;
    z-index: 5;
  }
</style>
