/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,md,mdx,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // "Ink & Copper" — mirrors src/lib/svm/colors.ts (single source of truth)
        paper: '#F5F3EE',
        'paper-raised': '#FBFAF6',
        ink: '#1F1D1B',
        interactive: '#1A3A6B',
        'interactive-soft': '#2C5494',
        success: '#2E7D52',
        warn: '#B7791F',
        copper: '#B5532A',
        slate: '#3B4252',
        muted: '#7A756B',
        line: '#E3DFD4',
        axis: '#CFC9BA',
      },
      backgroundColor: {
        DEFAULT: 'var(--starlight-c-bg)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 29, 27, 0.04), 0 2px 8px rgba(31, 29, 27, 0.06)',
        'card-hover': '0 2px 4px rgba(31, 29, 27, 0.06), 0 8px 20px rgba(31, 29, 27, 0.10)',
        focus: '0 0 0 3px rgba(26, 58, 107, 0.35)',
      },
      borderRadius: {
        card: '0.75rem',
      },
      keyframes: {
        // Micro-celebration: a subtle scale pop (Peak-End milestone)
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '60%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Drawn checkmark via stroke-dashoffset
        'check-draw': {
          from: { 'stroke-dashoffset': '24' },
          to: { 'stroke-dashoffset': '0' },
        },
        // Skeleton shimmer for hydrating islands (perceived speed)
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Gentle entrance for content/SVG on hydrate
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pop: 'pop 240ms cubic-bezier(0.34, 1.4, 0.64, 1) both',
        'check-draw': 'check-draw 300ms ease-out 60ms both',
        shimmer: 'shimmer 1.4s infinite',
        'fade-up': 'fade-up 240ms ease-out both',
      },
    },
  },
};
