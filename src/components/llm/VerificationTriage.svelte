<script lang="ts">
  import { CLAIMS, BINS, type TriageBin } from '../../lib/llm/hallucination';
  import Celebrate from '../ui/Celebrate.svelte';
  import { ACCENT, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Triage de verificación: clasifica cada afirmación de un LLM en su bandeja.
  // La rutina profesional no es "desconfía de todo": es saber QUÉ verificar dónde.

  let idx = $state(0);
  let picked = $state<TriageBin | null>(null);
  let hits = $state(0);
  let finished = $state(false);
  let celebrate = $state(false);

  let claim = $derived(CLAIMS[idx]);
  let correct = $derived(picked !== null && picked === claim.bin);

  function pick(bin: TriageBin) {
    if (picked !== null) return;
    picked = bin;
    if (bin === claim.bin) hits++;
  }
  function next() {
    if (idx + 1 >= CLAIMS.length) {
      finished = true;
      if (hits >= 6) celebrate = true;
      return;
    }
    idx++;
    picked = null;
  }
  function restart() {
    idx = 0;
    picked = null;
    hits = 0;
    finished = false;
    celebrate = false;
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  {#if !finished}
    <div class="mb-2 flex items-center justify-between text-xs tabular-nums" style="color: {MUTED}">
      <span>Afirmación {idx + 1} de {CLAIMS.length}</span>
      <span aria-live="polite">aciertos: <strong style="color: {SUCCESS}">{hits}</strong></span>
    </div>
    <div class="mb-1 h-1.5 overflow-hidden rounded-full" style="background-color: {PAPER}">
      <div class="h-full rounded-full" style="width: {((idx + (picked !== null ? 1 : 0)) / CLAIMS.length) * 100}%; background-color: {ACCENT}; transition: width 0.3s ease"></div>
    </div>

    <blockquote class="card-in my-3 rounded-md border-l-4 p-3 text-sm font-medium" style="border-color: {ACCENT}; background-color: {PAPER}; color: {INK}">🤖 "{claim.text}"</blockquote>

    <div class="grid gap-2 sm:grid-cols-3" role="group" aria-label="Bandejas de clasificación">
      {#each BINS as bin}
        {@const isPick = picked === bin.id}
        {@const isAnswer = picked !== null && bin.id === claim.bin}
        <button
          class="rounded-md border-2 p-2.5 text-left transition-all disabled:cursor-default"
          style="border-color: {isAnswer ? SUCCESS : isPick ? WARN : BORDER}; background-color: {isAnswer ? SUCCESS + '14' : isPick ? WARN + '14' : PAPER}"
          disabled={picked !== null}
          onclick={() => pick(bin.id)}
        >
          <span class="block text-sm font-bold" style="color: {isAnswer ? SUCCESS : isPick ? WARN : INK}">{bin.label} {isAnswer ? '✓' : isPick && !isAnswer ? '✗' : ''}</span>
          <span class="block text-[11px] leading-tight" style="color: {MUTED}">{bin.desc}</span>
        </button>
      {/each}
    </div>

    {#if picked !== null}
      <div class="card-in mt-3 rounded-md border p-3 text-sm" style="border-color: {correct ? SUCCESS : WARN}" aria-live="polite">
        <p style="color: {correct ? SUCCESS : WARN}"><strong>{correct ? '✓ Correcto.' : '✗ Casi.'}</strong> <span style="color: {INK}">{claim.why}</span></p>
        <button class="mt-2 rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}" onclick={next}>{idx + 1 >= CLAIMS.length ? 'Ver resultado' : 'Siguiente →'}</button>
      </div>
    {/if}
  {:else}
    <div class="card-in py-4 text-center">
      <p class="text-3xl font-bold tabular-nums" style="color: {hits >= 6 ? SUCCESS : WARN}">{hits}/{CLAIMS.length}</p>
      <p class="mt-1 text-sm" style="color: {INK}">
        {hits >= 6 ? 'Tienes la rutina: cifras a los datos, causas a la fuente, definiciones tranquilas.' : 'Regla rápida: ¿es una cifra interna? → datos. ¿Es una causa o un dato externo? → fuente. ¿Es definición o aritmética visible? → seguro.'}
      </p>
      <Celebrate active={celebrate} label="¡Triage dominado!" />
      <button class="mt-3 rounded-md border px-4 py-2 text-sm font-semibold" style="color: {ACCENT}; border-color: {ACCENT}" onclick={restart}>↺ Repetir el mazo</button>
    </div>
  {/if}
</div>

<style>
  .card-in {
    animation: card-in 0.3s ease;
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
