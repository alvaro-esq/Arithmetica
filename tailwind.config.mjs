/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,md,mdx,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF9F6',
        ink: '#222222',
        interactive: '#002FA7'
      },
      backgroundColor: {
        DEFAULT: 'var(--starlight-c-bg)'
      }
    }
  }
};
