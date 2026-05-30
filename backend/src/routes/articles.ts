import { Hono } from "hono";
import { eq, desc, asc, and, sql, count, like, or } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import type { AppContext } from "../types";
import { articles, feeds } from "../db/schema";
import { successResponse, errorResponse, ErrorCodes } from "../utils/response";
import { articleQuerySchema } from "../utils/validation";
import { updateUnreadCount } from "../services/feed-fetcher";

const articlesRouter = new Hono<AppContext>();

// Helper to build query conditions
const buildConditions = (query: ReturnType<typeof articleQuerySchema.parse>) => {
  const conditions = [];

  if (query.feed_id) {
    conditions.push(eq(articles.feedId, query.feed_id));
  }
  if (query.is_read !== undefined) {
    conditions.push(eq(articles.isRead, query.is_read));
  }
  if (query.is_starred !== undefined) {
    conditions.push(eq(articles.isStarred, query.is_starred));
  }
  if (query.q) {
    const searchTerm = `%${query.q}%`;
    conditions.push(
      or(
        like(articles.title, searchTerm),
        like(articles.summary, searchTerm),
        like(articles.author, searchTerm)
      )
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

// Helper to get sort order
const getSortOrder = (sort: string, order: string) => {
  const sortField = sort === "title" ? articles.title :
                   sort === "created_at" ? articles.createdAt :
                   articles.publishedAt;
  return order === "asc" ? asc(sortField) : desc(sortField);
};

// GET /api/articles/stats - Get unread and starred counts
articlesRouter.get("/stats", async (c) => {
  const db = c.get("db");

  const [unreadResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.isRead, 0));

  const [starredResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(eq(articles.isStarred, 1));

  return successResponse(c, {
    unread_count: unreadResult?.count ?? 0,
    starred_count: starredResult?.count ?? 0,
  });
});

// GET /api/articles - Get articles list with pagination
articlesRouter.get("/", zValidator("query", articleQuerySchema), async (c) => {
  const db = c.get("db");
  const query = c.req.valid("query");

  const conditions = buildConditions(query);
  const orderBy = getSortOrder(query.sort, query.order);
  const offset = (query.page - 1) * query.per_page;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(conditions);

  const total = totalResult?.count ?? 0;

  // Get articles with feed info
  const result = await db
    .select({
      article: articles,
      feedTitle: feeds.title,
      feedFavicon: feeds.favicon,
    })
    .from(articles)
    .leftJoin(feeds, eq(articles.feedId, feeds.id))
    .where(conditions)
    .orderBy(orderBy)
    .limit(query.per_page)
    .offset(offset);

  return successResponse(
    c,
    result.map((r) => ({
      id: r.article.id,
      feed_id: r.article.feedId,
      guid: r.article.guid,
      title: r.article.title,
      link: r.article.link,
      author: r.article.author,
      summary: r.article.summary,
      content: r.article.content,
      published_at: r.article.publishedAt ? r.article.publishedAt.getTime() : null,
      is_read: r.article.isRead,
      is_starred: r.article.isStarred,
      created_at: r.article.createdAt.getTime(),
      updated_at: r.article.updatedAt.getTime(),
      feed_title: r.feedTitle,
      feed_favicon: r.feedFavicon,
    })),
    {
      page: query.page,
      per_page: query.per_page,
      total,
    }
  );
});

// GET /api/articles/unread - Get unread articles
articlesRouter.get("/unread", zValidator("query", articleQuerySchema), async (c) => {
  const db = c.get("db");
  const query = c.req.valid("query");

  const conditions = and(
    eq(articles.isRead, 0),
    buildConditions(query)
  );

  const orderBy = getSortOrder(query.sort, query.order);
  const offset = (query.page - 1) * query.per_page;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(conditions);

  const total = totalResult?.count ?? 0;

  // Get articles
  const result = await db
    .select({
      article: articles,
      feedTitle: feeds.title,
      feedFavicon: feeds.favicon,
    })
    .from(articles)
    .leftJoin(feeds, eq(articles.feedId, feeds.id))
    .where(conditions)
    .orderBy(orderBy)
    .limit(query.per_page)
    .offset(offset);

  return successResponse(
    c,
    result.map((r) => ({
      id: r.article.id,
      feed_id: r.article.feedId,
      guid: r.article.guid,
      title: r.article.title,
      link: r.article.link,
      author: r.article.author,
      summary: r.article.summary,
      content: r.article.content,
      published_at: r.article.publishedAt ? r.article.publishedAt.getTime() : null,
      is_read: r.article.isRead,
      is_starred: r.article.isStarred,
      created_at: r.article.createdAt.getTime(),
      updated_at: r.article.updatedAt.getTime(),
      feed_title: r.feedTitle,
      feed_favicon: r.feedFavicon,
    })),
    {
      page: query.page,
      per_page: query.per_page,
      total,
    }
  );
});

// GET /api/articles/starred - Get starred articles
articlesRouter.get("/starred", zValidator("query", articleQuerySchema), async (c) => {
  const db = c.get("db");
  const query = c.req.valid("query");

  const conditions = and(
    eq(articles.isStarred, 1),
    buildConditions(query)
  );

  const orderBy = getSortOrder(query.sort, query.order);
  const offset = (query.page - 1) * query.per_page;

  // Get total count
  const [totalResult] = await db
    .select({ count: count() })
    .from(articles)
    .where(conditions);

  const total = totalResult?.count ?? 0;

  // Get articles
  const result = await db
    .select({
      article: articles,
      feedTitle: feeds.title,
      feedFavicon: feeds.favicon,
    })
    .from(articles)
    .leftJoin(feeds, eq(articles.feedId, feeds.id))
    .where(conditions)
    .orderBy(orderBy)
    .limit(query.per_page)
    .offset(offset);

  return successResponse(
    c,
    result.map((r) => ({
      id: r.article.id,
      feed_id: r.article.feedId,
      guid: r.article.guid,
      title: r.article.title,
      link: r.article.link,
      author: r.article.author,
      summary: r.article.summary,
      content: r.article.content,
      published_at: r.article.publishedAt ? r.article.publishedAt.getTime() : null,
      is_read: r.article.isRead,
      is_starred: r.article.isStarred,
      created_at: r.article.createdAt.getTime(),
      updated_at: r.article.updatedAt.getTime(),
      feed_title: r.feedTitle,
      feed_favicon: r.feedFavicon,
    })),
    {
      page: query.page,
      per_page: query.per_page,
      total,
    }
  );
});

// GET /api/articles/:id - Get single article
articlesRouter.get("/:id", async (c) => {
  const db = c.get("db");
  const articleId = c.req.param("id");

  const result = await db
    .select({
      article: articles,
      feedTitle: feeds.title,
      feedFavicon: feeds.favicon,
    })
    .from(articles)
    .leftJoin(feeds, eq(articles.feedId, feeds.id))
    .where(eq(articles.id, articleId))
    .limit(1);

  if (result.length === 0) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Article not found", 404);
  }

  const r = result[0];
  return successResponse(c, {
    id: r.article.id,
    feed_id: r.article.feedId,
    guid: r.article.guid,
    title: r.article.title,
    link: r.article.link,
    author: r.article.author,
    summary: r.article.summary,
    content: r.article.content,
    published_at: r.article.publishedAt ? r.article.publishedAt.getTime() : null,
    is_read: r.article.isRead,
    is_starred: r.article.isStarred,
    created_at: r.article.createdAt.getTime(),
    updated_at: r.article.updatedAt.getTime(),
    feed_title: r.feedTitle,
    feed_favicon: r.feedFavicon,
  });
});

// PATCH /api/articles/:id/read - Mark as read
articlesRouter.patch("/:id/read", async (c) => {
  const db = c.get("db");
  const articleId = c.req.param("id");

  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Article not found", 404);
  }

  await db
    .update(articles)
    .set({ isRead: 1, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  // Update feed unread count
  await updateUnreadCount(db, existing.feedId);

  return successResponse(c, { id: articleId, is_read: 1 });
});

// PATCH /api/articles/:id/unread - Mark as unread
articlesRouter.patch("/:id/unread", async (c) => {
  const db = c.get("db");
  const articleId = c.req.param("id");

  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Article not found", 404);
  }

  await db
    .update(articles)
    .set({ isRead: 0, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  // Update feed unread count
  await updateUnreadCount(db, existing.feedId);

  return successResponse(c, { id: articleId, is_read: 0 });
});

// PATCH /api/articles/:id/star - Star article
articlesRouter.patch("/:id/star", async (c) => {
  const db = c.get("db");
  const articleId = c.req.param("id");

  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Article not found", 404);
  }

  await db
    .update(articles)
    .set({ isStarred: 1, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  return successResponse(c, { id: articleId, is_starred: 1 });
});

// PATCH /api/articles/:id/unstar - Unstar article
articlesRouter.patch("/:id/unstar", async (c) => {
  const db = c.get("db");
  const articleId = c.req.param("id");

  const existing = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Article not found", 404);
  }

  await db
    .update(articles)
    .set({ isStarred: 0, updatedAt: new Date() })
    .where(eq(articles.id, articleId));

  return successResponse(c, { id: articleId, is_starred: 0 });
});

// POST /api/articles/mark-all-read - Mark all as read
articlesRouter.post("/mark-all-read", async (c) => {
  const db = c.get("db");

  await db
    .update(articles)
    .set({ isRead: 1, updatedAt: new Date() })
    .where(eq(articles.isRead, 0));

  // Update all feed unread counts
  const allFeeds = await db.query.feeds.findMany();
  await Promise.allSettled(
    allFeeds.map((feed) => updateUnreadCount(db, feed.id))
  );

  return successResponse(c, { marked: true });
});

// POST /api/articles/mark-feed-read/:id - Mark all articles in a feed as read
articlesRouter.post("/mark-feed-read/:id", async (c) => {
  const db = c.get("db");
  const feedId = c.req.param("id");

  // Check if feed exists
  const existing = await db.query.feeds.findFirst({
    where: eq(feeds.id, feedId),
  });

  if (!existing) {
    return errorResponse(c, ErrorCodes.NOT_FOUND, "Feed not found", 404);
  }

  await db
    .update(articles)
    .set({ isRead: 1, updatedAt: new Date() })
    .where(and(eq(articles.feedId, feedId), eq(articles.isRead, 0)));

  // Update feed unread count
  await updateUnreadCount(db, feedId);

  return successResponse(c, { feedId, marked: true });
});

export default articlesRouter;
