<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { lineSegment, signedDistance, type Domain, type V2 } from '../../lib/svm/geometry';
  import { gridCells } from '../../lib/viz/grid';
  import {
    gatePoints,
    gateTruth,
    perceptronPreset,
    perceptronAccuracy,
    gateDomain,
    type Gate,
    type GatePoint,
  } from '../../lib/dl/perceptron';
  import { POS, NEG, ACCENT, AXIS, PAPER, WARN, SUCCESS, MUTED } from '../../lib/svm/colors';

  // A perceptron draws ONE straight line: w·x + b = 0. AND, OR and NAND each have
  // a line that separates their 1s from their 0s, so the perceptron reaches 100%.
  // XOR does not — no line splits {(0,1),(1,0)} from {(0,0),(1,1)} — so accuracy
  // tops out at 75%. That wall is exactly why we need a hidden layer.

  let { seed = 21 }: { seed?: number } = $props();

  // `gate` is the dataset (which truth table to show); `activePreset` drives the
  // button highlight and is cleared the moment the user hand-tunes a weight, so
  // the highlight never claims a preset that no longer matches the line.
  let gate = $state<Gate>('AND');
  let activePreset = $state<Gate | null>('AND');
  let w1 = $state(1);
  let w2 = $state(1);
  let b = $state(-1.5);

  const dom: Domain = gateDomain;
  const width = 460;
  const height = 460;
  const pad = 40;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let pts = $derived<GatePoint[]>(gatePoints(gate, seed));
  let corners = $derived(gateTruth(gate));
  let w = $derived<V2>({ x: w1, y: w2 });
  let seg = $derived(lineSegment(w, b, 0, dom));
  let acc = $derived(perceptronAccuracy(pts, w, b));
  let separable = $derived(gate !== 'XOR');

  const cells = gridCells(dom, 40, xScale, yScale);

  function applyPreset(g: Gate) {
    gate = g;
    activePreset = g;
    const p = perceptronPreset(g);
    w1 = p.w1;
    w2 = p.w2;
    b = p.b;
  }

  // Any manual weight edit means the line no longer matches the named preset.
  function tweak() {
    activePreset = null;
  }

  const gates: Gate[] = ['AND', 'OR', 'NAND', 'XOR'];
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-2">
    {#each gates as g}
      <button
        class="rounded-md border px-3 py-1.5 text-sm font-medium"
        style={activePreset === g ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${AXIS}`}
        onclick={() => applyPreset(g)}
      >
        {g}
      </button>
    {/each}
  </div>

  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-square">
    <!-- shaded half-planes -->
    {#each cells as c}
      <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={signedDistance(w, b, { x: c.cx, y: c.cy }) > 0 ? POS : NEG} fill-opacity="0.13" />
    {/each}

    <!-- axes -->
    <line x1={pad} y1={yScale(0)} x2={width - pad} y2={yScale(0)} stroke={AXIS} stroke-width="1.5" />
    <line x1={xScale(0)} y1={pad} x2={xScale(0)} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- decision line -->
    <line x1={xScale(seg[0].x)} y1={yScale(seg[0].y)} x2={xScale(seg[1].x)} y2={yScale(seg[1].y)} stroke={ACCENT} stroke-width="3" />

    <!-- jitter cloud -->
    {#each pts as p}
      <circle cx={xScale(p.x)} cy={yScale(p.y)} r="4" fill={p.label === 1 ? POS : NEG} opacity="0.5" />
    {/each}
    <!-- the four true corners, emphasized -->
    {#each corners as c}
      <circle cx={xScale(c.x)} cy={yScale(c.y)} r="9" fill={c.label === 1 ? POS : NEG} stroke={PAPER} stroke-width="2" />
      <text x={xScale(c.x)} y={yScale(c.y) - 13} text-anchor="middle" font-size="11" font-weight="600" fill={MUTED}>{c.label}</text>
    {/each}
  </svg>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <label class="block text-sm font-medium text-ink">
      w₁: {w1.toFixed(1)}
      <input type="range" bind:value={w1} oninput={tweak} min="-4" max="4" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      w₂: {w2.toFixed(1)}
      <input type="range" bind:value={w2} oninput={tweak} min="-4" max="4" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      b: {b.toFixed(1)}
      <input type="range" bind:value={b} oninput={tweak} min="-4" max="4" step="0.1" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    <span>Precisión: <strong style="color: {acc === 1 ? SUCCESS : WARN}">{Math.round(acc * 100)}%</strong></span>
    {#if !separable}
      <span class="rounded-full px-3 py-1 text-xs font-medium text-paper" style="background-color: {WARN}">
        Ninguna recta separa XOR → necesitamos capas ocultas
      </span>
    {/if}
  </div>
  <p class="text-xs text-muted">Mueve los pesos para separar los puntos <span style="color: {POS}">naranjas</span> de los <span style="color: {NEG}">grises</span>. Con XOR es imposible con una sola recta.</p>
</div>
