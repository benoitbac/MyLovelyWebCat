// Initialisation WebGPU robuste : adaptateur, device, configuration du canvas.
// Renvoie tout ce dont le moteur a besoin, ou lève une erreur explicite.

export async function initWebGPU(canvas) {
  if (!('gpu' in navigator)) {
    throw new Error("WebGPU n'est pas supporté par ce navigateur. Essaie Chrome/Edge 113+ ou Firefox récent.");
  }

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) {
    throw new Error("Aucun adaptateur GPU disponible (accélération matérielle désactivée ?).");
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();

  // 'opaque' : indispensable pour pouvoir capturer le canvas (carte de partage).
  context.configure({ device, format, alphaMode: 'opaque' });

  return { adapter, device, context, format };
}
