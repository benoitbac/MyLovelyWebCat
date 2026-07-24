// Initialisation WebGPU : adaptateur, device, configuration du canvas.
// Lève une erreur lisible si WebGPU n'est pas disponible.

export interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<GpuContext> {
  if (!('gpu' in navigator)) {
    throw new Error("WebGPU n'est pas supporté par ce navigateur.");
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) {
    throw new Error('Aucun adaptateur GPU disponible.');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Contexte WebGPU indisponible sur ce canvas.');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  return { device, context, format };
}
