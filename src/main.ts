import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { registerServiceWorker } from '$lib/pwa';

const target = document.getElementById('app');
if (!target) throw new Error('Élément #app introuvable.');

const app = mount(App, { target });

registerServiceWorker();

export default app;
