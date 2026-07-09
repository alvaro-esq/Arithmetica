<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { clamp } from '../../lib/svm/geometry';
  import { POS, ACCENT, AXIS, MUTED, SUCCESS, WARN, PAPER } from '../../lib/svm/colors';
  import { lstsqLine } from '../../lib/la/solve';
  import { mulberry32, makeGaussian } from '../../lib/svm/prng';
  import Celebrate from '../ui/Celebrate.svelte';

  // Fit a line by hand with the θ sliders, then let the normal equations do it
  // in one shot: θ̂ = (XᵀX)⁻¹Xᵀy. The vertical dashes are the residuals; the
  // bar is their sum of squares. This IS linear regression.

  function makeCloud(seed: number) {
    const rng = mulberry32(seed);
    const gauss = makeGaussian(rng);
    return Array.from({ length: 10 }, (_, i) => ({
      x: 0.7 + (8.6 * i) / 9 + (rng() - 0.5) * 0.5,
      y: clamp(1.2 + 0.75 * (0.7 + (8.6 * i) / 9) + gauss(0, 0.75), 0.4, 9.6),
    }));
  }
  let cloudSeed = $state(3);
  let points = $state(makeCloud(3));

  const dom: Domain = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
  const width = 600;
  const height = 440;
  const pad = 36;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  const t0T = new Tween(4.5, { duration: 700, easing: cubicOut }); // intercepto θ₀
  const t1T = new Tween(0, { duration: 700, easing: cubicOut }); // pendiente θ₁
  let theta0 = $derived(t0T.current);
  let theta1 = $derived(t1T.current);

  let fit = $derived(lstsqLine(points));
  let residuals = $derived(points.map((p) => p.y - (theta1 * p.x + theta0)));
  let sse = $derived(residuals.reduce((a, r) => a + r * r, 0));
  let atOpt = $derived(Math.abs(theta0 - fit.b) < 0.06 && Math.abs(theta1 - fit.m) < 0.02);

  // Tween to the TRUE optimum, unclamped: the sliders may pin at their ends,
  // but the line must land where θ̂ says or atOpt/Celebrate never fire.
  function solve() {
    t0T.set(fit.b);
    t1T.set(fit.m);
  }
  function reshuffle() {
    cloudSeed += 1;
    points = makeCloud(cloudSeed);
  }

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });

  // SSE bar, log-ish scaled so it stays useful across drags.
  let barPct = $derived(Math.min(100, (sse / 120) * 100));
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none animate-fade-up"
  >
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- residuals -->
    {#each points as p, i}
      <line x1={xScale(p.x)} y1={yScale(p.y)} x2={xScale(p.x)} y2={yScale(theta1 * p.x + theta0)} stroke={WARN} stroke-width="2" stroke-dasharray="4 3" opacity="0.8" />
    {/each}

    <!-- the model line y = θ₁t + θ₀ -->
    <line
      x1={xScale(dom.xMin)}
      y1={yScale(theta1 * dom.xMin + theta0)}
      x2={xScale(dom.xMax)}
      y2={yScale(theta1 * dom.xMax + theta0)}
      stroke={atOpt ? SUCCESS : ACCENT}
      stroke-width="3"
    />

    <!-- data -->
    {#each points as p, i}
      <circle
        cx={xScale(p.x)}
        cy={yScale(p.y)}
        r={dragIndex === i ? 10 : 7}
        fill={POS}
        stroke={PAPER}
        stroke-width="1.5"
        style="cursor: {dragIndex === i ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index={i}
      />
    {/each}
  </svg>

  <p class="text-xs text-muted">Arrastra los puntos y ajusta la recta con los deslizadores; las líneas punteadas son los residuos.</p>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      Intercepto θ₀ = {theta0.toFixed(2)}
      <input type="range" value={theta0} oninput={(e) => t0T.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="-2" max="8" step="0.02" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Pendiente θ₁ = {theta1.toFixed(2)}
      <input type="range" value={theta1} oninput={(e) => t1T.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="-1.5" max="2" step="0.01" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex items-center gap-3 text-sm text-ink">
    <span class="whitespace-nowrap">‖r‖² = <strong style="color:{atOpt ? SUCCESS : WARN}">{sse.toFixed(2)}</strong></span>
    <span class="h-2.5 flex-1 overflow-hidden rounded-full" style="background-color:{AXIS}40">
      <span class="block h-full rounded-full transition-all duration-150" style="width:{barPct}%; background-color:{atOpt ? SUCCESS : WARN}"></span>
    </span>
    <span class="whitespace-nowrap text-muted">óptimo: {fit.sse.toFixed(2)}</span>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    <span class="tabular-nums" style="color:{MUTED}">θ̂ = (XᵀX)⁻¹Xᵀy = ({fit.m.toFixed(2)}, {fit.b.toFixed(2)})</span>
    <Celebrate active={atOpt} label="¡Acabas de hacer regresión lineal!" />
    <span class="ml-auto flex gap-2">
      <button onclick={reshuffle} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">Nuevos datos</button>
      <button onclick={solve} class="rounded-md px-4 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color:{ACCENT}">
        Resolver ecuaciones normales
      </button>
    </span>
  </div>
</div>
