<script lang="ts">
  import { CONVERSATION, fitWindow, finalAnswer, WINDOW_SIZES, KEY_FACT_ID, FINAL_QUESTION_ID } from '../../lib/llm/context';
  import type { Role } from '../../lib/llm/context';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // La ventana de contexto como un tubo finito: cada mensaje nuevo empuja;
  // cuando no cabe, lo más viejo se cae — aunque fuera el dato importante.

  let sizeIdx = $state(0);
  let sentCount = $state(4); // arranca con el dato clave ya adentro

  let limit = $derived(WINDOW_SIZES[sizeIdx].tokens);
  let sent = $derived(CONVERSATION.slice(0, sentCount));
  let fit = $derived(fitWindow(sent, limit));
  let keptIds = $derived(new Set(fit.kept.map((m) => m.id)));
  let pct = $derived(Math.min(100, (fit.used / limit) * 100));
  let allSent = $derived(sentCount >= CONVERSATION.length);
  let keyVisible = $derived(keptIds.has(KEY_FACT_ID));

  const ROLE_COLOR: Record<Role, string> = { system: ACCENT, user: NEG, assistant: POS, tool: SUCCESS };
  const ROLE_LABEL: Record<Role, string> = { system: 'system', user: 'user', assistant: 'assistant', tool: 'tool' };

  function send() {
    if (!allSent) sentCount++;
  }
  function reset() {
    sentCount = 4;
  }
  // altura visual del bloque ∝ tokens (mínimo legible)
  function h(tokens: number): number {
    return Math.max(26, (tokens / limit) * 300);
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center gap-2">
    <span class="text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Ventana:</span>
    {#each WINDOW_SIZES as ws, i}
      <button
        class="rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums"
        style={i === sizeIdx ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => (sizeIdx = i)}
      >{ws.label} tokens</button>
    {/each}
  </div>

  <!-- barra de ocupación -->
  <div class="mb-1 flex items-center justify-between text-xs tabular-nums" style="color: {MUTED}" aria-live="polite">
    <span>ocupación: <strong style="color: {pct > 92 ? WARN : INK}">{fit.used}</strong> / {limit} tokens</span>
    <span>{fit.evicted.length > 0 ? `${fit.evicted.length} mensajes olvidados` : 'nada olvidado aún'}</span>
  </div>
  <div class="mb-3 h-2 overflow-hidden rounded-full" style="background-color: {PAPER}">
    <div class="h-full rounded-full" style="width: {pct}%; background-color: {pct > 92 ? WARN : ACCENT}; transition: width 0.35s ease, background-color 0.35s ease"></div>
  </div>

  <div class="grid gap-3 sm:grid-cols-[1fr_1fr]">
    <!-- lo expulsado -->
    <div>
      <p class="mb-1.5 text-xs font-medium uppercase tracking-wide" style="color: {WARN}">Fuera de la ventana (olvidado)</p>
      <div class="min-h-[3rem] space-y-1">
        {#each fit.evicted as m (m.id)}
          <div class="evict rounded border border-dashed px-2 py-1 text-xs" style="border-color: {WARN}; color: {MUTED}; opacity: 0.65">
            <span class="font-mono font-bold">{ROLE_LABEL[m.role]}</span> · {m.tokens} tok
            {#if m.id === KEY_FACT_ID}<strong style="color: {WARN}"> ← ¡el dato clave!</strong>{/if}
            <span class="block truncate">{m.text}</span>
          </div>
        {:else}
          <p class="text-xs italic" style="color: {MUTED}">— vacío —</p>
        {/each}
      </div>
    </div>

    <!-- el tubo: lo que el modelo SÍ ve -->
    <div>
      <p class="mb-1.5 text-xs font-medium uppercase tracking-wide" style="color: {ACCENT}">Dentro de la ventana (lo que el modelo ve)</p>
      <div class="space-y-1 rounded-md border-2 p-2" style="border-color: {ACCENT}; background-color: {PAPER}">
        {#each fit.kept as m (m.id)}
          {@const c = ROLE_COLOR[m.role]}
          <div
            class="block-in flex flex-col justify-center overflow-hidden rounded border-l-4 px-2 text-xs"
            style="border-color: {c}; background-color: {c}14; height: {h(m.tokens)}px; transition: height 0.3s ease; {m.id === KEY_FACT_ID ? `outline: 2px solid ${SUCCESS}; outline-offset: 1px;` : ''}"
          >
            <span class="font-mono font-bold" style="color: {c}">{ROLE_LABEL[m.role]} <span style="color: {MUTED}">· {m.tokens} tok {m.role === 'system' ? '· anclado' : ''}</span></span>
            <span class="truncate" style="color: {INK}">{m.text}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- la pregunta final -->
  {#if allSent}
    {@const lastQ = CONVERSATION[FINAL_QUESTION_ID]}
    <div class="block-in mt-3 rounded-md border p-3 text-sm" style="border-color: {keyVisible ? SUCCESS : WARN}; background-color: {PAPER}" aria-live="polite">
      <p style="color: {INK}"><strong>Pregunta:</strong> "{lastQ.text}"</p>
      <p class="mt-1" style="color: {keyVisible ? SUCCESS : WARN}"><strong>Modelo:</strong> "{finalAnswer(keyVisible)}"</p>
      {#if !keyVisible}
        <p class="mt-1 text-xs" style="color: {MUTED}">El modelo no "olvidó por descuido": el mensaje con la meta ya no está en su ventana. Prueba con la ventana <strong>Grande</strong> — o mejor: re-inyecta los datos clave en cada solicitud.</p>
      {/if}
    </div>
  {/if}

  <div class="mt-3 flex flex-wrap gap-2">
    <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {allSent ? 0.4 : 1}" disabled={allSent} onclick={send}>
      Enviar siguiente mensaje ({sentCount}/{CONVERSATION.length})
    </button>
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺ Reiniciar</button>
  </div>
</div>

<style>
  .block-in {
    animation: block-in 0.3s ease;
  }
  .evict {
    animation: evict-out 0.4s ease;
  }
  @keyframes block-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes evict-out {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
</style>
