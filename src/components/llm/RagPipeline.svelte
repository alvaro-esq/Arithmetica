<script lang="ts">
  import { RAG_CASES, rankFragments, retrieved } from '../../lib/llm/rag';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER, AXIS } from '../../lib/svm/colors';

  // RAG paso a paso: buscar → inyectar → responder citando. Es el
  // "Con datos" de la lección 4, automatizado.

  const STAGES = ['1 · Pregunta', '2 · Búsqueda', '3 · Contexto', '4 · Respuesta'];

  let caseIdx = $state(0);
  let stage = $state(0);
  let hoverFrag = $state<string | null>(null);

  let cc = $derived(RAG_CASES[caseIdx]);
  let ranked = $derived(rankFragments(cc));
  let got = $derived(retrieved(cc));
  let topIds = $derived(new Set(got.top.map((r) => r.frag.id)));

  function setCase(i: number) {
    caseIdx = i;
    stage = 0;
    hoverFrag = null;
  }
  function setStage(s: number) {
    stage = s;
    hoverFrag = null;
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div class="flex gap-1.5" role="group" aria-label="Caso">
      {#each RAG_CASES as c, i (c.id)}
        <button class="rounded-md border px-2.5 py-1 text-xs font-medium" style={i === caseIdx ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`} onclick={() => setCase(i)}>Caso {i + 1}</button>
      {/each}
    </div>
    <div class="flex flex-wrap gap-1" role="group" aria-label="Etapa del pipeline">
      {#each STAGES as s, i (s)}
        <button
          class="rounded-full border px-2.5 py-1 text-xs font-medium"
          style={i === stage ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : i < stage ? `color:${ACCENT};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
          aria-current={i === stage ? 'step' : undefined}
          onclick={() => setStage(i)}
        >{s}</button>
      {/each}
    </div>
  </div>

  <p class="mb-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium" style="border-color: {ACCENT}; background-color: {PAPER}; color: {INK}">🧑‍💼 "{cc.question}"</p>

  {#if stage === 0}
    <p class="stage-in text-sm leading-relaxed" style="color: {INK}">La pregunta <strong>no</strong> va directo al modelo. Primero se convierte en un punto del mapa de embeddings (sección anterior) y se compara contra <strong>todos los fragmentos</strong> de la base de conocimiento: reportes, políticas, minutas, encuestas… Pasa a <strong>2 · Búsqueda</strong>.</p>
  {/if}

  {#if stage === 1}
    <div class="stage-in">
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">Los {ranked.length} fragmentos, puntuados por cercanía a la pregunta (entran los top {cc.k})</p>
      <ul class="space-y-1">
        {#each ranked as r (cc.id + r.frag.id)}
          {@const hot = topIds.has(r.frag.id)}
          <li class="flex items-center gap-2 rounded border px-2 py-1 text-xs" style="border-color: {hot ? SUCCESS : BORDER}; background-color: {PAPER}; opacity: {hot ? 1 : 0.6}">
            <span class="w-40 shrink-0 truncate font-medium" style="color: {INK}">{hot ? '✓ ' : ''}{r.frag.title}</span>
            <span class="h-2 grow overflow-hidden rounded-full" style="background-color: {AXIS}40">
              <span class="block h-full rounded-full" style="width: {r.score * 100}%; background-color: {hot ? SUCCESS : POS}; transition: width 0.3s ease"></span>
            </span>
            <span class="w-9 text-right tabular-nums" style="color: {MUTED}">{r.score.toFixed(2)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if stage === 2}
    <div class="stage-in">
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {POS}">📎 Esto se inyecta al contexto ({got.tokens} tokens — no las 50,000 filas)</p>
      <div class="space-y-1.5">
        {#each got.top as r (cc.id + '-ctx-' + r.frag.id)}
          <div class="rounded-md border-l-4 px-2.5 py-1.5 text-xs leading-snug" style="border-color: {POS}; background-color: {POS}0d">
            <span class="font-bold" style="color: {POS}">{r.frag.title}</span>
            <span style="color: {MUTED}"> · {r.frag.source} · {r.frag.tokens} tok</span>
            <p style="color: {INK}">{r.frag.text}</p>
          </div>
        {/each}
      </div>
      <p class="mt-1.5 text-xs leading-snug" style="color: {MUTED}">El prompt final = instrucciones + estos fragmentos + la pregunta. La ventana de contexto (lección 2) se usa como <strong>escenario</strong>, no como bodega.</p>
    </div>
  {/if}

  {#if stage === 3}
    <div class="stage-in">
      <div class="rounded-md border p-3 text-sm leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}" aria-live="polite">
        <span class="font-bold" style="color: {ACCENT}">🤖 </span>
        {#each cc.answer as s, i (cc.id + '-a' + i)}
          {#if s.fragId}
            <span
              class="rounded px-0.5 font-semibold"
              style="background-color: {SUCCESS}1c; color: {INK}; box-shadow: inset 0 -2px 0 {SUCCESS}; cursor: help; outline-offset: 2px"
              role="button"
              tabindex="0"
              aria-label={`Ver el fragmento que respalda: ${s.text}`}
              onmouseenter={() => (hoverFrag = s.fragId ?? null)}
              onmouseleave={() => (hoverFrag = null)}
              onfocus={() => (hoverFrag = s.fragId ?? null)}
              onblur={() => (hoverFrag = null)}
              onclick={() => (hoverFrag = s.fragId ?? null)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  hoverFrag = s.fragId ?? null;
                }
              }}
            >{s.text}</span>
          {:else}
            <span style="color: {cc.missing ? WARN : INK}">{s.text}</span>
          {/if}
        {/each}
      </div>

      {#if cc.missing}
        <p class="mt-2 rounded-md border-l-4 px-2.5 py-1.5 text-xs leading-snug" style="border-color: {WARN}; background-color: {WARN}10; color: {INK}">Este es el caso importante: RAG bien hecho responde <strong>"no está en los documentos"</strong> en lugar de inventar. Compáralo con el "Sin datos" de la lección 4.</p>
      {:else}
        <div class="mt-2 space-y-1.5">
          {#each got.top as r (cc.id + '-src-' + r.frag.id)}
            <div class="rounded-md border-l-4 px-2.5 py-1.5 text-xs leading-snug" style="border-color: {hoverFrag === r.frag.id ? SUCCESS : BORDER}; background-color: {hoverFrag === r.frag.id ? SUCCESS + '14' : PAPER}; transition: background-color 0.2s ease">
              <span class="font-bold" style="color: {hoverFrag === r.frag.id ? SUCCESS : MUTED}">{r.frag.title}</span>
              <span style="color: {MUTED}"> · {r.frag.source}</span>
              {#if hoverFrag === r.frag.id}<p class="stage-in" style="color: {INK}">{r.frag.text}</p>{/if}
            </div>
          {/each}
          <p class="text-xs" style="color: {MUTED}">Pasa el cursor (o el foco) por cada afirmación subrayada: se ilumina su fuente. Eso es lo que el fine-tuning no puede darte: <strong>cita verificable</strong>.</p>
        </div>
      {/if}
    </div>
  {/if}

  <div class="mt-3 flex gap-2">
    <button class="rounded-md border px-3 py-1.5 text-sm font-semibold" style="color: {ACCENT}; border-color: {ACCENT}; opacity: {stage === 0 ? 0.4 : 1}" disabled={stage === 0} onclick={() => setStage(stage - 1)}>◀ Anterior</button>
    <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {ACCENT}; color: {PAPER}; opacity: {stage === 3 ? 0.4 : 1}" disabled={stage === 3} onclick={() => setStage(stage + 1)}>Siguiente ▶</button>
  </div>
</div>

<style>
  .stage-in {
    animation: stage-in 0.3s ease;
  }
  @keyframes stage-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
