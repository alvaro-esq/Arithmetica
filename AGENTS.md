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

### Design System
- Background: paper #F4F3EF
- Text: ink #222222
- Interactive Accent: interactive #002FA7 (Klein Blue)
- Klein Blue is ONLY for interactive elements (sliders, active states, draggable handles)
- Never use Klein Blue for static borders or backgrounds

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