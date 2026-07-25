<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
  import { CatShow } from '../../creator/catshow';
  import { CAT_CATALOG } from '../../creator/catalog';
  import {
    catConfig,
    setCat,
    setImportedGlb,
    getImportedGlb,
    type CatConfig,
  } from '../../state/cat';
  import type { HatKind } from '../../customization/dna';
  import { finishCreation } from '../../state/app';

  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let fileInput!: HTMLInputElement;
  let name = $state($catConfig.name);
  let importErr = $state<string | null>(null);
  let busy = $state(true);

  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  let pmrem: THREE.PMREMGenerator;
  let composer: EffectComposer;
  let show: CatShow;
  let raf = 0;
  let ro: ResizeObserver;
  let unsub: () => void;
  let currentBase = '';

  async function loadBase(cfg: CatConfig) {
    busy = true;
    importErr = null;
    try {
      if (cfg.base === 'imported') {
        const buf = await getImportedGlb();
        if (buf) await show.loadBuffer(buf);
        else await show.loadUrl(CAT_CATALOG[0].url);
      } else {
        await show.loadUrl(cfg.base);
      }
      show.applyLook(cfg);
    } catch (e) {
      importErr = 'Modèle illisible';
      console.error(e);
    }
    busy = false;
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function onFile(file: File) {
    importErr = null;
    busy = true;
    void file
      .arrayBuffer()
      .then(async (buf) => {
        await setImportedGlb(buf);
        currentBase = 'imported';
        await show.loadBuffer(buf);
        show.applyLook($catConfig);
        setCat('base', 'imported');
        busy = false;
      })
      .catch(() => {
        importErr = 'Lecture impossible';
        busy = false;
      });
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
    camera.position.set(0.6, 2.4, 6.6);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.25, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 10;
    controls.minPolarAngle = 0.6;
    controls.maxPolarAngle = 1.62;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    // Sol + anneau (showroom).
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 64),
      new THREE.MeshStandardMaterial({ color: '#1c1730', roughness: 0.85 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.45, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: '#15112a', roughness: 0.12, metalness: 0.85 }),
    );
    disc.position.y = 0.09;
    disc.receiveShadow = true;
    scene.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.05, 16, 90),
      new THREE.MeshStandardMaterial({
        color: '#7b5cff',
        roughness: 0.3,
        metalness: 0.4,
        emissive: '#7b5cff',
        emissiveIntensity: 2.2,
      }),
    );
    ring.position.y = 0.19;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Post-traitement : bloom (glow premium sur l'anneau / les reflets).
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 0.5, 0.5, 0.9),
    );
    composer.addPass(new OutputPass());

    show = new CatShow();
    show.group.position.y = 0.18;
    scene.add(show.group);

    currentBase = $catConfig.base;
    void loadBase($catConfig);

    // Le look s'applique en direct ; on ne recharge que si la base change.
    unsub = catConfig.subscribe((cfg) => {
      if (!show) return;
      if (cfg.base !== currentBase) {
        currentBase = cfg.base;
        void loadBase(cfg);
      } else {
        show.applyLook(cfg);
      }
    });

    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const clock = new THREE.Clock();
    const loop = () => {
      show?.update(clock.getDelta());
      controls.update();
      composer.render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    ro?.disconnect();
    unsub?.();
    show?.dispose();
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
    ondrop={(e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) onFile(f);
    }}
    role="presentation"
  >
    <canvas bind:this={canvas}></canvas>
    <div class="title">
      <h1>Crée ton chat</h1>
      <p>Glisse pour tourner autour · dépose un <b>.glb</b> pour importer le tien</p>
    </div>
    {#if busy}<div class="loading">⏳ Chargement…</div>{/if}
  </div>

  <aside class="panel">
    <div class="section">Galerie</div>
    <div class="gallery">
      {#each CAT_CATALOG as c (c.slug)}
        <button
          class="cat-card"
          class:active={$catConfig.base === c.url}
          onclick={() => setCat('base', c.url)}
        >
          🐱<span>{c.name}</span>
        </button>
      {/each}
      <button class="cat-card import" onclick={() => fileInput.click()}
        >📁<span>Le mien</span></button
      >
    </div>
    <input
      type="file"
      accept=".glb,.gltf,model/gltf-binary"
      bind:this={fileInput}
      onchange={(e) => {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (f) onFile(f);
      }}
      style="display:none"
    />
    {#if importErr}<span class="err">{importErr}</span>{/if}

    <label class="name">
      Nom
      <input type="text" bind:value={name} maxlength="16" placeholder="Ex : Pixel, Mochi…" />
    </label>

    <div class="section">Teinte</div>
    <div class="tintrow">
      <input
        type="color"
        value={$catConfig.tint}
        oninput={(e) => setCat('tint', (e.target as HTMLInputElement).value)}
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={$catConfig.tintAmount}
        oninput={(e) => setCat('tintAmount', +(e.target as HTMLInputElement).value)}
      />
    </div>

    <div class="section">Corpulence</div>
    <label class="slider"
      ><b>{$catConfig.scale.toFixed(2)}</b>
      <input
        type="range"
        min="0.7"
        max="1.4"
        step="0.01"
        value={$catConfig.scale}
        oninput={(e) => setCat('scale', +(e.target as HTMLInputElement).value)}
      /></label
    >

    <div class="section">Accessoires</div>
    <label class="row"
      >Chapeau
      <select
        value={$catConfig.hat}
        onchange={(e) => setCat('hat', (e.target as HTMLSelectElement).value as HatKind)}
      >
        <option value="none">Aucun</option>
        <option value="tophat">Haut-de-forme</option>
        <option value="cap">Casquette</option>
        <option value="crown">Couronne</option>
        <option value="party">Fête</option>
      </select>
    </label>
    <div class="acc-color">
      Couleur accessoires
      <input
        type="color"
        value={$catConfig.accent}
        oninput={(e) => setCat('accent', (e.target as HTMLInputElement).value)}
      />
    </div>

    <button
      class="adopt"
      onclick={() => {
        setCat('name', name);
        finishCreation(name);
      }}>Adopter →</button
    >
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
    background: radial-gradient(60% 60% at 50% 38%, #3a2f5e, #17122b 72%), #100c1c;
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
  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 12px 20px;
    border-radius: 12px;
    background: rgba(15, 12, 30, 0.85);
    border: 1px solid var(--stroke);
    font-weight: 600;
  }
  .panel {
    width: 310px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 11px;
    background: rgba(15, 12, 30, 0.72);
    border-left: 1px solid var(--stroke);
    backdrop-filter: blur(16px);
    overflow-y: auto;
  }
  .section {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--brand-2);
    margin-top: 4px;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .cat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 4px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-size: 11px;
    font-weight: 600;
  }
  .cat-card span {
    opacity: 0.85;
  }
  .cat-card:hover {
    background: color-mix(in srgb, var(--brand) 22%, var(--surface-2));
  }
  .cat-card.active {
    border-color: var(--brand);
    box-shadow: 0 0 0 1px var(--brand);
  }
  .cat-card.import {
    background: color-mix(in srgb, var(--brand) 18%, var(--surface-2));
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
  .tintrow {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .tintrow input[type='range'] {
    flex: 1;
  }
  input[type='color'] {
    width: 42px;
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
    align-self: flex-end;
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
  .acc-color {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--muted);
  }
  .err {
    color: #ff8a8a;
    font-size: 12px;
  }
  .adopt {
    margin-top: 10px;
    padding: 14px;
    border-radius: 12px;
    border: none;
    font-weight: 800;
    font-size: 15px;
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
    box-shadow: 0 8px 24px rgba(123, 92, 255, 0.45);
  }
</style>
