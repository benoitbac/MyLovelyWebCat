<script lang="ts">
  import { onMount } from 'svelte';
  import World from './ui/screens/World.svelte';
  import Creator from './ui/screens/Creator.svelte';
  import GameScene from './ui/GameScene.svelte';
  import { screen, startApp } from './state/app';
  import { startDnaEngine } from './customization/dna';
  import { startCatConfig } from './state/cat';

  onMount(() => {
    void startDnaEngine();
    void startCatConfig();
    void startApp();
  });
</script>

<main>
  {#if $screen === 'create'}
    <Creator />
  {:else if $screen === 'game'}
    <GameScene />
  {:else}
    <World />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
</style>
