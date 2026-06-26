<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { tick, onDestroy } from 'svelte';
  import { partitionByHeadings, type SlideGroup } from '../../lib/deck';
  import { setPresenting } from '../../lib/progress';

  // "Knowledge slides" presentation lens over a lesson. A floating button opens a
  // full-screen overlay that projects the lesson one section at a time. It MOVES
  // the lesson's real DOM nodes (prose, KaTeX, hydrated <astro-island>s) into a
  // stage and back on exit — so the interactive visualizations stay alive and the
  // lesson's scroll view is untouched. Inherits the site's tokens/animations.
  //
  // Progress/celebration are NOT re-implemented here: each section's own
  // SectionComplete island marks the section done on genuine scroll-into-view.
  // While presenting we call setPresenting(true) so paging the deck does NOT trip
  // those observers (which would falsely complete the whole lesson).

  let { title = 'Presentación' }: { title?: string } = $props();

  let open = $state(false);
  let index = $state(0);
  let slides = $state<SlideGroup[]>([]);
  let entering = $state(false); // drives the per-slide enter animation

  let content: HTMLElement | null = null; // the .sl-markdown-content container
  let orderedNodes: Element[] = []; // container's original child order (for restore)
  let stage = $state<HTMLDivElement | null>(null); // persistent host for the current slide's nodes
  let overlay = $state<HTMLDivElement | null>(null);
  let launcher = $state<HTMLButtonElement | null>(null);

  const reduced = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const pct = new Tween(0, { duration: 320, easing: cubicOut });
  const currentTitle = $derived(slides[index]?.title || title);

  async function present(i: number) {
    if (!stage || !slides[i]) return;
    stage.replaceChildren(...slides[i].nodes); // moves the real nodes in (single host, no race)
    stage.scrollTop = 0;
    index = i;
    pct.set(slides.length > 1 ? (i + 1) / slides.length : 1, { duration: reduced() ? 0 : 320 });
    // restart the enter animation
    entering = false;
    await tick();
    entering = true;
  }

  function openDeck() {
    content = document.querySelector('.sl-markdown-content');
    if (!content) return;
    slides = partitionByHeadings(content);
    if (!slides.length) return;
    // Snapshot the container's FULL original child order (incl. scripts/styles and
    // the deck's own island) so exit restores the DOM byte-for-byte.
    orderedNodes = Array.from(content.children);
    setPresenting(true); // pause SectionComplete observers while we relocate nodes
    open = true;
    document.body.style.overflow = 'hidden';
    pct.set(0, { duration: 0 }); // start from empty, never animate downward
    tick().then(() => {
      present(0);
      overlay?.focus();
    });
  }

  function closeDeck() {
    // Re-append every original child in its original order. The slide nodes were
    // moved to the stage; the rest never left. append() moves existing nodes, so
    // this re-collates the container exactly as it was. Islands stay mounted.
    if (content && orderedNodes.length) content.append(...orderedNodes);
    open = false;
    document.body.style.overflow = '';
    setPresenting(false);
    slides = [];
    orderedNodes = [];
    index = 0;
    // Restore focus to the launcher once Svelte has re-rendered it (it only
    // exists in the DOM while the deck is closed).
    tick().then(() => launcher?.focus());
  }

  // Safety net: if the island is torn down while open (route swap / hydration
  // teardown), undo the body scroll-lock and the presenting flag.
  onDestroy(() => {
    if (open) {
      document.body.style.overflow = '';
      setPresenting(false);
    }
  });

  function next() {
    if (index < slides.length - 1) present(index + 1);
  }
  function prev() {
    if (index > 0) present(index - 1);
  }

  // True when focus sits on an interactive control inside a moved island, so the
  // deck must NOT swallow Arrow/Space (the control needs them). The deck's own
  // chrome buttons are fine to navigate from, so they're excluded.
  function focusInIsland(): boolean {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === overlay) return false;
    if (a.closest('.deck-chrome, .deck-nav, .deck-foot')) return false;
    return !!a.closest('.deck-stage');
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      // Plain 'P' opens the deck; never hijack Ctrl/Cmd+P (print) or typing fields.
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
        if (!typing) {
          e.preventDefault();
          openDeck();
        }
      }
      return;
    }

    // Esc always closes.
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDeck();
      return;
    }

    // Let focused island controls (and Space scrolling) keep their keys.
    if (focusInIsland()) return;

    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      present(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      present(slides.length - 1);
    }
    // Space is intentionally NOT bound to navigation: it stays available for
    // native page-scroll on long slides and for activating focused buttons.
  }

  // Minimal focus trap: Tab/Shift+Tab cycles within the overlay's focusables so
  // focus can't escape to the hidden lesson behind the aria-modal dialog.
  function onTrap(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !overlay) return;
    const f = overlay.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const a = document.activeElement;
    if (e.shiftKey && (a === first || a === overlay)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && a === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if !open}
  <button
    class="deck-launch"
    bind:this={launcher}
    onclick={openDeck}
    aria-label="Presentar esta lección como slides (tecla P)"
    title="Presentar (P)"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
    <span class="deck-launch-label">Presentar</span>
  </button>
{/if}

{#if open}
  <div
    class="deck-backdrop"
    bind:this={overlay}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label={`Presentación: ${title}`}
    onkeydown={onTrap}
  >
    <!-- top progress bar -->
    <div class="deck-progress" role="presentation">
      <div class="deck-progress-fill" style="width: {pct.current * 100}%"></div>
    </div>

    <header class="deck-chrome">
      <p class="deck-title">{title}</p>
      <div class="deck-meta">
        <span class="deck-count">{index + 1} / {slides.length}</span>
        <span class="deck-dots" aria-hidden="true">
          {#each slides as _, i}
            <span class="deck-dot" class:on={i === index} class:done={i <= index}></span>
          {/each}
        </span>
        <button class="deck-exit" onclick={closeDeck} aria-label="Salir de la presentación (Esc)">✕</button>
      </div>
    </header>

    <!-- announce the current slide (number + section name) to screen readers -->
    <p class="sr-only" aria-live="polite">{index + 1} / {slides.length} — {currentTitle}</p>

    <!-- the moved lesson nodes are projected here; sl-markdown-content keeps Starlight styling -->
    <div class="deck-stage">
      <div class="deck-slide sl-markdown-content" class:entering bind:this={stage}></div>
    </div>

    <button class="deck-nav deck-prev" onclick={prev} disabled={index === 0} aria-label="Slide anterior (←)">
      ‹
    </button>
    <button
      class="deck-nav deck-next"
      onclick={next}
      disabled={index === slides.length - 1}
      aria-label="Slide siguiente (→)"
    >
      ›
    </button>

    <footer class="deck-foot">
      <span class="deck-hint">← → para navegar · Esc para salir</span>
      <span class="deck-progress-text">{currentTitle}</span>
    </footer>
  </div>
{/if}
