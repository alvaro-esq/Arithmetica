<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS } from '../../lib/svm/colors';
  import type { V2 } from '../../lib/la/vec2';
  import { type Mat2, mulMat, mulVec, lerpMat, IDENTITY, MAT_PRESETS } from '../../lib/la/mat2';
  import { GLYPH_F } from '../../lib/la/glyph';

  // Composing transformations = multiplying matrices, and the order matters.
  // Watch the glyph go x → Fx → S(Fx) step by step; the dashed ghosts are the
  // two possible final results (S·F vs F·S). Entrywise lerp from M to S·M is
  // exactly "apply S progressively": (1−t)M + t·SM = ((1−t)I + tS)·M.

  const OPTIONS = MAT_PRESETS.filter((p) => ['rotacion', 'cizalla', 'escala', 'reflexion'].includes(p.id));
  let firstId = $state('rotacion');
  let secondId = $state('cizalla');
  let first = $derived(OPTIONS.find((p) => p.id === firstId)!);
  let second = $derived(OPTIONS.find((p) => p.id === secondId)!);

  let SF = $derived(mulMat(second.A, first.A)); // primero F, después S
  let FS = $derived(mulMat(first.A, second.A)); // orden invertido
  let maxDiff = $derived(Math.max(...SF.flat().map((x, i) => Math.abs(x - FS.flat()[i]))));
  let commute = $derived(maxDiff < 1e-9);

  // One tween drives the two-stage animation: t ∈ [0,1] applies the first
  // matrix, t ∈ (1,2] applies the second on top.
  const stageT = new Tween(2, { duration: 1800, easing: cubicOut });
  let order = $state<'normal' | 'swapped'>('normal');
  function run(o: 'normal' | 'swapped') {
    order = o;
    stageT.set(0, { duration: 0 });
    stageT.set(2);
  }

  let Mcur = $derived.by<Mat2>(() => {
    const t = stageT.current;
    const P1 = order === 'normal' ? first.A : second.A;
    const P2 = order === 'normal' ? SF : FS;
    if (t <= 1) return lerpMat(IDENTITY, P1, t);
    return lerpMat(P1, P2, t - 1);
  });
  let stageLabel = $derived.by(() => {
    const t = stageT.current;
    const a = order === 'normal' ? first : second;
    const b = order === 'normal' ? second : first;
    if (t <= 0.02) return 'listo';
    if (t < 1) return `aplicando ${a.label}…`;
    if (t < 2) return `aplicando ${b.label}…`;
    return order === 'normal' ? `resultado: ${second.label} ∘ ${first.label}` : `resultado: ${first.label} ∘ ${second.label}`;
  });

  const dom = { xMin: -3, xMax: 3, yMin: -2.4, yMax: 2.4 };
  const width = 600;
  const height = 440;
  const pad = 10;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);
  const O = { x: xScale(0), y: yScale(0) };

  function glyphUnder(M: Mat2): string {
    return GLYPH_F.map((p) => {
      const q: V2 = mulVec(M, p);
      return `${xScale(q.x)},${yScale(q.y)}`;
    }).join(' ');
  }
  const fmt = (x: number) => (Object.is(x, -0) ? 0 : Number(x.toFixed(2)));
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    <label class="flex items-center gap-2 font-medium">
      Primero
      <select bind:value={firstId} class="rounded border border-line bg-paper-raised px-2 py-1">
        {#each OPTIONS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
      </select>
    </label>
    <label class="flex items-center gap-2 font-medium">
      después
      <select bind:value={secondId} class="rounded border border-line bg-paper-raised px-2 py-1">
        {#each OPTIONS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
      </select>
    </label>
    <span class="ml-auto flex gap-2">
      <button onclick={() => run('normal')} class="rounded-md px-3 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color:{ACCENT}">Aplicar paso a paso</button>
      <button onclick={() => run('swapped')} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">Intercambiar orden</button>
    </span>
  </div>

  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none animate-fade-up">
    <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
    <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- original glyph, faint reference -->
    <polygon points={glyphUnder(IDENTITY)} fill="none" stroke={AXIS} stroke-width="1.5" />

    <!-- final ghosts: both possible orders -->
    <polygon points={glyphUnder(SF)} fill={POS} fill-opacity="0.07" stroke={POS} stroke-width="1.5" stroke-dasharray="6 4" />
    <polygon points={glyphUnder(FS)} fill={NEG} fill-opacity="0.07" stroke={NEG} stroke-width="1.5" stroke-dasharray="6 4" />

    <!-- animated glyph -->
    <polygon points={glyphUnder(Mcur)} fill={ACCENT} fill-opacity="0.2" stroke={ACCENT} stroke-width="2.5" />

    <text x={pad + 6} y={height - pad - 8} font-size="13" fill={MUTED}>{stageLabel}</text>
  </svg>

  <div class="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink">
    <div>
      <p class="mb-1 font-semibold" style="color:{POS}">{second.label} ∘ {first.label}</p>
      <div class="grid w-max grid-cols-2 gap-x-3 rounded border border-line bg-paper-raised px-3 py-1.5 tabular-nums">
        <span>{fmt(SF[0][0])}</span><span>{fmt(SF[0][1])}</span>
        <span>{fmt(SF[1][0])}</span><span>{fmt(SF[1][1])}</span>
      </div>
    </div>
    <div>
      <p class="mb-1 font-semibold" style="color:{NEG}">{first.label} ∘ {second.label}</p>
      <div class="grid w-max grid-cols-2 gap-x-3 rounded border border-line bg-paper-raised px-3 py-1.5 tabular-nums">
        <span>{fmt(FS[0][0])}</span><span>{fmt(FS[0][1])}</span>
        <span>{fmt(FS[1][0])}</span><span>{fmt(FS[1][1])}</span>
      </div>
    </div>
    {#if commute}
      <span class="font-semibold" style="color:{SUCCESS}">¡Estas dos conmutan! Los fantasmas coinciden.</span>
    {:else}
      <span class="font-medium" style="color:{MUTED}">Los productos difieren (Δmáx = {maxDiff.toFixed(2)}): el orden importa.</span>
    {/if}
  </div>
</div>
