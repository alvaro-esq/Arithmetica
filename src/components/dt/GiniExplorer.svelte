<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { gini, entropy } from '../../lib/dt/impurity';
  import { POS, NEG, ACCENT, AXIS, PAPER } from '../../lib/svm/colors';

  // Drag the class mix and watch the impurity curve respond. The parabola (Gini)
  // or its taller sibling (entropy) peaks at p = 0.5, where the node is most mixed.

  const N = 20; // dots in the urn
  let p = $state(0.5); // fraction of class 1
  let measure = $state<'gini' | 'entropy'>('gini');

  const fn = $derived(measure === 'gini' ? gini : entropy);
  // number of class-1 dots, rounded so the urn matches the slider
  const nPos = $derived(Math.round(p * N));
  // Drive the value and the marker from the SAME discrete mix the urn shows, so a
  // student counting dots and computing the impureza by hand gets the same number.
  const pEff = $derived(nPos / N);
  const value = $derived(fn([pEff, 1 - pEff]));

  const width = 520;
  const height = 300;
  const pad = 40;
  const yMax = $derived(measure === 'gini' ? 0.55 : 1.05);
  const xScale = scaleLinear().domain([0, 1]).range([pad, width - pad]);
  const yScale = $derived(scaleLinear().domain([0, yMax]).range([height - pad, pad]));

  const curve = $derived(
    Array.from({ length: 101 }, (_, i) => {
      const q = i / 100;
      return `${xScale(q)},${yScale(fn([q, 1 - q]))}`;
    }).join(' '),
  );

  // urn grid: 5 columns
  const cols = 5;
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-[1.4fr_1fr]">
    <svg
      viewBox="0 0 {width} {height}"
      preserveAspectRatio="xMidYMid meet"
      class="w-full aspect-[13/7.5]"
    >
      <!-- axes -->
      <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
      <line x1={pad} y1={pad - 6} x2={pad} y2={height - pad} stroke={AXIS} stroke-width="1.5" />
      <!-- max-impurity guide at p = 0.5 -->
      <line
        x1={xScale(0.5)}
        y1={pad - 6}
        x2={xScale(0.5)}
        y2={yScale(0)}
        stroke={AXIS}
        stroke-width="1"
        stroke-dasharray="3 4"
      />
      <polyline points={curve} fill="none" stroke={NEG} stroke-width="2.5" opacity="0.85" />
      <!-- current value markers (at the discrete proportion shown by the urn) -->
      <line
        x1={xScale(pEff)}
        y1={yScale(0)}
        x2={xScale(pEff)}
        y2={yScale(value)}
        stroke={ACCENT}
        stroke-width="1.5"
        stroke-dasharray="4 4"
      />
      <line
        x1={pad}
        y1={yScale(value)}
        x2={xScale(pEff)}
        y2={yScale(value)}
        stroke={ACCENT}
        stroke-width="1.5"
        stroke-dasharray="4 4"
      />
      <circle cx={xScale(pEff)} cy={yScale(value)} r="6" fill={ACCENT} />
      <text x={width - pad} y={yScale(0) + 22} text-anchor="end" font-size="12" fill="#777">p (clase 1)</text>
      <text x={pad + 6} y={pad + 4} font-size="12" fill="#777">
        {measure === 'gini' ? 'Gini' : 'Entropía'}
      </text>
    </svg>

    <!-- urn -->
    <div class="flex flex-col items-center justify-center gap-3">
      <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" class="w-40">
        {#each Array(N) as _, i}
          {@const r = Math.floor(i / cols)}
          {@const c = i % cols}
          <circle
            cx={26 + c * 37}
            cy={26 + r * 37}
            r="14"
            fill={i < nPos ? POS : NEG}
            stroke={PAPER}
            stroke-width="2"
          />
        {/each}
      </svg>
      <div class="text-center text-sm text-ink">
        <span style="color: {POS}">{nPos} clase 1</span> ·
        <span style="color: {NEG}">{N - nPos} clase 0</span>
      </div>
      <div class="text-center text-lg font-semibold text-ink">
        {measure === 'gini' ? 'Gini' : 'Entropía'} =
        <span style="color: {ACCENT}">{value.toFixed(3)}</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 items-center gap-3 sm:grid-cols-[2fr_1fr]">
    <label class="block text-sm font-medium text-ink">
      Proporción de la clase 1: {(p * 100).toFixed(0)}%
      <input
        type="range"
        bind:value={p}
        min="0"
        max="1"
        step="0.01"
        class="mt-1 w-full accent-interactive"
      />
    </label>
    <div class="flex gap-2 text-sm">
      <button
        onclick={() => (measure = 'gini')}
        class="flex-1 rounded-md px-3 py-2 font-medium"
        style="background-color: {measure === 'gini' ? ACCENT : 'transparent'}; color: {measure ===
        'gini'
          ? PAPER
          : NEG}; border: 1px solid {ACCENT}"
      >
        Gini
      </button>
      <button
        onclick={() => (measure = 'entropy')}
        class="flex-1 rounded-md px-3 py-2 font-medium"
        style="background-color: {measure === 'entropy' ? ACCENT : 'transparent'}; color: {measure ===
        'entropy'
          ? PAPER
          : NEG}; border: 1px solid {ACCENT}"
      >
        Entropía
      </button>
    </div>
  </div>
</div>
