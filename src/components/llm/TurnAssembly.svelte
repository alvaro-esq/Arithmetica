<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { SESSION_TURNS, turnPayload, sessionCost, type BlockKind } from '../../lib/llm/harness';
  import { fmtUSD } from '../../lib/llm/cost';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // El secreto de los agentes: en CADA turno el harness re-arma y re-envía
  // TODO — system, historial y resultados de herramientas. Aquí se ve (y se
  // cobra) el crecimiento.

  let turn = $state(0);

  let payload = $derived(turnPayload(turn));
  let cost = $derived(sessionCost(turn));
  let lastTurn = $derived(turn === SESSION_TURNS.length - 1);
  // los bloques nuevos de ESTE turno; en el turno 0 TODO es nuevo (incluido el system)
  let newCount = $derived(turn === 0 ? SESSION_TURNS[0].blocks.length + 1 : SESSION_TURNS[turn].blocks.length);
  let repaid = $derived(payload.blocks.length - newCount);

  const KIND_COLOR: Record<BlockKind, string> = { system: ACCENT, user: NEG, assistant: POS, tool: SUCCESS };

  // gráfica de barras: tokens de entrada por turno
  const CW = 300;
  const CH = 150;
  const PAD = { l: 44, r: 8, t: 14, b: 22 };
  const maxIn = turnPayload(SESSION_TURNS.length - 1).inTokens;
  const xS = scaleLinear().domain([0, SESSION_TURNS.length - 1]).range([PAD.l + 20, CW - PAD.r - 20]);
  const yS = scaleLinear().domain([0, maxIn]).range([CH - PAD.b, PAD.t]);
  const BAR_W = 34;

  function hOf(tokens: number): number {
    return Math.max(24, (tokens / payload.inTokens) * 280);
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center gap-3">
    <label class="grow text-sm font-medium" style="color: {INK}">
      Turno: <strong class="tabular-nums" style="color: {ACCENT}">{turn + 1} de {SESSION_TURNS.length}</strong> — {SESSION_TURNS[turn].title}
      <input type="range" min="0" max={SESSION_TURNS.length - 1} step="1" bind:value={turn} class="mt-1 w-full accent-interactive" aria-label="Turno de la sesión" />
    </label>
  </div>

  <div class="grid gap-4 sm:grid-cols-[1fr_minmax(0,320px)]">
    <!-- el request de ESTE turno -->
    <div>
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {ACCENT}">Lo que viaja en el request del turno {turn + 1}</p>
      <div class="space-y-1 rounded-md border-2 p-2" style="border-color: {ACCENT}; background-color: {PAPER}">
        {#each payload.blocks as b, i (turn + '-' + i)}
          {@const c = KIND_COLOR[b.kind]}
          {@const isNew = i >= payload.blocks.length - newCount}
          <div
            class="flex flex-col justify-center overflow-hidden rounded border-l-4 px-2 text-xs {isNew ? 'block-in' : ''}"
            style="border-color: {c}; background-color: {c}14; height: {hOf(b.tokens)}px; opacity: {isNew ? 1 : 0.72}"
          >
            <span class="font-mono font-bold" style="color: {c}">{b.kind}
              <span style="color: {MUTED}">· {b.tokens} tok {isNew ? '· nuevo' : '· RE-enviado'}</span>
            </span>
            <span class="truncate" style="color: {INK}">{b.label}</span>
          </div>
        {/each}
      </div>
      <p class="mt-1 text-xs tabular-nums" style="color: {MUTED}" aria-live="polite">
        entrada de este request: <strong style="color: {INK}">{payload.inTokens} tokens</strong> · salida: {payload.outTokens}{#if repaid > 0} — y {repaid} {repaid === 1 ? 'bloque que ya habías pagado antes, pagado otra vez' : 'bloques que ya habías pagado antes, pagados otra vez'}{:else} — todo es nuevo: aún no hay nada que re-enviar{/if}.
      </p>
    </div>

    <!-- crecimiento y costo -->
    <div>
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">Tokens de entrada por turno</p>
      <svg viewBox="0 0 {CW} {CH}" class="w-full select-none" role="img" aria-label="Barras: la entrada crece turno a turno">
        <line x1={PAD.l} y1={CH - PAD.b} x2={CW - PAD.r} y2={CH - PAD.b} stroke={AXIS} stroke-width="1.5" />
        {#each [0, maxIn] as tick}
          <text x={PAD.l - 5} y={yS(tick) + 3.5} text-anchor="end" font-size="9.5" fill={MUTED} class="tabular-nums">{tick}</text>
        {/each}
        {#each SESSION_TURNS as _, t}
          {@const v = turnPayload(t).inTokens}
          {@const on = t <= turn}
          <rect
            x={xS(t) - BAR_W / 2}
            y={on ? yS(v) : CH - PAD.b - 2}
            width={BAR_W}
            height={on ? CH - PAD.b - yS(v) : 2}
            rx="3"
            fill={t === turn ? ACCENT : POS}
            opacity={on ? (t === turn ? 1 : 0.55) : 0.18}
            style="cursor:pointer; transition: y 0.3s ease, height 0.3s ease, opacity 0.3s ease"
            role="button"
            tabindex="0"
            aria-label="Turno {t + 1}: {v} tokens de entrada"
            onclick={() => (turn = t)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                turn = t;
              }
            }}
          />
          {#if on}
            <text x={xS(t)} y={yS(v) - 4} text-anchor="middle" font-size="9" font-weight={t === turn ? 700 : 500} fill={t === turn ? ACCENT : MUTED} class="tabular-nums">{v}</text>
          {/if}
          <text x={xS(t)} y={CH - PAD.b + 13} text-anchor="middle" font-size="9.5" fill={MUTED}>T{t + 1}</text>
        {/each}
      </svg>

      <div class="mt-2 rounded-md border p-2.5 text-xs" style="border-color: {BORDER}; background-color: {PAPER}" aria-live="polite">
        <p style="color: {INK}">Acumulado de la sesión: <strong class="tabular-nums">{payload.cumIn.toLocaleString('en-US')}</strong> tokens de entrada + <strong class="tabular-nums">{payload.cumOut}</strong> de salida</p>
        <p class="mt-1" style="color: {lastTurn ? WARN : MUTED}">Costo (tier Estándar): <strong class="tabular-nums" style="color: {lastTurn ? WARN : INK}">{fmtUSD(cost.total)}</strong>{lastTurn ? ' — una conversación de 5 turnos pagó la tabla de datos 3 veces.' : ''}</p>
      </div>
    </div>
  </div>
</div>

<style>
  .block-in {
    animation: block-in 0.3s ease;
  }
  @keyframes block-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
