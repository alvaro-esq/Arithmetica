<script lang="ts">
  import { ACCENT } from '../../lib/svm/colors';

  // A lesson entry point on the home page. A bordered card (Gestalt: common
  // region). `featured` gets the primary visual weight (Von Restorff) so the eye
  // lands on where to start. No progress ring / completion state — the site
  // doesn't track the learner; every card simply invites exploration.

  let {
    href,
    title,
    description,
    featured = false,
  }: {
    href: string;
    title: string;
    description: string;
    sectionIds?: string[]; // accepted for call-site compatibility; unused
    featured?: boolean;
  } = $props();
</script>

<a
  {href}
  class="surface group not-content flex items-start gap-4 p-4 no-underline transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
  style={featured ? `border-color: ${ACCENT}; border-width: 1.5px` : ''}
>
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
      class="mt-2 inline-block text-sm font-medium group-hover:underline"
      style="color: {ACCENT}"
    >
      Explorar →
    </span>
  </div>
</a>
