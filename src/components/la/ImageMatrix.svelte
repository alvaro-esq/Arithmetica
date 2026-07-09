<script lang="ts">
  import { ACCENT, MUTED, INK, PAPER } from '../../lib/svm/colors';
  import { clamp } from '../../lib/svm/geometry';
  import { transpose } from '../../lib/la/matrix';
  import { SMILEY } from '../../lib/la/pixelart';

  // An image IS a matrix: hover any pixel to see its number. Brightness adds a
  // constant to every entry, contrast scales around the midpoint, and transpose
  // is… the transpose. Lesson 5 will compress this same kind of matrix with SVD.

  let brightness = $state(0); // A + c
  let contrast = $state(1); // k(A − 128) + 128
  let transposed = $state(false);
  let hovered = $state<{ i: number; j: number } | null>(null);

  const n = SMILEY.length;
  let img = $derived.by(() => {
    const base = transposed ? transpose(SMILEY) : SMILEY;
    return base.map((row) => row.map((v) => clamp(contrast * (v - 128) + 128 + brightness, 0, 255)));
  });
  let hoveredValue = $derived(hovered ? img[hovered.i][hovered.j] : null);

  const cell = 30;
  const size = n * cell;
  const gray = (v: number) => `rgb(${Math.round(v)}, ${Math.round(v)}, ${Math.round(v)})`;
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-[minmax(0,1fr),220px]">
    <svg
      viewBox="0 0 {size} {size}"
      preserveAspectRatio="xMidYMid meet"
      class="w-full max-w-sm select-none animate-fade-up"
      role="img"
      aria-label="Imagen de 12 por 12 píxeles mostrada como matriz"
      onpointerleave={() => (hovered = null)}
    >
      {#each img as row, i}
        {#each row as v, j}
          <rect
            x={j * cell}
            y={i * cell}
            width={cell}
            height={cell}
            fill={gray(v)}
            stroke={hovered?.i === i && hovered?.j === j ? ACCENT : 'none'}
            stroke-width="2.5"
            onpointerenter={() => (hovered = { i, j })}
          />
          {#if hovered?.i === i && hovered?.j === j}
            <text
              x={j * cell + cell / 2}
              y={i * cell + cell / 2 + 4}
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              fill={v > 128 ? INK : PAPER}
              pointer-events="none"
            >{Math.round(v)}</text>
          {/if}
        {/each}
      {/each}
    </svg>

    <div class="space-y-3 text-sm text-ink">
      <p class="font-medium">
        {#if hovered}
          A<sub>{hovered.i + 1},{hovered.j + 1}</sub> = <strong style="color:{ACCENT}">{Math.round(hoveredValue ?? 0)}</strong>
        {:else}
          <span class="text-muted">Pasa el cursor por un píxel para ver su número.</span>
        {/if}
      </p>
      <label class="block font-medium">
        Brillo: A + {brightness.toFixed(0)}
        <input type="range" bind:value={brightness} min="-100" max="100" step="1" class="mt-1 w-full accent-interactive" />
      </label>
      <label class="block font-medium">
        Contraste: {contrast.toFixed(2)} · (A − 128) + 128
        <input type="range" bind:value={contrast} min="0.2" max="2.5" step="0.05" class="mt-1 w-full accent-interactive" />
      </label>
      <button
        onclick={() => (transposed = !transposed)}
        class="rounded-md px-3 py-1.5 font-medium text-paper shadow-card hover:bg-interactive-soft"
        style="background-color:{ACCENT}"
      >
        {transposed ? 'Deshacer Aᵀ' : 'Transponer (Aᵀ)'}
      </button>
      <p class="text-xs" style="color:{MUTED}">
        Cada píxel es una entrada de una matriz 12×12. Sumar una constante aclara; escalar alrededor de 128 estira el contraste; transponer refleja filas ↔ columnas.
      </p>
    </div>
  </div>
</div>
