<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { lineSegment } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS } from '../../lib/svm/colors';
  import { dot, norm, project, angleBetween, cosineSim, sub, type V2 } from '../../lib/la/vec2';
  import { rightAnglePath } from '../../lib/viz/marks';

  // Drag u and v: the dot product, the angle and the projection ("shadow") of u
  // on v update live. The dashed boundary marks u·v = 0 — cross it and the sign
  // flips, exactly the test an SVM uses to classify.

  let vecs = $state<V2[]>([
    { x: 2.0, y: 1.6 },
    { x: 2.6, y: -0.6 },
  ]);
  const dom: Domain = { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };
  const width = 600;
  const height = 450;
  const pad = 36;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  let u = $derived(vecs[0]);
  let v = $derived(vecs[1]);
  let uv = $derived(dot(u, v));
  let theta = $derived(angleBetween(u, v));
  let cosT = $derived(cosineSim(u, v));
  let proj = $derived(project(u, v));
  let ortho = $derived(Math.abs(cosT) < 0.03);

  // Boundary u·v = 0: the line through the origin perpendicular to v. With
  // v ≈ 0 there is no boundary (lineSegment would divide 0/0 into NaN).
  let boundary = $derived(norm(v) > 1e-9 ? lineSegment(v, 0, 0, dom) : null);
  // Convex polygon for the positive half-plane: boundary endpoints + the domain
  // corners with corner·v > 0, sorted by angle around their centroid.
  function halfPlane(side: 1 | -1, w: V2, seg: [V2, V2]): string {
    const corners: V2[] = [
      { x: dom.xMin, y: dom.yMin },
      { x: dom.xMin, y: dom.yMax },
      { x: dom.xMax, y: dom.yMin },
      { x: dom.xMax, y: dom.yMax },
    ].filter((c) => side * dot(c, w) > 0);
    const pts = [...seg, ...corners];
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    return pts
      .slice()
      .sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))
      .map((p) => `${xScale(p.x)},${yScale(p.y)}`)
      .join(' ');
  }

  function makeOrthogonal() {
    const nu = norm(u);
    if (nu < 1e-9) return;
    const len = Math.max(norm(v), 0.8);
    const perp: V2 = { x: -u.y / nu, y: u.x / nu };
    const sign = dot(perp, v) >= 0 ? 1 : -1; // stay on v's current side
    vecs[1] = { x: sign * len * perp.x, y: sign * len * perp.y };
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
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });

  // Angle arc between u and v (pixel space, y flipped), always the short way.
  let arcPath = $derived.by(() => {
    if (norm(u) < 0.3 || norm(v) < 0.3) return '';
    const r = 34;
    const a0 = Math.atan2(yScale(v.y) - O.y, xScale(v.x) - O.x);
    let d = Math.atan2(yScale(u.y) - O.y, xScale(u.x) - O.x) - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const a1 = a0 + d;
    const sweep = d > 0 ? 1 : 0;
    return `M ${O.x + r * Math.cos(a0)} ${O.y + r * Math.sin(a0)} A ${r} ${r} 0 0 ${sweep} ${O.x + r * Math.cos(a1)} ${O.y + r * Math.sin(a1)}`;
  });

  // Small right-angle square at the projection foot, oriented along v.
  let rightAngle = $derived.by(() => {
    const rest = sub(u, proj.p);
    if (norm(v) < 0.3 || norm(rest) < 0.25) return '';
    const s = 11;
    const a = { x: (xScale(v.x) - O.x) / norm({ x: xScale(v.x) - O.x, y: yScale(v.y) - O.y }), y: (yScale(v.y) - O.y) / norm({ x: xScale(v.x) - O.x, y: yScale(v.y) - O.y }) };
    const bdir = { x: (px(u).x - px(proj.p).x), y: (px(u).y - px(proj.p).y) };
    const nb = norm(bdir);
    const b = { x: bdir.x / nb, y: bdir.y / nb };
    const f = px(proj.p);
    const back = proj.coef >= 0 ? -1 : 1; // square opens toward the origin side
    return rightAnglePath(f, a, b, s, back);
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
      <marker id="dp-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={POS} />
      </marker>
      <marker id="dp-neg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={NEG} />
      </marker>
    </defs>

    <!-- half-planes by the sign of (·)·v -->
    {#if boundary}
      <polygon points={halfPlane(1, v, boundary)} fill={POS} fill-opacity="0.045" />
      <polygon points={halfPlane(-1, v, boundary)} fill={NEG} fill-opacity="0.045" />
      <line x1={xScale(boundary[0].x)} y1={yScale(boundary[0].y)} x2={xScale(boundary[1].x)} y2={yScale(boundary[1].y)} stroke={MUTED} stroke-width="1.5" stroke-dasharray="6 5" />
      <text x={xScale(boundary[1].x) * 0.92 + O.x * 0.08} y={yScale(boundary[1].y) * 0.92 + O.y * 0.08 - 6} font-size="11" fill={MUTED}>u·v = 0</text>
    {/if}

    <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
    <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- angle arc -->
    {#if arcPath}
      <path d={arcPath} fill="none" stroke={ortho ? SUCCESS : MUTED} stroke-width="2" />
    {/if}

    <!-- projection: shadow of u along v -->
    <line x1={px(u).x} y1={px(u).y} x2={px(proj.p).x} y2={px(proj.p).y} stroke={MUTED} stroke-width="1.5" stroke-dasharray="4 4" />
    <line x1={O.x} y1={O.y} x2={px(proj.p).x} y2={px(proj.p).y} stroke={ACCENT} stroke-width="5" opacity="0.85" />
    {#if rightAngle}
      <path d={rightAngle} fill="none" stroke={ortho ? SUCCESS : MUTED} stroke-width="1.5" />
    {/if}

    <!-- vectors -->
    <line x1={O.x} y1={O.y} x2={px(u).x} y2={px(u).y} stroke={POS} stroke-width="3" marker-end="url(#dp-pos)" />
    <line x1={O.x} y1={O.y} x2={px(v).x} y2={px(v).y} stroke={NEG} stroke-width="3" marker-end="url(#dp-neg)" />
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
    Arrastra <strong style="color:{POS}">u</strong> y <strong style="color:{NEG}">v</strong>. La barra azul es la <strong>proyección</strong> de u sobre v — su "sombra".
  </p>

  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
    <span>u·v = <strong style="color:{uv >= 0 ? POS : NEG}">{uv.toFixed(2)}</strong></span>
    <span>θ = {((theta * 180) / Math.PI).toFixed(0)}°</span>
    <span>cos θ = <strong style="color:{ACCENT}">{cosT.toFixed(3)}</strong></span>
    <span>proy = {proj.coef.toFixed(2)} · v</span>
    {#if ortho}
      <span class="font-semibold" style="color:{SUCCESS}">⊥ ortogonales: la sombra desaparece</span>
    {/if}
    <button onclick={makeOrthogonal} class="ml-auto rounded-md px-4 py-1.5 text-sm font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color: {ACCENT}">
      Hazlos ortogonales
    </button>
  </div>
</div>
