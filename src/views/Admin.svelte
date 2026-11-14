<script>
  import { onMount } from 'svelte';
  import { Check, Copy, Eye, EyeOff, LogOut, Plus, Shuffle, Trash2 } from '@lucide/svelte';
  import { api, copyText } from '../lib/api.js';

  const KEY = 'sks-admin';

  let password = $state('');
  let authed = $state(false);
  let busy = $state(false);
  let participants = $state([]);
  let newName = $state('');
  let showSecrets = $state(false);
  let copied = $state('');
  let error = $state('');
  let okMsg = $state('');

  const wishCount = $derived(participants.filter((p) => p.wish).length);
  const revealedCount = $derived(participants.filter((p) => p.revealed).length);

  const link = (id, stage) => `${location.origin}${location.pathname}?id=${id}&stage=${stage}`;

  function flash(msg) {
    okMsg = msg;
    setTimeout(() => {
      if (okMsg === msg) okMsg = '';
    }, 3500);
  }

  // Bendras apvalkalas visiems organizatoriaus veiksmams.
  async function run(action, success) {
    busy = true;
    error = '';
    try {
      participants = (await action()).participants;
      if (success) flash(success);
      return true;
    } catch (err) {
      if (err.status === 401) logout();
      error = err.message;
      return false;
    } finally {
      busy = false;
    }
  }

  async function login(e) {
    e?.preventDefault();
    if (await run(() => api.adminList(password))) {
      authed = true;
      sessionStorage.setItem(KEY, password);
    }
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    authed = false;
    password = '';
    participants = [];
    showSecrets = false;
  }

  async function add(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      error = 'Įveskite vardą!';
      return;
    }
    if (await run(() => api.adminAdd(password, name), `Pridėta: ${name}`)) newName = '';
  }

  function remove(p) {
    const warn = p.revealed || participants.some((x) => x.recipientName === p.name)
      ? '\n\nBurtai jau traukti – kas buvo ištraukęs šį dalyvį, turės atplėšti laišką iš naujo.'
      : '';
    if (confirm(`Pašalinti dalyvį „${p.name}“?${warn}`)) {
      run(() => api.adminRemove(password, p.id), `Pašalinta: ${p.name}`);
    }
  }

  function redraw() {
    if (confirm('Atšaukti burtus?\n\nDalyviai ir jų norai liks, bet visi turės atplėšti laiškus iš naujo ir gali ištraukti kitą žmogų.')) {
      run(() => api.adminRedraw(password), 'Burtai atšaukti.');
    }
  }

  function reset() {
    if (!confirm('Ar tikrai norite ištrinti VISUS dalyvius, norus ir burtų rezultatus?')) return;
    if (!confirm('Paskutinis įspėjimas: šio veiksmo atšaukti nebus galima. Tęsti?')) return;
    run(() => api.adminReset(password), 'Visi duomenys išvalyti.');
  }

  async function copy(key, text) {
    if (await copyText(text)) {
      copied = key;
      setTimeout(() => {
        if (copied === key) copied = '';
      }, 1800);
    } else {
      error = 'Nepavyko nukopijuoti – pažymėkite nuorodą ir nukopijuokite ranka.';
    }
  }

  onMount(() => {
    const saved = sessionStorage.getItem(KEY);
    if (saved) {
      password = saved;
      login();
    }
  });
</script>

{#if !authed}
  <div class="airmail rise login">
    <form class="paper" onsubmit={login}>
      <p class="kicker">Organizatoriaus langelis</p>
      <h1 class="title">Slaptasis Kalėdų Senelis</h1>
      <p class="lead">Dalyviai čia patenka per asmenines nuorodas. Šis langelis – tik organizatoriui.</p>

      <label class="field">
        <span>Slaptažodis</span>
        <input type="password" bind:value={password} autocomplete="current-password" required />
      </label>

      {#if error}<p class="notice" role="alert">{error}</p>{/if}
      <button class="btn" disabled={busy}>{busy ? 'Tikrinama…' : 'Prisijungti'}</button>
    </form>
  </div>
{:else}
  <div class="airmail rise">
    <section class="paper">
      <header class="head">
        <div>
          <p class="kicker">Organizatoriaus skydelis</p>
          <h1 class="title">Dalyvių sąrašas</h1>
        </div>
        <button class="btn ghost small" onclick={logout}><LogOut class="icon" /> Atsijungti</button>
      </header>

      <dl class="stats">
        <div><dt>Dalyviai</dt><dd>{participants.length}</dd></div>
        <div><dt>Norai parašyti</dt><dd>{wishCount}<small>/{participants.length}</small></dd></div>
        <div><dt>Laiškai atplėšti</dt><dd>{revealedCount}<small>/{participants.length}</small></dd></div>
      </dl>

      <form class="add" onsubmit={add}>
        <label class="field">
          <span>Pridėti dalyvį</span>
          <input type="text" bind:value={newName} placeholder="Vardas" maxlength="40" autocomplete="off" />
        </label>
        <button class="btn pine" disabled={busy}><Plus class="icon" /> Pridėti</button>
      </form>

      {#if error}<p class="notice" role="alert">{error}</p>{/if}
      {#if okMsg}<p class="notice ok" role="status">{okMsg}</p>{/if}

      {#if participants.length === 0}
        <p class="empty">Dalyvių dar nėra. Pridėkite pirmąjį – jam bus sukurtos dvi asmeninės nuorodos.</p>
      {:else}
        <div class="toolbar">
          <p class="how">
            Kiekvienam dalyviui išsiųskite <strong>1 etapo</strong> nuorodą (norui parašyti), o vėliau –
            <strong>2 etapo</strong> (sužinoti, kam dovanos).
          </p>
          <button class="btn ghost small" onclick={() => (showSecrets = !showSecrets)} aria-pressed={showSecrets}>
            {#if showSecrets}<EyeOff class="icon" /> Slėpti rezultatus{:else}<Eye class="icon" /> Rodyti, kas kam dovanoja{/if}
          </button>
        </div>

        <ul class="list">
          {#each participants as p (p.id)}
            <li class="card">
              <div class="card-head">
                <h2>{p.name}</h2>
                <button class="icon-btn" onclick={() => remove(p)} disabled={busy} aria-label="Pašalinti dalyvį {p.name}">
                  <Trash2 size={18} />
                </button>
              </div>

              <div class="chips">
                <span class="chip" class:done={p.wish}>Noras: {p.wish ? 'parašytas' : 'laukiama'}</span>
                <span class="chip" class:done={p.revealed}>Laiškas: {p.revealed ? 'atplėštas' : 'neatplėštas'}</span>
              </div>

              {#if p.wish}<p class="wish">„{p.wish}“</p>{/if}

              {#if showSecrets}
                <p class="secret">
                  {#if p.revealed}Dovanoja → <strong>{p.recipientName}</strong>{:else}Dar netraukė burtų{/if}
                </p>
              {/if}

              {#each [1, 2] as stage}
                {@const url = link(p.id, stage)}
                {@const key = `${p.id}-${stage}`}
                <div class="link">
                  <span class="link-label">{stage} etapas · {stage === 1 ? 'noras' : 'atskleidimas'}</span>
                  <code>{url}</code>
                  <button class="btn small" class:pine={copied === key} onclick={() => copy(key, url)}>
                    {#if copied === key}<Check class="icon" /> Nukopijuota{:else}<Copy class="icon" /> Kopijuoti{/if}
                  </button>
                </div>
              {/each}
            </li>
          {/each}
        </ul>

        <footer class="danger">
          <button class="btn ghost small" onclick={redraw} disabled={busy || revealedCount === 0}>
            <Shuffle class="icon" /> Atšaukti burtus
          </button>
          <button class="btn ghost small warn" onclick={reset} disabled={busy}>
            <Trash2 class="icon" /> Išvalyti viską (kitiems metams)
          </button>
        </footer>
      {/if}
    </section>
  </div>
{/if}

<style>
  .paper {
    display: grid;
    gap: 1.1rem;
  }

  .login {
    max-width: 30rem;
    margin: 2rem auto 0;
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .field {
    display: grid;
    gap: 0.35rem;
    flex: 1;
  }

  .field span {
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  input {
    width: 100%;
    min-height: 3rem;
    padding: 0.6rem 0.9rem;
    border: 1.5px solid rgba(43, 32, 26, 0.3);
    border-radius: 8px;
    background: #fffaf0;
    font-size: 1.05rem;
  }

  input:focus-visible {
    outline: none;
    border-color: var(--berry);
    box-shadow: 0 0 0 3px rgba(179, 38, 30, 0.18);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    border-block: 1.5px solid rgba(43, 32, 26, 0.75);
  }

  .stats div {
    padding: 0.7rem 0.5rem;
    text-align: center;
  }

  .stats div + div {
    border-left: 1px dashed rgba(43, 32, 26, 0.3);
  }

  .stats dt {
    font-family: var(--mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  .stats dd {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    line-height: 1.15;
    color: var(--berry);
  }

  .stats small {
    font-size: 0.5em;
    font-weight: 600;
    color: var(--ink-soft);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.7rem;
  }

  .add .field {
    flex: 1 1 14rem;
  }

  .add .btn {
    flex: 1 1 8rem;
    min-height: 3rem;
  }

  @media (min-width: 480px) {
    .add .btn {
      flex: 0 0 auto;
      width: auto;
    }
  }

  .empty {
    padding: 1.5rem 0.5rem;
    color: var(--ink-soft);
    font-style: italic;
    text-align: center;
  }

  .toolbar {
    display: grid;
    gap: 0.7rem;
    justify-items: start;
  }

  .how {
    font-size: 0.95rem;
    color: var(--ink-soft);
  }

  .list {
    display: grid;
    gap: 0.9rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .card {
    display: grid;
    gap: 0.65rem;
    padding: 1rem;
    border-radius: 8px;
    background: rgba(255, 252, 244, 0.8);
    box-shadow:
      0 0 0 1px rgba(43, 32, 26, 0.12),
      0 8px 14px -12px rgba(43, 32, 26, 0.5);
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .card h2 {
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .icon-btn {
    display: grid;
    place-items: center;
    flex: none;
    width: 2.75rem;
    height: 2.75rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ink-soft);
    transition:
      background 0.15s,
      color 0.15s;
  }

  .icon-btn:hover {
    background: rgba(179, 38, 30, 0.12);
    color: var(--berry);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chip {
    padding: 0.2rem 0.6rem;
    border: 1px dashed rgba(43, 32, 26, 0.4);
    border-radius: 999px;
    color: var(--ink-soft);
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .chip.done {
    border: 1px solid var(--pine);
    background: var(--pine);
    color: #f3ead6;
  }

  .wish {
    font-family: var(--hand);
    font-size: 1.35rem;
    line-height: 1.3;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .secret {
    padding: 0.45rem 0.7rem;
    border-left: 3px solid var(--gold);
    background: rgba(201, 162, 74, 0.16);
    font-size: 0.95rem;
  }

  .link {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0.25rem 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px dashed rgba(43, 32, 26, 0.22);
  }

  .link-label {
    grid-column: 1 / -1;
    font-family: var(--mono);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--berry);
  }

  .link code {
    min-width: 0;
    overflow: hidden;
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--ink-soft);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .danger {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    padding-top: 1rem;
    border-top: 1.5px solid rgba(43, 32, 26, 0.75);
  }

  .warn {
    color: var(--berry-deep);
    box-shadow: inset 0 0 0 1.5px var(--berry);
  }
</style>
