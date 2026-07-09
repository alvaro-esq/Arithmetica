<script lang="ts">
  import { codingSession, CODING_APPROVAL_INDEX, type TermKind } from '../../lib/llm/coding';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Un agente de código EN VIVO (guionado): mismo loop de la lección 5, pero
  // sus herramientas son la terminal, los archivos y git. La superficie oscura
  // es deliberada: es una terminal.

  let stepIdx = $state(0);
  let decision = $state<'pending' | 'approved' | 'rejected'>('pending');
  let auto = $state(false);
  let triedBranches = $state<string[]>([]);
  let termEl = $state<HTMLDivElement | null>(null);

  let steps = $derived(codingSession(decision !== 'rejected'));
  let current = $derived(steps[Math.min(stepIdx, steps.length - 1)]);
  let atEnd = $derived(stepIdx >= steps.length - 1);
  let waiting = $derived(current.kind === 'approval' && decision === 'pending');

  function advance() {
    if (waiting || atEnd) return;
    stepIdx++;
  }
  function back() {
    if (stepIdx === 0) return;
    stepIdx--;
    if (stepIdx <= CODING_APPROVAL_INDEX) decision = 'pending';
  }
  function decide(approve: boolean) {
    decision = approve ? 'approved' : 'rejected';
    triedBranches = [...new Set([...triedBranches, approve ? 'sí' : 'no'])];
    stepIdx++;
  }
  function reset() {
    auto = false;
    stepIdx = 0;
    decision = 'pending';
  }

  // la línea activa siempre visible dentro de la terminal (max-h + overflow)
  $effect(() => {
    void stepIdx;
    void decision;
    if (termEl) termEl.scrollTop = termEl.scrollHeight;
  });

  $effect(() => {
    if (!auto) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // sin animación por pasos: saltar directo a la pausa de aprobación (o al final)
      stepIdx = decision === 'pending' ? CODING_APPROVAL_INDEX : steps.length - 1;
      auto = false;
      return;
    }
    return stepLoop({
      interval: 1400,
      total: steps.length,
      step: () => {
        if (steps[stepIdx]?.kind === 'approval' && decision === 'pending') return steps.length; // pausa: decide el humano
        return ++stepIdx >= steps.length - 1 ? steps.length : stepIdx;
      },
      onDone: () => (auto = false),
    });
  });

  function lineStyle(kind: TermKind): string {
    switch (kind) {
      case 'user':
        return `color:${PAPER};font-weight:600`;
      case 'agent':
        return `color:${PAPER};opacity:0.92`;
      case 'cmd':
        return `color:${POS};font-weight:600`;
      case 'approval':
        return `color:${WARN};font-weight:700`;
      default:
        return `color:${PAPER};opacity:0.75`;
    }
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <!-- la terminal -->
  <div class="overflow-hidden rounded-lg border" style="border-color: {INK}">
    <div class="flex items-center gap-1.5 px-3 py-2" style="background-color: {INK}; border-bottom: 1px solid {MUTED}44">
      <span class="h-2.5 w-2.5 rounded-full" style="background-color: {WARN}"></span>
      <span class="h-2.5 w-2.5 rounded-full" style="background-color: {POS}"></span>
      <span class="h-2.5 w-2.5 rounded-full" style="background-color: {SUCCESS}"></span>
      <span class="ml-2 font-mono text-[11px]" style="color: {PAPER}; opacity: 0.6">agente-de-código — sesión guionada</span>
    </div>
    <div bind:this={termEl} class="max-h-80 space-y-1.5 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed" style="background-color: {INK}" aria-live="polite">
      {#each steps.slice(0, stepIdx + 1) as s, i (i)}
        <div class="line-in" style="opacity: {i === stepIdx ? 1 : 0.8}">
          {#if s.kind === 'cmd'}
            <pre class="whitespace-pre-wrap" style={lineStyle(s.kind)}><span style="color:{SUCCESS}">$</span> {s.text}</pre>
          {:else if s.kind === 'diff'}
            <pre class="whitespace-pre-wrap rounded px-1.5 py-1" style="background-color: {PAPER}14">{#each s.text.split('\n') as ln}<span style={ln.startsWith('+') ? `background-color:${SUCCESS};color:${PAPER};font-weight:700` : `color:${PAPER};opacity:0.8`}>{ln}</span>{'\n'}{/each}</pre>
          {:else if s.kind === 'agent'}
            <pre class="whitespace-pre-wrap" style={lineStyle(s.kind)}><span style="color:{ACCENT}; background-color:{PAPER}; padding: 0 4px; border-radius: 3px; font-weight:700">🤖 agente</span> {s.text}</pre>
          {:else}
            <pre class="whitespace-pre-wrap" style={lineStyle(s.kind)}>{s.text}</pre>
          {/if}
        </div>
      {/each}
      {#if !atEnd && !waiting}
        <span class="inline-block h-4 w-2" style="background-color: {PAPER}; opacity: 0.7"></span>
      {/if}
    </div>
  </div>

  <!-- aprobación -->
  {#if waiting}
    <div class="line-in mt-2 rounded-md border-2 p-3" style="border-color: {WARN}; background-color: {PAPER}">
      <p class="text-sm font-bold" style="color: {WARN}">✋ El agente quiere hacer commit al repositorio compartido.</p>
      <p class="mt-0.5 text-xs" style="color: {MUTED}">El diff ya lo viste. ¿Autorizas el commit?</p>
      <div class="mt-2 flex gap-2">
        <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {SUCCESS}; color: {PAPER}" onclick={() => decide(true)}>✓ Aprobar commit</button>
        <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {POS}; color: {PAPER}" onclick={() => decide(false)}>✗ Rechazar</button>
      </div>
    </div>
  {/if}

  <!-- nota pedagógica del paso activo -->
  <p class="mt-2 min-h-[2.25rem] text-xs leading-snug" style="color: {MUTED}" aria-live="polite">
    {#if current.note}💡 {current.note}{/if}
  </p>

  <div class="mt-2 flex flex-wrap items-center gap-2">
    <button class="rounded-md border px-3 py-1.5 text-sm font-semibold" style="color: {ACCENT}; border-color: {ACCENT}; opacity: {stepIdx === 0 ? 0.4 : 1}" disabled={stepIdx === 0} onclick={back}>◀ Anterior</button>
    <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {waiting || atEnd ? 0.4 : 1}" disabled={waiting || atEnd} onclick={advance}>Siguiente ▶</button>
    <button class="rounded-md border px-3 py-1.5 text-sm font-semibold" style={auto ? `background-color:${POS};color:${PAPER};border-color:${POS}` : `color:${MUTED};border-color:${BORDER}`} disabled={waiting || atEnd} onclick={() => (auto = !auto)}>{auto ? '⏸' : '▶▶ Auto'}</button>
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺ Reiniciar</button>
    {#if atEnd && triedBranches.length === 1}
      <span class="text-xs font-medium" style="color: {ACCENT}">Reinicia y prueba la otra rama: esta vez {triedBranches[0] === 'sí' ? 'rechaza' : 'aprueba'} el commit 👀</span>
    {/if}
    {#if atEnd && triedBranches.length === 2}
      <span class="text-xs font-medium" style="color: {SUCCESS}">✓ En ambas ramas el trabajo queda hecho — la decisión final fue tuya.</span>
    {/if}
  </div>
</div>

<style>
  .line-in {
    animation: line-in 0.3s ease;
  }
  @keyframes line-in {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
  }
</style>
