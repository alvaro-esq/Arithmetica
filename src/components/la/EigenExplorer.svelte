<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, SUCCESS, BORDER } from '../../lib/svm/colors';
  import { dot, norm, type V2 } from '../../lib/la/vec2';
  import { type Mat2, mulVec, rotation } from '../../lib/la/mat2';
  import { eigen2 } from '../../lib/la/eigen2';

  // Sweep the unit vector v around the circle and watch Av. When they align,
  // you found an eigenvector: A only stretches that direction (by λ). The
  // rotation preset has NO real eigen-direction — searching and not finding it
  // is the point.

  interface EigPreset {
    id: string;
    label: string;
    A: Mat2;
  }
  const PRESETS: EigPreset[] = [
    { id: 'simetrica', label: 'Simétrica', A: [[2, 1], [1, 2]] },
    { id: 'diagonal', label: 'Diagonal', A: [[2, 0], [0, 0.6]] },
    { id: 'cizalla', label: 'Cizalla', A: [[1, 1], [0, 1]] },
    { id: 'rotacion', label: 'Rotación', A: rotation(Math.PI / 5) },
  ];
  let presetId = $state('simetrica');
  let A = $derived(PRESETS.find((p) => p.id === presetId)!.A);
  let eig = $derived(eigen2(A));

  // The drag handle is free; v is its direction, pinned to the unit circle.
  let handle = $state<V2[]>([{ x: 1.7, y: 0.9 }]);
  let v = $derived.by<V2>(() => {
    const n = norm(handle[0]);
    return n < 1e-9 ? { x: 1, y: 0 } : { x: handle[0].x / n, y: handle[0].y / n };
  });
  let Av = $derived(mulVec(A, v));
  let lambda = $derived(dot(v, Av)); // = λ cuando v es eigenvector (‖v‖ = 1)
  let sinAngle = $derived(v.x * Av.y - v.y * Av.x); // ‖v×Av‖ con ‖v‖=1
  let aligned = $derived(norm(Av) > 0.05 && Math.abs(sinAngle) < 0.03 * Math.max(1, norm(Av)));

  // Remember which real eigen-directions the user has already discovered.
  let found = $state<boolean[]>([false, false]);
  $effect(() => {
    presetId; // reset the hunt when the matrix changes
    found = [false, false];
  });
  let realVectors = $derived(eig.kind === 'complex' ? [] : eig.vectors);
  $effect(() => {
    if (!aligned) return;
    realVectors.forEach((w, i) => {
      if (Math.abs(v.x * w.y - v.y * w.x) < 0.05) found[i] = true;
    });
  });

  const dom: Domain = { xMin: -3, xMax: 3, yMin: -2.5, yMax: 2.5 };
  const width = 600;
  const height = 480;
  const pad = 10;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);
  const O = { x: xScale(0), y: yScale(0) };
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });

  // Image of the unit circle (an ellipse) plus a sparse needle field u → Au.
  let ellipse = $derived.by(() => {
    const pts: string[] = [];
    for (let k = 0; k <= 72; k++) {
      const t = (k * 2 * Math.PI) / 72;
      const q = mulVec(A, { x: Math.cos(t), y: Math.sin(t) });
      pts.push(`${xScale(q.x)},${yScale(q.y)}`);
    }
    return pts.join(' ');
  });
  let needles = $derived.by(() => {
    const out: { from: V2; to: V2 }[] = [];
    for (let k = 0; k < 16; k++) {
      const t = (k * 2 * Math.PI) / 16;
      const u: V2 = { x: Math.cos(t), y: Math.sin(t) };
      const img = mulVec(A, u);
      out.push({ from: u, to: { x: u.x + 0.22 * (img.x - u.x), y: u.y + 0.22 * (img.y - u.y) } });
    }
    return out;
  });

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points: handle,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => (dragIndex = i),
  });
  const R = Math.abs(xScale(1) - xScale(0));
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-muted">Matriz:</span>
    {#each PRESETS as p (p.id)}
      <button
        onclick={() => (presetId = p.id)}
        class="rounded-md border px-3 py-1.5 font-medium hover:bg-paper-raised"
        style="border-color:{presetId === p.id ? ACCENT : BORDER}; color:{presetId === p.id ? ACCENT : 'inherit'}"
      >
        {p.label}
      </button>
    {/each}
    <span class="ml-auto tabular-nums text-ink">
      A = ({A[0][0].toFixed(2)}, {A[0][1].toFixed(2)}; {A[1][0].toFixed(2)}, {A[1][1].toFixed(2)})
    </span>
  </div>

  <svg
    use:draggablePoints={dragCfg}
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    class="w-full touch-none select-none animate-fade-up"
  >
    <defs>
      <marker id="ee-pos" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={POS} />
      </marker>
      <marker id="ee-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
      </marker>
    </defs>

    <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
    <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />

    <!-- unit circle and its image -->
    <circle cx={O.x} cy={O.y} r={R} fill="none" stroke={AXIS} stroke-dasharray="3 5" />
    <polygon points={ellipse} fill={ACCENT} fill-opacity="0.04" stroke={MUTED} stroke-width="1" />
    {#each needles as nd}
      <line x1={px(nd.from).x} y1={px(nd.from).y} x2={px(nd.to).x} y2={px(nd.to).y} stroke={MUTED} stroke-width="1.5" opacity="0.5" />
    {/each}

    <!-- discovered eigen-directions -->
    {#each realVectors as w, i}
      {#if found[i]}
        <line x1={px({ x: 4 * w.x, y: 4 * w.y }).x} y1={px({ x: 4 * w.x, y: 4 * w.y }).y} x2={px({ x: -4 * w.x, y: -4 * w.y }).x} y2={px({ x: -4 * w.x, y: -4 * w.y }).y} stroke={SUCCESS} stroke-width="2" stroke-dasharray="7 5" opacity="0.7" />
      {/if}
    {/each}

    <!-- Av and v -->
    <line x1={O.x} y1={O.y} x2={px(Av).x} y2={px(Av).y} stroke={ACCENT} stroke-width="3.5" marker-end="url(#ee-acc)" />
    <text x={px(Av).x + 10} y={px(Av).y - 8} font-size="14" font-weight="700" fill={ACCENT}>Av</text>
    <line x1={O.x} y1={O.y} x2={px(v).x} y2={px(v).y} stroke={POS} stroke-width="3" marker-end="url(#ee-pos)" />
    <text x={px(v).x + 10} y={px(v).y + 14} font-size="14" font-weight="700" fill={POS}>v</text>
    <circle
      cx={px(v).x}
      cy={px(v).y}
      r={dragIndex === 0 ? 13 : 10}
      fill={aligned ? SUCCESS : POS}
      fill-opacity="0.3"
      stroke={aligned ? SUCCESS : POS}
      stroke-width="2.5"
      style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
      data-drag-index="0"
    />
  </svg>

  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
    <span class="text-xs text-muted">Arrastra <strong style="color:{POS}">v</strong> por el círculo hasta que <strong style="color:{ACCENT}">Av</strong> quede en su misma recta.</span>
    {#if aligned}
      <span class="font-semibold" style="color:{SUCCESS}">¡Eigenvector! λ ≈ {lambda.toFixed(2)}{lambda < 0 ? ' (voltea el sentido)' : ''}</span>
    {/if}
    <span class="ml-auto font-medium" style="color:{MUTED}">
      {#if eig.kind === 'real'}
        direcciones encontradas: {found.filter(Boolean).length} de {realVectors.length} · λ = {eig.values[0].toFixed(2)}, {eig.values[1].toFixed(2)}
      {:else if eig.kind === 'repeated'}
        λ = {eig.value.toFixed(2)} repetido — {realVectors.length === 1 ? 'solo UNA dirección sobrevive' : 'toda dirección es eigenvector'}
      {:else}
        sin eigenvectores reales: cada aplicación gira {((eig.spiralAngle * 180) / Math.PI).toFixed(0)}° y escala ×{eig.spiralScale.toFixed(2)}
      {/if}
    </span>
  </div>
</div>
