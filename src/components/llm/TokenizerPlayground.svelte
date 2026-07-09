<script lang="ts">
  import { tokenize, charsPerToken } from '../../lib/llm/tokenizer';
  import { PRICES, fmtUSD } from '../../lib/llm/cost';
  import { ACCENT, POS, NEG, SUCCESS, WARN, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Escribe lo que quieras y mira cómo lo "lee" el modelo: en tokens, no en
  // letras. Tokenizador educativo (aproximación, no el de ningún modelo real).

  const MAX_CHARS = 2000;
  const MAX_CHIPS = 400;

  const PRESETS = [
    {
      label: 'Español BI',
      text: 'Las ventas del tercer trimestre alcanzaron 1,250,000 quetzales con un margen del 23.5%, impulsadas por la región central y la internacionalización del canal digital.',
    },
    {
      label: 'Números y fechas',
      text: 'Ingresos: 4,582,190.75 — variación del 12.8% entre el 01/04/2026 y el 30/06/2026. Meta anual: 18,000,000.',
    },
    {
      label: 'SQL',
      text: "SELECT region, SUM(monto) AS total FROM ventas WHERE fecha >= '2026-06-01' GROUP BY region ORDER BY total DESC;",
    },
    {
      label: 'Palabras raras',
      text: 'La hiperespecialización y la desintermediación electroencefalográficamente sorprendente encarecen cada token: otorrinolaringología.',
    },
  ];

  let text = $state(PRESETS[0].text);

  let tokens = $derived(tokenize(text.slice(0, MAX_CHARS)));
  let cpt = $derived(charsPerToken(text.slice(0, MAX_CHARS)));
  let inputCost = $derived(fmtUSD((tokens.length * PRICES[1].inPerM) / 1_000_000));
  let shown = $derived(tokens.slice(0, MAX_CHIPS));

  // 6 tintes estables por hash del token (mismo token = mismo color, siempre)
  const TINTS = [ACCENT, POS, NEG, SUCCESS, WARN, MUTED];
  function tint(id: number): string {
    return TINTS[id % TINTS.length];
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="mb-2 flex flex-wrap gap-2">
    {#each PRESETS as p}
      <button
        class="rounded-md border px-2.5 py-1 text-xs font-medium"
        style={text === p.text ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
        onclick={() => (text = p.text)}
      >{p.label}</button>
    {/each}
  </div>

  <textarea
    bind:value={text}
    rows="3"
    maxlength={MAX_CHARS}
    class="w-full rounded-md border p-3 text-sm"
    style="border-color: {BORDER}; background-color: {PAPER}; color: {INK}"
    aria-label="Texto a tokenizar"
    placeholder="Escribe aquí…"
  ></textarea>

  <p class="mt-2 text-sm font-semibold tabular-nums" style="color: {INK}" aria-live="polite">
    <span class="text-lg" style="color: {ACCENT}">{tokens.length} tokens</span>
    <span style="color: {MUTED}"> · {text.length} caracteres · ~{cpt.toFixed(1)} chars/token · entrada ≈ {inputCost} (tier Estándar)</span>
  </p>

  <div class="mt-2 flex flex-wrap gap-x-0.5 gap-y-1.5 rounded-md border p-3 leading-none" style="border-color: {BORDER}; background-color: {PAPER}">
    {#each shown as t, i (i)}
      {@const c = tint(t.id)}
      <span
        class="rounded px-1 py-1 font-mono text-[13px]"
        style="background-color: {c}1e; color: {INK}; box-shadow: inset 0 -2px 0 {c}"
        title={t.kind}
      >{t.kind === 'subword' && !t.text.startsWith(' ') ? '·' : ''}{t.text.replaceAll(' ', '␣')}</span>
    {/each}
    {#if tokens.length > MAX_CHIPS}
      <span class="px-1 py-1 text-[13px] italic" style="color: {MUTED}">… +{tokens.length - MAX_CHIPS} tokens más</span>
    {/if}
  </div>

  <p class="mt-2 text-xs" style="color: {MUTED}">
    <span style="color: {INK}">␣</span> = espacio (los tokens suelen "traerse" su espacio) · <span style="color: {INK}">·</span> = continuación de una palabra partida.
    Prueba <em>Palabras raras</em>: las palabras largas o poco comunes se parten en más pedazos — y cuestan más. Tokenizador educativo: los conteos reales varían por modelo.
  </p>
</div>
