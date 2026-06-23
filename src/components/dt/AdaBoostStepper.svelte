<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { POS, NEG, ACCENT, AXIS, PAPER } from '../../lib/svm/colors';
  import { adaBoost, boostScore, boostAccuracy } from '../../lib/dt/boosting';
  import type { LPoint } from '../../lib/dt/types';
  import { mulberry32, makeGaussian } from '../../lib/svm/prng';

  // Watch boosting work: each round fits a stump (a single split), grows the weight
  // of the points it misclassifies, and adds its weighted vote to the cumulative
  // strong classifier. Scrub the rounds to replay the focusing of attention.

  const dom = { xMin: -3.2, yMin: -3.2, xMax: 3.2, yMax: 3.2 };

  // A dataset no single stump can solve: two diagonal clusters per class.
  function makeData(): LPoint[] {
    const rng = mulberry32(8);
    const g = makeGaussian(rng);
    const out: LPoint[] = [];
    const centers = [
      { x: -1.4, y: -1.4, l: 1 },
      { x: 1.4, y: 1.4, l: 1 },
      { x: -1.4, y: 1.4, l: 0 },
      { x: 1.4, y: -1.4, l: 0 },
    ];
    for (let i = 0; i < 48; i++) {
      const c = centers[i % 4];
      out.push({ x: g(c.x, 0.55), y: g(c.y, 0.55), label: c.l });
    }
    return out;
  }
  const data = makeData();
  const ROUNDS = 14;
  const boost = adaBoost(data, ROUNDS);

  let round = $state(0); // current round index (0-based)
  let playing = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function play() {
    if (playing) return; // re-entrancy guard
    playing = true;
    const tick = () => {
      if (!playing) return;
      if (round >= ROUNDS - 1) {
        playing = false;
        return;
      }
      round += 1;
      // Capture the timeout id so stop()/cleanup can actually cancel it.
      timer = setTimeout(tick, 650);
    };
    timer = setTimeout(tick, 650); // first beat is paced too, not instant
  }
  function stop() {
    playing = false;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }
  $effect(() => () => stop());

  const weights = $derived(boost.weights[round]);
  const stump = $derived(boost.stumps[round]);
  const alpha = $derived(stump.alpha);
  const accuracy = $derived(boostAccuracy(boost, round, data));
  const maxW = $derived(Math.max(...weights));

  const W = 380;
  const pad = 16;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, W - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([W - pad, pad]);
  const GRID = 46;
  const cw = (dom.xMax - dom.xMin) / GRID;

  // cumulative strong-classifier regions up to current round
  const cells = $derived.by(() => {
    const out: { x: number; y: number; w: number; h: number; fill: string; op: number }[] = [];
    let maxAbs = 1e-9;
    const raw: number[] = new Array(GRID * GRID);
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const px = dom.xMin + (gx + 0.5) * cw;
        const py = dom.yMin + (gy + 0.5) * cw;
        const s = boostScore(boost, round, { x: px, y: py });
        raw[gy * GRID + gx] = s;
        if (Math.abs(s) > maxAbs) maxAbs = Math.abs(s);
      }
    }
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const s = raw[gy * GRID + gx];
        const x0 = dom.xMin + gx * cw;
        const y0 = dom.yMin + gy * cw;
        out.push({
          x: xScale(x0),
          y: yScale(y0 + cw),
          w: xScale(x0 + cw) - xScale(x0) + 0.6,
          h: yScale(y0) - yScale(y0 + cw) + 0.6,
          fill: s >= 0 ? POS : NEG,
          op: 0.05 + 0.25 * Math.min(1, Math.abs(s) / maxAbs),
        });
      }
    }
    return out;
  });

  // the round's stump as a line
  const stumpLine = $derived.by(() => {
    if (stump.feature === 0) {
      return { x1: xScale(stump.threshold), y1: pad, x2: xScale(stump.threshold), y2: W - pad };
    }
    return { x1: pad, y1: yScale(stump.threshold), x2: W - pad, y2: yScale(stump.threshold) };
  });

  // Cumulative-accuracy sparkline: accuracy of the strong classifier after each
  // round up to the current one. This rises toward 1 (the boosting payoff), unlike
  // the per-round stump error which stays flat-high and reads as "not working".
  const accPath = $derived(
    Array.from({ length: round + 1 }, (_, i) => {
      const acc = boostAccuracy(boost, i, data);
      const sx = 6 + (i / Math.max(1, ROUNDS - 1)) * 108;
      const sy = 44 - acc * 36; // accuracy 0..1 → y in [44, 8]
      return `${sx},${sy}`;
    }).join(' '),
  );

  function radius(w: number): number {
    return 3.5 + (w / maxW) * 9;
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-[1.4fr_1fr]">
    <svg viewBox="0 0 {W} {W}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-square">
      {#each cells as c}
        <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} fill-opacity={c.op} />
      {/each}
      <!-- this round's stump -->
      <line
        x1={stumpLine.x1}
        y1={stumpLine.y1}
        x2={stumpLine.x2}
        y2={stumpLine.y2}
        stroke={ACCENT}
        stroke-width="2.5"
        stroke-dasharray="6 4"
      />
      <!-- points sized by current weight -->
      {#each data as p, i}
        <circle
          cx={xScale(p.x)}
          cy={yScale(p.y)}
          r={radius(weights[i])}
          fill={p.label === 1 ? POS : NEG}
          stroke={PAPER}
          stroke-width="1.2"
        />
      {/each}
    </svg>

    <div class="flex flex-col justify-center gap-3 text-sm text-ink">
      <div>
        Ronda <strong style="color: {ACCENT}">{round + 1}</strong> / {ROUNDS}
      </div>
      <div>Peso del stump α<sub>t</sub> = <strong>{alpha.toFixed(2)}</strong></div>
      <div>Error ponderado = <strong>{boost.trainErr[round].toFixed(3)}</strong></div>
      <div>
        Precisión acumulada =
        <strong style="color: {ACCENT}">{(accuracy * 100).toFixed(0)}%</strong>
      </div>
      <!-- cumulative-accuracy sparkline -->
      <svg viewBox="0 0 120 50" class="mt-1 w-40">
        <line x1="6" y1="44" x2="114" y2="44" stroke={AXIS} stroke-width="1" />
        <polyline points={accPath} fill="none" stroke={ACCENT} stroke-width="1.5" />
        <text x="6" y="10" font-size="8" fill="#999">precisión acumulada por ronda</text>
      </svg>
    </div>
  </div>

  <label class="block text-sm font-medium text-ink">
    Ronda: {round + 1}
    <input
      type="range"
      bind:value={round}
      oninput={stop}
      min="0"
      max={ROUNDS - 1}
      step="1"
      class="mt-1 w-full accent-interactive"
    />
  </label>

  <div class="flex flex-wrap items-center gap-3">
    <button
      onclick={() => (round = Math.min(ROUNDS - 1, round + 1))}
      disabled={round >= ROUNDS - 1}
      class="rounded-md px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
      style="background-color: {ACCENT}"
    >
      Siguiente ronda
    </button>
    <button
      onclick={playing ? stop : play}
      disabled={round >= ROUNDS - 1 && !playing}
      class="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
      style="border: 1px solid {ACCENT}; color: {NEG}"
    >
      {playing ? 'Pausar' : 'Auto'}
    </button>
    <button
      onclick={() => {
        stop();
        round = 0;
      }}
      class="rounded-md px-4 py-2 text-sm font-medium"
      style="border: 1px solid {AXIS}; color: {NEG}"
    >
      Reiniciar
    </button>
  </div>
  <p class="text-xs text-[#666]">
    El tamaño de cada punto es su peso actual: los mal clasificados crecen ronda a ronda, forzando
    al siguiente stump a atenderlos. El sombreado es el clasificador fuerte acumulado.
  </p>
</div>
