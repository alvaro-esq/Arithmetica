import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  // Canonical site URL — powers the sitemap, canonical <link>s and OG tags.
  // TODO: replace with the real deploy URL (e.g. https://arithmetica.galileo.edu).
  site: "https://arithmetica.example.edu",
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
      // Light-only: the site is "paper"-first (Ink & Copper) and only themes the
      // light palette. These overrides force data-theme='light' and remove the
      // theme toggle, so Starlight's dark surfaces never mix with dark ink text.
      components: {
        ThemeProvider: "./src/components/starlight/ThemeProvider.astro",
        ThemeSelect: "./src/components/starlight/ThemeSelect.astro",
      },
      sidebar: [
        { label: "Inicio", link: "/" },
        { label: "El curso", link: "ml/" },
        {
          label: "Álgebra Lineal",
          collapsed: false,
          items: [
            { label: "Fundamentos", link: "algebra-lineal/" },
            { label: "Vectores: los datos son flechas", link: "algebra-lineal/vectores/" },
            { label: "Matrices: máquinas que transforman", link: "algebra-lineal/matrices/" },
            { label: "Sistemas y mínimos cuadrados", link: "algebra-lineal/sistemas/" },
            { label: "Eigenvalores y eigenvectores", link: "algebra-lineal/eigenvalores/" },
            { label: "PCA y SVD", link: "algebra-lineal/pca-svd/" },
          ],
        },
        {
          label: "Modelos clásicos",
          collapsed: false,
          items: [
            { label: "Regresión Lineal", link: "ml/linear-regression/" },
            { label: "Support Vector Machines y Kernels", link: "ml/svm/" },
            { label: "Árboles de Decisión y Random Forests", link: "ml/decision-trees/" },
            { label: "Detección de Anomalías", link: "ml/anomaly-detection/" },
          ],
        },
        {
          label: "Deep Learning",
          collapsed: false,
          items: [
            { label: "Introducción a Deep Learning", link: "ml/deep-learning/" },
            { label: "Regularización y Optimización", link: "ml/optimization/" },
            { label: "Redes Neuronales Recurrentes", link: "ml/recurrent-neural-networks/" },
            { label: "Arquitecturas Avanzadas", link: "ml/advanced-architectures/" },
          ],
        },
        {
          label: "Aprendizaje por refuerzo",
          collapsed: false,
          items: [
            { label: "Introducción a Reinforcement Learning", link: "ml/reinforcement-learning/" },
          ],
        },
      ],
    }),
    svelte(),
    tailwind({ applyBaseStyles: false }),
  ],
});
