<script lang="ts">
  import { onMount } from 'svelte';
  import Home from './ui/screens/Home.svelte';
  import Creator from './ui/screens/Creator.svelte';
  import GameScene from './ui/GameScene.svelte';
  import { screen, startApp } from './state/app';
  import { startDnaEngine } from './customization/dna';

  onMount(() => {
    void startDnaEngine();
    void startApp();
  });
</script>

<main>
  {#if $screen === 'create'}
    <Creator />
  {:else if $screen === 'game'}
    <GameScene />
  {:else}
    <Home />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
