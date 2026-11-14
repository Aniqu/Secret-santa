<script>
  let { label = 'Kalėdos' } = $props();
  const year = new Date().getFullYear();
</script>

<span class="postmark" aria-hidden="true">
  <span class="top">Šiaurės ašigalis</span>
  <span class="mid">{label}</span>
  <span class="bottom">12 · 25 · {year}</span>
</span>

<style>
  .postmark {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    width: 6.4rem;
    height: 6.4rem;
    border-radius: 50%;
    border: 2px solid currentColor;
    outline: 1px solid currentColor;
    outline-offset: -7px;
    color: var(--berry);
    opacity: 0.72;
    font-family: var(--mono);
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
    text-transform: uppercase;
    transform: rotate(-13deg);
  }

  .top,
  .bottom {
    font-size: 0.48rem;
    letter-spacing: 0.1em;
  }

  .mid {
    padding: 0.15rem 0;
    border-block: 1px solid currentColor;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
  }
</style>
