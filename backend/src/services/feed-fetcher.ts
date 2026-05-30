import { eq, sql, and } from "drizzle-orm";
import type { Database } from "../db";
import { feeds, articles } from "../db/schema";
import { parseFeed } from "./rss-parser";
import { generateId } from "../utils/id";

// Fetch and update a single feed
export const fetchFeed = async (db: Database, feedId: string): Promise<{
  success: boolean;
  newArticles: number;
  error?: string;
}> => {
  try {
    // Get feed from database
    const feed = await db.query.feeds.findFirst({
      where: eq(feeds.id, feedId),
    });

    if (!feed) {
      return { success: false, newArticles: 0, error: "Feed not found" };
    }

    // Parse the feed
    const result = await parseFeed(feed.url, feed.etag ?? undefined, feed.lastModified ?? undefined);

    // 304 Not Modified - skip processing
    if (result.status === 304) {
      await db
        .update(feeds)
        .set({
          lastFetchedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(feeds.id, feedId));

      return { success: true, newArticles: 0 };
    }

    let newArticleCount = 0;

    // Process each article
    for (const item of result.feed.items) {
      try {
        // Try to insert - will skip if duplicate due to unique index
        const articleId = generateId();
        const now = new Date();

        await db
          .insert(articles)
          .values({
            id: articleId,
            feedId,
            guid: item.guid,
            title: item.title,
            link: item.link,
            author: item.author,
            summary: item.summary,
            content: item.content,
            publishedAt: item.publishedAt || now,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();

        newArticleCount++;
      } catch (error) {
        // Ignore duplicate key errors
        if (error instanceof Error && !error.message.includes("UNIQUE")) {
          console.error(`Failed to insert article: ${error.message}`);
        }
      }
    }

    // Update feed metadata
    await db
      .update(feeds)
      .set({
        title: feed.title,
        siteUrl: result.feed.link || feed.siteUrl,
        etag: result.etag || feed.etag,
        lastModified: result.lastModified || feed.lastModified,
        lastFetchedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(feeds.id, feedId));

    // Update unread count
    await updateUnreadCount(db, feedId);

    return { success: true, newArticles: newArticleCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update feed with error
    await db
      .update(feeds)
      .set({
        lastError: errorMessage,
        lastFetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(feeds.id, feedId));

    return { success: false, newArticles: 0, error: errorMessage };
  }
};

// Fetch all feeds with concurrency control
export const fetchAllFeeds = async (db: Database, concurrency: number = 5): Promise<{
  total: number;
  success: number;
  failed: number;
  newArticles: number;
}> => {
  const allFeeds = await db.query.feeds.findMany();

  let success = 0;
  let failed = 0;
  let newArticles = 0;

  // Process feeds in batches with concurrency limit
  for (let i = 0; i < allFeeds.length; i += concurrency) {
    const batch = allFeeds.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((feed) => fetchFeed(db, feed.id))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          success++;
          newArticles += result.value.newArticles;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }
  }

  return {
    total: allFeeds.length,
    success,
    failed,
    newArticles,
  };
};

// Update unread count for a feed
export const updateUnreadCount = async (db: Database, feedId: string): Promise<void> => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(and(eq(articles.feedId, feedId), eq(articles.isRead, 0)));

  const unreadCount = result[0]?.count ?? 0;

  await db
    .update(feeds)
    .set({
      unreadCount,
      updatedAt: new Date(),
    })
    .where(eq(feeds.id, feedId));
};

// Update all feed unread counts
export const updateAllUnreadCounts = async (db: Database): Promise<void> => {
  const allFeeds = await db.query.feeds.findMany();

  await Promise.allSettled(
    allFeeds.map((feed) => updateUnreadCount(db, feed.id))
  );
};
