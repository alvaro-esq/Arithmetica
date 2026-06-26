<script lang="ts">
  import { defaultGrid, valueIteration, bellmanBackup, valueRange, isTerminal, ACTIONS, type Action } from '../../lib/rl/gridworld';
  import { gridLayout, valueOpacity, cellColor } from '../../lib/rl/gridview';
  import { ACCENT, SUCCESS, PAPER, MUTED, INK, NEG, AXIS } from '../../lib/svm/colors';

  // The Bellman equation, made concrete. Click any cell and see V(s) = max_a Σ_s'
  // P(s'|s,a)·[R + γ·V(s')] decomposed per action: the immediate reward plus the
  // discounted value of where each action leads. The winning action (the max) is
  // highlighted — that is exactly what value iteration picks.

  const grid = defaultGrid();
  const R = grid.length;
  const C = grid[0].length;

  let gamma = $state(0.9);
  let sel = $state<{ r: number; c: number }>({ r: 2, c: 0 });

  // converged values (the backup reads against the optimal V)
  let V = $derived(valueIteration(grid, gamma, 0).V);
  let range = $derived(valueRange(grid, V));

  let selCell = $derived(grid[sel.r][sel.c]);
  let backups = $derived(
    ACTIONS.map((a) => ({ a, ...bellmanBackup(grid, V, sel.r, sel.c, a, gamma, 0) })),
  );
  let bestQ = $derived(Math.max(...backups.map((b) => b.q)));

  const ACTION_LABEL: Record<Action, string> = { up: '↑ arriba', down: '↓ abajo', left: '← izquierda', right: '→ derecha' };

  const cell = 72;
  const { width, height, gx, gy } = gridLayout(R, C, cell, 8);
  let opa = $derived(valueOpacity(range));
  function selectCell(r: number, c: number) {
    if (grid[r][c].type === 'wall' || isTerminal(grid[r][c])) return;
    sel = { r, c };
  }
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="mx-auto w-full max-w-sm select-none aspect-square">
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
          <text x={gx(c) + cell / 2} y={gy(r) + cell / 2 + 4} text-anchor="middle" font-size="13" font-weight="600" fill={INK} style={selectable ? 'cursor:pointer' : ''} onclick={() => selectCell(r, c)}>{V[r][c].toFixed(2)}</text>
        {/if}
      {/each}
    {/each}
  </svg>

  <!-- decomposition panel -->
  <div class="rounded-md p-3 text-sm" style="background-color: {PAPER}; border: 1px solid {AXIS}">
    {#if isTerminal(selCell)}
      <p class="text-ink">Estado terminal: V = <strong>{selCell.reward.toFixed(2)}</strong> (sin acciones).</p>
    {:else}
      <p class="mb-2 text-ink">Estado <strong>({sel.r},{sel.c})</strong>: V(s) = <strong style="color: {SUCCESS}">máx<sub>a</sub> Q(s,a) = {bestQ.toFixed(3)}</strong></p>
      <div class="space-y-1.5">
        {#each backups as b}
          {@const win = Math.abs(b.q - bestQ) < 1e-9}
          <div class="flex items-center justify-between rounded px-2 py-1" style={win ? `background-color:${ACCENT};color:${PAPER}` : `background-color:${PAPER}`}>
            <span class="font-medium" style={win ? '' : `color:${MUTED}`}>{ACTION_LABEL[b.a]}</span>
            <span class="font-mono text-xs" style={win ? `color:${PAPER}` : `color:${INK}`}>
              Σ p·(R + γ·V′) = <strong>{b.q.toFixed(3)}</strong>{win ? '  ← máx' : ''}
            </span>
          </div>
        {/each}
      </div>
      <p class="mt-2 text-xs" style="color: {MUTED}">Cada acción: recompensa inmediata <strong>R = {selCell.reward.toFixed(2)}</strong> más el valor futuro descontado <strong>γ·V(s′)</strong>, ponderado por la probabilidad de transición.</p>
    {/if}
  </div>

  <label class="block text-sm font-medium text-ink">
    Factor de descuento γ: {gamma.toFixed(2)}
    <input type="range" bind:value={gamma} min="0.1" max="0.99" step="0.01" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {SUCCESS}; color: {PAPER}">V(s) = mejor acción: recompensa + futuro descontado</span>
  </div>
  <p class="text-xs text-muted">Haz clic en una celda para descomponer su valor. La ecuación de Bellman dice que el valor de un estado es el de su <strong>mejor</strong> acción, y el de una acción combina la <strong>recompensa inmediata</strong> con el <strong>valor descontado</strong> de los estados a los que lleva.</p>
</div>
