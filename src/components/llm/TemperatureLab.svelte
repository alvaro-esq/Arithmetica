<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { TEMP_DEMO, TEMP_DEMO_PROMPT, softmaxT, sampleIndex } from '../../lib/llm/lm';
  import { mulberry32 } from '../../lib/svm/prng';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Temperature re-forma la distribución del siguiente token EN VIVO, y el
  // muestreo repetido demuestra lo que significa en la práctica: consistencia
  // vs variedad. No hace al modelo más listo — solo redistribuye probabilidad.

  const logits = TEMP_DEMO.map((c) => c.logit);
  const N_SAMPLES = 50;

  // el tween de T es la única fuente de verdad: el slider lo lee y lo escribe
  const tT = new Tween(0.7, { duration: 250, easing: cubicOut });

  let seed = $state(42);
  let counts = $state<number[]>([0, 0, 0, 0, 0]);
  let sampling = $state(false);

  let probs = $derived(softmaxT(logits, tT.current));
  let drawn = $derived(counts.reduce((x, y) => x + y, 0));

  function setT(v: number) {
    tT.target = v;
    counts = [0, 0, 0, 0, 0];
    sampling = false;
  }
  function runSamples() {
    counts = [0, 0, 0, 0, 0];
    sampling = true;
  }
  function reseed() {
    seed += 1;
    runSamples();
  }

  $effect(() => {
    if (!sampling) return;
    const rng = mulberry32(seed);
    const p = softmaxT(logits, tT.target);
    return stepLoop({
      interval: 40,
      total: N_SAMPLES,
      step: () => {
        const i = sampleIndex(p, rng);
        counts[i]++;
        return counts.reduce((x, y) => x + y, 0);
      },
      onDone: () => (sampling = false),
    });
  });
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <p class="mb-1 text-sm" style="color: {INK}">Prompt: <em>"{TEMP_DEMO_PROMPT}"</em></p>

  <!-- distribución -->
  <div class="flex items-end gap-2" style="height: 150px" aria-live="polite" aria-label="Distribución de probabilidad">
    {#each TEMP_DEMO as c, i}
      <div class="flex h-full flex-1 flex-col items-center justify-end gap-1">
        <span class="text-xs font-bold tabular-nums" style="color: {ACCENT}">{Math.round(probs[i] * 100)}%</span>
        <div class="w-full rounded-t" style="height: {Math.max(1.5, probs[i] * 115)}px; background-color: {ACCENT}; opacity: 0.85"></div>
      </div>
    {/each}
  </div>
  <div class="flex gap-2">
    {#each TEMP_DEMO as c}
      <span class="flex-1 truncate text-center text-xs font-medium" style="color: {INK}">{c.token}</span>
    {/each}
  </div>

  <!-- el dial -->
  <div class="mt-3 flex flex-wrap items-center gap-3">
    <label class="grow text-sm font-medium" style="color: {INK}">
      temperature = <strong class="tabular-nums" style="color: {ACCENT}">{tT.target.toFixed(2)}</strong>
      <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={tT.target}
        oninput={(e) => setT(+e.currentTarget.value)}
        class="mt-1 w-full accent-interactive"
        aria-label="Temperature"
      />
    </label>
    <div class="flex gap-1.5">
      {#each [{ t: 0.1, l: '0.1' }, { t: 0.7, l: '0.7' }, { t: 1.5, l: '1.5' }] as p}
        <button class="rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums" style={Math.abs(tT.target - p.t) < 0.01 ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`} onclick={() => setT(p.t)}>{p.l}</button>
      {/each}
    </div>
  </div>

  <!-- muestreo repetido -->
  <div class="mt-4 rounded-md border p-3" style="border-color: {BORDER}; background-color: {PAPER}">
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {POS}; color: {PAPER}; opacity: {sampling ? 0.5 : 1}" disabled={sampling} onclick={runSamples}>🎲 Muestrear ×{N_SAMPLES}</button>
      <button class="rounded-md border px-3 py-1.5 text-xs" style="color: {MUTED}; border-color: {BORDER}" onclick={reseed}>semilla: {seed} ↻</button>
      <span class="text-xs tabular-nums" style="color: {MUTED}" aria-live="polite">{drawn}/{N_SAMPLES} muestras</span>
    </div>
    <div class="flex items-end gap-2" style="height: 90px">
      {#each counts as n, i}
        <div class="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
          {#if n > 0}<span class="text-[11px] font-bold tabular-nums" style="color: {POS}">{n}</span>{/if}
          <div class="w-full rounded-t" style="height: {(n / N_SAMPLES) * 70}px; background-color: {POS}; opacity: 0.85; transition: height 0.15s ease"></div>
        </div>
      {/each}
    </div>
    <div class="flex gap-2">
      {#each TEMP_DEMO as c}
        <span class="flex-1 truncate text-center text-[11px]" style="color: {MUTED}">{c.token}</span>
      {/each}
    </div>
  </div>

  <div class="mt-3 flex flex-wrap gap-1.5">
    <span class="rounded-full border px-2.5 py-1 text-[11px] font-medium" style="border-color: {SUCCESS}; color: {SUCCESS}">SQL, reportes, clasificación: T ≈ 0–0.3</span>
    <span class="rounded-full border px-2.5 py-1 text-[11px] font-medium" style="border-color: {ACCENT}; color: {ACCENT}">resúmenes ejecutivos: T ≈ 0.3–0.7</span>
    <span class="rounded-full border px-2.5 py-1 text-[11px] font-medium" style="border-color: {WARN}; color: {WARN}">lluvia de ideas, nombres: T ≈ 0.8–1.2</span>
  </div>
</div>
