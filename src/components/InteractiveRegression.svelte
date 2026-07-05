<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { ACCENT, NEG, AXIS, SUCCESS, MUTED } from '../lib/svm/colors';
  import Celebrate from './ui/Celebrate.svelte';

  let slope = $state(1);
  let intercept = $state(0);

  const data = [
    { x: 1, y: 2 }, { x: 2, y: 3.5 }, { x: 3, y: 2.5 },
    { x: 4, y: 5 }, { x: 5, y: 4.5 }, { x: 6, y: 6 }
  ];

  const width = 600;
  const height = 400;
  const padding = 40;

  const xScale = scaleLinear().domain([0, 7]).range([padding, width - padding]);
  const yScale = scaleLinear().domain([0, 7]).range([height - padding, padding]);

  let lineStart = $derived({ x: xScale(0), y: yScale(intercept) });
  let lineEnd = $derived({ x: xScale(7), y: yScale(slope * 7 + intercept) });

  // Live mean squared error — immediate feedback on every slider move.
  const mse = $derived(
    data.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0) / data.length,
  );

  // The ordinary-least-squares optimum, computed once, so the "good fit" gate is
  // relative to what's actually reachable on this data (not a hardcoded MSE that a
  // 0.1-step slider grid may never clear).
  const optMse = (() => {
    const n = data.length;
    const mx = data.reduce((s, p) => s + p.x, 0) / n;
    const my = data.reduce((s, p) => s + p.y, 0) / n;
    const sxx = data.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    const sxy = data.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
    const m = sxy / sxx;
    const b = my - m * mx;
    return data.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0) / n;
  })();
  // Within ~40% of the optimal error counts as a good fit — a band the 0.1-step
  // sliders can comfortably reach right around the least-squares line.
  const goodFit = $derived(mse <= optMse * 1.4 + 1e-9);

  // Milestone: the learner has found a good fit. Celebrate once.
  let celebrate = $state(false);
  let celebrated = false;
  $effect(() => {
    if (goodFit && !celebrated) {
      celebrated = true;
      celebrate = true;
    }
  });
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[3/2] animate-fade-up">
    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={AXIS} stroke-width="2" />
    <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={AXIS} stroke-width="2" />

    <!-- residuals: the error being minimized, drawn live -->
    {#each data as point}
      <line
        x1={xScale(point.x)}
        y1={yScale(point.y)}
        x2={xScale(point.x)}
        y2={yScale(slope * point.x + intercept)}
        stroke={goodFit ? SUCCESS : NEG}
        stroke-width="1.5"
        stroke-dasharray="3 3"
        opacity="0.5"
      />
    {/each}

    {#each data as point}
      <circle cx={xScale(point.x)} cy={yScale(point.y)} r="6" fill={NEG} />
    {/each}

    <line
      x1={lineStart.x}
      y1={lineStart.y}
      x2={lineEnd.x}
      y2={lineEnd.y}
      stroke={goodFit ? SUCCESS : ACCENT}
      stroke-width="3"
      style="transition: stroke 200ms ease-out"
    />
  </svg>

  <div class="flex flex-wrap items-center justify-between gap-3">
    <span class="text-sm" style="color: {MUTED}">
      Error cuadrático medio:
      <strong style="color: {goodFit ? SUCCESS : ACCENT}">{mse.toFixed(3)}</strong>
    </span>
    <Celebrate active={celebrate} label="¡Buen ajuste!" />
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label class="block text-sm font-medium mb-1">Pendiente (m): {slope.toFixed(1)}</label>
      <input type="range" bind:value={slope} min="-2" max="2" step="0.1" class="w-full accent-interactive" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1">Ordenada (b): {intercept.toFixed(1)}</label>
      <input type="range" bind:value={intercept} min="-3" max="3" step="0.1" class="w-full accent-interactive" />
    </div>
  </div>
</div>
