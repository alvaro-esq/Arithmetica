<script lang="ts">
  import { MCP_APPS, MCP_TOOLS } from '../../lib/llm/harness';
  import { ACCENT, POS, NEG, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Sin estándar: cada app integra cada herramienta a mano (n×m conexiones).
  // Con MCP: cada quien se conecta UNA vez al protocolo (n+m).

  let withMcp = $state(false);

  const W = 640;
  const H = 260;
  const LEFT_X = 120;
  const RIGHT_X = W - 120;
  const BUS_X = W / 2;
  const yOf = (i: number, n: number) => 46 + (i * (H - 84)) / (n - 1);

  let lineCount = $derived(withMcp ? MCP_APPS.length + MCP_TOOLS.length : MCP_APPS.length * MCP_TOOLS.length);
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <div class="flex overflow-hidden rounded-md border text-sm font-semibold" style="border-color: {BORDER}">
      <button class="px-3 py-1.5" style={!withMcp ? `background-color:${WARN};color:${PAPER}` : `color:${MUTED}`} aria-pressed={!withMcp} onclick={() => (withMcp = false)}>Sin MCP</button>
      <button class="px-3 py-1.5" style={withMcp ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} aria-pressed={withMcp} onclick={() => (withMcp = true)}>Con MCP</button>
    </div>
    <p class="text-sm tabular-nums" style="color: {INK}" aria-live="polite">
      integraciones a mantener: <strong style="color: {withMcp ? ACCENT : WARN}">{lineCount}</strong>
      {#if withMcp}<span style="color: {MUTED}"> ({MCP_APPS.length} + {MCP_TOOLS.length})</span>{:else}<span style="color: {MUTED}"> ({MCP_APPS.length} × {MCP_TOOLS.length})</span>{/if}
    </p>
  </div>

  <svg viewBox="0 0 {W} {H}" class="w-full select-none" role="img" aria-label={withMcp ? 'Con MCP: apps y herramientas se conectan una vez al bus central' : 'Sin MCP: cada app se integra a mano con cada herramienta'}>
    {#if withMcp}
      <!-- el bus MCP -->
      <g class="fade-in">
        {#each MCP_APPS as _, i}
          <line x1={LEFT_X + 62} y1={yOf(i, MCP_APPS.length)} x2={BUS_X - 14} y2={H / 2 - 10} stroke={ACCENT} stroke-width="2" opacity="0.7" />
        {/each}
        {#each MCP_TOOLS as _, j}
          <line x1={BUS_X + 14} y1={H / 2 - 10} x2={RIGHT_X - 62} y2={yOf(j, MCP_TOOLS.length)} stroke={ACCENT} stroke-width="2" opacity="0.7" />
        {/each}
        <rect x={BUS_X - 34} y={H / 2 - 34} width="68" height="48" rx="10" fill={ACCENT} />
        <text x={BUS_X} y={H / 2 - 13} text-anchor="middle" font-size="13" font-weight="700" fill={PAPER}>MCP</text>
        <text x={BUS_X} y={H / 2 + 2} text-anchor="middle" font-size="8.5" fill={PAPER} opacity="0.85">un protocolo</text>
      </g>
    {:else}
      <g class="fade-in">
        {#each MCP_APPS as _, i}
          {#each MCP_TOOLS as _t, j}
            <line x1={LEFT_X + 62} y1={yOf(i, MCP_APPS.length)} x2={RIGHT_X - 62} y2={yOf(j, MCP_TOOLS.length)} stroke={WARN} stroke-width="1.3" opacity="0.5" />
          {/each}
        {/each}
        <text x={BUS_X} y={H / 2 + 4} text-anchor="middle" font-size="10.5" font-weight="700" fill={WARN} style="paint-order: stroke; stroke: {PAPER_RAISED}; stroke-width: 5px">{MCP_APPS.length * MCP_TOOLS.length} integraciones a medida</text>
      </g>
    {/if}

    <!-- nodos: apps a la izquierda, herramientas a la derecha -->
    {#each MCP_APPS as app, i}
      <g>
        <rect x={LEFT_X - 62} y={yOf(i, MCP_APPS.length) - 15} width="124" height="30" rx="7" fill={PAPER} stroke={NEG} stroke-width="1.5" />
        <text x={LEFT_X} y={yOf(i, MCP_APPS.length) + 4} text-anchor="middle" font-size="11" font-weight="600" fill={NEG}>{app}</text>
      </g>
    {/each}
    {#each MCP_TOOLS as tool, j}
      <g>
        <rect x={RIGHT_X - 62} y={yOf(j, MCP_TOOLS.length) - 15} width="124" height="30" rx="7" fill={PAPER} stroke={POS} stroke-width="1.5" />
        <text x={RIGHT_X} y={yOf(j, MCP_TOOLS.length) + 4} text-anchor="middle" font-size="11" font-weight="600" fill={POS}>{tool}</text>
      </g>
    {/each}
    <text x={LEFT_X} y="22" text-anchor="middle" font-size="10" font-weight="700" fill={MUTED} style="text-transform: uppercase; letter-spacing: 0.06em">apps con IA</text>
    <text x={RIGHT_X} y="22" text-anchor="middle" font-size="10" font-weight="700" fill={MUTED} style="text-transform: uppercase; letter-spacing: 0.06em">tus datos y sistemas</text>
  </svg>

  <p class="mt-1 text-xs leading-snug" style="color: {MUTED}">
    {#if withMcp}
      Cada app y cada sistema se conectan <strong>una sola vez</strong> al protocolo. Conectar una herramienta nueva = 1 conexión, y todas las apps la ven. Como USB-C: un puerto, cualquier accesorio.
    {:else}
      Cada flecha es código a medida que alguien escribió y mantiene. Agregar la herramienta nº 5 = escribir 4 integraciones más.
    {/if}
  </p>
</div>

<style>
  .fade-in {
    animation: fade-in 0.35s ease;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
</style>
