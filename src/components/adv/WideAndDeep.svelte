<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { gridCells } from '../../lib/viz/grid';
  import { type Domain } from '../../lib/svm/geometry';
  import { predict, wdDataset, accuracy, type Mode } from '../../lib/adv/widedeep';
  import { POS, NEG, ACCENT, SUCCESS, AXIS, PAPER, MUTED, INK } from '../../lib/svm/colors';

  // Wide & Deep on a tabular-style 2-D decision. The "wide" part memorizes explicit
  // feature crosses (the checkerboard rule x·y > 0); the "deep" part is a smooth MLP
  // that generalizes a diagonal trend. The true labels mix both, so neither part
  // alone wins — combining their logits, ŷ = σ(w_wideᵀx_wide + w_deepᵀh_deep), does.

  const data = wdDataset(11);

  let mode = $state<Mode>('both');
  let crosses = $state(true);

  const dom: Domain = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
  const width = 420;
  const height = 420;
  const pad = 28;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  const baseCells = gridCells(dom, 46, xScale, yScale);
  // shade each cell by the active model's probability: copper for class 1, slate for 0
  let cells = $derived(
    baseCells.map((c) => {
      const p = predict({ x: c.cx, y: c.cy }, mode, crosses);
      return { x: c.x, y: c.y, w: c.w, h: c.h, fill: p > 0.5 ? POS : NEG, t: Math.abs(p - 0.5) * 2 };
    }),
  );
  let acc = $derived(accuracy(data, mode, crosses));

  const MODES: { key: Mode; label: string }[] = [
    { key: 'wide', label: 'Wide' },
    { key: 'deep', label: 'Deep' },
    { key: 'both', label: 'Wide + Deep' },
  ];
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-square">
    {#each cells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} fill-opacity={0.06 + c.t * 0.22} />
    {/each}

    <!-- labeled data points -->
    {#each data as p}
      <circle cx={xScale(p.x)} cy={yScale(p.y)} r="4.5" fill={p.label === 1 ? POS : NEG} stroke={PAPER} stroke-width="1.3" />
    {/each}
  </svg>

  <!-- accuracy meter -->
  <div class="space-y-1">
    <div class="flex items-center justify-between text-sm">
      <span class="text-ink">Exactitud en los datos: <strong style="color: {acc > 0.8 ? SUCCESS : INK}">{(acc * 100).toFixed(0)}%</strong></span>
      <span class="text-muted">modo: <strong style="color: {ACCENT}">{MODES.find((m) => m.key === mode)?.label}</strong></span>
    </div>
    <div class="h-2 w-full overflow-hidden rounded-full" style="background-color: {AXIS}">
      <div class="h-full rounded-full" style="width: {acc * 100}%; background-color: {SUCCESS}"></div>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="text-sm font-medium text-ink">
      Modelo:
      <span class="mt-1 inline-flex overflow-hidden rounded-md border" style="border-color: {AXIS}">
        {#each MODES as m}
          <button class="px-3 py-1.5 text-sm" style={mode === m.key ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (mode = m.key)}>{m.label}</button>
        {/each}
      </span>
    </div>
    <div class="text-sm font-medium text-ink">
      Cruces de features (parte wide):
      <span class="mt-1 inline-flex overflow-hidden rounded-md border" style="border-color: {AXIS}">
        <button class="px-3 py-1.5 text-sm" style={crosses ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (crosses = true)} disabled={mode === 'deep'}>activados</button>
        <button class="px-3 py-1.5 text-sm" style={!crosses ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (crosses = false)} disabled={mode === 'deep'}>desactivados</button>
      </span>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {SUCCESS}; color: {PAPER}">
      wide memoriza reglas · deep generaliza · juntas, lo mejor de ambas
    </span>
  </div>
  <p class="text-xs text-muted">La parte <strong>wide</strong> con cruces memoriza el patrón tipo tablero (regiones a parches); la parte <strong>deep</strong> traza una frontera suave que generaliza. La etiqueta real mezcla ambos, así que <strong>Wide + Deep</strong> acierta más que cualquiera por separado.</p>
</div>
