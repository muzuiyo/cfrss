import { z } from "zod";

// Feed schemas
export const createFeedSchema = z.object({
  url: z.string().url("Invalid feed URL"),
  title: z.string().optional(),
  category: z.string().optional(),
});

export const updateFeedSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
});

// Article query schema
export const articleQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["published_at", "created_at", "title"]).default("published_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  feed_id: z.string().optional(),
  is_read: z.coerce.number().int().min(0).max(1).optional(),
  is_starred: z.coerce.number().int().min(0).max(1).optional(),
  q: z.string().max(200).optional(),
});

// Settings schema
export const updateSettingsSchema = z.record(z.string());

// OPML import schema
export const opmlImportSchema = z.object({
  file: z.instanceof(File),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

// Type exports
export type CreateFeedInput = z.infer<typeof createFeedSchema>;
export type UpdateFeedInput = z.infer<typeof updateFeedSchema>;
export type ArticleQuery = z.infer<typeof articleQuerySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
