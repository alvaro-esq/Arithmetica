<script lang="ts">
  import { onMount } from 'svelte';
  import { SUCCESS, ACCENT } from '../../lib/svm/colors';
  import { progress } from '../../lib/progress';

  // A lesson entry point on the home page. A bordered card (Gestalt: common
  // region) with the lesson's completion ring (Goal-Gradient). `featured` gets
  // the primary visual weight (Von Restorff) so the eye lands on where to start.

  let {
    href,
    title,
    description,
    sectionIds = [],
    featured = false,
  }: {
    href: string;
    title: string;
    description: string;
    sectionIds?: string[];
    featured?: boolean;
  } = $props();

  let pct = $state(0);
  onMount(() => {
    pct = sectionIds.length ? progress(sectionIds) : 0;
  });

  const done = $derived(pct >= 0.999 && sectionIds.length > 0);
  // ring geometry
  const R = 13;
  const C = 2 * Math.PI * R;
</script>

<a
  {href}
  class="surface group not-content flex items-start gap-4 p-4 no-underline transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
  style={featured ? `border-color: ${ACCENT}; border-width: 1.5px` : ''}
>
  {#if sectionIds.length}
    <svg width="34" height="34" viewBox="0 0 34 34" class="mt-0.5 shrink-0" aria-hidden="true">
      <circle cx="17" cy="17" r={R} fill="none" stroke="var(--c-line)" stroke-width="3" />
      <circle
        cx="17"
        cy="17"
        r={R}
        fill="none"
        stroke={done ? SUCCESS : ACCENT}
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray={C}
        stroke-dashoffset={C * (1 - pct)}
        transform="rotate(-90 17 17)"
        style="transition: stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)"
      />
      {#if done}
        <path
          d="M11 17l4 4 8-8"
          fill="none"
          stroke={SUCCESS}
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/if}
    </svg>
  {/if}

  <div class="min-w-0">
    <div class="flex items-center gap-2">
      <h3 class="m-0 text-base font-semibold text-ink">{title}</h3>
      {#if featured}
        <span
          class="rounded-full px-2 py-0.5 text-[11px] font-semibold text-paper"
          style="background-color: {ACCENT}">Empieza aquí</span
        >
      {/if}
    </div>
    <p class="m-0 mt-1 text-sm text-muted">{description}</p>
    <span
      class="mt-2 inline-block text-sm font-medium text-interactive group-hover:underline"
      style="color: {ACCENT}"
    >
      {pct > 0 && !done ? 'Continuar' : done ? 'Repasar' : 'Explorar'} →
    </span>
  </div>
</a>
