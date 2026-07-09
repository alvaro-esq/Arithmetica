<script lang="ts">
  import { REVIEWS, DEFENSES, injectionRun, type DefenseId } from '../../lib/llm/injection';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Prompt injection: la instrucción maliciosa no llega por el prompt — llega
  // ESCONDIDA EN LOS DATOS. Activa defensas y vuelve a ejecutar.

  let activeIds = $state<DefenseId[]>([]);
  let shown = $state(0); // pasos visibles de la corrida actual
  let ran = $state(false);
  let playing = $state(false);

  let defenses = $derived(new Set(activeIds));
  let run = $derived(injectionRun(defenses));
  let done = $derived(shown >= run.steps.length);

  function toggle(id: DefenseId) {
    activeIds = defenses.has(id) ? activeIds.filter((x) => x !== id) : [...activeIds, id];
    shown = 0;
    ran = false;
    playing = false;
  }
  function execute() {
    shown = 0;
    ran = true;
    playing = true;
  }

  $effect(() => {
    if (!playing) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown = run.steps.length;
      playing = false;
      return;
    }
    return stepLoop({
      interval: 950,
      total: run.steps.length,
      step: () => ++shown,
      onDone: () => (playing = false),
    });
  });

  const ACTOR_COLOR = { sistema: ACCENT, agente: POS, defensa: SUCCESS } as const;
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <!-- los datos (con la fila maliciosa) -->
  <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {POS}">📎 Los datos que el agente va a leer</p>
  <div class="mb-3 overflow-x-auto rounded-md border" style="border-color: {BORDER}">
    <table class="w-full text-xs">
      <thead>
        <tr>
          <th class="px-2 py-1 text-left font-semibold" style="color: {MUTED}">Cliente</th>
          <th class="px-2 py-1 text-left font-semibold" style="color: {MUTED}">Comentario</th>
        </tr>
      </thead>
      <tbody>
        {#each REVIEWS as r (r.id)}
          <tr>
            <td class="border-t px-2 py-1 align-top font-medium" style="border-color: {BORDER}; color: {r.malicious ? WARN : INK}">{r.cliente}</td>
            <td class="border-t px-2 py-1 leading-snug" style="border-color: {BORDER}; color: {r.malicious ? WARN : INK}; {r.malicious ? `background-color:${WARN}12; font-weight:600` : ''}">
              {r.texto}
              {#if r.malicious}<span class="ml-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold" style="background-color: {WARN}; color: {PAPER}">⚠ inyección</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- defensas -->
  <div class="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Defensas activas">
    <span class="text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">🛡 Defensas:</span>
    {#each DEFENSES as d (d.id)}
      {@const on = defenses.has(d.id)}
      <button
        class="rounded-md border px-2.5 py-1 text-xs font-medium"
        style={on ? `background-color:${SUCCESS};color:${PAPER};border-color:${SUCCESS}` : `color:${MUTED};border-color:${BORDER}`}
        aria-pressed={on}
        onclick={() => toggle(d.id)}
      >{on ? '✓ ' : ''}{d.label}</button>
    {/each}
    <button class="ml-auto rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}" onclick={execute}>▶ Ejecutar agente</button>
  </div>
  <p class="mb-2 min-h-[1.1rem] text-xs leading-snug" style="color: {MUTED}">
    {#if activeIds.length > 0}
      {DEFENSES.find((d) => d.id === activeIds[activeIds.length - 1])?.what}
    {:else}
      Sin defensas activas. Ejecuta el agente y mira qué pasa con el comentario #3…
    {/if}
  </p>

  <!-- la corrida -->
  {#if ran}
    <div class="space-y-1" aria-live="polite">
      {#each run.steps.slice(0, shown) as s, i (activeIds.join() + '-' + i)}
        {@const c = s.danger ? WARN : s.blocked ? SUCCESS : ACTOR_COLOR[s.actor]}
        <div class="step-in rounded-md border-l-4 px-2.5 py-1.5 text-xs leading-snug" style="border-color: {c}; background-color: {c}0d; color: {INK}">
          <span class="mr-1 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold" style="background-color: {c}; color: {PAPER}">{s.danger ? '⚠ ' : ''}{s.blocked ? '🛡 ' : ''}{s.actor}</span>
          {s.text}
        </div>
      {/each}
    </div>
    {#if done}
      <div class="step-in mt-2 rounded-md border-2 p-2.5 text-sm font-semibold" style="border-color: {run.compromised ? WARN : SUCCESS}; background-color: {PAPER}; color: {run.compromised ? WARN : SUCCESS}" aria-live="polite">
        {#if run.compromised}
          ☠ Datos de clientes exfiltrados — y el resumen se ve perfectamente normal. Activa una defensa y vuelve a ejecutar.
        {:else}
          ✓ Ataque contenido. Fíjate CUÁL capa lo detuvo esta vez — prueba otra combinación.
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .step-in {
    animation: step-in 0.35s ease;
  }
  @keyframes step-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
