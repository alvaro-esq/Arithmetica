<script lang="ts">
  import { CODING_AGENTS, CODING_CRITERIA } from '../../lib/llm/coding';
  import { ACCENT, POS, NEG, SUCCESS, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Tres harnesses, un mismo patrón. Las tarjetas comparan por CRITERIO,
  // no por marca — igual que el mapa del ecosistema de la lección 4.

  let expanded = $state<string | null>(null);

  const AGENT_COLOR: Record<string, string> = { 'claude-code': POS, codex: ACCENT, opencode: NEG };
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="grid gap-2 sm:grid-cols-3">
    {#each CODING_AGENTS as a (a.id)}
      {@const c = AGENT_COLOR[a.id]}
      <button
        class="rounded-lg border-2 p-3 text-left transition-all"
        style="border-color: {expanded === a.id ? c : BORDER}; background-color: {PAPER}"
        aria-expanded={expanded === a.id}
        onclick={() => (expanded = expanded === a.id ? null : a.id)}
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold" style="color: {c}">{a.name}</span>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" style="background-color: {a.open ? SUCCESS : NEG}; color: {PAPER}">{a.open ? 'abierto' : 'cerrado'}</span>
        </div>
        <p class="mt-0.5 text-xs" style="color: {MUTED}">{a.maker} · {a.models}</p>
        <p class="mt-1.5 text-xs leading-snug" style="color: {INK}"><strong style="color: {MUTED}">Corre en:</strong> {a.runsOn}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          {#each a.strengths as s (s)}
            <span class="rounded border px-1.5 py-0.5 text-[10px] leading-tight" style="border-color: {BORDER}; color: {INK}">{s}</span>
          {/each}
        </div>
        {#if expanded === a.id}
          <p class="detail-in mt-2 border-t pt-2 text-xs leading-snug" style="border-color: {BORDER}; color: {INK}"><strong style="color: {c}">En BI:</strong> {a.whenBI}</p>
        {/if}
      </button>
    {/each}
  </div>

  <details class="mt-3 rounded-md border p-3" style="border-color: {BORDER}; background-color: {PAPER}">
    <summary class="cursor-pointer text-sm font-semibold" style="color: {ACCENT}">Los criterios que sí permanecen</summary>
    <ul class="mt-2 grid gap-1 text-sm sm:grid-cols-2" style="color: {INK}">
      {#each CODING_CRITERIA as cr (cr)}
        <li class="flex gap-1.5"><span style="color: {SUCCESS}">✓</span>{cr}</li>
      {/each}
    </ul>
  </details>
</div>

<style>
  .detail-in {
    animation: detail-in 0.25s ease;
  }
  @keyframes detail-in {
    from {
      opacity: 0;
    }
  }
</style>
