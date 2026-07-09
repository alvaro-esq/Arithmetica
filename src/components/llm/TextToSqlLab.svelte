<script lang="ts">
  import { SCHEMA, SQL_CASES } from '../../lib/llm/sql';
  import { stepLoop } from '../../lib/viz/stepper';
  import { ACCENT, POS, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Text-to-SQL con la regla de oro: TÚ votas si el SQL está bien ANTES de
  // ver el veredicto. Uno de los tres casos luce perfecto… y no lo está.

  let caseIdx = $state(0);
  let revealed = $state(10_000); // typewriter del SQL (SSR: completo)
  let typing = $state(false);
  let vote = $state<'ok' | 'flaw' | null>(null);
  let solved = $state<boolean[]>(SQL_CASES.map(() => false));

  let cc = $derived(SQL_CASES[caseIdx]);
  let sqlShown = $derived(cc.sql.slice(0, revealed));
  let done = $derived(revealed >= cc.sql.length);
  let correct = $derived(vote !== null && (vote === 'flaw') === (cc.flaw !== null));

  // refs usadas para iluminar el esquema
  let used = $derived(new Set(cc.usedRefs.map((r) => (r.column ? r.table + '.' + r.column : r.table))));

  function setCase(i: number) {
    caseIdx = i;
    vote = null;
    revealed = 0;
    typing = true;
  }
  function cast(v: 'ok' | 'flaw') {
    if (vote !== null) return;
    vote = v;
    if ((v === 'flaw') === (cc.flaw !== null)) {
      solved = solved.map((s, i) => (i === caseIdx ? true : s));
    }
  }

  $effect(() => {
    if (!typing) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealed = cc.sql.length;
      typing = false;
      return;
    }
    return stepLoop({
      interval: 12,
      total: cc.sql.length,
      step: () => (revealed = Math.min(cc.sql.length, revealed + 4)),
      onDone: () => (typing = false),
    });
  });
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Caso">
    {#each SQL_CASES as c, i (c.id)}
      <button class="rounded-md border px-2.5 py-1 text-xs font-medium" style={i === caseIdx ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${solved[i] ? SUCCESS : MUTED};border-color:${solved[i] ? SUCCESS : BORDER}`} onclick={() => setCase(i)}>{solved[i] ? '✓ ' : ''}Caso {i + 1}</button>
    {/each}
    {#if solved.every(Boolean)}
      <span class="chip-in text-xs font-medium" style="color: {SUCCESS}">✓ {SQL_CASES.length}/{SQL_CASES.length} — ya revisas SQL como analista.</span>
    {/if}
  </div>

  <p class="mb-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium" style="border-color: {ACCENT}; background-color: {PAPER}; color: {INK}">🧑‍💼 "{cc.question}"</p>

  <div class="grid gap-3 md:grid-cols-[minmax(0,240px)_1fr]">
    <!-- esquema iluminado -->
    <div>
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">Esquema (lo que el SQL usa se ilumina)</p>
      <div class="space-y-1.5">
        {#each SCHEMA as t (t.name)}
          {@const tOn = used.has(t.name)}
          <div class="rounded-md border px-2 py-1.5" style="border-color: {tOn ? ACCENT : BORDER}; background-color: {PAPER}; opacity: {tOn ? 1 : 0.55}; transition: opacity 0.25s ease">
            <p class="font-mono text-xs font-bold" style="color: {tOn ? ACCENT : MUTED}">{t.name}</p>
            <p class="font-mono text-[10.5px] leading-relaxed">
              {#each t.columns as col, j (col)}
                {@const cOn = used.has(t.name + '.' + col)}
                <span style="color: {cOn ? INK : MUTED}; {cOn ? `background-color:${ACCENT}18; font-weight:700; border-radius:3px; padding:0 2px` : ''}">{col}</span>{j < t.columns.length - 1 ? ' ' : ''}
              {/each}
            </p>
          </div>
        {/each}
      </div>
    </div>

    <!-- SQL + voto -->
    <div>
      <p class="mb-1.5 text-xs font-bold uppercase tracking-wide" style="color: {MUTED}">SQL generado por el modelo</p>
      <pre class="overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed" style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}"><code>{sqlShown}{#if !done}<span class="font-bold" style="color: {ACCENT}">▌</span>{/if}</code></pre>

      {#if done && vote === null}
        <div class="chip-in mt-2 rounded-md border-2 p-2.5" style="border-color: {ACCENT}; background-color: {PAPER}">
          <p class="text-sm font-bold" style="color: {INK}">Antes de ejecutarlo en producción: ¿lo apruebas?</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {SUCCESS}; color: {PAPER}" onclick={() => cast('ok')}>✓ Se ve bien</button>
            <button class="rounded-md px-3 py-1.5 text-sm font-semibold" style="background-color: {WARN}; color: {PAPER}" onclick={() => cast('flaw')}>⚠ Tiene un problema</button>
          </div>
        </div>
      {/if}

      {#if vote !== null}
        <div class="chip-in mt-2 rounded-md border-2 p-2.5 text-sm" style="border-color: {correct ? SUCCESS : WARN}; background-color: {PAPER}" aria-live="polite">
          <p class="font-bold" style="color: {correct ? SUCCESS : WARN}">{correct ? '✓ Buen ojo.' : '✗ Te la coló.'} {cc.flaw ? 'Este SQL tiene una falla de negocio.' : 'Este SQL es correcto.'}</p>
          {#if cc.flaw}
            <p class="mt-1 text-xs leading-snug" style="color: {INK}">{cc.flaw.desc}</p>
            <pre class="mt-2 overflow-x-auto rounded-md border p-2 font-mono text-[11px] leading-relaxed" style="border-color: {SUCCESS}; background-color: {SUCCESS}08"><code>{#each cc.flaw.fixedSql.split('\n') as ln (ln)}<span style={cc.sql.includes(ln) ? `color:${INK}` : `background-color:${SUCCESS};color:${PAPER};font-weight:700`}>{ln}</span>{'\n'}{/each}</code></pre>
            <p class="mt-1 text-xs font-medium" style="color: {WARN}">📊 {cc.flaw.impact}</p>
          {/if}
          <p class="mt-1.5 text-xs leading-snug" style="color: {MUTED}">💡 {cc.explain}</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .chip-in {
    animation: chip-in 0.3s ease;
  }
  @keyframes chip-in {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
  }
</style>
