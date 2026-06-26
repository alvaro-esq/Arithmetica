<script lang="ts">
  import { defaultGrid, valueIteration, greedyPolicy, valueRange, type Action } from '../../lib/rl/gridworld';
  import { gridLayout, valueOpacity, cellColor, policyArrow } from '../../lib/rl/gridview';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, SUCCESS, WARN, AXIS, PAPER, INK, NEG } from '../../lib/svm/colors';

  // The centerpiece: value iteration on a Gridworld. Each sweep of the Bellman
  // update propagates reward backward from the goal until V(s) converges. Cells are
  // colored by value (diverging: green toward the +1 goal, amber toward the −1
  // hazard) and the greedy policy is drawn as arrows pointing "uphill" in value.

  const grid = defaultGrid();
  const R = grid.length;
  const C = grid[0].length;

  // Slider runs left→right over [-3, -0.046]; we map it so the LEFT end is myopic
  // (γ→0.1) and the RIGHT end is far-sighted (γ→0.999), matching the caption. The
  // exponent is mirrored: at sliderGamma=-3 → 10^(-0.046)=0.9 → γ=0.1; at
  // sliderGamma=-0.046 → 10^(-3) → γ=0.999.
  let sliderGamma = $state(-0.046);
  let gamma = $derived(Math.min(0.999, 1 - Math.pow(10, -3.046 - sliderGamma)));
  let shown = $state(0); // sweeps revealed
  let running = $state(false);

  let result = $derived(valueIteration(grid, gamma, 0));
  let maxSweep = $derived(result.history.length - 1);
  let V = $derived(result.history[Math.min(shown, maxSweep)]);
  let policy = $derived(greedyPolicy(grid, V, gamma, 0));
  let range = $derived(valueRange(grid, V));

  // layout + shared diverging-heatmap / arrow scaffold
  const cell = 84;
  const { width, height, gx, gy } = gridLayout(R, C, cell, 8);
  let opa = $derived(valueOpacity(range));
  const arrow = (r: number, c: number, a: Action) => policyArrow({ width, height, gx, gy }, cell, r, c, a);

  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 420,
      total: maxSweep,
      step: () => (shown += 1),
      onDone: () => (running = false),
    });
  });

  function run() {
    shown = 0;
    running = true;
  }
  function stepOnce() {
    running = false;
    if (shown < maxSweep) shown += 1;
  }
  function reset() {
    running = false;
    shown = 0;
  }
  function showAll() {
    running = false;
    shown = maxSweep;
  }
  function onGamma() {
    reset();
  }
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="mx-auto w-full max-w-md select-none aspect-square">
    {#each grid as row, r}
      {#each row as cellDat, c}
        {#if cellDat.type === 'wall'}
          <rect x={gx(c)} y={gy(r)} width={cell - 3} height={cell - 3} rx="4" fill={NEG} opacity="0.85" />
          <text x={gx(c) + cell / 2} y={gy(r) + cell / 2 + 4} text-anchor="middle" font-size="11" fill={PAPER}>muro</text>
        {:else}
          <rect x={gx(c)} y={gy(r)} width={cell - 3} height={cell - 3} rx="4" fill={cellColor(V[r][c])} fill-opacity={opa(Math.abs(V[r][c]))} stroke={AXIS} stroke-width="1" />
          <!-- value label -->
          <text x={gx(c) + cell / 2} y={gy(r) + 20} text-anchor="middle" font-size="13" font-weight="600" fill={INK}>{V[r][c].toFixed(2)}</text>
          {#if cellDat.type === 'goal'}
            <text x={gx(c) + cell / 2} y={gy(r) + cell - 10} text-anchor="middle" font-size="11" fill={SUCCESS}>meta +1</text>
          {:else if cellDat.type === 'hazard'}
            <text x={gx(c) + cell / 2} y={gy(r) + cell - 10} text-anchor="middle" font-size="11" fill={WARN}>peligro −1</text>
          {:else if policy[r][c]}
            {@const ar = arrow(r, c, policy[r][c])}
            <line x1={ar.x1} y1={ar.y1} x2={ar.x2} y2={ar.y2} stroke={ACCENT} stroke-width="2.5" />
            <polygon points={ar.head} fill={ACCENT} />
          {/if}
        {/if}
      {/each}
    {/each}
  </svg>

  <div class="flex items-center justify-between text-sm">
    <span class="text-ink">Barrido <strong>{shown}</strong> de {maxSweep} {shown >= maxSweep ? '· convergió ✓' : ''}</span>
    <span class="text-muted">γ = <strong style="color: {ACCENT}">{gamma.toFixed(3)}</strong></span>
  </div>

  <label class="block text-sm font-medium text-ink">
    Factor de descuento γ
    <input type="range" bind:value={sliderGamma} oninput={onGamma} min="-3" max="-0.046" step="0.02" class="mt-1 w-full accent-interactive" />
    <span class="text-xs text-muted">izquierda = miope (γ→0) · derecha = previsor (γ→1)</span>
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={run}>Ejecutar ▸</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={stepOnce}>Paso →</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={showAll}>Saltar al final</button>
    <button class="rounded-md border px-3 py-1.5 text-sm text-ink" style="border-color: {AXIS}" onclick={reset}>Reiniciar</button>
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {SUCCESS}; color: {PAPER}">la recompensa se propaga hacia atrás</span>
  </div>
  <p class="text-xs text-muted">Cada <strong>barrido</strong> actualiza V(s) con la ecuación de Bellman, propagando el valor desde la meta. Las <strong>flechas</strong> son la política greedy: en cada estado, ir hacia el vecino de mayor valor. Baja <strong>γ</strong> y el horizonte se acorta hasta que el inicio ya no "ve" la meta.</p>
</div>
