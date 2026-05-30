import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Feeds table
export const feeds = sqliteTable("feeds", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  siteUrl: text("site_url"),
  favicon: text("favicon"),
  // Category (optional)
  category: text("category"),
  // Sync related
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastFetchedAt: integer("last_fetched_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  // Article count cache
  unreadCount: integer("unread_count").default(0),
  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Articles table
export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    guid: text("guid").notNull(),
    title: text("title").notNull(),
    link: text("link").notNull(),
    author: text("author"),
    summary: text("summary"),
    content: text("content"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    isRead: integer("is_read").notNull().default(0),
    isStarred: integer("is_starred").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    // Unique index for deduplication
    feedGuidIdx: uniqueIndex("feed_guid_idx").on(table.feedId, table.guid),
  })
);

// Settings table
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Type exports
export type Feed = typeof feeds.$inferSelect;
export type NewFeed = typeof feeds.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
