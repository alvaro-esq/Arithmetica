<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { POS, NEG, ACCENT, AXIS, PAPER } from '../../lib/svm/colors';
  import { gini, tally } from '../../lib/dt/impurity';
  import { growStep, classify, treeStats } from '../../lib/dt/cart';
  import { layoutTree } from '../../lib/dt/layout';
  import type { BuildOpts, LPoint, TreeNode } from '../../lib/dt/types';
  import { moons, xor, blobs } from '../../lib/dt/datasets';
  import { gridCells } from '../../lib/viz/grid';
  import Celebrate from '../ui/Celebrate.svelte';

  // "Grow the tree" one greedy split at a time. Watch the partition refine and the
  // tree deepen; the stopping-criteria sliders show exactly when growth halts.

  const dom = { xMin: -3, yMin: -3, xMax: 3.6, yMax: 3.6 };
  let datasetName = $state<'moons' | 'xor' | 'blobs'>('moons');
  let maxDepth = $state(4);
  let minSamples = $state(4);
  let minGain = $state(0.0);

  const data = $derived<LPoint[]>(
    datasetName === 'moons' ? moons(90, 3) : datasetName === 'xor' ? xor(100, 5) : blobs(70, 1),
  );
  const opts = $derived<BuildOpts>({ maxDepth, minSamples, minGain, nClasses: 2 });

  function rootLeaf(d: LPoint[]): TreeNode {
    const counts = tally(d, 2);
    return {
      kind: 'leaf',
      prediction: counts[1] >= counts[0] ? 1 : 0,
      counts,
      n: d.length,
      depth: 0,
      impurity: gini(counts),
    };
  }

  let tree = $state<TreeNode>(rootLeaf(moons(90, 3)));
  let justSplit = $state<TreeNode | null>(null);
  let exhausted = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let playing = $state(false);

  let celebrate = $state(false);
  let celebrated = false; // fire the milestone once per grown tree

  // Reset whenever the dataset or any stopping criterion changes.
  $effect(() => {
    datasetName;
    maxDepth;
    minSamples;
    minGain;
    stop();
    tree = rootLeaf(data);
    justSplit = null;
    exhausted = false;
    celebrate = false;
    celebrated = false;
  });

  function step() {
    const res = growStep(tree, data, opts);
    if (!res.splitAt) {
      exhausted = true;
      stop();
      return false;
    }
    tree = res.tree;
    justSplit = res.splitAt;
    return true;
  }

  function play() {
    if (exhausted || playing) return; // re-entrancy guard
    playing = true;
    const tick = () => {
      if (!playing) return;
      const grew = step();
      // Capture the timeout id so stop()/cleanup can actually cancel it.
      if (grew) timer = setTimeout(tick, 550);
    };
    tick();
  }
  function stop() {
    playing = false;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }
  $effect(() => () => stop());

  const stats = $derived(treeStats(tree));
  const accuracy = $derived(
    data.filter((p) => classify(tree, p) === p.label).length / (data.length || 1),
  );

  // Celebration is reserved for the genuine peak: a tree that classifies every
  // point. Fire once per grown tree.
  $effect(() => {
    if (!celebrated && stats.depth > 0 && accuracy >= 0.999) {
      celebrated = true;
      celebrate = true;
    }
  });

  const stopReason = $derived.by(() => {
    if (!exhausted) return null;
    // Inspect the frontier leaves (routing the data to each) and report which
    // criterion actually blocked further growth — not just whichever check
    // happened to come first.
    let impure = 0;
    let blockedByDepth = false;
    let blockedBySamples = false;
    function visit(node: TreeNode, pts: LPoint[]) {
      if (node.kind === 'split') {
        const lp = pts.filter((p) => (node.feature === 0 ? p.x : p.y) <= node.threshold);
        const rp = pts.filter((p) => (node.feature === 0 ? p.x : p.y) > node.threshold);
        visit(node.left, lp);
        visit(node.right, rp);
        return;
      }
      if (node.impurity < 1e-12) return; // pure leaf, nothing to split
      impure++;
      if (node.depth >= maxDepth) blockedByDepth = true;
      else if (pts.length < minSamples) blockedBySamples = true;
    }
    visit(tree, data);
    if (impure === 0) return 'todos los nodos son puros';
    if (blockedByDepth) return `profundidad máxima (${maxDepth}) alcanzada`;
    if (blockedBySamples) return `mínimo de muestras (${minSamples}) por nodo`;
    return 'ningún corte supera la ganancia mínima';
  });

  // --- region plot ----------------------------------------------------------
  const W = 360;
  const pad = 16;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, W - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([W - pad, pad]);
  const GRID = 44;

  const cells = $derived.by(() =>
    gridCells(dom, GRID, xScale, yScale).map((c) => ({
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
      fill: classify(tree, { x: c.cx, y: c.cy }) === 1 ? POS : NEG,
    })),
  );

  // --- tree diagram ---------------------------------------------------------
  const TW = 360;
  const TH = 300;
  const layout = $derived(layoutTree(tree, TW, TH, 26));
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Regiones de decisión</p>
      <svg viewBox="0 0 {W} {W}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-square">
        {#each cells as c}
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} fill-opacity="0.13" />
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
    </div>

    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-muted">Árbol</p>
      <svg viewBox="0 0 {TW} {TH}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[6/5]">
        {#each layout.edges as e}
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={AXIS} stroke-width="1.4" />
        {/each}
        {#each layout.nodes as nb}
          {@const isNew = nb.node === justSplit}
          {#if nb.node.kind === 'split'}
            <rect
              x={nb.x - 34}
              y={nb.y - 12}
              width="68"
              height="24"
              rx="6"
              fill={PAPER}
              stroke={ACCENT}
              stroke-width={isNew ? 3 : 1.6}
              opacity={isNew ? 1 : 0.9}
            />
            <text x={nb.x} y={nb.y + 4} text-anchor="middle" font-size="11" fill={NEG}>
              {nb.node.feature === 0 ? 'x' : 'y'} ≤ {nb.node.threshold.toFixed(1)}
            </text>
          {:else}
            <circle
              cx={nb.x}
              cy={nb.y}
              r="9"
              fill={nb.node.prediction === 1 ? POS : NEG}
              opacity="0.85"
            />
          {/if}
        {/each}
      </svg>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <button
      onclick={step}
      disabled={exhausted}
      class="rounded-md px-4 py-2 text-sm font-medium text-paper shadow-card hover:bg-interactive-soft hover:shadow-card-hover disabled:opacity-40 disabled:shadow-none"
      style="background-color: {ACCENT}"
    >
      Siguiente división
    </button>
    <button
      onclick={playing ? stop : play}
      disabled={exhausted}
      class="rounded-md px-4 py-2 text-sm font-medium hover:bg-interactive hover:text-paper disabled:opacity-40"
      style="border: 1px solid {ACCENT}; color: {NEG}"
    >
      {playing ? 'Pausar' : 'Auto'}
    </button>
    <select
      bind:value={datasetName}
      class="rounded border border-line bg-paper px-2 py-1.5 text-sm hover:border-interactive"
    >
      <option value="moons">Dos lunas</option>
      <option value="xor">XOR</option>
      <option value="blobs">Dos grupos</option>
    </select>
    <span class="text-sm text-ink">
      Prof. <strong>{stats.depth}</strong> · Hojas <strong>{stats.leaves}</strong> · Precisión
      <strong style="color: {accuracy >= 0.999 ? 'var(--c-success)' : ACCENT}"
        >{(accuracy * 100).toFixed(0)}%</strong
      >
    </span>
    <Celebrate active={celebrate} label="¡Árbol perfecto!" />
  </div>

  {#if stopReason}
    <p class="text-xs text-muted">Crecimiento detenido: {stopReason}.</p>
  {/if}

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <label class="block text-sm font-medium text-ink">
      Profundidad máx.: {maxDepth}
      <input type="range" bind:value={maxDepth} min="1" max="7" step="1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Mín. muestras: {minSamples}
      <input type="range" bind:value={minSamples} min="2" max="20" step="1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Ganancia mín.: {minGain.toFixed(2)}
      <input type="range" bind:value={minGain} min="0" max="0.2" step="0.01" class="mt-1 w-full accent-interactive" />
    </label>
  </div>
</div>
