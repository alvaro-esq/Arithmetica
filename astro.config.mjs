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
        { label: "Support Vector Machines y Kernel Methods", link: "ml/svm/" },
        { label: "Árboles de Decisión y Random Forests", link: "ml/decision-trees/" },
        { label: "Detección de Anomalías", link: "ml/anomaly-detection/" },
        { label: "Introducción a Deep Learning", link: "ml/deep-learning/" },
        { label: "Regularización y Optimización en Deep Learning", link: "ml/optimization/" },
        { label: "Redes Neuronales Recurrentes", link: "ml/recurrent-neural-networks/" },
        { label: "Arquitecturas Avanzadas de Redes Neuronales", link: "ml/advanced-architectures/" },
        { label: "Introducción a Reinforcement Learning", link: "ml/reinforcement-learning/" },
      ],
    }),
    svelte(),
    tailwind({ applyBaseStyles: false }),
  ],
});
