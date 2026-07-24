// Renderer WebGPU du compagnon : boucle 60/120 fps, rendu SDF du chat,
// entrées pointeur (regard + caresse) et pilotage par la machine à humeurs.

import { get } from 'svelte/store';
import { initWebGPU, type GpuContext } from './gpu';
import { CAT_WGSL } from './cat';
import { fps as fpsStore } from '../state/stats';
import { MoodController } from '../companion/mood';
import { dna, hexToRGB, type DNA } from '../customization/dna';

const MAX_DPR = 2;
const ZOOM = 1.15; // doit rester synchronisé avec le shader (cat.ts)

export class Renderer {
  private readonly gpu: GpuContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly pipeline: GPURenderPipeline;
  private readonly ubo: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private readonly uni = new Float32Array(36);
  private readonly ro: ResizeObserver;
  private readonly mood = new MoodController();
  private readonly dnaUnsub: () => void;
  private dnaVal: DNA = get(dna);

  private raf = 0;
  private startT = 0;
  private lastT = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;

  private mouse = { x: 0, y: 0 };
  private prevMouse = { x: 0, y: 0 };
  private mouseActive = false;

  private constructor(canvas: HTMLCanvasElement, gpu: GpuContext) {
    this.canvas = canvas;
    this.gpu = gpu;

    const module = gpu.device.createShaderModule({ code: CAT_WGSL });
    this.pipeline = gpu.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: gpu.format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.ubo = gpu.device.createBuffer({
      size: this.uni.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.bindGroup = gpu.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.ubo } }],
    });

    this.dnaUnsub = dna.subscribe((d) => (this.dnaVal = d));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();

    this.raf = requestAnimationFrame(this.frame);
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const gpu = await initWebGPU(canvas);
    return new Renderer(canvas, gpu);
  }

  /** Positionne le regard à partir des coordonnées écran du pointeur. */
  setPointer(clientX: number, clientY: number, active: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const aspect = this.canvas.width / this.canvas.height;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.mouse = { x: ndcX * aspect * ZOOM, y: ndcY * ZOOM };
    this.mouseActive = active;
  }

  clearPointer(): void {
    this.mouseActive = false;
  }

  /** Caresse : passe le compagnon en humeur « heureux ». */
  pet(): void {
    this.mood.pet();
  }

  /** Réaction visuelle à une action du dock. */
  react(kind: 'pet' | 'feed' | 'play' | 'groom'): void {
    if (kind === 'play') this.mood.play();
    else this.mood.pet();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  private setColor(offset: number, rgb: [number, number, number]): void {
    this.uni[offset] = rgb[0];
    this.uni[offset + 1] = rgb[1];
    this.uni[offset + 2] = rgb[2];
    this.uni[offset + 3] = 1;
  }

  private readonly frame = (tms: number): void => {
    const t = tms / 1000;
    if (!this.startT) this.startT = t;
    const dt = this.lastT ? t - this.lastT : 0.016;
    this.lastT = t;

    const dx = this.mouse.x - this.prevMouse.x;
    const dy = this.mouse.y - this.prevMouse.y;
    const mouseSpeed = Math.hypot(dx, dy) / Math.max(dt, 1e-3);
    this.prevMouse = { ...this.mouse };

    const e = this.mood.update(dt, { mouseActive: this.mouseActive, mouseSpeed });

    this.uni[0] = this.canvas.width;
    this.uni[1] = this.canvas.height;
    this.uni[2] = this.mouse.x;
    this.uni[3] = this.mouse.y;
    this.uni[4] = t - this.startT;
    this.uni[5] = this.mouseActive ? 1 : 0;
    this.uni[6] = e.eyeOpen;
    this.uni[7] = e.mouthCurve;
    this.uni[8] = e.earPerk;
    this.uni[9] = e.blush;
    this.uni[10] = e.sleepy;
    this.uni[11] = 1; // amplitude de respiration
    const d = this.dnaVal;
    this.setColor(12, hexToRGB(d.furA));
    this.setColor(16, hexToRGB(d.furB));
    this.setColor(20, hexToRGB(d.belly));
    this.setColor(24, hexToRGB(d.eye));
    this.setColor(28, hexToRGB(d.accent));
    this.uni[32] = d.earSize; // morph.x
    this.uni[33] = d.roundness; // morph.y
    this.uni[34] = 0;
    this.uni[35] = 0;
    this.gpu.device.queue.writeBuffer(this.ubo, 0, this.uni);

    const enc = this.gpu.device.createCommandEncoder();
    const view = this.gpu.context.getCurrentTexture().createView();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        { view, loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 1 }, storeOp: 'store' },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
    this.gpu.device.queue.submit([enc.finish()]);

    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      fpsStore.set(Math.round(this.fpsFrames / this.fpsAcc));
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }

    this.raf = requestAnimationFrame(this.frame);
  };

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.dnaUnsub();
    this.ubo.destroy();
  }
}
