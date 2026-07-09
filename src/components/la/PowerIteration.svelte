<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, WARN, BORDER } from '../../lib/svm/colors';
  import { norm, type V2 } from '../../lib/la/vec2';
  import { type Mat2, rotation, mulMat } from '../../lib/la/mat2';
  import { eigen2, powerIterTrace, type PowerStep } from '../../lib/la/eigen2';
  import { stepLoop } from '../../lib/viz/stepper';

  // Multiply by A over and over: the direction forgets where it started and
  // locks onto the dominant eigenvector, while the LENGTH grows like |λ₁|ᵏ —
  // the same mechanism that makes deep-network gradients explode or vanish.

  interface PIPreset {
    id: string;
    label: string;
    A: Mat2;
  }
  const scaledRot = mulMat([[1.06, 0], [0, 1.06]], rotation(0.45)) as Mat2;
  const PRESETS: PIPreset[] = [
    { id: 'expansiva', label: 'Expansiva (|λ₁| > 1)', A: [[1.3, 0.4], [0.4, 0.9]] },
    { id: 'contractiva', label: 'Contractiva (|λ₁| < 1)', A: [[0.75, 0.25], [0.25, 0.55]] },
    { id: 'giratoria', label: 'Giratoria (compleja)', A: scaledRot },
  ];
  let presetId = $state('expansiva');
  let A = $derived(PRESETS.find((p) => p.id === presetId)!.A);
  let eig = $derived(eigen2(A));

  let handle = $state<V2[]>([{ x: -1.4, y: 1.4 }]);
  let v0 = $derived.by<V2>(() => {
    const n = norm(handle[0]);
    return n < 1e-9 ? { x: 1, y: 0 } : { x: handle[0].x / n, y: handle[0].y / n };
  });

  const TOTAL = 22;
  let trace = $derived<PowerStep[]>(powerIterTrace(A, v0, TOTAL));
  let shown = $state(0);
  let running = $state(false);
  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 180,
      total: TOTAL,
      step: () => (shown += 1),
      onDone: () => (running = false),
    });
  });
  function iterate() {
    shown = 0;
    running = true;
  }
  // Any change of matrix or start vector invalidates the animation.
  $effect(() => {
    presetId;
    v0.x;
    v0.y;
    shown = 0;
    running = false;
  });

  let visible = $derived(trace.slice(0, shown));
  let current = $derived(visible.length ? visible[visible.length - 1] : null);
  // log₁₀ ‖Aᵏv₀‖ accumulates the per-step growth factors.
  let logNorms = $derived.by(() => {
    let acc = 0;
    return visible.map((s) => {
      acc += Math.log10(Math.max(s.growth, 1e-12));
      return acc;
    });
  });

  const dom: Domain = { xMin: -2.4, xMax: 2.4, yMin: -2, yMax: 2 };
  const width = 420;
  const height = 380;
  const pad = 8;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);
  const O = { x: xScale(0), y: yScale(0) };
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });
  const R = Math.abs(xScale(1) - xScale(0));

  const barW = 200;
  const barH = 380;
  const logScale = scaleLinear().domain([-3, 3]).range([barH - 30, 20]);

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points: handle,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center gap-2 text-sm">
    {#each PRESETS as p (p.id)}
      <button
        onclick={() => (presetId = p.id)}
        class="rounded-md border px-3 py-1.5 font-medium hover:bg-paper-raised"
        style="border-color:{presetId === p.id ? ACCENT : BORDER}; color:{presetId === p.id ? ACCENT : 'inherit'}"
      >
        {p.label}
      </button>
    {/each}
    <button onclick={iterate} disabled={running} class="ml-auto rounded-md px-4 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft disabled:opacity-60" style="background-color:{ACCENT}">
      {running ? 'Iterando…' : 'Iterar ×22'}
    </button>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-[2fr,1fr]">
    <svg
      use:draggablePoints={dragCfg}
      viewBox="0 0 {width} {height}"
      preserveAspectRatio="xMidYMid meet"
      class="w-full touch-none select-none animate-fade-up"
    >
      <defs>
        <marker id="pi-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
        </marker>
        <marker id="pi-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={POS} />
        </marker>
      </defs>

      <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1" />
      <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1" />
      <circle cx={O.x} cy={O.y} r={R} fill="none" stroke={AXIS} stroke-dasharray="3 5" />

      <!-- dominant eigen-direction (target), when it exists -->
      {#if eig.kind === 'real'}
        <line x1={px({ x: 3 * eig.vectors[0].x, y: 3 * eig.vectors[0].y }).x} y1={px({ x: 3 * eig.vectors[0].x, y: 3 * eig.vectors[0].y }).y} x2={px({ x: -3 * eig.vectors[0].x, y: -3 * eig.vectors[0].y }).x} y2={px({ x: -3 * eig.vectors[0].x, y: -3 * eig.vectors[0].y }).y} stroke={SUCCESS} stroke-width="2" stroke-dasharray="7 5" opacity="0.6" />
      {/if}

      <!-- normalized iterates, fading trail -->
      {#each visible as s, k}
        <line x1={O.x} y1={O.y} x2={px(s.v).x} y2={px(s.v).y} stroke={ACCENT} stroke-width={k === visible.length - 1 ? 3 : 1.5} opacity={0.15 + (0.85 * (k + 1)) / Math.max(visible.length, 1)} marker-end={k === visible.length - 1 ? 'url(#pi-acc)' : undefined} />
      {/each}

      <!-- start vector -->
      <line x1={O.x} y1={O.y} x2={px(v0).x} y2={px(v0).y} stroke={POS} stroke-width="2.5" marker-end="url(#pi-pos)" />
      <text x={px(v0).x + 10} y={px(v0).y + 4} font-size="13" font-weight="700" fill={POS}>v₀</text>
      <circle
        cx={px(v0).x}
        cy={px(v0).y}
        r={dragIndex === 0 ? 12 : 9}
        fill={POS}
        fill-opacity="0.25"
        stroke={POS}
        stroke-width="2"
        style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index="0"
      />
    </svg>

    <svg viewBox="0 0 {barW} {barH}" preserveAspectRatio="xMidYMid meet" class="w-full select-none animate-fade-up">
      <text x={barW / 2} y="14" text-anchor="middle" font-size="12" font-weight="600" fill={MUTED}>log₁₀ ‖Aᵏv₀‖</text>
      <line x1="14" y1={logScale(0)} x2={barW - 6} y2={logScale(0)} stroke={AXIS} stroke-width="1.5" />
      {#each logNorms as ln, k}
        <rect
          x={14 + k * ((barW - 24) / TOTAL)}
          y={Math.min(logScale(0), logScale(ln))}
          width={Math.max(2, (barW - 24) / TOTAL - 2)}
          height={Math.abs(logScale(ln) - logScale(0))}
          fill={ln >= 0 ? WARN : NEG}
          opacity="0.85"
        />
      {/each}
      <text x={barW - 6} y={logScale(2.6)} text-anchor="end" font-size="10" fill={MUTED}>explota</text>
      <text x={barW - 6} y={logScale(-2.6)} text-anchor="end" font-size="10" fill={MUTED}>se desvanece</text>
    </svg>
  </div>

  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
    <span class="text-xs text-muted">Arrastra <strong style="color:{POS}">v₀</strong> y pulsa «Iterar»: cada paso aplica A y renormaliza la dirección.</span>
    {#if current}
      <span>paso {visible.length} · Rayleigh: <strong style="color:{ACCENT}">{current.lambda.toFixed(3)}</strong></span>
    {/if}
    <span class="ml-auto font-medium" style="color:{MUTED}">
      {#if eig.kind === 'real'}
        λ₁ = {eig.values[0].toFixed(3)} — la dirección converge a la línea verde
      {:else if eig.kind === 'complex'}
        eigenvalores complejos: la dirección nunca se asienta, gira {((eig.spiralAngle * 180) / Math.PI).toFixed(0)}° por paso
      {:else}
        λ = {eig.value.toFixed(2)} repetido
      {/if}
    </span>
  </div>
</div>
