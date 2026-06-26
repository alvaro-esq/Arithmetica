<script lang="ts">
  import { SUCCESS } from '../../lib/svm/colors';

  // A subtle, academic micro-celebration (Peak-End Rule): when `active` flips
  // true, a success pill pops in once with a drawn checkmark. Honors
  // prefers-reduced-motion (CSS in global.css collapses the animation) and
  // announces the milestone to screen readers via aria-live.

  let { active = false, label = '¡Logrado!' }: { active?: boolean; label?: string } = $props();

  // Show only on the rising edge, and auto-hide so it stays a "peak", not chrome.
  let shown = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let prev = false;

  $effect(() => {
    if (active && !prev) {
      shown = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => (shown = false), 2600);
    }
    prev = active;
  });
  $effect(() => () => timer && clearTimeout(timer));
</script>

<div class="pointer-events-none" aria-live="polite" role="status">
  {#if shown}
    <span
      class="inline-flex animate-pop items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-paper shadow-card"
      style="background-color: {SUCCESS}"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          class="animate-check-draw"
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray="24"
        />
      </svg>
      {label}
    </span>
  {/if}
</div>
