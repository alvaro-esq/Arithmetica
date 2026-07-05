<script lang="ts">
  // Section anchor. Formerly this marked a section "complete" on scroll (progress
  // tracking); that gamification was removed. It now only renders a stable
  // <div id="sc-{id}"> so the lesson's section index (LessonProgress) can jump
  // here. Zero visual footprint, no JS, no persistence. Kept as a component so
  // the 9 lessons' `<SectionComplete id=… />` calls need no edits.

  let { id }: { id: string; label?: string } = $props();
</script>

<div id="sc-{id}" class="not-content" aria-hidden="true"></div>
