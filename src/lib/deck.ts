// Slide partitioning for the presentation ("deck") mode. Keeps the DOM logic out
// of the PresentMode component (same spirit as src/lib/viz/grid.ts). The lesson
// content is a single `.sl-markdown-content` container that Starlight rendered;
// we split its *real* children into per-section groups so the deck can MOVE those
// nodes (not clone them) into a full-screen stage — moving keeps the hydrated
// Svelte islands and rendered KaTeX alive and interactive.

export interface SlideGroup {
  /** Plain-text title from the section's <h2>, or '' for a leading intro group. */
  title: string;
  /** The real DOM nodes belonging to this slide, in original document order. */
  nodes: Element[];
}

/**
 * Find the section `<h2>` carried by a direct child of `.sl-markdown-content`,
 * or null if this node doesn't start a section. Starlight wraps each heading in
 * `<div class="sl-heading-wrapper level-h2"><h2 id="…">…</h2>…</div>`, so the
 * boundary node is the wrapper — but we also accept a bare `<h2>` for robustness
 * across Starlight versions.
 */
function sectionHeading(node: Element): HTMLHeadingElement | null {
  if (node.tagName === 'H2') return node as HTMLHeadingElement;
  if (node.classList?.contains('sl-heading-wrapper') && node.classList.contains('level-h2')) {
    return node.querySelector(':scope > h2');
  }
  return null;
}

/** Nodes that must never travel into the deck: page scripts/styles injected by
 *  the islands, the PresentMode island itself (it renders the overlay — moving
 *  its own host node would detach the running deck), and the LessonProgress
 *  section index (its jump links target section anchors that live in OTHER,
 *  currently-detached slides, so it would render dead links inside a slide). */
function isDeckNoise(node: Element): boolean {
  if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return true;
  const island =
    node.tagName === 'ASTRO-ISLAND' ? node : node.querySelector(':scope > astro-island');
  const url = island?.getAttribute('component-url') ?? '';
  return /PresentMode|LessonProgress/.test(url);
}

/**
 * Group the direct children of a `.sl-markdown-content` container by section
 * heading. A new group starts at each `<h2>` (bare or Starlight-wrapped); any
 * nodes before the first heading (intro prose) form a leading group with title
 * ''. The PresentMode and LessonProgress islands are filtered out by isDeckNoise
 * (see above), so they never reach a slide. Empty groups are dropped. The TOC's
 * `<h2 id="starlight__on-this-page">` lives outside this container, so it never
 * appears here.
 */
export function partitionByHeadings(container: Element): SlideGroup[] {
  const groups: SlideGroup[] = [];
  let current: SlideGroup | null = null;

  for (const node of Array.from(container.children)) {
    if (isDeckNoise(node)) continue; // skip scripts/styles and the deck's own island
    const h2 = sectionHeading(node);
    if (h2) {
      // flush the previous group before opening a new one
      if (current && current.nodes.length) groups.push(current);
      current = {
        // Strip Starlight's appended anchor label ("Section titled …" /
        // localized "Sección titulada …") so only the heading text remains.
        title: (h2.textContent ?? '').replace(/\s*Secci[oó]n titulada.*$/i, '').replace(/\s*Section titled.*$/i, '').trim(),
        nodes: [node],
      };
    } else {
      if (!current) current = { title: '', nodes: [] };
      current.nodes.push(node);
    }
  }
  if (current && current.nodes.length) groups.push(current);

  // Drop a leading intro group that carries no real content (e.g. only an empty
  // wrapper) but keep it when it holds intro prose.
  return groups.filter((g) => g.nodes.some((n) => (n.textContent ?? '').trim() !== '' || n.children.length > 0));
}
