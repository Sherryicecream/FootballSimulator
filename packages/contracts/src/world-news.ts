import { z } from 'zod';
import type { Country } from './country';

const IdSchema = z.string().min(1).max(60);

export const WorldNewsCategorySchema = z.enum([
  'domestic',
  'continental',
  'transfer',
  'rumour',
  'injury',
  'milestone',
]);
export type WorldNewsCategory = z.infer<typeof WorldNewsCategorySchema>;

export const WorldNewsWindowSchema = z.enum(['summer', 'winter', 'season']);
export type WorldNewsWindow = z.infer<typeof WorldNewsWindowSchema>;

/**
 * A fact is the only permitted source for a world-news item.  The simulation
 * creates facts; the presentation layer only projects and filters them.
 */
export const WorldFactSchema = z.strictObject({
  id: IdSchema,
  occurredOn: z.string().min(1).max(30),
  category: WorldNewsCategorySchema,
  relatedClubIds: z.array(IdSchema).min(1).max(4),
  summary: z.string().min(1).max(240),
  window: WorldNewsWindowSchema.nullable().default(null),
});
export type WorldFact = z.infer<typeof WorldFactSchema>;

export const WorldNewsItemSchema = z.strictObject({
  id: IdSchema,
  occurredOn: z.string().min(1).max(30),
  category: WorldNewsCategorySchema,
  relatedClubIds: z.array(IdSchema).min(1).max(4),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(240),
  relatedFactId: IdSchema,
  relevance: z.number().int().min(0).max(1000),
  sourceWindow: WorldNewsWindowSchema.nullable(),
});
export type WorldNewsItem = z.infer<typeof WorldNewsItemSchema>;

export type WorldNewsFilter = {
  country?: Country;
  tier?: number;
  category?: WorldNewsCategory;
  window?: WorldNewsWindow;
};

export const WorldNewsPageSchema = z.strictObject({
  items: z.array(WorldNewsItemSchema).max(24),
  nextCursor: z.string().max(30).nullable(),
});
export type WorldNewsPage = z.infer<typeof WorldNewsPageSchema>;
