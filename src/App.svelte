<script>
  import Snow from './lib/Snow.svelte';
  import Admin from './views/Admin.svelte';
  import Participant from './views/Participant.svelte';

  // Dalyvio nuoroda: ?id=<kodas>&stage=1 (noras) arba &stage=2 (atskleidimas).
  // Be kodo atidaromas organizatoriaus skydelis.
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const stage = params.get('stage') === '1' ? 1 : 2;
</script>

<Snow />

<main class="shell" class:wide={!id}>
  <div class="masthead">Šiaurės ašigalio paštas</div>
  {#if id}
    <Participant {id} {stage} />
  {:else}
    <Admin />
  {/if}
</main>
