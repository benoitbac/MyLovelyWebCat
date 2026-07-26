<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { CatShow } from '../../creator/catshow';
  import { CAT_CATALOG } from '../../creator/catalog';
  import { catConfig, getImportedGlb } from '../../state/cat';
  import { ready } from '../../game/wasm';
  import { Life } from '../../wasm/miaou_engine';
  import { profile, go, addCoins } from '../../state/app';
  import { earnFromCare, SHOP, buy, type CareKind } from '../../state/economy';
  import { kvGet, kvSet } from '../../state/db';

  let host!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;

  // HUD réactif
  let hunger = $state(72);
  let energy = $state(80);
  let joy = $state(68);
  let hygiene = $state(75);

  // Économie : toasts de gain, boutique, dividende « ronron »
  let toasts = $state<{ id: number; text: string; big: boolean }[]>([]);
  let shopOpen = $state(false);
  let purrAcc = 0;
  let toastId = 0;

  function toast(text: string, big = false) {
    const id = ++toastId;
    toasts = [...toasts, { id, text, big }];
    setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), 1400);
  }

  function doCare(kind: CareKind, fn: () => void) {
    fn();
    const r = earnFromCare(kind, { hunger, energy, joy, hygiene });
    toast(`+${r.coins} 🪙${r.streak >= 3 ? ` ·×${r.streak}` : ''}`);
    if (r.daily) setTimeout(() => toast('Bonus du jour +25 🪙 ✨', true), 220);
  }

  function buyItem(item: (typeof SHOP)[number]) {
    if (!life) return;
    if (buy(item, life)) {
      toast(`${item.icon} ${item.name}`);
      shopOpen = false;
    } else {
      toast('Pas assez de 🪙');
    }
  }

  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let pmrem: THREE.PMREMGenerator;
  let show: CatShow;
  let life: Life | null = null;
  let sun: THREE.DirectionalLight;
  let hemi: THREE.HemisphereLight;
  let raf = 0;
  let ro: ResizeObserver;
  let disposed = false; // le composant peut être détruit pendant un await du montage

  // Déplacement + caméra
  const catPos = new THREE.Vector3(0, 0, 0);
  const target = new THREE.Vector3(0, 0, 0);
  let facing = 0;
  let bob = 0;
  let camYaw = 0.4;
  let camPitch = 0.5;
  let camDist = 9;
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  let dragging = false;
  let moved = 0;
  let lastPx = 0;
  let lastPy = 0;
  let saveAcc = 0;

  function tree(x: number, z: number, s: number): THREE.Group {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * s, 0.24 * s, 1.2 * s, 8),
      new THREE.MeshStandardMaterial({ color: '#7a5638', roughness: 0.9 }),
    );
    trunk.position.y = 0.6 * s;
    trunk.castShadow = true;
    g.add(trunk);
    const foliage = new THREE.MeshStandardMaterial({ color: '#4caf6a', roughness: 0.8 });
    for (const [dy, r] of [
      [1.4, 0.9],
      [2.0, 0.7],
      [2.5, 0.5],
    ] as const) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r * s, 1.0 * s, 10), foliage);
      c.position.y = dy * s;
      c.castShadow = true;
      g.add(c);
    }
    g.position.set(x, 0, z);
    return g;
  }

  function groundPoint(e: PointerEvent): THREE.Vector3 | null {
    const r = host.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, p) ? p : null;
  }

  function onDown(e: PointerEvent) {
    dragging = true;
    moved = 0;
    lastPx = e.clientX;
    lastPy = e.clientY;
  }
  function onMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - lastPx;
    const dy = e.clientY - lastPy;
    lastPx = e.clientX;
    lastPy = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    camYaw -= dx * 0.006;
    camPitch = Math.max(0.18, Math.min(1.3, camPitch - dy * 0.005));
  }
  function onUp(e: PointerEvent) {
    dragging = false;
    if (moved < 6) {
      const p = groundPoint(e);
      if (p) {
        target.copy(p);
        target.y = 0;
      }
    }
  }
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    camDist = Math.max(4, Math.min(20, camDist + Math.sign(e.deltaY) * 0.8));
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  async function loadCat() {
    const cfg = $catConfig;
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
      console.error(e);
      await show.loadUrl(CAT_CATALOG[0].url);
      show.applyLook(cfg);
    }
  }

  function skyColors(clock: number) {
    // 0=aube .. 0.25=midi .. 0.5=crépuscule .. 0.75=nuit
    const el = Math.sin(clock * Math.PI * 2 - Math.PI / 2); // -1..1..-1
    const day = Math.max(0, el);
    const warm = Math.max(0, 1 - Math.min(Math.abs(clock - 0.03), Math.abs(clock - 0.5)) / 0.08);
    const skyDay = new THREE.Color('#9ecbff');
    const skyNight = new THREE.Color('#0c1030');
    const sky = skyNight.clone().lerp(skyDay, day);
    sky.lerp(new THREE.Color('#ff9e5a'), warm * 0.5);
    return { sky, day, el };
  }

  onMount(async () => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#9ecbff', 30, 90);
    pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 6, 10);

    hemi = new THREE.HemisphereLight('#bfe0ff', '#4a6a3a', 0.6);
    scene.add(hemi);
    sun = new THREE.DirectionalLight('#fff2d6', 2.2);
    sun.position.set(10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(sun.target);

    // Sol herbe
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(120, 64),
      new THREE.MeshStandardMaterial({ color: '#5fa864', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Chemin / clairière
    const glade = new THREE.Mesh(
      new THREE.CircleGeometry(6, 48),
      new THREE.MeshStandardMaterial({ color: '#7fb872', roughness: 1 }),
    );
    glade.rotation.x = -Math.PI / 2;
    glade.position.y = 0.01;
    glade.receiveShadow = true;
    scene.add(glade);

    // Arbres + rochers (dispersés hors de la clairière)
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = 10 + Math.random() * 40;
      scene.add(tree(Math.cos(a) * rad, Math.sin(a) * rad, 0.8 + Math.random() * 0.9));
    }
    const rockMat = new THREE.MeshStandardMaterial({ color: '#8a8a95', roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = 7 + Math.random() * 30;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random()), rockMat);
      rock.position.set(Math.cos(a) * rad, 0.2, Math.sin(a) * rad);
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }

    // Le chat
    show = new CatShow();
    scene.add(show.group);
    await ready();
    if (disposed) return;
    life = new Life((Math.floor(Math.random() * 4294967295) + 1) >>> 0);
    const saved = await kvGet<{ hunger: number; energy: number; joy: number; hygiene: number }>(
      'life',
    );
    if (disposed) return; // détruit pendant l'await : ne pas toucher un life peut-être libéré
    if (saved) life.load(saved.hunger, saved.energy, saved.joy, saved.hygiene, 0);
    await loadCat();
    if (disposed) return;

    ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const clock = new THREE.Clock();
    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);

      // Sim de vie (besoins + horloge jour/nuit)
      if (life) {
        life.update(dt);
        hunger = life.hunger;
        energy = life.energy;
        joy = life.joy;
        hygiene = life.hygiene;

        // Dividende « ronron » : un chat comblé rapporte un peu, tout seul.
        if (hunger > 70 && energy > 70 && joy > 70 && hygiene > 70) {
          purrAcc += dt;
          if (purrAcc >= 15) {
            purrAcc = 0;
            addCoins(1);
            toast('ronron +1 🪙');
          }
        } else {
          purrAcc = 0;
        }

        const { sky, day, el } = skyColors(life.clock);
        scene.background = sky;
        if (scene.fog) (scene.fog as THREE.Fog).color.copy(sky);
        sun.intensity = 0.15 + day * 2.4;
        hemi.intensity = 0.25 + day * 0.5;
        sun.position.set(Math.cos(life.clock * Math.PI * 2) * 20, 4 + el * 20, 12);
        saveAcc += dt;
        if (saveAcc > 5) {
          saveAcc = 0;
          void kvSet('life', { hunger, energy, joy, hygiene });
        }
      }

      // Déplacement du chat vers la cible
      const to = target.clone().sub(catPos);
      to.y = 0;
      const d = to.length();
      if (d > 0.06) {
        to.normalize();
        catPos.addScaledVector(to, Math.min(4 * dt, d));
        facing = Math.atan2(to.x, to.z);
        bob += dt * 11;
        show.group.position.y = Math.abs(Math.sin(bob)) * 0.12;
      } else {
        show.group.position.y = 0;
      }
      show.group.position.x = catPos.x;
      show.group.position.z = catPos.z;
      show.group.rotation.y += (facing - show.group.rotation.y) * Math.min(1, dt * 10);
      show.update(dt);
      sun.target.position.copy(catPos);

      // Caméra 3e personne (orbite autour du chat)
      const off = new THREE.Vector3(
        Math.sin(camYaw) * Math.cos(camPitch),
        Math.sin(camPitch),
        Math.cos(camYaw) * Math.cos(camPitch),
      ).multiplyScalar(camDist);
      const desired = catPos.clone().add(off);
      camera.position.lerp(desired, 1 - Math.exp(-dt * 8));
      camera.lookAt(catPos.x, catPos.y + 1.1, catPos.z);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });

  onDestroy(() => {
    disposed = true;
    cancelAnimationFrame(raf);
    ro?.disconnect();
    if (life) void kvSet('life', { hunger, energy, joy, hygiene });
    show?.dispose();
    pmrem?.dispose();
    renderer?.dispose();
    life?.free();
  });

  const needs = $derived([
    { icon: '🍖', v: hunger },
    { icon: '⚡', v: energy },
    { icon: '💜', v: joy },
    { icon: '🛁', v: hygiene },
  ]);
  const actions: { icon: string; label: string; kind: CareKind; fn: () => void }[] = [
    { icon: '🍽️', label: 'Nourrir', kind: 'feed', fn: () => life?.feed() },
    { icon: '🫶', label: 'Câliner', kind: 'cuddle', fn: () => life?.cuddle() },
    { icon: '🧶', label: 'Jouer', kind: 'toy', fn: () => life?.toy() },
    { icon: '🛁', label: 'Laver', kind: 'clean', fn: () => life?.clean() },
  ];
</script>

<div
  class="world"
  bind:this={host}
  onpointerdown={onDown}
  onpointermove={onMove}
  onpointerup={onUp}
  onwheel={onWheel}
  role="presentation"
>
  <canvas bind:this={canvas}></canvas>

  <header class="topbar">
    <div class="who"><b>{$catConfig.name || $profile.name}</b></div>
    <div class="coins">🪙 {$profile.coins.toLocaleString('fr-FR')}</div>
  </header>

  <div class="needs">
    {#each needs as n, i (i)}
      <div class="need" class:low={n.v < 25}>
        <span>{n.icon}</span>
        <div class="track"><i style="width:{n.v}%"></i></div>
      </div>
    {/each}
  </div>

  <div class="hint">Clique sur le sol pour te déplacer · glisse pour tourner la caméra</div>

  <nav class="dock">
    {#each actions as a (a.label)}
      <button class="act" onclick={() => doCare(a.kind, a.fn)}><span>{a.icon}</span>{a.label}</button>
    {/each}
    <button class="act shop" onclick={() => (shopOpen = true)} title="Boutique">
      <span>🛒</span>Boutique
    </button>
    <button class="play" onclick={() => go('game')}>🎮 Jouer</button>
    <button class="ghost" onclick={() => go('create')} title="Créateur">🎨</button>
  </nav>

  <div class="toasts">
    {#each toasts as t (t.id)}
      <div class="toast" class:big={t.big}>{t.text}</div>
    {/each}
  </div>

  {#if shopOpen}
    <div class="shop-back" role="presentation" onpointerdown={() => (shopOpen = false)}>
      <div
        class="shop"
        role="dialog"
        aria-label="Boutique"
        tabindex="-1"
        onpointerdown={(e) => e.stopPropagation()}
      >
        <header class="shop-top">
          <h2>🛒 Boutique</h2>
          <div class="bal">🪙 {$profile.coins.toLocaleString('fr-FR')}</div>
          <button class="x" onclick={() => (shopOpen = false)} aria-label="Fermer">✕</button>
        </header>
        <p class="shop-sub">Des gâteries qui comblent plusieurs besoins d'un coup.</p>
        <div class="items">
          {#each SHOP as item (item.id)}
            <button
              class="item"
              class:off={$profile.coins < item.cost}
              onclick={() => buyItem(item)}
            >
              <span class="ic">{item.icon}</span>
              <span class="body">
                <b>{item.name}</b>
                <small>{item.desc}</small>
              </span>
              <span class="price">🪙 {item.cost}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .world {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
  }
  .world:active {
    cursor: grabbing;
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .topbar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 14px 18px;
    z-index: 5;
    pointer-events: none;
  }
  .who {
    font-size: 18px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  }
  .coins {
    font-weight: 700;
    color: var(--gold);
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--stroke);
    padding: 6px 12px;
    border-radius: 999px;
    pointer-events: auto;
  }
  .needs {
    position: absolute;
    top: 56px;
    left: 18px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 160px;
    padding: 10px;
    background: rgba(10, 8, 22, 0.5);
    border: 1px solid var(--stroke);
    border-radius: 12px;
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .need {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .track {
    flex: 1;
    height: 7px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.15);
    overflow: hidden;
  }
  .track > i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--brand), var(--brand-2));
  }
  .need.low .track > i {
    background: linear-gradient(90deg, #ff6b6b, #ff9ecf);
  }
  .hint {
    position: absolute;
    bottom: 78px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: #fff;
    opacity: 0.75;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
    z-index: 5;
    pointer-events: none;
    white-space: nowrap;
  }
  .dock {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    align-items: center;
    z-index: 5;
    padding: 8px;
    background: rgba(10, 8, 22, 0.6);
    border: 1px solid var(--stroke);
    border-radius: 16px;
    backdrop-filter: blur(12px);
  }
  .act {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 58px;
    padding: 7px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    font-size: 10.5px;
  }
  .act span {
    font-size: 18px;
  }
  .act:hover {
    background: color-mix(in srgb, var(--brand) 25%, var(--surface-2));
  }
  .play {
    padding: 12px 18px;
    border-radius: 12px;
    border: none;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
  }
  .ghost {
    padding: 11px;
    border-radius: 10px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    font-size: 16px;
  }
  .shop {
    color: var(--gold);
  }

  /* Toasts de gain */
  .toasts {
    position: absolute;
    top: 96px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }
  .toast {
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 800;
    font-size: 15px;
    color: var(--gold);
    background: rgba(10, 8, 22, 0.7);
    border: 1px solid var(--stroke);
    backdrop-filter: blur(8px);
    animation: rise 1.4s ease-out forwards;
  }
  .toast.big {
    color: #fff;
    background: linear-gradient(135deg, var(--brand), #4636b8);
    border-color: transparent;
    font-size: 16px;
  }
  @keyframes rise {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.9);
    }
    18% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-14px);
    }
  }

  /* Boutique */
  .shop-back {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(4, 3, 10, 0.55);
    backdrop-filter: blur(4px);
  }
  .shop {
    width: min(440px, 92%);
    max-height: 82%;
    overflow-y: auto;
    padding: 18px;
    border-radius: 18px;
    background: var(--surface);
    border: 1px solid var(--stroke);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    color: var(--text);
  }
  .shop-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .shop-top h2 {
    margin: 0;
    font-size: 20px;
    flex: 1;
  }
  .bal {
    font-weight: 800;
    color: var(--gold);
  }
  .x {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    cursor: pointer;
  }
  .shop-sub {
    margin: 6px 0 14px;
    font-size: 13px;
    color: var(--muted);
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 14px;
    background: var(--surface-2);
    border: 1px solid var(--stroke);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    transition:
      transform 0.08s ease,
      border-color 0.2s ease;
  }
  .item:hover {
    border-color: color-mix(in srgb, var(--brand) 55%, var(--stroke));
  }
  .item:active {
    transform: scale(0.98);
  }
  .item.off {
    opacity: 0.5;
  }
  .item .ic {
    font-size: 28px;
  }
  .item .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .item .body small {
    color: var(--muted);
    font-size: 12px;
  }
  .item .price {
    font-weight: 800;
    color: var(--gold);
    white-space: nowrap;
  }
</style>
