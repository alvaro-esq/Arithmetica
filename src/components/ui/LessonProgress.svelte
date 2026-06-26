<script lang="ts">
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { SUCCESS, ACCENT } from '../../lib/svm/colors';
  import { touchStreak, snapshot, onProgressChange } from '../../lib/progress';

  // Sticky-ish lesson header: a completion bar over the lesson's sections plus a
  // daily streak. Goal-Gradient (visible progress) + Zeigarnik (the unfinished
  // count pulls you back). Sections are passed as {id,label}; each marks itself
  // complete via markComplete(), which emits a change event this subscribes to —
  // so the bar updates immediately, no polling.

  let {
    sections = [],
    title = 'Progreso de la lección',
  }: { sections: { id: string; label: string }[]; title?: string } = $props();

  const ids = sections.map((s) => s.id);
  let done = $state(0);
  let streak = $state(0);
  let doneSet = $state<Record<string, boolean>>({});
  const pct = new Tween(0, { duration: 500, easing: cubicOut });

  function refresh() {
    // One localStorage read+parse per refresh (snapshot), not N+2.
    const snap = snapshot();
    done = snap.doneCount(ids);
    doneSet = Object.fromEntries(sections.map((s) => [s.id, snap.isDone(s.id)]));
    streak = snap.streak;
    // Endowed progress: never show a stone-cold 0% bar — seed a sliver.
    pct.target = ids.length ? Math.max(done / ids.length, done === 0 ? 0.04 : 0) : 0;
  }

  onMount(() => {
    streak = touchStreak();
    refresh();
    // Update immediately when any component marks a section complete, and when the
    // tab regains focus (e.g. progress earned in another tab, or a new day).
    const off = onProgressChange(refresh);
    const onVis = () => refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      off();
      document.removeEventListener('visibilitychange', onVis);
    };
  });

  const allDone = $derived(done === ids.length && ids.length > 0);
</script>

<div class="surface not-content my-6 p-4">
  <div class="mb-3 flex items-center justify-between gap-3">
    <p class="m-0 text-sm font-semibold text-ink">{title}</p>
    <div class="flex items-center gap-3 text-sm">
      {#if streak > 0}
        <span class="font-medium text-muted" title="Días seguidos aprendiendo">
          🔥 {streak} {streak === 1 ? 'día' : 'días'}
        </span>
      {/if}
      <span class="font-semibold" style="color: {allDone ? SUCCESS : ACCENT}">
        {done}/{ids.length}
      </span>
    </div>
  </div>

  <!-- completion bar -->
  <div
    class="h-2 w-full overflow-hidden rounded-full bg-line"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax={ids.length}
    aria-valuenow={done}
    aria-label={title}
  >
    <div
      class="h-full rounded-full transition-colors"
      style="width: {pct.current * 100}%; background-color: {allDone ? SUCCESS : ACCENT}"
    ></div>
  </div>

  <!-- per-section checkmarks -->
  <ul class="not-content mt-3 flex flex-wrap gap-x-4 gap-y-1.5 p-0 text-sm">
    {#each sections as s}
      <li class="flex list-none items-center gap-1.5">
        <span
          class="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] transition-colors"
          style="background-color: {doneSet[s.id] ? SUCCESS : 'transparent'}; border: 1.5px solid {doneSet[
            s.id
          ]
            ? SUCCESS
            : 'var(--c-axis)'}; color: var(--c-paper)"
          aria-hidden="true"
        >
          {doneSet[s.id] ? '✓' : ''}
        </span>
        <span class={doneSet[s.id] ? 'text-ink' : 'text-muted'}>{s.label}</span>
      </li>
    {/each}
  </ul>
</div>
