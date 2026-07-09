<script lang="ts">
  import { weeklyReport, PHASE_CYCLE, TOOL_PERMISSIONS, APPROVAL_INDEX, type Phase } from '../../lib/llm/agent';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // Un agente = LLM en un loop (objetivo → plan → herramienta → observación)
  // con memoria, permisos y — clave — un humano que aprueba lo sensible: TÚ.

  let stepIdx = $state(0);
  let decision = $state<'pending' | 'approved' | 'rejected'>('pending');
  let auto = $state(false);
  let triedBranches = $state<string[]>([]);

  let run = $derived(weeklyReport(decision !== 'rejected'));
  let steps = $derived(run.steps);
  let current = $derived(steps[Math.min(stepIdx, steps.length - 1)]);
  let atEnd = $derived(stepIdx >= steps.length - 1);
  let waiting = $derived(current.needsApproval === true && decision === 'pending');

  const PHASE_COLOR: Record<Phase, string> = {
    objetivo: NEG,
    plan: ACCENT,
    herramienta: POS,
    observación: SUCCESS,
    aprobación: WARN,
    respuesta: SUCCESS,
  };

  function advance() {
    if (waiting || atEnd) return;
    stepIdx++;
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

  $effect(() => {
    if (!auto) return;
    return stepLoop({
      interval: 1500,
      total: steps.length,
      step: () => {
        if (steps[stepIdx]?.needsApproval && decision === 'pending') return steps.length; // pausa: decide el humano
        return ++stepIdx >= steps.length - 1 ? steps.length : stepIdx;
      },
      onDone: () => (auto = false),
    });
  });

  // anillo del ciclo
  const RING: { p: Phase; x: number; y: number }[] = PHASE_CYCLE.map((p, i) => ({
    p,
    x: 80 + 62 * Math.sin((i * Math.PI) / 2),
    y: 80 - 62 * Math.cos((i * Math.PI) / 2),
  }));
  let activeCycle = $derived(PHASE_CYCLE.includes(current.phase) ? current.phase : null);
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <p class="mb-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium" style="border-color: {NEG}; background-color: {PAPER}; color: {INK}">🎯 Objetivo: "Prepara el resumen comercial semanal y envíalo a gerencia."</p>

  <div class="grid gap-4 md:grid-cols-[170px_1fr_190px]">
    <!-- el ciclo -->
    <div class="mx-auto">
      <svg viewBox="0 0 160 160" class="w-40 select-none" role="img" aria-label="Ciclo del agente, fase actual: {current.phase}">
        <circle cx="80" cy="80" r="62" fill="none" stroke={AXIS} stroke-width="1.5" stroke-dasharray="4 5" />
        {#each RING as node}
          {@const on = activeCycle === node.p}
          <circle cx={node.x} cy={node.y} r={on ? 15 : 10} fill={PHASE_COLOR[node.p]} opacity={on ? 1 : 0.35} class={on ? 'pulse' : ''} style="transition: r 0.25s ease, opacity 0.25s ease" />
          <text x={node.x} y={node.y - (on ? 21 : 16)} text-anchor="middle" font-size="10.5" font-weight={on ? 700 : 500} fill={on ? PHASE_COLOR[node.p] : MUTED}>{node.p}</text>
        {/each}
        <text x="80" y="84" text-anchor="middle" font-size="20">{waiting ? '✋' : current.phase === 'respuesta' ? '✅' : '🤖'}</text>
      </svg>
    </div>

    <!-- consola de pasos -->
    <div class="space-y-1" aria-live="polite">
      {#each steps.slice(0, stepIdx + 1) as s, i (i)}
        {@const isLast = i === stepIdx}
        <div class="step-in rounded-md border px-2.5 py-1.5" style="border-color: {isLast ? PHASE_COLOR[s.phase] : BORDER}; background-color: {isLast ? PHASE_COLOR[s.phase] + '0d' : PAPER}; opacity: {isLast ? 1 : 0.75}">
          <p class="text-xs font-semibold" style="color: {INK}">
            <span class="mr-1 rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold" style="background-color: {PHASE_COLOR[s.phase]}; color: {PAPER}">{s.phase}</span>
            {s.title}
          </p>
          {#if isLast}
            <p class="step-in mt-1 text-xs leading-snug" style="color: {MUTED}">{s.detail}</p>
            {#if s.tool}
              <pre class="mt-1 overflow-x-auto rounded border px-2 py-1 text-[10.5px] leading-relaxed" style="border-color: {BORDER}; color: {INK}"><code>▸ {s.tool.name}({s.tool.args})
◂ {s.tool.result}</code></pre>
            {/if}
          {/if}
        </div>
      {/each}

      {#if waiting}
        <div class="step-in rounded-md border-2 p-3" style="border-color: {WARN}; background-color: {PAPER}">
          <p class="text-sm font-bold" style="color: {WARN}">✋ El agente se detuvo: te toca decidir a TI.</p>
          <p class="mt-0.5 text-xs" style="color: {MUTED}">¿Autorizas enviar el correo a gerencia?</p>
          <div class="mt-2 flex gap-2">
            <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {SUCCESS}; color: {PAPER}" onclick={() => decide(true)}>✓ Aprobar</button>
            <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {POS}; color: {PAPER}" onclick={() => decide(false)}>✗ Rechazar</button>
          </div>
        </div>
      {/if}
    </div>

    <!-- memoria + permisos -->
    <div class="space-y-3">
      <div>
        <p class="mb-1 text-[10.5px] font-bold uppercase tracking-wide" style="color: {MUTED}">🧠 Memoria de trabajo</p>
        <ul class="space-y-1">
          {#each current.memory as m (m)}
            <li class="step-in rounded border px-2 py-1 text-[11px] leading-tight" style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}">{m}</li>
          {/each}
        </ul>
      </div>
      <div>
        <p class="mb-1 text-[10.5px] font-bold uppercase tracking-wide" style="color: {MUTED}">🔐 Permisos</p>
        <ul class="space-y-1">
          {#each TOOL_PERMISSIONS as t (t.name)}
            {@const hot = !t.auto && (waiting || current.tool?.name === t.name)}
            <li class="rounded border px-2 py-1 font-mono text-[10.5px]" style="border-color: {hot ? WARN : BORDER}; color: {INK}; {hot ? `background-color:${WARN}14` : ''}">
              {t.auto ? '✅' : '⚠️'} {t.name} <span class="block font-sans text-[9.5px]" style="color: {MUTED}">{t.auto ? 'automática' : 'requiere aprobación humana'}</span>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-2">
    <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {waiting || atEnd ? 0.4 : 1}" disabled={waiting || atEnd} onclick={advance}>Paso ▶</button>
    <button class="rounded-md border px-3 py-1.5 text-sm font-semibold" style={auto ? `background-color:${POS};color:${PAPER};border-color:${POS}` : `color:${MUTED};border-color:${BORDER}`} disabled={waiting || atEnd} onclick={() => (auto = !auto)}>{auto ? '⏸' : '▶▶ Auto'}</button>
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺ Reiniciar</button>
    {#if atEnd && triedBranches.length === 1}
      <span class="text-xs font-medium" style="color: {ACCENT}">Te falta la otra rama: reinicia y esta vez {triedBranches[0] === 'sí' ? 'rechaza' : 'aprueba'} el envío 👀</span>
    {/if}
    {#if atEnd && triedBranches.length === 2}
      <span class="text-xs font-medium" style="color: {SUCCESS}">✓ Viste ambas ramas: el agente respeta la decisión humana en las dos.</span>
    {/if}
  </div>
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
  .pulse {
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.55;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse {
      animation: none;
    }
  }
</style>
