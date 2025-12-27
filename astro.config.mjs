import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [
    starlight({
      title: "Arithmetica",
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
