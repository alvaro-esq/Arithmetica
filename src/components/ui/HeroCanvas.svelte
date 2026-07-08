<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { INK, ACCENT } from '../../lib/svm/colors';

  const W = 1200;
  const H = 700;

  // Retícula de puntos tipo papel milimetrado (capa lejana).
  const cols = 24;
  const rows = 14;
  const gx = scaleLinear().domain([0, cols - 1]).range([40, W - 40]);
  const gy = scaleLinear().domain([0, rows - 1]).range([40, H - 40]);
  const dots = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ x: gx(c), y: gy(r) }))
  ).flat();

  let root: HTMLDivElement;

  $effect(() => {
    const reduce =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !root) return;

    let raf = 0;
    let px = 0.5;
    let py = 0.5;

    function apply() {
      raf = 0;
      root.style.setProperty('--mx', `${px * 100}%`);
      root.style.setProperty('--my', `${py * 100}%`);
      root.style.setProperty('--px', `${(px - 0.5) * 2}`);
      root.style.setProperty('--py', `${(py - 0.5) * 2}`);
    }

    function onMove(e: PointerEvent) {
      px = e.clientX / window.innerWidth;
      py = e.clientY / window.innerHeight;
      if (!raf) raf = requestAnimationFrame(apply);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  });
</script>

<div bind:this={root} class="hero-bg" style="--c-accent:{ACCENT}" aria-hidden="true">
  <div class="halo"></div>
  <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice" class="w-full h-full">
    <g class="layer far">
      {#each dots as d}
        <circle cx={d.x} cy={d.y} r="1.6" fill={INK} opacity="0.07" />
      {/each}
    </g>
  </svg>
</div>

<style>
  .hero-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    --mx: 68%;
    --my: 42%;
    --px: 0;
    --py: 0;
    animation: hero-bg-in 600ms var(--ease-out, ease-out) both;
  }

  @keyframes hero-bg-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .halo {
    position: absolute;
    inset: -10%;
    background: radial-gradient(
      420px circle at var(--mx) var(--my),
      color-mix(in srgb, var(--c-accent) 14%, transparent),
      color-mix(in srgb, var(--c-accent) 5%, transparent) 30%,
      transparent 60%
    );
    transition: background 120ms linear;
  }

  .layer {
    transition: transform 300ms var(--ease-out, ease-out);
    will-change: transform;
  }
  .far {
    transform: translate3d(calc(var(--px) * 10px), calc(var(--py) * 8px), 0);
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-bg { animation: none; }
    .halo { display: none; }
    .layer { transform: none; }
  }
</style>
