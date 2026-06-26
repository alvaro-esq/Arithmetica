<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { ACTIVATIONS, type ActKind } from '../../lib/optim/activations';
  import { samplePath } from '../../lib/dl/activations';
  import { ACCENT, SUCCESS, AXIS, PAPER, MUTED, WARN } from '../../lib/svm/colors';

  // Compare the four activations and — crucially — their derivatives. Where the
  // derivative flattens to ~0 (sigmoid/tanh tails), gradients vanish and learning
  // stalls; ReLU stays at slope 1 for z>0. Drag the probe or jump to a tail to see
  // the saturation badge fire.

  let { kind0 = 'relu' as ActKind } = $props();

  let kind = $state<ActKind>(kind0);
  const zTween = new Tween(-1, { duration: 500, easing: cubicOut });
  let z = $derived(zTween.current);

  const zMin = -6;
  const zMax = 6;
  const width = 600;
  const height = 320;
  const pad = 42;
  const xScale = scaleLinear().domain([zMin, zMax]).range([pad, width - pad]);

  let act = $derived(ACTIVATIONS[kind]);
  // Shared y-range spanning the activation band and the derivative (max 1).
  let yLo = $derived(Math.min(act.yMin, 0));
  let yHi = $derived(Math.max(act.yMax, 1.05));
  let yScale = $derived(scaleLinear().domain([yLo, yHi]).range([height - pad, pad]));

  let curve = $derived(samplePath(zMin, zMax, 160, act.f));
  let dcurve = $derived(samplePath(zMin, zMax, 160, act.df));
  let fz = $derived(act.f(z));
  let dfz = $derived(act.df(z));
  let saturated = $derived(Math.abs(dfz) < 0.02);

  function poly(pts: { x: number; y: number }[]): string {
    return pts.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(' ');
  }

  const kinds: ActKind[] = ['sigmoid', 'tanh', 'relu', 'leakyRelu'];
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-2">
    {#each kinds as k}
      <button
        class="rounded-md border px-3 py-1.5 text-sm font-medium"
        style={kind === k ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${AXIS}`}
        onclick={() => (kind = k)}
      >
        {ACTIVATIONS[k].label}
      </button>
    {/each}
  </div>

  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-[15/8]">
    <!-- baselines at y=0 and y=1 -->
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={pad} y1={yScale(1)} x2={width - pad} y2={yScale(1)} stroke={AXIS} stroke-width="1" stroke-dasharray="3 3" opacity="0.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1" opacity="0.6" />

    <!-- derivative then function -->
    <polyline points={poly(dcurve)} fill="none" stroke={SUCCESS} stroke-width="2" stroke-dasharray="5 4" opacity="0.85" />
    <polyline points={poly(curve)} fill="none" stroke={ACCENT} stroke-width="3" />

    <!-- probe -->
    <line x1={xScale(z)} y1={pad} x2={xScale(z)} y2={height - pad} stroke={MUTED} stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />
    <circle cx={xScale(z)} cy={yScale(fz)} r="6" fill={ACCENT} stroke={PAPER} stroke-width="2" />
    <circle cx={xScale(z)} cy={yScale(dfz)} r="4" fill={SUCCESS} stroke={PAPER} stroke-width="1.5" />

    <text x={width - pad} y={pad + 2} text-anchor="end" font-size="11" fill={ACCENT}>f(z)</text>
    <text x={width - pad} y={pad + 18} text-anchor="end" font-size="11" fill={SUCCESS}>f'(z)</text>
  </svg>

  <label class="block text-sm font-medium text-ink">
    Entrada z: {z.toFixed(2)}
    <input
      type="range"
      min={zMin}
      max={zMax}
      step="0.1"
      value={z}
      oninput={(e) => zTween.set(e.currentTarget.valueAsNumber, { duration: 0 })}
      class="mt-1 w-full accent-interactive"
    />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={() => zTween.set(5)}>
      Ir a la saturación →
    </button>
    <span class="text-sm text-ink">f(z) = <strong>{fz.toFixed(3)}</strong> · f'(z) = <strong style="color: {SUCCESS}">{dfz.toFixed(3)}</strong></span>
    {#if saturated}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {WARN}">saturación → gradiente ≈ 0</span>
    {/if}
  </div>
  <p class="text-xs text-muted">{act.note}</p>
</div>
