<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { sigmoid, sigmoidPrime, step, samplePath } from '../../lib/dl/activations';
  import { ACCENT, NEG, AXIS, PAPER, SUCCESS, MUTED } from '../../lib/svm/colors';

  // The perceptron → sigmoid leap. The step function is a hard switch — its slope
  // is 0 almost everywhere, so gradients carry no information. The sigmoid smooths
  // it: a small change in w or b produces a small, *measurable* change in output.
  // That differentiability (shown as the tangent at the probe) is what makes the
  // neuron trainable. Crank w up and the sigmoid approaches the step again.

  let { w0 = 1.5, b0 = 0 }: { w0?: number; b0?: number } = $props();

  // w is the single source of truth via a tween, so the "≈ escalón" button can
  // animate it while the slider still reads and writes the same value.
  const wTween = new Tween(w0, { duration: 600, easing: cubicOut });
  let b = $state(b0);
  let xProbe = $state(-1);

  let w = $derived(wTween.current);

  const xMin = -6;
  const xMax = 6;
  const width = 600;
  const height = 300;
  const pad = 38;
  const xScale = scaleLinear().domain([xMin, xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([0, 1]).range([height - pad, pad]);

  let curve = $derived(samplePath(xMin, xMax, 140, (x) => sigmoid(w * x + b)));
  let stepCurve = $derived(samplePath(xMin, xMax, 140, (x) => step(w * x + b)));

  let zProbe = $derived(w * xProbe + b);
  let aProbe = $derived(sigmoid(zProbe));
  let slopeProbe = $derived(w * sigmoidPrime(zProbe)); // d a / d x via chain rule

  function poly(pts: { x: number; y: number }[]): string {
    return pts.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(' ');
  }

  // Short tangent segment at the probe, drawn in data space then projected. The
  // horizontal half-length shrinks when the slope is steep (large w) so the
  // segment never shoots outside the [0,1] plot band — it stays a readable
  // tangent instead of a stray vertical line over the axis.
  let tangent = $derived.by(() => {
    const maxRise = 0.32; // keep |Δy| within the band
    const dx = Math.min(1.2, Math.abs(slopeProbe) < 1e-6 ? 1.2 : maxRise / Math.abs(slopeProbe));
    return [
      { x: xProbe - dx, y: aProbe - slopeProbe * dx },
      { x: xProbe + dx, y: aProbe + slopeProbe * dx },
    ];
  });
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-[2/1]">
    <!-- y gridlines at 0, 0.5, 1 -->
    {#each [0, 0.5, 1] as g}
      <line x1={pad} y1={yScale(g)} x2={width - pad} y2={yScale(g)} stroke={AXIS} stroke-width="1" opacity="0.6" />
      <text x={pad - 8} y={yScale(g) + 4} text-anchor="end" font-size="10" fill={MUTED}>{g}</text>
    {/each}
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1" opacity="0.6" />

    <!-- step function (what we replaced) -->
    <polyline points={poly(stepCurve)} fill="none" stroke={NEG} stroke-width="1.5" stroke-dasharray="5 4" opacity="0.55" />
    <!-- sigmoid -->
    <polyline points={poly(curve)} fill="none" stroke={ACCENT} stroke-width="3" />

    <!-- probe: vertical guide, tangent, dot -->
    <line x1={xScale(xProbe)} y1={pad} x2={xScale(xProbe)} y2={height - pad} stroke={MUTED} stroke-width="1" stroke-dasharray="3 3" opacity="0.6" />
    <line x1={xScale(tangent[0].x)} y1={yScale(tangent[0].y)} x2={xScale(tangent[1].x)} y2={yScale(tangent[1].y)} stroke={SUCCESS} stroke-width="2" />
    <circle cx={xScale(xProbe)} cy={yScale(aProbe)} r="6" fill={ACCENT} stroke={PAPER} stroke-width="2" />

    <text x={width - pad} y={pad + 4} text-anchor="end" font-size="11" fill={NEG} opacity="0.7">escalón</text>
    <text x={width - pad} y={pad + 20} text-anchor="end" font-size="11" fill={ACCENT}>sigmoide</text>
  </svg>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <label class="block text-sm font-medium text-ink">
      Peso w: {w.toFixed(2)}
      <input
        type="range"
        min="0.2"
        max="10"
        step="0.1"
        value={w}
        oninput={(e) => wTween.set(e.currentTarget.valueAsNumber, { duration: 0 })}
        class="mt-1 w-full accent-interactive"
      />
    </label>
    <label class="block text-sm font-medium text-ink">
      Sesgo b: {b.toFixed(2)}
      <input type="range" bind:value={b} min="-5" max="5" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Entrada x: {xProbe.toFixed(2)}
      <input type="range" bind:value={xProbe} min={xMin} max={xMax} step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={() => wTween.set(10)}>
      w grande → ≈ escalón
    </button>
    <span class="text-sm text-ink">
      σ(z) = <strong>{aProbe.toFixed(3)}</strong> · pendiente local = <strong style="color: {SUCCESS}">{slopeProbe.toFixed(3)}</strong>
    </span>
  </div>
  <p class="text-xs text-muted">La <strong>pendiente</strong> (verde) es lo que el escalón no tiene: por eso la sigmoide se puede optimizar con gradientes.</p>
</div>
