<script lang="ts">
  import { LAYERS, harnessResponse, HARNESS_TASK, type LayerId } from '../../lib/llm/harness';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // El modelo "desnudo" al centro; cada anillo es una capa del harness.
  // Enciéndelas una a una y mira cómo cambia la MISMA petición.

  let activeIds = $state<LayerId[]>([]);
  let lastTouched = $state<LayerId | null>(null);

  let activeSet = $derived(new Set(activeIds));
  let resp = $derived(harnessResponse(activeSet));
  let touched = $derived(lastTouched ? LAYERS.find((l) => l.id === lastTouched)! : null);

  const LAYER_COLOR: Record<LayerId, string> = {
    system: NEG,
    memoria: ACCENT,
    herramientas: POS,
    permisos: WARN,
    loop: SUCCESS,
  };

  function toggle(id: LayerId) {
    lastTouched = id;
    activeIds = activeSet.has(id) ? activeIds.filter((x) => x !== id) : [...activeIds, id];
  }

  const C = 200; // centro del SVG
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <p class="mb-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium" style="border-color: {NEG}; background-color: {PAPER}; color: {INK}">🧑‍💼 La misma petición siempre: "{HARNESS_TASK}"</p>

  <div class="grid gap-4 md:grid-cols-[minmax(0,380px)_1fr] md:items-start">
    <svg viewBox="0 0 400 400" class="w-full select-none" role="group" aria-label="Anatomía del harness: el modelo al centro y cinco capas activables">
      {#each [...LAYERS].reverse() as layer (layer.id)}
        {@const on = activeSet.has(layer.id)}
        {@const c = LAYER_COLOR[layer.id]}
        <circle
          cx={C}
          cy={C}
          r={layer.radius}
          fill={c}
          fill-opacity={on ? 0.1 : 0.015}
          stroke={c}
          stroke-width={on ? 3 : 1.5}
          stroke-opacity={on ? 1 : 0.35}
          stroke-dasharray={on ? 'none' : '5 6'}
          style="cursor:pointer; outline-offset: 3px; transition: fill-opacity 0.25s ease, stroke-opacity 0.25s ease"
          role="button"
          tabindex="0"
          aria-label="Capa: {layer.label}"
          aria-pressed={on}
          onclick={() => toggle(layer.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle(layer.id);
            }
          }}
        />
        <text
          x={C}
          y={C - layer.radius + 17}
          text-anchor="middle"
          font-size="11.5"
          font-weight={on ? 700 : 500}
          fill={on ? c : MUTED}
          opacity={on ? 1 : 0.75}
          style="pointer-events: none; transition: fill 0.25s ease"
        >{on ? '● ' : '○ '}{layer.label}</text>
      {/each}
      <!-- el modelo, siempre presente -->
      <circle cx={C} cy={C} r="52" fill={INK} />
      <text x={C} y={C - 2} text-anchor="middle" font-size="22">🧠</text>
      <text x={C} y={C + 20} text-anchor="middle" font-size="11" font-weight="700" fill={PAPER}>modelo</text>
    </svg>

    <div>
      <!-- respuesta simulada -->
      <div class="min-h-[7rem] rounded-md border p-3 text-sm leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}" aria-live="polite">
        <span class="font-bold" style="color: {ACCENT}">🤖 </span>
        <span style="color: {INK}">{resp.text}</span>
      </div>

      <!-- medidor de garantías -->
      <div class="mt-2 flex items-center gap-2">
        <span class="text-[10.5px] font-bold uppercase tracking-wide" style="color: {MUTED}">Garantías</span>
        <div class="flex gap-1" role="img" aria-label="Nivel de garantías: {resp.level} de 5">
          {#each LAYERS as _, i}
            <span class="h-2.5 w-6 rounded-full" style="background-color: {i < resp.level ? SUCCESS : AXIS}; transition: background-color 0.3s ease"></span>
          {/each}
        </div>
        <span class="text-xs tabular-nums" style="color: {resp.level === 5 ? SUCCESS : MUTED}">{resp.level}/5</span>
      </div>

      <!-- diagnóstico -->
      <ul class="mt-2 space-y-1" aria-live="polite">
        {#each resp.issues as issue (issue)}
          <li class="issue-in rounded border-l-4 px-2 py-1 text-xs leading-snug" style="border-color: {WARN}; background-color: {WARN}10; color: {INK}">⚠ {issue}</li>
        {/each}
        {#if resp.issues.length === 0}
          <li class="issue-in rounded border-l-4 px-2 py-1 text-xs" style="border-color: {SUCCESS}; background-color: {SUCCESS}10; color: {INK}">✓ Datos reales, acción verificada, permisos respetados: esto ya no es un modelo — es un sistema.</li>
        {/if}
      </ul>
    </div>
  </div>

  <!-- toggles accesibles (espejo de los anillos) -->
  <div class="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Capas del harness">
    {#each LAYERS as layer (layer.id)}
      {@const on = activeSet.has(layer.id)}
      {@const c = LAYER_COLOR[layer.id]}
      <button
        class="rounded-md border px-2.5 py-1 text-xs font-medium"
        style={on ? `background-color:${c};color:${PAPER};border-color:${c}` : `color:${MUTED};border-color:${BORDER}`}
        aria-pressed={on}
        title={layer.what}
        onclick={() => toggle(layer.id)}
      >{on ? '✓ ' : ''}{layer.label}</button>
    {/each}
    <span class="text-xs" style="color: {MUTED}">— cada botón enciende un anillo</span>
  </div>
  <p class="mt-1.5 min-h-[1.25rem] text-xs leading-snug" style="color: {MUTED}" aria-live="polite">
    {#if touched}💡 <strong style="color: {LAYER_COLOR[touched.id]}">{touched.label}:</strong> {touched.what}{:else}Toca una capa para ver qué aporta.{/if}
  </p>
</div>

<style>
  .issue-in {
    animation: issue-in 0.3s ease;
  }
  @keyframes issue-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
</style>
