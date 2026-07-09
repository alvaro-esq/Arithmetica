<script lang="ts">
  import { TREE, TREE_ROOT, type TreeLeaf, type TreeQuestion } from '../../lib/llm/strategy';
  import { ACCENT, POS, NEG, SUCCESS, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // "Quiero que el modelo sepa X" — el árbol de decisión que responde
  // ¿prompting, RAG o fine-tuning? Camino visible, reiniciable.

  interface Crumb {
    q: string;
    answer: 'Sí' | 'No';
  }

  let nodeId = $state(TREE_ROOT);
  let path = $state<Crumb[]>([]);

  let node = $derived(TREE[nodeId]);
  let leaf = $derived(node.kind === 'leaf' ? (node as TreeLeaf) : null);
  let question = $derived(node.kind === 'q' ? (node as TreeQuestion) : null);

  const TONE: Record<TreeLeaf['tone'], string> = { accent: ACCENT, pos: POS, neg: NEG, success: SUCCESS };

  function answer(yes: boolean) {
    if (!question) return;
    path = [...path, { q: question.q, answer: yes ? 'Sí' : 'No' }];
    nodeId = yes ? question.yes : question.no;
  }
  function reset() {
    nodeId = TREE_ROOT;
    path = [];
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <!-- camino recorrido -->
  {#if path.length > 0}
    <ol class="mb-3 space-y-1">
      {#each path as c, i (i)}
        <li class="crumb-in flex items-start gap-2 text-xs" style="color: {MUTED}">
          <span class="mt-0.5 rounded-full px-1.5 font-bold tabular-nums" style="background-color: {ACCENT}; color: {PAPER}">{i + 1}</span>
          <span class="leading-snug">{c.q} — <strong style="color: {c.answer === 'Sí' ? SUCCESS : POS}">{c.answer}</strong></span>
        </li>
      {/each}
    </ol>
  {/if}

  {#if question}
    <div class="crumb-in rounded-md border-2 p-4" style="border-color: {ACCENT}; background-color: {PAPER}">
      <p class="text-base font-bold leading-snug" style="color: {INK}">{question.q}</p>
      <p class="mt-1 text-xs leading-snug" style="color: {MUTED}">{question.hint}</p>
      <div class="mt-3 flex gap-2">
        <button class="rounded-md px-4 py-1.5 text-sm font-semibold" style="background-color: {SUCCESS}; color: {PAPER}" onclick={() => answer(true)}>Sí</button>
        <button class="rounded-md px-4 py-1.5 text-sm font-semibold" style="background-color: {POS}; color: {PAPER}" onclick={() => answer(false)}>No</button>
      </div>
    </div>
  {/if}

  {#if leaf}
    {@const c = TONE[leaf.tone]}
    <div class="crumb-in rounded-md border-2 p-4" style="border-color: {c}; background-color: {PAPER}" aria-live="polite">
      <p class="text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">Recomendación</p>
      <p class="mt-0.5 text-xl font-bold" style="color: {c}">{leaf.rec}</p>
      <p class="mt-2 text-sm leading-relaxed" style="color: {INK}">{leaf.why}</p>
      <p class="mt-2 rounded-md border-l-4 px-2.5 py-1.5 text-xs leading-snug" style="border-color: {c}; background-color: {c}0d; color: {INK}"><strong>En BI:</strong> {leaf.ejemploBI}</p>
    </div>
  {/if}

  <div class="mt-3 flex items-center gap-2">
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={reset}>↺ Volver a empezar</button>
    {#if leaf}
      <span class="text-xs" style="color: {MUTED}">Prueba otro camino para conocer las demás estrategias (hay rutas distintas que llegan a RAG — no es casualidad).</span>
    {/if}
  </div>
</div>

<style>
  .crumb-in {
    animation: crumb-in 0.3s ease;
  }
  @keyframes crumb-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
