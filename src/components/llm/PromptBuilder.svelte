<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { INGREDIENTS, composePrompt, scorePrompt, simulatedResponse, type IngredientId } from '../../lib/llm/prompt';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Un prompt fuerte no es una frase mágica: son ingredientes concretos.
  // Enciéndelos y mira cómo cambian el prompt, el medidor y la respuesta.

  let active = $state<IngredientId[]>([]);

  const COLOR: Record<IngredientId, string> = {
    rol: ACCENT,
    contexto: NEG,
    datos: POS,
    audiencia: SUCCESS,
    formato: WARN,
    restricciones: MUTED,
  };

  let spans = $derived(composePrompt(active));
  let score = $derived(scorePrompt(active));
  let sim = $derived(simulatedResponse(active));

  // aguja del medidor: el tween es la única fuente de verdad del ángulo
  const needle = new Tween(0, { duration: 500, easing: cubicOut });
  $effect(() => {
    needle.target = score.score / score.max;
  });
  let angle = $derived(-90 + needle.current * 180);

  function toggle(id: IngredientId) {
    active = active.includes(id) ? active.filter((a) => a !== id) : [...active, id];
  }
  const verdictColor = (v: string) => (v === 'fuerte' ? SUCCESS : v === 'aceptable' ? WARN : POS);
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="grid gap-4 md:grid-cols-[1fr_1.2fr]">
    <!-- ingredientes -->
    <div>
      <p class="mb-2 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Ingredientes del prompt</p>
      <div class="grid grid-cols-2 gap-2">
        {#each INGREDIENTS as ing}
          {@const on = active.includes(ing.id)}
          <button
            class="rounded-md border-2 p-2 text-left transition-all"
            style={on ? `border-color:${COLOR[ing.id]};background-color:${COLOR[ing.id]}14` : `border-color:${BORDER}`}
            aria-pressed={on}
            title={ing.why}
            onclick={() => toggle(ing.id)}
          >
            <span class="block text-sm font-bold" style="color: {on ? COLOR[ing.id] : MUTED}">{on ? '●' : '○'} {ing.label}</span>
            <span class="block text-[11px] leading-tight" style="color: {MUTED}">{ing.why}</span>
          </button>
        {/each}
      </div>

      <!-- medidor -->
      <svg viewBox="0 0 200 118" class="mx-auto mt-3 w-48 select-none" role="img" aria-label="Calidad del prompt: {score.verdict}">
        <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke={BORDER} stroke-width="14" stroke-linecap="round" />
        <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke={verdictColor(score.verdict)} stroke-width="14" stroke-linecap="round" stroke-dasharray="{needle.current * 251} 251" style="transition: stroke 0.3s ease" />
        <line x1="100" y1="105" x2={100 + 62 * Math.sin((angle * Math.PI) / 180)} y2={105 - 62 * Math.cos((angle * Math.PI) / 180)} stroke={INK} stroke-width="3" stroke-linecap="round" />
        <circle cx="100" cy="105" r="6" fill={INK} />
        <text x="100" y="70" text-anchor="middle" font-size="17" font-weight="700" fill={verdictColor(score.verdict)} style="text-transform: capitalize">{score.verdict}</text>
      </svg>
    </div>

    <!-- prompt compuesto + respuesta -->
    <div class="space-y-3">
      <div>
        <p class="mb-1 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">El prompt que se envía</p>
        <p class="rounded-md border p-3 text-sm leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}">
          {#each spans as s, i (i)}
            {#if s.id === null}
              <span style="color: {INK}; font-weight: 600">{s.text} </span>
            {:else}
              <span class="span-in rounded px-1" style="background-color: {COLOR[s.id]}1c; color: {INK}; box-shadow: inset 0 -2px 0 {COLOR[s.id]}">{s.text}</span>{' '}
            {/if}
          {/each}
        </p>
      </div>
      <div aria-live="polite">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Respuesta simulada</p>
        <p class="whitespace-pre-line rounded-md border p-3 text-sm leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}">{sim.text}</p>
        {#if sim.issues.length > 0}
          <ul class="mt-2 space-y-1">
            {#each sim.issues as issue}
              <li class="text-xs" style="color: {WARN}">⚠ {issue}</li>
            {/each}
          </ul>
        {:else}
          <p class="mt-2 text-xs font-semibold" style="color: {SUCCESS}">✓ Sin problemas detectados: tarea, datos, audiencia, formato y límites están definidos.</p>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .span-in {
    animation: span-in 0.3s ease;
  }
  @keyframes span-in {
    from {
      opacity: 0;
    }
  }
</style>
