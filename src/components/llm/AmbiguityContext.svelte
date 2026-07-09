<script lang="ts">
  import { TELESCOPE_VARIANTS, TELESCOPE_TOKENS, CON_INDEX } from '../../lib/llm/attention';
  import { ACCENT, POS, PAPER, PAPER_RAISED, INK, MUTED, BORDER } from '../../lib/svm/colors';

  // La misma oración con distinto contexto: mira cómo la atención de "con"
  // cambia de destino y las dos interpretaciones se re-balancean.

  let sel = $state(0);
  let variant = $derived(TELESCOPE_VARIANTS[sel]);

  // geometría de los chips (misma receta que AttentionExplorer, compacta)
  const GAP = 8;
  const CHIP_H = 30;
  const ROW_Y = 110;
  const tokens = TELESCOPE_TOKENS;
  const widths = tokens.map((t) => t.length * 8.2 + 20);
  const xs = widths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? 14 : acc[i - 1] + widths[i - 1] + GAP);
    return acc;
  }, []);
  const totalW = xs[xs.length - 1] + widths[widths.length - 1] + 14;
  const centers = xs.map((x, i) => x + widths[i] / 2);

  function arcPath(from: number, to: number): string {
    const x1 = centers[from];
    const x2 = centers[to];
    const lift = Math.min(85, 20 + Math.abs(x2 - x1) * 0.3);
    return `M ${x1} ${ROW_Y - 5} Q ${(x1 + x2) / 2} ${ROW_Y - 5 - lift} ${x2} ${ROW_Y - 5}`;
  }
</script>

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <p class="mb-2 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">1 · Elige el contexto previo</p>
  <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Contexto previo">
    {#each TELESCOPE_VARIANTS as v, i}
      <button
        class="rounded-md border px-3 py-1.5 text-sm"
        style={i === sel ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT};font-weight:600` : `color:${INK};border-color:${BORDER}`}
        onclick={() => (sel = i)}
      >{v.context ?? '(sin contexto)'}</button>
    {/each}
  </div>

  <p class="mb-1 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">2 · Mira a quién atiende «con»</p>
  <svg viewBox="0 0 {totalW} {ROW_Y + CHIP_H + 12}" class="w-full select-none" role="img" aria-label="Arcos de atención del token con">
    {#each variant.conRow as w, k (sel + '-' + k)}
      {#if k !== CON_INDEX && w >= 0.05}
        <path d={arcPath(CON_INDEX, k)} fill="none" stroke={POS} stroke-width={1 + w * 10} opacity={0.2 + w * 1.5} stroke-linecap="round" class="arc" />
      {/if}
    {/each}
    {#each variant.conRow as w, k}
      {#if k !== CON_INDEX && w >= 0.15}
        <text x={centers[k]} y={ROW_Y - 12} text-anchor="middle" font-size="11" font-weight="700" fill={POS} class="arc">{Math.round(w * 100)}%</text>
      {/if}
    {/each}
    {#each tokens as tk, i}
      <rect
        x={xs[i]}
        y={ROW_Y}
        width={widths[i]}
        height={CHIP_H}
        rx="7"
        fill={i === CON_INDEX ? ACCENT : POS}
        fill-opacity={i === CON_INDEX ? 1 : 0.07 + variant.conRow[i] * 1.1}
        stroke={i === CON_INDEX ? ACCENT : BORDER}
        style="transition: fill-opacity 0.3s ease"
      />
      <text x={centers[i]} y={ROW_Y + CHIP_H / 2 + 4.5} text-anchor="middle" font-size="14" font-weight={i === CON_INDEX ? 700 : 500} fill={i === CON_INDEX ? PAPER : variant.conRow[i] > 0.4 ? PAPER : INK}>{tk}</text>
    {/each}
  </svg>

  <p class="mb-1 mt-3 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">3 · Las interpretaciones se re-balancean</p>
  <div class="space-y-2" aria-live="polite">
    {#each variant.interp as itp, i}
      <div class="flex items-center gap-2">
        <span class="w-2/5 min-w-[10rem] text-sm leading-tight" style="color: {INK}">{itp.label}</span>
        <span class="relative h-7 grow overflow-hidden rounded" style="background-color: {PAPER}">
          <span
            class="absolute inset-y-0 left-0 rounded"
            style="width: {itp.p * 100}%; background-color: {i === 0 ? ACCENT : POS}; opacity: 0.85; transition: width 0.45s ease"
          ></span>
        </span>
        <span class="w-12 shrink-0 text-right text-sm font-bold tabular-nums" style="color: {i === 0 ? ACCENT : POS}">{Math.round(itp.p * 100)}%</span>
      </div>
    {/each}
  </div>

  <p class="mt-3 text-xs" style="color: {MUTED}">
    Mismo texto, distinto contexto → distinta atención → distinto significado. Esto es exactamente lo que hace valiosa la <strong>ventana de contexto</strong> (siguiente lección).
  </p>
</div>

<style>
  .arc {
    animation: arc-in 0.35s ease;
  }
  @keyframes arc-in {
    from {
      opacity: 0;
    }
  }
</style>
