// Galerie de chats de base (modèles glTF réels, CC-BY — voir public/models/CREDITS.md).
export interface CatEntry {
  slug: string;
  name: string;
  author: string;
  url: string;
}

export const CAT_CATALOG: CatEntry[] = [
  { slug: 'dingus', name: 'Dingus', author: 'alwayshasbean', url: '/models/dingus.glb' },
  { slug: 'tabby', name: 'Tigré', author: 'madtrollstudio', url: '/models/tabby.glb' },
  { slug: 'mini', name: 'Mini', author: 'MiniPoly', url: '/models/mini.glb' },
  { slug: 'google', name: 'Classic', author: 'Poly by Google', url: '/models/google.glb' },
  { slug: 'creative', name: 'Créatif', author: 'Darwin Yamamoto', url: '/models/creative.glb' },
];
