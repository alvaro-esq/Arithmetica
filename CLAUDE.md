# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Arithmetica is an interactive educational platform ("living textbook") for teaching Statistical Learning / ML / Deep Learning. It is an **Astro + Starlight** static site where each lesson is an MDX page that embeds **Svelte** components for live mathematical visualizations. There is no backend, database, or auth — everything renders statically and only interactive components hydrate in the browser (Islands Architecture).

## Commands

```bash
npm run dev       # Dev server at http://localhost:4321
npm run build     # Runs `astro check` (type check) THEN `astro build` — type errors fail the build
npm run preview   # Serve the production build locally
npm run astro <command>   # Astro CLI passthrough (e.g. `npm run astro check`)
```

There is no test suite or separate lint step. `astro check` (run as part of `build`) is the type/diagnostic gate. Prettier is configured (with Astro + Svelte plugins) for formatting.

## Architecture

Three coupled pieces produce a lesson:

1. **Content** — `src/content/docs/**/*.mdx`. Starlight auto-routes these (file path → URL). The content collection schema is defined in `src/content.config.ts` (extends Starlight's `docsSchema`). Math is authored as LaTeX (`$inline$` / `$$block$$`) and rendered by KaTeX via the `remark-math` + `rehype-katex` pipeline configured in `astro.config.mjs`. Note KaTeX CSS is loaded from a CDN in `astro.config.mjs`, not bundled.
2. **Interactive components** — `src/components/**/*.svelte`. These are the "islands." An MDX page imports the component (relative path) and mounts it with a client directive (`client:visible` is the default; use `client:load` only when needed immediately). See `linear-regression.mdx` + `InteractiveRegression.svelte` as the canonical example.
3. **Navigation** — the Starlight `sidebar` array in `astro.config.mjs` is **manual**. Adding an MDX file does not add it to the sidebar; you must register the link there too.

### Visualization library pattern (`src/lib/svm/`)

For math-heavy lessons, keep the math **out** of the `.svelte` files. The SVM topic established the pattern: pure-TypeScript modules under `src/lib/svm/` hold all the logic, and the components only do SVG rendering + reactivity. This keeps components small and lets several visualizations share one implementation.

- `prng.ts` — seeded PRNG (`mulberry32`) + Box–Muller. **All randomness must flow through a seed**; `Math.random()`/`Date.now()` may be unavailable in the build/SSR environment and break determinism.
- `datasets.ts` — toy datasets (`blobs`, `circles`, `moons`, `interval1d`), all deterministic per seed.
- `kernels.ts` — the four kernels + `decisionFunction`. `geometry.ts` — `lineSegment`, `signedDistance`, `norm`, `perpendicularFoot`, `clamp`, `clientToData`. `solvers.ts` — `pegasos` (linear soft-margin) and `smo` (kernel SVM); both reseed per call so results are reproducible.
- `drag.ts` — the reusable Svelte **action** `draggablePoints`. Use it for any drag-the-data visualization: `<svg use:draggablePoints={cfg}>` plus `data-drag-index={i}` on each point `<circle>`. It owns pointer-capture + pixel→data conversion, so do not re-implement pointer handlers per component.
- `colors.ts` — shared color tokens (`POS`, `NEG`, `ACCENT`, `AXIS`, `PAPER`). Import these instead of re-declaring hex constants in each component.

Two more conventions for these components:
- **Verify the math in Node**, not just `astro check` — transpile the lib and assert numeric properties (e.g. a dataset is actually separable after a transform, a solver converges). `astro check` cannot catch a wrong formula or a dataset whose seed produces a counterexample.
- Animations use `svelte/motion` (`Tween`) and `svelte/easing` — these are core Svelte, allowed despite the "d3-scale only" rule (that rule targets charting libs). When animating a value that a slider also controls, make the **tween the single source of truth**: the slider's `value` reads the tween and writes it on `oninput`; don't keep a parallel `$state` mirror (it desyncs the label/thumb from the animated geometry).

### Styling system

- Tailwind is wired via `@astrojs/tailwind` with `applyBaseStyles: false` — base styles come from Starlight, not Tailwind's reset.
- The "Ink & Copper" palette has ONE source of truth: `src/lib/svm/colors.ts`, mirrored in `tailwind.config.mjs` (named utilities: `paper`, `paper-raised`, `ink`, `muted`, `interactive`, `copper`, `slate`, `success`, `warn`, `line`, `axis`) and `src/styles/global.css` (CSS vars `--c-*`). Import the tokens / use the utilities — never hardcode hex in markup.
- Global CSS and Starlight theme variable overrides are in `src/styles/global.css` (registered as `customCss` in `astro.config.mjs`). It also holds the global `prefers-reduced-motion` reset and the `:focus-visible` rule.
- **Light-only:** the site is forced to the light "paper" palette. `src/components/starlight/ThemeProvider.astro` sets `data-theme='light'` (no localStorage / `prefers-color-scheme`) and `ThemeSelect.astro` is empty (no theme toggle), both wired via Starlight's `components` override in `astro.config.mjs`. This is deliberate — the dark palette was never fully themed, so dark surfaces mixed with dark ink text. Do not re-enable the toggle without theming the dark palette end-to-end.
- **UI/UX:** follow `docs/ui-ux-principles.md` and the `ui-ux` skill. Reusable UX primitives live in `src/components/ui/` (`Celebrate`, `Skeleton`, `LessonCard`, plus `LessonProgress` — a static section index — and `SectionComplete` — a bare anchor). **There is no progress-tracking layer:** the streak/completion/persistence system (`src/lib/progress.ts`) was removed; `LessonProgress`/`SectionComplete`/`LessonCard` are static (mounted with no client directive, zero hydration). `LessonProgress` entries link to each section's Starlight heading slug (`#{slug}`), so add a `slug:` per section.

## Project conventions (enforced, not optional)

These come from the README and AGENTS.md and define the project's identity — respect them:

- **The ink-blue `interactive` (`#1A3A6B`)** is the primary accent — interactive controls, CTAs, and the decision geometry the user manipulates. `success` (`#2E7D52`) signals completion/celebration; `copper`/`slate` are the two data classes.
- **Never use pure white (`#FFFFFF`)** for backgrounds — `paper` (`#F5F3EE`) is the base, `paper-raised` for elevated surfaces.
- **Charting is d3-scale ONLY.** Use `d3-scale` for data→pixel mapping and render SVG natively inside Svelte (`<svg viewBox=...>`). Do **not** add `d3-axis`, `d3-selection`, `d3-shape`, or any heavy charting library (Plotly, Chart.js, Recharts, Highcharts).
- **Svelte 5 runes only.** Use `$state`, `$derived`, `$effect`. Do NOT use legacy reactivity (`$:`) or `export let` — use `$props()` for props.
- Keep visualizations responsive: `viewBox` + `class="w-full"` (avoid fixed pixel sizing on the rendered element).
- Keep components small (~80–100 lines of logic) and self-documenting with minimal comments.
- License is AGPL-3.0.

## Adding a new lesson

1. Create the Svelte component under `src/components/` (use `$props()` for initial parameters, `d3-scale` for coordinates, native `<svg>`). For math-heavy topics, put the math in a `src/lib/<topic>/` module and keep the component to rendering + reactivity (see the SVM pattern above); reuse `drag.ts`, `colors.ts`, and the seeded `prng.ts` rather than re-implementing them.
2. Create the MDX page under `src/content/docs/`, import the component relatively, and mount it with `client:visible`.
3. Register the page link in the `sidebar` array in `astro.config.mjs`.
4. Run `npm run build` (the `astro check` gate) **and**, for any non-trivial math, a quick Node check of the lib module's numeric behavior.
