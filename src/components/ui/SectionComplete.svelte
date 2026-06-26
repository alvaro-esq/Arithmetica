<script lang="ts">
  import { onMount } from 'svelte';
  import { markComplete, isPresenting } from '../../lib/progress';
  import Celebrate from './Celebrate.svelte';

  // Drop one after each lesson section. When the reader scrolls it past the fold
  // (i.e. they've read the section above), it marks that section complete and
  // fires a one-time subtle celebration. Zero visual footprint until it triggers.
  // Reading-to-complete keeps friction at zero — no "mark done" button to click.

  let { id, label = '¡Sección completada!' }: { id: string; label?: string } = $props();
  let celebrate = $state(false);

  onMount(() => {
    const el = document.getElementById(`sc-${id}`);
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Ignore visibility caused by the deck relocating this node mid-present;
          // only genuine scroll-into-view (presenting === false) counts.
          if (e.isIntersecting && !isPresenting()) {
            if (markComplete(id)) celebrate = true; // first time only
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -20% 0px', threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  });
</script>

<div id="sc-{id}" class="not-content flex justify-end">
  <Celebrate active={celebrate} {label} />
</div>
