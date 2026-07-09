<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { clamp } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, WARN } from '../../lib/svm/colors';
  import { lincomb, sub, norm, type V2 } from '../../lib/la/vec2';
  import { solveLin2 } from '../../lib/la/solve';
  import { mulberry32 } from '../../lib/svm/prng';
  import { starPath } from '../../lib/viz/marks';
  import Celebrate from '../ui/Celebrate.svelte';

  // Drag u and v, mix them with the α/β sliders and try to reach the target
  // star with w = αu + βv. "Resolver" solves the 2×2 system live — a teaser of
  // lesson 3. Making u ∥ v collapses the span to a line: the target escapes.

  let vecs = $state<V2[]>([
    { x: 2.2, y: 0.6 },
    { x: 0.7, y: 1.8 },
  ]);
  const dom: Domain = { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };
  const width = 600;
  const height = 450;
  const pad = 36;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  // Tweens are the single source of truth for α and β: sliders write them with
  // duration 0, "Resolver" animates them to the solution.
  const alphaT = new Tween(1, { duration: 600, easing: cubicOut });
  const betaT = new Tween(1, { duration: 600, easing: cubicOut });
  let alpha = $derived(alphaT.current);
  let beta = $derived(betaT.current);

  let u = $derived(vecs[0]);
  let v = $derived(vecs[1]);
  let w = $derived(lincomb([{ c: alpha, v: u }, { c: beta, v: v }]));
  let ghost = $derived({ x: alpha * u.x, y: alpha * u.y }); // αu, tail of βv
  let area = $derived(Math.abs(u.x * v.y - u.y * v.x));
  let collapsed = $derived(area < 0.15);

  let targetSeed = $state(1);
  let target = $derived.by<V2>(() => {
    // Reachable by construction: a fixed (per-seed) combination of the INITIAL
    // basis, clamped to the visible plane. Dragging u/v afterwards keeps it put.
    const rng = mulberry32(90 + targetSeed);
    return {
      x: clamp(-3.2 + 6.4 * rng(), dom.xMin + 0.4, dom.xMax - 0.4),
      y: clamp(-2.4 + 4.8 * rng(), dom.yMin + 0.4, dom.yMax - 0.4),
    };
  });
  let hit = $derived(norm(sub(w, target)) < 0.28);
  let unreachable = $state(false);
  // Set when the exact solution exists but exceeds the slider range [-3, 3].
  let outOfRange = $state<{ a: number; b: number } | null>(null);

  function newTarget() {
    targetSeed += 1;
    unreachable = false;
    outOfRange = null;
  }

  function solve() {
    const sol = solveLin2(
      [
        [u.x, v.x],
        [u.y, v.y],
      ],
      target,
    );
    if (sol.kind === 'unique') {
      unreachable = false;
      outOfRange = Math.abs(sol.x.x) > 3 || Math.abs(sol.x.y) > 3 ? { a: sol.x.x, b: sol.x.y } : null;
      alphaT.set(clamp(sol.x.x, -3, 3));
      betaT.set(clamp(sol.x.y, -3, 3));
    } else {
      unreachable = true;
      outOfRange = null;
    }
  }

  function makeParallel() {
    vecs[1] = { x: -0.75 * u.x, y: -0.75 * u.y };
    unreachable = false;
    outOfRange = null;
  }

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points: vecs,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => {
      dragIndex = i;
      if (i >= 0) {
        unreachable = false;
        outOfRange = null;
      }
    },
  });

  const O = { x: xScale(0), y: yScale(0) };
  function px(p: V2): { x: number; y: number } {
    return { x: xScale(p.x), y: yScale(p.y) };
  }
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-[4/3] animate-fade-up"
  >
    <defs>
      <marker id="vc-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={POS} />
      </marker>
      <marker id="vc-neg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={NEG} />
      </marker>
      <marker id="vc-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
      </marker>
    </defs>

    <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
    <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- parallelogram of u and v: its area previews the determinant of lesson 2 -->
    {#if !collapsed}
      <polygon
        points="{O.x},{O.y} {px(u).x},{px(u).y} {px(lincomb([{ c: 1, v: u }, { c: 1, v: v }])).x},{px(lincomb([{ c: 1, v: u }, { c: 1, v: v }])).y} {px(v).x},{px(v).y}"
        fill={ACCENT}
        fill-opacity="0.05"
        stroke={AXIS}
        stroke-dasharray="3 4"
      />
    {:else}
      <!-- span collapsed to a line -->
      <line
        x1={px({ x: 10 * u.x, y: 10 * u.y }).x}
        y1={px({ x: 10 * u.x, y: 10 * u.y }).y}
        x2={px({ x: -10 * u.x, y: -10 * u.y }).x}
        y2={px({ x: -10 * u.x, y: -10 * u.y }).y}
        stroke={MUTED}
        stroke-width="10"
        opacity="0.15"
      />
    {/if}

    <!-- ghost arrows: αu from the origin, then βv tip-to-tail -->
    <line x1={O.x} y1={O.y} x2={px(ghost).x} y2={px(ghost).y} stroke={POS} stroke-width="2" opacity="0.4" stroke-dasharray="6 4" marker-end="url(#vc-pos)" />
    <line x1={px(ghost).x} y1={px(ghost).y} x2={px(w).x} y2={px(w).y} stroke={NEG} stroke-width="2" opacity="0.4" stroke-dasharray="6 4" marker-end="url(#vc-neg)" />

    <!-- result w = αu + βv -->
    <line x1={O.x} y1={O.y} x2={px(w).x} y2={px(w).y} stroke={ACCENT} stroke-width="3.5" marker-end="url(#vc-acc)" />
    <text x={px(w).x + 10} y={px(w).y - 8} font-size="15" font-weight="700" fill={ACCENT}>w</text>

    <!-- target star -->
    <polygon
      points={starPath(px(target).x, px(target).y, 13)}
      fill={hit ? SUCCESS : 'none'}
      stroke={hit ? SUCCESS : WARN}
      stroke-width="2"
    />

    <!-- basis vectors, draggable by the tip -->
    <line x1={O.x} y1={O.y} x2={px(u).x} y2={px(u).y} stroke={POS} stroke-width="3" marker-end="url(#vc-pos)" />
    <line x1={O.x} y1={O.y} x2={px(v).x} y2={px(v).y} stroke={NEG} stroke-width="3" marker-end="url(#vc-neg)" />
    <text x={px(u).x + 10} y={px(u).y + 4} font-size="14" font-weight="700" fill={POS}>u</text>
    <text x={px(v).x + 10} y={px(v).y + 4} font-size="14" font-weight="700" fill={NEG}>v</text>
    {#each vecs as p, i}
      <circle
        cx={px(p).x}
        cy={px(p).y}
        r={dragIndex === i ? 12 : 9}
        fill={i === 0 ? POS : NEG}
        fill-opacity="0.25"
        stroke={i === 0 ? POS : NEG}
        stroke-width="2"
        style="cursor: {dragIndex === i ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index={i}
      />
    {/each}
  </svg>

  <p class="text-xs text-muted">
    Arrastra las puntas de <strong style="color:{POS}">u</strong> y <strong style="color:{NEG}">v</strong>, y mezcla con los deslizadores hasta que
    <strong style="color:{ACCENT}">w</strong> alcance la estrella.
  </p>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <label class="block text-sm font-medium text-ink">
      α = {alpha.toFixed(2)}
      <input type="range" value={alpha} oninput={(e) => alphaT.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="-3" max="3" step="0.05" class="mt-1 w-full accent-interactive" />
    </label>
    <label class="block text-sm font-medium text-ink">
      β = {beta.toFixed(2)}
      <input type="range" value={beta} oninput={(e) => betaT.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="-3" max="3" step="0.05" class="mt-1 w-full accent-interactive" />
    </label>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm text-ink">
    <span>w = ({w.x.toFixed(2)}, {w.y.toFixed(2)})</span>
    <span class="text-muted">· área del paralelogramo: {area.toFixed(2)}</span>
    <Celebrate active={hit} label="¡Alcanzaste el objetivo!" />
    {#if unreachable}
      <span class="font-medium" style="color:{POS}">Con u y v paralelos la estrella queda fuera del span: no hay solución.</span>
    {/if}
    {#if outOfRange}
      <span class="font-medium" style="color:{WARN}">La solución exacta (α = {outOfRange.a.toFixed(1)}, β = {outOfRange.b.toFixed(1)}) se sale del rango de los deslizadores: alarga u o v, o pide otro objetivo.</span>
    {/if}
    <span class="ml-auto flex flex-wrap gap-2">
      <button onclick={newTarget} class="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper-raised">Nuevo objetivo</button>
      <button onclick={makeParallel} class="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper-raised">Hazlos paralelos</button>
      <button onclick={solve} class="rounded-md px-4 py-1.5 text-sm font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color: {ACCENT}">Resolver</button>
    </span>
  </div>
</div>

