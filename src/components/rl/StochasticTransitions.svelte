<script lang="ts">
  import { defaultGrid, valueIteration, greedyPolicy, transitions, valueRange, isTerminal, type Action } from '../../lib/rl/gridworld';
  import { gridLayout, valueOpacity, cellColor, policyArrow } from '../../lib/rl/gridview';
  import { ACCENT, SUCCESS, WARN, AXIS, PAPER, INK, NEG } from '../../lib/svm/colors';

  // The same world, now uncertain. With "slip" the agent doesn't always go where it
  // intends — it veers sideways with some probability. Raise the slip and re-solve:
  // values near the hazard drop and the optimal policy turns cautious, steering away
  // from the −1 cell even if that means a longer path.

  const grid = defaultGrid();
  const R = grid.length;
  const C = grid[0].length;
  const GAMMA = 0.9;

  let slip = $state(0); // probability of veering to a perpendicular direction
  let sel = $state<{ r: number; c: number }>({ r: 1, c: 2 });

  let result = $derived(valueIteration(grid, GAMMA, slip));
  let V = $derived(result.V);
  let policy = $derived(greedyPolicy(grid, V, GAMMA, slip));
  let range = $derived(valueRange(grid, V));

  // the selected cell's outgoing transitions under its greedy action, merged by
  // destination so a cell reached two ways (e.g. intended + slip both bouncing off
  // a wall) shows ONE summed probability instead of two confusing rows.
  let selAction = $derived<Action | null>(policy[sel.r][sel.c]);
  let selTrans = $derived.by(() => {
    if (!selAction) return [] as { to: { r: number; c: number }; p: number }[];
    const byCell = new Map<string, { to: { r: number; c: number }; p: number }>();
    for (const t of transitions(grid, sel.r, sel.c, selAction, slip)) {
      if (t.p <= 0) continue;
      const key = `${t.to.r},${t.to.c}`;
      const prev = byCell.get(key);
      if (prev) prev.p += t.p;
      else byCell.set(key, { to: t.to, p: t.p });
    }
    return [...byCell.values()];
  });

  const cell = 84;
  const { width, height, gx, gy } = gridLayout(R, C, cell, 8);
  let opa = $derived(valueOpacity(range));
  const arrow = (r: number, c: number, a: Action) => policyArrow({ width, height, gx, gy }, cell, r, c, a);

  function selectCell(r: number, c: number) {
    if (grid[r][c].type === 'wall' || isTerminal(grid[r][c])) return;
    sel = { r, c };
  }
  const ACTION_LABEL: Record<Action, string> = { up: '↑', down: '↓', left: '←', right: '→' };
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="mx-auto w-full max-w-md select-none aspect-square">
    {#each grid as row, r}
      {#each row as cellDat, c}
        {#if cellDat.type === 'wall'}
          <rect x={gx(c)} y={gy(r)} width={cell - 3} height={cell - 3} rx="4" fill={NEG} opacity="0.85" />
        {:else}
          {@const selectable = !isTerminal(cellDat)}
          <rect
            x={gx(c)}
            y={gy(r)}
            width={cell - 3}
            height={cell - 3}
            rx="4"
            fill={cellColor(V[r][c])}
            fill-opacity={opa(Math.abs(V[r][c]))}
            stroke={sel.r === r && sel.c === c ? ACCENT : AXIS}
            stroke-width={sel.r === r && sel.c === c ? 3 : 1}
            style={selectable ? 'cursor:pointer' : ''}
            onclick={() => selectCell(r, c)}
          />
          <text x={gx(c) + cell / 2} y={gy(r) + 20} text-anchor="middle" font-size="13" font-weight="600" fill={INK} style={selectable ? 'cursor:pointer' : ''} onclick={() => selectCell(r, c)}>{V[r][c].toFixed(2)}</text>
          {#if cellDat.type === 'goal'}
            <text x={gx(c) + cell / 2} y={gy(r) + cell - 10} text-anchor="middle" font-size="11" fill={SUCCESS}>meta</text>
          {:else if cellDat.type === 'hazard'}
            <text x={gx(c) + cell / 2} y={gy(r) + cell - 10} text-anchor="middle" font-size="11" fill={WARN}>peligro</text>
          {:else if policy[r][c]}
            {@const ar = arrow(r, c, policy[r][c])}
            <line x1={ar.x1} y1={ar.y1} x2={ar.x2} y2={ar.y2} stroke={ACCENT} stroke-width="2.5" />
            <polygon points={ar.head} fill={ACCENT} />
          {/if}
        {/if}
      {/each}
    {/each}
  </svg>

  <!-- transitions of the selected cell under its policy action -->
  <div class="rounded-md px-3 py-2 text-sm" style="background-color: {PAPER}; border: 1px solid {AXIS}">
    {#if selAction}
      <span class="text-ink">Desde <strong>({sel.r},{sel.c})</strong>, la acción <strong>{ACTION_LABEL[selAction]}</strong> lleva a:</span>
      <span class="ml-1 text-muted">
        {#each selTrans as t, i}{i > 0 ? ' · ' : ' '}({t.to.r},{t.to.c}) con <strong style="color: {INK}">{(t.p * 100).toFixed(0)}%</strong>{/each}
      </span>
    {:else}
      <span class="text-muted">Selecciona una celda no terminal.</span>
    {/if}
  </div>

  <label class="block text-sm font-medium text-ink">
    Probabilidad de resbalar (slip): {(slip * 100).toFixed(0)}%
    <input type="range" bind:value={slip} min="0" max="0.6" step="0.02" class="mt-1 w-full accent-interactive" />
    <span class="text-xs text-muted">0% = determinístico · más alto = más incertidumbre</span>
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {slip > 0.05 ? WARN : SUCCESS}; color: {PAPER}">
      {#if slip > 0.05}con incertidumbre, la política se vuelve cautelosa{:else}mundo determinístico: la acción siempre se cumple{/if}
    </span>
  </div>
  <p class="text-xs text-muted">Con <strong>slip {'>'} 0</strong>, una acción no garantiza el resultado: el agente puede desviarse a un lado. Al re-resolver, los valores cerca del <strong>peligro</strong> bajan y las flechas se reorientan para <strong>alejarse</strong> de él, aunque el camino seguro sea más largo.</p>
</div>
