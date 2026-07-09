<script lang="ts">
  import { FN_CALL_FLOW, ACTOR_LABELS, type Actor } from '../../lib/llm/flow';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, NEG, SUCCESS, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // Function calling paso a paso: el modelo ESCRIBE la llamada; tu código la
  // ejecuta. El dato real viaja de vuelta y recién entonces el modelo responde.

  const ACTORS: Actor[] = ['usuario', 'modelo', 'app', 'db'];
  const ACTOR_COLOR: Record<Actor, string> = { usuario: NEG, modelo: ACCENT, app: POS, db: SUCCESS, herramienta: POS };

  const W = 680;
  const TOP = 44;
  const ROW = 44;
  const H = TOP + FN_CALL_FLOW.length * ROW + 16;
  const colX = (a: Actor) => 90 + ACTORS.indexOf(a) * ((W - 180) / (ACTORS.length - 1));

  let stepIdx = $state(0); // pasos visibles: 0..stepIdx
  let auto = $state(false);

  let active = $derived(FN_CALL_FLOW[stepIdx]);
  let atEnd = $derived(stepIdx >= FN_CALL_FLOW.length - 1);

  function fwd() {
    if (!atEnd) stepIdx++;
  }
  function back() {
    if (stepIdx > 0) stepIdx--;
  }
  function reset() {
    auto = false;
    stepIdx = 0;
  }

  $effect(() => {
    if (!auto) return;
    return stepLoop({
      interval: 1600,
      total: FN_CALL_FLOW.length - 1,
      step: () => ++stepIdx,
      onDone: () => (auto = false),
    });
  });
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <svg viewBox="0 0 {W} {H}" class="w-full select-none">
    <!-- líneas de vida -->
    {#each ACTORS as a}
      <text x={colX(a)} y="18" text-anchor="middle" font-size="13" font-weight="700" fill={ACTOR_COLOR[a]}>{ACTOR_LABELS[a]}</text>
      <line x1={colX(a)} y1={TOP - 14} x2={colX(a)} y2={H - 8} stroke={AXIS} stroke-width="1.5" stroke-dasharray="3 4" />
    {/each}

    <!-- flechas de los pasos visibles -->
    {#each FN_CALL_FLOW as s, i (s.id)}
      {#if i <= stepIdx}
        {@const y = TOP + i * ROW}
        {@const x1 = colX(s.from)}
        {@const x2 = colX(s.to)}
        {@const dir = x2 > x1 ? 1 : -1}
        {@const isActive = i === stepIdx}
        <g class="arrow-in" opacity={isActive ? 1 : 0.45} style="cursor:pointer" role="button" tabindex="0" aria-label="Paso {i + 1}: {s.label}" onclick={() => (stepIdx = i)} onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            stepIdx = i;
          }
        }}>
          <line {x1} y1={y} {x2} y2={y} stroke={isActive ? ACCENT : MUTED} stroke-width={isActive ? 2.5 : 1.5} />
          <path d="M {x2} {y} l {-9 * dir} -5 l 0 10 z" fill={isActive ? ACCENT : MUTED} />
          <text x={(x1 + x2) / 2} y={y - 7} text-anchor="middle" font-size="11.5" font-weight={isActive ? 700 : 500} fill={isActive ? ACCENT : MUTED}>{i + 1}. {s.label}</text>
        </g>
      {/if}
    {/each}
  </svg>

  <!-- panel del mensaje activo -->
  <div class="mt-2 rounded-md border p-3" style="border-color: {ACCENT}; background-color: {PAPER}" aria-live="polite">
    <p class="mb-1 text-xs font-bold uppercase tracking-wide" style="color: {ACCENT}">Paso {stepIdx + 1} de {FN_CALL_FLOW.length} · {ACTOR_LABELS[active.from]} → {ACTOR_LABELS[active.to]}</p>
    <pre class="overflow-x-auto whitespace-pre-wrap rounded border p-2 text-xs leading-relaxed" style="border-color: {BORDER}; color: {INK}"><code>{active.payload}</code></pre>
    {#if active.note}
      <p class="mt-1.5 text-xs leading-snug" style="color: {MUTED}">💡 {active.note}</p>
    {/if}
  </div>

  <div class="mt-3 flex flex-wrap gap-2">
    <button class="rounded-md border px-3 py-1.5 text-sm font-semibold" style="color: {ACCENT}; border-color: {ACCENT}; opacity: {stepIdx === 0 ? 0.4 : 1}" disabled={stepIdx === 0} onclick={back}>◀ Anterior</button>
    <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {atEnd ? 0.4 : 1}" disabled={atEnd} onclick={fwd}>Siguiente ▶</button>
    <button class="rounded-md border px-3 py-1.5 text-sm font-semibold" style={auto ? `background-color:${POS};color:${PAPER};border-color:${POS}` : `color:${MUTED};border-color:${BORDER}`} disabled={atEnd} onclick={() => (auto = !auto)}>{auto ? '⏸' : '▶▶ Auto'}</button>
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺</button>
  </div>
</div>

<style>
  .arrow-in {
    animation: arrow-in 0.4s ease;
  }
  @keyframes arrow-in {
    from {
      opacity: 0;
      transform: translateX(-8px);
    }
  }
</style>
