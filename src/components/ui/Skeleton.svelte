<script lang="ts">
  // A shimmer placeholder sized to match a visualization, shown until its island
  // hydrates. Perceived speed (Doherty): the page never flashes blank, and
  // reserving the box avoids layout shift (low CLS). The shimmer is decorative —
  // hidden from assistive tech and collapsed under prefers-reduced-motion (the
  // global rule freezes the animation; the static box still holds space).

  let { ratio = '3 / 2', label = 'Cargando visualización…' }: { ratio?: string; label?: string } =
    $props();
</script>

<div
  class="not-content surface relative w-full overflow-hidden"
  style="aspect-ratio: {ratio}"
  role="status"
  aria-label={label}
>
  <div
    class="absolute inset-0 animate-shimmer"
    style="background: linear-gradient(90deg, transparent, rgba(31,29,27,0.05), transparent); transform: translateX(-100%)"
  ></div>
</div>
