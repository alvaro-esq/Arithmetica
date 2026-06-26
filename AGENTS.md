# Arithmetica - Agent Guidelines

## Project Commands
- Dev: `npm run dev` - Start development server
- Build: `npm run build` - Production build (includes type checking)
- Preview: `npm run preview` - Preview production build locally
- Astro: `npm run astro <command>` - Run Astro CLI commands directly

## Code Style Guidelines

### Language & Framework
- Core Framework: Astro (Starlight theme)
- Components: Svelte (via Astro Islands)
- Styling: Tailwind CSS
- Math: KaTeX (Starlight native)
- Charting: d3-scale ONLY (SVG rendered by Svelte)

### Design System — "Ink & Copper"
- Color tokens live in ONE place: `src/lib/svm/colors.ts` (mirrored in `tailwind.config.mjs` + `src/styles/global.css`). Import them; never hardcode hex in markup.
- Background: paper #F5F3EE (warm off-white) · raised surfaces: #FBFAF6 · never pure white
- Text: ink #1F1D1B (warm near-black) · secondary: muted #7A756B
- Interactive / primary accent: interactive #1A3A6B (ink blue) — controls, CTAs, decision geometry
- Data classes: copper #B5532A (+1) · slate #3B4252 (−1)
- State: success #2E7D52 (checkmarks, completion, celebrations) · warn #B7791F
- Neutrals: line #E3DFD4 (borders) · axis #CFC9BA (gridlines)
- UI/UX guidance: follow `docs/ui-ux-principles.md` and the `ui-ux` skill. Every interactive element needs hover/active/focus-visible states; all motion respects `prefers-reduced-motion`.

### General Guidelines
- Follow AGPL-3.0 license requirements
- Write clear, self-documenting code
- Minimal comments (code should be self-explanatory)
- Keep components under ~80 lines when possible
- No authentication, database, or backend services
- No state management libraries (Redux, Zustand, etc.)
- No heavy charting libraries (Plotly, Chart.js, Recharts)
- No d3-axis, d3-selection, or d3-shape helpers

### Svelte Component Rules
- Single-file components (.svelte)
- Use Svelte 5 runes ($state, $derived, $effect) for reactivity
- Do NOT use legacy Svelte 3/4 reactivity ($:) or export let
- Use client directives in MDX (client:visible, client:load)
- SVG rendering handled natively by Svelte
- Use d3-scale for data-to-pixel coordinate mapping

### MDX Rules
- Use .mdx files (not .md)
- Explicitly import Svelte components at the top
- Use client directives for interactivity
- LaTeX equations: $inline$ or $$block$$

### Import & Formatting
- Use relative imports for local components
- Prettier configured with Astro and Svelte plugins
- Maintain consistent code style throughout

## Architecture
- Content: src/content/docs/ - Markdown/MDX pages
- Components: src/components/ - Svelte interactive components
- Styles: src/styles/ - Global CSS (Tailwind)
- Configuration: astro.config.mjs - Integrations and Starlight setup