import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        // Ensure head is always an array to prevent runtime errors
        head: z.array(z.any()).optional().default([]),
      }),
    }),
  }),
};