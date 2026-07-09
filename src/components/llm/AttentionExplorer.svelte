<script lang="ts">
  import { SENTENCES } from '../../lib/llm/attention';
  import { ACCENT, POS, PAPER, PAPER_RAISED, INK, MUTED, BORDER, AXIS } from '../../lib/svm/colors';

  // Atención sin fórmulas: pasa el cursor (o el foco) por una palabra y mira a
  // cuáles otras "atiende". El grosor y la opacidad del arco son el peso α.

  let sentIdx = $state(0);
  let qSel = $state(4); // "con" — el nudo de la ambigüedad
  let showMatrix = $state(false);

  let sent = $derived(SENTENCES[sentIdx]);
  let row = $derived(sent.alpha[qSel]);
  let note = $derived(sent.notes[qSel]);

  // geometría de los chips: ancho proporcional al texto, centrados
  const GAP = 10;
  const CHIP_H = 34;
  const ROW_Y = 168;
  let widths = $derived(sent.tokens.map((t) => t.length * 8.8 + 24));
  let xs = $derived(
    widths.reduce<number[]>((acc, w, i) => {
      acc.push(i === 0 ? 20 : acc[i - 1] + widths[i - 1] + GAP);
      return acc;
    }, []),
  );
  let totalW = $derived(xs[xs.length - 1] + widths[widths.length - 1] + 20);
  let centers = $derived(xs.map((x, i) => x + widths[i] / 2));

  // matriz opcional debajo
  const CELL = 44;
  let matrixH = $derived(showMatrix ? sent.tokens.length * CELL + 46 : 0);
  let viewH = $derived(ROW_Y + CHIP_H + 44 + matrixH);

  function arcPath(from: number, to: number): string {
    const x1 = centers[from];
    const x2 = centers[to];
    const lift = Math.min(120, 26 + Math.abs(x2 - x1) * 0.32);
    return `M ${x1} ${ROW_Y - 6} Q ${(x1 + x2) / 2} ${ROW_Y - 6 - lift} ${x2} ${ROW_Y - 6}`;
  }

  function pick(i: number) {
    qSel = i;
  }
  function switchSentence(i: number) {
    sentIdx = i;
    qSel = i === 0 ? 4 : 6; // "con" / "mejoró": los tokens con historia
  }
</script>

<div class="rounded-lg border p-3" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
    <div class="flex gap-2" role="group" aria-label="Elegir oración">
      {#each SENTENCES as s, i}
        <button
          class="rounded-md border px-3 py-1 text-sm font-medium"
          style={i === sentIdx ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
          onclick={() => switchSentence(i)}
        >{s.label}</button>
      {/each}
    </div>
    <button
      class="rounded-md border px-3 py-1 text-xs"
      style={showMatrix ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
      onclick={() => (showMatrix = !showMatrix)}
    >{showMatrix ? 'Ocultar matriz' : 'Ver la matriz completa'}</button>
  </div>

  <svg viewBox="0 0 {totalW} {viewH}" class="w-full select-none">
    <!-- arcos de atención desde el token seleccionado -->
    {#each row as w, k (sentIdx + '-' + qSel + '-' + k)}
      {#if k !== qSel && w >= 0.04}
        <path
          d={arcPath(qSel, k)}
          fill="none"
          stroke={POS}
          stroke-width={1 + w * 11}
          opacity={0.2 + w * 1.6}
          stroke-linecap="round"
          class="arc"
        />
      {/if}
    {/each}

    <!-- porcentaje sobre los destinos relevantes -->
    {#each row as w, k}
      {#if k !== qSel && w >= 0.1}
        <text x={centers[k]} y={ROW_Y - 14} text-anchor="middle" font-size="11" font-weight="700" fill={POS} class="arc">{Math.round(w * 100)}%</text>
      {/if}
    {/each}

    <!-- chips de tokens -->
    {#each sent.tokens as tk, i}
      <g
        role="button"
        tabindex="0"
        aria-label={'Atención de "' + tk + '"'}
        aria-pressed={i === qSel}
        style="cursor:pointer; outline-offset: 3px"
        onmouseenter={() => pick(i)}
        onfocus={() => pick(i)}
        onclick={() => pick(i)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick(i);
          }
        }}
      >
        <rect
          x={xs[i]}
          y={ROW_Y}
          width={widths[i]}
          height={CHIP_H}
          rx="8"
          fill={i === qSel ? ACCENT : POS}
          fill-opacity={i === qSel ? 1 : 0.08 + row[i] * 1.1}
          stroke={i === qSel ? ACCENT : BORDER}
          style="transition: fill-opacity 0.25s ease"
        />
        <text
          x={centers[i]}
          y={ROW_Y + CHIP_H / 2 + 5}
          text-anchor="middle"
          font-size="15"
          font-weight={i === qSel ? 700 : 500}
          fill={i === qSel ? PAPER : row[i] > 0.4 ? PAPER : INK}
        >{tk}</text>
      </g>
    {/each}

    <!-- matriz n×n opcional -->
    {#if showMatrix}
      {@const mTop = ROW_Y + CHIP_H + 40}
      {@const mLeft = (totalW - sent.tokens.length * CELL) / 2}
      <text x={totalW / 2} y={mTop - 12} text-anchor="middle" font-size="11" fill={MUTED}>cada fila: a quién mira ese token (suma 1)</text>
      {#each sent.alpha as arow, i}
        <text x={mLeft - 8} y={mTop + i * CELL + CELL / 2 + 4} text-anchor="end" font-size="10" fill={i === qSel ? ACCENT : MUTED} font-weight={i === qSel ? 700 : 400}>{sent.tokens[i]}</text>
        {#each arow as a, j}
          <rect
            x={mLeft + j * CELL}
            y={mTop + i * CELL}
            width={CELL - 2}
            height={CELL - 2}
            rx="3"
            fill={ACCENT}
            fill-opacity={0.05 + a * 0.9}
            stroke={i === qSel ? ACCENT : AXIS}
            stroke-width={i === qSel ? 1.5 : 0.5}
            style="cursor:pointer"
            onclick={() => pick(i)}
          />
          <text x={mLeft + j * CELL + CELL / 2 - 1} y={mTop + i * CELL + CELL / 2 + 4} text-anchor="middle" font-size="9.5" fill={a > 0.5 ? PAPER : INK} opacity={a < 0.05 ? 0.35 : 1}>{a.toFixed(2)}</text>
        {/each}
      {/each}
    {/if}
  </svg>

  <p class="min-h-[2.5rem] text-sm leading-snug" style="color: {INK}" aria-live="polite">
    {#if note}💡 {note}{:else}<span style="color: {MUTED}">Pasa el cursor por cada palabra: los arcos muestran a quiénes atiende y con cuánto peso.</span>{/if}
  </p>
</div>

<style>
  .arc {
    animation: arc-in 0.3s ease;
  }
  @keyframes arc-in {
    from {
      opacity: 0;
    }
  }
</style>
