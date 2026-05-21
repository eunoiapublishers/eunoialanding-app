import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),
    author: z.string().default('Eunoia Learning LLC'),
    tag: z.string().default('Estrategias Aula'),
  }),
});

export const collections = {
  'posts': postsCollection,
};
