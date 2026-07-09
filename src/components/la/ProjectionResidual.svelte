<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { clamp } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, WARN } from '../../lib/svm/colors';
  import { dot, norm, sub, scale, project, type V2 } from '../../lib/la/vec2';
  import { rightAnglePath } from '../../lib/viz/marks';

  // Least squares in miniature: slide x̂ along the span of a, watch the residual
  // r = b − x̂a. The residual is shortest exactly when it is PERPENDICULAR to a —
  // aᵀr = 0 is the normal equation.

  let vecs = $state<V2[]>([
    { x: 2.6, y: 0.9 }, // a (draggable)
    { x: 0.6, y: 2.3 }, // b (draggable)
  ]);
  const dom: Domain = { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };
  const width = 600;
  const height = 450;
  const pad = 36;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  const xhatT = new Tween(0.3, { duration: 650, easing: cubicOut });
  let xhat = $derived(xhatT.current);

  let a = $derived(vecs[0]);
  let b = $derived(vecs[1]);
  let p = $derived(scale(a, xhat)); // candidate x̂·a on the span
  let r = $derived(sub(b, p)); // residual
  let ar = $derived(dot(a, r));
  let optimum = $derived(project(b, a).coef);
  let ortho = $derived(Math.abs(ar) < 0.04 * Math.max(1, norm(a) * norm(r)));

  function projectNow() {
    xhatT.set(clamp(optimum, -2.5, 2.5));
  }

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points: vecs,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });

  const O = { x: xScale(0), y: yScale(0) };
  const px = (q: V2) => ({ x: xScale(q.x), y: yScale(q.y) });

  // Right-angle marker at p between the span direction and the residual.
  let rightAngle = $derived.by(() => {
    if (!ortho || norm(a) < 0.3 || norm(r) < 0.25) return '';
    const s = 11;
    const f = px(p);
    const na = Math.hypot(xScale(a.x) - O.x, yScale(a.y) - O.y);
    const ua = { x: (xScale(a.x) - O.x) / na, y: (yScale(a.y) - O.y) / na };
    const rbx = px(b).x - f.x;
    const rby = px(b).y - f.y;
    const nr = Math.hypot(rbx, rby);
    const ur = { x: rbx / nr, y: rby / nr };
    const back = xhat <= optimum ? 1 : -1;
    return rightAnglePath(f, ua, ur, s, back);
  });
</script>

<div class="space-y-4">
  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none aspect-[4/3] animate-fade-up"
  >
    <defs>
      <marker id="pr-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={POS} />
      </marker>
      <marker id="pr-neg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={NEG} />
      </marker>
    </defs>

    <!-- span of a -->
    <line
      x1={px({ x: 6 * a.x, y: 6 * a.y }).x}
      y1={px({ x: 6 * a.x, y: 6 * a.y }).y}
      x2={px({ x: -6 * a.x, y: -6 * a.y }).x}
      y2={px({ x: -6 * a.x, y: -6 * a.y }).y}
      stroke={POS}
      stroke-width="9"
      opacity="0.12"
    />

    <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
    <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- residual -->
    <line x1={px(p).x} y1={px(p).y} x2={px(b).x} y2={px(b).y} stroke={WARN} stroke-width="2.5" stroke-dasharray="6 4" />
    <text x={(px(p).x + px(b).x) / 2 + 8} y={(px(p).y + px(b).y) / 2} font-size="13" font-weight="700" fill={WARN}>r</text>
    {#if rightAngle}
      <path d={rightAngle} fill="none" stroke={SUCCESS} stroke-width="1.5" />
    {/if}

    <!-- candidate x̂·a -->
    <circle cx={px(p).x} cy={px(p).y} r="7" fill={ortho ? SUCCESS : ACCENT} />
    <text x={px(p).x + 10} y={px(p).y + 18} font-size="12" font-weight="700" fill={ortho ? SUCCESS : ACCENT}>x̂·a</text>

    <!-- vectors -->
    <line x1={O.x} y1={O.y} x2={px(a).x} y2={px(a).y} stroke={POS} stroke-width="3" marker-end="url(#pr-pos)" />
    <line x1={O.x} y1={O.y} x2={px(b).x} y2={px(b).y} stroke={NEG} stroke-width="3" marker-end="url(#pr-neg)" />
    <text x={px(a).x + 10} y={px(a).y + 4} font-size="14" font-weight="700" fill={POS}>a</text>
    <text x={px(b).x + 10} y={px(b).y - 8} font-size="14" font-weight="700" fill={NEG}>b</text>
    {#each vecs as q, i}
      <circle
        cx={px(q).x}
        cy={px(q).y}
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
    Arrastra <strong style="color:{NEG}">b</strong> (y también <strong style="color:{POS}">a</strong>) y desliza x̂. El objetivo: hacer el residuo
    <strong style="color:{WARN}">r</strong> lo más corto posible.
  </p>

  <label class="block text-sm font-medium text-ink">
    x̂ = {xhat.toFixed(2)}
    <input type="range" value={xhat} oninput={(e) => xhatT.set(e.currentTarget.valueAsNumber, { duration: 0 })} min="-2.5" max="2.5" step="0.01" class="mt-1 w-full accent-interactive" />
  </label>

  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
    <span>‖r‖ = <strong style="color:{WARN}">{norm(r).toFixed(3)}</strong></span>
    <span>aᵀr = <strong style="color:{ortho ? SUCCESS : ACCENT}">{ar.toFixed(3)}</strong></span>
    {#if ortho}
      <span class="font-semibold" style="color:{SUCCESS}">residuo ⊥ a: este es el mínimo</span>
    {:else}
      <span style="color:{MUTED}">óptimo: x̂ = aᵀb / aᵀa = {optimum.toFixed(2)}</span>
    {/if}
    <button onclick={projectNow} class="ml-auto rounded-md px-4 py-1.5 text-sm font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color:{ACCENT}">
      Proyectar
    </button>
  </div>
</div>
