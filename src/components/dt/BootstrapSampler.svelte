<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { mulberry32 } from '../../lib/svm/prng';
  import { POS, NEG, ACCENT, PAPER, AXIS } from '../../lib/svm/colors';
  import { bootstrapIndices } from '../../lib/dt/ensemble';
  import { blobs } from '../../lib/dt/datasets';

  // Bagging's engine: sample n points WITH replacement. Some appear several times
  // (bigger dots), and on average ~37% never get drawn — the out-of-bag set.

  const dom = { xMin: -3.4, yMin: -2.4, xMax: 3.4, yMax: 2.4 };
  const data = blobs(30, 4, 2.2, 0.8);
  let seed = $state(1);

  const idx = $derived(bootstrapIndices(data.length, mulberry32(seed)));
  const multiplicity = $derived.by(() => {
    const m = new Array(data.length).fill(0);
    for (const i of idx) m[i]++;
    return m;
  });
  const nUnique = $derived(multiplicity.filter((m) => m > 0).length);
  const nOob = $derived(data.length - nUnique);

  const W = 360;
  const H = 250;
  const pad = 20;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, W - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([H - pad, pad]);

  // radius grows with how many times a point was drawn
  function radius(m: number): number {
    return m === 0 ? 4 : 4 + Math.min(m, 5) * 1.8;
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Conjunto original</p>
      <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[36/25]">
        {#each data as p}
          <circle
            cx={xScale(p.x)}
            cy={yScale(p.y)}
            r="5"
            fill={p.label === 1 ? POS : NEG}
            stroke={PAPER}
            stroke-width="1.2"
          />
        {/each}
      </svg>
    </div>

    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Muestra bootstrap</p>
      <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[36/25]">
        {#each data as p, i}
          {@const m = multiplicity[i]}
          <circle
            cx={xScale(p.x)}
            cy={yScale(p.y)}
            r={radius(m)}
            fill={m === 0 ? 'none' : p.label === 1 ? POS : NEG}
            fill-opacity={m === 0 ? 0 : 0.9}
            stroke={m === 0 ? AXIS : PAPER}
            stroke-width={m === 0 ? 1.2 : 1.4}
            stroke-dasharray={m === 0 ? '3 3' : 'none'}
          />
          {#if m > 1}
            <text
              x={xScale(p.x)}
              y={yScale(p.y) + 3.5}
              text-anchor="middle"
              font-size="9"
              fill={PAPER}
              font-weight="600"
            >
              {m}
            </text>
          {/if}
        {/each}
      </svg>
    </div>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-ink">
    <span>
      <strong style="color: {ACCENT}">{nUnique}</strong> únicos ·
      <strong>{nOob}</strong> fuera de bolsa (OOB, {((nOob / data.length) * 100).toFixed(0)}%)
    </span>
    <button
      onclick={() => (seed += 1)}
      class="rounded-md px-4 py-2 text-sm font-medium text-paper"
      style="background-color: {ACCENT}"
    >
      Nueva muestra
    </button>
  </div>
  <p class="text-xs text-muted">
    El tamaño de cada punto indica cuántas veces fue seleccionado. Los puntos punteados nunca
    salieron: son la muestra <em>out-of-bag</em>, útil para estimar el error sin un conjunto de
    validación aparte.
  </p>
</div>
