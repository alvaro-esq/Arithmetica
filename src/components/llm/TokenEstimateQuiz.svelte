<script lang="ts">
  import { tokenize } from '../../lib/llm/tokenizer';
  import { stepLoop } from '../../lib/viz/stepper';
  import Celebrate from '../ui/Celebrate.svelte';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Apuesta cuántos tokens pesa el texto y revela la respuesta chip a chip.
  // El objetivo: calibrar la intuición "1 token ≈ 3-4 caracteres en español".

  const TEXTS = [
    'El margen bruto de junio subió a 21.3% gracias a la reducción de descuentos.',
    'Comparativo de ventas: región norte Q498,000, región central Q414,000, región sur Q233,000.',
    'La internacionalización de la distribuidora requiere reestructuración presupuestaria inmediata.',
    'KPI: churn 4.2%, CAC Q180, LTV Q2,450, conversión 3.8%.',
    'Resume este dashboard para la reunión ejecutiva del lunes con gerencia comercial.',
  ];

  let idx = $state(0);
  let guess = $state(30);
  let phase = $state<'guess' | 'revealing' | 'done'>('guess');
  let revealed = $state(0);
  let celebrate = $state(false);

  let current = $derived(TEXTS[idx]);
  let tokens = $derived(tokenize(current));
  let real = $derived(tokens.length);
  let errorPct = $derived(real === 0 ? 0 : Math.abs(guess - real) / real);
  let good = $derived(errorPct <= 0.2);

  const TINTS = [ACCENT, POS, NEG, SUCCESS, WARN, MUTED];

  function reveal() {
    revealed = 0;
    phase = 'revealing';
  }
  function next() {
    idx = (idx + 1) % TEXTS.length;
    guess = 30;
    revealed = 0;
    celebrate = false;
    phase = 'guess';
  }

  $effect(() => {
    if (phase !== 'revealing') return;
    return stepLoop({
      interval: 45,
      total: tokens.length,
      step: () => ++revealed,
      onDone: () => {
        phase = 'done';
        if (good) celebrate = true;
      },
    });
  });
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <p class="mb-2 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Texto {idx + 1} de {TEXTS.length}</p>

  {#if phase === 'guess'}
    <blockquote class="mb-4 rounded-md border-l-4 p-3 text-sm" style="border-color: {ACCENT}; background-color: {PAPER}; color: {INK}">{current}</blockquote>
    <label class="block text-sm font-medium" style="color: {INK}">
      Mi apuesta: <span class="text-2xl font-bold tabular-nums" style="color: {ACCENT}">{guess}</span> tokens
      <input type="range" bind:value={guess} min="5" max="120" step="1" class="mt-1 w-full accent-interactive" aria-label="Estimación de tokens" />
    </label>
    <button class="mt-3 rounded-md px-4 py-2 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}" onclick={reveal}>Revelar</button>
  {:else}
    <div class="mb-3 flex min-h-[4rem] flex-wrap gap-x-0.5 gap-y-1.5 rounded-md border p-3 leading-none" style="border-color: {BORDER}; background-color: {PAPER}">
      {#each tokens.slice(0, revealed) as t, i (i)}
        {@const c = TINTS[t.id % TINTS.length]}
        <span class="chip-in rounded px-1 py-1 font-mono text-[13px]" style="background-color: {c}1e; color: {INK}; box-shadow: inset 0 -2px 0 {c}">{t.text.replaceAll(' ', '␣')}</span>
      {/each}
    </div>
    <p class="text-sm tabular-nums" aria-live="polite" style="color: {INK}">
      <span class="text-xl font-bold" style="color: {ACCENT}">{revealed}</span> tokens contados…
    </p>
    {#if phase === 'done'}
      <div class="mt-2 rounded-md border p-3 text-sm" style="border-color: {good ? SUCCESS : WARN}; color: {INK}">
        Tu apuesta: <strong>{guess}</strong> · real: <strong>{real}</strong> · error {(errorPct * 100).toFixed(0)}%
        {#if good}
          — <strong style="color: {SUCCESS}">¡buena calibración!</strong>
        {:else}
          — regla útil: <strong>caracteres ÷ 3.5</strong> ≈ {(current.length / 3.5).toFixed(0)} tokens para este texto.
        {/if}
      </div>
      <Celebrate active={celebrate} label="¡Calibración lograda!" />
      <button class="mt-3 rounded-md border px-4 py-2 text-sm font-semibold" style="color: {ACCENT}; border-color: {ACCENT}" onclick={next}>Otro texto →</button>
    {/if}
  {/if}
</div>

<style>
  .chip-in {
    animation: chip-pop 0.25s ease;
  }
  @keyframes chip-pop {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
  }
</style>
