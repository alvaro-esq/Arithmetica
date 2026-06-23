<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { interval1d } from '../../lib/svm/datasets';
  import { smoothstep } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT as SEP, PAPER } from '../../lib/svm/colors';

  // The kernel trick, made visible. In 1D the data cannot be split by a single
  // point; lifting with φ(x) = (x, x²) places it on a parabola where a straight
  // line separates the classes. The slider drives that lift.

  const gap = 1.4; // |x| = gap separates the classes; the lift draws y = gap²
  const data = interval1d(16, 7, gap);

  const width = 600;
  const height = 400;
  const pad = 44;

  const xScale = scaleLinear().domain([-3, 3]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([-0.6, 9]).range([height - pad, pad]);

  let s = $state(0); // 0 = flat 1D view, 1 = fully lifted onto parabola
  let playing = $state(false);

  let lift = $derived(smoothstep(s));
  // y-coordinate of each point: interpolate from the axis (0) up to x².
  let lifted = $derived(
    data.map((p) => ({ ...p, yv: lift * p.x * p.x })),
  );
  // The separating line y = gap² fades in as the lift completes.
  let lineY = $derived(yScale(gap * gap));
  let lineOpacity = $derived(Math.max(0, (lift - 0.45) / 0.55));

  // Faint parabola the data climbs onto.
  const parabola = Array.from({ length: 49 }, (_, i) => {
    const x = -3 + (i * 6) / 48;
    return { x, y: x * x };
  });
  let parabolaPath = $derived(
    parabola.map((p) => `${xScale(p.x)},${yScale(lift * p.y)}`).join(' '),
  );

  let frame = 0;
  function step() {
    s = Math.min(1, s + 0.012);
    if (s < 1 && playing) {
      frame = requestAnimationFrame(step);
    } else {
      playing = false;
    }
  }
  function toggle() {
    if (playing) {
      playing = false;
      cancelAnimationFrame(frame);
      return;
    }
    if (s >= 1) s = 0;
    playing = true;
    frame = requestAnimationFrame(step);
  }

  $effect(() => () => cancelAnimationFrame(frame));
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[3/2]">
    <!-- axes -->
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke="#D8D6CE" stroke-width="2" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke="#D8D6CE" stroke-width="1.5" />

    <!-- parabola manifold -->
    <polyline points={parabolaPath} fill="none" stroke="#B9B6AC" stroke-width="1.5" stroke-dasharray="4 4" opacity={lift} />

    <!-- separating line (appears after lifting) -->
    <line x1={pad} y1={lineY} x2={width - pad} y2={lineY} stroke={SEP} stroke-width="3" opacity={lineOpacity} />
    <text x={width - pad} y={lineY - 8} text-anchor="end" font-size="13" fill={SEP} opacity={lineOpacity}>
      separador lineal
    </text>

    <!-- points -->
    {#each lifted as p}
      <circle cx={xScale(p.x)} cy={yScale(p.yv)} r="7" fill={p.label === 1 ? POS : NEG} stroke={PAPER} stroke-width="1.5" />
    {/each}

    <text x={pad} y={height - 14} font-size="13" fill="#555">x</text>
    <text x={xScale(0) + 8} y={pad + 4} font-size="13" fill="#555">x²</text>
  </svg>

  <div class="flex items-center gap-4">
    <button
      onclick={toggle}
      class="rounded-md px-4 py-2 text-sm font-medium text-paper"
      style="background-color: {SEP}"
    >
      {playing ? 'Pausar' : s >= 1 ? 'Reiniciar' : 'Elevar'}
    </button>
    <input type="range" bind:value={s} min="0" max="1" step="0.001" class="w-full accent-interactive" aria-label="Elevación" />
  </div>

  <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
    <span class="flex items-center gap-2"><span class="inline-block h-3 w-3 rounded-full" style="background-color: {NEG}"></span>Clase interior (−1)</span>
    <span class="flex items-center gap-2"><span class="inline-block h-3 w-3 rounded-full" style="background-color: {POS}"></span>Clase exterior (+1)</span>
  </div>
</div>
