<script lang="ts">
  import { ACCENT } from '../../lib/svm/colors';

  // Lesson section index — a compact "map of the lesson" for orientation and
  // quick jumps. NOT progress tracking: no streak, no completion bar, no
  // persistence. Each entry links to that section's HEADING anchor (Starlight's
  // auto-slug `#{slug}`, which sits at the top of the section) so the jump lands
  // ON the section, not at its foot. `slug` is optional; without it we fall back
  // to the SectionComplete anchor `#sc-{id}` (which sits at the section's end).
  // Sections are passed as {id, label, slug?}.

  let {
    sections = [],
    title = 'En esta lección',
  }: { sections: { id: string; label: string; slug?: string }[]; title?: string } = $props();
</script>

{#if sections.length}
  <nav class="surface not-content my-6 p-4" aria-label={title}>
    <p class="m-0 mb-3 text-sm font-semibold text-ink">{title}</p>
    <ol class="not-content m-0 flex flex-wrap gap-x-2 gap-y-1.5 p-0 text-sm">
      {#each sections as s, i}
        <li class="flex list-none items-center gap-2">
          {#if i > 0}<span class="text-axis" aria-hidden="true">·</span>{/if}
          <a
            href={s.slug ? `#${s.slug}` : `#sc-${s.id}`}
            class="rounded px-1 py-0.5 font-medium no-underline transition-colors hover:underline"
            style="color: {ACCENT}"
          >
            <span class="text-muted tabular-nums">{i + 1}.</span>
            {s.label}
          </a>
        </li>
      {/each}
    </ol>
  </nav>
{/if}
