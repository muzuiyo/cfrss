import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppContext } from "../types";
import { feeds } from "../db/schema";
import { successResponse, errorResponse, ErrorCodes } from "../utils/response";
import { createFeedSchema, updateFeedSchema } from "../utils/validation";
import { generateId } from "../utils/id";
import { fetchFeed, fetchAllFeeds, updateUnreadCount } from "../services/feed-fetcher";
import { parseFeed } from "../services/rss-parser";

const feedsRouter = new Hono<AppContext>();

// GET /api/feeds - Get all feeds
feedsRouter.get("/", async (c) => {
  const db = c.get("db");

  const allFeeds = await db.query.feeds.findMany({
    orderBy: [desc(feeds.createdAt)],
  });

  return successResponse(c, allFeeds.map((f) => ({
    id: f.id,
    title: f.title,
    custom_title: f.customTitle,
    url: f.url,
    site_url: f.siteUrl,
    favicon: f.favicon,
    category: f.category,
    unread_count: f.unreadCount,
    created_at: f.createdAt.getTime(),
    updated_at: f.updatedAt.getTime(),
  })));
});

// POST /api/feeds - Add a new feed
feedsRouter.post("/", zValidator("json", createFeedSchema, (result, c) => {
  if (!result.success) {
    const message = result.error.issues.map(i => i.message).join(", ");
    return errorResponse(c, ErrorCodes.INVALID_REQUEST, message, 400);
  }
}), async (c) => {
  const db = c.get("db");
  const input = c.req.valid("json");

  // Check for duplicate URL
  const existing = await db.query.feeds.findFirst({
    where: eq(feeds.url, input.url),
  });

  if (existing) {
    return errorResponse(c, ErrorCodes.DUPLICATE_FEED, `This feed is already subscribed as "${existing.title}"`, 409);
  }

  try {
    // Try to fetch and parse the feed to get metadata
    const parsed = await parseFeed(input.url);

    const now = new Date();
    const feedId = generateId();

    // Insert feed
    // title = RSS源标题, customTitle = 用户自定义标题
    await db.insert(feeds).values({
      id: feedId,
      title: parsed.feed.title,
      customTitle: input.title || null,
      url: input.url,
      siteUrl: parsed.feed.link,
      category: input.category,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch articles
    await fetchFeed(db, feedId);

    // Get the created feed
    const created = await db.query.feeds.findFirst({
      where: eq(feeds.id, feedId),
    });

    if (!created) {
      return errorResponse(c, ErrorCodes.INTERNAL_ERROR, "Failed to retrieve created feed", 500);
    }

    return successResponse(c, {
      id: created.id,
      title: created.title,
      custom_title: created.customTitle,
      url: created.url,
      site_url: created.siteUrl,
      favicon: created.favicon,
      category: created.category,
      unread_count: created.unreadCount,
      created_at: created.createdAt.getTime(),
      updated_at: created.updatedAt.getTime(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add feed";
    return errorResponse(c, ErrorCodes.FEED_FETCH_ERROR, message, 400);
  }
});

// PUT /api/feeds/:id - Update a feed
feedsRouter.put("/:id", zValidator("json", updateFeedSchema, (result, c) => {
  if (!result.success) {
    const message = result.error.issues.map(i => i.message).join(", ");
    return errorResponse(c, ErrorCodes.INVALID_REQUEST, message, 400);
  }
}), async (c) => {
  const db = c.get("db");
  const feedId = c.req.param("id");
  const input = c.req.valid("json");

  // Check if feed exists
  const existing = await db.query.feeds.findFirst({
    where: eq(feeds.id, feedId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Feed not found", 404);
  }

  // Update feed
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.custom_title !== undefined) updateData.customTitle = input.custom_title;
  if (input.category !== undefined) updateData.category = input.category;

  await db
    .update(feeds)
    .set(updateData)
    .where(eq(feeds.id, feedId));

  // Get updated feed
  const updated = await db.query.feeds.findFirst({
    where: eq(feeds.id, feedId),
  });

  if (!updated) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Feed not found", 404);
  }

  return successResponse(c, {
    id: updated.id,
    title: updated.title,
    custom_title: updated.customTitle,
    url: updated.url,
    site_url: updated.siteUrl,
    favicon: updated.favicon,
    category: updated.category,
    unread_count: updated.unreadCount,
    created_at: updated.createdAt.getTime(),
    updated_at: updated.updatedAt.getTime(),
  });
});

// DELETE /api/feeds/:id - Delete a feed (cascade delete articles)
feedsRouter.delete("/:id", async (c) => {
  const db = c.get("db");
  const feedId = c.req.param("id");

  // Check if feed exists
  const existing = await db.query.feeds.findFirst({
    where: eq(feeds.id, feedId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Feed not found", 404);
  }

  // Delete feed (articles will be cascade deleted)
  await db.delete(feeds).where(eq(feeds.id, feedId));

  return successResponse(c, { deleted: true });
});

// DELETE /api/feeds - Delete all feeds
feedsRouter.delete("/", async (c) => {
  const db = c.get("db");

  // Delete all feeds (articles will be cascade deleted)
  await db.delete(feeds);

  return successResponse(c, { deleted: true });
});

// POST /api/feeds/:id/refresh - Refresh a specific feed
feedsRouter.post("/:id/refresh", async (c) => {
  const db = c.get("db");
  const feedId = c.req.param("id");

  // Check if feed exists
  const existing = await db.query.feeds.findFirst({
    where: eq(feeds.id, feedId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Feed not found", 404);
  }

  const result = await fetchFeed(db, feedId);

  return successResponse(c, {
    success: result.success,
    newArticles: result.newArticles,
    error: result.error,
  });
});

// POST /api/feeds/refresh-all - Refresh all feeds
feedsRouter.post("/refresh-all", async (c) => {
  const db = c.get("db");

  const result = await fetchAllFeeds(db);

  return successResponse(c, result);
});

export default feedsRouter;
