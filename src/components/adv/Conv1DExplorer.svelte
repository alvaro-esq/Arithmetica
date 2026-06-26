<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { conv1d, windowAt, demoSignal, KERNELS } from '../../lib/adv/conv';
  import { ACCENT, POS, SUCCESS, AXIS, PAPER, MUTED, INK } from '../../lib/svm/colors';

  // The defining CNN operation, on a 1-D structured signal (the deck's emphasis).
  // A small kernel slides over the signal; at each position it outputs a weighted
  // sum of the local window. Pick a kernel and scrub the position to see the exact
  // dot product — and watch how the edge kernel lights up at transitions.

  const N = 22;
  const signal = demoSignal(N, 9);

  let kernelKey = $state<keyof typeof KERNELS>('edge');
  let pos = $state(Math.floor(N * 0.35)); // scrubbed kernel position

  let kernel = $derived(KERNELS[kernelKey]);
  let feature = $derived(conv1d(signal, kernel.w));
  let window = $derived(windowAt(signal, kernel.w, pos));
  let dotValue = $derived(feature[pos]);

  const width = 640;
  const height = 340;
  const padL = 40;
  const padR = 16;
  const padT = 18;
  const topH = 96; // input band
  const midGap = 30;
  const botY0 = padT + topH + midGap;
  const botH = height - botY0 - 28;

  const xScale = scaleLinear().domain([0, N]).range([padL, width - padR]);
  const barW = (xScale(1) - xScale(0)) * 0.55;
  const sMax = Math.max(1, ...signal.map((v) => Math.abs(v)));
  const inScale = scaleLinear().domain([0, sMax]).range([0, topH * 0.82]);
  // feature map can be negative (edge kernel); center it
  let fAbsMax = $derived(Math.max(1, ...feature.map((v) => Math.abs(v))));
  let fMid = $derived(botY0 + botH / 2);
  let fScale = $derived(scaleLinear().domain([-fAbsMax, fAbsMax]).range([botY0 + botH, botY0]));

  function cx(i: number): number {
    return xScale(i + 0.5);
  }
  const r = Math.floor(KERNELS.edge.w.length / 2); // all kernels length 3 → r=1
  let featLine = $derived(feature.map((f, i) => `${cx(i)},${fScale(f)}`).join(' '));
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-[2/1]">
    <text x={padL} y={padT - 4} font-size="11" fill={MUTED}>señal de entrada</text>
    <text x={padL} y={botY0 - 10} font-size="11" fill={MUTED}>mapa de características (señal ∗ filtro)</text>

    <!-- sliding kernel window highlight (covers pos-r .. pos+r) -->
    <rect x={xScale(pos - r)} y={padT} width={xScale(pos + r + 1) - xScale(pos - r)} height={topH} fill={ACCENT} opacity="0.1" />
    <rect x={xScale(pos - r)} y={padT} width={xScale(pos + r + 1) - xScale(pos - r)} height={topH} fill="none" stroke={ACCENT} stroke-width="1.5" opacity="0.6" />

    <!-- input bars -->
    {#each signal as v, i}
      <rect x={cx(i) - barW / 2} y={padT + topH - inScale(Math.abs(v))} width={barW} height={inScale(Math.abs(v))} fill={i >= pos - r && i <= pos + r ? ACCENT : MUTED} opacity={i >= pos - r && i <= pos + r ? 0.85 : 0.45} />
    {/each}
    <line x1={padL} y1={padT + topH} x2={width - padR} y2={padT + topH} stroke={AXIS} stroke-width="1" />

    <!-- feature map: zero line + series + dots -->
    <line x1={padL} y1={fMid} x2={width - padR} y2={fMid} stroke={AXIS} stroke-width="1" opacity="0.7" />
    <polyline points={featLine} fill="none" stroke={ACCENT} stroke-width="2.5" />
    {#each feature as f, i}
      <circle cx={cx(i)} cy={fScale(f)} r={i === pos ? 6 : 3} fill={i === pos ? SUCCESS : ACCENT} stroke={PAPER} stroke-width="1.4" />
    {/each}

    <!-- index ticks -->
    {#each Array(N) as _, i}
      {#if i % 3 === 0}
        <text x={cx(i)} y={height - 10} text-anchor="middle" font-size="9" fill={MUTED}>{i}</text>
      {/if}
    {/each}
  </svg>

  <!-- the dot product at the scrubbed position -->
  <div class="rounded-md px-3 py-2 text-sm" style="background-color: {PAPER}; border: 1px solid {AXIS}">
    <span class="text-muted">posición {pos}:</span>
    <span style="color: {INK}">
      {#each window as t, j}{j > 0 ? ' + ' : ' '}({t.s.toFixed(2)}·{t.k.toFixed(2)}){/each}
      = <strong style="color: {SUCCESS}">{dotValue.toFixed(2)}</strong>
    </span>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="text-sm font-medium text-ink">
      Filtro (kernel):
      <span class="mt-1 inline-flex overflow-hidden rounded-md border" style="border-color: {AXIS}">
        {#each Object.entries(KERNELS) as [key, k]}
          <button class="px-2.5 py-1.5 text-sm" style={kernelKey === key ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => (kernelKey = key as keyof typeof KERNELS)}>{k.label}</button>
        {/each}
      </span>
    </div>
    <label class="block text-sm font-medium text-ink">
      Posición del filtro: {pos}
      <input type="range" bind:value={pos} min={0} max={N - 1} step="1" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {SUCCESS}; color: {PAPER}">
      el filtro detecta el patrón sin importar dónde ocurra
    </span>
  </div>
  <p class="text-xs text-muted">{kernel.note} El mismo filtro se aplica en <strong>cada posición</strong>: por eso una CNN reconoce un patrón local (un borde, un pico, una tendencia) esté donde esté en la secuencia.</p>
</div>
