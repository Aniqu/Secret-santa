<script>
  import { Snowflake } from '@lucide/svelte';

  let { size = 84 } = $props();
</script>

<span class="seal" style="--size:{size}px" aria-hidden="true">
  <span class="ring">
    <Snowflake size={size * 0.42} strokeWidth={2.4} />
  </span>
</span>

<style>
  .seal {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--size);
    height: var(--size);
    /* netaisyklingas, lyg išsilydžiusio vaško kraštas */
    border-radius: 46% 54% 51% 49% / 53% 47% 54% 46%;
    background:
      radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.4), transparent 34%),
      radial-gradient(circle at 50% 50%, #cb382e 0%, #a81f18 58%, #6e100d 100%);
    box-shadow:
      0 calc(var(--size) * 0.07) calc(var(--size) * 0.14) rgba(60, 8, 6, 0.55),
      inset 0 -3px 5px rgba(0, 0, 0, 0.3);
  }

  .ring {
    display: grid;
    place-items: center;
    width: 70%;
    height: 70%;
    border-radius: 50%;
    color: #7c1511;
    box-shadow:
      inset 0 2px 3px rgba(0, 0, 0, 0.4),
      0 1px 0 rgba(255, 255, 255, 0.22);
    background: radial-gradient(circle at 50% 35%, #bb2d24, #9b1a14);
    filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.18));
  }
</style>
