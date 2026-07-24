// ============================================================================
//  engine.js — Le moteur de rendu WebGPU.
//  Orchestre 4 passes par frame :
//    1. compute  : simulation des particules (simulate.wgsl)
//    2. fade     : atténuation de la traînée précédente (fade.wgsl)
//    3. particles: dessin additif des particules par-dessus (particles.wgsl)
//    4. present  : composition finale vers l'écran (present.wgsl)
//  On ping-pong entre deux textures HDR (rgba16float) pour la traînée.
// ============================================================================

const SHADERS = ['simulate', 'particles', 'fade', 'present'];

async function loadShader(name) {
  const res = await fetch(`./src/shaders/${name}.wgsl`);
  if (!res.ok) throw new Error(`Shader introuvable : ${name}.wgsl`);
  return res.text();
}

// Blending additif : idéal pour accumuler la lumière (bloom néon).
const ADDITIVE = {
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
};

const TRAIL_FORMAT = 'rgba16float';

export class Engine {
  constructor(gpu, canvas) {
    this.device = gpu.device;
    this.context = gpu.context;
    this.format = gpu.format;
    this.canvas = canvas;
    this._flip = false;
    this.count = 0;
  }

  async init() {
    const dev = this.device;

    // Uniform buffer partagé (32 floats = 128 octets, voir buildUniforms).
    this.ubo = dev.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.sampler = dev.createSampler({
      magFilter: 'linear', minFilter: 'linear',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
    });

    const [sim, part, fade, present] = await Promise.all(SHADERS.map(loadShader));

    this.simPipeline = dev.createComputePipeline({
      layout: 'auto',
      compute: { module: dev.createShaderModule({ code: sim }), entryPoint: 'main' },
    });

    const partMod = dev.createShaderModule({ code: part });
    this.particlePipeline = dev.createRenderPipeline({
      layout: 'auto',
      vertex: { module: partMod, entryPoint: 'vs' },
      fragment: { module: partMod, entryPoint: 'fs', targets: [{ format: TRAIL_FORMAT, blend: ADDITIVE }] },
      primitive: { topology: 'triangle-list' },
    });

    const fadeMod = dev.createShaderModule({ code: fade });
    this.fadePipeline = dev.createRenderPipeline({
      layout: 'auto',
      vertex: { module: fadeMod, entryPoint: 'vs' },
      fragment: { module: fadeMod, entryPoint: 'fs', targets: [{ format: TRAIL_FORMAT }] },
      primitive: { topology: 'triangle-list' },
    });

    const presentMod = dev.createShaderModule({ code: present });
    this.presentPipeline = dev.createRenderPipeline({
      layout: 'auto',
      vertex: { module: presentMod, entryPoint: 'vs' },
      fragment: { module: presentMod, entryPoint: 'fs', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' },
    });
  }

  // (Re)crée les deux textures de traînée à la taille du canvas.
  resize(w, h) {
    const dev = this.device;
    this.trailA?.destroy?.();
    this.trailB?.destroy?.();
    const mk = () => dev.createTexture({
      size: [w, h],
      format: TRAIL_FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.trailA = mk();
    this.trailB = mk();
    this.viewA = this.trailA.createView();
    this.viewB = this.trailB.createView();
    this.width = w;
    this.height = h;
  }

  // Remplace le jeu de particules (appelé au boot et sur changement structurel).
  setParticles(data, count) {
    const dev = this.device;
    this.particleBuffer?.destroy?.();
    this.particleBuffer = dev.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    dev.queue.writeBuffer(this.particleBuffer, 0, data);
    this.count = count;

    this.simBG = dev.createBindGroup({
      layout: this.simPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.ubo } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
    this.particleBG = dev.createBindGroup({
      layout: this.particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.ubo } },
        { binding: 1, resource: { buffer: this.particleBuffer } },
      ],
    });
  }

  writeUniforms(arr) {
    this.device.queue.writeBuffer(this.ubo, 0, arr);
  }

  render() {
    if (!this.particleBuffer || !this.trailA) return;
    const dev = this.device;

    // Ping-pong : on lit "prev", on écrit "cur".
    const prevView = this._flip ? this.viewB : this.viewA;
    const curView = this._flip ? this.viewA : this.viewB;

    const enc = dev.createCommandEncoder();

    // 1. Simulation --------------------------------------------------------
    {
      const p = enc.beginComputePass();
      p.setPipeline(this.simPipeline);
      p.setBindGroup(0, this.simBG);
      p.dispatchWorkgroups(Math.ceil(this.count / 64));
      p.end();
    }

    // 2. Fade (prev → cur) -------------------------------------------------
    {
      const bg = dev.createBindGroup({
        layout: this.fadePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sampler },
          { binding: 1, resource: prevView },
          { binding: 2, resource: { buffer: this.ubo } },
        ],
      });
      const p = enc.beginRenderPass({
        colorAttachments: [{ view: curView, loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store' }],
      });
      p.setPipeline(this.fadePipeline);
      p.setBindGroup(0, bg);
      p.draw(3);
      p.end();
    }

    // 3. Particules (additif, par-dessus la traînée atténuée) --------------
    {
      const p = enc.beginRenderPass({
        colorAttachments: [{ view: curView, loadOp: 'load', storeOp: 'store' }],
      });
      p.setPipeline(this.particlePipeline);
      p.setBindGroup(0, this.particleBG);
      p.draw(6, this.count);
      p.end();
    }

    // 4. Composition finale → écran ---------------------------------------
    {
      const swap = this.context.getCurrentTexture().createView();
      const bg = dev.createBindGroup({
        layout: this.presentPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sampler },
          { binding: 1, resource: curView },
          { binding: 2, resource: { buffer: this.ubo } },
        ],
      });
      const p = enc.beginRenderPass({
        colorAttachments: [{ view: swap, loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 1 }, storeOp: 'store' }],
      });
      p.setPipeline(this.presentPipeline);
      p.setBindGroup(0, bg);
      p.draw(3);
      p.end();
    }

    dev.queue.submit([enc.finish()]);
    this._flip = !this._flip;
  }
}
