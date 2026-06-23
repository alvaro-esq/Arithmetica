<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { clientToData, clamp } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, PAPER } from '../../lib/svm/colors';
  import { gini, tally } from '../../lib/dt/impurity';
  import { classify } from '../../lib/dt/cart';
  import { layoutTree } from '../../lib/dt/layout';
  import type { Feature, LPoint, TreeNode } from '../../lib/dt/types';
  import { mulberry32, makeGaussian } from '../../lib/svm/prng';

  // A fixed depth-2 tree whose three thresholds the user drags directly on the
  // region plot. Both the 2D partition AND the tree diagram redraw live, making
  // the duality "a tree IS an axis-aligned partition" tangible.

  const dom = { xMin: -4, yMin: -4, xMax: 4, yMax: 4 };
  let data = $state<LPoint[]>(makeData());

  // Four tight clusters at (±2, ±2) with a checkerboard (XOR) label: diagonal
  // quadrants share a class. This is *exactly* separable by the default depth-2
  // structure (root splits x at 0, each child splits y at 0), so dragging the
  // three lines toward the quadrant gaps drives the accuracy to 100% — the whole
  // point of the demo. Labels follow position, so the readout rewards good cuts.
  function makeData(): LPoint[] {
    const rng = mulberry32(31);
    const g = makeGaussian(rng);
    const out: LPoint[] = [];
    const quadrants = [
      { cx: 2, cy: 2, label: 1 },
      { cx: -2, cy: -2, label: 1 },
      { cx: -2, cy: 2, label: 0 },
      { cx: 2, cy: -2, label: 0 },
    ];
    for (let i = 0; i < 40; i++) {
      const q = quadrants[i % 4];
      out.push({ x: g(q.cx, 0.55), y: g(q.cy, 0.55), label: q.label });
    }
    return out;
  }

  // The three split parameters: root, then the two children. Defaults start
  // slightly off the quadrant gaps so there is something to fine-tune toward 100%.
  let rootFeature = $state<Feature>(0);
  let rootThr = $state(0.6);
  let leftFeature = $state<Feature>(1);
  let leftThr = $state(0.6);
  let rightFeature = $state<Feature>(1);
  let rightThr = $state(-0.6);

  // Build the tree from the live parameters (predictions = majority at each leaf).
  function leafOf(pts: LPoint[], depth: number): TreeNode {
    const counts = tally(pts, 2);
    const pred = counts[1] >= counts[0] ? 1 : 0;
    return { kind: 'leaf', prediction: pred, counts, n: pts.length, depth, impurity: gini(counts) };
  }
  function partition(pts: LPoint[], f: Feature, thr: number): [LPoint[], LPoint[]] {
    const l: LPoint[] = [];
    const r: LPoint[] = [];
    for (const p of pts) ((f === 0 ? p.x : p.y) <= thr ? l : r).push(p);
    return [l, r];
  }

  const tree = $derived.by<TreeNode>(() => {
    const [rl, rr] = partition(data, rootFeature, rootThr);
    const [ll, lr] = partition(rl, leftFeature, leftThr);
    const [rrl, rrr] = partition(rr, rightFeature, rightThr);
    const rootCounts = tally(data, 2);
    return {
      kind: 'split',
      feature: rootFeature,
      threshold: rootThr,
      depth: 0,
      impurity: gini(rootCounts),
      gain: 0,
      n: data.length,
      counts: rootCounts,
      left: {
        kind: 'split',
        feature: leftFeature,
        threshold: leftThr,
        depth: 1,
        impurity: gini(tally(rl, 2)),
        gain: 0,
        n: rl.length,
        counts: tally(rl, 2),
        left: leafOf(ll, 2),
        right: leafOf(lr, 2),
      },
      right: {
        kind: 'split',
        feature: rightFeature,
        threshold: rightThr,
        depth: 1,
        impurity: gini(tally(rr, 2)),
        gain: 0,
        n: rr.length,
        counts: tally(rr, 2),
        left: leafOf(rrl, 2),
        right: leafOf(rrr, 2),
      },
    };
  });

  const accuracy = $derived(
    data.filter((p) => classify(tree, p) === p.label).length / (data.length || 1),
  );

  // --- region plot ----------------------------------------------------------
  const W = 360;
  const pad = 18;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, W - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([W - pad, pad]);
  const GRID = 40;
  const cw = (dom.xMax - dom.xMin) / GRID;

  const cells = $derived.by(() => {
    const out: { x: number; y: number; w: number; h: number; fill: string }[] = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const px = dom.xMin + (gx + 0.5) * cw;
        const py = dom.yMin + (gy + 0.5) * cw;
        const c = classify(tree, { x: px, y: py });
        const x0 = dom.xMin + gx * cw;
        const y0 = dom.yMin + gy * cw;
        out.push({
          x: xScale(x0),
          y: yScale(y0 + cw),
          w: xScale(x0 + cw) - xScale(x0) + 0.6,
          h: yScale(y0) - yScale(y0 + cw) + 0.6,
          fill: c === 1 ? POS : NEG,
        });
      }
    }
    return out;
  });

  // The three split lines as draggable handles. Each carries which parameter it sets.
  type Handle = { id: string; feature: Feature; thr: number; lo: number; hi: number };
  const handles = $derived<Handle[]>(
    (() => {
      const list: Handle[] = [{ id: 'root', feature: rootFeature, thr: rootThr, lo: dom.xMin, hi: dom.xMax }];
      // child lines are clipped to their parent region for honesty
      if (rootFeature === 0) {
        list.push({ id: 'left', feature: leftFeature, thr: leftThr, lo: dom.yMin, hi: dom.yMax });
        list.push({ id: 'right', feature: rightFeature, thr: rightThr, lo: dom.yMin, hi: dom.yMax });
      } else {
        list.push({ id: 'left', feature: leftFeature, thr: leftThr, lo: dom.xMin, hi: dom.xMax });
        list.push({ id: 'right', feature: rightFeature, thr: rightThr, lo: dom.xMin, hi: dom.xMax });
      }
      return list;
    })(),
  );

  let dragId = $state<string | null>(null);
  let svgEl: SVGSVGElement;

  function setThr(id: string, value: number) {
    if (id === 'root') rootThr = value;
    else if (id === 'left') leftThr = value;
    else rightThr = value;
  }
  function featureOf(id: string): Feature {
    return id === 'root' ? rootFeature : id === 'left' ? leftFeature : rightFeature;
  }

  function onDown(e: PointerEvent) {
    const id = (e.target as Element)?.getAttribute('data-handle');
    if (!id) return;
    dragId = id;
    svgEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e: PointerEvent) {
    if (!dragId) return;
    const d = clientToData(svgEl, e.clientX, e.clientY, W, W, xScale, yScale);
    const f = featureOf(dragId);
    const v = f === 0 ? clamp(d.x, dom.xMin, dom.xMax) : clamp(d.y, dom.yMin, dom.yMax);
    setThr(dragId, v);
  }
  function onUp(e: PointerEvent) {
    // Only release a pointer we actually captured — releasing an uncaptured
    // pointer (e.g. a second touch) throws a DOMException and would strand the drag.
    if (dragId && svgEl.hasPointerCapture?.(e.pointerId)) {
      svgEl.releasePointerCapture(e.pointerId);
    }
    dragId = null;
  }

  // line geometry for a handle: vertical if feature x, horizontal if feature y
  function lineCoords(h: Handle) {
    if (h.feature === 0) {
      return { x1: xScale(h.thr), y1: pad, x2: xScale(h.thr), y2: W - pad, vertical: true };
    }
    return { x1: pad, y1: yScale(h.thr), x2: W - pad, y2: yScale(h.thr), vertical: false };
  }

  // --- tree diagram ---------------------------------------------------------
  const TW = 360;
  const TH = 300;
  const layout = $derived(layoutTree(tree, TW, TH, 30));
  function nodeLabel(n: TreeNode): string {
    return n.kind === 'split' ? `${n.feature === 0 ? 'x' : 'y'} ≤ ${n.threshold.toFixed(1)}` : '';
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <!-- region plot -->
    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-[#888]">Particiones del plano</p>
      <svg
        bind:this={svgEl}
        onpointerdown={onDown}
        onpointermove={onMove}
        onpointerup={onUp}
        onpointercancel={onUp}
        viewBox="0 0 {W} {W}"
        preserveAspectRatio="xMidYMid meet"
        class="w-full touch-none select-none aspect-square"
      >
        {#each cells as c}
          <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} fill-opacity="0.13" />
        {/each}
        <!-- split lines (draggable) -->
        {#each handles as h}
          {@const L = lineCoords(h)}
          <line x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2} stroke={ACCENT} stroke-width="2.5" />
          <!-- fat invisible hit target -->
          <line
            x1={L.x1}
            y1={L.y1}
            x2={L.x2}
            y2={L.y2}
            stroke="transparent"
            stroke-width="18"
            data-handle={h.id}
            style="cursor: {L.vertical ? 'ew-resize' : 'ns-resize'}"
          />
          <circle
            cx={(L.x1 + L.x2) / 2}
            cy={(L.y1 + L.y2) / 2}
            r={dragId === h.id ? 8 : 6}
            fill={ACCENT}
            stroke={PAPER}
            stroke-width="2"
            data-handle={h.id}
            style="cursor: {L.vertical ? 'ew-resize' : 'ns-resize'}"
          />
        {/each}
        <!-- data points -->
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

    <!-- tree diagram -->
    <div class="space-y-2">
      <p class="text-xs font-medium uppercase tracking-wide text-[#888]">Árbol equivalente</p>
      <svg viewBox="0 0 {TW} {TH}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[6/5]">
        {#each layout.edges as e}
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={AXIS} stroke-width="1.5" />
          <text
            x={(e.x1 + e.x2) / 2}
            y={(e.y1 + e.y2) / 2 - 3}
            text-anchor="middle"
            font-size="12"
            fill="#999"
          >
            {e.label}
          </text>
        {/each}
        {#each layout.nodes as nb}
          {#if nb.node.kind === 'split'}
            <rect
              x={nb.x - 38}
              y={nb.y - 13}
              width="76"
              height="26"
              rx="6"
              fill={PAPER}
              stroke={ACCENT}
              stroke-width="1.8"
            />
            <text x={nb.x} y={nb.y + 4} text-anchor="middle" font-size="12" fill={NEG}>
              {nodeLabel(nb.node)}
            </text>
          {:else}
            <rect
              x={nb.x - 13}
              y={nb.y - 13}
              width="26"
              height="26"
              rx="5"
              fill={nb.node.prediction === 1 ? POS : NEG}
              opacity="0.85"
            />
          {/if}
        {/each}
      </svg>
    </div>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-ink">
    <span>
      Precisión sobre los datos:
      <strong style="color: {ACCENT}">{(accuracy * 100).toFixed(0)}%</strong>
    </span>
    <div class="flex gap-2">
      <button
        onclick={() => {
          rootFeature = rootFeature === 0 ? 1 : 0;
        }}
        class="rounded-md px-3 py-2 text-sm font-medium"
        style="border: 1px solid {ACCENT}; color: {NEG}"
      >
        Eje del corte raíz: {rootFeature === 0 ? 'x' : 'y'}
      </button>
    </div>
  </div>
  <p class="text-xs text-[#666]">
    Arrastra las líneas azules: cada una es un nodo del árbol. Mueve el corte raíz y observa
    cómo se reorganiza todo el árbol y la partición a la vez.
  </p>
</div>
