// Renderer WebGPU du Sprint 0 : boucle de rendu à 60/120 fps, gestion du
// redimensionnement (DPR plafonné) et publication du FPS. Volontairement
// simple — il fournit la charpente que le rendu du chat étendra au Sprint 1.

import { initWebGPU, type GpuContext } from './gpu';
import { AURORA_WGSL } from './shaders';
import { fps as fpsStore } from '../state/stats';

const MAX_DPR = 2;

export class Renderer {
  private readonly gpu: GpuContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly pipeline: GPURenderPipeline;
  private readonly ubo: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private readonly uni = new Float32Array(4);
  private readonly ro: ResizeObserver;

  private raf = 0;
  private startT = 0;
  private lastT = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;

  private constructor(canvas: HTMLCanvasElement, gpu: GpuContext) {
    this.canvas = canvas;
    this.gpu = gpu;

    const module = gpu.device.createShaderModule({ code: AURORA_WGSL });
    this.pipeline = gpu.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: gpu.format }] },
      primitive: { topology: 'triangle-list' },
    });

    this.ubo = gpu.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.bindGroup = gpu.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: this.ubo } }],
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();

    this.raf = requestAnimationFrame(this.frame);
  }

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    const gpu = await initWebGPU(canvas);
    return new Renderer(canvas, gpu);
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  private readonly frame = (tms: number): void => {
    const t = tms / 1000;
    if (!this.startT) this.startT = t;
    const dt = this.lastT ? t - this.lastT : 0.016;
    this.lastT = t;

    this.uni[0] = this.canvas.width;
    this.uni[1] = this.canvas.height;
    this.uni[2] = t - this.startT;
    this.uni[3] = 0;
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
    this.ubo.destroy();
  }
}
