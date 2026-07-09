<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { linear } from 'svelte/easing';
  import { LATENCY_SEGMENTS, totalLatency, apiRequestJSON, API_RESPONSE_TEXT } from '../../lib/llm/flow';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Una llamada a un LLM es un HTTP request normal: endpoint, API key, JSON.
  // Lo interesante está en DÓNDE vive la latencia — casi toda en la salida.

  let maskKey = $state(true);
  let outTokens = $state(120);
  let streaming = $state(true);

  let segs = $derived(
    LATENCY_SEGMENTS.map((s) => ({ ...s, len: s.scalesWithOutput ? s.ms * outTokens : s.ms })),
  );
  let total = $derived(totalLatency(outTokens));
  let starts = $derived(
    segs.reduce<number[]>((acc, s, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + segs[i - 1].len);
      return acc;
    }, []),
  );
  let req = $derived(apiRequestJSON({ maskKey, temperature: 0.2, maxTokens: outTokens }));

  // progreso de la animación en "ms educativos" (reproducidos a ~4x)
  const prog = new Tween(0, { duration: 0 });
  let playing = $state(false);

  async function send() {
    playing = true;
    prog.set(0, { duration: 0 });
    await prog.set(total, { duration: total / 4, easing: linear });
    playing = false;
  }

  let streamStart = $derived(starts[3]); // inicio del segmento "Resto de tokens"
  let streamLen = $derived(segs[3].len);
  let shownChars = $derived.by(() => {
    if (prog.current >= total) return API_RESPONSE_TEXT.length;
    if (!streaming) return 0; // sin streaming: nada hasta el final
    const f = (prog.current - streamStart) / streamLen;
    return Math.max(0, Math.min(1, f)) * API_RESPONSE_TEXT.length;
  });
  let packetX = $derived(Math.min(1, prog.current / (starts[2] + segs[2].len)));

  const SEG_COLOR = [NEG, MUTED, WARN, ACCENT, NEG];
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="grid gap-3 md:grid-cols-2">
    <!-- request -->
    <div>
      <div class="mb-1 flex items-center justify-between">
        <p class="text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Request</p>
        <button class="rounded border px-2 py-0.5 text-xs" style="color: {MUTED}; border-color: {BORDER}" onclick={() => (maskKey = !maskKey)} aria-pressed={maskKey}>{maskKey ? '🙈 key oculta' : '👁 key visible'}</button>
      </div>
      <pre class="overflow-x-auto rounded-md border p-2.5 text-[11px] leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}"><code>{req}</code></pre>
      {#if !maskKey}
        <p class="mt-1 text-[11px]" style="color: {WARN}">⚠ La API key es una credencial: quien la tenga gasta tu dinero. Nunca va en el código fuente ni en el navegador.</p>
      {/if}
    </div>

    <!-- viaje + respuesta -->
    <div class="flex flex-col">
      <p class="mb-1 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">El viaje</p>
      <svg viewBox="0 0 300 54" class="w-full select-none">
        <text x="8" y="16" font-size="11" font-weight="600" fill={INK}>Tu app</text>
        <text x="292" y="16" text-anchor="end" font-size="11" font-weight="600" fill={INK}>API del modelo</text>
        <line x1="10" y1="34" x2="290" y2="34" stroke={BORDER} stroke-width="2" />
        <circle cx={10 + packetX * 280} cy="34" r="7" fill={ACCENT} opacity={playing ? 1 : 0.35} />
        <text x={10 + packetX * 280} y="38" text-anchor="middle" font-size="8" fill={PAPER}>✉</text>
      </svg>

      <p class="mb-1 mt-2 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Respuesta {streaming ? '(streaming)' : '(todo al final)'}</p>
      <div class="min-h-[5.5rem] grow rounded-md border p-2.5 text-sm leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}" aria-live="polite">
        {API_RESPONSE_TEXT.slice(0, Math.floor(shownChars))}{#if playing && shownChars < API_RESPONSE_TEXT.length}<span class="font-bold" style="color: {ACCENT}">▌</span>{/if}
        {#if !playing && prog.current === 0}<span class="text-xs italic" style="color: {MUTED}">pulsa Enviar…</span>{/if}
        {#if playing && !streaming}<span class="text-xs italic" style="color: {MUTED}">esperando la respuesta completa…</span>{/if}
      </div>
    </div>
  </div>

  <!-- latencia segmentada -->
  <p class="mb-1 mt-3 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Dónde se va el tiempo — total ≈ {(total / 1000).toFixed(1)}s</p>
  <div class="flex h-8 w-full overflow-hidden rounded-md border" style="border-color: {BORDER}">
    {#each segs as s, i}
      {@const filled = Math.max(0, Math.min(1, (prog.current - starts[i]) / s.len))}
      <div class="relative flex items-center justify-center overflow-hidden" style="width: {(s.len / total) * 100}%; background-color: {PAPER}" title="{s.label}: {s.len} ms">
        <div class="absolute inset-y-0 left-0" style="width: {filled * 100}%; background-color: {SEG_COLOR[i]}; opacity: 0.75"></div>
        <span class="relative z-10 truncate px-1 text-[10px] font-medium" style="color: {INK}">{s.label}</span>
      </div>
    {/each}
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-3">
    <button class="rounded-md px-4 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {playing ? 0.5 : 1}" disabled={playing} onclick={send}>📤 Enviar</button>
    <button class="rounded-md border px-3 py-1.5 text-xs font-medium" style={streaming ? `background-color:${SUCCESS};color:${PAPER};border-color:${SUCCESS}` : `color:${MUTED};border-color:${BORDER}`} onclick={() => (streaming = !streaming)} aria-pressed={streaming}>streaming {streaming ? 'ON' : 'OFF'}</button>
    <label class="grow text-xs font-medium" style="color: {INK}">
      tokens de salida: <strong class="tabular-nums">{outTokens}</strong>
      <input type="range" min="40" max="400" step="20" bind:value={outTokens} class="w-full accent-interactive" disabled={playing} />
    </label>
  </div>
  <p class="mt-2 text-xs" style="color: {MUTED}">
    Sube los tokens de salida: el segmento azul (generar la respuesta) devora el total — la latencia vive en la <strong>salida</strong>. Y apaga el streaming: la espera <em>real</em> es igual, pero sin el primer token temprano la espera <em>percibida</em> es eterna.
  </p>
</div>
