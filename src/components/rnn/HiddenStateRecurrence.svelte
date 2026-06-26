<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { runRNN, type RnnParams } from '../../lib/rnn/recurrence';
  import { spikeSeq } from '../../lib/rnn/tokens';
  import { ACCENT, POS, SUCCESS, AXIS, PAPER, MUTED, INK } from '../../lib/svm/colors';

  // The defining idea of an RNN: the hidden state carries information forward in
  // time. Feed a sequence with one early spike and watch h_t either remember it
  // (Whh near 1) or forget it within a step or two (Whh small). The scrubber shows
  // the exact recurrence h_t = tanh(Whh·h_{t-1} + Wxh·x_t + b_h) with real numbers.

  const N = 10;
  const seq = spikeSeq(N, 2, 11, 1); // fixed input: a spike at t=3 (index 2)

  // Whh is the single source of truth via a tween, so the memory/forget buttons
  // animate it while the slider still reads and writes the same value.
  const whhTween = new Tween(0.9, { duration: 600, easing: cubicOut });
  let Wxh = $state(1.6);
  let bh = $state(0);
  let tSel = $state(N); // scrubbed timestep (1..N), N = end of sequence

  let Whh = $derived(whhTween.current);
  let params = $derived<RnnParams>({ Whh, Wxh, bh });
  let result = $derived(runRNN(seq, params));

  const width = 640;
  const height = 320;
  const padL = 40;
  const padR = 16;
  const padT = 18;
  const midGap = 26;
  // top band: input bars; bottom band: hidden-state series
  const topH = 96;
  const botY0 = padT + topH + midGap;
  const botH = height - botY0 - 30;

  const xScale = scaleLinear().domain([0, N]).range([padL, width - padR]);
  const barW = (xScale(1) - xScale(0)) * 0.5;
  const xMax = Math.max(1, ...seq.map((v) => Math.abs(v)));
  const inScale = scaleLinear().domain([0, xMax]).range([0, topH * 0.8]);
  // hidden state lives in (-1, 1); map symmetrically around the band's center line
  const hMid = botY0 + botH / 2;
  const hScale = scaleLinear().domain([-1, 1]).range([botY0 + botH, botY0]);

  function cx(i: number): number {
    // center of timestep i (1-based) within its slot
    return xScale(i - 0.5);
  }

  let hxLine = $derived(
    result.h
      .slice(1)
      .map((h, i) => `${cx(i + 1)},${hScale(h)}`)
      .join(' '),
  );

  // the substituted recurrence for the selected timestep
  let calc = $derived.by(() => {
    const t = tSel;
    const hPrev = result.h[t - 1];
    const x = seq[t - 1];
    const z = Whh * hPrev + Wxh * x + bh;
    const h = result.h[t];
    return { t, hPrev, x, z, h };
  });

  const presets: { label: string; whh: number; hint: string }[] = [
    { label: 'memoria larga', whh: 0.95, hint: 'el pico persiste muchos pasos' },
    { label: 'olvido rápido', whh: 0.2, hint: 'el pico se borra enseguida' },
  ];
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-[2/1]">
    <!-- band labels -->
    <text x={padL} y={padT - 4} font-size="11" fill={MUTED}>entrada x_t</text>
    <text x={padL} y={botY0 - 8} font-size="11" fill={MUTED}>estado oculto h_t = tanh(W_hh·h_(t-1) + W_xh·x_t + b_h)</text>

    <!-- selected-timestep highlight column -->
    <rect x={xScale(tSel - 1)} y={padT} width={xScale(1) - xScale(0)} height={height - padT - 30} fill={ACCENT} opacity="0.07" />

    <!-- input bars -->
    {#each seq as v, i}
      <rect
        x={cx(i + 1) - barW / 2}
        y={padT + topH - inScale(Math.abs(v))}
        width={barW}
        height={inScale(Math.abs(v))}
        fill={i === 2 ? POS : MUTED}
        opacity={i === 2 ? 0.9 : 0.5}
      />
    {/each}
    <line x1={padL} y1={padT + topH} x2={width - padR} y2={padT + topH} stroke={AXIS} stroke-width="1" />

    <!-- hidden-state center line + series -->
    <line x1={padL} y1={hMid} x2={width - padR} y2={hMid} stroke={AXIS} stroke-width="1" opacity="0.7" />
    <text x={padL - 6} y={hScale(1) + 4} text-anchor="end" font-size="9" fill={MUTED}>1</text>
    <text x={padL - 6} y={hMid + 3} text-anchor="end" font-size="9" fill={MUTED}>0</text>
    <text x={padL - 6} y={hScale(-1) + 2} text-anchor="end" font-size="9" fill={MUTED}>-1</text>
    <polyline points={hxLine} fill="none" stroke={ACCENT} stroke-width="2.5" />
    {#each result.h.slice(1) as h, i}
      <circle cx={cx(i + 1)} cy={hScale(h)} r={i + 1 === tSel ? 6 : 3.5} fill={i + 1 === tSel ? SUCCESS : ACCENT} stroke={PAPER} stroke-width="1.5" />
    {/each}

    <!-- timestep ticks -->
    {#each Array(N) as _, i}
      <text x={cx(i + 1)} y={height - 12} text-anchor="middle" font-size="9" fill={MUTED}>{i + 1}</text>
    {/each}
  </svg>

  <!-- substituted recurrence for the scrubbed step -->
  <div class="rounded-md px-3 py-2 text-sm" style="background-color: {PAPER}; border: 1px solid {AXIS}">
    <span class="text-muted">paso t={calc.t}:</span>
    <span style="color: {INK}">
      h_{calc.t} = tanh({Whh.toFixed(2)}·<strong>{calc.hPrev.toFixed(2)}</strong> + {Wxh.toFixed(2)}·{calc.x.toFixed(2)} + {bh.toFixed(2)})
      = tanh({calc.z.toFixed(2)}) = <strong style="color: {SUCCESS}">{calc.h.toFixed(3)}</strong>
    </span>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
    <label class="block text-sm font-medium text-ink">
      W_hh (memoria): {Whh.toFixed(2)}
      <input type="range" min="0" max="1.2" step="0.01" value={Whh} oninput={(e) => whhTween.set(e.currentTarget.valueAsNumber, { duration: 0 })} class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      W_xh (entrada): {Wxh.toFixed(2)}
      <input type="range" bind:value={Wxh} min="0" max="3" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Sesgo b_h: {bh.toFixed(2)}
      <input type="range" bind:value={bh} min="-1.5" max="1.5" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Paso t: {tSel}
      <input type="range" bind:value={tSel} min="1" max={N} step="1" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    {#each presets as p}
      <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={() => whhTween.set(p.whh)}>
        {p.label}
      </button>
    {/each}
    <span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {SUCCESS}; color: {PAPER}">
      h_t arrastra el pasado → memoria
    </span>
  </div>
  <p class="text-xs text-muted">El pico en t=3 (cobre) entra una sola vez. Con <strong>W_hh</strong> alto, el estado oculto guarda su eco muchos pasos después; con W_hh bajo, lo olvida casi de inmediato.</p>
</div>
