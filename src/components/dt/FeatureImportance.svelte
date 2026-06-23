<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { mulberry32 } from '../../lib/svm/prng';
  import { ACCENT, NEG, AXIS } from '../../lib/svm/colors';
  import { vectorImportance, type VSample } from '../../lib/dt/importance';

  // Mean decrease in impurity per feature, computed over a genuine 3-feature
  // dataset: a strong feature, a moderate one, and a pure-noise column that carries
  // no information about the label. The forest's importance for the noise feature
  // is *measured* (not faked) and converges toward ~0 as more trees average out the
  // spurious splits it occasionally wins by chance.
  let nTrees = $state(1);

  // 3 features: f0 strong, f1 moderate, f2 noise (independent of the label).
  const data: VSample[] = (() => {
    const rng = mulberry32(9);
    const out: VSample[] = [];
    for (let i = 0; i < 150; i++) {
      const f0 = (rng() - 0.5) * 6;
      const f1 = (rng() - 0.5) * 6;
      const f2 = (rng() - 0.5) * 6; // noise: never enters the label rule
      const score = 0.8 * f0 + 0.35 * f1 + (rng() - 0.5) * 1.2;
      out.push({ features: [f0, f1, f2], label: score > 0 ? 1 : 0 });
    }
    return out;
  })();

  const names = ['fuerte', 'moderada', 'ruido'];
  const importance = $derived(
    vectorImportance(data, nTrees, { maxDepth: 6, minSamples: 4, nClasses: 2 }, 7),
  );

  // Animated bar widths — one Tween per bar, read through $derived like the SVM
  // components (a const array of Tweens trips the SSR renderer).
  const t0 = new Tween(0, { duration: 400, easing: cubicOut });
  const t1 = new Tween(0, { duration: 400, easing: cubicOut });
  const t2 = new Tween(0, { duration: 400, easing: cubicOut });
  $effect(() => {
    t0.set(importance[0]);
    t1.set(importance[1]);
    t2.set(importance[2]);
  });
  const animated = $derived([t0.current, t1.current, t2.current]);

  const W = 520;
  const H = 200;
  const padL = 110;
  const padR = 30;
  const wScale = scaleLinear().domain([0, 1]).range([0, W - padL - padR]);
  const barH = 34;
  const gap = 18;
</script>

<div class="space-y-4">
  <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" class="w-full aspect-[26/10]">
    {#each names as name, i}
      {@const y = 22 + i * (barH + gap)}
      {@const w = wScale(animated[i])}
      <text x={padL - 10} y={y + barH / 2 + 4} text-anchor="end" font-size="13" fill={NEG}>{name}</text>
      <rect x={padL} y={y} width={W - padL - padR} height={barH} fill={AXIS} fill-opacity="0.4" rx="4" />
      <rect x={padL} y={y} width={w} height={barH} fill={ACCENT} rx="4" />
      <text
        x={padL + w + 8}
        y={y + barH / 2 + 4}
        font-size="13"
        font-weight="600"
        fill={NEG}
      >
        {(animated[i] * 100).toFixed(0)}%
      </text>
    {/each}
  </svg>

  <label class="block text-sm font-medium text-ink">
    Número de árboles: {nTrees}
    <input type="range" bind:value={nTrees} min="1" max="60" step="1" class="mt-1 w-full accent-interactive" />
  </label>
  <p class="text-xs text-[#666]">
    Cuantos más árboles, más estable es la estimación. La característica de ruido se mantiene
    cerca de cero porque casi nunca reduce la impureza al dividir.
  </p>
</div>
