<script lang="ts">
  import { PRICES, costUSD, fmtUSD } from '../../lib/llm/cost';
  import { ACCENT, POS, NEG, WARN, SUCCESS, MUTED, PAPER, PAPER_RAISED, INK, BORDER } from '../../lib/svm/colors';

  // Dos diseños de la MISMA solución, lado a lado: mandar la tabla cruda al
  // modelo vs pre-calcular en la base y mandar solo las métricas.

  interface Cfg {
    tier: number;
    inExp: number; // log10 de tokens de entrada
    outTok: number;
    callsExp: number; // log10 de llamadas por día
  }

  // Escenario A: la tabla completa de 50,000 filas viaja en cada pregunta.
  let a = $state<Cfg>({ tier: 1, inExp: 4.9, outTok: 200, callsExp: 1.7 });
  // Escenario B: la base de datos calcula; el modelo solo redacta.
  let b = $state<Cfg>({ tier: 0, inExp: 2.6, outTok: 150, callsExp: 1.7 });
  let budget = $state(100); // USD al mes

  const DAYS = 30;
  const tok = (exp: number) => Math.round(10 ** exp);
  const calls = (exp: number) => Math.round(10 ** exp);
  const fmtK = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));

  function breakdown(c: Cfg) {
    return costUSD(
      { inTokens: tok(c.inExp), outTokens: c.outTok, callsPerDay: calls(c.callsExp), days: DAYS },
      PRICES[c.tier],
    );
  }
  let bdA = $derived(breakdown(a));
  let bdB = $derived(breakdown(b));
  let maxTotal = $derived(Math.max(bdA.total, bdB.total, budget) * 1.08);

  function resetExample() {
    a = { tier: 1, inExp: 4.9, outTok: 200, callsExp: 1.7 };
    b = { tier: 0, inExp: 2.6, outTok: 150, callsExp: 1.7 };
    budget = 100;
  }
</script>

{#snippet scenarioCard(cfg: Cfg, name: string, desc: string, color: string)}
  <div class="rounded-lg border p-3" style="border-color: {BORDER}; background-color: {PAPER}">
    <p class="mb-0.5 text-sm font-bold" style="color: {color}">{name}</p>
    <p class="mb-2 text-xs leading-snug" style="color: {MUTED}">{desc}</p>
    <div class="mb-2 flex gap-1" role="group" aria-label="Modelo para {name}">
      {#each PRICES as p, i}
        <button
          class="rounded border px-2 py-0.5 text-[11px] font-medium"
          style={cfg.tier === i ? `background-color:${ACCENT};color:${PAPER};border-color:${ACCENT}` : `color:${MUTED};border-color:${BORDER}`}
          title={p.hint}
          onclick={() => (cfg.tier = i)}
        >{p.label}</button>
      {/each}
    </div>
    <label class="block text-xs font-medium" style="color: {INK}">
      Entrada: <strong class="tabular-nums">{fmtK(tok(cfg.inExp))} tokens</strong>/llamada
      <input type="range" bind:value={cfg.inExp} min="2" max="5" step="0.02" class="w-full accent-interactive" />
    </label>
    <label class="block text-xs font-medium" style="color: {INK}">
      Salida: <strong class="tabular-nums">{cfg.outTok} tokens</strong>/llamada
      <input type="range" bind:value={cfg.outTok} min="50" max="2000" step="25" class="w-full accent-interactive" />
    </label>
    <label class="block text-xs font-medium" style="color: {INK}">
      Volumen: <strong class="tabular-nums">{calls(cfg.callsExp)} llamadas</strong>/día
      <input type="range" bind:value={cfg.callsExp} min="0" max="3" step="0.05" class="w-full accent-interactive" />
    </label>
    <p class="mt-1 text-xs tabular-nums" style="color: {MUTED}">≈ {fmtUSD(breakdown(cfg).perCall)} por llamada</p>
  </div>
{/snippet}

<div class="rounded-lg border p-4" style="border-color: {BORDER}; background-color: {PAPER_RAISED}">
  <div class="grid gap-3 sm:grid-cols-2">
    {@render scenarioCard(a, 'Escenario A — fuerza bruta', 'Cada pregunta manda la tabla completa (50,000 filas) al modelo.', POS)}
    {@render scenarioCard(b, 'Escenario B — bien diseñado', 'La base de datos calcula las métricas; el modelo solo redacta el resumen.', SUCCESS)}
  </div>

  <div class="mt-4" aria-live="polite">
    <p class="mb-1.5 text-xs font-medium uppercase tracking-wide" style="color: {MUTED}">Costo mensual ({DAYS} días) — <span style="color: {NEG}">entrada</span> + <span style="color: {ACCENT}">salida</span></p>
    {#each [{ bd: bdA, name: 'A', color: POS }, { bd: bdB, name: 'B', color: SUCCESS }] as row}
      {@const over = row.bd.total > budget}
      <div class="mb-1.5 flex items-center gap-2">
        <span class="w-4 text-sm font-bold" style="color: {row.color}">{row.name}</span>
        <span class="relative h-7 grow overflow-hidden rounded" style="background-color: {PAPER}">
          <span class="absolute inset-y-0 left-0" style="width: {(row.bd.inCost / maxTotal) * 100}%; background-color: {over ? WARN : NEG}; opacity: 0.75; transition: width 0.3s ease, background-color 0.3s ease"></span>
          <span class="absolute inset-y-0" style="left: {(row.bd.inCost / maxTotal) * 100}%; width: {(row.bd.outCost / maxTotal) * 100}%; background-color: {over ? WARN : ACCENT}; opacity: 0.9; transition: left 0.3s ease, width 0.3s ease, background-color 0.3s ease"></span>
          <!-- línea de presupuesto -->
          <span class="absolute inset-y-0 w-0.5" style="left: {(budget / maxTotal) * 100}%; background-color: {INK}; opacity: 0.55"></span>
        </span>
        <span class="w-24 shrink-0 text-right text-sm font-bold tabular-nums" style="color: {over ? WARN : INK}">{fmtUSD(row.bd.total)}</span>
      </div>
    {/each}
    <label class="mt-2 block text-xs font-medium" style="color: {INK}">
      Presupuesto mensual: <strong class="tabular-nums">{fmtUSD(budget)}</strong> (línea negra)
      <input type="range" bind:value={budget} min="5" max="1000" step="5" class="w-full accent-interactive" />
    </label>
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-3">
    <button class="rounded-md border px-3 py-1.5 text-sm" style="color: {MUTED}; border-color: {BORDER}" onclick={resetExample}>↺ Ejemplo del temario</button>
    <p class="text-xs" style="color: {MUTED}">
      {#if bdA.total > 0 && bdB.total > 0 && bdA.total / bdB.total >= 2}
        El escenario A cuesta <strong style="color: {WARN}">{(bdA.total / bdB.total).toFixed(0)}×</strong> más — mismo resultado para el usuario.
      {:else}
        Mueve los controles: entrada, salida, volumen y tier cambian el total de formas muy distintas.
      {/if}
    </p>
  </div>
</div>
