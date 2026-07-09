<script lang="ts">
  import { PROVIDERS, PROVIDER_COLORS, CRITERIA, type ProviderTag } from '../../lib/llm/timeline';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Quién es quién en el ecosistema — comparado por CRITERIO, no por marca.

  const FILTERS: { id: ProviderTag | 'todos'; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'abierto', label: 'Pesos abiertos' },
    { id: 'economico', label: 'Mejor por costo' },
    { id: 'multimodal', label: 'Multimodal' },
    { id: 'contexto-largo', label: 'Contexto largo' },
  ];

  let filter = $state<ProviderTag | 'todos'>('todos');
  let expanded = $state<string | null>(null);

  const PALETTE: Record<string, string> = { accent: ACCENT, pos: POS, neg: NEG, success: SUCCESS, warn: WARN, muted: MUTED };
  const color = (id: (typeof PROVIDERS)[0]['id']) => PALETTE[PROVIDER_COLORS[id]];
  const matches = (p: (typeof PROVIDERS)[0]) => filter === 'todos' || p.tags.includes(filter);
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar proveedores">
    {#each FILTERS as f}
      <button
        class="rounded-full border px-3 py-1 text-xs font-medium"
        style={filter === f.id ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => (filter = f.id)}
      >{f.label}</button>
    {/each}
  </div>

  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    {#each PROVIDERS as p (p.id)}
      {@const on = matches(p)}
      {@const c = color(p.id)}
      <button
        class="rounded-lg border-2 p-3 text-left transition-all"
        style="border-color: {expanded === p.id ? c : BORDER}; background-color: {PAPER}; opacity: {on ? 1 : 0.3}; transform: scale({on ? 1 : 0.97})"
        aria-expanded={expanded === p.id}
        onclick={() => (expanded = expanded === p.id ? null : p.id)}
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-bold" style="color: {c}">{p.name}</span>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" style="background-color: {p.open ? SUCCESS : NEG}; color: {PAPER}">{p.open ? 'abierto' : 'cerrado'}</span>
        </div>
        <p class="mt-0.5 text-xs" style="color: {MUTED}">{p.flagship}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          {#each p.strengths as s}
            <span class="rounded border px-1.5 py-0.5 text-[10px] leading-tight" style="border-color: {BORDER}; color: {INK}">{s}</span>
          {/each}
        </div>
        {#if expanded === p.id}
          <p class="detail-in mt-2 border-t pt-2 text-xs leading-snug" style="border-color: {BORDER}; color: {INK}"><strong style="color: {c}">En BI:</strong> {p.whenBI}</p>
        {/if}
      </button>
    {/each}
  </div>

  <details class="mt-3 rounded-md border p-3" style="border-color: {BORDER}; background-color: {PAPER}">
    <summary class="cursor-pointer text-sm font-semibold" style="color: {ACCENT}">Los criterios que sí permanecen</summary>
    <ul class="mt-2 grid gap-1 text-sm sm:grid-cols-2" style="color: {INK}">
      {#each CRITERIA as cr}
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
