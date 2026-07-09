<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { draggablePoints } from '../../lib/svm/drag';
  import type { Domain } from '../../lib/svm/geometry';
  import { POS, NEG, ACCENT, AXIS, MUTED, WARN, SUCCESS } from '../../lib/svm/colors';
  import { norm, sub, type V2 } from '../../lib/la/vec2';
  import { WORDS, rankByVector, analogy } from '../../lib/la/embed';

  // A toy 2D embedding space. Drag the query arrow: the ranking updates live by
  // cosine similarity — semantic search in miniature. The analogy preset lands
  // exactly on "reina" because rey − hombre + mujer forms a perfect
  // parallelogram in this space.

  let query = $state<V2[]>([{ x: 0.7, y: 0.5 }]);
  let mode = $state<'cos' | 'dist'>('cos');
  let analogyOn = $state(false);

  const dom: Domain = { xMin: -1.25, xMax: 1.35, yMin: -0.55, yMax: 1.3 };
  const width = 560;
  const height = 430;
  const pad = 30;
  const xScale = scaleLinear().domain([dom.xMin, dom.xMax]).range([pad, width - pad]);
  const yScale = scaleLinear().domain([dom.yMin, dom.yMax]).range([height - pad, pad]);

  const CLUSTER: Record<string, string> = {
    gato: POS, perro: POS, pez: POS,
    manzana: WARN, naranja: WARN, uva: WARN,
    hombre: NEG, mujer: NEG, rey: NEG, reina: NEG, castillo: NEG,
  };

  let q = $derived(query[0]);
  let ranked = $derived(
    mode === 'cos'
      ? rankByVector(q).map((r) => ({ word: r.word, val: r.cos }))
      : WORDS.map((e) => ({ word: e.word, val: norm(sub(q, e.v)) })).sort((a, b) => a.val - b.val),
  );
  let maxDist = $derived(Math.max(...ranked.map((r) => r.val), 1e-9));
  let top3 = $derived(new Set(ranked.slice(0, 3).map((r) => r.word)));

  function barWidth(val: number): number {
    return mode === 'cos' ? Math.max(0, ((val + 1) / 2) * 100) : Math.max(2, (1 - val / maxDist) * 100);
  }

  function preset(p: 'mascota' | 'fruta' | 'analogia') {
    analogyOn = p === 'analogia';
    if (p === 'mascota') query[0] = { x: 0.95, y: 0.35 };
    else if (p === 'fruta') query[0] = { x: 0.25, y: 0.95 };
    else query[0] = analogy('rey', 'hombre', 'mujer').target;
  }

  let dragIndex = $state(-1);
  let dragCfg = $derived({
    points: query,
    dom,
    width,
    height,
    xScale,
    yScale,
    onIndexChange: (i: number) => {
      dragIndex = i;
      if (i >= 0) analogyOn = false;
    },
  });

  const O = { x: xScale(0), y: yScale(0) };
  const px = (p: V2) => ({ x: xScale(p.x), y: yScale(p.y) });
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-[3fr,2fr]">
    <svg
      use:draggablePoints={dragCfg}
      viewBox="0 0 {width} {height}"
      preserveAspectRatio="xMidYMid meet"
      class="w-full touch-none select-none animate-fade-up"
    >
      <defs>
        <marker id="cw-acc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={ACCENT} />
        </marker>
      </defs>

      <line x1={pad} y1={O.y} x2={width - pad} y2={O.y} stroke={AXIS} stroke-width="1.5" />
      <line x1={O.x} y1={pad} x2={O.x} y2={height - pad} stroke={AXIS} stroke-width="1.5" />
      <circle cx={O.x} cy={O.y} r={Math.abs(xScale(1) - xScale(0))} fill="none" stroke={AXIS} stroke-dasharray="3 5" opacity="0.6" />

      <!-- rays to the top-3 (cosine cares about direction, not position) -->
      {#each WORDS as e (e.word)}
        {#if top3.has(e.word)}
          <line x1={O.x} y1={O.y} x2={px(e.v).x} y2={px(e.v).y} stroke={ACCENT} stroke-width="1" opacity="0.35" />
        {/if}
      {/each}

      <!-- words -->
      {#each WORDS as e (e.word)}
        <circle cx={px(e.v).x} cy={px(e.v).y} r={top3.has(e.word) ? 7 : 5} fill={CLUSTER[e.word]} stroke={top3.has(e.word) ? ACCENT : 'none'} stroke-width="2.5" />
        <text x={px(e.v).x + 8} y={px(e.v).y - 7} font-size="12" font-weight={top3.has(e.word) ? '700' : '500'} fill={top3.has(e.word) ? ACCENT : MUTED}>{e.word}</text>
      {/each}

      <!-- query arrow -->
      <line x1={O.x} y1={O.y} x2={px(q).x} y2={px(q).y} stroke={ACCENT} stroke-width="3.5" marker-end="url(#cw-acc)" />
      <circle
        cx={px(q).x}
        cy={px(q).y}
        r={dragIndex === 0 ? 13 : 10}
        fill={ACCENT}
        fill-opacity="0.2"
        stroke={ACCENT}
        stroke-width="2"
        style="cursor: {dragIndex === 0 ? 'grabbing' : 'grab'}; touch-action: none;"
        data-drag-index="0"
      />
      <text x={px(q).x + 12} y={px(q).y + 14} font-size="13" font-weight="700" fill={ACCENT}>consulta</text>
    </svg>

    <div class="min-w-0">
      <p class="mb-2 text-sm font-semibold text-ink">
        {mode === 'cos' ? 'Más similares (coseno)' : 'Más cercanas (distancia)'}
      </p>
      <ol class="m-0 list-none space-y-1 p-0">
        {#each ranked as r, i (r.word)}
          <li class="flex items-center gap-2 text-sm">
            <span class="w-4 text-right tabular-nums text-muted">{i + 1}</span>
            <span class="w-20 truncate font-medium" style="color:{top3.has(r.word) ? ACCENT : 'inherit'}">{r.word}</span>
            <span class="h-2.5 flex-1 overflow-hidden rounded-full" style="background-color:{AXIS}40">
              <span class="block h-full rounded-full" style="width:{barWidth(r.val)}%; background-color:{top3.has(r.word) ? ACCENT : MUTED}"></span>
            </span>
            <span class="w-14 text-right tabular-nums text-muted">{r.val.toFixed(3)}</span>
          </li>
        {/each}
      </ol>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-2 text-sm">
    <span class="text-muted">Presets:</span>
    <button onclick={() => preset('mascota')} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">mascota</button>
    <button onclick={() => preset('fruta')} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">fruta</button>
    <button onclick={() => preset('analogia')} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">rey − hombre + mujer</button>
    {#if analogyOn}
      <span class="font-semibold" style="color:{SUCCESS}">→ aterriza exactamente en «reina»</span>
    {/if}
    <label class="ml-auto flex items-center gap-2 font-medium text-ink">
      <input type="checkbox" checked={mode === 'dist'} onchange={(e) => (mode = e.currentTarget.checked ? 'dist' : 'cos')} class="accent-interactive" />
      comparar por distancia euclidiana
    </label>
  </div>
  <p class="text-xs text-muted">
    Con <strong>coseno</strong> solo importa la dirección: alarga la flecha de consulta y el ranking no cambia. Con <strong>distancia</strong>, sí.
  </p>
</div>
