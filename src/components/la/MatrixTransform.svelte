<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED } from '../../lib/svm/colors';
  import type { V2 } from '../../lib/la/vec2';
  import { type Mat2, det, gridLines, unitSquare, lerpMat, mulVec, IDENTITY, MAT_PRESETS } from '../../lib/la/mat2';
  import { GLYPH_F } from '../../lib/la/glyph';

  // The columns of A are draggable arrows: column 1 is where ê₁ lands, column 2
  // where ê₂ lands. Drag them (or type entries) and the whole grid, the glyph
  // and the unit square follow. det(A) is the signed area of that square.

  // cols[0] = A·ê₁ = first column, cols[1] = A·ê₂ = second column.
  let cols = $state<V2[]>([
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ]);
  let A = $derived<Mat2>([
    [cols[0].x, cols[1].x],
    [cols[0].y, cols[1].y],
  ]);
  let detA = $derived(det(A));
  let collapsedA = $derived(Math.abs(detA) < 0.05);

  const dom: Domain = { xMin: -3.2, xMax: 3.2, yMin: -2.6, yMax: 2.6 };
  const width = 600;
  const height = 480;
  const pad = 10;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);
  const O = { x: xScale(0), y: yScale(0) };
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });

  // Preset animation: tween a progress scalar and interpolate matrices; the
  // effect writes back into the draggable columns so drag and animation share
  // one source of truth.
  const animT = new Tween(1, { duration: 700, easing: cubicOut });
  let animFrom = $state<Mat2 | null>(null);
  let animTo = $state<Mat2 | null>(null);
  function applyPreset(M: Mat2) {
    animFrom = A;
    animTo = M;
    animT.set(0, { duration: 0 });
    animT.set(1);
  }
  // A drag or a typed entry takes over: stop the preset animation or its effect
  // would overwrite the user's input on every tween frame.
  function cancelPreset() {
    animFrom = null;
    animTo = null;
  }
  $effect(() => {
    const t = animT.current;
    if (!animFrom || !animTo) return;
    const M = lerpMat(animFrom, animTo, t);
    cols[0] = { x: M[0][0], y: M[1][0] };
    cols[1] = { x: M[0][1], y: M[1][1] };
    if (t === 1) {
      animFrom = null;
      animTo = null;
    }
  });

  function setEntry(i: 0 | 1, j: 0 | 1, value: number) {
    if (Number.isNaN(value)) return;
    cancelPreset();
    // Entry (i, j) lives in column j: x is row 0, y is row 1.
    const c = { ...cols[j] };
    if (i === 0) c.x = value;
    else c.y = value;
    cols[j] = c;
  }

  let grid = $derived(gridLines(A, 4, 0.5));
  const gridStatic = gridLines(IDENTITY, 4, 0.5);
  let square = $derived(unitSquare(A));
  let glyph = $derived(GLYPH_F.map((p) => mulVec(A, p)));

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points: cols,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => {
      dragIndex = i;
      if (i >= 0) cancelPreset();
    },
  });
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none animate-fade-up"
  >
    <defs>
      <marker id="mt-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={POS} />
      </marker>
      <marker id="mt-neg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={NEG} />
      </marker>
      <clipPath id="mt-clip"><rect x={pad} y={pad} width={width - 2 * pad} height={height - 2 * pad} /></clipPath>
    </defs>

    <g clip-path="url(#mt-clip)">
      <!-- original grid, faint -->
      {#each gridStatic as seg}
        <line x1={xScale(seg[0].x)} y1={yScale(seg[0].y)} x2={xScale(seg[1].x)} y2={yScale(seg[1].y)} stroke={AXIS} stroke-width="1" opacity="0.35" />
      {/each}
      <!-- transformed grid -->
      {#each grid as seg}
        <line x1={xScale(seg[0].x)} y1={yScale(seg[0].y)} x2={xScale(seg[1].x)} y2={yScale(seg[1].y)} stroke={ACCENT} stroke-width="1" opacity="0.3" />
      {/each}

      <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
      <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

      <!-- image of the unit square: det(A) is its signed area -->
      <polygon
        points={square.map((p) => `${px(p).x},${px(p).y}`).join(' ')}
        fill={detA >= 0 ? POS : NEG}
        fill-opacity="0.16"
        stroke={detA >= 0 ? POS : NEG}
        stroke-width="1.5"
      />

      <!-- transformed glyph -->
      <polygon points={glyph.map((p) => `${px(p).x},${px(p).y}`).join(' ')} fill={ACCENT} fill-opacity="0.14" stroke={ACCENT} stroke-width="1.5" />

      <!-- column arrows (draggable) -->
      <line x1={O.x} y1={O.y} x2={px(cols[0]).x} y2={px(cols[0]).y} stroke={POS} stroke-width="3.5" marker-end="url(#mt-pos)" />
      <line x1={O.x} y1={O.y} x2={px(cols[1]).x} y2={px(cols[1]).y} stroke={NEG} stroke-width="3.5" marker-end="url(#mt-neg)" />
      <text x={px(cols[0]).x + 10} y={px(cols[0]).y - 8} font-size="13" font-weight="700" fill={POS}>A·ê₁</text>
      <text x={px(cols[1]).x + 10} y={px(cols[1]).y - 8} font-size="13" font-weight="700" fill={NEG}>A·ê₂</text>
      {#each cols as p, i}
        <circle
          cx={px(p).x}
          cy={px(p).y}
          r={dragIndex === i ? 13 : 10}
          fill={i === 0 ? POS : NEG}
          fill-opacity="0.25"
          stroke={i === 0 ? POS : NEG}
          stroke-width="2"
          style="cursor: {dragIndex === i ? 'grabbing' : 'grab'}; touch-action: none;"
          data-drag-index={i}
        />
      {/each}
    </g>
  </svg>

  <p class="text-xs text-muted">
    Arrastra las puntas de <strong style="color:{POS}">A·ê₁</strong> y <strong style="color:{NEG}">A·ê₂</strong> — las columnas de la matriz — y observa cómo se deforman la cuadrícula, la letra y el cuadrado unitario.
  </p>

  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <div class="flex items-center gap-2 text-ink">
      <span class="text-2xl font-light" aria-hidden="true">(</span>
      <div class="grid grid-cols-2 gap-1">
        <input type="number" step="0.1" value={Number(A[0][0].toFixed(2))} oninput={(e) => setEntry(0, 0, e.currentTarget.valueAsNumber)} class="w-16 rounded border border-line bg-paper-raised px-1 py-0.5 text-center text-sm tabular-nums" aria-label="entrada a" />
        <input type="number" step="0.1" value={Number(A[0][1].toFixed(2))} oninput={(e) => setEntry(0, 1, e.currentTarget.valueAsNumber)} class="w-16 rounded border border-line bg-paper-raised px-1 py-0.5 text-center text-sm tabular-nums" aria-label="entrada b" />
        <input type="number" step="0.1" value={Number(A[1][0].toFixed(2))} oninput={(e) => setEntry(1, 0, e.currentTarget.valueAsNumber)} class="w-16 rounded border border-line bg-paper-raised px-1 py-0.5 text-center text-sm tabular-nums" aria-label="entrada c" />
        <input type="number" step="0.1" value={Number(A[1][1].toFixed(2))} oninput={(e) => setEntry(1, 1, e.currentTarget.valueAsNumber)} class="w-16 rounded border border-line bg-paper-raised px-1 py-0.5 text-center text-sm tabular-nums" aria-label="entrada d" />
      </div>
      <span class="text-2xl font-light" aria-hidden="true">)</span>
    </div>
    <span class="text-sm text-ink">
      det A = <strong style="color:{detA >= 0 ? POS : NEG}">{detA.toFixed(2)}</strong>
      {#if collapsedA}
        <span class="font-medium" style="color:{MUTED}"> — ¡colapso! el plano se aplasta a una recta</span>
      {:else if detA < 0}
        <span style="color:{MUTED}"> (negativo: la orientación se voltea)</span>
      {/if}
    </span>
  </div>

  <div class="flex flex-wrap gap-2 text-sm">
    {#each MAT_PRESETS as p (p.id)}
      <button onclick={() => applyPreset(p.A)} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">{p.label}</button>
    {/each}
  </div>
</div>
