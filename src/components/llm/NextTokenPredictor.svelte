<script lang="ts">
  import { SCENARIOS, optionsAt, softmaxT, sampleIndex } from '../../lib/llm/lm';
  import type { GenNode } from '../../lib/llm/lm';
  import { mulberry32 } from '../../lib/svm/prng';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, NEG, PAPER, PAPER_RAISED, INK, MUTED, BORDER, SUCCESS } from '../../lib/svm/colors';

  // Generación autorregresiva paso a paso: el modelo solo responde una pregunta,
  // mil veces seguidas: "¿cuál token sigue?". Elige tú, muestrea o deja el auto.

  const T = 0.8; // temperature fija — el dial se explora en la lección 3
  const SEED = 20260708;
  let rng = mulberry32(SEED);

  let scnIdx = $state(0);
  let path = $state<number[]>([]);
  let running = $state(false);

  let scn = $derived(SCENARIOS[scnIdx]);
  let chosen = $derived.by(() => {
    const out: string[] = [];
    let level: GenNode[] | undefined = scn.root;
    for (const idx of path) {
      if (!level || !level[idx]) break;
      out.push(level[idx].token);
      level = level[idx].children;
    }
    return out;
  });
  let options = $derived(optionsAt(scn, path));
  let probs = $derived(softmaxT(options.map((o) => o.logit), T));
  let ranked = $derived(
    options
      .map((o, i) => ({ token: o.token, p: probs[i], i }))
      .sort((a, b) => b.p - a.p),
  );
  let done = $derived(options.length === 0 && path.length > 0);

  function choose(i: number) {
    path = [...path, i];
  }
  function sampleOnce() {
    if (options.length > 0) choose(sampleIndex(probs, rng));
  }
  function reset() {
    running = false;
    path = [];
    rng = mulberry32(SEED); // misma semilla → misma corrida reproducible
  }
  function switchScenario(i: number) {
    running = false;
    scnIdx = i;
    path = [];
    rng = mulberry32(SEED);
  }

  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 750,
      total: 99,
      step: () => {
        const opts = optionsAt(scn, path);
        if (opts.length === 0) return 99;
        const p = softmaxT(opts.map((o) => o.logit), T);
        path = [...path, sampleIndex(p, rng)];
        return path.length;
      },
      onDone: () => (running = false),
    });
  });
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Escenario">
    {#each SCENARIOS as s, i}
      <button
        class="rounded-md border px-3 py-1 text-sm font-medium"
        style={i === scnIdx ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => switchScenario(i)}
      >{s.label}</button>
    {/each}
  </div>

  <!-- la frase construyéndose -->
  <div class="mb-4 flex min-h-[4.5rem] flex-wrap items-center gap-1.5 rounded-md border p-3" style="border-color: {BORDER}; background-color: {PAPER}" aria-live="polite">
    {#each scn.prompt.split(' ') as w}
      <span class="rounded px-2 py-1 text-sm font-medium" style="background-color: {NEG}; color: {PAPER}; opacity: 0.85">{w}</span>
    {/each}
    {#each chosen as tk, i (i)}
      <span class="chip-in rounded px-2 py-1 text-sm font-semibold" style="background-color: {POS}; color: {PAPER}">{tk}</span>
    {/each}
    {#if !done}
      <span class="cursor-blink text-lg font-bold" style="color: {ACCENT}">▌</span>
    {:else}
      <span class="chip-in rounded-full px-2.5 py-1 text-xs font-bold" style="background-color: {SUCCESS}; color: {PAPER}">■ fin de la generación</span>
    {/if}
  </div>

  <!-- distribución del siguiente token -->
  {#if !done}
    <p class="mb-1.5 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Probabilidad del siguiente token — haz clic para elegirlo</p>
    <div class="space-y-1.5">
      {#each ranked as opt (opt.token)}
        <button
          class="group flex w-full items-center gap-2 text-left"
          onclick={() => choose(opt.i)}
          aria-label={`Elegir "${opt.token}" (${Math.round(opt.p * 100)}%)`}
        >
          <span class="w-28 shrink-0 truncate text-sm font-medium group-hover:font-bold" style="color: {INK}">{opt.token}</span>
          <span class="relative h-6 grow overflow-hidden rounded" style="background-color: {PAPER}">
            <span
              class="absolute inset-y-0 left-0 rounded"
              style="width: {opt.p * 100}%; background-color: {ACCENT}; opacity: 0.85; transition: width 0.35s ease"
            ></span>
          </span>
          <span class="w-11 shrink-0 text-right text-sm tabular-nums" style="color: {MUTED}">{Math.round(opt.p * 100)}%</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="text-sm" style="color: {INK}">
      Cada token que elegiste cambió todas las opciones siguientes. <strong>Reinicia y toma otro camino</strong>: la frase termina distinta — sin datos, todas suenan plausibles y ninguna es necesariamente verdadera.
    </p>
  {/if}

  <div class="mt-4 flex flex-wrap gap-2">
    <button
      class="rounded-md px-3 py-1.5 text-sm font-semibold"
      style="background-color: {ACCENT}; color: {PAPER}; opacity: {done ? 0.4 : 1}"
      disabled={done}
      onclick={sampleOnce}
    >🎲 Muestrear uno</button>
    <button
      class="rounded-md border px-3 py-1.5 text-sm font-semibold"
      style={running ? `background-color:${POS};color:${PAPER};border-color:${POS}` : `color:${ACCENT};border-color:${ACCENT}`}
      disabled={done}
      onclick={() => (running = !running)}
    >{running ? '⏸ Pausar' : '▶ Auto'}</button>
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺ Reiniciar</button>
  </div>
</div>

<style>
  .chip-in {
    animation: chip-pop 0.3s ease;
  }
  @keyframes chip-pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  .cursor-blink {
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
