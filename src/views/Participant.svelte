<script>
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import Wish from './Wish.svelte';
  import Reveal from './Reveal.svelte';

  let { id, stage } = $props();

  let me = $state(null);
  let error = $state('');
  let notFound = $state(false);

  async function load() {
    error = '';
    try {
      me = await api.me(id);
    } catch (err) {
      if (err.status === 404) notFound = true;
      else error = err.message;
    }
  }

  onMount(load);
</script>

{#if me}
  {#if stage === 1}
    <Wish {id} {me} onupdate={(next) => (me = next)} />
  {:else}
    <Reveal {id} {me} onupdate={(next) => (me = next)} />
  {/if}
{:else if notFound}
  <div class="airmail rise">
    <section class="paper">
      <p class="kicker">Adresatas nerastas</p>
      <h1 class="title">Ši nuoroda nebegalioja</h1>
      <p class="lead">Paprašyk organizatoriaus, kad atsiųstų tau naują nuorodą.</p>
    </section>
  </div>
{:else if error}
  <div class="airmail rise">
    <section class="paper">
      <p class="kicker">Paštas vėluoja</p>
      <h1 class="title">Nepavyko atidaryti</h1>
      <p class="notice">{error}</p>
      <button class="btn" onclick={load}>Bandyti dar kartą</button>
    </section>
  </div>
{:else}
  <p class="loading" role="status">Ieškome tavo laiško…</p>
{/if}

<style>
  .paper {
    display: grid;
    gap: 1rem;
  }

  .loading {
    padding: 4rem 0;
    color: var(--gold-soft);
    font-family: var(--hand);
    font-size: 1.7rem;
    text-align: center;
  }
</style>
