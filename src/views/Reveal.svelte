<script>
  import { untrack } from 'svelte';
  import { Snowflake } from '@lucide/svelte';
  import { api } from '../lib/api.js';
  import Seal from '../lib/Seal.svelte';
  import Postmark from '../lib/Postmark.svelte';

  let { id, me, onupdate } = $props();

  const HOLD_MS = 1300; // kiek laikyti antspaudą, kad jis lūžtų
  const OPEN_MS = 2000; // voko atsidarymo animacijos trukmė
  const RING = 2 * Math.PI * 48;

  // sealed -> opening -> letter; jau atplėštas laiškas rodomas iš karto
  let phase = $state(untrack(() => (me.recipient ? 'letter' : 'sealed')));
  let fresh = $state(false);
  let sparkling = $state(false);
  let progress = $state(0);
  let holding = $state(false);
  let misses = $state(0);
  let error = $state('');

  let raf = null;
  let last = 0;

  const recipient = $derived(me.recipient);
  const chars = $derived(recipient ? [...recipient.name].map((ch) => (ch === ' ' ? ' ' : ch)) : []);

  const sparks = Array.from({ length: 30 }, (_, i) => ({
    angle: (360 / 30) * i + Math.random() * 10,
    dist: 90 + Math.random() * 150,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.25,
    color: ['var(--gold)', 'var(--gold-soft)', 'var(--berry)', '#fff8ea'][i % 4],
  }));

  function tick(now) {
    const dt = now - last;
    last = now;
    progress = holding ? Math.min(1, progress + dt / HOLD_MS) : Math.max(0, progress - dt / 350);

    if (progress >= 1) {
      raf = null;
      holding = false;
      open();
    } else if (holding || progress > 0) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }

  function press(e) {
    if (phase !== 'sealed') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    holding = true;
    error = '';
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function release() {
    if (!holding) return;
    holding = false;
    misses += 1;
  }

  function onkey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && phase === 'sealed') {
      e.preventDefault();
      open();
    }
  }

  async function open() {
    if (phase !== 'sealed') return;
    phase = 'opening';
    error = '';
    navigator.vibrate?.([25, 40, 70]);
    try {
      const [next] = await Promise.all([api.reveal(id), new Promise((r) => setTimeout(r, OPEN_MS))]);
      fresh = true;
      sparkling = true;
      setTimeout(() => (sparkling = false), 2200);
      onupdate(next);
      phase = 'letter';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      error = err.message;
      progress = 0;
      phase = 'sealed';
    }
  }
</script>

{#if phase !== 'letter'}
  <section class="intro" class:leaving={phase === 'opening'}>
    <p class="kicker gold rise" style="--i:1">2 etapas · Slaptas laiškas</p>
    <h1 class="title rise" style="--i:2">Sveiki, {me.name}!</h1>
    <p class="lead rise" style="--i:3">
      Tau atkeliavo laiškas iš Šiaurės ašigalio. Jame – vardas žmogaus, kuriam šiemet būsi slaptasis Kalėdų Senelis.
    </p>
  </section>

  <div class="stage rise" style="--i:4">
    <div class="env" class:holding class:open={phase === 'opening'} style="--p:{progress}">
      <div class="env-back"></div>
      <div class="env-letter"><span></span><span></span><span></span></div>
      <div class="env-side left"></div>
      <div class="env-side right"></div>
      <div class="env-side bottom"></div>
      <div class="env-flap"><div class="env-flap-face"></div></div>

      {#if phase === 'sealed'}
        <button
          class="seal-btn"
          aria-label="Atplėšti laišką"
          onpointerdown={press}
          onpointerup={release}
          onpointercancel={release}
          onpointerleave={release}
          onkeydown={onkey}
          oncontextmenu={(e) => e.preventDefault()}
        >
          <svg class="ring" viewBox="0 0 104 104" aria-hidden="true">
            <circle cx="52" cy="52" r="48" class="track" />
            <circle
              cx="52"
              cy="52"
              r="48"
              class="fill"
              stroke-dasharray={RING}
              stroke-dashoffset={RING * (1 - progress)}
            />
          </svg>
          <Seal size={84} />
        </button>
      {:else}
        <div class="half left"><Seal size={84} /></div>
        <div class="half right"><Seal size={84} /></div>
      {/if}
    </div>
  </div>

  <div class="hint" aria-live="polite">
    {#if phase === 'opening'}
      <p>Laiškas atplėšiamas…</p>
    {:else if error}
      <p class="notice" role="alert">{error}</p>
    {:else if misses > 0 && !holding}
      <p>Dar truputį – palaikyk antspaudą ilgiau!</p>
    {:else}
      <p>Paspausk ir palaikyk antspaudą, kol jis lūš</p>
    {/if}
    {#if phase === 'sealed' && misses >= 2}
      <button class="skip" onclick={open}>Neatsidaro? Atplėšti iš karto</button>
    {/if}
  </div>
{:else if recipient}
  <div class="airmail letter" class:fresh>
    {#if sparkling}
      <div class="sparks" aria-hidden="true">
        {#each sparks as s}
          <i
            style="--a:{s.angle}deg;--d:{s.dist}px;width:{s.size}px;height:{s.size}px;background:{s.color};animation-delay:{s.delay}s"
          ></i>
        {/each}
      </div>
    {/if}

    <section class="paper">
      <div class="top step" style="--i:0">
        <p class="kicker">Slaptas laiškas<br />Tik tau, {me.name}</p>
        <Postmark label="Slapta" />
      </div>
      <p class="lead step" style="--i:1">Šiemet slaptasis Kalėdų Senelis esi tu.<br />Dovaną ruoši žmogui, vardu</p>

      <h2 class="name" class:long={chars.length > 9} aria-label={recipient.name}>
        {#each chars as ch, i}<span aria-hidden="true" style="--c:{i}">{ch}</span>{/each}
      </h2>
      <div class="flourish" aria-hidden="true"><span></span><Snowflake size={18} /><span></span></div>

      <div class="wish step" style="--i:8">
        <p class="kicker">Laiške Kalėdų Seneliui</p>
        {#if recipient.wish}
          <p class="hand ruled wish-text">{recipient.wish}</p>
          <p class="hand sign">— {recipient.name}</p>
        {:else}
          <p class="empty">
            Noro dar neparašė. Užsuk čia vėliau – kai tik laiškas bus išsiųstas, noras atsiras šioje vietoje.
          </p>
        {/if}
      </div>

      <div class="hush step" style="--i:10">
        <Seal size={46} />
        <p><strong>Tsss… laikyk paslaptyje!</strong> Niekas neturi sužinoti, kam dovanosi.</p>
      </div>
    </section>
  </div>
  <p class="again">Šią nuorodą gali atsidaryti bet kada – vardas nepasikeis.</p>
{/if}

<style>
  /* ---------- Įžanga ---------- */

  .intro {
    display: grid;
    gap: 0.8rem;
    color: #f5ecd9;
    text-align: center;
    transition:
      opacity 0.6s ease,
      transform 0.6s ease;
  }

  .intro.leaving {
    opacity: 0;
    transform: translateY(-12px);
  }

  .intro .lead {
    color: rgba(245, 236, 217, 0.78);
  }

  .kicker.gold {
    color: var(--gold-soft);
  }

  /* ---------- Vokas ---------- */

  .stage {
    display: grid;
    place-items: center;
    /* atvartas ir kylantis laiškas uždengia tuo metu išblunkančią įžangą */
    padding: 3rem 0 1.5rem;
  }

  .env {
    position: relative;
    width: min(100%, 21rem);
    aspect-ratio: 3 / 2;
    perspective: 900px;
    filter: drop-shadow(0 26px 26px rgba(0, 0, 0, 0.5));
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }

  .env.holding {
    animation: jitter 0.11s linear infinite;
  }

  @keyframes jitter {
    0%,
    100% {
      transform: translate(0, 0) rotate(0);
    }
    25% {
      transform: translate(calc(var(--p) * 3px), calc(var(--p) * -2px)) rotate(calc(var(--p) * 1.2deg));
    }
    75% {
      transform: translate(calc(var(--p) * -3px), calc(var(--p) * 2px)) rotate(calc(var(--p) * -1.2deg));
    }
  }

  .env-back,
  .env-side,
  .env-flap,
  .env-flap-face {
    position: absolute;
    inset: 0;
  }

  .env-back {
    border-radius: 6px;
    background: #cdb98f;
  }

  .env-letter {
    position: absolute;
    inset: 7% 6% 6%;
    z-index: 1;
    display: grid;
    align-content: start;
    gap: 0.75rem;
    padding: 1.4rem 1.2rem;
    border-radius: 3px;
    background: linear-gradient(180deg, #fffaf0, var(--paper));
    box-shadow: 0 0 0 1px rgba(43, 32, 26, 0.08);
    transition: transform 1s cubic-bezier(0.3, 0.9, 0.3, 1) 0.75s;
  }

  .env-letter span {
    height: 3px;
    border-radius: 2px;
    background: var(--rule);
  }

  .env-letter span:first-child {
    width: 55%;
    background: rgba(179, 38, 30, 0.45);
  }

  .env-letter span:last-child {
    width: 70%;
  }

  .env.open .env-letter {
    transform: translateY(-62%);
  }

  .env-side {
    z-index: 2;
  }

  .env-side.left {
    border-radius: 6px 0 0 6px;
    clip-path: polygon(0 0, 50% 54%, 0 100%);
    background: linear-gradient(90deg, #eadbb9, #e2d1ab);
  }

  .env-side.right {
    border-radius: 0 6px 6px 0;
    clip-path: polygon(100% 0, 50% 54%, 100% 100%);
    background: linear-gradient(270deg, #eadbb9, #e2d1ab);
  }

  .env-side.bottom {
    border-radius: 0 0 6px 6px;
    clip-path: polygon(0 100%, 50% 54%, 100% 100%);
    background: linear-gradient(0deg, #f3e7cc, #ecdfc1);
  }

  .env-flap {
    z-index: 3;
    transform-origin: top center;
    filter: drop-shadow(0 3px 3px rgba(43, 32, 26, 0.28));
    transition:
      transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.35s,
      z-index 0s linear 0.7s;
  }

  .env-flap-face {
    border-radius: 6px 6px 0 0;
    clip-path: polygon(0 0, 100% 0, 50% 60%);
    background: linear-gradient(180deg, #f8efd9, #e9dbb9);
  }

  .env.open .env-flap {
    z-index: 0;
    transform: rotateX(180deg);
  }

  /* ---------- Antspaudas ---------- */

  .seal-btn,
  .half {
    position: absolute;
    top: 60%;
    left: 50%;
    z-index: 4;
    display: grid;
    place-items: center;
    width: 104px;
    height: 104px;
    margin: -52px 0 0 -52px;
  }

  .seal-btn {
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    animation: breathe 2.6s ease-in-out infinite;
  }

  .env.holding .seal-btn {
    animation: none;
    transform: scale(calc(1 - var(--p) * 0.08));
  }

  @keyframes breathe {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.06);
    }
  }

  .ring {
    position: absolute;
    inset: 0;
    transform: rotate(-90deg);
    fill: none;
    stroke-width: 4;
    stroke-linecap: round;
  }

  .ring .track {
    stroke: rgba(43, 32, 26, 0.12);
  }

  .ring .fill {
    stroke: var(--gold);
  }

  .half {
    pointer-events: none;
    animation: crack 0.9s cubic-bezier(0.4, 0, 0.8, 0.6) forwards;
  }

  .half.left {
    clip-path: polygon(0 0, 52% 0, 44% 30%, 55% 52%, 46% 74%, 50% 100%, 0 100%);
    --dx: -70px;
    --rot: -55deg;
  }

  .half.right {
    clip-path: polygon(52% 0, 100% 0, 100% 100%, 50% 100%, 46% 74%, 55% 52%, 44% 30%);
    --dx: 70px;
    --rot: 55deg;
  }

  @keyframes crack {
    0% {
      transform: none;
      opacity: 1;
    }
    25% {
      transform: translate(calc(var(--dx) * 0.2), -8px) rotate(calc(var(--rot) * 0.2));
      opacity: 1;
    }
    100% {
      transform: translate(var(--dx), 150px) rotate(var(--rot));
      opacity: 0;
    }
  }

  /* ---------- Užuomina ---------- */

  .hint {
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    min-height: 4.5rem;
    color: var(--gold-soft);
    font-family: var(--hand);
    font-size: 1.5rem;
    line-height: 1.2;
    text-align: center;
  }

  .hint .notice {
    font-family: var(--display);
    font-size: 0.95rem;
    background: #f5ecd9;
    text-align: left;
  }

  .skip {
    padding: 0.5rem 0.25rem;
    border: 0;
    background: none;
    color: rgba(245, 236, 217, 0.8);
    font-family: var(--mono);
    font-size: 0.8rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ---------- Atplėštas laiškas ---------- */

  .letter {
    position: relative;
    animation: unfold 0.9s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  @keyframes unfold {
    from {
      opacity: 0;
      transform: translateY(60px) scale(0.86) rotate(-2.5deg);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .paper {
    display: grid;
    gap: 0.9rem;
    text-align: center;
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin: -0.6rem -0.4rem 0 0;
    text-align: left;
  }

  .top .kicker {
    line-height: 1.9;
    overflow-wrap: anywhere;
  }

  .step {
    animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(0.25s + var(--i) * 0.16s);
  }

  .fresh .step {
    animation-delay: calc(0.7s + var(--i) * 0.22s);
  }

  .name {
    margin: 0.2rem 0 0;
    color: var(--berry);
    font-size: clamp(3.2rem, 17vw, 5.6rem);
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }

  .name.long {
    font-size: clamp(2.3rem, 11vw, 3.8rem);
  }

  .name span {
    display: inline-block;
    animation: letter 0.6s cubic-bezier(0.2, 1.3, 0.4, 1) both;
    animation-delay: calc(0.6s + var(--c) * 0.07s);
  }

  .fresh .name span {
    animation-delay: calc(1.3s + var(--c) * 0.11s);
  }

  @keyframes letter {
    from {
      opacity: 0;
      transform: translateY(0.45em) rotate(-10deg) scale(0.7);
      filter: blur(6px);
    }
    to {
      opacity: 1;
      transform: none;
      filter: none;
    }
  }

  .flourish {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: var(--gold);
  }

  .flourish span {
    width: 4.5rem;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold));
  }

  .flourish span:last-child {
    transform: scaleX(-1);
  }

  .wish {
    display: grid;
    gap: 0.4rem;
    margin-top: 0.6rem;
    padding: 1.1rem 1.1rem 0.9rem;
    border-radius: 6px;
    background: rgba(255, 252, 244, 0.75);
    box-shadow:
      0 0 0 1px rgba(43, 32, 26, 0.1),
      0 8px 16px -10px rgba(43, 32, 26, 0.4);
    text-align: left;
    transform: rotate(-0.8deg);
  }

  .wish-text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .sign {
    color: var(--ink-soft);
    text-align: right;
  }

  .empty {
    color: var(--ink-soft);
    font-style: italic;
  }

  .hush {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin-top: 0.5rem;
    padding: 0.9rem 1rem;
    border-radius: 8px;
    background: var(--pine);
    color: #f3ead6;
    font-size: 0.97rem;
    line-height: 1.4;
    text-align: left;
  }

  .hush strong {
    color: var(--gold-soft);
  }

  .again {
    margin-top: 1.25rem;
    color: rgba(245, 236, 217, 0.6);
    font-family: var(--mono);
    font-size: 0.75rem;
    text-align: center;
  }

  /* ---------- Kibirkštys ---------- */

  .sparks {
    position: absolute;
    top: 9rem;
    left: 50%;
    z-index: 5;
    pointer-events: none;
  }

  .sparks i {
    position: absolute;
    border-radius: 50%;
    opacity: 0;
    animation: spark 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) 1 both;
  }

  @keyframes spark {
    0% {
      opacity: 1;
      transform: rotate(var(--a)) translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(0.2);
    }
  }
</style>
