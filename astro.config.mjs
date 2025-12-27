import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    starlight({
      title: "Arithmetica",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
          },
        },
      ],
      customCss: ["./src/styles/global.css"],
      sidebar: [
        { label: "Introduction", link: "/" },
        { label: "Machine Learning", link: "ml/" },
        { label: "Linear Regression", link: "ml/linear-regression/" },
      ],
    }),
    svelte(),
    tailwind({ applyBaseStyles: false }),
  ],
});
