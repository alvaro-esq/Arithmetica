<script lang="ts">
  import { scaleLinear, scaleLog } from 'd3-scale';
  import { TIMELINE, TIMELINE_YEARS, PROVIDER_COLORS } from '../../lib/llm/timeline';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // La evolución 2017→2025. Arrastra el año y mira aparecer los hitos; cambia
  // el eje a "ventana de contexto" para VER la explosión de 512 a 1M tokens.

  const W = 720;
  const H = 300;
  const M = { l: 56, r: 24, t: 20, b: 40 };

  let scrub = $state(TIMELINE_YEARS[1]); // empieza con todo visible (SSR estático)
  let ctxAxis = $state(false);
  let selName = $state('ChatGPT');

  const xS = scaleLinear().domain(TIMELINE_YEARS).range([M.l, W - M.r]);
  const yLog = scaleLog().domain([512, 1_200_000]).range([H - M.b, M.t + 8]);

  const PALETTE: Record<string, string> = { accent: ACCENT, pos: POS, neg: NEG, success: SUCCESS, warn: WARN, muted: MUTED };
  const color = (p: (typeof TIMELINE)[0]) => PALETTE[PROVIDER_COLORS[p.provider]];

  // en modo línea, escalona filas para que las etiquetas no choquen
  function yOf(e: (typeof TIMELINE)[0], i: number): number {
    if (ctxAxis) return yLog(e.ctx);
    return H - M.b - 36 - (i % 3) * 72;
  }

  let sel = $derived(TIMELINE.find((e) => e.name === selName) ?? TIMELINE[0]);

  function onScrub(v: number) {
    scrub = v;
    const vis = TIMELINE.filter((e) => Math.floor(e.year) <= v);
    if (vis.length > 0) selName = vis[vis.length - 1].name;
  }
  const fmtCtx = (n: number) => (n >= 1_000_000 ? n / 1_000_000 + 'M' : n >= 1000 ? Math.round(n / 1000) + 'K' : String(n));
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <label class="grow text-sm font-medium" style="color: {INK}">
      Año: <strong class="tabular-nums" style="color: {ACCENT}">{scrub}</strong>
      <input type="range" min={TIMELINE_YEARS[0]} max={TIMELINE_YEARS[1]} step="1" value={scrub} oninput={(e) => onScrub(+e.currentTarget.value)} class="mt-1 w-full accent-interactive" aria-label="Año de la línea de tiempo" />
    </label>
    <button
      class="rounded-md border px-3 py-1.5 text-xs font-medium"
      style={ctxAxis ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
      onclick={() => (ctxAxis = !ctxAxis)}
    >Eje Y: {ctxAxis ? 'ventana de contexto (log)' : 'cronología'}</button>
  </div>

  <svg viewBox="0 0 {W} {H}" class="w-full select-none">
    <!-- eje temporal -->
    <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke={AXIS} stroke-width="1.5" />
    {#each [2017, 2019, 2021, 2023, 2025] as yr}
      <text x={xS(yr)} y={H - M.b + 18} text-anchor="middle" font-size="11" fill={MUTED}>{yr}</text>
      <line x1={xS(yr)} y1={H - M.b} x2={xS(yr)} y2={H - M.b + 4} stroke={AXIS} />
    {/each}
    <!-- eje de contexto (solo en modo log) -->
    {#if ctxAxis}
      {#each [512, 4096, 32_000, 200_000, 1_000_000] as c}
        <text x={M.l - 6} y={yLog(c) + 3.5} text-anchor="end" font-size="10" fill={MUTED}>{fmtCtx(c)}</text>
        <line x1={M.l} y1={yLog(c)} x2={W - M.r} y2={yLog(c)} stroke={AXIS} stroke-width="0.5" opacity="0.5" />
      {/each}
      <text x={M.l - 40} y={M.t + 2} font-size="10" fill={MUTED}>tokens</text>
    {/if}

    <!-- hitos -->
    {#each TIMELINE as e, i (e.name)}
      {@const shown = Math.floor(e.year) <= scrub}
      {@const cx = xS(e.year)}
      {@const cy = yOf(e, i)}
      {#if shown}
        <g
          class="node-in"
          style="cursor: pointer"
          role="button"
          tabindex="0"
          aria-label="{e.name} ({e.year})"
          onclick={() => (selName = e.name)}
          onkeydown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              selName = e.name;
            }
          }}
        >
          <line x1={cx} y1={cy + 8} x2={cx} y2={H - M.b} stroke={color(e)} stroke-width="1" opacity="0.3" />
          <circle cx={cx} cy={cy} r={e.milestone ? 9 : 6} fill={color(e)} opacity={sel.name === e.name ? 1 : 0.75} stroke={sel.name === e.name ? INK : 'none'} stroke-width="2" style="transition: opacity 0.2s ease" />
          <text x={cx} y={cy - 13} text-anchor="middle" font-size="11" font-weight={e.milestone ? 700 : 500} fill={sel.name === e.name ? INK : MUTED}>{e.name}</text>
        </g>
      {/if}
    {/each}
  </svg>

  <div class="mt-2 rounded-md border p-3" style="border-color: {color(sel)}; background-color: {PAPER}" aria-live="polite">
    <p class="text-sm" style="color: {INK}">
      <strong style="color: {color(sel)}">{Math.floor(sel.year)} · {sel.name}</strong>
      <span class="ml-2 rounded-full border px-2 py-0.5 text-[10px] tabular-nums" style="border-color: {BORDER}; color: {MUTED}">ventana: {fmtCtx(sel.ctx)} tokens</span>
    </p>
    <p class="mt-1 text-sm leading-snug" style="color: {MUTED}">{sel.note}</p>
  </div>

  <p class="mt-2 text-xs" style="color: {MUTED}">Activa el eje de <strong>ventana de contexto</strong>: de 512 tokens (2018) a un millón (2024) — tres órdenes de magnitud en seis años. El modelo de hoy es el peor que usarás en tu carrera.</p>
</div>

<style>
  .node-in {
    animation: node-pop 0.35s ease;
  }
  @keyframes node-pop {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
