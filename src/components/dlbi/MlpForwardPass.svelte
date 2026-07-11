<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { forward, churnMlp, inputLabels, hiddenHints, outputLabel } from '../../lib/dlbi/mlp';
  import { POS, NEG, ACCENT, AXIS, PAPER, MUTED, INK } from '../../lib/svm/colors';

  // Forward propagation tangible: dos variables del cliente entran, tres
  // neuronas ocultas (ReLU) se activan y una sigmoide entrega la probabilidad
  // de abandono. Los tweens son la fuente de verdad de ambas entradas, así los
  // deslizadores y los presets comparten la misma animación.

  const x1 = new Tween(0.7, { duration: 500, easing: cubicOut }); // antigüedad
  const x2 = new Tween(0.2, { duration: 500, easing: cubicOut }); // quejas

  let trace = $derived(forward(churnMlp, [x1.current, x2.current]));

  const width = 560;
  const height = 300;
  const IN_X = 95;
  const HID_X = 295;
  const OUT_X = 480;
  const inY = [110, 205];
  const hidY = [75, 155, 235];
  const outY = 155;
  const maxW = 4; // |peso| máximo del modelo, para escalar el grosor de las aristas

  // Activación oculta (0..∞) → [0,1) para usarla como opacidad del nodo.
  const hidT = (a: number) => a / (a + 1);
  const edgeW = (w: number) => 1 + 2.5 * (Math.abs(w) / maxW);

  const presets = [
    { label: 'Cliente leal', v1: 0.9, v2: 0.05 },
    { label: 'Cliente en riesgo', v1: 0.15, v2: 0.85 },
  ];
  function preset(p: { v1: number; v2: number }) {
    x1.set(p.v1);
    x2.set(p.v2);
  }
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none">
    <!-- aristas entrada → oculta: grosor ∝ |peso|, color según el signo -->
    {#each churnMlp.W1 as row, j}
      {#each row as w, i}
        <line x1={IN_X} y1={inY[i]} x2={HID_X} y2={hidY[j]} stroke={w > 0 ? POS : NEG} stroke-width={edgeW(w)} opacity="0.55" />
      {/each}
    {/each}
    <!-- aristas oculta → salida (todas positivas en este modelo) -->
    {#each churnMlp.W2 as w, j}
      <line x1={HID_X} y1={hidY[j]} x2={OUT_X} y2={outY} stroke={w > 0 ? POS : NEG} stroke-width={edgeW(w)} opacity="0.55" />
    {/each}

    <!-- capa de entrada -->
    {#each [x1.current, x2.current] as v, i}
      <circle cx={IN_X} cy={inY[i]} r="22" fill={ACCENT} fill-opacity={0.12 + 0.72 * v} stroke={AXIS} stroke-width="1.5" />
      <text x={IN_X} y={inY[i] + 4} text-anchor="middle" font-size="12" font-weight="600" fill={v > 0.55 ? PAPER : INK}>{v.toFixed(2)}</text>
      <text x={IN_X} y={inY[i] - 30} text-anchor="middle" font-size="11" fill={MUTED}>{inputLabels[i]}</text>
    {/each}

    <!-- capa oculta -->
    {#each trace.a1 as a, j}
      <circle cx={HID_X} cy={hidY[j]} r="22" fill={ACCENT} fill-opacity={0.12 + 0.72 * hidT(a)} stroke={AXIS} stroke-width="1.5" />
      <text x={HID_X} y={hidY[j] + 4} text-anchor="middle" font-size="12" font-weight="600" fill={hidT(a) > 0.55 ? PAPER : INK}>{a.toFixed(2)}</text>
      <text x={HID_X} y={hidY[j] + 38} text-anchor="middle" font-size="10" fill={MUTED}>{hiddenHints[j]}</text>
    {/each}
    <text x={HID_X} y={hidY[0] - 34} text-anchor="middle" font-size="11" fill={MUTED}>Capa oculta (ReLU)</text>

    <!-- salida -->
    <circle cx={OUT_X} cy={outY} r="28" fill={ACCENT} fill-opacity={0.12 + 0.72 * trace.out} stroke={ACCENT} stroke-width="2" />
    <text x={OUT_X} y={outY + 5} text-anchor="middle" font-size="14" font-weight="700" fill={trace.out > 0.55 ? PAPER : INK}>
      {(trace.out * 100).toFixed(0)}%
    </text>
    <text x={OUT_X} y={outY - 40} text-anchor="middle" font-size="11" fill={MUTED}>{outputLabel}</text>
  </svg>

  <p class="text-xs text-muted">
    Cobre = peso positivo (empuja el puntaje hacia arriba); pizarra = peso negativo. El grosor de cada conexión refleja la magnitud del peso;
    la intensidad de cada nodo, su activación.
  </p>

  <div class="grid gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      Antigüedad del cliente: {x1.current.toFixed(2)}
      <input type="range" min="0" max="1" step="0.01" value={x1.current} oninput={(e) => x1.set(e.currentTarget.valueAsNumber, { duration: 0 })} class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      Quejas recientes: {x2.current.toFixed(2)}
      <input type="range" min="0" max="1" step="0.01" value={x2.current} oninput={(e) => x2.set(e.currentTarget.valueAsNumber, { duration: 0 })} class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    {#each presets as p}
      <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={() => preset(p)}>
        {p.label}
      </button>
    {/each}
  </div>
</div>
