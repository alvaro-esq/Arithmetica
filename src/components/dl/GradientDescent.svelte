<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import { type Domain } from '../../lib/svm/geometry';
  import { gridCells } from '../../lib/viz/grid';
  import { stepLoop } from '../../lib/viz/stepper';
  import { lossField, gradientDescent } from '../../lib/dl/surface';
  import { ACCENT, AXIS, PAPER, SUCCESS, WARN, MUTED } from '../../lib/svm/colors';

  // Gradient descent, made tangible. The surface is a bowl with a Gaussian well;
  // the global minimum sits near (0.82, 0.44). Drag the start, set the learning
  // rate η, and run: η too small crawls and stalls, η too large overshoots and
  // diverges, η just right slides straight into the well.

  const STEPS = 60;
  const MIN = { x: 0.82, y: 0.44 };

  let start = $state([{ x: -1.7, y: 1.5 }]); // single draggable point (drag mutates in place)
  let logEta = $state(-0.3); // η = 10^logEta
  let shown = $state(0);
  let running = $state(false);
  let dragIndex = $state(-1);

  const dom: Domain = { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 };
  const width = 440;
  const height = 440;
  const pad = 34;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let eta = $derived(Math.pow(10, logEta));
  let traj = $derived(gradientDescent(lossField, start[0], eta, STEPS));
  let diverged = $derived(traj.some((p) => !isFinite(p.x) || Math.abs(p.x) > dom.xMax * 1.5 || Math.abs(p.y) > dom.yMax * 1.5));
  let headLoss = $derived(traj[Math.min(shown, traj.length - 1)]?.loss ?? 0);

  // Loss field shaded as bands: quantize loss → ACCENT opacity (darker = higher loss).
  const cells = gridCells(dom, 44, xScale, yScale);
  let lossCells = $derived.by(() => {
    const vals = cells.map((c) => lossField.f(c.cx, c.cy));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return cells.map((c, i) => ({ ...c, t: (vals[i] - lo) / (hi - lo || 1) }));
  });

  let dragCfg = $derived({
    points: start,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => {
      dragIndex = i;
      if (i >= 0) shown = 0; // reset the run when the start moves
    },
  });

  function poly(): string {
    return traj
      .slice(0, Math.max(1, shown))
      .filter((p) => isFinite(p.x) && isFinite(p.y))
      .map((p) => `${xScale(p.x)},${yScale(p.y)}`)
      .join(' ');
  }

  // Client-only animation: reveal the trajectory step by step. Guarded by `running`
  // so it never runs during SSR.
  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 45,
      total: traj.length,
      step: () => (shown += 1),
      onDone: () => (running = false),
    });
  });

  function run() {
    shown = 0;
    running = true;
  }
  function reset() {
    running = false;
    shown = 0;
  }
  const presets: { label: string; logEta: number }[] = [
    { label: 'muy bajo', logEta: -1.4 },
    { label: 'bueno', logEta: -0.3 },
    { label: 'muy alto', logEta: 0.85 },
  ];
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-square"
  >
    <!-- loss field bands -->
    {#each lossCells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={ACCENT} fill-opacity={0.04 + c.t * 0.28} />
    {/each}

    <!-- global minimum marker -->
    <circle cx={xScale(MIN.x)} cy={yScale(MIN.y)} r="7" fill="none" stroke={SUCCESS} stroke-width="2" />
    <circle cx={xScale(MIN.x)} cy={yScale(MIN.y)} r="2" fill={SUCCESS} />

    <!-- descent path -->
    <polyline points={poly()} fill="none" stroke={ACCENT} stroke-width="2.5" />
    {#each traj.slice(0, shown) as p, i}
      {#if isFinite(p.x) && isFinite(p.y)}
        <circle cx={xScale(p.x)} cy={yScale(p.y)} r="2.5" fill={ACCENT} opacity={0.3 + 0.7 * (i / Math.max(1, shown))} />
      {/if}
    {/each}

    <!-- draggable start point -->
    <circle
      cx={xScale(start[0].x)}
      cy={yScale(start[0].y)}
      r={dragIndex === 0 ? 9 : 7}
      fill={ACCENT}
      stroke={PAPER}
      stroke-width="2"
      style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
      data-drag-index={0}
    />
  </svg>

  <p class="text-xs text-muted">Arrastra el punto inicial. El anillo verde es el mínimo; las bandas oscuras son zonas de mayor pérdida.</p>

  <label class="block text-sm font-medium text-ink">
    Tasa de aprendizaje η: {eta.toFixed(3)}
    <input type="range" bind:value={logEta} oninput={reset} min="-1.6" max="1" step="0.05" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={run}>Ejecutar ▸</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={reset}>Reiniciar</button>
    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      {#each presets as p}
        <button class="px-3 py-1.5" style={Math.abs(logEta - p.logEta) < 1e-6 ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => { logEta = p.logEta; reset(); }}>
          {p.label}
        </button>
      {/each}
    </span>
  </div>

  <div class="flex flex-wrap items-center gap-4 text-sm text-ink">
    <span>Paso {Math.min(shown, traj.length - 1)} / {traj.length - 1}</span>
    <span>Pérdida: <strong>{isFinite(headLoss) ? headLoss.toFixed(3) : '∞'}</strong></span>
    {#if diverged}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {WARN}">η demasiado alto: el descenso diverge</span>
    {/if}
  </div>
</div>
