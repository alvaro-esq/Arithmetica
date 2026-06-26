<script lang="ts">
  import { attention } from '../../lib/rnn/attention';
  import { DEMO_TOKENS, DEMO_SCALE, tokenVectors, tokenValues } from '../../lib/rnn/tokens';
  import { ACCENT, POS, SUCCESS, AXIS, PAPER, MUTED, INK, BORDER } from '../../lib/svm/colors';

  // Attention without the bottleneck. Each token (a "query") asks every token (the
  // "keys") how relevant it is via QKᵀ, softmax turns the scores into weights that
  // sum to 1, and the output is the weighted blend of the values αV. Pick a query
  // row to see where it looks; lower the temperature (√d_k) to sharpen the focus.

  const tokens = DEMO_TOKENS;
  const n = tokens.length;
  const Q = tokenVectors();
  const V = tokenValues();

  let scale = $state(DEMO_SCALE); // the √d_k temperature
  let qSel = $state(2); // selected query row (default: the verb "saltó")

  let attn = $derived(attention(Q, Q, V, scale)); // self-attention: K = Q
  let row = $derived(attn.alpha[qSel]);
  let out = $derived(attn.out[qSel]);

  // grid geometry
  const cell = 62;
  const padL = 86; // room for query labels
  const padT = 56; // room for key labels
  const gridW = cell * n;
  const width = padL + gridW + 150; // extra column for the αV output panel
  const height = padT + gridW + 24;
  const ox = padL + gridW + 28; // x of the αV output panel

  function gx(j: number): number {
    return padL + j * cell;
  }
  function gy(i: number): number {
    return padT + i * cell;
  }

  // output vector → a readable bar pair (the context blend)
  const outScale = 1.4 * 1.2; // values live at length 1.4
  function outBar(v: number): number {
    return (v / outScale) * 30;
  }
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-square">
    <!-- key (column) labels -->
    {#each tokens as tk, j}
      <text x={gx(j) + cell / 2} y={padT - 10} text-anchor="middle" font-size="12" fill={qSel >= 0 && row[j] === Math.max(...row) ? SUCCESS : MUTED} font-weight={qSel >= 0 && row[j] === Math.max(...row) ? '700' : '400'}>{tk}</text>
    {/each}
    <text x={padL + gridW / 2} y={18} text-anchor="middle" font-size="11" fill={MUTED}>keys (a quién mira)</text>

    <!-- query (row) labels — clickable -->
    {#each tokens as tk, i}
      <text x={padL - 12} y={gy(i) + cell / 2 + 4} text-anchor="end" font-size="12" fill={i === qSel ? ACCENT : MUTED} font-weight={i === qSel ? '700' : '400'} style="cursor:pointer" onclick={() => (qSel = i)}>{tk}</text>
    {/each}

    <!-- heatmap cells -->
    {#each attn.alpha as arow, i}
      {#each arow as a, j}
        <rect
          x={gx(j)}
          y={gy(i)}
          width={cell - 2}
          height={cell - 2}
          rx="3"
          fill={ACCENT}
          fill-opacity={0.06 + a * 0.9}
          stroke={i === qSel ? ACCENT : BORDER}
          stroke-width={i === qSel ? 2 : 1}
          style="cursor:pointer"
          onclick={() => (qSel = i)}
        />
        <text x={gx(j) + cell / 2 - 1} y={gy(i) + cell / 2} text-anchor="middle" font-size="11" fill={a > 0.5 ? PAPER : INK} opacity={a < 0.04 ? 0.35 : 1}>{a.toFixed(2)}</text>
      {/each}
    {/each}

    <!-- αV output panel for the selected query -->
    <text x={ox} y={padT - 10} font-size="11" fill={MUTED}>salida αV</text>
    <line x1={ox} y1={padT} x2={ox} y2={padT + gridW} stroke={AXIS} stroke-width="1" opacity="0.6" />
    {#each out as v, k}
      {@const cy0 = padT + 40 + k * 56}
      <text x={ox + 4} y={cy0 - 14} font-size="10" fill={MUTED}>dim {k + 1}: {v.toFixed(2)}</text>
      <line x1={ox + 4} y1={cy0} x2={ox + 100} y2={cy0} stroke={AXIS} stroke-width="1" opacity="0.5" />
      <rect x={ox + 52} y={cy0 - 7} width={Math.abs(outBar(v))} height="14" transform={v < 0 ? `translate(${-Math.abs(outBar(v))},0)` : ''} fill={v >= 0 ? POS : MUTED} opacity="0.85" />
    {/each}
    <text x={ox + 4} y={padT + gridW - 4} font-size="10" fill={INK}>“{tokens[qSel]}” mezcla los values según α.</text>
  </svg>

  <label class="block text-sm font-medium text-ink">
    Temperatura (√d_k): {scale.toFixed(2)}
    <input type="range" bind:value={scale} min="0.15" max="1.4" step="0.01" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <span class="text-sm text-ink">Query seleccionada:</span>
    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      {#each tokens as tk, i}
        <button class="px-2.5 py-1.5" style={i === qSel ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (qSel = i)}>{tk}</button>
      {/each}
    </span>
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {SUCCESS}; color: {PAPER}">α suma 1 por fila</span>
  </div>
  <p class="text-xs text-muted">Cada fila es una <strong>query</strong> preguntando a todos los <strong>keys</strong>. Baja la temperatura para concentrar el foco; súbela para repartirlo. La salida es la combinación ponderada de los <strong>values</strong>.</p>
</div>
