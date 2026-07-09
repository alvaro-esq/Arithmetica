<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, WARN, BORDER } from '../../lib/svm/colors';
  import type { Domain } from '../../lib/svm/geometry';
  import { lineSegment } from '../../lib/svm/geometry';
  import { norm, sub, type V2 } from '../../lib/la/vec2';
  import type { Mat2 } from '../../lib/la/mat2';
  import { mulVec } from '../../lib/la/mat2';
  import { starPath } from '../../lib/viz/marks';
  import Celebrate from '../ui/Celebrate.svelte';

  // The same system Ax = b seen through two lenses, driven by ONE pair of
  // sliders. Row view: each equation is a line, the solution their crossing.
  // Column view: x₁·col₁ + x₂·col₂ trying to reach b. Both light up together
  // because they are the same fact.

  interface SystemPreset {
    id: string;
    label: string;
    A: Mat2;
    b: V2;
  }
  const SYSTEMS: SystemPreset[] = [
    { id: 'unica', label: 'Única solución', A: [[1, 1], [1, -1]], b: { x: 2, y: 0 } },
    { id: 'ninguna', label: 'Sin solución', A: [[1, 1], [2, 2]], b: { x: 1, y: 3 } },
    { id: 'infinitas', label: 'Infinitas', A: [[1, 1], [2, 2]], b: { x: 1, y: 2 } },
  ];
  let sysId = $state('unica');
  let sys = $derived(SYSTEMS.find((s) => s.id === sysId)!);
  let A = $derived(sys.A);
  let b = $derived(sys.b);

  let x1 = $state(0.2);
  let x2 = $state(-0.4);
  let w = $derived(mulVec(A, { x: x1, y: x2 }));
  let solved = $derived(norm(sub(w, b)) < 0.12);
  let parallel = $derived(Math.abs(A[0][0] * A[1][1] - A[0][1] * A[1][0]) < 1e-9);

  const dom: Domain = { xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5 };
  const size = 300;
  const pad = 8;
  const sc = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, size - pad]);
  const scY = scaleLinear().domain([dom.yMin, dom.yMax]).range([size - pad, pad]);
  const O = { x: sc(0), y: scY(0) };
  const px = (p: V2) => ({ x: sc(p.x), y: scY(p.y) });

  // Row view: equation i is the line (fila i)·(x, y) = bᵢ.
  let row1 = $derived(lineSegment({ x: A[0][0], y: A[0][1] }, 0, b.x, dom));
  let row2 = $derived(lineSegment({ x: A[1][0], y: A[1][1] }, 0, b.y, dom));
  let col1 = $derived<V2>({ x: A[0][0], y: A[1][0] });
  let col2 = $derived<V2>({ x: A[0][1], y: A[1][1] });
  let ghost = $derived<V2>({ x: x1 * col1.x, y: x1 * col1.y });
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-muted">Sistema:</span>
    {#each SYSTEMS as s (s.id)}
      <button
        onclick={() => (sysId = s.id)}
        class="rounded-md border px-3 py-1.5 font-medium hover:bg-paper-raised"
        style="border-color:{sysId === s.id ? ACCENT : BORDER}; color:{sysId === s.id ? ACCENT : 'inherit'}"
      >
        {s.label}
      </button>
    {/each}
    <span class="ml-auto tabular-nums text-ink">
      {A[0][0]}x₁ + {A[0][1]}x₂ = {b.x} &nbsp;·&nbsp; {A[1][0]}x₁ {A[1][1] < 0 ? '−' : '+'} {Math.abs(A[1][1])}x₂ = {b.y}
    </span>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <figure class="m-0">
      <figcaption class="mb-1 text-center text-sm font-semibold text-ink">Vista por filas: dos rectas</figcaption>
      <svg viewBox="0 0 {size} {size}" preserveAspectRatio="xMidYMid meet" class="w-full select-none animate-fade-up rounded border" style="border-color:{solved ? SUCCESS : BORDER}">
        <line x1={pad} y1={O.y} x2={size - pad} y2={O.y} stroke={AXIS} stroke-width="1" />
        <line x1={O.x} y1={pad} x2={O.x} y2={size - pad} stroke={AXIS} stroke-width="1" />
        <line x1={sc(row1[0].x)} y1={scY(row1[0].y)} x2={sc(row1[1].x)} y2={scY(row1[1].y)} stroke={POS} stroke-width="2.5" />
        <line x1={sc(row2[0].x)} y1={scY(row2[0].y)} x2={sc(row2[1].x)} y2={scY(row2[1].y)} stroke={NEG} stroke-width="2.5" />
        <!-- current guess (x₁, x₂) -->
        <circle cx={sc(x1)} cy={scY(x2)} r={solved ? 9 : 6} fill={solved ? SUCCESS : ACCENT} />
        <text x={sc(x1) + 10} y={scY(x2) - 8} font-size="12" font-weight="700" fill={solved ? SUCCESS : ACCENT}>(x₁, x₂)</text>
      </svg>
    </figure>

    <figure class="m-0">
      <figcaption class="mb-1 text-center text-sm font-semibold text-ink">Vista por columnas: alcanzar b</figcaption>
      <svg viewBox="0 0 {size} {size}" preserveAspectRatio="xMidYMid meet" class="w-full select-none animate-fade-up rounded border" style="border-color:{solved ? SUCCESS : BORDER}">
        <defs>
          <marker id="rc-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={POS} />
          </marker>
          <marker id="rc-neg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={NEG} />
          </marker>
          <marker id="rc-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
          </marker>
        </defs>
        <line x1={pad} y1={O.y} x2={size - pad} y2={O.y} stroke={AXIS} stroke-width="1" />
        <line x1={O.x} y1={pad} x2={O.x} y2={size - pad} stroke={AXIS} stroke-width="1" />
        {#if parallel}
          <line x1={px({ x: 5 * col1.x, y: 5 * col1.y }).x} y1={px({ x: 5 * col1.x, y: 5 * col1.y }).y} x2={px({ x: -5 * col1.x, y: -5 * col1.y }).x} y2={px({ x: -5 * col1.x, y: -5 * col1.y }).y} stroke={MUTED} stroke-width="8" opacity="0.15" />
        {/if}
        <!-- unit columns -->
        <line x1={O.x} y1={O.y} x2={px(col1).x} y2={px(col1).y} stroke={POS} stroke-width="2" opacity="0.55" marker-end="url(#rc-pos)" />
        <line x1={O.x} y1={O.y} x2={px(col2).x} y2={px(col2).y} stroke={NEG} stroke-width="2" opacity="0.55" marker-end="url(#rc-neg)" />
        <!-- scaled, tip to tail -->
        <line x1={O.x} y1={O.y} x2={px(ghost).x} y2={px(ghost).y} stroke={POS} stroke-width="2" stroke-dasharray="5 4" marker-end="url(#rc-pos)" />
        <line x1={px(ghost).x} y1={px(ghost).y} x2={px(w).x} y2={px(w).y} stroke={NEG} stroke-width="2" stroke-dasharray="5 4" marker-end="url(#rc-neg)" />
        <line x1={O.x} y1={O.y} x2={px(w).x} y2={px(w).y} stroke={solved ? SUCCESS : ACCENT} stroke-width="3" marker-end="url(#rc-acc)" />
        <polygon points={starPath(px(b).x, px(b).y, 10)} fill={solved ? SUCCESS : 'none'} stroke={solved ? SUCCESS : WARN} stroke-width="2" />
        <text x={px(b).x + 10} y={px(b).y + 4} font-size="12" font-weight="700" fill={solved ? SUCCESS : WARN}>b</text>
      </svg>
    </figure>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      x₁ = {x1.toFixed(2)}
      <input type="range" bind:value={x1} min="-3" max="3" step="0.02" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      x₂ = {x2.toFixed(2)}
      <input type="range" bind:value={x2} min="-3" max="3" step="0.02" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    <span>Ax = ({w.x.toFixed(2)}, {w.y.toFixed(2)}) · objetivo b = ({b.x}, {b.y})</span>
    <Celebrate active={solved} label="¡Sistema resuelto en ambas vistas!" />
    {#if sysId === 'ninguna'}
      <span class="font-medium" style="color:{MUTED}">Rectas paralelas ⟺ columnas colineales con b fuera de su recta: el MISMO fallo, dos geometrías.</span>
    {:else if sysId === 'infinitas'}
      <span class="font-medium" style="color:{MUTED}">Las dos rectas son la misma ⟺ b sí cae en la recta de las columnas: toda una familia de soluciones.</span>
    {/if}
  </div>
</div>
