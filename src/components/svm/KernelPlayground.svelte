<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { circles, moons, type Point } from '../../lib/svm/datasets';
  import { decisionFunction, type KernelName, type KernelParams } from '../../lib/svm/kernels';
  import { smo, type KernelModel } from '../../lib/svm/solvers';
  import { POS, NEG, ACCENT, PAPER } from '../../lib/svm/colors';

  // Pick a dataset and a kernel, then watch the decision regions reshape. By
  // default every point acts as its own support vector (a Parzen-style estimate)
  // so the boundary responds instantly to γ and the degree. "Entrenar SVM" runs
  // SMO for the true sparse solution and marks the real support vectors.

  const GRID = 56; // grid resolution for region shading

  let dataset = $state<'circles' | 'moons'>('circles');
  let kernelName = $state<KernelName>('rbf');
  let gamma = $state(1.2);
  let degree = $state(3);
  let trained = $state<KernelModel | null>(null);

  let data = $derived<Point[]>(dataset === 'circles' ? circles(80, 2) : moons(80, 3));
  let params = $derived<KernelParams>({ degree, gamma, coef0: 1 });

  // Reset any trained model when the configuration changes.
  $effect(() => {
    dataset;
    kernelName;
    gamma;
    degree;
    trained = null;
  });

  const extent = 3.2;
  const width = 460;
  const height = 460;
  const pad = 18;
  const xScale = scaleLinear().domain([-extent, extent]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([-extent, extent]).range([height - pad, pad]);

  // Active model: trained SVM if present, else Parzen (all αᵢ = 1, b = 0).
  let support = $derived(trained ? trained.support : data);
  let alphas = $derived(trained ? trained.alphas : data.map(() => 1));
  let bias = $derived(trained ? trained.b : 0);

  const cw = (2 * extent) / GRID;

  // Evaluate f on a grid once; reused for both the region shading and the
  // crisp decision boundary. raw[gy*GRID+gx] = f at that cell center.
  let grid = $derived.by(() => {
    const raw: number[] = new Array(GRID * GRID);
    let maxAbs = 1e-9;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const px = -extent + (gx + 0.5) * cw;
        const py = -extent + (gy + 0.5) * cw;
        const f = decisionFunction({ x: px, y: py }, support, alphas, bias, kernelName, params);
        raw[gy * GRID + gx] = f;
        if (Math.abs(f) > maxAbs) maxAbs = Math.abs(f);
      }
    }
    return { raw, maxAbs };
  });

  // One rect per cell, tinted by sign(f), opacity by |f|.
  let cells = $derived.by(() => {
    const { raw, maxAbs } = grid;
    const out: { x: number; y: number; w: number; h: number; fill: string; op: number }[] = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const f = raw[gy * GRID + gx];
        const px = -extent + gx * cw;
        const py = -extent + gy * cw;
        out.push({
          x: xScale(px),
          y: yScale(py + cw),
          w: xScale(px + cw) - xScale(px) + 0.5,
          h: yScale(py) - yScale(py + cw) + 0.5,
          fill: f >= 0 ? POS : ACCENT,
          op: 0.07 + 0.28 * Math.min(1, Math.abs(f) / maxAbs),
        });
      }
    }
    return out;
  });

  // Decision boundary: stroke the edge between adjacent cells whose sign differs.
  let boundary = $derived.by(() => {
    const { raw } = grid;
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const f = raw[gy * GRID + gx];
        const x0 = -extent + gx * cw;
        const y0 = -extent + gy * cw;
        if (gx + 1 < GRID && Math.sign(f) !== Math.sign(raw[gy * GRID + gx + 1])) {
          segs.push({ x1: xScale(x0 + cw), y1: yScale(y0), x2: xScale(x0 + cw), y2: yScale(y0 + cw) });
        }
        if (gy + 1 < GRID && Math.sign(f) !== Math.sign(raw[(gy + 1) * GRID + gx])) {
          segs.push({ x1: xScale(x0), y1: yScale(y0 + cw), x2: xScale(x0 + cw), y2: yScale(y0 + cw) });
        }
      }
    }
    return segs;
  });

  // O(1) membership for the support-vector test (called several times per point
  // per render); rebuilt only when a model is trained.
  let supportSet = $derived(new Set(trained?.support));
  function isSupport(p: Point): boolean {
    return supportSet.has(p);
  }

  function train() {
    trained = smo(data, kernelName, params, 1);
  }
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-3 text-sm text-ink">
    <label class="flex items-center gap-2">
      Datos:
      <select bind:value={dataset} class="rounded border border-[#CFCDC4] bg-paper px-2 py-1">
        <option value="circles">Círculos concéntricos</option>
        <option value="moons">Dos lunas</option>
      </select>
    </label>
    <label class="flex items-center gap-2">
      Kernel:
      <select bind:value={kernelName} class="rounded border border-[#CFCDC4] bg-paper px-2 py-1">
        <option value="linear">Lineal</option>
        <option value="poly">Polinomial</option>
        <option value="rbf">RBF</option>
        <option value="sigmoid">Sigmoide</option>
      </select>
    </label>
  </div>

  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="mx-auto block w-full max-w-md aspect-square">
    {#each cells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} fill-opacity={c.op} />
    {/each}
    <!-- crisp decision boundary -->
    {#each boundary as s}
      <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={ACCENT} stroke-width="1.5" stroke-linecap="round" />
    {/each}
    <!-- support-vector halos -->
    {#each data as p}
      {#if isSupport(p)}
        <circle cx={xScale(p.x)} cy={yScale(p.y)} r="11" fill="none" stroke={ACCENT} stroke-width="2" opacity="0.3" />
      {/if}
    {/each}
    {#each data as p}
      <circle
        cx={xScale(p.x)}
        cy={yScale(p.y)}
        r={isSupport(p) ? 7 : 5}
        fill={p.label === 1 ? POS : NEG}
        stroke={isSupport(p) ? ACCENT : PAPER}
        stroke-width={isSupport(p) ? 2.5 : 1.2}
      />
    {/each}
  </svg>

  {#if kernelName !== 'linear'}
    <label class="block text-sm font-medium text-ink">
      γ (gamma): {gamma.toFixed(2)}
      <input type="range" bind:value={gamma} min="0.1" max="5" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
  {/if}
  {#if kernelName === 'poly'}
    <label class="block text-sm font-medium text-ink">
      Grado d: {degree}
      <input type="range" bind:value={degree} min="1" max="6" step="1" class="mt-1 w-full accent-interactive" />
    </label>
  {/if}

  <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-ink">
    <span>
      {#if trained}
        SVM entrenado · <strong style="color: {ACCENT}">{trained.support.length}</strong> vectores de soporte
      {:else}
        Estimación por kernel (todos los puntos contribuyen)
      {/if}
    </span>
    <button onclick={train} class="rounded-md px-4 py-2 text-sm font-medium text-paper" style="background-color: {ACCENT}">
      Entrenar SVM real
    </button>
  </div>
</div>
