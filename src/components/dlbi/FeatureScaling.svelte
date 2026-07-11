<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { stepLoop } from '../../lib/viz/stepper';
  import { RAW, NORM, gdPath, stepsToConverge, contourRadii } from '../../lib/dlbi/scaling';
  import { ACCENT, AXIS, PAPER, SUCCESS, MUTED } from '../../lib/svm/colors';

  // Por qué se normalizan las variables: con escalas dispares (ingresos en
  // quetzales vs edad en años) la superficie de pérdida es un valle alargado y
  // el descenso de gradiente zigzaguea; tras normalizar, el valle es redondo y
  // el mismo algoritmo entra directo al mínimo.

  let { lr = 0.078, steps = 80 }: { lr?: number; steps?: number } = $props();

  let mode = $state<'raw' | 'norm'>('raw');
  let shown = $state(0);
  let running = $state(false);

  let loss = $derived(mode === 'raw' ? RAW : NORM);
  const start = { x: -1.8, y: 0.9 };
  let path = $derived(gdPath(loss, start, lr, steps));

  const TOL = 1e-2;
  const stepsRaw = stepsToConverge(RAW, start, lr, TOL);
  const stepsNorm = stepsToConverge(NORM, start, lr, TOL);

  const width = 460;
  const height = 460;
  const pad = 30;
  const x = scaleLinear().domain([-2.4, 2.4]).range([pad, width - pad]);
  const y = scaleLinear().domain([-2.4, 2.4]).range([height - pad, pad]);
  const LEVELS = [0.15, 0.6, 1.35, 2.4];

  const poly = () =>
    path.slice(0, Math.max(1, shown)).map((p) => `${x(p.x)},${y(p.y)}`).join(' ');

  // Animación client-only del descenso, guardada por `running`.
  $effect(() => {
    if (!running) return;
    return stepLoop({
      interval: 50,
      total: path.length,
      step: () => (shown += 1),
      onDone: () => (running = false),
    });
  });

  function run() {
    shown = 0;
    running = true;
  }
  function setMode(m: 'raw' | 'norm') {
    mode = m;
    running = false;
    shown = 0;
  }
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" class="w-full select-none aspect-square">
    <!-- ejes -->
    <line x1={pad} y1={y(0)} x2={width - pad} y2={y(0)} stroke={AXIS} stroke-width="1" />
    <line x1={x(0)} y1={pad} x2={x(0)} y2={height - pad} stroke={AXIS} stroke-width="1" />

    <!-- curvas de nivel de la pérdida -->
    {#each LEVELS as level}
      {@const r = contourRadii(loss, level)}
      <ellipse cx={x(0)} cy={y(0)} rx={x(r.rx) - x(0)} ry={y(0) - y(r.ry)} fill="none" stroke={MUTED} stroke-width="1.2" opacity="0.6" />
    {/each}

    <!-- mínimo -->
    <circle cx={x(0)} cy={y(0)} r="7" fill="none" stroke={SUCCESS} stroke-width="2" />
    <circle cx={x(0)} cy={y(0)} r="2" fill={SUCCESS} />

    <!-- trayectoria del descenso -->
    <polyline points={poly()} fill="none" stroke={ACCENT} stroke-width="2" />
    {#each path.slice(0, shown) as p, i}
      <circle cx={x(p.x)} cy={y(p.y)} r="2.5" fill={ACCENT} opacity={0.3 + 0.7 * (i / Math.max(1, shown))} />
    {/each}

    <!-- punto inicial -->
    <circle cx={x(start.x)} cy={y(start.y)} r="6" fill={ACCENT} stroke={PAPER} stroke-width="2" />

    <!-- El eje y es la dirección rígida (b = 25): corresponde a la variable de
         gran escala, los ingresos; la edad (en años) es la dirección plana. -->
    <text x={width - pad} y={y(0) - 8} text-anchor="end" font-size="11" fill={MUTED}>peso de "edad"</text>
    <text x={x(0) + 8} y={pad + 12} font-size="11" fill={MUTED}>peso de "ingresos"</text>
  </svg>

  <div class="flex flex-wrap items-center gap-3">
    <span class="inline-flex overflow-hidden rounded-md border text-sm" style="border-color: {AXIS}">
      <button class="px-3 py-1.5" style={mode === 'raw' ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => setMode('raw')}>Datos crudos</button>
      <button class="px-3 py-1.5" style={mode === 'norm' ? `background-color:${ACCENT};color:${PAPER}` : `color:${MUTED}`} onclick={() => setMode('norm')}>Datos normalizados</button>
    </span>
    <button class="rounded-md px-3 py-1.5 text-sm font-medium text-paper" style="background-color: {ACCENT}" onclick={run}>Descender ▸</button>
  </div>

  <div class="flex flex-wrap items-center gap-4 text-sm text-ink">
    <span>Paso {Math.min(shown, path.length - 1)} / {path.length - 1}</span>
    <span>
      Convergencia (misma tasa de aprendizaje): crudos <strong>{Number.isFinite(stepsRaw) ? `${stepsRaw} pasos` : 'nunca'}</strong> ·
      normalizados <strong style="color: {SUCCESS}">{Number.isFinite(stepsNorm) ? `${stepsNorm} pasos` : 'nunca'}</strong>
    </span>
  </div>

  <p class="text-xs text-muted">
    Las elipses son curvas de nivel de la pérdida: mismos valores de pérdida, distinta forma del valle. Con datos crudos el eje "ingresos"
    (la variable de gran escala) tiene una curvatura 25 veces mayor y el descenso rebota de lado a lado; converge en {Number.isFinite(stepsRaw) ? stepsRaw : '∞'} pasos
    frente a {Number.isFinite(stepsNorm) ? stepsNorm : '∞'} con datos normalizados.
  </p>
</div>
