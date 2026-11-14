<script>
  const rand = (min, max) => min + Math.random() * (max - min);
  const flakes = Array.from({ length: 48 }, () => {
    const size = rand(2, 7);
    return {
      left: rand(0, 100),
      size,
      dur: rand(9, 22),
      delay: -rand(0, 22),
      drift: rand(-70, 70),
      opacity: rand(0.25, 0.85),
      blur: size > 5.5 ? 1.5 : 0,
    };
  });
</script>

<div class="snow" aria-hidden="true">
  {#each flakes as f}
    <i
      style="left:{f.left}%;width:{f.size}px;height:{f.size}px;opacity:{f.opacity};filter:blur({f.blur}px);--dur:{f.dur}s;--delay:{f.delay}s;--drift:{f.drift}px"
    ></i>
  {/each}
</div>

<style>
  .snow {
    position: fixed;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    pointer-events: none;
  }

  i {
    position: absolute;
    top: -12px;
    border-radius: 50%;
    background: #fff8ea;
    animation: fall var(--dur) linear var(--delay) infinite;
  }

  @keyframes fall {
    to {
      transform: translate3d(var(--drift), 105vh, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .snow {
      display: none;
    }
  }
</style>
