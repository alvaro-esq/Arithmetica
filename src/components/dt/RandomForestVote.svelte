<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { POS, NEG, ACCENT, PAPER } from '../../lib/svm/colors';
  import { buildForest, forestProba, makeForestAccumulator } from '../../lib/dt/ensemble';
  import { classify } from '../../lib/dt/cart';
  import { gridCells } from '../../lib/viz/grid';
  import type { BuildOpts, LPoint, TreeNode } from '../../lib/dt/types';
  import { moons, xor } from '../../lib/dt/datasets';

  // One jagged, overfit tree vs. dozens averaged: raise the tree count and the
  // boundary visibly smooths. Toggle to overlay individual trees' boundaries (the
  // variance the forest cancels out) or the aggregated soft vote.

  const dom = { xMin: -3, yMin: -3, xMax: 3.6, yMax: 3.6 };
  let datasetName = $state<'moons' | 'xor'>('moons');
  let nTrees = $state(1);
  let maxDepth = $state(6);
  let mode = $state<'vote' | 'trees'>('vote');

  const data = $derived<LPoint[]>(datasetName === 'moons' ? moons(110, 3) : xor(120, 5));
  const opts = $derived<BuildOpts>({ maxDepth, minSamples: 2, minGain: 0, nClasses: 2 });
  // The decorrelated forest uses maxFeatures=1 (random-feature subsampling). An
  // additive accumulator, rebuilt only when the dataset/depth changes, so dragging
  // the tree-count slider grows just the new trees instead of the whole forest.
  const grow = $derived(makeForestAccumulator(data, opts, 42, 1));
  // A lone tree restricted to one feature is degenerate, so when showing a single
  // tree we build one that uses both features (cheap: one tree).
  const singleTreeForest = $derived(buildForest(data, 1, opts, 42, 2));
  const forest = $derived(nTrees === 1 ? singleTreeForest : grow(nTrees));

  const W = 420;
  const pad = 16;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, W - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([W - pad, pad]);
  const GRID = 48;
  const cw = (dom.xMax - dom.xMin) / GRID;

  // Aggregated soft vote → smooth shading (opacity tracks vote confidence).
  const cells = $derived.by(() => {
    if (mode !== 'vote') return [];
    return gridCells(dom, GRID, xScale, yScale).map((c) => {
      const pr = forestProba(forest, { x: c.cx, y: c.cy });
      const conf = Math.abs(pr[1] - 0.5) * 2; // 0 at the boundary, 1 deep inside
      return {
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
        fill: pr[1] >= 0.5 ? POS : NEG,
        op: 0.06 + 0.26 * conf,
      };
    });
  });

  // Individual trees' boundaries (capped for perf), each at low opacity.
  function boundarySegs(tree: TreeNode) {
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const raw: number[] = new Array(GRID * GRID);
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const px = dom.xMin + (gx + 0.5) * cw;
        const py = dom.yMin + (gy + 0.5) * cw;
        raw[gy * GRID + gx] = classify(tree, { x: px, y: py });
      }
    }
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const f = raw[gy * GRID + gx];
        const x0 = dom.xMin + gx * cw;
        const y0 = dom.yMin + gy * cw;
        if (gx + 1 < GRID && f !== raw[gy * GRID + gx + 1]) {
          segs.push({ x1: xScale(x0 + cw), y1: yScale(y0), x2: xScale(x0 + cw), y2: yScale(y0 + cw) });
        }
        if (gy + 1 < GRID && f !== raw[(gy + 1) * GRID + gx]) {
          segs.push({ x1: xScale(x0), y1: yScale(y0 + cw), x2: xScale(x0 + cw), y2: yScale(y0 + cw) });
        }
      }
    }
    return segs;
  }

  const treeBoundaries = $derived.by(() => {
    if (mode !== 'trees') return [];
    return forest.trees.slice(0, 25).map((t) => boundarySegs(t));
  });
</script>

<div class="space-y-4">
  <svg
    viewBox="0 0 {W} {W}"
    preserveAspectRatio="xMidYMid meet"
    class="mx-auto block w-full max-w-lg aspect-square"
  >
    {#each cells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} fill-opacity={c.op} />
    {/each}
    {#each treeBoundaries as segs}
      {#each segs as s}
        <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={ACCENT} stroke-width="1" opacity="0.18" />
      {/each}
    {/each}
    {#each data as p}
      <circle
        cx={xScale(p.x)}
        cy={yScale(p.y)}
        r="4.5"
        fill={p.label === 1 ? POS : NEG}
        stroke={PAPER}
        stroke-width="1.1"
      />
    {/each}
  </svg>

  <label class="block text-sm font-medium text-ink">
    Número de árboles: {nTrees}
    <input type="range" bind:value={nTrees} min="1" max="50" step="1" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <div class="flex gap-2 text-sm">
      <button
        onclick={() => (mode = 'vote')}
        class="rounded-md px-3 py-2 font-medium"
        style="background-color: {mode === 'vote' ? ACCENT : 'transparent'}; color: {mode === 'vote'
          ? PAPER
          : NEG}; border: 1px solid {ACCENT}"
      >
        Voto agregado
      </button>
      <button
        onclick={() => (mode = 'trees')}
        class="rounded-md px-3 py-2 font-medium"
        style="background-color: {mode === 'trees' ? ACCENT : 'transparent'}; color: {mode === 'trees'
          ? PAPER
          : NEG}; border: 1px solid {ACCENT}"
      >
        Árboles individuales
      </button>
    </div>
    <select
      bind:value={datasetName}
      class="rounded border border-line bg-paper px-2 py-1.5 text-sm"
    >
      <option value="moons">Dos lunas</option>
      <option value="xor">XOR</option>
    </select>
    <label class="ml-auto flex items-center gap-2 text-sm text-ink">
      Prof. máx.
      <input type="range" bind:value={maxDepth} min="2" max="10" step="1" class="w-28 accent-interactive" />
      {maxDepth}
    </label>
  </div>
  <p class="text-xs text-muted">
    {#if mode === 'trees'}
      Cada línea es la frontera de un árbol individual (hasta 25 mostradas): ruidosas y muy
      distintas entre sí.
    {:else}
      El voto promedio de los {nTrees} árboles produce una frontera suave. Aumenta el número de
      árboles para ver cómo se estabiliza.
    {/if}
  </p>
</div>
