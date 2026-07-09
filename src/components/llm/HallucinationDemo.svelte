<script lang="ts">
  import { CASES, type Seg } from '../../lib/llm/hallucination';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // La misma pregunta, con y sin datos. Sin datos, la respuesta es fluida,
  // específica… y falsa. La fluidez no es evidencia.

  let caseIdx = $state(0);
  let withData = $state(false);
  // arranca con el texto completo (render SSR estático); el typewriter corre
  // solo cuando el usuario cambia de caso/modo o pulsa Repetir
  let revealed = $state(10_000);
  let typing = $state(false);
  let verified = $state(false);
  let hoverCell = $state<[number, number] | null>(null);

  let cc = $derived(CASES[caseIdx]);
  let segs = $derived<Seg[]>(withData ? cc.withData.answer : cc.without);
  let fullLen = $derived(segs.reduce((a, s) => a + s.text.length, 0));
  let done = $derived(revealed >= fullLen);

  // porciones visibles de cada segmento según el typewriter
  let visible = $derived.by(() => {
    let left = revealed;
    return segs.map((s) => {
      const take = Math.max(0, Math.min(s.text.length, left));
      left -= take;
      return { ...s, shown: s.text.slice(0, take) };
    });
  });

  function start() {
    revealed = 0;
    verified = false;
    typing = true;
  }
  function setMode(w: boolean) {
    withData = w;
    start();
  }
  function setCase(i: number) {
    caseIdx = i;
    start();
  }

  $effect(() => {
    if (!typing) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealed = fullLen;
      typing = false;
      return;
    }
    return stepLoop({
      interval: 14,
      total: fullLen,
      step: () => (revealed = Math.min(fullLen, revealed + 3)),
      onDone: () => (typing = false),
    });
  });

  function cellHot(r: number, col: number): boolean {
    return hoverCell !== null && hoverCell[0] === r && hoverCell[1] === col;
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div class="flex gap-1.5" role="group" aria-label="Caso">
      {#each CASES as c, i}
        <button class="rounded-md border px-2.5 py-1 text-xs font-medium" style={i === caseIdx ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`} onclick={() => setCase(i)}>Caso {i + 1}</button>
      {/each}
    </div>
    <div class="flex overflow-hidden rounded-md border text-sm font-semibold" style="border-color: {BORDER}">
      <button class="px-3 py-1.5" style={!withData ? `background-color:${WARN};color:${PAPER}` : `color:${MUTED}`} onclick={() => setMode(false)}>Sin datos</button>
      <button class="px-3 py-1.5" style={withData ? `background-color:${SUCCESS};color:${PAPER}` : `color:${MUTED}`} onclick={() => setMode(true)}>Con datos</button>
    </div>
  </div>

  <p class="mb-2 text-sm font-semibold" style="color: {INK}">🧑‍💼 "{cc.question}"</p>

  {#if withData}
    <div class="mb-2 overflow-x-auto rounded-md border" style="border-color: {POS}">
      <p class="px-2 pt-1.5 text-[11px] font-bold uppercase tracking-wide" style="color: {POS}">📎 inyectado al contexto: {cc.withData.table.title}</p>
      <table class="w-full text-xs tabular-nums">
        <thead>
          <tr>{#each cc.withData.table.headers as hcell}<th class="px-2 py-1 text-left font-semibold" style="color: {MUTED}">{hcell}</th>{/each}</tr>
        </thead>
        <tbody>
          {#each cc.withData.table.rows as row, r}
            <tr>
              {#each row as cell, col}
                <td class="border-t px-2 py-1" style="border-color: {BORDER}; color: {INK}; {cellHot(r, col) ? `background-color:${SUCCESS}22; font-weight:700` : ''}">{cell}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="min-h-[5rem] rounded-md border p-3 text-sm leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}" aria-live="polite">
    <span class="font-bold" style="color: {ACCENT}">🤖 </span>
    {#each visible as s, i (caseIdx + '-' + Number(withData) + '-' + i)}
      {#if s.invented}
        <span style="color: {INK}; {verified ? `text-decoration: line-through; text-decoration-color: ${WARN}; text-decoration-thickness: 2px; background-color: ${WARN}1c` : ''}">{s.shown}</span>
      {:else if s.cell}
        <span
          class="rounded px-0.5 font-semibold"
          style="background-color: {SUCCESS}1c; color: {INK}; box-shadow: inset 0 -2px 0 {SUCCESS}; cursor: help; outline-offset: 2px"
          role="button"
          tabindex="0"
          aria-label={`Resaltar la celda que respalda: ${s.text}`}
          onmouseenter={() => (hoverCell = s.cell ?? null)}
          onmouseleave={() => (hoverCell = null)}
          onfocus={() => (hoverCell = s.cell ?? null)}
          onblur={() => (hoverCell = null)}
          onclick={() => (hoverCell = s.cell ?? null)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              hoverCell = s.cell ?? null;
            }
          }}
        >{s.shown}</span>
      {:else}
        <span style="color: {INK}">{s.shown}</span>
      {/if}
    {/each}
    {#if !done}<span class="font-bold" style="color: {ACCENT}">▌</span>{/if}
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-2">
    {#if !withData && done && !verified}
      <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {WARN}; color: {PAPER}" onclick={() => (verified = true)}>🔍 Verificar contra los datos</button>
    {/if}
    {#if verified}
      <span class="chip-in rounded-full px-3 py-1 text-xs font-bold" style="background-color: {WARN}; color: {PAPER}">inventado con confianza</span>
      <span class="text-xs" style="color: {MUTED}">Todo lo tachado no existe en ninguna fuente: el modelo completó el patrón "respuesta de analista".</span>
    {/if}
    {#if withData && done}
      <span class="chip-in text-xs" style="color: {SUCCESS}">✓ Cada afirmación subrayada cita una celda de la tabla (pasa el cursor). Y si el dato no está, lo dice.</span>
    {/if}
    <button class="ml-auto rounded-md border px-3 py-1.5 text-xs" style="color: {MUTED}; border-color: {BORDER}" onclick={start}>↺ Repetir</button>
  </div>
</div>

<style>
  .chip-in {
    animation: chip-pop 0.3s ease;
  }
  @keyframes chip-pop {
    from {
      opacity: 0;
      transform: scale(0.7);
    }
  }
</style>
