<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { embed, nearest, PHRASES, PRESET_QUERIES, type Vec2 } from '../../lib/llm/embeddings';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // El mapa de significado: cada frase de negocio es un punto; parecido = cerca.
  // Escribe una consulta y mira cuáles frases "responde" un buscador vectorial.

  let query = $state(PRESET_QUERIES[0]);

  let qVec = $derived<Vec2 | null>(embed(query));
  let hits = $derived(qVec ? nearest(qVec, 3) : []);
  let hitIds = $derived(new Set(hits.map((h) => h.phrase.id)));

  const W = 620;
  const H = 430;
  const M = 34;
  const xS = scaleLinear().domain([0, 10]).range([M, W - M]);
  const yS = scaleLinear().domain([0, 10]).range([M, H - M]);

  const QUADRANTS = [
    { x: 2.1, y: 0.6, label: 'ventas e ingresos' },
    { x: 2.1, y: 9.6, label: 'costos y presupuesto' },
    { x: 7.9, y: 0.6, label: 'clientes' },
    { x: 7.9, y: 9.6, label: 'personal' },
  ];
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-2 flex flex-wrap items-center gap-1.5">
    <label class="grow">
      <span class="sr-only">Consulta</span>
      <input
        type="text"
        bind:value={query}
        placeholder="escribe una consulta de negocio…"
        class="w-full rounded-md border px-3 py-1.5 text-sm"
        style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}"
      />
    </label>
  </div>
  <div class="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Consultas de ejemplo">
    {#each PRESET_QUERIES as q (q)}
      <button
        class="rounded-full border px-2.5 py-0.5 text-xs font-medium"
        style={q === query ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => (query = q)}
      >{q}</button>
    {/each}
  </div>

  <div class="grid gap-3 md:grid-cols-[1fr_minmax(0,240px)]">
    <svg viewBox="0 0 {W} {H}" class="w-full select-none" role="img" aria-label="Mapa 2D de frases de negocio; las más cercanas a la consulta quedan resaltadas">
      <rect x={M - 10} y={M - 10} width={W - 2 * (M - 10)} height={H - 2 * (M - 10)} rx="10" fill={PAPER} stroke={AXIS} />
      {#each QUADRANTS as qd (qd.label)}
        <text x={xS(qd.x)} y={yS(qd.y) + 4} text-anchor="middle" font-size="10" font-weight="700" fill={MUTED} opacity="0.55" style="text-transform: uppercase; letter-spacing: 0.08em">{qd.label}</text>
      {/each}

      <!-- líneas consulta → vecinas -->
      {#if qVec}
        {#each hits as h (query + h.phrase.id)}
          <line x1={xS(qVec[0])} y1={yS(qVec[1])} x2={xS(h.phrase.v[0])} y2={yS(h.phrase.v[1])} stroke={ACCENT} stroke-width={1 + h.sim * 4} opacity={0.25 + h.sim * 0.6} stroke-linecap="round" class="link-in" />
        {/each}
      {/if}

      <!-- frases -->
      {#each PHRASES as p (p.id)}
        {@const hot = hitIds.has(p.id)}
        <circle cx={xS(p.v[0])} cy={yS(p.v[1])} r={hot ? 7 : 5} fill={hot ? SUCCESS : POS} opacity={hot ? 1 : 0.65} style="transition: r 0.2s ease, fill 0.2s ease, opacity 0.2s ease" />
        <text
          x={xS(p.v[0])}
          y={yS(p.v[1]) - 11}
          text-anchor="middle"
          font-size="10.5"
          font-weight={hot ? 700 : 400}
          fill={hot ? INK : MUTED}
          style="paint-order: stroke; stroke: {PAPER}; stroke-width: 4px; transition: fill 0.2s ease"
        >{p.text}</text>
      {/each}

      <!-- la consulta -->
      {#if qVec}
        <g class="link-in">
          <circle cx={xS(qVec[0])} cy={yS(qVec[1])} r="9" fill={ACCENT} stroke={PAPER} stroke-width="2.5" />
          <text x={xS(qVec[0])} y={yS(qVec[1]) + 24} text-anchor="middle" font-size="11" font-weight="700" fill={ACCENT} style="paint-order: stroke; stroke: {PAPER}; stroke-width: 4px">tu consulta</text>
        </g>
      {/if}
    </svg>

    <div>
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">Las 3 más cercanas</p>
      {#if qVec}
        <ol class="space-y-1.5" aria-live="polite">
          {#each hits as h, i (query + '-r' + h.phrase.id)}
            <li class="link-in rounded-md border px-2 py-1.5 text-xs" style="border-color: {i === 0 ? SUCCESS : BORDER}; background-color: {PAPER}; color: {INK}">
              <span class="font-bold" style="color: {i === 0 ? SUCCESS : MUTED}">{i + 1}.</span>
              {h.phrase.text}
              <span class="mt-1 block h-1.5 overflow-hidden rounded-full" style="background-color: {AXIS}40">
                <span class="block h-full rounded-full" style="width: {Math.round(h.sim * 100)}%; background-color: {i === 0 ? SUCCESS : POS}; transition: width 0.3s ease"></span>
              </span>
              <span class="tabular-nums" style="color: {MUTED}">similitud {h.sim.toFixed(2)}</span>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="rounded-md border px-2 py-1.5 text-xs leading-snug" style="border-color: {WARN}; background-color: {PAPER}; color: {INK}" aria-live="polite">
          🤔 Ninguna palabra de tu consulta está en el mini-léxico de este demo (usa términos como <em>ventas, costos, clientes, rotación, stock</em>…). Un embedder real conoce <strong>todas</strong> las palabras.
        </p>
      {/if}
      <p class="mt-2 text-[11px] leading-snug" style="color: {MUTED}">Demo con 2 dimensiones para poder dibujarlo; los embeddings reales usan cientos — pero la idea es esta: <strong>significado = posición, parecido = distancia</strong>.</p>
    </div>
  </div>
</div>

<style>
  .link-in {
    animation: link-in 0.25s ease;
  }
  @keyframes link-in {
    from {
      opacity: 0;
    }
  }
</style>
