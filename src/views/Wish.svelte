<script>
  import { Stamp } from '@lucide/svelte';
  import { api } from '../lib/api.js';
  import Seal from '../lib/Seal.svelte';
  import Postmark from '../lib/Postmark.svelte';

  let { id, me, onupdate } = $props();

  const MAX = 500;
  let text = $state('');
  let confirming = $state(false);
  let saving = $state(false);
  let justSealed = $state(false);
  let error = $state('');

  const sealed = $derived(Boolean(me.wish));

  function grow(e) {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function askConfirm() {
    error = '';
    if (!text.trim()) {
      error = 'Pirmiausia parašyk savo norą!';
      return;
    }
    confirming = true;
  }

  async function send() {
    saving = true;
    error = '';
    try {
      const next = await api.saveWish(id, text.trim());
      justSealed = true;
      onupdate(next);
    } catch (err) {
      error = err.message;
      // laiškas jau buvo išsiųstas iš kito įrenginio – parodome išsaugotą
      if (err.status === 409) onupdate(await api.me(id));
    } finally {
      saving = false;
      confirming = false;
    }
  }
</script>

<div class="airmail rise">
  <section class="paper">
    <div class="mark"><Postmark label={sealed ? 'Išsiųsta' : 'Kalėdos'} /></div>

    <p class="kicker rise" style="--i:1">1 etapas · Laiškas Kalėdų Seneliui</p>
    <h1 class="title rise" style="--i:2">Sveiki, {me.name}!</h1>

    {#if !sealed}
      <p class="lead rise" style="--i:3">
        Parašyk, ko labiausiai norėtum šioms Kalėdoms. Laišką perskaitys tavo slaptasis Kalėdų Senelis.
      </p>

      <div class="letter rise" style="--i:4">
        <label class="hand greeting" for="wish">Mielas Kalėdų Seneli,</label>
        <textarea
          id="wish"
          class="hand ruled"
          rows="4"
          maxlength={MAX}
          placeholder="šiemet labiausiai norėčiau…"
          bind:value={text}
          oninput={grow}
          disabled={saving}
        ></textarea>
        <p class="hand sign">— {me.name}</p>
        <p class="count" class:near={text.length > MAX - 50}>{text.length} / {MAX}</p>
      </div>

      {#if error}<p class="notice" role="alert">{error}</p>{/if}

      {#if confirming}
        <div class="confirm">
          <p><strong>Užantspaudavus laiško pakeisti nebegalėsi.</strong> Siunčiam?</p>
          <div class="confirm-actions">
            <button class="btn" onclick={send} disabled={saving}>
              {saving ? 'Siunčiama…' : 'Taip, siųsti'}
            </button>
            <button class="btn ghost" onclick={() => (confirming = false)} disabled={saving}>
              Dar pataisysiu
            </button>
          </div>
        </div>
      {:else}
        <button class="btn rise" style="--i:5" onclick={askConfirm}>
          <Stamp class="icon" /> Užantspauduoti laišką
        </button>
        <p class="fine rise" style="--i:6">
          Laišką galima išsiųsti tik vieną kartą. Vėliau gausi antrą nuorodą – joje sužinosi, kam dovanosi tu.
        </p>
      {/if}
    {:else}
      <div class="letter sent">
        <p class="hand greeting">Mielas Kalėdų Seneli,</p>
        <p class="hand ruled body">{me.wish}</p>
        <p class="hand sign">— {me.name}</p>
        <div class="stamp" class:thump={justSealed}><Seal size={76} /></div>
      </div>

      {#if error}<p class="notice" role="alert">{error}</p>{/if}

      <div class="done" role="status">
        <h2>Laiškas iškeliavo į Šiaurės ašigalį!</h2>
        <p>Dabar lauk antros nuorodos – joje sužinosi, kam šiemet dovanosi tu.</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .paper {
    display: grid;
    gap: 1rem;
  }

  .mark {
    position: absolute;
    top: 0.9rem;
    right: 0.7rem;
    pointer-events: none;
  }

  .kicker {
    max-width: calc(100% - 6.5rem);
    min-height: 2.2rem;
  }

  .title {
    max-width: calc(100% - 5rem);
  }

  .letter {
    position: relative;
    margin-top: 0.5rem;
    padding: 0.4rem 0 0;
  }

  .greeting {
    display: block;
    color: var(--berry-deep);
    font-weight: 700;
  }

  textarea,
  .body {
    display: block;
    width: 100%;
    min-height: calc(var(--line) * 4);
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background-color: transparent;
    color: var(--ink);
    resize: none;
    overflow: hidden;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  textarea::placeholder {
    color: rgba(43, 32, 26, 0.38);
  }

  textarea:focus-visible {
    outline: none;
    background-color: rgba(201, 162, 74, 0.1);
  }

  .sign {
    text-align: right;
    color: var(--ink-soft);
  }

  .count {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--ink-soft);
    text-align: right;
  }

  .count.near {
    color: var(--berry);
    font-weight: 700;
  }

  .fine {
    font-size: 0.9rem;
    color: var(--ink-soft);
    text-align: center;
  }

  .confirm {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
    border: 1.5px dashed var(--berry);
    border-radius: 8px;
    background: rgba(179, 38, 30, 0.06);
    animation: rise 0.35s ease both;
  }

  .confirm-actions {
    display: grid;
    gap: 0.6rem;
  }

  @media (min-width: 480px) {
    .confirm-actions {
      grid-template-columns: 1fr 1fr;
    }
  }

  .sent {
    padding-bottom: 1.5rem;
  }

  .sent .body {
    min-height: var(--line);
  }

  .stamp {
    position: absolute;
    left: 0.25rem;
    bottom: -0.6rem;
    transform: rotate(-9deg);
  }

  .stamp.thump {
    animation: thump 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) both;
  }

  @keyframes thump {
    from {
      opacity: 0;
      transform: rotate(14deg) scale(2.6);
    }
    60% {
      opacity: 1;
    }
    to {
      transform: rotate(-9deg) scale(1);
    }
  }

  .done {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.75rem;
    padding: 1rem 1.1rem;
    border-radius: 8px;
    background: var(--pine);
    color: #f3ead6;
  }

  .done h2 {
    font-size: 1.25rem;
    line-height: 1.2;
    color: var(--gold-soft);
  }
</style>
