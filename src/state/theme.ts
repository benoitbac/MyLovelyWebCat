import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const KEY = 'miaou-theme';

function initialTheme(): Theme {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const theme = writable<Theme>(initialTheme());

theme.subscribe((value) => {
  document.documentElement.dataset.theme = value;
  localStorage.setItem(KEY, value);
});

export function toggleTheme(): void {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}
