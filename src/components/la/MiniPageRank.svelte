<script lang="ts">
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, BORDER } from '../../lib/svm/colors';
  import { googleMatrix, stationary, stationaryTrace, PAGERANK_PRESETS, type WebGraph } from '../../lib/la/markov';
  import { stepLoop } from '../../lib/viz/stepper';

  // PageRank in miniature: the importance of a page is the stationary
  // distribution of a random surfer — an eigenvector with λ = 1. Edit the link
  // matrix (each checkbox is one edge) and watch the ranking reorder.

  function cloneGraph(g: WebGraph): WebGraph {
    return { nodes: [...g.nodes], out: g.out.map((row) => [...row]) };
  }
  let presetId = $state('demo');
  let graph = $state<WebGraph>(cloneGraph(PAGERANK_PRESETS[0].graph));
  let damping = $state(0.85);

  // Any change to the graph or damping invalidates a running convergence
  // animation: stop the stepLoop (via `running`) or it keeps replaying the
  // trace of the OLD google matrix.
  function cancelAnim() {
    running = false;
    animPi = null;
  }
  function applyPreset(id: string) {
    presetId = id;
    graph = cloneGraph(PAGERANK_PRESETS.find((p) => p.id === id)!.graph);
    cancelAnim();
  }
  function toggleEdge(i: number, j: number) {
    const links = graph.out[i];
    const k = links.indexOf(j);
    if (k >= 0) links.splice(k, 1);
    else links.push(j);
    cancelAnim();
  }

  let n = $derived(graph.nodes.length);
  let G = $derived(googleMatrix(graph, damping));
  let finalPi = $derived(stationary(G).pi);

  // "Ver convergencia" animates π₀ (uniforme) → π* step by step.
  let animPi = $state<number[] | null>(null);
  let running = $state(false);
  let stepIdx = $state(0);
  let trace = $state<number[][]>([]);
  function animate() {
    trace = stationaryTrace(G, 30);
    stepIdx = 0;
    animPi = trace[0];
    running = true;
  }
  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 160,
      total: trace.length - 1,
      step: () => {
        stepIdx += 1;
        animPi = trace[stepIdx];
        return stepIdx;
      },
      onDone: () => (running = false),
    });
  });
  let pi = $derived(animPi ?? finalPi);
  let ranking = $derived(pi.map((p, i) => ({ name: graph.nodes[i], p, i })).sort((a, b) => b.p - a.p));

  // Pentagon layout; curved directed edges.
  const width = 460;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const rad = 142;
  let pos = $derived(
    graph.nodes.map((_, i) => ({
      x: cx + rad * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n),
      y: cy + rad * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n),
    })),
  );
  function edgePath(i: number, j: number): string {
    const a = pos[i];
    const b = pos[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const nx = -dy / d;
    const ny = dx / d;
    // Shorten toward the target so the arrowhead clears the node circle.
    const t0 = 0.14;
    const t1 = 0.82;
    const mx = (a.x + b.x) / 2 + 22 * nx;
    const my = (a.y + b.y) / 2 + 22 * ny;
    const sx = a.x + (b.x - a.x) * t0;
    const sy = a.y + (b.y - a.y) * t0;
    const ex = a.x + (b.x - a.x) * t1;
    const ey = a.y + (b.y - a.y) * t1;
    return `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
  }
  const radiusOf = (i: number) => 10 + 55 * pi[i];
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-muted">Web:</span>
    {#each PAGERANK_PRESETS as p (p.id)}
      <button
        onclick={() => applyPreset(p.id)}
        class="rounded-md border px-3 py-1.5 font-medium hover:bg-paper-raised"
        style="border-color:{presetId === p.id ? ACCENT : BORDER}; color:{presetId === p.id ? ACCENT : 'inherit'}"
      >
        {p.label}
      </button>
    {/each}
    <button onclick={animate} disabled={running} class="ml-auto rounded-md px-4 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft disabled:opacity-60" style="background-color:{ACCENT}">
      {running ? `π · Gᵏ, paso ${stepIdx}…` : 'Ver convergencia'}
    </button>
  </div>

  <div class="grid grid-cols-1 items-start gap-4 md:grid-cols-[3fr,2fr]">
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none animate-fade-up">
      <defs>
        <marker id="prk-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={MUTED} />
        </marker>
      </defs>
      {#each graph.out as links, i}
        {#each links as j}
          <path d={edgePath(i, j)} fill="none" stroke={MUTED} stroke-width="1.8" opacity="0.65" marker-end="url(#prk-arr)" />
        {/each}
      {/each}
      {#each graph.nodes as name, i}
        <circle cx={pos[i].x} cy={pos[i].y} r={radiusOf(i)} fill={ranking[0]?.i === i ? POS : ACCENT} fill-opacity="0.22" stroke={ranking[0]?.i === i ? POS : ACCENT} stroke-width="2.5" style="transition: r 150ms" />
        <text x={pos[i].x} y={pos[i].y - radiusOf(i) - 8} text-anchor="middle" font-size="13" font-weight="700" fill={ranking[0]?.i === i ? POS : ACCENT}>{name}</text>
        <text x={pos[i].x} y={pos[i].y + 4} text-anchor="middle" font-size="11" font-weight="600" fill={MUTED}>{(100 * pi[i]).toFixed(0)}%</text>
      {/each}
      {#if graph.out.some((l) => l.length === 0)}
        <text x="8" y={height - 10} font-size="11" fill={MUTED}>· las páginas sin enlaces salientes "teletransportan" al azar</text>
      {/if}
    </svg>

    <div class="space-y-4 text-sm text-ink">
      <div>
        <p class="mb-1 font-semibold">Matriz de enlaces (fila → columna)</p>
        <table class="border-collapse text-xs">
          <thead>
            <tr>
              <th class="pr-1"></th>
              {#each graph.nodes as name}<th class="px-1 font-medium text-muted">{name.slice(0, 4)}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each graph.nodes as name, i}
              <tr>
                <th class="pr-1 text-right font-medium text-muted">{name.slice(0, 4)}</th>
                {#each graph.nodes as _, j}
                  <td class="px-1 text-center">
                    {#if i === j}
                      <span class="text-axis">—</span>
                    {:else}
                      <input type="checkbox" checked={graph.out[i].includes(j)} onchange={() => toggleEdge(i, j)} class="accent-interactive" aria-label={`enlace de ${graph.nodes[i]} a ${graph.nodes[j]}`} />
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <label class="block font-medium">
        Amortiguación d = {damping.toFixed(2)}
        <input type="range" bind:value={damping} oninput={cancelAnim} min="0.5" max="0.95" step="0.01" class="mt-1 w-full accent-interactive" />
        <span class="text-xs font-normal text-muted">con prob. 1−d el navegante salta a una página al azar</span>
      </label>

      <ol class="m-0 list-none space-y-1 p-0">
        {#each ranking as r, k (r.i)}
          <li class="flex items-center gap-2">
            <span class="w-4 text-right tabular-nums text-muted">{k + 1}</span>
            <span class="w-16 font-medium" style="color:{k === 0 ? POS : 'inherit'}">{r.name}</span>
            <span class="h-2.5 flex-1 overflow-hidden rounded-full" style="background-color:{AXIS}40">
              <span class="block h-full rounded-full transition-all duration-150" style="width:{(r.p / (ranking[0]?.p || 1)) * 100}%; background-color:{k === 0 ? POS : ACCENT}"></span>
            </span>
            <span class="w-12 text-right tabular-nums text-muted">{r.p.toFixed(3)}</span>
          </li>
        {/each}
      </ol>
      {#if presetId === 'granja' && damping > 0.8}
        <p class="text-xs font-medium" style="color:{NEG}">Spam1 y Spam2 atrapan al navegante y acaparan el rank — baja la amortiguación y mira cómo el teletransporte los desinfla.</p>
      {/if}
      {#if !running}
        <p class="text-xs" style="color:{SUCCESS}">π estacionaria: πG = π — el eigenvector con λ = 1.</p>
      {/if}
    </div>
  </div>
</div>
