<script lang="ts">
  import { INGREDIENTS, detectIngredients, simulatedResponse, WEAK_PROMPT, MODEL_SOLUTION } from '../../lib/llm/prompt';
  import Celebrate from '../ui/Celebrate.svelte';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // La actividad de cierre: transforma el prompt débil del temario en uno
  // fuerte. Los ingredientes se encienden EN VIVO mientras escribes.

  let text = $state('');
  let comparing = $state(false);
  let celebrated = $state(false);

  let detected = $derived(new Set(detectIngredients(text)));
  let count = $derived(detected.size);
  let weakSim = $derived(simulatedResponse([]));
  let mySim = $derived(simulatedResponse([...detected]));

  $effect(() => {
    if (count >= 5 && !celebrated) celebrated = true;
  });
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <p class="mb-2 text-sm" style="color: {INK}">El prompt que llegó del área comercial:</p>
  <blockquote class="mb-3 rounded-md border-l-4 p-3 text-sm italic" style="border-color: {WARN}; background-color: {PAPER}; color: {INK}">"{WEAK_PROMPT}"</blockquote>

  <label class="block text-sm font-medium" style="color: {INK}">
    Escribe tu versión mejorada:
    <textarea
      bind:value={text}
      rows="4"
      class="mt-1 w-full rounded-md border p-3 text-sm"
      style="border-color: {count >= 5 ? SUCCESS : BORDER}; background-color: {PAPER}; color: {INK}"
      placeholder="Actúa como… con base en… para… en formato… si falta información…"
    ></textarea>
  </label>

  <div class="mt-2 flex flex-wrap items-center gap-1.5" aria-live="polite">
    {#each INGREDIENTS as ing}
      {@const on = detected.has(ing.id)}
      <span class="rounded-full border px-2.5 py-1 text-xs font-medium transition-all {on ? 'chip-on' : ''}" style={on ? `background-color:${SUCCESS};color:${PAPER};border-color:${SUCCESS}` : `color:${MUTED};border-color:${BORDER}`}>{on ? '✓' : '○'} {ing.label}</span>
    {/each}
    <span class="ml-1 text-sm font-bold tabular-nums" style="color: {count >= 5 ? SUCCESS : MUTED}">{count}/6</span>
  </div>
  <Celebrate active={celebrated} label="¡Prompt de analista!" />

  <div class="mt-3 flex flex-wrap gap-2">
    <button class="rounded-md px-4 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {text.trim().length < 10 ? 0.4 : 1}" disabled={text.trim().length < 10} onclick={() => (comparing = true)}>⚖ Comparar respuestas</button>
  </div>

  {#if comparing}
    <div class="card-in mt-3 grid gap-2 sm:grid-cols-2">
      <div class="rounded-md border p-3" style="border-color: {WARN}">
        <p class="mb-1 text-xs font-bold uppercase tracking-wide" style="color: {WARN}">Con el prompt débil</p>
        <p class="whitespace-pre-line text-xs leading-relaxed" style="color: {INK}">{weakSim.text}</p>
        <ul class="mt-1.5 space-y-0.5">{#each weakSim.issues as issue}<li class="text-[11px]" style="color: {WARN}">⚠ {issue}</li>{/each}</ul>
      </div>
      <div class="rounded-md border p-3" style="border-color: {count >= 4 ? SUCCESS : BORDER}">
        <p class="mb-1 text-xs font-bold uppercase tracking-wide" style="color: {count >= 4 ? SUCCESS : MUTED}">Con TU prompt ({count}/6 ingredientes)</p>
        <p class="whitespace-pre-line text-xs leading-relaxed" style="color: {INK}">{mySim.text}</p>
        {#if mySim.issues.length > 0}
          <ul class="mt-1.5 space-y-0.5">{#each mySim.issues as issue}<li class="text-[11px]" style="color: {WARN}">⚠ {issue}</li>{/each}</ul>
        {:else}
          <p class="mt-1.5 text-[11px] font-semibold" style="color: {SUCCESS}">✓ Sin problemas detectados.</p>
        {/if}
      </div>
    </div>
  {/if}

  <details class="mt-3 rounded-md border p-3" style="border-color: {BORDER}; background-color: {PAPER}">
    <summary class="cursor-pointer text-sm font-semibold" style="color: {ACCENT}">Ver una solución modelo</summary>
    <p class="mt-2 rounded-md border-l-4 p-3 text-sm leading-relaxed" style="border-color: {SUCCESS}; color: {INK}">"{MODEL_SOLUTION}"</p>
    <p class="mt-1 text-xs" style="color: {MUTED}">El detector es una heurística de palabras clave — como todo clasificador simple, puedes engañarlo. El punto no es el medidor: es el hábito de revisar los 6 ingredientes antes de enviar.</p>
  </details>
</div>

<style>
  .chip-on {
    animation: chip-pop 0.3s ease;
  }
  .card-in {
    animation: card-in 0.3s ease;
  }
  @keyframes chip-pop {
    from {
      transform: scale(0.7);
    }
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
