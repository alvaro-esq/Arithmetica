<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { ACCENT, AXIS, BORDER, MUTED } from '../../lib/svm/colors';

  // The sigmoid kernel uses tanh(α·z + c), the same squashing function found in
  // neural-network activations. Drag α and c to see how it bends.

  let alpha = $state(1);
  let coef0 = $state(0);

  const width = 560;
  const height = 300;
  const pad = 36;
  const xScale = scaleLinear().domain([-4, 4]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([-1.1, 1.1]).range([height - pad, pad]);

  let path = $derived(
    Array.from({ length: 121 }, (_, i) => {
      const z = -4 + (i * 8) / 120;
      const y = Math.tanh(alpha * z + coef0);
      return `${xScale(z)},${yScale(y)}`;
    }).join(' '),
  );
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[14/7.5]">
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1.5" />
    <line x1={pad} y1={yScale(1)} x2={width - pad} y2={yScale(1)} stroke={BORDER} stroke-width="1" stroke-dasharray="3 4" />
    <line x1={pad} y1={yScale(-1)} x2={width - pad} y2={yScale(-1)} stroke={BORDER} stroke-width="1" stroke-dasharray="3 4" />
    <polyline points={path} fill="none" stroke={ACCENT} stroke-width="3" />
    <text x={width - pad} y={yScale(0) - 6} text-anchor="end" font-size="12" fill={MUTED}>z = xᵀx′</text>
  </svg>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      α: {alpha.toFixed(2)}
      <input type="range" bind:value={alpha} min="-3" max="3" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      c: {coef0.toFixed(2)}
      <input type="range" bind:value={coef0} min="-3" max="3" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
  </div>
</div>
