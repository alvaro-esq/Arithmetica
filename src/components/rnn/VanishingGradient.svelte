<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { runRNN, gradFlow } from '../../lib/rnn/recurrence';
  import { spikeSeq } from '../../lib/rnn/tokens';
  import { ACCENT, POS, SUCCESS, AXIS, PAPER, WARN, MUTED, INK } from '../../lib/svm/colors';

  // Why RNNs forget — and why LSTM/GRU exist. BPTT multiplies one factor per
  // timestep: ∂h_T/∂h_k = ∏ Whh·tanh'(·). With |Whh·tanh'| < 1 the product shrinks
  // geometrically, so the gradient reaching the *first* step is microscopic — the
  // network can't learn long-range dependencies. The linearized toggle drops tanh'
  // to expose the pure |Whh|>1 explosion the saturating regime would otherwise damp.

  let Whh = $state(0.85);
  let T = $state(20);
  let saturating = $state(true);

  const width = 640;
  const height = 300;
  const padL = 44;
  const padR = 16;
  const padT = 22;
  const padB = 40;

  // A fixed, mild input so tanh operates in a realistic (partly saturated) regime.
  let pre = $derived(runRNN(spikeSeq(T, 0, 5, 0.5), { Whh, Wxh: 0.5, bh: 0 }).pre);
  let mags = $derived(gradFlow(pre, Whh, saturating)); // index 0 = oldest step

  // log scale keeps both the vanishing and exploding regimes legible
  let logMags = $derived(mags.map((m) => Math.log10(Math.max(m, 1e-12))));
  const LO = -12;
  const HI = 6;
  const xScale = scaleLinear().domain([0, 1]).range([padL, width - padR]);
  const yScale = scaleLinear().domain([LO, HI]).range([height - padB, padT]);
  let barW = $derived(((width - padR - padL) / Math.max(1, T)) * 0.7);

  function bx(i: number): number {
    return padL + ((i + 0.5) / T) * (width - padR - padL);
  }
  const y0 = yScale(0); // |grad| = 1 reference line

  let first = $derived(mags[0] ?? 1); // gradient that reaches the very first step
  let vanished = $derived(first < 1e-3);
  let exploded = $derived(first > 1e3);

  const gridLines = [6, 3, 0, -3, -6, -9, -12];
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-[2/1]">
    <!-- log gridlines -->
    {#each gridLines as g}
      {#if g >= LO && g <= HI}
        <line x1={padL} y1={yScale(g)} x2={width - padR} y2={yScale(g)} stroke={g === 0 ? MUTED : AXIS} stroke-width="1" opacity={g === 0 ? 0.8 : 0.5} stroke-dasharray={g === 0 ? '' : '3 3'} />
        <text x={padL - 6} y={yScale(g) + 3} text-anchor="end" font-size="9" fill={MUTED}>1e{g}</text>
      {/if}
    {/each}
    <text x={padL} y={padT - 8} font-size="11" fill={MUTED}>|∂h_T/∂h_k| (escala log)</text>

    <!-- bars: leftmost = gradient reaching the oldest step -->
    {#each logMags as lm, i}
      {@const top = Math.max(yScale(lm), padT)}
      <rect
        x={bx(i) - barW / 2}
        y={lm >= 0 ? top : y0}
        width={barW}
        height={Math.abs(yScale(lm) - y0)}
        fill={i === 0 ? (exploded ? WARN : SUCCESS) : ACCENT}
        opacity={i === 0 ? 0.95 : 0.6}
      />
    {/each}

    <!-- axis labels -->
    <text x={bx(0)} y={height - 14} text-anchor="middle" font-size="10" fill={exploded ? WARN : SUCCESS}>k=1 (inicio)</text>
    <text x={bx(T - 1)} y={height - 14} text-anchor="middle" font-size="10" fill={MUTED}>k=T (final)</text>
  </svg>

  <div class="rounded-md px-3 py-2 text-sm" style="background-color: {PAPER}; border: 1px solid {AXIS}">
    <span style="color: {INK}">
      Tras <strong>{T}</strong> pasos, el gradiente que llega al inicio vale
      <strong style="color: {exploded ? WARN : vanished ? ACCENT : SUCCESS}">{first.toExponential(2)}</strong>.
    </span>
    {#if vanished}
      <span class="text-muted"> → se <strong>desvanece</strong>: la red no aprende el inicio de la secuencia.</span>
    {:else if exploded}
      <span class="text-muted"> → <strong>explota</strong>: actualizaciones inestables.</span>
    {/if}
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      W_hh: {Whh.toFixed(2)}
      <input type="range" bind:value={Whh} min="0.1" max="1.8" step="0.01" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Longitud T: {T}
      <input type="range" bind:value={T} min="4" max="30" step="1" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      <button class="px-3 py-1.5" style={saturating ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (saturating = true)}>saturante (tanh′)</button>
      <button class="px-3 py-1.5" style={!saturating ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (saturating = false)}>linealizado (W_hh)</button>
    </span>
    {#if vanished}
      <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {ACCENT}; color: {PAPER}">gradiente desvaneciente</span>
    {:else if exploded}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {WARN}">gradiente explosivo</span>
    {/if}
  </div>
  <p class="text-xs text-muted">El producto de un factor por paso decae (o crece) geométricamente. Por eso las RNN simples "olvidan" — y por eso aparecen <strong>LSTM</strong> y <strong>GRU</strong> con puertas que protegen el flujo del gradiente.</p>
</div>
