import { writable } from 'svelte/store';

/** Images par seconde, publiées par le renderer et affichées dans l'UI. */
export const fps = writable(0);
