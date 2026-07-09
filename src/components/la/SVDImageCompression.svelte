<script lang="ts">
  import { ACCENT, AXIS, MUTED, SUCCESS } from '../../lib/svm/colors';
  import { clamp } from '../../lib/svm/geometry';
  import { decodePortrait, PORTRAIT_W, PORTRAIT_H } from '../../lib/la/portrait';
  import { svd, rankK, relErrFromS } from '../../lib/la/svd';

  // A real photograph (Einstein, 1921 — public domain) as a 64×64 matrix,
  // decomposed once with SVD. The slider keeps only the top-k singular values:
  // a handful of directions carry almost the whole image.

  const A = decodePortrait();
  const S = svd(A); // ~20 ms, computed once
  const RANK = Math.min(PORTRAIT_W, PORTRAIT_H);

  let k = $state(5);
  let recon = $derived(rankK(S, k));
  let relErr = $derived(relErrFromS(S.S, k));
  let storagePct = $derived((100 * k * (PORTRAIT_W + PORTRAIT_H + 1)) / (PORTRAIT_W * PORTRAIT_H));

  let origCanvas = $state<HTMLCanvasElement | null>(null);
  let reconCanvas = $state<HTMLCanvasElement | null>(null);
  function paint(canvas: HTMLCanvasElement | null, M: number[][]) {
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(PORTRAIT_W, PORTRAIT_H);
    for (let i = 0; i < PORTRAIT_H; i++) {
      for (let j = 0; j < PORTRAIT_W; j++) {
        const v = clamp(Math.round(M[i][j]), 0, 255);
        const o = 4 * (i * PORTRAIT_W + j);
        img.data[o] = v;
        img.data[o + 1] = v;
        img.data[o + 2] = v;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  $effect(() => paint(origCanvas, A));
  $effect(() => paint(reconCanvas, recon));

  // Singular-value spectrum on a log scale (σ₁ dwarfs the rest linearly).
  const specW = 600;
  const specH = 120;
  const logMax = Math.log10(S.S[0] + 1);
  const barH = (s: number) => ((specH - 24) * Math.log10(s + 1)) / logMax;
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <figure class="m-0 text-center">
      <canvas bind:this={origCanvas} width={PORTRAIT_W} height={PORTRAIT_H} class="mx-auto w-full max-w-64 rounded border border-line" style="image-rendering: pixelated;"></canvas>
      <figcaption class="mt-1 text-xs text-muted">original — {PORTRAIT_W}×{PORTRAIT_H} = {PORTRAIT_W * PORTRAIT_H} números</figcaption>
    </figure>
    <figure class="m-0 text-center">
      <canvas bind:this={reconCanvas} width={PORTRAIT_W} height={PORTRAIT_H} class="mx-auto w-full max-w-64 rounded border-2" style="image-rendering: pixelated; border-color:{ACCENT}"></canvas>
      <figcaption class="mt-1 text-xs font-medium" style="color:{ACCENT}">rango {k} — {k * (PORTRAIT_W + PORTRAIT_H + 1)} números ({storagePct.toFixed(0)}%)</figcaption>
    </figure>
  </div>

  <label class="block text-sm font-medium text-ink">
    k = {k} {k === 1 ? 'valor singular' : 'valores singulares'}
    <input type="range" bind:value={k} min="1" max={RANK} step="1" class="mt-1 w-full accent-interactive" />
  </label>

  <svg viewBox="0 0 {specW} {specH}" preserveAspectRatio="xMidYMid meet" class="w-full select-none">
    <text x="4" y="12" font-size="11" fill={MUTED}>espectro de valores singulares σᵢ (escala log)</text>
    {#each S.S as s, i}
      <rect
        x={8 + i * ((specW - 16) / RANK)}
        y={specH - 8 - barH(s)}
        width={Math.max(2, (specW - 16) / RANK - 2)}
        height={barH(s)}
        fill={i < k ? ACCENT : AXIS}
      />
    {/each}
  </svg>

  <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
    <span>error relativo: <strong style="color:{relErr < 0.1 ? SUCCESS : ACCENT}">{(100 * relErr).toFixed(1)}%</strong></span>
    <span class="text-muted">A ≈ σ₁u₁v₁ᵀ + σ₂u₂v₂ᵀ + … + σ_ku_kv_kᵀ</span>
    <span class="ml-auto flex gap-2">
      <button onclick={() => (k = 1)} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">k = 1</button>
      <button onclick={() => (k = 5)} class="rounded-md px-3 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft" style="background-color:{ACCENT}">k = 5</button>
      <button onclick={() => (k = 20)} class="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-paper-raised">k = 20</button>
    </span>
  </div>
  <p class="text-xs text-muted">
    Con k = 5 guardas el {((100 * 5 * (PORTRAIT_W + PORTRAIT_H + 1)) / (PORTRAIT_W * PORTRAIT_H)).toFixed(0)}% de los números y la cara ya se reconoce: casi toda la imagen vive en unas pocas direcciones dominantes.
  </p>
</div>
